import { useEffect, useCallback } from 'react';

export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    if (!tg) return;
    try { tg.expand(); } catch (_e) { /* ignore */ }
    try {
      if (tg.requestFullscreen) {
        tg.requestFullscreen();
        document.body.classList.add('is-fullscreen');
      }
    } catch (_e) { /* ignore */ }
    try {
      if (tg.disableVerticalSwipes) tg.disableVerticalSwipes();
    } catch (_e) { /* ignore */ }
  }, [tg]);

  const openLink = useCallback((url: string) => {
    if (tg?.openLink) {
      tg.openLink(url);
    } else {
      window.open(url, '_blank');
    }
  }, [tg]);

  const close = useCallback(() => {
    tg?.close();
  }, [tg]);

  const colorScheme = tg?.colorScheme || 'light';

  return { tg, openLink, close, colorScheme };
}
