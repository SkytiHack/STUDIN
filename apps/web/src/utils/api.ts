export const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const getTelegramId = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  const explicitId = params.get('chatId');
  if (explicitId) return explicitId;
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || null;
};

export const fetchApi = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const tgId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (tgId) headers['X-Telegram-Id'] = tgId.toString();
  return fetch(url, { ...options, headers });
};
