import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { quoteForThisLoad } from '../../content/quotes';
import { EASE_OUT } from '../motion';

/** Editorial pull-quote. One random quote per app load; stable across tab switches. */
export const QuoteBlock: React.FC = () => {
  const quote = useMemo(() => quoteForThisLoad(), []);
  return (
    <figure className="relative pl-5">
      <span className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full bg-gradient-to-b from-forest/70 to-forest/10 dark:from-emerald/70 dark:to-emerald/10" aria-hidden />
      <AnimatePresence mode="wait">
        <motion.div
          key={quote.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <blockquote className="font-serif text-[19px] leading-[1.45] text-forest-dark dark:text-ink-light">{quote.text}</blockquote>
          <figcaption className="mt-2.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12px]">
            <span className="font-semibold tracking-tight text-ink dark:text-white">{quote.author}</span>
            <span className="text-ink-muted">{quote.source}</span>
          </figcaption>
        </motion.div>
      </AnimatePresence>
    </figure>
  );
};
