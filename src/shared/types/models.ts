export type CardType = 'website' | 'app';

export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Card {
  id: string;
  type: CardType;
  name: string;
  categoryId: string;
  target: string;
  icon?: string | null;
  note?: string | null;
  pinned: boolean;
  sortOrder: number;
  openCount: number;
  lastOpenedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SecuritySettings {
  id: string;
  passwordHash: string;
  autoLockMinutes: number;
  lockEnabled: boolean;
  updatedAt: string;
}

export interface AppSettings {
  id: string;
  themeMode: 'light' | 'dark' | 'system';
  language: string;
  trayEnabled: boolean;
  globalHotkey?: string | null;
  browserPath: string;
  createdAt: string;
  updatedAt: string;
}
