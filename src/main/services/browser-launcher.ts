import { shell } from 'electron';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { InstalledBrowserOption } from '../../shared/types/ipc';

type BrowserCandidate = {
  id: string;
  name: string;
  paths: string[];
};

const WINDOWS_BROWSER_CANDIDATES: BrowserCandidate[] = [
  {
    id: 'chrome',
    name: 'Google Chrome',
    paths: [
      path.join('C:', 'Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join('C:', 'Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ],
  },
  {
    id: 'edge',
    name: 'Microsoft Edge',
    paths: [
      path.join('C:', 'Program Files', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join('C:', 'Program Files (x86)', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ],
  },
  {
    id: 'firefox',
    name: 'Mozilla Firefox',
    paths: [
      path.join('C:', 'Program Files', 'Mozilla Firefox', 'firefox.exe'),
      path.join('C:', 'Program Files (x86)', 'Mozilla Firefox', 'firefox.exe'),
    ],
  },
  {
    id: 'brave',
    name: 'Brave',
    paths: [
      path.join('C:', 'Program Files', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join('C:', 'Program Files (x86)', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
    ],
  },
  {
    id: 'opera',
    name: 'Opera',
    paths: [
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Opera', 'opera.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Opera GX', 'opera.exe'),
    ],
  },
  {
    id: 'vivaldi',
    name: 'Vivaldi',
    paths: [
      path.join('C:', 'Program Files', 'Vivaldi', 'Application', 'vivaldi.exe'),
      path.join('C:', 'Program Files (x86)', 'Vivaldi', 'Application', 'vivaldi.exe'),
      path.join(os.homedir(), 'AppData', 'Local', 'Vivaldi', 'Application', 'vivaldi.exe'),
    ],
  },
];

const WINDOWS_START_MENU_BROWSER_KEYS = [
  'HKCU\\Software\\Clients\\StartMenuInternet',
  'HKLM\\SOFTWARE\\Clients\\StartMenuInternet',
  'HKLM\\SOFTWARE\\WOW6432Node\\Clients\\StartMenuInternet',
];

const COMMON_CHROME_PATH_SET = new Set(
  WINDOWS_BROWSER_CANDIDATES.find((candidate) => candidate.id === 'chrome')?.paths.map((candidate) =>
    path.normalize(candidate),
  ) ?? [],
);

const normalizeForCompare = (value?: string | null): string => {
  const normalized = normalizeExecutablePath(value);
  return normalized ? normalized.toLowerCase() : '';
};

const extractExecutableFromCommand = (command: string): string | null => {
  const trimmed = command.trim();
  if (!trimmed) return null;

  const quotedMatch = trimmed.match(/^"([^"]+\.exe)"/i);
  if (quotedMatch) {
    return normalizeExecutablePath(quotedMatch[1]);
  }

  const unquotedMatch = trimmed.match(/^([A-Za-z]:\\.+?\.exe)\b/i);
  return normalizeExecutablePath(unquotedMatch?.[1] ?? null);
};

const runRegistryQuery = (args: string[]): string => {
  const result = spawnSync('reg.exe', args, {
    encoding: 'utf8',
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    return '';
  }

  return result.stdout ?? '';
};

const listRegistrySubkeys = (rootKey: string): string[] =>
  runRegistryQuery(['query', rootKey])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith(`${rootKey}\\`));

const readRegistryDefaultValue = (registryKey: string): string | null => {
  const output = runRegistryQuery(['query', registryKey, '/ve']);
  const match = output.match(/REG_\w+\s+(.+)$/m);
  return match?.[1]?.trim() || null;
};

const readRegistryBrowserPath = (registryKey: string): string | null => {
  const output = runRegistryQuery(['query', `${registryKey}\\shell\\open\\command`, '/ve']);
  const match = output.match(/REG_\w+\s+(.+)$/m);
  if (!match?.[1]) return null;

  return extractExecutableFromCommand(match[1]);
};

const addBrowserOption = (
  browsers: Map<string, InstalledBrowserOption>,
  option: InstalledBrowserOption | null,
): void => {
  if (!option || !fs.existsSync(option.path)) {
    return;
  }

  const normalizedPath = normalizeForCompare(option.path);
  if (!normalizedPath || browsers.has(normalizedPath)) {
    return;
  }

  browsers.set(normalizedPath, {
    ...option,
    path: path.normalize(option.path),
  });
};

const deriveBrowserNameFromPath = (browserPath: string): string =>
  path.basename(browserPath, path.extname(browserPath));

const listWindowsInstalledBrowsers = (): InstalledBrowserOption[] => {
  const browsers = new Map<string, InstalledBrowserOption>();

  for (const rootKey of WINDOWS_START_MENU_BROWSER_KEYS) {
    for (const browserKey of listRegistrySubkeys(rootKey)) {
      const browserPath = readRegistryBrowserPath(browserKey);
      if (!browserPath) continue;

      const browserName =
        readRegistryDefaultValue(browserKey) ??
        deriveBrowserNameFromPath(browserPath);

      addBrowserOption(browsers, {
        id: path.basename(browserKey).toLowerCase(),
        name: browserName,
        path: browserPath,
      });
    }
  }

  for (const candidate of WINDOWS_BROWSER_CANDIDATES) {
    for (const browserPath of candidate.paths) {
      addBrowserOption(browsers, {
        id: candidate.id,
        name: candidate.name,
        path: browserPath,
      });
    }
  }

  return [...browsers.values()].sort((left, right) => left.name.localeCompare(right.name));
};

export const normalizeExecutablePath = (value?: string | null): string | null => {
  const trimmed = value?.trim().replace(/^"|"$/g, '') ?? '';
  return trimmed ? path.normalize(trimmed) : null;
};

export const isKnownChromePath = (value?: string | null): boolean => {
  const normalized = normalizeExecutablePath(value);
  return normalized ? COMMON_CHROME_PATH_SET.has(normalized) : false;
};

export const getDefaultBrowserPath = (): string => '';

export const listInstalledBrowsers = (): InstalledBrowserOption[] => {
  if (process.platform === 'win32') {
    return listWindowsInstalledBrowsers();
  }

  return [];
};

const launchWithExecutable = (executablePath: string, target: string): string | null => {
  try {
    const child = spawn(executablePath, [target], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : '\u672a\u77e5\u9519\u8bef';
  }
};

export const openWebsiteTarget = async (target: string, browserPath?: string | null): Promise<string | null> => {
  const configuredPath = normalizeExecutablePath(browserPath);
  if (configuredPath) {
    if (fs.existsSync(configuredPath)) {
      const launchError = launchWithExecutable(configuredPath, target);
      return launchError ? `\u6d4f\u89c8\u5668\u542f\u52a8\u5931\u8d25\uff1a${launchError}` : null;
    }

    if (!isKnownChromePath(configuredPath)) {
      return '\u8bbe\u7f6e\u4e2d\u7684\u6d4f\u89c8\u5668\u8def\u5f84\u4e0d\u5b58\u5728\uff0c\u8bf7\u5728\u8bbe\u7f6e\u4e2d\u4fee\u6b63\u540e\u518d\u8bd5';
    }
  }

  try {
    await shell.openExternal(target);
    return null;
  } catch (error) {
    return error instanceof Error
      ? `\u7cfb\u7edf\u6d4f\u89c8\u5668\u542f\u52a8\u5931\u8d25\uff1a${error.message}`
      : '\u7cfb\u7edf\u6d4f\u89c8\u5668\u542f\u52a8\u5931\u8d25';
  }
};
