import { app, ipcMain, shell, type IpcMainInvokeEvent } from 'electron';
import fs from 'node:fs';

import { IPC_CHANNELS } from '../../shared/constants/ipc';
import type {
  CardCreateInput,
  CardImportInput,
  CardUpdateInput,
  CategoryCreateInput,
  CategoryUpdateInput,
  SearchCardsInput,
  SecuritySettingsUpdateInput,
  SettingsUpdateInput,
  SortItemInput,
  UnlockInput,
} from '../../shared/types/ipc';
import type { AppSettings } from '../../shared/types/models';
import type { AppShell } from '../app-shell';
import { getDatabase } from '../db';
import { CardRepository } from '../repositories/card-repository';
import { CategoryRepository } from '../repositories/category-repository';
import { SecurityRepository } from '../repositories/security-repository';
import type { SettingsRepository } from '../repositories/settings-repository';
import {
  getDefaultBrowserPath,
  isKnownChromePath,
  listInstalledBrowsers,
  normalizeExecutablePath,
  openWebsiteTarget,
} from '../services/browser-launcher';
import { populateCardMetadata } from '../services/card-metadata';
import { normalizeHotkeyInput } from '../services/hotkey';
import { importCardsFromResources } from '../services/import-cards';

const ALL_CATEGORY = {
  id: 'all',
  name: '\u5168\u90e8',
  sortOrder: 0,
  createdAt: '',
  updatedAt: '',
} as const;

const ok = <T>(data: T) => ({ success: true as const, data });
const fail = (error: string) => ({ success: false as const, error });

const toSettingsUpdateInput = (settings: AppSettings): SettingsUpdateInput => ({
  themeMode: settings.themeMode,
  language: settings.language,
  trayEnabled: settings.trayEnabled,
  globalHotkey: settings.globalHotkey ?? null,
  browserPath: settings.browserPath,
});

const handle = <TArgs extends unknown[], TResult>(
  channel: string,
  listener: (_event: IpcMainInvokeEvent, ...args: TArgs) => Promise<TResult> | TResult,
): void => {
  ipcMain.removeHandler(channel);
  ipcMain.handle(channel, listener);
};

export const registerIpcHandlers = ({
  settingsRepository,
  appShell,
}: {
  settingsRepository: SettingsRepository;
  appShell: AppShell;
}): void => {
  const db = getDatabase();
  const categoryRepository = new CategoryRepository(db);
  const cardRepository = new CardRepository(db);
  const securityRepository = new SecurityRepository(db);

  handle(IPC_CHANNELS.categoryList, async () => ok([ALL_CATEGORY, ...categoryRepository.list()]));
  handle(IPC_CHANNELS.categoryCreate, async (_event: IpcMainInvokeEvent, input: CategoryCreateInput) => {
    const name = input.name.trim();
    if (!name) {
      return fail('\u5206\u7c7b\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a');
    }

    return ok(categoryRepository.create(name));
  });
  handle(IPC_CHANNELS.categoryUpdate, async (_event: IpcMainInvokeEvent, input: CategoryUpdateInput) => {
    if (input.id === ALL_CATEGORY.id) {
      return fail('\u201c\u5168\u90e8\u201d\u5206\u7c7b\u4e0d\u53ef\u7f16\u8f91');
    }

    const name = input.name.trim();
    if (!name) {
      return fail('\u5206\u7c7b\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a');
    }

    const updated = categoryRepository.update(input.id, name);
    return updated ? ok(updated) : fail('\u5206\u7c7b\u4e0d\u5b58\u5728');
  });
  handle(IPC_CHANNELS.categoryDelete, async (_event: IpcMainInvokeEvent, id: string) => {
    if (id === ALL_CATEGORY.id) {
      return fail('\u201c\u5168\u90e8\u201d\u5206\u7c7b\u4e0d\u53ef\u5220\u9664');
    }

    return ok(categoryRepository.delete(id));
  });
  handle(IPC_CHANNELS.categoryReorder, async (_event: IpcMainInvokeEvent, items: SortItemInput[]) =>
    ok(categoryRepository.reorder(items)),
  );

  handle(IPC_CHANNELS.cardList, async (_event: IpcMainInvokeEvent, categoryId?: string) =>
    ok(cardRepository.list(categoryId)),
  );
  handle(IPC_CHANNELS.cardCreate, async (_event: IpcMainInvokeEvent, input: CardCreateInput) => {
    if (!input.name.trim()) {
      return fail('\u5361\u7247\u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a');
    }
    if (!input.target.trim()) {
      return fail(
        input.type === 'website'
          ? '\u7f51\u7ad9\u5730\u5740\u4e0d\u80fd\u4e3a\u7a7a'
          : '\u5e94\u7528\u8def\u5f84\u4e0d\u80fd\u4e3a\u7a7a',
      );
    }

    const prepared = await populateCardMetadata({
      ...input,
      name: input.name.trim(),
      target: input.target.trim(),
      note: input.note?.trim() ? input.note.trim() : null,
    });

    return ok(cardRepository.create(prepared));
  });
  handle(IPC_CHANNELS.cardUpdate, async (_event: IpcMainInvokeEvent, input: CardUpdateInput) => {
    const prepared = await populateCardMetadata({
      ...input,
      name: input.name.trim(),
      target: input.target.trim(),
      note: input.note?.trim() ? input.note.trim() : null,
    });

    const updated = cardRepository.update(prepared);
    return updated ? ok(updated) : fail('\u5361\u7247\u4e0d\u5b58\u5728');
  });
  handle(IPC_CHANNELS.cardDelete, async (_event: IpcMainInvokeEvent, id: string) => ok(cardRepository.delete(id)));
  handle(IPC_CHANNELS.cardReorder, async (_event: IpcMainInvokeEvent, items: SortItemInput[]) =>
    ok(cardRepository.reorder(items)),
  );
  handle(IPC_CHANNELS.cardSearch, async (_event: IpcMainInvokeEvent, input: SearchCardsInput) =>
    ok(cardRepository.search(input)),
  );
  handle(IPC_CHANNELS.cardImport, async (_event: IpcMainInvokeEvent, input: CardImportInput) => {
    if (!input.categoryId || input.categoryId === ALL_CATEGORY.id) {
      return fail('\u8bf7\u5148\u9009\u62e9\u4e00\u4e2a\u5177\u4f53\u5206\u7c7b\u518d\u5bfc\u5165');
    }
    if (!categoryRepository.findById(input.categoryId)) {
      return fail('\u76ee\u6807\u5206\u7c7b\u4e0d\u5b58\u5728');
    }

    const created = await importCardsFromResources(cardRepository, input);
    if (created.length === 0) {
      return fail('\u672a\u8bc6\u522b\u5230\u53ef\u5bfc\u5165\u7684 URL \u6216\u672c\u5730\u7a0b\u5e8f');
    }

    return ok(created);
  });
  handle(IPC_CHANNELS.cardOpen, async (_event: IpcMainInvokeEvent, id: string) => {
    const card = cardRepository.findById(id);
    if (!card) {
      return fail('\u672a\u627e\u5230\u5361\u7247');
    }

    if (card.type === 'website') {
      const settings = settingsRepository.get();
      const openError = await openWebsiteTarget(card.target, settings.browserPath);
      if (openError) {
        return fail(openError);
      }
    } else {
      if (!fs.existsSync(card.target)) {
        return fail('\u5e94\u7528\u8def\u5f84\u4e0d\u5b58\u5728');
      }

      const error = await shell.openPath(card.target);
      if (error) {
        return fail(error);
      }
    }

    cardRepository.markOpened(id);
    return ok(true);
  });

  handle(IPC_CHANNELS.securityGetSettings, async () => ok(securityRepository.get()));
  handle(IPC_CHANNELS.securityHasPassword, async () => ok(securityRepository.hasPassword()));
  handle(
    IPC_CHANNELS.securityUpdateSettings,
    async (_event: IpcMainInvokeEvent, input: SecuritySettingsUpdateInput) => {
      if (input.autoLockMinutes <= 0 || !Number.isInteger(input.autoLockMinutes)) {
        return fail('\u81ea\u52a8\u9501\u5b9a\u65f6\u95f4\u5fc5\u987b\u662f\u6b63\u6574\u6570');
      }
      if (input.lockEnabled && !securityRepository.hasPassword() && !input.password?.trim()) {
        return fail('\u9996\u6b21\u542f\u7528\u5bc6\u7801\u9501\u65f6\u8bf7\u8bbe\u7f6e\u5bc6\u7801');
      }

      return ok(securityRepository.updateSettings(input));
    },
  );
  handle(IPC_CHANNELS.securityUnlock, async (_event: IpcMainInvokeEvent, input: UnlockInput) =>
    ok(securityRepository.verifyPassword(input.password.trim())),
  );

  handle(IPC_CHANNELS.settingsGet, async () => ok(settingsRepository.get()));
  handle(IPC_CHANNELS.settingsUpdate, async (_event: IpcMainInvokeEvent, input: SettingsUpdateInput) => {
    const normalizedHotkey = normalizeHotkeyInput(input.globalHotkey);
    if (normalizedHotkey.error) {
      return fail(normalizedHotkey.error);
    }

    let normalizedBrowserPath = normalizeExecutablePath(input.browserPath) ?? getDefaultBrowserPath();
    if (normalizedBrowserPath && !fs.existsSync(normalizedBrowserPath)) {
      if (isKnownChromePath(normalizedBrowserPath)) {
        normalizedBrowserPath = getDefaultBrowserPath();
      } else {
        return fail('\u6d4f\u89c8\u5668\u8def\u5f84\u4e0d\u5b58\u5728\uff0c\u8bf7\u68c0\u67e5 Chrome \u6216\u81ea\u5b9a\u4e49\u6d4f\u89c8\u5668\u5b89\u88c5\u8def\u5f84');
      }
    }

    const current = settingsRepository.get();
    const updated = settingsRepository.update({
      ...input,
      globalHotkey: normalizedHotkey.accelerator,
      browserPath: normalizedBrowserPath,
    });
    const applyResult = appShell.applySettings(updated);

    if (!applyResult.success) {
      const rolledBack = settingsRepository.update(toSettingsUpdateInput(current));
      appShell.applySettings(rolledBack);
      return fail(applyResult.error);
    }

    return ok(updated);
  });

  handle(IPC_CHANNELS.systemListBrowsers, async () => ok(listInstalledBrowsers()));
  handle(IPC_CHANNELS.systemGetVersion, async () => ok(app.getVersion()));
};
