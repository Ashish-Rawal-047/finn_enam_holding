/**
 * Curated investing quotations with their sources. Only quotes whose wording and source
 * could be attributed with confidence are included; second-hand attributions say so.
 */
export interface Quote {
  text: string;
  author: string;
  source: string;
}

export const QUOTES: Quote[] = [
  {
    text: 'Be fearful when others are greedy, and be greedy when others are fearful.',
    author: 'Warren Buffett',
    source: '"Buy American. I Am.", The New York Times, October 2008',
  },
  {
    text: 'When we own portions of outstanding businesses with outstanding managements, our favorite holding period is forever.',
    author: 'Warren Buffett',
    source: 'Berkshire Hathaway shareholder letter, 1988',
  },
  {
    text: "It's far better to buy a wonderful company at a fair price than a fair company at a wonderful price.",
    author: 'Warren Buffett',
    source: 'Berkshire Hathaway shareholder letter, 1989',
  },
  {
    text: 'The investor’s chief problem — and even his worst enemy — is likely to be himself.',
    author: 'Benjamin Graham',
    source: 'The Intelligent Investor',
  },
  {
    text: 'Price is what you pay; value is what you get.',
    author: 'Benjamin Graham',
    source: 'As quoted by Warren Buffett, Berkshire Hathaway shareholder letter, 2008',
  },
  {
    text: 'In the short run, the market is a voting machine but in the long run, it is a weighing machine.',
    author: 'Benjamin Graham',
    source: 'As quoted by Warren Buffett in Berkshire Hathaway shareholder letters',
  },
];

/** Same quote all day for everyone in a timezone; rotates daily. */
export function quoteOfTheDay(date = new Date(), timeZone = 'Asia/Kolkata'): Quote {
  const local = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  const dayNumber = Math.floor(Date.parse(`${local}T00:00:00Z`) / 86_400_000);
  return QUOTES[dayNumber % QUOTES.length];
}
