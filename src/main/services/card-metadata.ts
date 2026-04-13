import { app } from 'electron';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import type { CardCreateInput, CardUpdateInput } from '../../shared/types/ipc';

const execFileAsync = promisify(execFile);

const FETCH_TIMEOUT_MS = 5000;
const POWERSHELL_TIMEOUT_MS = 3000;
const TITLE_RE = /<title[^>]*>([\s\S]*?)<\/title>/i;
const LINK_TAG_RE = /<link\b[^>]*>/gi;
const ATTR_RE = /([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

type WebsiteMetadata = {
  name: string | null;
  icon: string | null;
  target: string;
};

type AppMetadata = {
  icon: string | null;
  target: string;
  resolvedTarget: string | null;
};

type ShortcutMetadata = {
  targetPath: string | null;
  iconLocation: string | null;
  iconDataUrl: string | null;
};

type CardInputShape = CardCreateInput | CardUpdateInput;

const isWindowsPath = (value: string): boolean => /^[a-zA-Z]:[\\/]/.test(value) || value.startsWith('\\');
const isFileUrl = (value: string): boolean => /^file:\/\//i.test(value);

const isHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const normalizeWebsiteTarget = (value: string): string | null => {
  const trimmed = value.trim();
  if (
    !trimmed ||
    isWindowsPath(trimmed) ||
    isFileUrl(trimmed) ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  ) {
    return null;
  }

  if (isHttpUrl(trimmed)) {
    return new URL(trimmed).toString();
  }

  const bareHostPattern = /^(?:localhost|(?:\d{1,3}\.){3}\d{1,3}|(?:[a-z0-9-]+\.)+[a-z]{2,})(?::\d+)?(?:[/?#].*)?$/i;
  if (!/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) && bareHostPattern.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return null;
};

export const normalizeAppTarget = (value: string): string => {
  const trimmed = value.trim().replace(/^"|"$/g, '');
  if (!trimmed) {
    return '';
  }

  if (isFileUrl(trimmed)) {
    try {
      return path.normalize(fileURLToPath(trimmed));
    } catch {
      return trimmed;
    }
  }

  if (/^\/[a-zA-Z]:[\\/]/.test(trimmed)) {
    return path.normalize(trimmed.slice(1));
  }

  return path.normalize(trimmed);
};

const isWindowsShortcut = (value: string): boolean =>
  process.platform === 'win32' && path.extname(value).toLowerCase() === '.lnk';

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, ' ').trim();

const decodeHtmlEntities = (value: string): string =>
  value.replace(/&(#x?[\da-f]+|[a-z]+);/gi, (entity, token: string) => {
    const normalized = token.toLowerCase();
    if (normalized.startsWith('#x')) {
      const code = Number.parseInt(normalized.slice(2), 16);
      return Number.isNaN(code) ? entity : String.fromCodePoint(code);
    }
    if (normalized.startsWith('#')) {
      const code = Number.parseInt(normalized.slice(1), 10);
      return Number.isNaN(code) ? entity : String.fromCodePoint(code);
    }
    return HTML_ENTITIES[normalized] ?? entity;
  });

const extractAttributes = (tag: string): Record<string, string> => {
  const attributes = {} as Record<string, string>;
  for (const match of tag.matchAll(ATTR_RE)) {
    const [, rawName, , doubleQuoted, singleQuoted, bare] = match;
    attributes[rawName.toLowerCase()] = doubleQuoted ?? singleQuoted ?? bare ?? '';
  }
  return attributes;
};

const toAbsoluteHttpUrl = (value: string, baseUrl: string): string | null => {
  try {
    const url = new URL(value, baseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const extractTitle = (html: string): string | null => {
  const raw = html.match(TITLE_RE)?.[1];
  if (!raw) {
    return null;
  }

  const cleaned = collapseWhitespace(decodeHtmlEntities(raw));
  return cleaned || null;
};

const extractIcon = (html: string, baseUrl: string): string | null => {
  for (const tag of html.match(LINK_TAG_RE) ?? []) {
    const attributes = extractAttributes(tag);
    const rel = attributes.rel?.toLowerCase() ?? '';
    if (!rel.includes('icon')) {
      continue;
    }

    const href = attributes.href?.trim();
    if (!href) {
      continue;
    }

    const absolute = toAbsoluteHttpUrl(href, baseUrl);
    if (absolute) {
      return absolute;
    }
  }

  return null;
};

const buildFallbackIcon = (target: string): string | null => {
  try {
    return new URL('/favicon.ico', target).toString();
  } catch {
    return null;
  }
};

const parseShortcutIconLocation = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withoutIndex = trimmed.replace(/,\s*-?\d+\s*$/, '').replace(/^"|"$/g, '').trim();
  return withoutIndex && fs.existsSync(withoutIndex) ? withoutIndex : null;
};

const resolveWindowsShortcut = async (shortcutPath: string): Promise<ShortcutMetadata | null> => {
  if (!isWindowsShortcut(shortcutPath) || !fs.existsSync(shortcutPath)) {
    return null;
  }

  const scriptPath = path.join(os.tmpdir(), `desktop-console-shortcut-${process.pid}.ps1`);
  const script = `
param([string]$shortcutPath)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom
Add-Type -AssemblyName System.Drawing
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$targetPath = if ($shortcut.TargetPath) { $shortcut.TargetPath.ToString().Trim() } else { $null }
$iconLocation = if ($shortcut.IconLocation) { $shortcut.IconLocation.ToString().Trim() } else { $null }
$iconPath = $null
if ($iconLocation) {
  $iconPath = ($iconLocation -replace ',\\s*-?\\d+\\s*$', '').Trim('"')
}
$base64 = $null
$candidates = @()
if ($targetPath) { $candidates += $targetPath }
if ($iconPath) { $candidates += $iconPath }
foreach ($candidate in $candidates) {
  if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate)) {
    try {
      $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($candidate)
      if ($null -ne $icon) {
        $bitmap = $icon.ToBitmap()
        $stream = New-Object System.IO.MemoryStream
        $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
        $base64 = [Convert]::ToBase64String($stream.ToArray())
        break
      }
    } catch {}
  }
}
[PSCustomObject]@{
  TargetPath = $targetPath
  IconLocation = $iconLocation
  IconDataUrl = if ($base64) { "data:image/png;base64,$base64" } else { $null }
} | ConvertTo-Json -Compress
`.trim();

  fs.writeFileSync(scriptPath, script, 'utf8');

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, shortcutPath],
      {
        windowsHide: true,
        timeout: POWERSHELL_TIMEOUT_MS,
        maxBuffer: 1024 * 1024 * 6,
      },
    );

    const parsed = JSON.parse(stdout.trim()) as {
      TargetPath?: unknown;
      IconLocation?: unknown;
      IconDataUrl?: unknown;
    };

    return {
      targetPath: typeof parsed.TargetPath === 'string' && parsed.TargetPath.trim() ? parsed.TargetPath.trim() : null,
      iconLocation:
        typeof parsed.IconLocation === 'string' && parsed.IconLocation.trim() ? parsed.IconLocation.trim() : null,
      iconDataUrl:
        typeof parsed.IconDataUrl === 'string' && parsed.IconDataUrl.trim() ? parsed.IconDataUrl.trim() : null,
    };
  } catch {
    return null;
  } finally {
    try {
      fs.unlinkSync(scriptPath);
    } catch {
      // Ignore temp cleanup failures.
    }
  }
};

const extractFileIconWithPowerShell = async (filePath: string): Promise<string | null> => {
  const script = [
    'Add-Type -AssemblyName System.Drawing',
    '$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($args[0])',
    'if ($null -eq $icon) { return }',
    '$bitmap = $icon.ToBitmap()',
    '$stream = New-Object System.IO.MemoryStream',
    '$bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)',
    '[Convert]::ToBase64String($stream.ToArray())',
  ].join('; ');

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script, filePath],
      {
        windowsHide: true,
        timeout: POWERSHELL_TIMEOUT_MS,
        maxBuffer: 1024 * 1024 * 4,
      },
    );

    const base64 = stdout.trim();
    return base64 ? `data:image/png;base64,${base64}` : null;
  } catch {
    return null;
  }
};

const getFileIconDataUrl = async (...candidates: Array<string | null | undefined>): Promise<string | null> => {
  for (const candidate of candidates) {
    const filePath = candidate?.trim();
    if (!filePath || !fs.existsSync(filePath)) {
      continue;
    }

    try {
      const icon = await app.getFileIcon(filePath, { size: 'large' });
      if (!icon.isEmpty()) {
        return icon.toDataURL();
      }
    } catch {
      // Fall through to the PowerShell extractor below.
    }

    const fallbackIcon = await extractFileIconWithPowerShell(filePath);
    if (fallbackIcon) {
      return fallbackIcon;
    }
  }

  return null;
};

const getShortcutIconDataUrl = async (
  shortcutTarget: string | null,
  shortcutIconPath: string | null,
  shortcutPath: string,
): Promise<string | null> => {
  if (process.platform === 'win32') {
    const preferredFromTarget = await extractFileIconWithPowerShell(shortcutTarget ?? '');
    if (preferredFromTarget) {
      return preferredFromTarget;
    }

    const preferredFromIconLocation = await extractFileIconWithPowerShell(shortcutIconPath ?? '');
    if (preferredFromIconLocation) {
      return preferredFromIconLocation;
    }
  }

  return getFileIconDataUrl(shortcutTarget, shortcutIconPath, shortcutPath);
};


const getDesktopShortcutDirectories = (): string[] => {
  const directories = [path.join(os.homedir(), 'Desktop')];
  const publicProfile = process.env.PUBLIC;
  if (publicProfile) {
    directories.push(path.join(publicProfile, 'Desktop'));
  }
  return directories.filter((directory, index, list) => directory && list.indexOf(directory) === index);
};

const findShortcutByAppName = (appName: string): string | null => {
  const trimmed = appName.trim();
  if (!trimmed) {
    return null;
  }

  for (const directory of getDesktopShortcutDirectories()) {
    if (!fs.existsSync(directory)) {
      continue;
    }

    const exactMatch = path.join(directory, `${trimmed}.lnk`);
    if (fs.existsSync(exactMatch)) {
      return exactMatch;
    }

    try {
      const matched = fs
        .readdirSync(directory)
        .find((entry) => entry.toLowerCase().endsWith('.lnk') && entry.includes(trimmed));
      if (matched) {
        return path.join(directory, matched);
      }
    } catch {
      // Ignore unreadable shortcut directories.
    }
  }

  return null;
};

const findDesktopShortcutTargetByExecutableName = async (
  executableName: string,
): Promise<ShortcutMetadata | null> => {
  const normalizedExecutableName = executableName.trim();
  if (!normalizedExecutableName) {
    return null;
  }

  const scriptPath = path.join(os.tmpdir(), `desktop-console-shortcut-match-${process.pid}.ps1`);
  const script = `
param([string]$executableName)
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = $utf8NoBom
$OutputEncoding = $utf8NoBom
Add-Type -AssemblyName System.Drawing
$shell = New-Object -ComObject WScript.Shell
$roots = @([System.IO.Path]::Combine($env:USERPROFILE, 'Desktop'))
if ($env:PUBLIC) {
  $roots += [System.IO.Path]::Combine($env:PUBLIC, 'Desktop')
}
foreach ($root in $roots) {
  if (-not (Test-Path -LiteralPath $root)) { continue }
  Get-ChildItem -LiteralPath $root -Filter *.lnk -File -ErrorAction SilentlyContinue | ForEach-Object {
    try {
      $shortcut = $shell.CreateShortcut($_.FullName)
      $targetPath = if ($shortcut.TargetPath) { $shortcut.TargetPath.ToString().Trim() } else { $null }
      if (-not $targetPath) { return }
      if (-not [System.IO.Path]::GetFileName($targetPath).Equals($executableName, [System.StringComparison]::OrdinalIgnoreCase)) { return }
      $iconLocation = if ($shortcut.IconLocation) { $shortcut.IconLocation.ToString().Trim() } else { $null }
      $iconPath = $null
      if ($iconLocation) {
        $iconPath = ($iconLocation -replace ',\\s*-?\\d+\\s*$', '').Trim('"')
      }
      $base64 = $null
      $candidates = @($targetPath)
      if ($iconPath) { $candidates += $iconPath }
      foreach ($candidate in $candidates) {
        if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path -LiteralPath $candidate)) {
          try {
            $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($candidate)
            if ($null -ne $icon) {
              $bitmap = $icon.ToBitmap()
              $stream = New-Object System.IO.MemoryStream
              $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
              $base64 = [Convert]::ToBase64String($stream.ToArray())
              break
            }
          } catch {}
        }
      }
      [PSCustomObject]@{
        TargetPath = $targetPath
        IconLocation = $iconLocation
        IconDataUrl = if ($base64) { "data:image/png;base64,$base64" } else { $null }
      } | ConvertTo-Json -Compress
      exit 0
    } catch {}
  }
}
[PSCustomObject]@{
  TargetPath = $null
  IconLocation = $null
  IconDataUrl = $null
} | ConvertTo-Json -Compress
`.trim();

  fs.writeFileSync(scriptPath, `\uFEFF${script}`, 'utf8');

  try {
    const { stdout } = await execFileAsync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, normalizedExecutableName],
      {
        windowsHide: true,
        timeout: POWERSHELL_TIMEOUT_MS * 3,
        maxBuffer: 1024 * 1024 * 6,
      },
    );

    const parsed = JSON.parse(stdout.trim()) as {
      TargetPath?: unknown;
      IconLocation?: unknown;
      IconDataUrl?: unknown;
    };

    return {
      targetPath: typeof parsed.TargetPath === 'string' && parsed.TargetPath.trim() ? parsed.TargetPath.trim() : null,
      iconLocation:
        typeof parsed.IconLocation === 'string' && parsed.IconLocation.trim() ? parsed.IconLocation.trim() : null,
      iconDataUrl:
        typeof parsed.IconDataUrl === 'string' && parsed.IconDataUrl.trim() ? parsed.IconDataUrl.trim() : null,
    };
  } catch {
    return null;
  } finally {
    try {
      fs.unlinkSync(scriptPath);
    } catch {
      // Ignore temp cleanup failures.
    }
  }
};

const shortcutKeyword = String.fromCodePoint(0x5feb, 0x6377, 0x65b9, 0x5f0f);

const shouldReplaceShortcutName = (currentName: string, shortcutPath: string): boolean => {
  const trimmed = currentName.trim();
  if (!trimmed) {
    return true;
  }

  const lower = trimmed.toLowerCase();
  const shortcutFallback = deriveAppName(shortcutPath).toLowerCase();
  return lower === shortcutFallback || lower.includes(shortcutKeyword) || lower.endsWith('.lnk') || lower.endsWith(' - shortcut');
};

export const deriveWebsiteName = (target: string): string => {
  try {
    const url = new URL(target);
    return url.hostname.replace(/^www\./i, '') || target;
  } catch {
    return target;
  }
};

export const deriveAppName = (target: string): string => {
  const normalizedTarget = normalizeAppTarget(target);
  const base = path.basename(normalizedTarget, path.extname(normalizedTarget)) || path.basename(normalizedTarget);
  return base.trim() || normalizedTarget;
};

const fetchWebsiteMetadata = async (target: string): Promise<WebsiteMetadata> => {
  const fallbackTarget = normalizeWebsiteTarget(target) ?? target.trim();
  if (!isHttpUrl(fallbackTarget)) {
    return {
      name: null,
      icon: null,
      target: fallbackTarget,
    };
  }

  try {
    const response = await fetch(fallbackTarget, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'user-agent': 'Desktop Console/1.0',
      },
    });

    const resolvedTarget = response.url || fallbackTarget;
    const contentType = response.headers.get('content-type') ?? '';
    const isHtmlResponse = /text\/html|application\/xhtml\+xml/i.test(contentType);
    if (!response.ok || (contentType && !isHtmlResponse)) {
      return {
        name: null,
        icon: buildFallbackIcon(resolvedTarget),
        target: resolvedTarget,
      };
    }

    const html = await response.text();
    return {
      name: extractTitle(html),
      icon: extractIcon(html, resolvedTarget) ?? buildFallbackIcon(resolvedTarget),
      target: resolvedTarget,
    };
  } catch {
    return {
      name: null,
      icon: buildFallbackIcon(fallbackTarget),
      target: fallbackTarget,
    };
  }
};

const fetchAppMetadata = async (target: string, appName?: string): Promise<AppMetadata> => {
  const normalizedTarget = normalizeAppTarget(target);
  if (!normalizedTarget) {
    return {
      icon: null,
      target: normalizedTarget,
      resolvedTarget: null,
    };
  }

  if (!fs.existsSync(normalizedTarget)) {
    const executableName = path.basename(normalizedTarget);
    const shortcutPath =
      (appName?.trim() ? findShortcutByAppName(appName) : null) ?? null;

    if (shortcutPath) {
      const shortcut = await resolveWindowsShortcut(shortcutPath);
      const shortcutIconPath = parseShortcutIconLocation(shortcut?.iconLocation ?? null);
      const resolvedTarget = shortcut?.targetPath?.trim() || null;
      const icon = shortcut?.iconDataUrl ?? (await getShortcutIconDataUrl(resolvedTarget, shortcutIconPath, shortcutPath));

      if (resolvedTarget) {
        return {
          icon,
          target: resolvedTarget,
          resolvedTarget,
        };
      }
    }

    const shortcutMatch = await findDesktopShortcutTargetByExecutableName(executableName);
    const shortcutIconPath = parseShortcutIconLocation(shortcutMatch?.iconLocation ?? null);
    const resolvedTarget = shortcutMatch?.targetPath?.trim() || null;
    const icon = shortcutMatch?.iconDataUrl ?? (await getShortcutIconDataUrl(resolvedTarget, shortcutIconPath, resolvedTarget ?? executableName));

    if (resolvedTarget) {
      return {
        icon,
        target: resolvedTarget,
        resolvedTarget,
      };
    }
  }

  const shortcut = await resolveWindowsShortcut(normalizedTarget);
  const shortcutIconPath = parseShortcutIconLocation(shortcut?.iconLocation ?? null);
  const resolvedTarget = shortcut?.targetPath?.trim() || null;
  const icon = isWindowsShortcut(normalizedTarget)
    ? shortcut?.iconDataUrl ?? (await getShortcutIconDataUrl(resolvedTarget, shortcutIconPath, normalizedTarget))
    : await getFileIconDataUrl(normalizedTarget, shortcutIconPath, resolvedTarget);

  return {
    icon,
    target: resolvedTarget || normalizedTarget,
    resolvedTarget,
  };
};

export const populateCardMetadata = async <T extends CardInputShape>(input: T): Promise<T> => {
  const normalizedName = input.name.trim();
  const normalizedTarget = input.target.trim();
  const normalizedNote = input.note?.trim() ? input.note.trim() : null;
  const normalizedIcon = input.icon?.trim() ? input.icon.trim() : null;

  if (input.type === 'website') {
    const websiteTarget = normalizeWebsiteTarget(normalizedTarget) ?? normalizedTarget;
    const metadata = await fetchWebsiteMetadata(websiteTarget);
    const fallbackName = deriveWebsiteName(metadata.target || normalizedTarget);
    const shouldReplaceName =
      !normalizedName ||
      normalizedName === normalizedTarget ||
      normalizedName.toLowerCase() === fallbackName.toLowerCase();

    return {
      ...input,
      name: shouldReplaceName ? metadata.name ?? fallbackName : normalizedName,
      target: metadata.target || websiteTarget,
      note: normalizedNote,
      icon: normalizedIcon ?? metadata.icon ?? null,
    };
  }

  const metadata = await fetchAppMetadata(normalizedTarget, normalizedName);
  const fallbackName = deriveAppName(metadata.resolvedTarget || metadata.target || normalizedTarget);
  const shouldReplaceName = isWindowsShortcut(normalizedTarget)
    ? shouldReplaceShortcutName(normalizedName, normalizedTarget)
    : !normalizedName;

  return {
    ...input,
    name: shouldReplaceName ? fallbackName : normalizedName,
    target: metadata.target,
    note: normalizedNote,
    icon: normalizedIcon ?? metadata.icon ?? null,
  };
};



