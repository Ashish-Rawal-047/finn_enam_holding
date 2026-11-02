import React from 'react';

/**
 * FINN is a phone app at every viewport. On a phone the frame fills the screen; on tablets and
 * desktops it is a centred, phone-width surface (see `.app-frame` in index.css) at full viewport
 * height, so a reviewer on a laptop sees the same app, not a stretched website.
 *
 * The frame is also the containing block for overlays: sheets and drawers open inside the app.
 */
export const AppFrame: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className="app-stage">
    <div className={`app-frame bg-cream text-ink dark:bg-ink-bg dark:text-ink-text ${className ?? ''}`}>
      {children}
      {/* Portal target for drawers, so they stay inside the frame. */}
      <div id="app-overlays" />
    </div>
  </div>
);

const SCROLL_ID = 'app-scroll';

/** Scrolls the current screen back to the top (the content area scrolls, not the window). */
export function scrollAppToTop() {
  document.getElementById(SCROLL_ID)?.scrollTo({ top: 0 });
}

/**
 * Header, independently scrolling content and bottom navigation, stacked in one column: the
 * navigation is part of the layout, never an overlay, so content can't slip beneath it.
 */
export const AppShell: React.FC<{ header: React.ReactNode; navigation: React.ReactNode; screenKey: string; children: React.ReactNode; overlays?: React.ReactNode }> = ({
  header,
  navigation,
  screenKey,
  children,
  overlays,
}) => (
  <AppFrame>
    {header}
    {/* Keyed by screen so each tab starts at the top with a short fade-in. */}
    <main id={SCROLL_ID} key={screenKey} className="screen-enter min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 pb-8">
      {children}
    </main>
    {navigation}
    {overlays}
  </AppFrame>
);
