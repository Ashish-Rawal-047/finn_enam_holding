import React, { useState } from 'react';
import { apiUrl } from '../../lib/api';
import { cx } from '../ui';

/** Box sizes in px: xs for dense rows, sm for lists and cards, md for sheets, lg for page headers. */
const SIZES = { xs: 24, sm: 30, md: 40, lg: 52 } as const;
export type LogoSize = keyof typeof SIZES;

// Symbols whose logo failed this session: render initials straight away instead of retrying.
const failed = new Set<string>();

/** Listing symbol in Yahoo form, which the logo service keys on (RELIANCE.NS, 500325.BO). */
export function logoKey(c: { yahooSymbol?: string | null; nseSymbol?: string | null; bseCode?: string | null }) {
  if (c.yahooSymbol) return c.yahooSymbol.toUpperCase();
  if (c.nseSymbol) return `${c.nseSymbol.toUpperCase()}.NS`;
  if (c.bseCode) return `${c.bseCode}.BO`;
  return null;
}

/** "Tata Consultancy Services Limited" → "TC"; legal suffixes and parentheticals are ignored. */
export function initialsOf(name: string, fallback?: string | null) {
  const words = name
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^A-Za-z0-9& ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !/^(ltd|limited|the|and|&|of|co|company|india|inc|plc)$/i.test(w));
  const letters = words.slice(0, 2).map((w) => w[0]).join('');
  return (letters || fallback?.slice(0, 2) || '·').toUpperCase();
}

interface Props {
  name: string;
  yahooSymbol?: string | null;
  nseSymbol?: string | null;
  bseCode?: string | null;
  logoUrl?: string | null;
  size?: LogoSize;
  className?: string;
}

/**
 * A listed company's logo, resolved and verified server-side (GET /api/logos/:symbol) so every
 * screen shows the same image. Fixed-size box (no layout shift), object-fit: contain on a neutral
 * tile, lazy-loaded. While loading the tile is blank; when no verified logo exists, or the image
 * fails, it shows the company's initials. Low-resolution icons are drawn smaller rather than blurred.
 */
export const CompanyLogo: React.FC<Props> = (props) => {
  const key = logoKey(props);
  const src = props.logoUrl ?? (key ? apiUrl(`/logos/${encodeURIComponent(key)}`) : null);
  // Keyed on the image so a reused slot (lists, sheets) starts fresh for a different company.
  return <Logo key={src ?? props.name} {...props} logoKey={key} src={src} />;
};

const Logo: React.FC<Props & { logoKey: string | null; src: string | null }> = ({ name, yahooSymbol, nseSymbol, logoKey: key, src, size = 'sm', className }) => {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>(() => (!src || (key && failed.has(key)) ? 'failed' : 'loading'));
  const [natural, setNatural] = useState(0);
  const box = SIZES[size];
  const inner = box - (size === 'xs' ? 4 : 6);
  // A 16 px favicon stretched to 40 px is a blur; keep small sources near their native size.
  const drawn = natural > 0 && natural < inner ? Math.max(Math.min(natural * 1.25, inner), Math.min(16, inner)) : inner;

  return (
    <span
      className={cx(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[7px] border',
        state === 'failed' ? 'border-forest/15 bg-sage text-forest dark:border-emerald/20 dark:bg-emerald-subtle dark:text-emerald' : 'border-divider bg-white dark:border-ink-border',
        className,
      )}
      style={{ width: box, height: box }}
    >
      {state === 'failed' ? (
        <span aria-label={`${name} logo unavailable`} role="img" className="font-serif leading-none" style={{ fontSize: Math.round(box * 0.4) }}>
          {initialsOf(name, nseSymbol ?? yahooSymbol)}
        </span>
      ) : (
        <img
          src={src!}
          alt={`${name} logo`}
          loading="lazy"
          decoding="async"
          width={inner}
          height={inner}
          draggable={false}
          onLoad={(e) => {
            setNatural(Math.min(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight));
            setState('loaded');
          }}
          onError={() => {
            if (key) failed.add(key);
            setState('failed');
          }}
          className={cx('object-contain transition-opacity duration-200', state === 'loaded' ? 'opacity-100' : 'opacity-0')}
          style={{ width: drawn, height: drawn }}
        />
      )}
    </span>
  );
};
