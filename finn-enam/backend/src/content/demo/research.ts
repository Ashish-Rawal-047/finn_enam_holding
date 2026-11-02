import type { CompanyResearch } from './fixtureTypes.js';

export const MOCK_COMPANY_RESEARCH: Record<string, CompanyResearch> = {
  'TRENT.NS': {
    ticker: 'TRENT.NS',
    name: 'Trent Ltd.',
    sector: 'Consumer Discretionary / Apparel Retail',
    marketCap: '₹2,43,500 Cr',
    businessSnapshot: {
      summary: 'Trent Ltd. is the retail flagship of the Tata Group, operating high-velocity value fashion format Zudio, lifestyle department store Westside, and specialty chains (Star Bazaar JV, Misbu, Utsa). The company operates an asset-light, fully proprietary private-label supply chain.',
      segments: [
        { name: 'Zudio (Value Fashion)', sharePercent: 62, growthYoY: 54 },
        { name: 'Westside (Premium Lifestyle)', sharePercent: 31, growthYoY: 12 },
        { name: 'Star Bazaar & Others (Grocery JV/Misbu)', sharePercent: 7, growthYoY: 18 }
      ],
      keyMoat: 'Unmatched 14-day design-to-shelf supply chain cycle, 100% private-label gross margins (>42%), and rapid store payback periods under 16 months.'
    },
    financialSnapshot: {
      revenueTtm: '₹14,890 Cr',
      ebitdaMargin: '15.4%',
      roce: '28.4%',
      roe: '24.1%',
      debtToEquity: '0.12x',
      workingCapitalDays: 24,
      fcfTtm: '₹1,240 Cr',
      cfoPatConversion: 1.28
    },
    narrativeVsNumbers: [
      {
        period: 'Q2 FY25',
        managementGuidance: 'Guided for ~35% top-line growth and stable 14.5% EBITDA margin.',
        actualDelivered: 'Delivered +39.3% YoY revenue growth with 15.2% EBITDA margin (+140 bps YoY).',
        variance: '+430 bps Rev / +70 bps Margin',
        varianceType: 'beat',
        sourceDoc: 'Q2 FY25 Exchange Results & Press Release'
      },
      {
        period: 'Q1 FY25',
        managementGuidance: 'Targeted adding 50-60 net Zudio stores in the quarter.',
        actualDelivered: 'Added 68 net stores; revenue surged +56% YoY.',
        variance: '+13% store additions vs. plan',
        varianceType: 'beat',
        sourceDoc: 'Q1 FY25 Concall Transcript'
      },
      {
        period: 'Q4 FY24',
        managementGuidance: 'Expected slight margin compression due to aggressive tier-2/3 store fit-outs.',
        actualDelivered: 'EBITDA margin came in at 14.8%, flat QoQ with zero dilution.',
        variance: '+60 bps vs cautious guidance',
        varianceType: 'beat',
        sourceDoc: 'Q4 FY24 Concall Transcript'
      },
      {
        period: 'Q3 FY24',
        managementGuidance: 'Stated festive season same-store-sales growth (SSSG) target of 10-12%.',
        actualDelivered: 'SSSG delivered at 12% for Westside and >16% for Zudio.',
        variance: 'Top end of guided range',
        varianceType: 'met',
        sourceDoc: 'Q3 FY24 Investor Presentation'
      }
    ],
    guidanceLedger: [
      {
        metric: 'Store Additions',
        managementStatement: 'Opening at least 200 Zudio stores and 30 Westside stores annually over FY25–27.',
        targetPeriod: 'FY25 – FY27',
        concallSource: 'Q4 FY24 Earnings Conference Call'
      },
      {
        metric: 'Operating Margin',
        managementStatement: 'Committed to maintaining consolidated EBITDA margin between 14.5% and 15.5%.',
        targetPeriod: 'Full Year FY25',
        concallSource: 'Q1 FY25 Concall Transcript'
      },
      {
        metric: 'Capex Funding',
        managementStatement: 'Annual capex of ₹500–600 Cr will be 100% self-funded via operating cash flows with zero net debt.',
        targetPeriod: 'FY25',
        concallSource: 'Annual Report FY24 (MD&A)'
      }
    ],
    cashQualityAnalysis: {
      cfoVsPatCommentary: 'Superb cash conversion ($CFO / PAT = 1.28\times$). Operating cash flow grew 44% YoY, fully financing store additions without external debt.',
      workingCapitalTrend: 'Working capital days contracted from 29 days to 24 days due to negative working capital dynamics in the Zudio retail model.',
      fcfYield: 'FCF Yield is 1.8%, reflecting intensive growth reinvestment in store fit-outs.',
      redFlagsDetected: false
    },
    bullBear: {
      bullCase: [
        'Zudio represents an unassailable scale flywheel in Indian value fashion; target market is >₹3 Lakh Cr unorganized apparel.',
        'Zero distributor margin leakage allows 20-30% lower prices than fast-fashion competitors while preserving 15% EBITDA margins.',
        'Balance sheet is net cash with minimal lease-adjusted leverage and ROCE exceeding 28%.'
      ],
      bearCase: [
        'Valuation trades at >90x P/E, pricing in flawless multi-year store execution with zero room for same-store-sales deceleration.',
        'High base effect in FY26 could moderate headline YoY revenue growth rates from 50%+ to ~25%.',
        'Cannibalization risk as Zudio density increases within mature tier-1 metropolitan clusters.'
      ]
    },
    primarySources: [
      {
        title: 'Trent Limited 72nd Annual Report FY24',
        type: 'Annual Report',
        period: 'FY 2023-24',
        url: 'https://www.mywestside.com/annual-reports'
      },
      {
        title: 'Q2 FY25 Unaudited Financial Results & Exchange Disclosures',
        type: 'Quarterly Results',
        period: 'Q2 FY25 (Sept 2026)',
        url: 'https://nsearchives.nseindia.com/corporate/TRENT_29102026_Results.pdf'
      },
      {
        title: 'Transcript of Q1 FY25 Earnings Conference Call',
        type: 'Concall Transcript',
        period: 'Q1 FY25',
        url: 'https://www.screener.in/company/TRENT/'
      }
    ]
  },

  'DIXON.NS': {
    ticker: 'DIXON.NS',
    name: 'Dixon Technologies Ltd.',
    sector: 'Electronic Manufacturing Services (EMS)',
    marketCap: '₹84,900 Cr',
    businessSnapshot: {
      summary: 'Dixon is India\'s largest native EMS provider, assembling smartphones, consumer electronics (LED TVs), home appliances (washing machines), lighting, and telecom/IT hardware for top global brands (Motorola, Xiaomi, Samsung, Lenovo, Acer).',
      segments: [
        { name: 'Mobile & EMS', sharePercent: 68, growthYoY: 92 },
        { name: 'Consumer Electronics (TVs)', sharePercent: 16, growthYoY: 8 },
        { name: 'Home Appliances', sharePercent: 9, growthYoY: 14 },
        { name: 'Lighting & Telecom', sharePercent: 7, growthYoY: 11 }
      ],
      keyMoat: 'Anchor beneficiary of PLI schemes, unmatched scale in mobile assembly (now producing ~45M phones/yr), and deep backward integration into SMT/PCB assembly.'
    },
    financialSnapshot: {
      revenueTtm: '₹22,400 Cr',
      ebitdaMargin: '4.1%',
      roce: '32.5%',
      roe: '26.8%',
      debtToEquity: '0.24x',
      workingCapitalDays: 14,
      fcfTtm: '₹580 Cr',
      cfoPatConversion: 1.05
    },
    narrativeVsNumbers: [
      {
        period: 'Q2 FY25',
        managementGuidance: 'Guided mobile volume delivery of 7.5M units per quarter.',
        actualDelivered: 'Delivered 8.1M units; segment revenue up 110% YoY.',
        variance: '+8% volume beat',
        varianceType: 'beat',
        sourceDoc: 'Q2 FY25 Concall Transcript'
      },
      {
        period: 'Q1 FY25',
        managementGuidance: 'Targeted 3.8%–4.0% blended EBITDA margin.',
        actualDelivered: 'Reported 4.0% EBITDA margin; operating leverage in mobile division.',
        variance: 'Met upper range',
        varianceType: 'met',
        sourceDoc: 'Q1 FY25 Press Release'
      },
      {
        period: 'Q4 FY24',
        managementGuidance: 'Laptop commercial production targeted for Q3 FY25.',
        actualDelivered: 'Rescheduled commercial run to Q4 FY25 due to display import licenses.',
        variance: 'Delayed by 1 quarter',
        varianceType: 'miss',
        sourceDoc: 'Q4 FY24 Concall'
      },
      {
        period: 'Q3 FY24',
        managementGuidance: 'Guided full-year FY24 revenue of ₹17,000 Cr.',
        actualDelivered: 'Delivered ₹17,690 Cr, exceeding guidance.',
        variance: '+4% revenue beat',
        varianceType: 'beat',
        sourceDoc: 'Audited Annual Results'
      }
    ],
    guidanceLedger: [
      {
        metric: 'Revenue Run-rate',
        managementStatement: 'Targeting ₹30,000 Cr annual revenue run-rate by FY26 driven by IT hardware and exports.',
        targetPeriod: 'FY26',
        concallSource: 'Q2 FY25 Earnings Call'
      },
      {
        metric: 'Component Localization',
        managementStatement: 'Targeting domestic component value addition increase from 14% to 30%+ with display modules.',
        targetPeriod: 'FY26',
        concallSource: 'Exchange Filing Oct 29, 2026'
      }
    ],
    cashQualityAnalysis: {
      cfoVsPatCommentary: 'Lean working capital cycle of 14 days enables healthy cash conversion despite razor-thin 4% operating margins. Minimal customer bad debts.',
      workingCapitalTrend: 'Stable working capital days; inventory turns running at 28x.',
      fcfYield: '1.2% FCF yield after funding aggressive ₹600 Cr annual capex.',
      redFlagsDetected: false
    },
    bullBear: {
      bullCase: [
        'Prime beneficiary of global supply chain diversification ("China + 1") and Indian government PLI production subsidies.',
        'High asset turnover (>6.5x) enables extraordinary ROCE (>30%) despite thin 4% operating margin.',
        'Expanding into high-margin display modules, camera modules, and defense electronics.'
      ],
      bearCase: [
        'Contract manufacturing model inherently commands low pricing power; OEMs can squeeze manufacturing conversion charges.',
        'Heavy revenue concentration in top 2 smartphone clients (Motorola and Xiaomi contribute ~55% of volume).',
        'Working capital vulnerability if OEM component supply chains experience geopolitical port delays.'
      ]
    },
    primarySources: [
      {
        title: 'Dixon Technologies Annual Report 2023-24',
        type: 'Annual Report',
        period: 'FY 2023-24',
        url: 'https://www.dixoninfo.com/annual-reports'
      },
      {
        title: 'Q2 FY25 Financial Statements & Investor Deck',
        type: 'Quarterly Results',
        period: 'Q2 FY25',
        url: 'https://nsearchives.nseindia.com/corporate/DIXON_Results.pdf'
      }
    ]
  },

  'POLYCAB.NS': {
    ticker: 'POLYCAB.NS',
    name: 'Polycab India Ltd.',
    sector: 'Cables, Wires & Fast Moving Electrical Goods',
    marketCap: '₹97,800 Cr',
    businessSnapshot: {
      summary: 'Polycab is the clear market leader in Indian wires and cables with ~25% organized market share, supported by a vast distribution network of 4,300+ dealers and 205,000+ retail touchpoints. Expanding into switches, switchgear, fans, and EPC.',
      segments: [
        { name: 'Wires & Cables (Industrial & Retail)', sharePercent: 86, growthYoY: 26 },
        { name: 'FMEG (Fans, Lights, Switches)', sharePercent: 8, growthYoY: 12 },
        { name: 'EPC & Others', sharePercent: 6, growthYoY: 15 }
      ],
      keyMoat: 'Unrivaled dealer reach, backward integration into copper rod manufacturing, and rapid automated quotation engine for industrial contracts.'
    },
    financialSnapshot: {
      revenueTtm: '₹19,840 Cr',
      ebitdaMargin: '13.8%',
      roce: '27.2%',
      roe: '22.5%',
      debtToEquity: '0.04x',
      workingCapitalDays: 48,
      fcfTtm: '₹1,450 Cr',
      cfoPatConversion: 1.15
    },
    narrativeVsNumbers: [
      {
        period: 'Q2 FY25',
        managementGuidance: 'Guided 18-20% volume growth with ~13% EBITDA margin.',
        actualDelivered: 'Delivered +24.5% revenue growth and 13.8% EBITDA margin.',
        variance: '+450 bps revenue / +80 bps margin',
        varianceType: 'beat',
        sourceDoc: 'Q2 FY25 Earnings Disclosure'
      },
      {
        period: 'Q1 FY25',
        managementGuidance: 'Expected margin volatility due to rapid 15% spike in LME copper prices.',
        actualDelivered: 'Pass-through pricing mechanics protected EBITDA margin at 13.6%.',
        variance: 'Full raw-material pass through',
        varianceType: 'met',
        sourceDoc: 'Q1 FY25 Concall'
      },
      {
        period: 'Q4 FY24',
        managementGuidance: 'Targeted ₹18,000 Cr FY24 top-line.',
        actualDelivered: 'Delivered ₹18,039 Cr, fulfilling annual guidance.',
        variance: 'Met on the dot',
        varianceType: 'met',
        sourceDoc: 'Annual Financial Statements'
      },
      {
        period: 'Q3 FY24',
        managementGuidance: 'FMEG segment guided to reach EBITDA breakeven.',
        actualDelivered: 'FMEG generated slight -0.8% loss due to branding and re-organization spend.',
        variance: 'FMEG breakeven delayed',
        varianceType: 'miss',
        sourceDoc: 'Q3 FY24 Concall'
      }
    ],
    guidanceLedger: [
      {
        metric: 'Revenue (Project LEAP)',
        managementStatement: 'Cross ₹20,000 Cr consolidated revenue by FY26 (reiterated in Q2 to be achieved in FY25 itself).',
        targetPeriod: 'FY25/26',
        concallSource: 'Project LEAP Presentation'
      },
      {
        metric: 'Export Share',
        managementStatement: 'Grow exports from 8% to 12% of total wire & cable revenue.',
        targetPeriod: 'FY26',
        concallSource: 'Q1 FY25 Concall Transcript'
      }
    ],
    cashQualityAnalysis: {
      cfoVsPatCommentary: 'Robust cash generation with $CFO / PAT = 1.15\times$. Virtually debt-free with ₹2,100 Cr in cash & liquid investments.',
      workingCapitalTrend: 'Working capital steady at 48 days; credit risk mitigated via channel financing.',
      fcfYield: '2.4% Free Cash Flow yield.',
      redFlagsDetected: false
    },
    bullBear: {
      bullCase: [
        'Direct beneficiary of India\'s multi-year power transmission, infrastructure capex, data centers, and renewable grid rollouts.',
        'Strong brand loyalty allows immediate weekly pass-through of copper and aluminum commodity price shocks.',
        'Project LEAP execution has been flawless, delivering growth 12 months ahead of target.'
      ],
      bearCase: [
        'Overhang from past regulatory tax searches, although company has issued clear operational affirmations.',
        'FMEG segment continues to face fierce competition from Havells, Crompton, and Orient, keeping segment ROIC depressed.',
        'Export demand susceptible to slowdowns in US/UK commercial real estate projects.'
      ]
    },
    primarySources: [
      {
        title: 'Polycab India Limited Annual Report 2023-24',
        type: 'Annual Report',
        period: 'FY 2023-24',
        url: 'https://polycab.com/investors'
      },
      {
        title: 'Q2 FY25 Unaudited Financial Statement',
        type: 'Quarterly Results',
        period: 'Q2 FY25',
        url: 'https://nsearchives.nseindia.com/corporate/POLYCAB_Results.pdf'
      }
    ]
  }
};

