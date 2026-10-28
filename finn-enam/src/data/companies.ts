import { Company } from '../types';

export const IS_DEMO_DATA = true;
export const DEMO_DATA_DISCLAIMER = "DEMO FIXTURE: Realistic simulated Indian equity market data for the ENAM Build Challenge evaluation.";

export const MOCK_COMPANIES: Company[] = [
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
    irUrl: 'https://www.infosys.com/investors.html'
  },
  {
    ticker: 'LT.NS',
    name: 'Larsen & Toubro Ltd.',
    bseCode: '500510',
    sector: 'Capital Goods & EPC',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 3560.40,
    changePercent: 2.10,
    volumeRatio: 1.75,
    sparkline: [3420, 3460, 3490, 3510, 3540, 3560],
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
    currentPrice: 1680.10,
    changePercent: 0.85,
    volumeRatio: 1.05,
    sparkline: [1640, 1655, 1665, 1670, 1675, 1680],
    screenerUrl: 'https://www.screener.in/company/BHARTIARTL/',
    irUrl: 'https://www.airtel.in'
  },
  {
    ticker: 'TITAN.NS',
    name: 'Titan Company Ltd.',
    bseCode: '500114',
    sector: 'Consumer Discretionary',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 3420.00,
    changePercent: -0.30,
    volumeRatio: 0.78,
    sparkline: [3460, 3440, 3410, 3430, 3415, 3420],
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
    currentPrice: 890.50,
    changePercent: 1.40,
    volumeRatio: 1.20,
    sparkline: [860, 875, 870, 882, 885, 890],
    screenerUrl: 'https://www.screener.in/company/TATAMOTORS/',
    irUrl: 'https://www.tatamotors.com'
  },

  // Mid Cap
  {
    ticker: 'TRENT.NS',
    name: 'Trent Ltd.',
    bseCode: '500251',
    sector: 'Retail / Fashion (Zudio & Westside)',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 6850.00,
    changePercent: 4.85, // Significant move
    volumeRatio: 2.65, // Unusual volume trigger
    sparkline: [6200, 6340, 6420, 6550, 6710, 6850],
    screenerUrl: 'https://www.screener.in/company/TRENT/',
    irUrl: 'https://www.mywestside.com'
  },
  {
    ticker: 'POLYCAB.NS',
    name: 'Polycab India Ltd.',
    bseCode: '542652',
    sector: 'Cables, Wires & FMEG',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 6520.00,
    changePercent: 3.20,
    volumeRatio: 2.10, // Volume alert
    sparkline: [6100, 6250, 6200, 6380, 6450, 6520],
    screenerUrl: 'https://www.screener.in/company/POLYCAB/',
    irUrl: 'https://www.polycab.com'
  },
  {
    ticker: 'PERSISTENT.NS',
    name: 'Persistent Systems Ltd.',
    bseCode: '533179',
    sector: 'IT Services / Digital Engg',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 5120.00,
    changePercent: 1.80,
    volumeRatio: 1.35,
    sparkline: [4900, 4980, 5020, 5060, 5100, 5120],
    screenerUrl: 'https://www.screener.in/company/PERSISTENT/',
    irUrl: 'https://www.persistent.com'
  },
  {
    ticker: 'DIXON.NS',
    name: 'Dixon Technologies Ltd.',
    bseCode: '540699',
    sector: 'EMS / Electronics Manufacturing',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 14200.00,
    changePercent: 6.40, // Triggered Price Alert
    volumeRatio: 3.45, // Triggered Volume Alert (>2x)
    sparkline: [12800, 13100, 13250, 13600, 13900, 14200],
    screenerUrl: 'https://www.screener.in/company/DIXON/',
    irUrl: 'https://www.dixoninfo.com'
  },
  {
    ticker: 'SUNPHARMA.NS',
    name: 'Sun Pharmaceutical Industries',
    bseCode: '524715',
    sector: 'Pharmaceuticals & Specialty',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 1820.00,
    changePercent: -0.20,
    volumeRatio: 0.90,
    sparkline: [1840, 1830, 1815, 1825, 1818, 1820],
    screenerUrl: 'https://www.screener.in/company/SUNPHARMA/',
    irUrl: 'https://www.sunpharma.com'
  },
  {
    ticker: 'BAJFINANCE.NS',
    name: 'Bajaj Finance Ltd.',
    bseCode: '500034',
    sector: 'NBFC / Consumer Lending',
    marketCapCategory: 'Large Cap',
    inWatchlist: true,
    currentPrice: 7120.00,
    changePercent: -2.80, // Price pullback
    volumeRatio: 1.65,
    sparkline: [7450, 7380, 7300, 7220, 7180, 7120],
    screenerUrl: 'https://www.screener.in/company/BAJFINANCE/',
    irUrl: 'https://www.bajajfinserv.in'
  },

  // Small & High Growth
  {
    ticker: 'KAYNES.NS',
    name: 'Kaynes Technology India Ltd.',
    bseCode: '543664',
    sector: 'EMS / Semiconductor Assembly',
    marketCapCategory: 'Small Cap',
    inWatchlist: true,
    currentPrice: 5340.00,
    changePercent: 5.10,
    volumeRatio: 2.80, // Triggered volume alert
    sparkline: [4700, 4850, 4920, 5100, 5210, 5340],
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
    currentPrice: 1540.00,
    changePercent: 1.30,
    volumeRatio: 1.10,
    sparkline: [1480, 1505, 1512, 1530, 1525, 1540],
    screenerUrl: 'https://www.screener.in/company/CDSL/',
    irUrl: 'https://www.cdslindia.com'
  },
  {
    ticker: 'KPITTECH.NS',
    name: 'KPIT Technologies Ltd.',
    bseCode: '542651',
    sector: 'Automotive Software / Autonomous',
    marketCapCategory: 'Mid Cap',
    inWatchlist: true,
    currentPrice: 1680.00,
    changePercent: -1.10,
    volumeRatio: 0.95,
    sparkline: [1730, 1715, 1700, 1690, 1675, 1680],
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
    currentPrice: 4420.00,
    changePercent: 2.75,
    volumeRatio: 1.85,
    sparkline: [4150, 4220, 4290, 4340, 4380, 4420],
    screenerUrl: 'https://www.screener.in/company/HAL/',
    irUrl: 'https://hal-india.co.in'
  },

  // Out-of-Portfolio Ad-Hoc Research Examples
  {
    ticker: 'ZOMATO.NS',
    name: 'Zomato Ltd. (Eternal)',
    bseCode: '543320',
    sector: 'Quick Commerce (Blinkit) & Food Delivery',
    marketCapCategory: 'Large Cap',
    inWatchlist: false,
    currentPrice: 265.40,
    changePercent: 3.40,
    volumeRatio: 1.40,
    sparkline: [242, 248, 253, 258, 261, 265],
    screenerUrl: 'https://www.screener.in/company/ZOMATO/',
    irUrl: 'https://www.zomato.com/investor-relations'
  },
  {
    ticker: 'UNOMINDA.NS',
    name: 'Uno Minda Ltd.',
    bseCode: '532539',
    sector: 'Auto Ancillary / EV Components',
    marketCapCategory: 'Mid Cap',
    inWatchlist: false,
    currentPrice: 1120.00,
    changePercent: 0.40,
    volumeRatio: 0.75,
    sparkline: [1090, 1105, 1110, 1118, 1125, 1120],
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
    currentPrice: 68.50,
    changePercent: -3.80,
    volumeRatio: 2.20,
    sparkline: [75, 73, 71, 70, 69, 68.5],
    screenerUrl: 'https://www.screener.in/company/SUZLON/',
    irUrl: 'https://www.suzlon.com'
  },
  {
    ticker: 'JYOTICNC.NS',
    name: 'Jyoti CNC Automation Ltd.',
    bseCode: '544081',
    sector: 'Industrial Machinery & CNC',
    marketCapCategory: 'Small Cap',
    inWatchlist: false,
    currentPrice: 1240.00,
    changePercent: 1.90,
    volumeRatio: 1.10,
    sparkline: [1180, 1195, 1210, 1225, 1230, 1240],
    screenerUrl: 'https://www.screener.in/company/JYOTICNC/',
    irUrl: 'https://www.jyoti.co.in'
  }
];
