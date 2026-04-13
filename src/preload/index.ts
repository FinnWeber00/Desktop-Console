import { contextBridge, ipcRenderer, webUtils } from 'electron';
import { IPC_CHANNELS } from '../shared/constants/ipc';
import type {
  CardCreateInput,
  CardImportInput,
  CardUpdateInput,
  CategoryCreateInput,
  CategoryUpdateInput,
  DesktopConsoleApi,
  SearchCardsInput,
  SecuritySettingsUpdateInput,
  SettingsUpdateInput,
  SortItemInput,
  UnlockInput,
} from '../shared/types/ipc';

const api: DesktopConsoleApi = {
  category: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.categoryList),
    create: (input: CategoryCreateInput) => ipcRenderer.invoke(IPC_CHANNELS.categoryCreate, input),
    update: (input: CategoryUpdateInput) => ipcRenderer.invoke(IPC_CHANNELS.categoryUpdate, input),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.categoryDelete, id),
    reorder: (items: SortItemInput[]) => ipcRenderer.invoke(IPC_CHANNELS.categoryReorder, items),
  },
  card: {
    list: (categoryId?: string) => ipcRenderer.invoke(IPC_CHANNELS.cardList, categoryId),
    create: (input: CardCreateInput) => ipcRenderer.invoke(IPC_CHANNELS.cardCreate, input),
    update: (input: CardUpdateInput) => ipcRenderer.invoke(IPC_CHANNELS.cardUpdate, input),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.cardDelete, id),
    reorder: (items: SortItemInput[]) => ipcRenderer.invoke(IPC_CHANNELS.cardReorder, items),
    search: (input: SearchCardsInput) => ipcRenderer.invoke(IPC_CHANNELS.cardSearch, input),
    open: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.cardOpen, id),
    import: (input: CardImportInput) => ipcRenderer.invoke(IPC_CHANNELS.cardImport, input),
  },
  security: {
    getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.securityGetSettings),
    hasPassword: () => ipcRenderer.invoke(IPC_CHANNELS.securityHasPassword),
    updateSettings: (input: SecuritySettingsUpdateInput) =>
      ipcRenderer.invoke(IPC_CHANNELS.securityUpdateSettings, input),
    unlock: (input: UnlockInput) => ipcRenderer.invoke(IPC_CHANNELS.securityUnlock, input),
  },
  settings: {
    get: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGet),
    update: (input: SettingsUpdateInput) => ipcRenderer.invoke(IPC_CHANNELS.settingsUpdate, input),
  },
  system: {
    listBrowsers: () => ipcRenderer.invoke(IPC_CHANNELS.systemListBrowsers),
    getVersion: () => ipcRenderer.invoke(IPC_CHANNELS.systemGetVersion),
    getFilePath: (file: File) => webUtils.getPathForFile(file),
  },
};

contextBridge.exposeInMainWorld('desktopConsole', api);
