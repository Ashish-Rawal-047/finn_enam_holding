"""
FINN yfinance bridge. Invoked by backend/src/providers/adapters/yfinance.ts.

    python yf_provider.py search <query>
    python yf_provider.py profile <symbol>
    python yf_provider.py history <symbol> <start YYYY-MM-DD> <end YYYY-MM-DD>
    python yf_provider.py financials <symbol>
    python yf_provider.py bundle <symbol> <datasets: profile,history,financials> <start> <end>

Writes one JSON document to stdout. Errors are returned as {"error": {"code", "message"}}
with exit code 0 so the caller can distinguish provider errors from crashes.

yfinance is an unofficial interface to Yahoo Finance: coverage varies by company, figures
can be delayed or restated, and Yahoo may change or restrict responses. Monetary statement
values are returned as reported by Yahoo (absolute currency units); the caller converts.
"""
from __future__ import annotations

import json
import math
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import yfinance as yf

INDIAN_SUFFIXES = (".NS", ".BO")

# Yahoo statement row name -> FINN field. First match wins when several rows map to one field.
INCOME_ROWS = {
    "revenue": ["Total Revenue", "Operating Revenue"],
    "costOfRevenue": ["Cost Of Revenue", "Reconciled Cost Of Revenue"],
    "grossProfit": ["Gross Profit"],
    "operatingExpenses": ["Operating Expense"],
    "operatingIncome": ["Operating Income", "Total Operating Income As Reported"],
    "ebitda": ["EBITDA", "Normalized EBITDA"],
    "ebit": ["EBIT"],
    "interestExpense": ["Interest Expense", "Interest Expense Non Operating"],
    "pbt": ["Pretax Income"],
    "taxExpense": ["Tax Provision"],
    "pat": ["Net Income", "Net Income Common Stockholders", "Net Income Continuous Operations"],
    "eps": ["Diluted EPS"],
    "depreciation": ["Reconciled Depreciation", "Depreciation And Amortization In Income Statement"],
}
BALANCE_ROWS = {
    "totalAssets": ["Total Assets"],
    "currentAssets": ["Current Assets"],
    "cashAndEquivalents": ["Cash And Cash Equivalents", "Cash Cash Equivalents And Short Term Investments"],
    "receivables": ["Accounts Receivable", "Receivables"],
    "inventory": ["Inventory"],
    "totalLiabilities": ["Total Liabilities Net Minority Interest"],
    "currentLiabilities": ["Current Liabilities"],
    "longTermDebt": ["Long Term Debt"],
    "shortTermDebt": ["Current Debt"],
    "borrowings": ["Total Debt"],
    "totalEquity": ["Stockholders Equity", "Common Stock Equity"],
    "retainedEarnings": ["Retained Earnings"],
    "payables": ["Accounts Payable", "Payables"],
}
CASHFLOW_ROWS = {
    "operatingCashFlow": ["Operating Cash Flow", "Cash Flow From Continuing Operating Activities"],
    "investingCashFlow": ["Investing Cash Flow", "Cash Flow From Continuing Investing Activities"],
    "financingCashFlow": ["Financing Cash Flow", "Cash Flow From Continuing Financing Activities"],
    "capex": ["Capital Expenditure"],
    "freeCashFlow": ["Free Cash Flow"],
    "depreciation": ["Depreciation And Amortization", "Depreciation Amortization Depletion"],
}


def out(payload) -> None:
    sys.stdout.write(json.dumps(payload, default=str))
    sys.stdout.flush()


def fail(code: str, message: str) -> None:
    out({"error": {"code": code, "message": message}})


def num(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(f) or math.isinf(f) else f


def classify_error(e: Exception) -> str:
    name = type(e).__name__
    text = str(e).lower()
    if "ratelimit" in name.lower() or "too many requests" in text or "rate limit" in text:
        return "rate_limited"
    return "provider_error"


# ---------------------------------------------------------------------------------------

def search(query: str) -> None:
    q = query.strip()
    results: dict[str, dict] = {}

    def add(symbol: str, name: str | None, exchange: str | None) -> None:
        if not symbol.upper().endswith(INDIAN_SUFFIXES):
            return
        exchange = "NSE" if symbol.upper().endswith(".NS") else "BSE"
        if symbol in results:
            results[symbol]["name"] = results[symbol]["name"] or name
        else:
            results[symbol] = {"symbol": symbol, "name": name, "exchange": exchange}

    # 1. Direct symbol forms: RELIANCE / RELIANCE.NS / 500325 (BSE code)
    candidates: list[str] = []
    upper = q.upper()
    if re.fullmatch(r"[A-Z0-9&\-]{1,20}\.(NS|BO)", upper):
        candidates.append(upper)
    elif re.fullmatch(r"\d{6}", upper):
        candidates.append(f"{upper}.BO")
    elif re.fullmatch(r"[A-Z0-9&\-]{1,20}", upper):
        candidates += [f"{upper}.NS", f"{upper}.BO"]
    for sym in candidates:
        try:
            fi = yf.Ticker(sym).fast_info
            if num(fi.get("lastPrice")) is not None:
                add(sym, None, "NSE" if sym.endswith(".NS") else "BSE")
        except Exception:
            pass

    # 2. Yahoo search by name / symbol
    try:
        s = yf.Search(q, max_results=10, news_count=0)
        for item in s.quotes:
            if item.get("quoteType") == "EQUITY":
                add(item.get("symbol", ""), item.get("longname") or item.get("shortname"), item.get("exchange"))
    except Exception as e:  # search failure is not fatal if a direct symbol resolved
        if not results:
            return fail(classify_error(e), f"Search failed: {e}")

    out({"results": list(results.values())[:10]})


def quote_timing(info: dict) -> tuple[str, int | None]:
    delay = info.get("exchangeDataDelayedBy")
    state = (info.get("marketState") or "").upper()
    if state in ("CLOSED", "POSTPOST", "PREPRE", "POST", "PRE"):
        return "end_of_day", delay
    if delay in (0, None):
        return "realtime" if delay == 0 else "unknown", delay
    return "delayed", delay


class ProviderFailure(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def profile_data(symbol: str, info: dict | None = None) -> dict:
    if info is None:
        try:
            info = yf.Ticker(symbol).info or {}
        except Exception as e:
            raise ProviderFailure(classify_error(e), f"Could not load profile for {symbol}: {e}")
    if not info or (info.get("quoteType") not in ("EQUITY",) and not info.get("longName")):
        raise ProviderFailure("not_found", f"{symbol} is not a recognised equity on Yahoo Finance")
    timing, delay = quote_timing(info)
    market_time = info.get("regularMarketTime")
    return {
        "symbol": symbol,
        "name": info.get("longName") or info.get("shortName"),
        "sector": info.get("sector"),
        "industry": info.get("industry"),
        "website": info.get("website"),
        "description": info.get("longBusinessSummary"),
        "country": info.get("country"),
        "exchange": info.get("fullExchangeName") or info.get("exchange"),
        "currency": info.get("currency"),
        "employees": info.get("fullTimeEmployees"),
        "isin": None,  # Yahoo does not reliably expose ISINs for NSE listings
        "quote": {
            "price": num(info.get("currentPrice") or info.get("regularMarketPrice")),
            "previousClose": num(info.get("regularMarketPreviousClose") or info.get("previousClose")),
            "change": num(info.get("regularMarketChange")),
            "changePercent": num(info.get("regularMarketChangePercent")),
            "dayHigh": num(info.get("dayHigh")),
            "dayLow": num(info.get("dayLow")),
            "fiftyTwoWeekHigh": num(info.get("fiftyTwoWeekHigh")),
            "fiftyTwoWeekLow": num(info.get("fiftyTwoWeekLow")),
            "volume": num(info.get("regularMarketVolume") or info.get("volume")),
            "averageVolume": num(info.get("averageVolume")),
            "marketCap": num(info.get("marketCap")),
            "enterpriseValue": num(info.get("enterpriseValue")),
            "marketTime": datetime.fromtimestamp(market_time, tz=timezone.utc).isoformat() if market_time else None,
            "timing": timing,
            "delayMinutes": delay,
        },
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
    }


def history_data(symbol: str, start: str, end: str) -> dict:
    try:
        h = yf.Ticker(symbol).history(start=start, end=end, interval="1d", auto_adjust=False, actions=False)
    except Exception as e:
        raise ProviderFailure(classify_error(e), f"History request failed for {symbol}: {e}")
    rows = []
    for idx, r in h.iterrows():
        close = num(r.get("Close"))
        if close is None:
            continue
        rows.append(
            {
                "tradeDate": idx.date().isoformat(),
                "open": num(r.get("Open")) or close,
                "high": num(r.get("High")) or close,
                "low": num(r.get("Low")) or close,
                "close": close,
                "volume": num(r.get("Volume")) or 0,
            }
        )
    return {"symbol": symbol, "candles": rows, "fetchedAt": datetime.now(timezone.utc).isoformat()}


def frame_to_periods(df, mapping: dict) -> dict:
    """{periodEnd: {field: value}} from a Yahoo statement DataFrame (rows = items, cols = periods)."""
    periods: dict[str, dict] = {}
    if df is None or df.empty:
        return periods
    index = {str(i): i for i in df.index}
    for col in df.columns:
        end = col.date().isoformat() if hasattr(col, "date") else str(col)[:10]
        values: dict = {}
        for field, names in mapping.items():
            for name in names:
                if name in index:
                    v = num(df.at[index[name], col])
                    if v is not None:
                        values[field] = v
                        break
        if values:
            periods[end] = values
    return periods


def merge(*parts: dict) -> list[dict]:
    merged: dict[str, dict] = {}
    for part in parts:
        for end, values in part.items():
            row = merged.setdefault(end, {})
            for k, v in values.items():
                row.setdefault(k, v)
    return [{"periodEnd": end, **values} for end, values in sorted(merged.items(), reverse=True)]


# Statement fetches: (key, Ticker attribute, row map). Each is one independent Yahoo request.
STATEMENTS = [
    ("income_annual", "income_stmt", INCOME_ROWS),
    ("balance_annual", "balance_sheet", BALANCE_ROWS),
    ("cashflow_annual", "cashflow", CASHFLOW_ROWS),
    ("income_quarterly", "quarterly_income_stmt", INCOME_ROWS),
    ("balance_quarterly", "quarterly_balance_sheet", BALANCE_ROWS),
    ("cashflow_quarterly", "quarterly_cashflow", CASHFLOW_ROWS),
]


def timed(fn, *args):
    """(result or ProviderFailure, elapsed ms). Each task builds its own Ticker, so threads share no state."""
    start = time.perf_counter()
    try:
        result = fn(*args)
    except ProviderFailure as e:
        result = e
    except Exception as e:
        result = ProviderFailure(classify_error(e), str(e))
    return result, round((time.perf_counter() - start) * 1000)


def statement(symbol: str, attr: str, mapping: dict) -> dict:
    return frame_to_periods(getattr(yf.Ticker(symbol), attr), mapping)


def info_of(symbol: str) -> dict:
    return yf.Ticker(symbol).info or {}


def bundle(symbol: str, datasets: list[str], start: str, end: str) -> dict:
    """
    Fetches the requested datasets concurrently in one process (one interpreter start-up, one
    Yahoo session) with at most 4 requests in flight. A failed part never fails the others.
    """
    tasks: dict = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        if "profile" in datasets or "financials" in datasets:
            tasks["info"] = pool.submit(timed, info_of, symbol)
        if "history" in datasets:
            tasks["history"] = pool.submit(timed, history_data, symbol, start, end)
        if "financials" in datasets:
            for key, attr, mapping in STATEMENTS:
                tasks[key] = pool.submit(timed, statement, symbol, attr, mapping)
        done = {k: f.result() for k, f in tasks.items()}

    def err(e: ProviderFailure) -> dict:
        return {"error": {"code": e.code, "message": str(e)}}

    result: dict = {"symbol": symbol, "timingsMs": {k: ms for k, (_, ms) in done.items()}}
    info = done["info"][0] if "info" in done else None
    if "profile" in datasets:
        if isinstance(info, ProviderFailure):
            result["profile"] = err(info)
        else:
            try:
                result["profile"] = profile_data(symbol, info)
            except ProviderFailure as e:
                result["profile"] = err(e)
    if "history" in datasets:
        h = done["history"][0]
        result["history"] = err(h) if isinstance(h, ProviderFailure) else h
    if "financials" in datasets:
        parts = {key: done[key][0] for key, _, _ in STATEMENTS}
        failed = {k: v for k, v in parts.items() if isinstance(v, ProviderFailure)}
        if len(failed) == len(parts):
            result["financials"] = err(next(iter(failed.values())))
        else:
            ok = {k: ({} if isinstance(v, ProviderFailure) else v) for k, v in parts.items()}
            currency = None if not isinstance(info, dict) else (info.get("financialCurrency") or info.get("currency"))
            result["financials"] = {
                "symbol": symbol,
                "currency": currency,
                "annual": merge(ok["income_annual"], ok["balance_annual"], ok["cashflow_annual"]),
                "quarterly": merge(ok["income_quarterly"], ok["balance_quarterly"], ok["cashflow_quarterly"]),
                "missing": sorted(failed.keys()),
                "fetchedAt": datetime.now(timezone.utc).isoformat(),
            }
    return result


def run(fn, *args) -> None:
    try:
        out(fn(*args))
    except ProviderFailure as e:
        fail(e.code, str(e))


def financials(symbol: str) -> dict:
    f = bundle(symbol, ["financials"], "", "")["financials"]
    if "error" in f:
        raise ProviderFailure(f["error"]["code"], f["error"]["message"])
    return f


def main(argv: list[str]) -> None:
    if len(argv) < 2:
        return fail("usage", "command required")
    cmd, args = argv[1], argv[2:]
    try:
        if cmd == "search" and args:
            return search(" ".join(args))
        if cmd == "profile" and args:
            return run(profile_data, args[0].upper())
        if cmd == "history" and len(args) == 3:
            return run(history_data, args[0].upper(), args[1], args[2])
        if cmd == "financials" and args:
            return run(financials, args[0].upper())
        if cmd == "bundle" and len(args) == 4:
            return run(bundle, args[0].upper(), [d for d in args[1].split(",") if d], args[2], args[3])
        return fail("usage", f"unknown command or arguments: {cmd}")
    except Exception as e:  # never crash without JSON
        return fail(classify_error(e), str(e))


if __name__ == "__main__":
    main(sys.argv)
