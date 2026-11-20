interface TelegramWebApp {
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    start_param?: string;
  };
  expand: () => void;
  close: () => void;
  requestFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  openLink: (url: string) => void;
  ready: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
  colorScheme: 'dark' | 'light';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
