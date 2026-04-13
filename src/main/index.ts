import { app } from 'electron';
import started from 'electron-squirrel-startup';

import { AppShell } from './app-shell';
import { getDatabase } from './db';
import { registerIpcHandlers } from './ipc/register-ipc';
import { CardRepository } from './repositories/card-repository';
import { SettingsRepository } from './repositories/settings-repository';
import { repairMissingAppIcons } from './services/card-maintenance';

let appShell: AppShell | null = null;
let settingsRepository: SettingsRepository | null = null;

if (started) {
  app.quit();
}

const bootstrap = async (): Promise<void> => {
  const db = getDatabase();
  const cardRepository = new CardRepository(db);
  settingsRepository = new SettingsRepository(db);
  appShell = new AppShell(settingsRepository);

  await repairMissingAppIcons(cardRepository);

  registerIpcHandlers({ settingsRepository, appShell });
  appShell.initialize();
};

void app.whenReady().then(bootstrap);

app.on('window-all-closed', () => {
  const trayEnabled = settingsRepository?.get().trayEnabled ?? false;
  if (!trayEnabled && process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  appShell?.showMainWindow();
});

app.on('before-quit', () => {
  appShell?.markQuitting();
});

app.on('will-quit', () => {
  appShell?.cleanup();
});
