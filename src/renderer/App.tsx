import { useDeferredValue, useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import { CardAvatar } from './components/CardAvatar';
import type {
  CardCreateInput,
  CardUpdateInput,
  InstalledBrowserOption,
  SecuritySettingsUpdateInput,
  SettingsUpdateInput,
  SortItemInput,
} from '../shared/types/ipc';
import { APP_LANGUAGE_OPTIONS, formatLastOpened, getUiMessages, localizeErrorMessage } from '../shared/i18n';
import { DEFAULT_APP_LANGUAGE, normalizeAppLanguage } from '../shared/constants/language';
import type { AppSettings, Card, Category, SecuritySettings } from '../shared/types/models';

type Feedback = { type: 'success' | 'error'; message: string } | null;
type CategoryDialog = { mode: 'create' | 'edit'; name: string } | null;
type CardDialog = {
  mode: 'create' | 'edit';
  id?: string;
  type: 'website' | 'app';
  name: string;
  categoryId: string;
  target: string;
  note: string;
  pinned: boolean;
} | null;
type SettingsDialog = {
  themeMode: AppSettings['themeMode'];
  language: string;
  trayEnabled: boolean;
  globalHotkey: string;
  browserPath: string;
  lockEnabled: boolean;
  autoLockMinutes: string;
  password: string;
  confirmPassword: string;
} | null;

const DEFAULT_BROWSER_PATH = '';
const IS_MAC_PLATFORM = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
const HOTKEY_PLACEHOLDER = IS_MAC_PLATFORM ? 'Cmd+Alt+Space' : 'Ctrl+Alt+Space';
const SYSTEM_BROWSER_OPTION_VALUE = '__system__';
const CUSTOM_BROWSER_OPTION_VALUE = '__custom__';

const formatHotkeyForDisplay = (value?: string | null): string => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return '';

  return trimmed
    .replace(/CommandOrControl/gi, IS_MAC_PLATFORM ? 'Cmd' : 'Ctrl')
    .replace(/\bCommand\b/gi, 'Cmd')
    .replace(/\bSuper\b/gi, IS_MAC_PLATFORM ? 'Cmd' : 'Win');
};

const normalizeBrowserPathForCompare = (value?: string | null): string =>
  value?.trim().replace(/^"|"$/g, '').replace(/\//g, '\\').toLowerCase() ?? '';

const resolveBrowserSelectValue = (browserPath: string, installedBrowsers: InstalledBrowserOption[]): string => {
  const normalized = normalizeBrowserPathForCompare(browserPath);
  if (!normalized) {
    return SYSTEM_BROWSER_OPTION_VALUE;
  }

  const matched = installedBrowsers.find(
    (browser) => normalizeBrowserPathForCompare(browser.path) === normalized,
  );
  return matched?.path ?? CUSTOM_BROWSER_OPTION_VALUE;
};

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-sky-300';
const secondaryBtn =
  'rounded-2xl bg-white/70 px-4 py-2 text-sm text-slate-600 transition hover:bg-white';

const defaultSecurity = (): SecuritySettings => ({
  id: 'default',
  passwordHash: '',
  autoLockMinutes: 15,
  lockEnabled: false,
  updatedAt: new Date().toISOString(),
});

const defaultAppSettings = (): AppSettings => ({
  id: 'default',
  themeMode: 'system',
  language: DEFAULT_APP_LANGUAGE,
  trayEnabled: true,
  globalHotkey: 'Ctrl+Alt+Space',
  browserPath: DEFAULT_BROWSER_PATH,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const makeCardDialog = (categories: Category[], selectedCategory: string): CardDialog => {
  const available = categories.filter((category) => category.id !== 'all');
  const fallback = available[0]?.id ?? 'tech-tools';
  const categoryId =
    selectedCategory !== 'all' && available.some((category) => category.id === selectedCategory)
      ? selectedCategory
      : fallback;

  return { mode: 'create', type: 'website', name: '', categoryId, target: '', note: '', pinned: false };
};

const editCardDialog = (card: Card): CardDialog => ({
  mode: 'edit',
  id: card.id,
  type: card.type,
  name: card.name,
  categoryId: card.categoryId,
  target: card.target,
  note: card.note ?? '',
  pinned: card.pinned,
});

const settingsDialogFrom = (
  appSettings: AppSettings,
  securitySettings: SecuritySettings,
): NonNullable<SettingsDialog> => ({
  themeMode: appSettings.themeMode,
  language: normalizeAppLanguage(appSettings.language),
  trayEnabled: appSettings.trayEnabled,
  globalHotkey: formatHotkeyForDisplay(appSettings.globalHotkey),
  browserPath: appSettings.browserPath || DEFAULT_BROWSER_PATH,
  lockEnabled: securitySettings.lockEnabled,
  autoLockMinutes: String(securitySettings.autoLockMinutes),
  password: '',
  confirmPassword: '',
});

const resolveImportCategoryId = (categories: Category[], selectedCategory: string): string | null => {
  const available = categories.filter((category) => category.id !== 'all');
  if (available.length === 0) return null;

  if (selectedCategory !== 'all' && available.some((category) => category.id === selectedCategory)) {
    return selectedCategory;
  }

  return available[0]?.id ?? null;
};

const isExternalImportDrag = (event: DragEvent): boolean => {
  const types = Array.from(event.dataTransfer?.types ?? []);
  const hasFileItem = Array.from(event.dataTransfer?.items ?? []).some((item) => item.kind === 'file');
  return hasFileItem || types.includes('Files') || types.includes('text/uri-list');
};

const extractDroppedItems = (event: DragEvent): string[] => {
  const items = new Set<string>();
  const append = (raw: string) => {
    const value = raw.split('\0').join('').trim();
    if (value) {
      items.add(value);
    }
  };

  const resolveFilePath = (file: File & { path?: string }): string => {
    if (file.path) return file.path;
    try {
      return window.desktopConsole.system.getFilePath(file) || '';
    } catch {
      return '';
    }
  };

  const files = Array.from(event.dataTransfer?.files ?? []) as Array<File & { path?: string }>;
  for (const file of files) {
    const resolvedPath = resolveFilePath(file);
    if (resolvedPath) {
      append(resolvedPath);
    }
  }

  const dragItems = Array.from(event.dataTransfer?.items ?? []);
  for (const item of dragItems) {
    if (item.kind !== 'file') continue;
    const file = item.getAsFile() as (File & { path?: string }) | null;
    if (!file) continue;
    const resolvedPath = resolveFilePath(file);
    if (resolvedPath) {
      append(resolvedPath);
    }
  }

  const uriList = event.dataTransfer?.getData('text/uri-list') ?? '';
  for (const entry of uriList.split(/\r?\n/)) {
    const value = entry.trim();
    if (value && !value.startsWith('#')) {
      append(value);
    }
  }

  const plainText = event.dataTransfer?.getData('text/plain') ?? '';
  for (const entry of plainText.split(/\r?\n/)) {
    append(entry);
  }

  return [...items];
};

const moveItem = <T extends { id: string }>(items: T[], activeId: string, targetId: string): T[] => {
  const fromIndex = items.findIndex((item) => item.id === activeId);
  const targetIndex = items.findIndex((item) => item.id === targetId);
  if (fromIndex < 0 || targetIndex < 0 || fromIndex === targetIndex) return items;

  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(targetIndex, 0, moved);
  return next;
};

const replaceVisibleOrder = (source: Card[], orderedItems: Card[]): Card[] => {
  const orderedIds = new Set(orderedItems.map((item) => item.id));
  const queue = [...orderedItems];
  return source.map((item) => (orderedIds.has(item.id) ? (queue.shift() as Card) : item));
};

export const App = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [catalogCards, setCatalogCards] = useState<Card[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [version, setVersion] = useState('0.0.0');
  const [searchKeyword, setSearchKeyword] = useState('');
  const deferredSearchKeyword = useDeferredValue(searchKeyword);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [categoryDialog, setCategoryDialog] = useState<CategoryDialog>(null);
  const [cardDialog, setCardDialog] = useState<CardDialog>(null);
  const [settingsDialog, setSettingsDialog] = useState<SettingsDialog>(null);
  const [installedBrowsers, setInstalledBrowsers] = useState<InstalledBrowserOption[]>([]);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(defaultSecurity());
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings());
  const [hasPasswordConfigured, setHasPasswordConfigured] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragCategoryId, setDragCategoryId] = useState<string | null>(null);
  const [dragCategoryOverId, setDragCategoryOverId] = useState<string | null>(null);
  const [dragCardId, setDragCardId] = useState<string | null>(null);
  const [dragOverlayVisible, setDragOverlayVisible] = useState(false);
  const [dragDepth, setDragDepth] = useState(0);

  const { i18n } = useTranslation();
  const locale = normalizeAppLanguage(settingsDialog?.language ?? appSettings.language);
  const T = getUiMessages(locale);
  const browserHintText =
    locale === 'zh-CN'
      ? '留空时会使用系统默认浏览器打开网站卡片；填写路径后则固定使用该浏览器。'
      : 'Leave this empty to use the system default browser for website cards. Fill in a path only when you want to force a specific browser.';
  const browserResetLabel = locale === 'zh-CN' ? '使用系统默认' : 'Use System Default';
  const browserSelectLabel = locale === 'zh-CN' ? '已安装浏览器' : 'Installed browsers';
  const browserSelectCustomLabel = locale === 'zh-CN' ? '手动输入路径' : 'Custom path';
  const browserPathPlaceholder =
    locale === 'zh-CN' ? '留空则使用系统默认浏览器' : 'Leave empty to use the system default browser';
  const browserEmptyHint =
    locale === 'zh-CN'
      ? '未检测到可识别的浏览器时，可以继续手动输入路径。'
      : 'If no browser is detected here, you can still enter a path manually.';
  const getCategoryLabel = (category?: Pick<Category, 'id' | 'name'> | null): string =>
    category?.id === 'all' ? T.all : (category?.name ?? T.all);

  const activeCategory = categories.find((item) => item.id === selectedCategory) ?? null;
  const editableCategory = activeCategory?.id !== 'all' ? activeCategory : null;
  const currentTitle = deferredSearchKeyword.trim()
    ? T.searchResult
    : (activeCategory ? getCategoryLabel(activeCategory) : T.quickAccess);
  const scopedCards =
    selectedCategory === 'all'
      ? catalogCards
      : catalogCards.filter((card) => card.categoryId === selectedCategory);
  const pinnedCards = deferredSearchKeyword.trim() ? [] : scopedCards.filter((card) => card.pinned);
  const recentCards = deferredSearchKeyword.trim()
    ? []
    : [...scopedCards]
        .filter((card) => card.lastOpenedAt)
        .sort((left, right) => (right.lastOpenedAt ?? '').localeCompare(left.lastOpenedAt ?? ''))
        .slice(0, 4);
  const listCards =
    deferredSearchKeyword.trim() || cards.some((card) => !card.pinned)
      ? cards.filter((card) => deferredSearchKeyword.trim() || !card.pinned)
      : cards;
  const canSortCards = !deferredSearchKeyword.trim() && selectedCategory !== 'all';
  const importCategoryId = resolveImportCategoryId(categories, selectedCategory);
  const importCategoryName = getCategoryLabel(categories.find((category) => category.id === importCategoryId) ?? null);

  const flash = (type: 'success' | 'error', message: string) => setFeedback({ type, message });
  const localizeError = (message: string) => localizeErrorMessage(message, locale);

  const refreshCatalogCards = async () => {
    const result = await window.desktopConsole.card.list();
    if (result.success) setCatalogCards(result.data);
  };

  const refreshVisibleCards = async (
    nextCategory = selectedCategory,
    nextKeyword = deferredSearchKeyword.trim(),
  ) => {
    const keyword = nextKeyword.trim();
    const result = keyword
      ? await window.desktopConsole.card.search({ keyword })
      : await window.desktopConsole.card.list(nextCategory);
    if (result.success) setCards(result.data);
    else flash('error', localizeError(result.error));
  };

  const refreshSecurity = async (): Promise<SecuritySettings | null> => {
    const [settingsResult, hasPasswordResult] = await Promise.all([
      window.desktopConsole.security.getSettings(),
      window.desktopConsole.security.hasPassword(),
    ]);
    if (settingsResult.success) setSecuritySettings(settingsResult.data);
    if (hasPasswordResult.success) setHasPasswordConfigured(hasPasswordResult.data);
    return settingsResult.success ? settingsResult.data : null;
  };

  const refreshAppPreferences = async (): Promise<AppSettings | null> => {
    const result = await window.desktopConsole.settings.get();
    if (result.success) setAppSettings(result.data);
    return result.success ? result.data : null;
  };

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 2800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
    void i18n.changeLanguage(locale);
  }, [i18n, locale]);
  useEffect(() => {
    const boot = async () => {
      const [
        categoryResult,
        cardResult,
        versionResult,
        securityResult,
        hasPasswordResult,
        settingsResult,
      ] = await Promise.all([
        window.desktopConsole.category.list(),
        window.desktopConsole.card.list(),
        window.desktopConsole.system.getVersion(),
        window.desktopConsole.security.getSettings(),
        window.desktopConsole.security.hasPassword(),
        window.desktopConsole.settings.get(),
      ]);

      if (categoryResult.success) setCategories(categoryResult.data);
      if (cardResult.success) setCatalogCards(cardResult.data);
      if (versionResult.success) setVersion(versionResult.data);
      if (securityResult.success) setSecuritySettings(securityResult.data);
      if (settingsResult.success) setAppSettings(settingsResult.data);
      if (hasPasswordResult.success) {
        setHasPasswordConfigured(hasPasswordResult.data);
        setIsLocked(Boolean(securityResult.success && securityResult.data.lockEnabled && hasPasswordResult.data));
      }
    };

    void boot();
  }, []);

  useEffect(() => {
    void refreshVisibleCards();
  }, [deferredSearchKeyword, selectedCategory]);

  useEffect(() => {
    if (!securitySettings.lockEnabled || !hasPasswordConfigured || isLocked) return;

    const timeoutMs = securitySettings.autoLockMinutes * 60 * 1000;
    let timer = window.setTimeout(() => setIsLocked(true), timeoutMs);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIsLocked(true), timeoutMs);
    };

    const events: Array<keyof WindowEventMap> = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    for (const eventName of events) {
      window.addEventListener(eventName, reset, true);
    }

    return () => {
      window.clearTimeout(timer);
      for (const eventName of events) {
        window.removeEventListener(eventName, reset, true);
      }
    };
  }, [hasPasswordConfigured, isLocked, securitySettings.autoLockMinutes, securitySettings.lockEnabled]);

  useEffect(() => {
    const handleDragEnter = (event: DragEvent) => {
      if (!isExternalImportDrag(event)) return;
      event.preventDefault();
      setDragDepth((current) => current + 1);
      setDragOverlayVisible(true);
    };

    const handleDragOver = (event: DragEvent) => {
      if (!isExternalImportDrag(event)) return;
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDragLeave = (event: DragEvent) => {
      if (!isExternalImportDrag(event)) return;
      event.preventDefault();
      setDragDepth((current) => {
        const next = Math.max(0, current - 1);
        if (next === 0) {
          setDragOverlayVisible(false);
        }
        return next;
      });
    };

    const handleDrop = (event: DragEvent) => {
      if (!isExternalImportDrag(event)) return;
      event.preventDefault();
      setDragDepth(0);
      setDragOverlayVisible(false);
      const items = extractDroppedItems(event);
      if (items.length === 0) {
        flash('error', T.importEmpty);
        return;
      }
      void handleImportResources(items);
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [importCategoryId]);

  const refreshCategories = async (nextId?: string) => {
    const result = await window.desktopConsole.category.list();
    if (!result.success) return flash('error', localizeError(result.error));
    setCategories(result.data);
    const target = nextId ?? selectedCategory;
    setSelectedCategory(result.data.some((item) => item.id === target) ? target : 'all');
  };

  const handleOpenCard = async (id: string) => {
    const result = await window.desktopConsole.card.open(id);
    if (!result.success) return flash('error', T.openFailedWithReason(localizeError(result.error)));
    await Promise.all([refreshCatalogCards(), refreshVisibleCards()]);
    flash('success', T.opened);
  };

  const handleSubmitCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!categoryDialog) return;

    const name = categoryDialog.name.trim();
    if (!name) {
      return flash('error', T.categoryNameRequired);
    }

    setSubmitting(true);
    try {
      if (categoryDialog.mode === 'create') {
        const result = await window.desktopConsole.category.create({ name });
        if (!result.success) return flash('error', localizeError(result.error));
        await refreshCategories(result.data.id);
        flash('success', T.addCategory);
      } else if (editableCategory) {
        const result = await window.desktopConsole.category.update({
          id: editableCategory.id,
          name,
        });
        if (!result.success) return flash('error', localizeError(result.error));
        await refreshCategories(editableCategory.id);
        flash('success', T.rename);
      }
      setCategoryDialog(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!editableCategory || !window.confirm(T.categoryDeleteConfirm)) return;
    const result = await window.desktopConsole.category.delete(editableCategory.id);
    if (!result.success) return flash('error', localizeError(result.error));
    setSearchKeyword('');
    await Promise.all([refreshCategories('all'), refreshCatalogCards(), refreshVisibleCards('all', '')]);
    flash('success', T.deleteCategory);
  };

  const handleSubmitCard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!cardDialog) return;
    setSubmitting(true);
    try {
      if (cardDialog.mode === 'create') {
        const input: CardCreateInput = {
          type: cardDialog.type,
          name: cardDialog.name,
          categoryId: cardDialog.categoryId,
          target: cardDialog.target,
          note: cardDialog.note,
          icon: null,
        };
        const result = await window.desktopConsole.card.create(input);
        if (!result.success) return flash('error', localizeError(result.error));

        if (cardDialog.pinned) {
          await window.desktopConsole.card.update({
            ...input,
            id: result.data.id,
            pinned: true,
          });
        }

        setSearchKeyword('');
        setSelectedCategory(cardDialog.categoryId);
        await Promise.all([refreshCatalogCards(), refreshVisibleCards(cardDialog.categoryId, '')]);
      } else {
        const input: CardUpdateInput = {
          id: cardDialog.id as string,
          type: cardDialog.type,
          name: cardDialog.name,
          categoryId: cardDialog.categoryId,
          target: cardDialog.target,
          note: cardDialog.note,
          icon: null,
          pinned: cardDialog.pinned,
        };
        const result = await window.desktopConsole.card.update(input);
        if (!result.success) return flash('error', localizeError(result.error));
        if (!deferredSearchKeyword.trim()) setSelectedCategory(cardDialog.categoryId);
        await Promise.all([
          refreshCatalogCards(),
          refreshVisibleCards(
            deferredSearchKeyword.trim() ? selectedCategory : cardDialog.categoryId,
            deferredSearchKeyword.trim(),
          ),
        ]);
      }
      setCardDialog(null);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportResources = async (items: string[]) => {
    if (!importCategoryId) {
      return flash('error', T.importCategoryRequired);
    }

    const result = await window.desktopConsole.card.import({ categoryId: importCategoryId, items });
    if (!result.success) return flash('error', localizeError(result.error));

    setSearchKeyword('');
    setSelectedCategory(importCategoryId);
    await Promise.all([refreshCatalogCards(), refreshVisibleCards(importCategoryId, '')]);
    flash('success', T.importSuccessCount(result.data.length));
  };

  const handleDeleteCard = async (id: string) => {
    if (!window.confirm(T.cardDeleteConfirm)) return;
    const result = await window.desktopConsole.card.delete(id);
    if (!result.success) return flash('error', localizeError(result.error));
    await Promise.all([refreshCatalogCards(), refreshVisibleCards()]);
    flash('success', T.delete);
  };

  const handleTogglePinned = async (card: Card) => {
    const input: CardUpdateInput = {
      id: card.id,
      type: card.type,
      name: card.name,
      categoryId: card.categoryId,
      target: card.target,
      note: card.note ?? '',
      icon: card.icon ?? null,
      pinned: !card.pinned,
    };
    const result = await window.desktopConsole.card.update(input);
    if (!result.success) return flash('error', localizeError(result.error));
    await Promise.all([refreshCatalogCards(), refreshVisibleCards()]);
    flash('success', result.data.pinned ? T.pin : T.unpin);
  };

  const handleSaveGeneralSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settingsDialog) return;

    setSubmitting(true);
    try {
      const input: SettingsUpdateInput = {
        themeMode: settingsDialog.themeMode,
        language: normalizeAppLanguage(settingsDialog.language),
        trayEnabled: settingsDialog.trayEnabled,
        globalHotkey: settingsDialog.globalHotkey.trim() || null,
        browserPath: settingsDialog.browserPath.trim() || null,
      };
      const result = await window.desktopConsole.settings.update(input);
      if (!result.success) return flash('error', localizeError(result.error));
      setAppSettings(result.data);
      setSettingsDialog((current) =>
        current
          ? {
              ...current,
              themeMode: result.data.themeMode,
              language: result.data.language,
              trayEnabled: result.data.trayEnabled,
              globalHotkey: formatHotkeyForDisplay(result.data.globalHotkey),
              browserPath: result.data.browserPath || DEFAULT_BROWSER_PATH,
            }
          : current,
      );
      flash('success', T.saveGeneral);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSecurity = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!settingsDialog) return;
    const minutes = Number.parseInt(settingsDialog.autoLockMinutes, 10);
    if (!Number.isInteger(minutes) || minutes <= 0) return flash('error', T.invalidAutoLock);
    if (settingsDialog.password && settingsDialog.password !== settingsDialog.confirmPassword) {
      return flash('error', T.passwordMismatch);
    }
    if (settingsDialog.lockEnabled && !hasPasswordConfigured && !settingsDialog.password.trim()) {
      return flash('error', T.missingPassword);
    }

    setSubmitting(true);
    try {
      const input: SecuritySettingsUpdateInput = {
        lockEnabled: settingsDialog.lockEnabled,
        autoLockMinutes: minutes,
        password: settingsDialog.password.trim() || null,
      };
      const result = await window.desktopConsole.security.updateSettings(input);
      if (!result.success) return flash('error', localizeError(result.error));
      setSecuritySettings(result.data);
      setHasPasswordConfigured(result.data.passwordHash.length > 0);
      if (!result.data.lockEnabled) setIsLocked(false);
      setSettingsDialog((current) =>
        current
          ? {
              ...current,
              lockEnabled: result.data.lockEnabled,
              autoLockMinutes: String(result.data.autoLockMinutes),
              password: '',
              confirmPassword: '',
            }
          : current,
      );
      flash('success', T.saveSecurity);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = await window.desktopConsole.security.unlock({ password: unlockPassword });
    if (!result.success || !result.data) return flash('error', T.unlockFailed);
    setUnlockPassword('');
    setIsLocked(false);
  };

  const handleOpenCreateCategory = () => {
    setCategoryDialog({ mode: 'create', name: '' });
  };

  const handleOpenSettings = async () => {
    const [latestSettings, latestSecurity, browserResult] = await Promise.all([
      refreshAppPreferences(),
      refreshSecurity(),
      window.desktopConsole.system.listBrowsers(),
    ]);
    if (browserResult.success) {
      setInstalledBrowsers(browserResult.data);
    }
    setSettingsDialog(settingsDialogFrom(latestSettings ?? appSettings, latestSecurity ?? securitySettings));
  };

  const handleDropCategories = async (targetId: string) => {
    if (!dragCategoryId || dragCategoryId === targetId) {
      setDragCategoryOverId(null);
      return;
    }

    const allCategory = categories.find((category) => category.id === 'all');
    const ordered = moveItem(
      categories.filter((category) => category.id !== 'all'),
      dragCategoryId,
      targetId,
    );
    const nextCategories = allCategory ? [allCategory, ...ordered] : ordered;
    const payload: SortItemInput[] = ordered.map((category, index) => ({
      id: category.id,
      sortOrder: index + 1,
    }));

    setCategories(nextCategories);
    setDragCategoryId(null);
    setDragCategoryOverId(null);
    const result = await window.desktopConsole.category.reorder(payload);
    if (!result.success) {
      flash('error', localizeError(result.error));
      await refreshCategories(selectedCategory);
      return;
    }
    flash('success', T.sortReady);
  };

  const handleDropCards = async (targetId: string, currentItems: Card[]) => {
    if (!dragCardId || dragCardId === targetId) return;

    const ordered = moveItem(currentItems, dragCardId, targetId);
    const payload: SortItemInput[] = ordered.map((card, index) => ({
      id: card.id,
      sortOrder: index + 1,
    }));

    setCards((current) => replaceVisibleOrder(current, ordered));
    setDragCardId(null);
    const result = await window.desktopConsole.card.reorder(payload);
    if (!result.success) {
      flash('error', localizeError(result.error));
      await refreshVisibleCards();
      return;
    }
    await refreshCatalogCards();
    flash('success', T.sortReady);
  };

  const renderCompactCard = (card: Card, items: Card[]) => (
    <article
      key={card.id}
      className={`rounded-[24px] border border-white/30 bg-white/80 p-4 shadow-[0_12px_30px_rgba(112,140,165,0.16)] backdrop-blur-xl transition hover:-translate-y-0.5 ${
        canSortCards ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      draggable={canSortCards}
      onDragEnd={() => setDragCardId(null)}
      onDragOver={(event) => {
        if (!canSortCards) return;
        event.preventDefault();
      }}
      onDragStart={() => setDragCardId(card.id)}
      onDrop={(event) => {
        if (!canSortCards) return;
        event.preventDefault();
        void handleDropCards(card.id, items);
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <CardAvatar
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-lg font-semibold text-slate-700"
            icon={card.icon}
            imageClassName="h-full w-full rounded-2xl object-cover"
            labelClassName="text-lg font-semibold text-slate-700"
            name={card.name}
          />
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              {card.type === 'website' ? T.website : T.app}
            </p>
            <h4 className="mt-2 truncate text-lg font-semibold text-slate-900">{card.name}</h4>
          </div>
        </div>
        <button
          className="rounded-xl bg-slate-100 px-3 py-1 text-xs text-slate-500 transition hover:bg-sky-50 hover:text-sky-600"
          onClick={() => void handleTogglePinned(card)}
          type="button"
        >
          {card.pinned ? T.unpin : T.pin}
        </button>
      </div>
      <p className="mt-3 min-h-10 text-xs leading-5 text-slate-500">{card.note ?? card.target}</p>
      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
        <span>{getCategoryLabel(categories.find((item) => item.id === card.categoryId) ?? null)}</span>
        <span>{formatLastOpened(card.lastOpenedAt, locale)}</span>
      </div>
      <div className="mt-5 flex gap-2">
        <button
          className="rounded-2xl bg-sky-500 px-4 py-2 text-sm text-white transition hover:bg-sky-600"
          onClick={() => void handleOpenCard(card.id)}
          type="button"
        >
          {T.open}
        </button>
        <button
          className="rounded-2xl bg-white/80 px-4 py-2 text-sm text-slate-500 transition hover:bg-slate-50"
          onClick={() => setCardDialog(editCardDialog(card))}
          type="button"
        >
          {T.edit}
        </button>
      </div>
    </article>
  );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(205,235,255,0.65),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(255,208,180,0.42),_transparent_22%),linear-gradient(180deg,_#7da3c5_0%,_#4d6f89_55%,_#27485d_100%)] p-8 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1360px] rounded-[28px] border border-white/15 bg-slate-950/35 p-6 shadow-[0_30px_80px_rgba(7,16,28,0.28)] backdrop-blur-xl">
        <aside className="w-[270px] rounded-[24px] border border-white/20 bg-white/75 p-6 backdrop-blur-xl">
          <h1 className="text-[20px] font-semibold text-slate-900">{T.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{T.subtitle}</p>
          <p className="mt-6 text-xs text-slate-400">{T.dragCategoryHint}</p>

          <nav className="mt-6 space-y-2">
            {categories.length === 0 ? (
              <div className="rounded-2xl bg-white/65 px-4 py-3 text-sm text-slate-500">{T.emptyCategories}</div>
            ) : null}
            {categories.map((category) => {
              const count =
                category.id === 'all'
                  ? catalogCards.length
                  : catalogCards.filter((card) => card.categoryId === category.id).length;

              return (
                <div
                  key={category.id}
                  className={`group flex items-center gap-2 rounded-2xl pr-2 transition ${
                    dragCategoryId === category.id
                      ? 'bg-sky-50/80'
                      : dragCategoryOverId === category.id
                        ? 'bg-sky-100/80 ring-1 ring-sky-200/70'
                        : ''
                  }`}
                  onDragEnter={(event) => {
                    if (category.id === 'all' || !dragCategoryId) return;
                    event.preventDefault();
                    setDragCategoryOverId(category.id);
                  }}
                  onDragOver={(event) => {
                    if (category.id === 'all' || !dragCategoryId) return;
                    event.preventDefault();
                    if (event.dataTransfer) {
                      event.dataTransfer.dropEffect = 'move';
                    }
                  }}
                  onDrop={(event) => {
                    if (category.id === 'all') return;
                    event.preventDefault();
                    event.stopPropagation();
                    void handleDropCategories(category.id);
                  }}
                >
                  {category.id !== 'all' ? (
                    <span
                      className="flex h-10 w-10 shrink-0 cursor-grab items-center justify-center rounded-2xl text-sm text-slate-300 transition group-hover:bg-white/80 group-hover:text-slate-500 active:cursor-grabbing"
                      draggable
                      onDragEnd={() => {
                        setDragCategoryId(null);
                        setDragCategoryOverId(null);
                      }}
                      onDragStart={(event) => {
                        event.stopPropagation();
                        setDragCategoryId(category.id);
                        setDragCategoryOverId(category.id);
                        if (event.dataTransfer) {
                          event.dataTransfer.effectAllowed = 'move';
                          event.dataTransfer.setData('text/x-desktop-console-category', category.id);
                        }
                      }}
                    >
                      <span className="flex flex-col gap-1">
                        <span className="h-0.5 w-4 rounded-full bg-current" />
                        <span className="h-0.5 w-4 rounded-full bg-current" />
                        <span className="h-0.5 w-4 rounded-full bg-current" />
                      </span>
                    </span>
                  ) : (
                    <span className="h-10 w-10 shrink-0" />
                  )}
                  <button
                    className={`flex flex-1 items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                      category.id === selectedCategory
                        ? 'bg-sky-100 text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:bg-white/70'
                    }`}
                    onClick={() => setSelectedCategory(category.id)}
                    type="button"
                  >
                    <span className="truncate">{getCategoryLabel(category)}</span>
                    <span className="rounded-full bg-white/75 px-2 py-1 text-[11px] text-slate-400">{count}</span>
                  </button>
                </div>
              );
            })}
          </nav>

          <button
            className="mt-8 w-full rounded-2xl border border-white/60 bg-white/75 px-4 py-3 text-sm text-slate-600 transition hover:bg-white"
            onClick={handleOpenCreateCategory}
            type="button"
          >
            {T.addCategory}
          </button>
        </aside>

        <section className="ml-6 flex-1 rounded-[28px] border border-white/20 bg-white/80 p-7 backdrop-blur-xl">
          <header className="flex flex-wrap items-center gap-4 rounded-[22px] border border-white/20 bg-white/75 px-6 py-4">
            <label className="flex min-w-[320px] flex-1 items-center rounded-2xl bg-white/80 px-4 py-3">
              <span className="mr-3 text-sm text-slate-400">{'\u2315'}</span>
              <input
                className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder={T.search}
                type="text"
                value={searchKeyword}
              />
            </label>
            <button
              className="rounded-2xl bg-white/80 px-5 py-3 text-sm text-slate-600 transition hover:bg-white"
              onClick={handleOpenCreateCategory}
              type="button"
            >
              {T.addCategory}
            </button>
            <button
              className="rounded-2xl bg-sky-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-sky-600"
              onClick={() => setCardDialog(makeCardDialog(categories, selectedCategory))}
              type="button"
            >
              {T.addCard}
            </button>
            <button
              className="rounded-2xl bg-white/70 px-5 py-3 text-sm text-slate-600"
              onClick={() => (hasPasswordConfigured ? setIsLocked(true) : flash('error', T.lockNotEnabled))}
              type="button"
            >
              {T.lock}
            </button>
            <button
              className="rounded-2xl bg-white/70 px-5 py-3 text-sm text-slate-600"
              onClick={() => void handleOpenSettings()}
              type="button"
            >
              {T.settings}
            </button>
          </header>

          {feedback ? (
            <div
              className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
                feedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          <div className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-5xl font-semibold tracking-tight text-slate-900">{currentTitle}</h2>
                <p className="mt-2 text-sm text-slate-500">{T.versionSummary(version, cards.length)}</p>
                <p className="mt-2 text-xs text-slate-400">{T.searchHint}</p>
              </div>
              {editableCategory ? (
                <div className="flex gap-3">
                  <button
                    className={secondaryBtn}
                    onClick={() => setCategoryDialog({ mode: 'edit', name: editableCategory.name })}
                    type="button"
                  >
                    {T.rename}
                  </button>
                  <button
                    className="rounded-2xl bg-rose-50 px-4 py-2 text-sm text-rose-600 transition hover:bg-rose-100"
                    onClick={() => void handleDeleteCategory()}
                    type="button"
                  >
                    {T.deleteCategory}
                  </button>
                </div>
              ) : null}
            </div>

            {!deferredSearchKeyword.trim() ? (
              <div className="mt-8 grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
                <section className="rounded-[28px] border border-white/30 bg-white/65 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{T.pinnedSection}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {T.currentCategory}: {getCategoryLabel(activeCategory)}
                      </p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-3 py-1 text-xs text-sky-700">{pinnedCards.length}</span>
                  </div>
                  {pinnedCards.length === 0 ? (
                    <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">{T.noUsage}</div>
                  ) : (
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      {pinnedCards.map((card) => renderCompactCard(card, pinnedCards))}
                    </div>
                  )}
                </section>

                <section className="rounded-[28px] border border-white/30 bg-white/65 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-slate-900">{T.recentSection}</h3>
                      <p className="mt-1 text-sm text-slate-400">{T.addHint}</p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-500">{recentCards.length}</span>
                  </div>
                  {recentCards.length === 0 ? (
                    <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500">{T.emptyRecent}</div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {recentCards.map((card) => (
                        <button
                          key={card.id}
                          className="flex w-full items-center justify-between rounded-2xl bg-white/85 px-4 py-4 text-left transition hover:bg-sky-50"
                          onClick={() => void handleOpenCard(card.id)}
                          type="button"
>
                          <div className="flex min-w-0 items-center gap-3">
                            <CardAvatar
                              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-base font-semibold text-slate-700"
                              icon={card.icon}
                              imageClassName="h-full w-full rounded-2xl object-cover"
                              labelClassName="text-base font-semibold text-slate-700"
                              name={card.name}
                            />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-900">{card.name}</p>
                              <p className="mt-1 text-xs text-slate-400">
                                {getCategoryLabel(categories.find((item) => item.id === card.categoryId) ?? null)}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">{formatLastOpened(card.lastOpenedAt, locale)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : null}

            <div className="mt-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">
                    {deferredSearchKeyword.trim() ? T.searchResult : T.contentSection}
                  </h3>
                  <p className="mt-1 text-sm text-slate-400">
                    {canSortCards
                      ? T.dragCardHint
                      : deferredSearchKeyword.trim()
                        ? T.dragSearchDisabled
                        : T.dragAllDisabled}
                  </p>
                </div>
                <p className="text-sm text-slate-400">{T.importHint}</p>
              </div>
              {cards.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-white/40 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
                  {T.emptyCards}
                </div>
              ) : listCards.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-white/40 bg-white/60 px-6 py-10 text-center text-sm text-slate-500">
                  {T.pinnedOnlyHint}
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
                  {listCards.map((card) => (
                    <article
                      key={card.id}
                      className={`rounded-[24px] border border-white/30 bg-white/80 p-5 shadow-[0_12px_30px_rgba(112,140,165,0.16)] backdrop-blur-xl transition hover:-translate-y-0.5 ${
                        canSortCards ? 'cursor-grab active:cursor-grabbing' : ''
                      }`}
                      draggable={canSortCards}
                      onDragEnd={() => setDragCardId(null)}
                      onDragOver={(event) => {
                        if (!canSortCards) return;
                        event.preventDefault();
                      }}
                      onDragStart={() => setDragCardId(card.id)}
                      onDrop={(event) => {
                        if (!canSortCards) return;
                        event.preventDefault();
                        void handleDropCards(card.id, listCards);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <CardAvatar
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-xl font-semibold text-slate-700"
                            icon={card.icon}
                            imageClassName="h-full w-full rounded-2xl object-cover"
                            labelClassName="text-xl font-semibold text-slate-700"
                            name={card.name}
                          />
                          <div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-400">
                              {card.type === 'website' ? T.website : T.app}
                            </span>
                            {card.pinned ? <p className="mt-2 text-[11px] text-sky-600">{T.pinnedBadge}</p> : null}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="rounded-xl px-3 py-2 text-xs text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
                            onClick={() => void handleTogglePinned(card)}
                            type="button"
                          >
                            {card.pinned ? T.unpin : T.pin}
                          </button>
                          <button
                            className="rounded-xl px-3 py-2 text-xs text-slate-400 transition hover:bg-sky-50 hover:text-sky-600"
                            onClick={() => setCardDialog(editCardDialog(card))}
                            type="button"
                          >
                            {T.edit}
                          </button>
                          <button
                            className="rounded-xl px-3 py-2 text-xs text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                            onClick={() => void handleDeleteCard(card.id)}
                            type="button"
                          >
                            {T.delete}
                          </button>
                        </div>
                      </div>
                      <h4 className="mt-5 truncate text-2xl font-semibold text-slate-900">{card.name}</h4>
                      <p className="mt-2 min-h-10 break-all text-xs leading-5 text-slate-500">{card.note ?? card.target}</p>
                      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-slate-400">
                        <span>{card.openCount > 0 ? T.openedCount(card.openCount) : T.noUsage}</span>
                        <span>{T.lastOpenedAt(formatLastOpened(card.lastOpenedAt, locale))}</span>
                      </div>
                      <div className="mt-6 flex gap-3">
                        <button
                          className="rounded-2xl bg-sky-500 px-4 py-2 text-sm text-white transition hover:bg-sky-600"
                          onClick={() => void handleOpenCard(card.id)}
                          type="button"
                        >
                          {T.open}
                        </button>
                        <span className="rounded-2xl bg-white/80 px-4 py-2 text-sm text-slate-500">
                          {getCategoryLabel(categories.find((item) => item.id === card.categoryId) ?? null)}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {dragOverlayVisible && dragDepth >= 0 ? (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/35 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[520px] rounded-[30px] border border-sky-200/40 bg-white/92 p-8 text-center shadow-[0_24px_60px_rgba(15,23,42,0.24)]">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-sky-100 text-2xl text-sky-600">
              +
            </div>
            <h3 className="mt-5 text-3xl font-semibold text-slate-900">{T.importOverlayTitle}</h3>
            <p className="mt-3 text-sm text-slate-500">{T.importOverlayBody}</p>
            <p className="mt-4 text-xs uppercase tracking-[0.28em] text-slate-400">
              {T.importIntoCategory(importCategoryName)}
            </p>
          </div>
        </div>
      ) : null}

      {categoryDialog ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/25 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[460px] rounded-[28px] border border-white/30 bg-white/88 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
            <h3 className="text-2xl font-semibold text-slate-900">
              {categoryDialog.mode === 'create' ? T.addCategory : T.rename}
            </h3>
            <form className="mt-6 space-y-5" onSubmit={(event) => void handleSubmitCategory(event)}>
              <input
                autoFocus
                className={inputCls}
                onChange={(event) =>
                  setCategoryDialog((current) => (current ? { ...current, name: event.target.value } : current))
                }
                placeholder={T.categoryName}
                type="text"
                value={categoryDialog.name}
              />
              <div className="flex justify-end gap-3">
                <button
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm text-slate-600 transition hover:bg-slate-200"
                  onClick={() => setCategoryDialog(null)}
                  type="button"
                >
                  {T.cancel}
                </button>
                <button
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-sm text-white transition hover:bg-sky-600 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {categoryDialog.mode === 'create' ? T.create : T.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {cardDialog ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/25 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[560px] rounded-[28px] border border-white/30 bg-white/88 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
            <h3 className="text-2xl font-semibold text-slate-900">
              {cardDialog.mode === 'create' ? T.addCard : T.editCard}
            </h3>
            <form className="mt-6 space-y-5" onSubmit={(event) => void handleSubmitCard(event)}>
              <div className="grid grid-cols-2 gap-4">
                <select
                  className={inputCls}
                  onChange={(event) =>
                    setCardDialog((current) =>
                      current ? { ...current, type: event.target.value as 'website' | 'app' } : current,
                    )
                  }
                  value={cardDialog.type}
                >
                  <option value="website">{T.website}</option>
                  <option value="app">{T.app}</option>
                </select>
                <select
                  className={inputCls}
                  onChange={(event) =>
                    setCardDialog((current) => (current ? { ...current, categoryId: event.target.value } : current))
                  }
                  value={cardDialog.categoryId}
                >
                  {categories
                    .filter((category) => category.id !== 'all')
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>
              <input
                className={inputCls}
                onChange={(event) =>
                  setCardDialog((current) => (current ? { ...current, name: event.target.value } : current))
                }
                placeholder={T.cardName}
                type="text"
                value={cardDialog.name}
              />
              <input
                className={inputCls}
                onChange={(event) =>
                  setCardDialog((current) => (current ? { ...current, target: event.target.value } : current))
                }
                placeholder={cardDialog.type === 'website' ? 'https://example.com' : 'C:/Program Files/App/App.exe'}
                type="text"
                value={cardDialog.target}
              />
              <textarea
                className={`${inputCls} min-h-[96px]`}
                onChange={(event) =>
                  setCardDialog((current) => (current ? { ...current, note: event.target.value } : current))
                }
                placeholder={T.cardNote}
                value={cardDialog.note}
              />
              <label className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-4">
                <span className="text-sm text-slate-700">{T.pin}</span>
                <input
                  checked={cardDialog.pinned}
                  onChange={(event) =>
                    setCardDialog((current) => (current ? { ...current, pinned: event.target.checked } : current))
                  }
                  type="checkbox"
                />
              </label>
              <div className="flex justify-end gap-3">
                <button
                  className="rounded-2xl bg-slate-100 px-5 py-3 text-sm text-slate-600 transition hover:bg-slate-200"
                  onClick={() => setCardDialog(null)}
                  type="button"
                >
                  {T.cancel}
                </button>
                <button
                  className="rounded-2xl bg-sky-500 px-5 py-3 text-sm text-white transition hover:bg-sky-600 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {cardDialog.mode === 'create' ? T.create : T.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {settingsDialog ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-950/25 px-6 backdrop-blur-sm">
          <div className="w-full max-w-[720px] rounded-[28px] border border-white/30 bg-white/88 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold text-slate-900">{T.settingsTitle}</h3>
                <p className="mt-2 text-sm text-slate-500">{T.hotkeyHint}</p>
              </div>
              <button
                aria-label={T.close}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-xl leading-none text-slate-500 transition hover:bg-white hover:text-slate-700"
                onClick={() => setSettingsDialog(null)}
                title={T.close}
                type="button"
              >
                X
              </button>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <form
                className="space-y-5 rounded-[24px] bg-slate-50/80 p-5"
                onSubmit={(event) => void handleSaveGeneralSettings(event)}
              >
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{T.generalSettings}</h4>
                  <p className="mt-1 text-sm text-slate-500">{T.hotkeyHint}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-600">{T.themeMode}</label>
                  <select
                    className={inputCls}
                    onChange={(event) =>
                      setSettingsDialog((current) =>
                        current
                          ? { ...current, themeMode: event.target.value as AppSettings['themeMode'] }
                          : current,
                      )
                    }
                    value={settingsDialog.themeMode}
                  >
                    <option value="system">{T.themeSystem}</option>
                    <option value="light">{T.themeLight}</option>
                    <option value="dark">{T.themeDark}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-600">{T.language}</label>
                  <select
                    className={inputCls}
                    onChange={(event) =>
                      setSettingsDialog((current) => (current ? { ...current, language: event.target.value } : current))
                    }
                    value={settingsDialog.language}
                  >
                    {APP_LANGUAGE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-slate-600">{T.hotkey}</label>
                  <input
                    className={inputCls}
                    onChange={(event) =>
                      setSettingsDialog((current) =>
                        current ? { ...current, globalHotkey: event.target.value } : current,
                      )
                    }
                    placeholder={HOTKEY_PLACEHOLDER}
                    type="text"
                    value={settingsDialog.globalHotkey}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm text-slate-600">{T.browserPath}</label>
                    <button
                      className="rounded-xl bg-white px-3 py-2 text-xs text-slate-500 transition hover:bg-slate-100"
                      onClick={() =>
                        setSettingsDialog((current) =>
                          current ? { ...current, browserPath: DEFAULT_BROWSER_PATH } : current,
                        )
                      }
                      type="button"
                    >
                      {browserResetLabel}
                    </button>
                  </div>
                  <select
                    className={inputCls}
                    onChange={(event) =>
                      setSettingsDialog((current) => {
                        if (!current) return current;
                        if (event.target.value === SYSTEM_BROWSER_OPTION_VALUE) {
                          return { ...current, browserPath: DEFAULT_BROWSER_PATH };
                        }
                        if (event.target.value === CUSTOM_BROWSER_OPTION_VALUE) {
                          const nextPath = resolveBrowserSelectValue(current.browserPath, installedBrowsers)
                            === CUSTOM_BROWSER_OPTION_VALUE
                            ? current.browserPath
                            : DEFAULT_BROWSER_PATH;
                          return { ...current, browserPath: nextPath };
                        }
                        return { ...current, browserPath: event.target.value };
                      })
                    }
                    value={resolveBrowserSelectValue(settingsDialog.browserPath, installedBrowsers)}
                  >
                    <option value={SYSTEM_BROWSER_OPTION_VALUE}>{browserResetLabel}</option>
                    {installedBrowsers.map((browser) => (
                      <option key={browser.path} value={browser.path}>
                        {browser.name}
                      </option>
                    ))}
                    <option value={CUSTOM_BROWSER_OPTION_VALUE}>{browserSelectCustomLabel}</option>
                  </select>
                  <p className="text-xs leading-5 text-slate-400">
                    {installedBrowsers.length > 0
                      ? `${browserSelectLabel}: ${installedBrowsers.map((browser) => browser.name).join(', ')}`
                      : browserEmptyHint}
                  </p>
                  <input
                    className={inputCls}
                    onChange={(event) =>
                      setSettingsDialog((current) =>
                        current ? { ...current, browserPath: event.target.value } : current,
                      )
                    }
                    placeholder={browserPathPlaceholder}
                    type="text"
                    value={settingsDialog.browserPath}
                  />
                  <p className="text-xs leading-5 text-slate-400">{browserHintText}</p>
                </div>
                <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-4">
                  <span className="text-sm text-slate-700">{T.trayEnabled}</span>
                  <input
                    checked={settingsDialog.trayEnabled}
                    onChange={(event) =>
                      setSettingsDialog((current) =>
                        current ? { ...current, trayEnabled: event.target.checked } : current,
                      )
                    }
                    type="checkbox"
                  />
                </label>
                <button
                  className="w-full rounded-2xl bg-sky-500 px-5 py-3 text-sm text-white transition hover:bg-sky-600 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {T.saveGeneral}
                </button>
              </form>

              <form
                className="space-y-5 rounded-[24px] bg-slate-50/80 p-5"
                onSubmit={(event) => void handleSaveSecurity(event)}
              >
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{T.securitySettings}</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    {hasPasswordConfigured ? T.passwordConfigured : T.passwordNotConfigured}
                  </p>
                </div>
                <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-4">
                  <span className="text-sm text-slate-700">{T.enableLock}</span>
                  <input
                    checked={settingsDialog.lockEnabled}
                    onChange={(event) =>
                      setSettingsDialog((current) =>
                        current ? { ...current, lockEnabled: event.target.checked } : current,
                      )
                    }
                    type="checkbox"
                  />
                </label>
                <div className="space-y-2">
                  <label className="text-sm text-slate-600">{T.autoLock}</label>
                  <input
                    className={inputCls}
                    onChange={(event) =>
                      setSettingsDialog((current) =>
                        current ? { ...current, autoLockMinutes: event.target.value } : current,
                      )
                    }
                    placeholder={T.autoLock}
                    type="number"
                    value={settingsDialog.autoLockMinutes}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className={inputCls}
                    onChange={(event) =>
                      setSettingsDialog((current) => (current ? { ...current, password: event.target.value } : current))
                    }
                    placeholder={T.password}
                    type="password"
                    value={settingsDialog.password}
                  />
                  <input
                    className={inputCls}
                    onChange={(event) =>
                      setSettingsDialog((current) =>
                        current ? { ...current, confirmPassword: event.target.value } : current,
                      )
                    }
                    placeholder={T.confirmPassword}
                    type="password"
                    value={settingsDialog.confirmPassword}
                  />
                </div>
                <button
                  className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm text-white transition hover:bg-slate-700 disabled:opacity-60"
                  disabled={submitting}
                  type="submit"
                >
                  {T.saveSecurity}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {isLocked ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(205,235,255,0.35),_transparent_25%),radial-gradient(circle_at_top_right,_rgba(255,208,180,0.22),_transparent_20%),linear-gradient(180deg,_rgba(125,163,197,0.8)_0%,_rgba(77,111,137,0.88)_55%,_rgba(39,72,93,0.92)_100%)] px-6 backdrop-blur-xl">
          <div className="w-full max-w-[420px] rounded-[28px] border border-white/25 bg-white/86 p-7 shadow-[0_20px_60px_rgba(15,23,42,0.22)]">
            <h3 className="text-3xl font-semibold text-slate-900">{T.unlockTitle}</h3>
            <p className="mt-2 text-sm text-slate-500">{T.unlockHint}</p>
            <form className="mt-6 space-y-5" onSubmit={(event) => void handleUnlock(event)}>
              <input
                autoFocus
                className={inputCls}
                onChange={(event) => setUnlockPassword(event.target.value)}
                placeholder={T.password}
                type="password"
                value={unlockPassword}
              />
              <button
                className="w-full rounded-2xl bg-sky-500 px-5 py-3 text-sm text-white transition hover:bg-sky-600"
                type="submit"
              >
                {T.unlock}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
};






















