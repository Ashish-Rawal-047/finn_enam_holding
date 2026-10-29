/**
 * FINN Backend Data Engine & Primary Grounding Ledger
 * Serves institutional fixtures and dynamic research generators for the REST API
 */

export const EOD_BASELINE_DATE = '2026-10-28';
export const DEMO_DATA_DISCLAIMER = "DEMO FIXTURE: Realistic simulated Indian equity market data for the ENAM Build Challenge evaluation.";

export const COMPANIES = [
  // Large Cap
  {
    ticker: 'RELIANCE.NS',
    name: 'Reliance Industries Ltd.',
    bseCode: '500325',
    sector: 'Conglomerate / Energy & Retail',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 2842.50,
    changePercent: 1.15,
    volumeRatio: 0.95,
    sparkline: [2780, 2805, 2790, 2815, 2830, 2842],
    screenerUrl: 'https://www.screener.in/company/RELIANCE/',
    irUrl: 'https://www.ril.com/investor-relations'
  },
  {
    ticker: 'TCS.NS',
    name: 'Tata Consultancy Services',
    bseCode: '532540',
    sector: 'IT Services',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 3980.20,
    changePercent: -0.45,
    volumeRatio: 0.82,
    sparkline: [4050, 4020, 3995, 3970, 3985, 3980],
    screenerUrl: 'https://www.screener.in/company/TCS/',
    irUrl: 'https://www.tcs.com/investor-relations'
  },
  {
    ticker: 'HDFCBANK.NS',
    name: 'HDFC Bank Ltd.',
    bseCode: '500180',
    sector: 'Banking & Financial Services',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 1720.80,
    changePercent: 0.60,
    volumeRatio: 1.15,
    sparkline: [1680, 1695, 1710, 1705, 1718, 1720],
    screenerUrl: 'https://www.screener.in/company/HDFCBANK/',
    irUrl: 'https://www.hdfcbank.com'
  },
  {
    ticker: 'INFY.NS',
    name: 'Infosys Ltd.',
    bseCode: '500209',
    sector: 'IT Services',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 1845.00,
    changePercent: -1.25,
    volumeRatio: 1.45,
    sparkline: [1890, 1875, 1860, 1835, 1850, 1845],
    screenerUrl: 'https://www.screener.in/company/INFY/',
    irUrl: 'https://www.infosys.com/investors'
  },
  {
    ticker: 'LT.NS',
    name: 'Larsen & Toubro Ltd.',
    bseCode: '500510',
    sector: 'Capital Goods / Infrastructure',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 3560.40,
    changePercent: 2.10,
    volumeRatio: 1.68,
    sparkline: [3420, 3450, 3480, 3510, 3530, 3560],
    screenerUrl: 'https://www.screener.in/company/LT/',
    irUrl: 'https://www.larsentoubro.com/investor-relations'
  },
  {
    ticker: 'BHARTIARTL.NS',
    name: 'Bharti Airtel Ltd.',
    bseCode: '532454',
    sector: 'Telecommunications',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 1685.10,
    changePercent: 0.85,
    volumeRatio: 0.90,
    sparkline: [1650, 1660, 1672, 1665, 1680, 1685],
    screenerUrl: 'https://www.screener.in/company/BHARTIARTL/',
    irUrl: 'https://www.airtel.in'
  },
  {
    ticker: 'TITAN.NS',
    name: 'Titan Company Ltd.',
    bseCode: '500114',
    sector: 'Consumer Discretionary / Jewellery',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 3340.00,
    changePercent: -0.30,
    volumeRatio: 0.78,
    sparkline: [3380, 3360, 3350, 3320, 3345, 3340],
    screenerUrl: 'https://www.screener.in/company/TITAN/',
    irUrl: 'https://www.titancompany.in'
  },
  {
    ticker: 'TATAMOTORS.NS',
    name: 'Tata Motors Ltd.',
    bseCode: '500570',
    sector: 'Automotive / EV',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 890.30,
    changePercent: 1.80,
    volumeRatio: 1.35,
    sparkline: [860, 868, 875, 870, 882, 890],
    screenerUrl: 'https://www.screener.in/company/TATAMOTORS/',
    irUrl: 'https://www.tatamotors.com/investors'
  },

  // Mid Cap
  {
    ticker: 'TRENT.NS',
    name: 'Trent Ltd.',
    bseCode: '500251',
    sector: 'Consumer Discretionary / Apparel Retail',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 6840.50,
    changePercent: 4.85,
    volumeRatio: 2.85, // Material Volume Spike Anomaly
    sparkline: [6200, 6350, 6420, 6500, 6680, 6840],
    screenerUrl: 'https://www.screener.in/company/TRENT/',
    irUrl: 'https://www.trentlimited.com'
  },
  {
    ticker: 'POLYCAB.NS',
    name: 'Polycab India Ltd.',
    bseCode: '542652',
    sector: 'Capital Goods / Cables & Wires',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 6420.00,
    changePercent: -5.40, // Material Price Drop Anomaly
    volumeRatio: 3.20, // Major Volume Spike Anomaly
    sparkline: [6850, 6800, 6720, 6650, 6500, 6420],
    screenerUrl: 'https://www.screener.in/company/POLYCAB/',
    irUrl: 'https://www.polycab.com/investor-relations'
  },
  {
    ticker: 'PERSISTENT.NS',
    name: 'Persistent Systems Ltd.',
    bseCode: '533179',
    sector: 'IT Services / Digital Engineering',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 5320.10,
    changePercent: 3.20,
    volumeRatio: 1.75,
    sparkline: [5050, 5100, 5150, 5200, 5250, 5320],
    screenerUrl: 'https://www.screener.in/company/PERSISTENT/',
    irUrl: 'https://www.persistent.com/investors'
  },
  {
    ticker: 'DIXON.NS',
    name: 'Dixon Technologies Ltd.',
    bseCode: '540699',
    sector: 'Electronics Manufacturing Services (EMS)',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 14250.00,
    changePercent: 6.15, // Price Anomaly
    volumeRatio: 2.45,
    sparkline: [12800, 13100, 13400, 13650, 13900, 14250],
    screenerUrl: 'https://www.screener.in/company/DIXON/',
    irUrl: 'https://www.dixoninfo.com'
  },
  {
    ticker: 'SUNPHARMA.NS',
    name: 'Sun Pharmaceutical Industries',
    bseCode: '524715',
    sector: 'Pharmaceuticals',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 1780.40,
    changePercent: 0.40,
    volumeRatio: 0.70,
    sparkline: [1760, 1765, 1775, 1770, 1785, 1780],
    screenerUrl: 'https://www.screener.in/company/SUNPHARMA/',
    irUrl: 'https://www.sunpharma.com'
  },
  {
    ticker: 'BAJFINANCE.NS',
    name: 'Bajaj Finance Ltd.',
    bseCode: '500034',
    sector: 'NBFC / Retail Finance',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 6920.00,
    changePercent: -1.80,
    volumeRatio: 1.10,
    sparkline: [7100, 7050, 7000, 6950, 6980, 6920],
    screenerUrl: 'https://www.screener.in/company/BAJFINANCE/',
    irUrl: 'https://www.bajajfinserv.in'
  },

  // High-Growth / Small & Mid Cap
  {
    ticker: 'KAYNES.NS',
    name: 'Kaynes Technology India Ltd.',
    bseCode: '543664',
    sector: 'EMS / Space & Defense Electronics',
    marketCapCategory: 'Small Cap',
    inWatchlist: true,
    currentPrice: 4890.00,
    changePercent: 3.80,
    volumeRatio: 1.95,
    sparkline: [4450, 4520, 4610, 4700, 4800, 4890],
    screenerUrl: 'https://www.screener.in/company/KAYNES/',
    irUrl: 'https://www.kaynestechnology.net'
  },
  {
    ticker: 'CDSL.NS',
    name: 'Central Depository Services Ltd.',
    bseCode: '542651',
    sector: 'Capital Markets Infrastructure',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 1480.20,
    changePercent: 1.10,
    volumeRatio: 0.88,
    sparkline: [1440, 1455, 1460, 1470, 1475, 1480],
    screenerUrl: 'https://www.screener.in/company/CDSL/',
    irUrl: 'https://www.cdslindia.com'
  },
  {
    ticker: 'KPITTECH.NS',
    name: 'KPIT Technologies Ltd.',
    bseCode: '542651',
    sector: 'Automotive Software / ER&D',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 1640.00,
    changePercent: -2.40,
    volumeRatio: 1.30,
    sparkline: [1720, 1700, 1680, 1660, 1650, 1640],
    screenerUrl: 'https://www.screener.in/company/KPITTECH/',
    irUrl: 'https://www.kpit.com'
  },
  {
    ticker: 'HAL.NS',
    name: 'Hindustan Aeronautics Ltd.',
    bseCode: '541154',
    sector: 'Defense & Aerospace',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 4410.50,
    changePercent: 2.75,
    volumeRatio: 1.40,
    sparkline: [4200, 4250, 4310, 4350, 4380, 4410],
    screenerUrl: 'https://www.screener.in/company/HAL/',
    irUrl: 'https://www.hal-india.co.in'
  },

  // Ad-Hoc / Out-of-Portfolio Research Examples
  {
    ticker: 'ZOMATO.NS',
    name: 'Zomato Ltd.',
    bseCode: '543320',
    sector: 'Internet / Quick Commerce & Food Delivery',
    marketCapCategory: 'Large Cap',
    inWatchlist: false,
    currentPrice: 265.40,
    changePercent: 3.10,
    volumeRatio: 1.85,
    sparkline: [248, 252, 255, 258, 262, 265],
    screenerUrl: 'https://www.screener.in/company/ZOMATO/',
    irUrl: 'https://www.zomato.com/investor-relations'
  },
  {
    ticker: 'UNOMINDA.NS',
    name: 'Uno Minda Ltd.',
    bseCode: '532539',
    sector: 'Auto Ancillaries / Electronics',
    marketCapCategory: 'Mid Cap',
    inWatchlist: false,
    currentPrice: 1140.00,
    changePercent: 0.90,
    volumeRatio: 0.75,
    sparkline: [1110, 1120, 1125, 1130, 1135, 1140],
    screenerUrl: 'https://www.screener.in/company/UNOMINDA/',
    irUrl: 'https://www.unominda.com'
  },
  {
    ticker: 'SUZLON.NS',
    name: 'Suzlon Energy Ltd.',
    bseCode: '532667',
    sector: 'Renewable Energy / Wind Turbines',
    marketCapCategory: 'Mid Cap',
    inWatchlist: false,
    currentPrice: 68.20,
    changePercent: -3.80,
    volumeRatio: 2.10,
    sparkline: [72, 71, 70, 69.5, 69, 68.2],
    screenerUrl: 'https://www.screener.in/company/SUZLON/',
    irUrl: 'https://www.suzlon.com'
  },
  {
    ticker: 'JYOTICNC.NS',
    name: 'Jyoti CNC Automation Ltd.',
    bseCode: '544081',
    sector: 'Capital Goods / Precision CNC Machines',
    marketCapCategory: 'Small Cap',
    inWatchlist: false,
    currentPrice: 1245.00,
    changePercent: 4.50,
    volumeRatio: 2.30,
    sparkline: [1150, 1170, 1190, 1210, 1225, 1245],
    screenerUrl: 'https://www.screener.in/company/JYOTICNC/',
    irUrl: 'https://www.jyoticnc.com'
  }
];

export const ANNOUNCEMENTS = [
  {
    id: 'ann-trent-q2-01',
    ticker: 'TRENT.NS',
    companyName: 'Trent Ltd.',
    timestamp: '2026-10-28 16:45 IST',
    timeHorizon: '24h',
    category: 'results',
    severity: 'critical',
    title: 'Financial Results for Q2 FY25 (Unaudited Standalone & Consolidated)',
    oneLineTakeaway: 'Trent reports stellar Q2 FY25 consolidated revenue growth of +39.3% YoY to ₹4,156 Cr with EBITDA margin expanding 140 bps to 15.2%.',
    whyItMatters: 'Outperformed Street expectations significantly driven by rapid store additions (43 net Zudio stores in Q2) and zero margin dilution.',
    sourceDocTitle: 'Outcome of Board Meeting - Financial Results for the Quarter Ended September 30, 2026',
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/TRENT_28102026164500_Results.pdf',
    eventMemoryId: 'mem-trent-01',
    quarterlyResults: {
      quarter: 'Q2 FY25',
      revenueCr: 4156.4,
      revenueGrowthYoY: 39.3,
      revenueGrowthQoQ: 8.7,
      ebitdaCr: 631.8,
      ebitdaMargin: 15.2,
      ebitdaMarginChangeBps: 140,
      pbtCr: 485.2,
      patCr: 370.6,
      patGrowthYoY: 46.8
    }
  },
  {
    id: 'ann-polycab-tax-02',
    ticker: 'POLYCAB.NS',
    companyName: 'Polycab India Ltd.',
    timestamp: '2026-10-28 14:15 IST',
    timeHorizon: '24h',
    category: 'litigation',
    severity: 'critical',
    title: 'Disclosure under Regulation 30 - Receipt of Order / Demand Notice from IT Dept',
    oneLineTakeaway: 'Income Tax Appellate initiates demand notice of ₹342 Cr regarding disallowance of raw material supplier expenses for FY22-23.',
    whyItMatters: 'Triggers potential balance sheet provision risk of ~18% of annualized PAT; management states strong legal defense grounds.',
    sourceDocTitle: 'Corporate Disclosure under SEBI LODR Regulation 30 - Tax Assessment Proceedings',
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/POLYCAB_28102026141500_Notice.pdf',
    eventMemoryId: 'mem-polycab-01'
  },
  {
    id: 'ann-persistent-ceo-03',
    ticker: 'PERSISTENT.NS',
    companyName: 'Persistent Systems Ltd.',
    timestamp: '2026-10-28 11:30 IST',
    timeHorizon: '24h',
    category: 'management_change',
    severity: 'high',
    title: 'Appointment of Chief Operating Officer (COO) & Senior Management Personnel',
    oneLineTakeaway: 'Persistent names Rajesh Sundaram (ex-Cognizant SVP, Global Cloud Delivery) as Chief Operating Officer effective Nov 15.',
    whyItMatters: 'Strengthens tier-1 enterprise delivery capability; incoming executive previously scaled a $3B cloud modernization portfolio.',
    sourceDocTitle: 'Outcome of Nomination and Remuneration Committee - Key Managerial Personnel Appointment',
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/PERSISTENT_28102026113000_KMP.pdf',
    managementChange: {
      direction: 'incoming',
      personName: 'Rajesh Sundaram',
      designation: 'Chief Operating Officer (COO)',
      effectiveDate: '2026-11-15',
      incomingBio: {
        previousRole: 'SVP & Global Head of Cloud Infrastructure Services at Cognizant',
        tenureYears: 24,
        keyAchievements: ['Scaled cloud division from $800M to $3.2B run-rate', 'Oversaw 38,000 engineers globally across US and EMEA'],
        summary: 'Accomplished technology executive with 24+ years specializing in enterprise modernization, hyperscaler alliances (AWS/Azure), and gross margin optimization.'
      }
    }
  },
  {
    id: 'ann-dixon-capex-04',
    ticker: 'DIXON.NS',
    companyName: 'Dixon Technologies Ltd.',
    timestamp: '2026-10-27 18:20 IST',
    timeHorizon: '48h',
    category: 'capex',
    severity: 'high',
    title: 'Inauguration of New Display Module & Smartphone Assembly Facility in Noida',
    oneLineTakeaway: 'Dixon commissions Phase-2 facility with 12M annual smartphone capacity, committed under PLI Scheme for Large Scale Electronics.',
    whyItMatters: 'Directly delivers on the Q3 FY24 capex commitment 2 months ahead of schedule; unlocks ₹180 Cr PLI incentive eligibility for FY25.',
    sourceDocTitle: 'Press Release - Commissioning of State-of-the-art Electronics Manufacturing Plant',
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/DIXON_27102026182000_PressRelease.pdf',
    eventMemoryId: 'mem-dixon-01'
  },
  {
    id: 'ann-trent-shareholding-05',
    ticker: 'TRENT.NS',
    companyName: 'Trent Ltd.',
    timestamp: '2026-10-28 09:30 IST',
    timeHorizon: '24h',
    category: 'unclassified',
    severity: 'routine',
    title: 'Quarterly Statement of Investor Complaints under Regulation 13(3)',
    oneLineTakeaway: 'Nil pending investor complaints at the start and end of the quarter ended September 30, 2026.',
    whyItMatters: 'Routine statutory compliance disclosure with zero financial or operational consequence.',
    sourceDocTitle: 'SCORES Redressal Report for Q2 FY25',
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/TRENT_28102026093000_Reg13.pdf'
  },
  {
    id: 'ann-infy-routine-06',
    ticker: 'INFY.NS',
    companyName: 'Infosys Ltd.',
    timestamp: '2026-10-27 15:10 IST',
    timeHorizon: '48h',
    category: 'unclassified',
    severity: 'routine',
    title: 'Allotment of 14,250 Equity Shares under 2015 Stock Incentive Compensation Plan',
    oneLineTakeaway: 'Minor share capital expansion of 0.0003% following ESOP exercise.',
    whyItMatters: 'Negligible dilution; purely administrative ESOP compliance.',
    sourceDocTitle: 'Intimation of Share Allotment under ESOP Scheme',
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/INFY_27102026151000_ESOP.pdf'
  }
];

export const EVENT_MEMORY = [
  {
    id: 'mem-trent-01',
    ticker: 'TRENT.NS',
    companyName: 'Trent Ltd.',
    title: 'Zudio Store Expansion & Margin Defense Commitment',
    category: 'capacity',
    status: 'delivered',
    commitmentDate: '2024-05-08',
    commitmentSource: 'Q4 FY24 Earnings Conference Call',
    quoteOrTarget: 'Management guided adding 200 net Zudio stores in FY25 while defending consolidated EBITDA margins above 14.5%.',
    milestoneDeadline: 'FY25 Full Year',
    subsequentObservations: [
      {
        date: '2024-08-10',
        observationPeriod: 'Q1 FY25',
        sourceDocument: 'Q1 FY25 Earnings Release & Concall',
        observedFact: 'Added 68 net Zudio stores; EBITDA margin expanded to 15.4%.',
        verificationStatus: 'verified'
      },
      {
        date: '2024-11-04',
        observationPeriod: 'Q2 FY25',
        sourceDocument: 'Q2 FY25 Financial Disclosures',
        observedFact: 'Added 43 net Zudio stores (cumulative 111 stores in H1); EBITDA margin delivered at 15.2%.',
        verificationStatus: 'verified'
      }
    ],
    factsSummary: 'Trent guided for 200 Zudio additions in FY25 with >14.5% EBITDA margin. In H1 FY25, Trent opened 111 net stores and delivered 15.3% avg margin, pacing ahead of annual target.',
    aiInterpretation: 'Execution reflects superior vendor bargaining power and negative working capital retail model. Zero cannibalization observed between Zudio and Westside footprint.',
    comparableHistoricalEvents: [
      {
        company: 'DMART.NS (Avenue Supermarts)',
        date: 'FY22',
        description: 'Guided 40+ stores post-COVID; delivered 50 stores with steady 8.5% EBITDA margin.'
      }
    ]
  },
  {
    id: 'mem-dixon-01',
    ticker: 'DIXON.NS',
    companyName: 'Dixon Technologies Ltd.',
    title: 'Mobile Facility Phase-2 Commissioning & PLI Target',
    category: 'capex',
    status: 'delivered',
    commitmentDate: '2024-02-14',
    commitmentSource: 'Q3 FY24 Earnings Release',
    quoteOrTarget: 'Committed to operationalizing Noida Phase-2 with 12M smartphone capacity by December 2026.',
    milestoneDeadline: 'December 2026',
    subsequentObservations: [
      {
        date: '2024-10-27',
        observationPeriod: 'Q2 FY25',
        sourceDocument: 'SEBI LODR Press Release',
        observedFact: 'Noida Phase-2 commissioned on October 27, 2026 (2 months ahead of schedule).',
        verificationStatus: 'verified'
      }
    ],
    factsSummary: 'Targeted Phase-2 commissioning by Dec 2026 for 12M capacity. Factory fully inaugurated in Oct 2026 with anchor client Xiaomi onboarding.',
    aiInterpretation: 'Substantiates Dixon as the primary beneficiary of India electronics local value addition (PLI). Reduces operational execution risk.',
    comparableHistoricalEvents: []
  },
  {
    id: 'mem-polycab-01',
    ticker: 'POLYCAB.NS',
    companyName: 'Polycab India Ltd.',
    title: 'Project Leap: ₹20,000 Cr Revenue Target by FY26',
    category: 'revenue',
    status: 'pending',
    commitmentDate: '2022-06-15',
    commitmentSource: 'Analyst Day 2022 Presentation (Project Leap)',
    quoteOrTarget: 'Achieve ₹20,000 Cr consolidated top-line by FY26 with FMEG contribution exceeding 12%.',
    milestoneDeadline: 'FY26 Full Year',
    subsequentObservations: [
      {
        date: '2024-05-12',
        observationPeriod: 'FY24 Full Year',
        sourceDocument: 'Annual Report FY24',
        observedFact: 'Delivered ₹18,039 Cr revenue (90% of FY26 milestone reached 2 years early); FMEG share lagged at 8.2%.',
        verificationStatus: 'verified'
      }
    ],
    factsSummary: 'Project Leap guided ₹20,000 Cr revenue by FY26. TTM revenue is currently ₹18,900 Cr, on course to surpass 1 year ahead of plan. FMEG profitability remains a drag.',
    aiInterpretation: 'Core B2B cables and wires franchise has outpaced expectations; retail FMEG transition has required higher trade discounts.',
    comparableHistoricalEvents: [
      {
        company: 'HAVELLS.NS (Havells India)',
        date: 'FY20',
        description: 'Guided Lloyd AC turnaround within 3 years; turnaround delayed by 5 quarters due to intense price competition.'
      }
    ]
  }
];

export const RESEARCH_DATABASE = {
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
      cfoVsPatCommentary: 'Superb cash conversion (CFO/PAT = 1.28x). Operating cash flow grew 44% YoY, fully financing store additions without external debt.',
      workingCapitalTrend: 'Working capital days contracted from 29 days to 24 days due to negative working capital dynamics in the Zudio retail model.',
      fcfYield: 'FCF Yield is 1.8%, reflecting intensive growth reinvestment in store fit-outs.',
      redFlagsDetected: false
    },
    bullBear: {
      bullCase: [
        'Zudio represents an unassailable scale flywheel in Indian value fashion; target market is >₹3 Lakh Cr unorganized apparel.',
        'Negative working capital cycle and rapid store payback (<16 months) fund exponential store additions entirely from internal accruals.',
        'Emerging formats like Star Bazaar JV and Misbu provide long-term optionality beyond apparel.'
      ],
      bearCase: [
        'Rich valuation multiple (>90x trailing P/E) leaves minimal margin of safety for store rollout deceleration.',
        'Intensifying competition from aggressive value fashion entrants (Reliance Yousta, Aditya Birla Style Up, Max Fashion).',
        'Commercial lease rental inflation in tier-1 metro locations could pressure store-level EBITDA.'
      ]
    },
    primarySources: [
      {
        title: 'Trent Ltd. 72nd Annual Report FY24',
        type: 'Annual Report',
        period: 'FY 2023-24',
        url: 'https://www.trentlimited.com/investor-relations/annual-reports'
      },
      {
        title: 'Q2 FY25 Audited Financial Results Circular under Reg 33',
        type: 'Quarterly Results',
        period: 'Quarter Ended Sep 30, 2026',
        url: 'https://nsearchives.nseindia.com/corporate/TRENT_Q2_FY25.pdf'
      },
      {
        title: 'Q2 FY25 Institutional Earnings Call Transcript',
        type: 'Concall Transcript',
        period: 'Q2 FY25',
        url: 'https://www.trentlimited.com/investor-relations/concall-transcripts'
      }
    ]
  }
};
