import type { DesktopConsoleApi } from '../shared/types/ipc';

declare global {
  interface Window {
    desktopConsole: DesktopConsoleApi;
  }
}

export {};
