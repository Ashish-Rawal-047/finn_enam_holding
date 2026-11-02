/**
 * Investing quotations shown on Home.
 *
 * Every entry was checked for wording and attribution (November 2026). Quotations that are
 * widely misattributed or whose original source could not be located were excluded — e.g.
 * "Markets can remain irrational longer than you can remain solvent" (no evidence Keynes said
 * it), Templeton's "Bull markets are born on pessimism…" (earliest trace 1994, wording varies)
 * and Lynch's "Behind every stock is a company…" (original text not located).
 * Second-hand attributions name the person who recorded them.
 */
export interface Quote {
  id: string;
  text: string;
  author: string;
  source: string;
}

export const QUOTES: readonly Quote[] = [
  {
    id: 'graham-chief-problem',
    text: 'The investor’s chief problem — and even his worst enemy — is likely to be himself.',
    author: 'Benjamin Graham',
    source: 'The Intelligent Investor',
  },
  {
    id: 'graham-voting-weighing',
    text: 'In the short run, the market is a voting machine but in the long run, it is a weighing machine.',
    author: 'Benjamin Graham',
    source: 'As quoted by Warren Buffett in Berkshire Hathaway shareholder letters',
  },
  {
    id: 'graham-price-value',
    text: 'Price is what you pay; value is what you get.',
    author: 'Benjamin Graham',
    source: 'As quoted by Warren Buffett, Berkshire Hathaway shareholder letter, 2008',
  },
  {
    id: 'buffett-fearful-greedy',
    text: 'Be fearful when others are greedy, and be greedy when others are fearful.',
    author: 'Warren Buffett',
    source: '“Buy American. I Am.”, The New York Times, October 2008',
  },
  {
    id: 'buffett-holding-period',
    text: 'When we own portions of outstanding businesses with outstanding managements, our favorite holding period is forever.',
    author: 'Warren Buffett',
    source: 'Berkshire Hathaway shareholder letter, 1988',
  },
  {
    id: 'buffett-wonderful-company',
    text: 'It’s far better to buy a wonderful company at a fair price than a fair company at a wonderful price.',
    author: 'Warren Buffett',
    source: 'Berkshire Hathaway shareholder letter, 1989',
  },
  {
    id: 'buffett-time-friend',
    text: 'Time is the friend of the wonderful business, the enemy of the mediocre.',
    author: 'Warren Buffett',
    source: 'Berkshire Hathaway shareholder letter, 1989',
  },
  {
    id: 'munger-not-easy',
    text: 'It’s not supposed to be easy. Anyone who finds it easy is stupid.',
    author: 'Charlie Munger',
    source: 'As recounted by Howard Marks, Oaktree memo “It’s Not Easy”, September 2015',
  },
  {
    id: 'bogle-haystack',
    text: 'Don’t look for the needle in the haystack. Just buy the haystack!',
    author: 'John C. Bogle',
    source: 'The Little Book of Common Sense Investing, 2007',
  },
  {
    id: 'fisher-almost-never',
    text: 'If the job has been correctly done when a common stock is purchased, the time to sell it is — almost never.',
    author: 'Philip A. Fisher',
    source: 'Common Stocks and Uncommon Profits, 1958',
  },
  {
    id: 'marks-predict-prepare',
    text: 'You can’t predict. You can prepare.',
    author: 'Howard Marks',
    source: 'Oaktree Capital memo, November 2001',
  },
  {
    id: 'keynes-worldly-wisdom',
    text: 'Worldly wisdom teaches that it is better for reputation to fail conventionally than to succeed unconventionally.',
    author: 'John Maynard Keynes',
    source: 'The General Theory of Employment, Interest and Money, 1936',
  },
  {
    id: 'dalio-pain-reflection',
    text: 'Pain + Reflection = Progress.',
    author: 'Ray Dalio',
    source: 'Principles, 2017',
  },
  {
    id: 'lefevre-sitting',
    text: 'It never was my thinking that made the big money for me. It always was my sitting.',
    author: 'Edwin Lefèvre',
    source: 'Reminiscences of a Stock Operator, 1923 — narrated by a character modelled on Jesse Livermore',
  },
  {
    id: 'pabrai-heads-i-win',
    text: 'Heads, I win; tails, I don’t lose much.',
    author: 'Mohnish Pabrai',
    source: 'The Dhandho Investor, 2007',
  },
];

/**
 * Uniform random pick that never returns `previousId` when another quote exists.
 * `random` is injectable for tests.
 */
export function pickQuote(quotes: readonly Quote[], previousId: string | null, random: () => number = Math.random): Quote {
  const pool = quotes.length > 1 && previousId ? quotes.filter((q) => q.id !== previousId) : quotes;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

const STORAGE_KEY = 'finn:last-quote';
let sessionQuote: Quote | null = null;

/**
 * One quote per application load: chosen once when the app module first asks for it, then
 * kept for the life of the page (tab switches never change it). A browser refresh reloads
 * the module and picks again, avoiding the quote shown on the previous load.
 */
export function quoteForThisLoad(): Quote {
  if (sessionQuote) return sessionQuote;
  let previous: string | null = null;
  try {
    previous = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* storage unavailable: still random, just without repeat-avoidance */
  }
  sessionQuote = pickQuote(QUOTES, previous);
  try {
    localStorage.setItem(STORAGE_KEY, sessionQuote.id);
  } catch {
    /* ignore */
  }
  return sessionQuote;
}
