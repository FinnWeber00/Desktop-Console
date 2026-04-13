const DEFAULT_GLOBAL_HOTKEY = 'CommandOrControl+Alt+Space';

const MODIFIER_ALIASES = new Map<string, string>([
  ['ALT', 'Alt'],
  ['OPTION', 'Alt'],
  ['CTRL', 'CommandOrControl'],
  ['CONTROL', 'CommandOrControl'],
  ['COMMANDORCONTROL', 'CommandOrControl'],
  ['CMDORCTRL', 'CommandOrControl'],
  ['COMMAND', 'Command'],
  ['CMD', 'Command'],
  ['SHIFT', 'Shift'],
  ['SUPER', 'Super'],
  ['WIN', 'Super'],
  ['WINDOWS', 'Super'],
  ['META', 'Super'],
]);

const SPECIAL_KEYS = new Map<string, string>([
  ['SPACE', 'Space'],
  ['TAB', 'Tab'],
  ['ENTER', 'Enter'],
  ['RETURN', 'Enter'],
  ['ESC', 'Esc'],
  ['ESCAPE', 'Esc'],
  ['BACKSPACE', 'Backspace'],
  ['DELETE', 'Delete'],
  ['DEL', 'Delete'],
  ['INSERT', 'Insert'],
  ['HOME', 'Home'],
  ['END', 'End'],
  ['PAGEUP', 'PageUp'],
  ['PAGEDOWN', 'PageDown'],
  ['UP', 'Up'],
  ['DOWN', 'Down'],
  ['LEFT', 'Left'],
  ['RIGHT', 'Right'],
]);

const BLOCKED_ACCELERATORS = new Map<string, string>([
  ['Alt+Space', 'Alt+Space 在 Windows 上通常会被系统窗口菜单占用，请换一个组合'],
]);

const normalizePrimaryKey = (token: string): string | null => {
  const normalized = token.replace(/\s+/g, '').toUpperCase();
  if (/^[A-Z0-9]$/.test(normalized)) {
    return normalized;
  }

  if (/^F([1-9]|1\d|2[0-4])$/.test(normalized)) {
    return normalized;
  }

  return SPECIAL_KEYS.get(normalized) ?? null;
};

export const normalizeHotkeyInput = (
  value?: string | null,
): { accelerator: string | null; error?: string } => {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return { accelerator: null };
  }

  const tokens = trimmed
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length < 2) {
    return { accelerator: null, error: '全局快捷键至少需要一个修饰键和一个主按键' };
  }

  const modifiers: string[] = [];
  let key: string | null = null;

  for (const token of tokens) {
    const modifier = MODIFIER_ALIASES.get(token.replace(/\s+/g, '').toUpperCase());
    if (modifier) {
      if (modifiers.includes(modifier)) {
        return { accelerator: null, error: '全局快捷键里有重复的修饰键，请检查后重试' };
      }
      modifiers.push(modifier);
      continue;
    }

    const normalizedKey = normalizePrimaryKey(token);
    if (!normalizedKey) {
      return { accelerator: null, error: `无法识别的快捷键按键：${token}` };
    }
    if (key) {
      return { accelerator: null, error: '全局快捷键只能包含一个主按键' };
    }
    key = normalizedKey;
  }

  if (!key || modifiers.length === 0) {
    return { accelerator: null, error: '全局快捷键至少需要一个修饰键和一个主按键' };
  }

  const accelerator = [...modifiers, key].join('+');
  const blockedReason = BLOCKED_ACCELERATORS.get(accelerator);
  if (blockedReason) {
    return { accelerator: null, error: blockedReason };
  }

  return { accelerator };
};

export { DEFAULT_GLOBAL_HOTKEY };
