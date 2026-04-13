import {
  Menu,
  Tray,
  app,
  globalShortcut,
  nativeImage,
  type NativeImage,
  type BrowserWindow,
} from 'electron';
import path from 'node:path';

import { getUiMessages } from '../shared/i18n';
import type { AppSettings } from '../shared/types/models';
import type { SettingsRepository } from './repositories/settings-repository';
import { normalizeHotkeyInput } from './services/hotkey';
import { createMainWindow, createQuickSummonWindow } from './windows/create-main-window';

const createFallbackIcon = (): NativeImage => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#edf4f8"/>
          <stop offset="100%" stop-color="#dce9f0"/>
        </linearGradient>
      </defs>
      <rect x="18" y="18" width="220" height="220" rx="52" fill="url(#bg)"/>
      <rect x="30" y="30" width="196" height="196" rx="44" fill="#f8f6f2" stroke="#8ca9bd" stroke-width="10"/>
      <rect x="78" y="66" width="100" height="118" rx="24" fill="#fbfaf7" stroke="#8ca9bd" stroke-width="8"/>
      <rect x="98" y="92" width="60" height="8" rx="4" fill="#2d536d"/>
      <rect x="96" y="110" width="64" height="6" rx="3" fill="#89a2b6"/>
      <rect x="98" y="132" width="56" height="5" rx="2.5" fill="#8ca9bd"/>
      <rect x="98" y="144" width="42" height="5" rx="2.5" fill="#8ca9bd"/>
      <rect x="94" y="166" width="42" height="18" rx="9" fill="#74c0f5"/>
      <rect x="144" y="166" width="28" height="18" rx="9" fill="#83dcc2"/>
    </svg>
  `;

  return nativeImage.createFromDataURL(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
};

const loadAppIcon = (): NativeImage => {
  const iconPath = path.join(app.getAppPath(), 'assets', 'app-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  return icon.isEmpty() ? createFallbackIcon() : icon;
};

const createTrayIcon = (icon: NativeImage): NativeImage => icon.resize({ width: 16, height: 16 });

export class AppShell {
  private mainWindow: BrowserWindow | null = null;

  private quickWindow: BrowserWindow | null = null;

  private tray: Tray | null = null;

  private isQuitting = false;

  private registeredHotkey: string | null = null;

  private readonly appIcon = loadAppIcon();

  private readonly trayIcon = createTrayIcon(this.appIcon);

  constructor(private readonly settingsRepository: SettingsRepository) {}

  initialize(): BrowserWindow {
    this.mainWindow = createMainWindow(this.appIcon);
    this.attachMainWindowLifecycle(this.mainWindow);
    this.quickWindow = null;
    this.isQuitting = false;

    const settings = this.settingsRepository.get();
    const result = this.applySettings(settings);
    if (!result.success) {
      console.warn(`[app-shell] ${result.error}`);
    }

    return this.mainWindow;
  }

  getMainWindow(): BrowserWindow | null {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow;
    }
    return null;
  }

  getQuickWindow(): BrowserWindow | null {
    if (this.quickWindow && !this.quickWindow.isDestroyed()) {
      return this.quickWindow;
    }
    return null;
  }

  showMainWindow(): BrowserWindow {
    const existingWindow = this.getMainWindow();
    if (existingWindow) {
      if (existingWindow.isMinimized()) {
        existingWindow.restore();
      }
      if (!existingWindow.isVisible()) {
        existingWindow.show();
      }
      existingWindow.focus();
      return existingWindow;
    }

    this.mainWindow = createMainWindow(this.appIcon);
    this.attachMainWindowLifecycle(this.mainWindow);
    return this.mainWindow;
  }

  toggleMainWindow(): void {
    const window = this.getMainWindow();
    if (!window) {
      this.showMainWindow();
      return;
    }

    if (window.isVisible() && window.isFocused()) {
      window.hide();
      return;
    }

    this.showMainWindow();
  }

  toggleQuickSummon(): void {
    const quickWindow = this.ensureQuickWindow();

    if (quickWindow.isVisible() && quickWindow.isFocused()) {
      quickWindow.hide();
      return;
    }

    quickWindow.center();
    quickWindow.show();
    quickWindow.focus();
  }

  markQuitting(): void {
    this.isQuitting = true;
  }

  cleanup(): void {
    if (this.registeredHotkey) {
      globalShortcut.unregister(this.registeredHotkey);
      this.registeredHotkey = null;
    }
    globalShortcut.unregisterAll();

    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
    }
  }

  applySettings(settings: AppSettings): { success: true } | { success: false; error: string } {
    const trayResult = this.applyTraySetting(settings);
    if (!trayResult.success) {
      return trayResult;
    }

    const normalizedHotkey = normalizeHotkeyInput(settings.globalHotkey);
    if (normalizedHotkey.error) {
      return { success: false, error: normalizedHotkey.error };
    }

    const hotkeyResult = this.applyHotkeySetting(normalizedHotkey.accelerator);
    if (!hotkeyResult.success) {
      return hotkeyResult;
    }

    return { success: true };
  }

  private ensureQuickWindow(): BrowserWindow {
    const quickWindow = this.getQuickWindow();
    if (quickWindow) {
      return quickWindow;
    }

    this.quickWindow = createQuickSummonWindow();
    this.attachQuickWindowLifecycle(this.quickWindow);
    return this.quickWindow;
  }

  private applyTraySetting(settings: AppSettings): { success: true } | { success: false; error: string } {
    if (!settings.trayEnabled) {
      if (this.tray) {
        this.tray.destroy();
        this.tray = null;
      }
      return { success: true };
    }

    if (!this.tray) {
      this.tray = new Tray(this.trayIcon);
      this.tray.setToolTip(app.getName());
      this.tray.on('click', () => this.toggleMainWindow());
    }

    const labels = getUiMessages(settings.language);
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: labels.trayShowMain, click: () => this.showMainWindow() },
        { label: labels.trayQuickSummon, click: () => this.toggleQuickSummon() },
        { label: labels.trayHideMainWindow, click: () => this.getMainWindow()?.hide() },
        { type: 'separator' },
        {
          label: labels.trayExit,
          click: () => {
            this.markQuitting();
            app.quit();
          },
        },
      ]),
    );

    return { success: true };
  }

  private applyHotkeySetting(hotkey: string | null): { success: true } | { success: false; error: string } {
    if (this.registeredHotkey) {
      globalShortcut.unregister(this.registeredHotkey);
      this.registeredHotkey = null;
    }

    if (!hotkey) {
      return { success: true };
    }

    try {
      const registered = globalShortcut.register(hotkey, () => this.toggleQuickSummon());
      if (!registered) {
        return { success: false, error: '全局快捷键注册失败，请换一个没有被其他程序占用的组合' };
      }
    } catch {
      return { success: false, error: '全局快捷键格式无效，请检查后重新保存' };
    }

    this.registeredHotkey = hotkey;
    return { success: true };
  }

  private attachMainWindowLifecycle(window: BrowserWindow): void {
    window.on('close', (event) => {
      if (this.isQuitting) {
        return;
      }

      const settings = this.settingsRepository.get();
      if (!settings.trayEnabled) {
        return;
      }

      event.preventDefault();
      window.hide();
    });

    window.on('closed', () => {
      if (this.mainWindow === window) {
        this.mainWindow = null;
      }
    });
  }

  private attachQuickWindowLifecycle(window: BrowserWindow): void {
    window.on('blur', () => {
      if (!this.isQuitting) {
        window.hide();
      }
    });

    window.on('close', (event) => {
      if (this.isQuitting) {
        return;
      }

      event.preventDefault();
      window.hide();
    });

    window.on('closed', () => {
      if (this.quickWindow === window) {
        this.quickWindow = null;
      }
    });
  }
}
