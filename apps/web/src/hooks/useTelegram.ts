import { useEffect, useCallback } from 'react';

export function useTelegram() {
  const tg = window.Telegram?.WebApp;

  useEffect(() => {
    if (!tg) return;
    document.body.classList.add('is-tg');
    try { tg.ready?.(); } catch (_e) { /* ignore */ }
    try { tg.expand(); } catch (_e) { /* ignore */ }
    try {
      // Expand Mini App without forcing fullscreen overlay if it clashes with header,
      // or if fullscreen is enabled, apply proper safe-area CSS padding.
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

  const haptic = useCallback((type: 'light' | 'medium' | 'selection' = 'light') => {
    try {
      const hf = (tg as any)?.HapticFeedback;
      if (!hf) return;
      if (type === 'selection') hf.selectionChanged?.();
      else hf.impactOccurred?.(type);
    } catch {
      /* ignore */
    }
  }, [tg]);

  const colorScheme = tg?.colorScheme || 'light';

  return { tg, openLink, close, haptic, colorScheme };
}
