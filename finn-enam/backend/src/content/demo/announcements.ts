import type { Announcement, TriggeredAlert } from './fixtureTypes.js';

export const MOCK_TRIGGERED_ALERTS: TriggeredAlert[] = [
  {
    id: 'alert-1',
    ticker: 'DIXON.NS',
    companyName: 'Dixon Technologies',
    type: 'volume_spike',
    severity: 'critical',
    headline: 'Volume 3.45x 20-DMA with +6.40% Price Expansion',
    triggerMetric: '+6.40% | 3.45x Vol',
    explanation: 'Exceptional volume surge following cabinet approval for IT hardware PLI incentives and new smartphone assembly contract win.',
    timestamp: 'Today, 14:15 IST',
    announcementId: 'ann-dixon-capex',
    isEod: false
  },
  {
    id: 'alert-2',
    ticker: 'TRENT.NS',
    companyName: 'Trent Ltd.',
    type: 'material_filing',
    severity: 'critical',
    headline: 'Q2 FY25 PAT Surges +46.8% YoY with 15.2% Margin (+140 bps)',
    triggerMetric: 'PAT +46.8% YoY',
    explanation: 'Headline financial delivery significantly beat institutional consensus driven by 128 new Zudio store additions in H1.',
    timestamp: 'Today, 12:45 IST',
    announcementId: 'ann-trent-results',
    isEod: false
  },
  {
    id: 'alert-3',
    ticker: 'INFY.NS',
    companyName: 'Infosys Ltd.',
    type: 'material_filing',
    severity: 'high',
    headline: 'C-Suite Transition: Jayesh Sanghrajka Appointed as CFO',
    triggerMetric: 'Key Mgmt Change',
    explanation: 'Internal veteran promoted to CFO role following planned retirement; removes executive transition overhang.',
    timestamp: 'Today, 09:30 IST',
    announcementId: 'ann-infy-mgmt',
    isEod: false
  },
  {
    id: 'alert-4',
    ticker: 'KAYNES.NS',
    companyName: 'Kaynes Technology',
    type: 'price_move',
    severity: 'high',
    headline: 'Price Move +5.10% on 2.80x Volume Ahead of QIP',
    triggerMetric: '+5.10% | 2.8x Vol',
    explanation: 'Sharp price and volume breakout ahead of ₹1,400 Cr institutional equity placement for Sanand semiconductor facility.',
    timestamp: 'Yesterday, 15:20 IST',
    announcementId: 'ann-kaynes-fund',
    isEod: true
  }
];

export const MOCK_ANNOUNCEMENTS: Announcement[] = [
  // 1. Quarterly Results - Trent
  {
    id: 'ann-trent-results',
    ticker: 'TRENT.NS',
    companyName: 'Trent Ltd.',
    category: 'results',
    timestamp: '2h ago',
    rawDate: '2026-10-29T12:45:00Z',
    title: 'Financial Results for the Quarter and Half Year Ended September 30, 2026',
    oneLineTakeaway: 'Exceptional quarter with revenue up +39.3% YoY to ₹4,156 Cr and EBITDA margin expanding 140 bps to 15.2%.',
    whyItMatters: 'Confirms that Zudio retail store rollouts continue to deliver profitable unit economics despite industry-wide discretionary consumption slowdown.',
    severity: 'critical',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/TRENT_29102026_Results.pdf',
    sourceDocTitle: 'Unaudited Standalone & Consolidated Financial Results Q2 FY25',
    quarterlyResults: {
      quarter: 'Q2 FY25',
      revenue: 4156,
      revenueYoY: 39.3,
      revenueQoQ: 8.4,
      ebitda: 631,
      ebitdaYoY: 53.9,
      ebitdaMargin: 15.2,
      ebitdaMarginChangeBps: 140,
      pbt: 512,
      pbtYoY: 48.4,
      pat: 370,
      patYoY: 46.8,
      patQoQ: 9.1
    },
    eventMemoryId: 'mem-trent-store-expansion'
  },

  // 2. Management Change - Infosys
  {
    id: 'ann-infy-mgmt',
    ticker: 'INFY.NS',
    companyName: 'Infosys Ltd.',
    category: 'management_change',
    timestamp: '5h ago',
    rawDate: '2026-10-29T09:30:00Z',
    title: 'Appointment of Jayesh Sanghrajka as Chief Financial Officer and Key Managerial Personnel',
    oneLineTakeaway: 'Jayesh Sanghrajka (18-year Infosys veteran and current Deputy CFO) appointed CFO effective immediately.',
    whyItMatters: 'Signals internal capital allocation continuity; removes speculation around external lateral hiring during enterprise IT deal cycle softness.',
    severity: 'high',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/INFY_29102026_KMP_CFO.pdf',
    sourceDocTitle: 'Outcome of Board Meeting - KMP Change under Reg 30',
    managementChange: {
      role: 'Chief Financial Officer (CFO)',
      personName: 'Jayesh Sanghrajka',
      direction: 'incoming',
      incomingBio: {
        summary: 'Chartered Accountant with 25+ years of financial leadership experience across corporate finance, M&A, treasury, and investor relations.',
        previousRole: 'Executive VP & Deputy Chief Financial Officer',
        previousCompany: 'Infosys Ltd. (Previously at KPMG)',
        tenureYears: 18,
        pedigreeHighlight: 'Rank holder CA; led financial structuring of Vanguard and Daimler mega-deals.'
      }
    }
  },

  // 3. Capex - Dixon Technologies
  {
    id: 'ann-dixon-capex',
    ticker: 'DIXON.NS',
    companyName: 'Dixon Technologies Ltd.',
    category: 'capex',
    timestamp: '7h ago',
    rawDate: '2026-10-29T07:15:00Z',
    title: 'Board Approval for ₹1,200 Crore Capex Program for Display Modules and Notebook EMS Facility in Greater Noida',
    oneLineTakeaway: 'Approved ₹1,200 Cr greenfield capacity expansion targeting global PC OEMs under the Revised IT Hardware PLI 2.0.',
    whyItMatters: 'Elevates domestic value addition from 14% to 32%; broadens revenue base from mobile phones into higher-margin IT hardware components.',
    severity: 'critical',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/DIXON_29102026_CapexApproval.pdf',
    sourceDocTitle: 'Disclosure under Regulation 30 - Capacity Addition & Capex Spend',
    eventMemoryId: 'mem-dixon-capex-pli'
  },

  // 4. M&A - Titan
  {
    id: 'ann-titan-ma',
    ticker: 'TITAN.NS',
    companyName: 'Titan Company Ltd.',
    category: 'M&A',
    timestamp: '18h ago',
    rawDate: '2026-10-28T16:00:00Z',
    title: 'Execution of Share Purchase Agreement to Acquire Remaining 27.18% Equity Stake in CaratLane Trading Pvt Ltd',
    oneLineTakeaway: 'Acquired remaining 27.18% in CaratLane for ₹4,621 Cr, making it a 100% wholly-owned omni-channel jewelry subsidiary.',
    whyItMatters: 'Consolidates dominance in modern lightweight diamond jewelry; funded primarily via internal cash and low-cost CP issuance.',
    severity: 'high',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/TITAN_28102026_CaratLaneSPA.pdf',
    sourceDocTitle: 'Acquisition of Balance Stake in Material Subsidiary',
    eventMemoryId: 'mem-titan-caratlane'
  },

  // 5. Fund Raise - Kaynes Tech
  {
    id: 'ann-kaynes-fund',
    ticker: 'KAYNES.NS',
    companyName: 'Kaynes Technology India',
    category: 'fund_raise',
    timestamp: '22h ago',
    rawDate: '2026-10-28T12:00:00Z',
    title: 'Outcome of Board Meeting: Approval of Fund Raising up to ₹1,400 Crore via Qualified Institutions Placement (QIP)',
    oneLineTakeaway: 'Board greenlights ₹1,400 Cr institutional equity placement to fund semiconductor OSAT/packaging plant in Sanand, Gujarat.',
    whyItMatters: 'Fully funds capex equity contribution alongside India Semiconductor Mission (ISM) 50% central fiscal incentive.',
    severity: 'high',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/KAYNES_28102026_QIPApproval.pdf',
    sourceDocTitle: 'Board Approval for QIP Equity Issuance',
    eventMemoryId: 'mem-kaynes-osat'
  },

  // 6. Litigation / Regulatory - Polycab
  {
    id: 'ann-polycab-lit',
    ticker: 'POLYCAB.NS',
    companyName: 'Polycab India Ltd.',
    category: 'litigation',
    timestamp: '1d ago',
    rawDate: '2026-10-28T09:00:00Z',
    title: 'Clarification regarding Search Proceedings conducted by Income Tax Department under Section 132',
    oneLineTakeaway: 'Company clarifies tax department search concluded with full cooperation; confirmed no material business disruption or unrecorded liabilities.',
    whyItMatters: 'Clears long-standing governance anxiety and restores institutional investor confidence in promoter reporting integrity.',
    severity: 'high',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/POLYCAB_28102026_ITClarification.pdf',
    sourceDocTitle: 'Press Release on Conclusion of Tax Proceedings'
  },

  // 7. Results - Polycab
  {
    id: 'ann-polycab-results',
    ticker: 'POLYCAB.NS',
    companyName: 'Polycab India Ltd.',
    category: 'results',
    timestamp: '1d ago',
    rawDate: '2026-10-28T08:30:00Z',
    title: 'Financial Results for the Quarter Ended September 30, 2026',
    oneLineTakeaway: 'Revenue grew +24.5% YoY to ₹5,498 Cr; EBITDA margin maintained firmly at 13.8% despite volatile copper input costs.',
    whyItMatters: 'Demonstrates robust institutional pricing power and market share gains in industrial cables from unorganized players.',
    severity: 'critical',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/POLYCAB_28102026_Q2Results.pdf',
    sourceDocTitle: 'Unaudited Standalone & Consolidated Results Q2 FY25',
    quarterlyResults: {
      quarter: 'Q2 FY25',
      revenue: 5498,
      revenueYoY: 24.5,
      revenueQoQ: 14.2,
      ebitda: 759,
      ebitdaYoY: 23.8,
      ebitdaMargin: 13.8,
      ebitdaMarginChangeBps: -10,
      pbt: 685,
      pbtYoY: 26.1,
      pat: 512,
      patYoY: 25.5,
      patQoQ: 12.8
    }
  },

  // 8. Press Release - HAL
  {
    id: 'ann-hal-order',
    ticker: 'HAL.NS',
    companyName: 'Hindustan Aeronautics',
    category: 'press_release',
    timestamp: '2d ago',
    rawDate: '2026-10-27T14:00:00Z',
    title: 'Contract Award of ₹26,000 Crore for 240 AL-31FP Aero Engines for IAF Su-30MKI Fleet',
    oneLineTakeaway: 'Signed ₹26,000 Cr contract with Ministry of Defence for domestic manufacturing of aero engines with over 54% indigenous content.',
    whyItMatters: 'Adds ~3 years of revenue visibility; cements HAL as sole sovereign aerospace engine manufacturer in India.',
    severity: 'high',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/HAL_27102026_MoDContract.pdf',
    sourceDocTitle: 'Press Release - MoD Contract Execution'
  },

  // 9. Dividend - TCS
  {
    id: 'ann-tcs-div',
    ticker: 'TCS.NS',
    companyName: 'Tata Consultancy Services',
    category: 'dividend',
    timestamp: '2d ago',
    rawDate: '2026-10-27T10:00:00Z',
    title: 'Declaration of Second Interim Dividend of ₹10 per Equity Share of ₹1 each',
    oneLineTakeaway: 'Interim dividend of ₹10/share declared; Record date fixed as November 15, 2026.',
    whyItMatters: 'Sustains 80%+ FCF payout policy, reaffirming strong cash conversion despite slower BFSI sector discretionary IT budget release.',
    severity: 'normal',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/TCS_27102026_Dividend.pdf',
    sourceDocTitle: 'Outcome of Board Meeting - Interim Dividend'
  },

  // 10. Credit Rating - L&T
  {
    id: 'ann-lt-rating',
    ticker: 'LT.NS',
    companyName: 'Larsen & Toubro Ltd.',
    category: 'credit_rating',
    timestamp: '3d ago',
    rawDate: '2026-10-26T16:45:00Z',
    title: 'Rating Action by CRISIL Ratings on Bank Facilities and Debt Instruments',
    oneLineTakeaway: 'CRISIL reaffirms AAA/Stable on long-term facilities citing unmatched order book of ₹4.8 Lakh Cr.',
    whyItMatters: 'Maintains premier Tier-1 funding access and lowest borrowing spreads in Indian corporate bond markets.',
    severity: 'normal',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/LT_26102026_CRISILRating.pdf',
    sourceDocTitle: 'Credit Rating Reaffirmation Circular'
  },

  // 11. Bonus / Split - CDSL
  {
    id: 'ann-cdsl-bonus',
    ticker: 'CDSL.NS',
    companyName: 'Central Depository Services',
    category: 'bonus_split',
    timestamp: '4d ago',
    rawDate: '2026-10-25T11:20:00Z',
    title: 'Allotment of 10,45,00,000 Equity Shares as Fully Paid-up Bonus Shares in the Ratio of 1:1',
    oneLineTakeaway: 'Bonus issue of 1:1 executed; equity base doubles to 20.9 Cr shares with immediate liquidity enhancement.',
    whyItMatters: 'Improves retail float velocity; no dilution to equity or cash reserves.',
    severity: 'normal',
    isRoutine: false,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/CDSL_25102026_BonusAllotment.pdf',
    sourceDocTitle: 'Bonus Share Allotment Disclosure'
  },

  // ROUTINE PAPERWORK / UNCLASSIFIED (Collapsed by default)
  {
    id: 'ann-rel-routine-1',
    ticker: 'RELIANCE.NS',
    companyName: 'Reliance Industries Ltd.',
    category: 'unclassified',
    timestamp: '3h ago',
    rawDate: '2026-10-29T11:00:00Z',
    title: 'Certificate under Regulation 74(5) of SEBI (DP) Regulations for Quarter Ended Sept 30, 2026',
    oneLineTakeaway: 'Standard quarterly demat confirmation certificate from KFin Technologies.',
    whyItMatters: 'Routine regulatory compliance filing with no impact on corporate fundamentals.',
    severity: 'routine',
    isRoutine: true,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/RIL_Reg74_5.pdf',
    sourceDocTitle: 'Reg 74(5) Compliance Certificate'
  },
  {
    id: 'ann-tcs-routine-2',
    ticker: 'TCS.NS',
    companyName: 'Tata Consultancy Services',
    category: 'unclassified',
    timestamp: '6h ago',
    rawDate: '2026-10-29T08:30:00Z',
    title: 'Submission of Shareholding Pattern for the Second Quarter ended September 30, 2026',
    oneLineTakeaway: 'Standard quarterly shareholding statement filed under Regulation 31.',
    whyItMatters: 'Statutory compliance disclosure showing marginal 0.02% institutional reallocation.',
    severity: 'routine',
    isRoutine: true,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/TCS_Reg31.pdf',
    sourceDocTitle: 'Shareholding Pattern Filing'
  },
  {
    id: 'ann-infy-routine-3',
    ticker: 'INFY.NS',
    companyName: 'Infosys Ltd.',
    category: 'unclassified',
    timestamp: '1d ago',
    rawDate: '2026-10-28T14:15:00Z',
    title: 'Allotment of 14,250 Equity Shares under 2015 Stock Incentive Plan (ESOP)',
    oneLineTakeaway: 'Routine ESOP exercise and equity allotment of 14,250 shares.',
    whyItMatters: 'Insignificant dilution (<0.0003% of share capital).',
    severity: 'routine',
    isRoutine: true,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/INFY_ESOPAllotment.pdf',
    sourceDocTitle: 'ESOP Allotment Notice'
  },
  {
    id: 'ann-hdfc-routine-4',
    ticker: 'HDFCBANK.NS',
    companyName: 'HDFC Bank Ltd.',
    category: 'unclassified',
    timestamp: '1d ago',
    rawDate: '2026-10-28T11:00:00Z',
    title: 'Intimation of Loss of Share Certificates / Issue of Duplicate Share Certificates',
    oneLineTakeaway: 'Notice regarding loss of physical share certificate for 50 shares.',
    whyItMatters: 'Purely clerical shareholder service notice.',
    severity: 'routine',
    isRoutine: true,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/HDFC_LossCert.pdf',
    sourceDocTitle: 'Loss of Share Certificates Notice'
  },
  {
    id: 'ann-titan-routine-5',
    ticker: 'TITAN.NS',
    companyName: 'Titan Company Ltd.',
    category: 'agm_egm',
    timestamp: '2d ago',
    rawDate: '2026-10-27T17:00:00Z',
    title: 'Scrutinizer Report on Results of Postal Ballot Voting on ESOP Plan Modification',
    oneLineTakeaway: 'Postal ballot resolution passed with 99.4% majority votes in favor.',
    whyItMatters: 'Routine procedural ratification of executive compensation framework.',
    severity: 'routine',
    isRoutine: true,
    sourceUrl: 'https://nsearchives.nseindia.com/corporate/TITAN_PostalBallotScrutinizer.pdf',
    sourceDocTitle: 'Scrutinizer Postal Ballot Report'
  }
];

