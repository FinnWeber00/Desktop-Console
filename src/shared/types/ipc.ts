import type { AppSettings, Card, Category, SecuritySettings } from './models';

export type IpcResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface CategoryCreateInput {
  name: string;
}

export interface CategoryUpdateInput {
  id: string;
  name: string;
}

export interface SortItemInput {
  id: string;
  sortOrder: number;
}

export interface CardCreateInput {
  type: 'website' | 'app';
  name: string;
  categoryId: string;
  target: string;
  icon?: string | null;
  note?: string | null;
}

export interface CardUpdateInput extends CardCreateInput {
  id: string;
  pinned?: boolean;
}

export interface CardImportInput {
  categoryId: string;
  items: string[];
}

export interface SearchCardsInput {
  keyword: string;
}

export interface UnlockInput {
  password: string;
}

export interface SecuritySettingsUpdateInput {
  lockEnabled: boolean;
  autoLockMinutes: number;
  password?: string | null;
}

export interface SettingsUpdateInput {
  themeMode?: 'light' | 'dark' | 'system';
  language?: string;
  trayEnabled?: boolean;
  globalHotkey?: string | null;
  browserPath?: string | null;
}

export interface InstalledBrowserOption {
  id: string;
  name: string;
  path: string;
}

export interface DesktopConsoleApi {
  category: {
    list: () => Promise<IpcResult<Category[]>>;
    create: (input: CategoryCreateInput) => Promise<IpcResult<Category>>;
    update: (input: CategoryUpdateInput) => Promise<IpcResult<Category>>;
    delete: (id: string) => Promise<IpcResult<boolean>>;
    reorder: (items: SortItemInput[]) => Promise<IpcResult<boolean>>;
  };
  card: {
    list: (categoryId?: string) => Promise<IpcResult<Card[]>>;
    create: (input: CardCreateInput) => Promise<IpcResult<Card>>;
    update: (input: CardUpdateInput) => Promise<IpcResult<Card>>;
    delete: (id: string) => Promise<IpcResult<boolean>>;
    reorder: (items: SortItemInput[]) => Promise<IpcResult<boolean>>;
    search: (input: SearchCardsInput) => Promise<IpcResult<Card[]>>;
    open: (id: string) => Promise<IpcResult<boolean>>;
    import: (input: CardImportInput) => Promise<IpcResult<Card[]>>;
  };
  security: {
    getSettings: () => Promise<IpcResult<SecuritySettings>>;
    hasPassword: () => Promise<IpcResult<boolean>>;
    updateSettings: (input: SecuritySettingsUpdateInput) => Promise<IpcResult<SecuritySettings>>;
    unlock: (input: UnlockInput) => Promise<IpcResult<boolean>>;
  };
  settings: {
    get: () => Promise<IpcResult<AppSettings>>;
    update: (input: SettingsUpdateInput) => Promise<IpcResult<AppSettings>>;
  };
  system: {
    listBrowsers: () => Promise<IpcResult<InstalledBrowserOption[]>>;
    getVersion: () => Promise<IpcResult<string>>;
    getFilePath: (file: File) => string;
  };
}
