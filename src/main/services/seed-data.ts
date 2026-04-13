import type { AppSettings, Card, Category, SecuritySettings } from '../../shared/types/models';
import { getDefaultBrowserPath } from './browser-launcher';
import { DEFAULT_GLOBAL_HOTKEY } from './hotkey';

const now = new Date().toISOString();

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'tech-tools', name: '\u6280\u672f\u5de5\u5177', sortOrder: 1, createdAt: now, updatedAt: now },
  { id: 'common-sites', name: '\u5e38\u7528\u7f51\u7ad9', sortOrder: 2, createdAt: now, updatedAt: now },
];

export const DEFAULT_CARDS: Card[] = [
  {
    id: 'github',
    type: 'website',
    name: 'GitHub',
    categoryId: 'tech-tools',
    target: 'https://github.com',
    icon: null,
    note: '\u4ee3\u7801\u6258\u7ba1\u5e73\u53f0',
    pinned: true,
    sortOrder: 1,
    openCount: 0,
    lastOpenedAt: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'gitee',
    type: 'website',
    name: 'Gitee',
    categoryId: 'common-sites',
    target: 'https://gitee.com',
    icon: null,
    note: '\u56fd\u5185\u5e38\u7528\u4ee3\u7801\u6258\u7ba1\u5e73\u53f0',
    pinned: true,
    sortOrder: 1,
    openCount: 0,
    lastOpenedAt: null,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'vscode',
    type: 'app',
    name: 'VS Code',
    categoryId: 'tech-tools',
    target: 'C:/Program Files/Microsoft VS Code/Code.exe',
    icon: null,
    note: '\u4ee3\u7801\u7f16\u8f91\u5668',
    pinned: true,
    sortOrder: 2,
    openCount: 0,
    lastOpenedAt: null,
    createdAt: now,
    updatedAt: now,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  themeMode: 'system',
  language: 'zh-CN',
  trayEnabled: true,
  globalHotkey: DEFAULT_GLOBAL_HOTKEY,
  browserPath: getDefaultBrowserPath(),
  createdAt: now,
  updatedAt: now,
};

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  id: 'default',
  passwordHash: '',
  autoLockMinutes: 15,
  lockEnabled: false,
  updatedAt: now,
};
