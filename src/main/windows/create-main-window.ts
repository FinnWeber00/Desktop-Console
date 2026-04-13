import { app, BrowserWindow, screen, type NativeImage } from 'electron';
import path from 'node:path';

const loadRenderer = (window: BrowserWindow, view?: string): void => {
  if (!app.isPackaged && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const url = new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    if (view) {
      url.searchParams.set('view', view);
    }
    void window.loadURL(url.toString());
    return;
  }

  void window.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
    search: view ? `view=${view}` : undefined,
  });
};

const getDefaultMainWindowBounds = (): {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
} => {
  const workArea = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.max(980, Math.round(workArea.width * 0.6));
  const height = Math.max(680, Math.round(workArea.height * 0.6));

  return {
    width,
    height,
    minWidth: Math.min(width, 980),
    minHeight: Math.min(height, 680),
  };
};

export const createMainWindow = (icon?: NativeImage): BrowserWindow => {
  const bounds = getDefaultMainWindowBounds();
  const mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: bounds.minWidth,
    minHeight: bounds.minHeight,
    show: false,
    title: '\u684c\u9762\u63a7\u5236\u53f0',
    backgroundColor: '#eef3f7',
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.center();
  mainWindow.once('ready-to-show', () => {
    mainWindow.center();
    mainWindow.show();
  });
  loadRenderer(mainWindow);
  setTimeout(() => {
    if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.center();
      mainWindow.show();
    }
  }, 1500);
  return mainWindow;
};

export const createQuickSummonWindow = (): BrowserWindow => {
  const quickWindow = new BrowserWindow({
    width: 860,
    height: 720,
    minWidth: 720,
    minHeight: 560,
    frame: false,
    resizable: false,
    show: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    title: 'Desktop Console Quick Summon',
    backgroundColor: '#16222d',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  quickWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  loadRenderer(quickWindow, 'quick');
  return quickWindow;
};
