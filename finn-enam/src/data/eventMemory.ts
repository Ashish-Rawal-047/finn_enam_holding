import { EventMemoryItem } from '../types';

export const MOCK_EVENT_MEMORY: EventMemoryItem[] = [
  {
    id: 'mem-trent-store-expansion',
    ticker: 'TRENT.NS',
    companyName: 'Trent Ltd.',
    title: 'Zudio Pan-India Rollout: 200 Net New Stores in FY25',
    commitmentDate: 'May 3, 2024',
    sourceDoc: 'Q4 FY24 Earnings Call Transcript (Page 14, MD Noel Tata remarks)',
    sourcePageOrQuote: '"We are committed to adding approximately 200 new Zudio stores during FY25, funded entirely from our operating cash flows, while maintaining store-level ROCE in excess of 25%."',
    category: 'capacity',
    announcedMetric: '200 new stores (₹350 Cr Capex)',
    milestoneDeadline: 'Q4 FY25 (March 2025)',
    status: 'delivered',
    statusConfidence: 0.98,
    factsSummary: 'Trent added 68 stores in Q1 FY25 and 60 stores in Q2 FY25 (Total: 128 stores in H1 alone). Management announced in Q2 filings that the full-year target will reach 220+ stores, exceeding original guidance.',
    aiInterpretation: 'Execution velocity is running at 114% of plan. Fast inventory turns (12-14 days for fresh apparel drops) are generating sufficient working capital liquidity to finance fit-outs without bank borrowing.',
    historicalComps: [
      {
        companyOrPeer: 'Trent Ltd. (Westside)',
        pastEvent: 'FY19 Westside 40-store expansion pledge',
        outcome: 'Delivered (44 stores opened; revenue up 18%)',
        year: 'FY 2019'
      },
      {
        companyOrPeer: 'Aditya Birla Fashion (Pantaloons)',
        pastEvent: 'FY23 60-store expansion plan',
        outcome: 'Delayed (Achieved 38 stores due to high mall rentals)',
        year: 'FY 2023'
      }
    ],
    timeline: [
      {
        date: 'May 3, 2024',
        observation: 'Guidance announced on Q4 FY24 concall: 200 Zudio stores planned for FY25.',
        sourceDoc: 'Q4 FY24 Concall Transcript',
        reportedMetric: 'Target: 200 Stores',
        statusDelta: 'neutral'
      },
      {
        date: 'August 9, 2024',
        observation: 'Q1 FY25 Results release: 68 new Zudio stores opened; store count reached 559 across 164 cities.',
        sourceDoc: 'Q1 FY25 Investor Deck (Slide 8)',
        reportedMetric: '+68 Stores (34% of target)',
        statusDelta: 'positive'
      },
      {
        date: 'October 29, 2026',
        observation: 'Q2 FY25 Results release: 60 additional stores opened; H1 total reaches 128 stores. Guidance upgraded to 220+ stores.',
        sourceDoc: 'Q2 FY25 Exchange Disclosure',
        reportedMetric: '128 stores H1 cumulative',
        statusDelta: 'positive'
      }
    ]
  },
  {
    id: 'mem-dixon-capex-pli',
    ticker: 'DIXON.NS',
    companyName: 'Dixon Technologies Ltd.',
    title: 'IT Hardware PLI 2.0: Commercial Notebook Assembly Plant',
    commitmentDate: 'November 14, 2023',
    sourceDoc: 'Q2 FY24 Earnings Conference Call (Page 9)',
    sourcePageOrQuote: '"We plan to invest ₹250 Crores over 18 months for IT hardware assembly, targeting commercial production of laptops by Q3 FY25 under the approved PLI 2.0 scheme."',
    category: 'capex',
    announcedMetric: '₹250 Cr Capex / Q3 FY25 Production',
    milestoneDeadline: 'Q3 FY25 (December 2024)',
    status: 'delayed',
    statusConfidence: 0.91,
    factsSummary: 'Pilot production and SMT line installation completed in October 2024; however, high-volume mass production has been rescheduled to Q4 FY25 due to delayed import authorizations for display panels.',
    aiInterpretation: 'Delay is largely regulatory and supply-chain driven rather than an internal engineering breakdown. Order backlog from Lenovo and Acer remains intact. Revenue recognition will shift into Q4 FY25 and Q1 FY26.',
    historicalComps: [
      {
        companyOrPeer: 'Dixon Technologies',
        pastEvent: 'FY21 Mobile PLI 1.0 Factory Setup (Noida)',
        outcome: 'Delivered on schedule within 9 months',
        year: 'FY 2021'
      },
      {
        companyOrPeer: 'Amber Enterprises',
        pastEvent: 'FY23 Electronics Components PLI Expansion',
        outcome: 'Delayed by 2 quarters due to tool delivery lag',
        year: 'FY 2023'
      }
    ],
    timeline: [
      {
        date: 'Nov 14, 2023',
        observation: 'Management commits to ₹250 Cr laptop/notebook plant with Q3 FY25 commercial start.',
        sourceDoc: 'Q2 FY24 Concall Transcript',
        reportedMetric: '₹250 Cr Capex Target',
        statusDelta: 'neutral'
      },
      {
        date: 'May 20, 2024',
        observation: 'Noida facility leased (300,000 sq ft); SMT lines ordered from Japan.',
        sourceDoc: 'Annual Report FY24 (MD&A section)',
        reportedMetric: '50% Capex deployed',
        statusDelta: 'positive'
      },
      {
        date: 'October 29, 2026',
        observation: 'Board approves expanded ₹1,200 Cr capex program. Note indicates commercial notebook lines shifting rollout from Q3 FY25 to Q4 FY25.',
        sourceDoc: 'Exchange Disclosure under Reg 30',
        reportedMetric: 'Revised Timeline: Q4 FY25',
        statusDelta: 'negative'
      }
    ]
  },
  {
    id: 'mem-infy-margin-corridor',
    ticker: 'INFY.NS',
    companyName: 'Infosys Ltd.',
    title: 'FY25 Operating Margin Guidance Corridor of 20.0% – 22.0%',
    commitmentDate: 'April 18, 2024',
    sourceDoc: 'FY24 Audited Financial Statement Press Release & Guidance Sheet',
    sourcePageOrQuote: '"For the financial year ending March 31, 2025, we expect operating margin to be in the range of 20.0% to 22.0%, factoring in wage normalization and Project Maximus cost optimization."',
    category: 'margin',
    announcedMetric: '20.0% – 22.0% EBIT Margin',
    milestoneDeadline: 'Full Year FY25',
    status: 'delivered',
    statusConfidence: 0.95,
    factsSummary: 'Infosys reported EBIT margin of 21.1% in Q1 FY25 and 21.2% in Q2 FY25. The company reiterated its guidance corridor at the midpoint (21.1%) during the October investor call.',
    aiInterpretation: 'Cost efficiency initiatives under "Project Maximus" (sub-contractor expense rationalization, higher offshore pyramid utilization) have successfully offset headwinds from muted discretionary tech spending.',
    historicalComps: [
      {
        companyOrPeer: 'Infosys Ltd.',
        pastEvent: 'FY23 Margin Guidance (21-23%)',
        outcome: 'Missed (Revised down to 21.0% mid-year due to retention costs)',
        year: 'FY 2023'
      },
      {
        companyOrPeer: 'TCS',
        pastEvent: 'FY24 26-28% Aspirational Margin Band',
        outcome: 'Missed (Achieved 24.6% in FY24)',
        year: 'FY 2024'
      }
    ],
    timeline: [
      {
        date: 'April 18, 2024',
        observation: 'Guidance stated: 20.0% to 22.0% operating margin band.',
        sourceDoc: 'FY24 Press Release',
        reportedMetric: '20.0% - 22.0% Band',
        statusDelta: 'neutral'
      },
      {
        date: 'July 18, 2024',
        observation: 'Q1 FY25 delivered 21.1% EBIT margin (up 30 bps YoY).',
        sourceDoc: 'Q1 FY25 Audited Statements',
        reportedMetric: '21.1% Delivered',
        statusDelta: 'positive'
      },
      {
        date: 'October 17, 2026',
        observation: 'Q2 FY25 delivered 21.2% EBIT margin; full-year guidance corridor retained.',
        sourceDoc: 'Q2 FY25 Concall Transcript',
        reportedMetric: '21.2% Delivered',
        statusDelta: 'positive'
      }
    ]
  },
  {
    id: 'mem-kaynes-osat',
    ticker: 'KAYNES.NS',
    companyName: 'Kaynes Technology India',
    title: 'Sanand Semiconductor OSAT & Advanced Packaging Facility',
    commitmentDate: 'December 12, 2023',
    sourceDoc: 'Extraordinary General Meeting (EGM) Explanatory Statement',
    sourcePageOrQuote: '"Establishment of an Outsourced Semiconductor Assembly and Test (OSAT) facility in Sanand, Gujarat with an estimated capital outlay of ₹2,800 Crores over 3 years."',
    category: 'capex',
    announcedMetric: '₹2,800 Cr Total Outlay (50% Central Subsidy)',
    milestoneDeadline: 'Q1 FY26 (Pilot Runs)',
    status: 'pending',
    statusConfidence: 0.88,
    factsSummary: 'Land parcel of 46 acres allotted by Gujarat Industrial Development Corporation (GIDC). Union Cabinet approval under India Semiconductor Mission received. Board approved ₹1,400 Cr QIP on Oct 28 to fund equity portion.',
    aiInterpretation: 'Milestone tracking is on schedule. The key milestone to monitor next is equipment procurement lead-times from Japanese and European wire-bonding vendors in early 2025.',
    historicalComps: [
      {
        companyOrPeer: 'Kaynes Technology',
        pastEvent: 'FY22 Mysore Smart SMT Expansion',
        outcome: 'Delivered (Commissioned within 14 months)',
        year: 'FY 2022'
      }
    ],
    timeline: [
      {
        date: 'Dec 12, 2023',
        observation: 'EGM approves semiconductor OSAT diversification with ₹2,800 Cr investment roadmap.',
        sourceDoc: 'EGM Notice & Explanatory Statement',
        reportedMetric: '₹2,800 Cr Project Cost',
        statusDelta: 'neutral'
      },
      {
        date: 'September 2, 2024',
        observation: 'Cabinet approves fiscal support under ISM (50% project cost central subsidy).',
        sourceDoc: 'PIB Release / Ministry of Electronics & IT',
        reportedMetric: 'Govt Subsidy Approved',
        statusDelta: 'positive'
      },
      {
        date: 'October 28, 2026',
        observation: 'Board approves ₹1,400 Cr QIP equity raise to fund the equity portion of Sanand phase 1.',
        sourceDoc: 'Exchange Disclosure under Reg 30',
        reportedMetric: '₹1,400 Cr QIP Approved',
        statusDelta: 'positive'
      }
    ]
  },
  {
    id: 'mem-tatamotors-demerger',
    ticker: 'TATAMOTORS.NS',
    companyName: 'Tata Motors Ltd.',
    title: 'Demerger into Two Distinct Listed Entities: CV and PV/EV',
    commitmentDate: 'March 4, 2024',
    sourceDoc: 'BSE/NSE Scheme of Demerger Disclosure under Regulation 30',
    sourcePageOrQuote: '"The demerger will be implemented through an NCLT scheme of arrangement. All shareholders of TML shall continue to have identical shareholding in both the listed entities. The process is expected to take 12-15 months."',
    category: 'product',
    announcedMetric: 'Complete Demerger in 12–15 Months',
    milestoneDeadline: 'Q1 FY26 (June 2025)',
    status: 'pending',
    statusConfidence: 0.94,
    factsSummary: 'Composite scheme of arrangement filed with stock exchanges and NCLT. Competition Commission of India (CCI) clearance obtained in August 2024.',
    aiInterpretation: 'Process is moving smoothly through Indian corporate law milestones. Once completed, the Passenger Vehicle business (EV + JLR) will command higher retail consumer multiples compared to cyclical CV peers.',
    historicalComps: [
      {
        companyOrPeer: 'Tata Consumer Products',
        pastEvent: 'Demerger and integration of Tata Chemicals consumer business',
        outcome: 'Delivered on schedule within 13 months',
        year: 'FY 2020'
      },
      {
        companyOrPeer: 'Jio Financial Services (RIL)',
        pastEvent: 'Demerger from Reliance Industries',
        outcome: 'Delivered in 10 months',
        year: 'FY 2023'
      }
    ],
    timeline: [
      {
        date: 'March 4, 2024',
        observation: 'Board approves demerger of commercial vehicle and passenger vehicle businesses.',
        sourceDoc: 'Reg 30 Filing',
        reportedMetric: '12-15 Month Timeline',
        statusDelta: 'neutral'
      },
      {
        date: 'August 14, 2024',
        observation: 'CCI accords unconditional approval for proposed internal restructuring.',
        sourceDoc: 'CCI Regulatory Order',
        reportedMetric: 'Antitrust Clearance Received',
        statusDelta: 'positive'
      }
    ]
  },
  {
    id: 'mem-polycab-leap',
    ticker: 'POLYCAB.NS',
    companyName: 'Polycab India Ltd.',
    title: 'Project LEAP: Reach ₹20,000 Crore Revenue by FY26',
    commitmentDate: 'May 24, 2021',
    sourceDoc: 'Institutional Analyst Meet Presentation (Project LEAP)',
    sourcePageOrQuote: '"Under Project LEAP, we target achieving ₹20,000 Crores in consolidated revenue by FY26 with 11.0% to 13.0% sustainable EBITDA margins, while increasing B2C revenue share to 25%."',
    category: 'revenue',
    announcedMetric: '₹20,000 Cr Revenue / 11-13% EBITDA Margin',
    milestoneDeadline: 'FY26 (March 2026)',
    status: 'delivered',
    statusConfidence: 0.99,
    factsSummary: 'Polycab reported TTM Revenue of ₹19,840 Cr in Q2 FY25 with EBITDA margin of 13.5%. The company will cross ₹20,000 Cr full-year revenue in FY25, achieving the target 12 months ahead of schedule.',
    aiInterpretation: 'A rare case of a mid-cap manufacturing company outperforming a 5-year strategic blueprint. Operating leverage and brand premiumization in wires and switchgear expanded market share from 18% to 26%.',
    historicalComps: [
      {
        companyOrPeer: 'Havells India',
        pastEvent: 'Vision 2020 Revenue Plan',
        outcome: 'Delivered (Achieved 18% CAGR over 5 years)',
        year: 'FY 2020'
      }
    ],
    timeline: [
      {
        date: 'May 24, 2021',
        observation: 'Project LEAP unveiled: ₹20,000 Cr top-line goal by FY26.',
        sourceDoc: 'Investor Presentation',
        reportedMetric: 'Goal: ₹20,000 Cr Revenue',
        statusDelta: 'neutral'
      },
      {
        date: 'May 12, 2023',
        observation: 'FY23 Revenue reaches ₹14,108 Cr; exports grow 50% YoY.',
        sourceDoc: 'Annual Report FY23',
        reportedMetric: '₹14,108 Cr (70% of goal)',
        statusDelta: 'positive'
      },
      {
        date: 'October 28, 2026',
        observation: 'Q2 FY25 results confirm TTM Revenue reaches ₹19,840 Cr with 13.8% operating margin.',
        sourceDoc: 'Q2 FY25 Results Filing',
        reportedMetric: 'Target achieved 1 year early',
        statusDelta: 'positive'
      }
    ]
  }
];
