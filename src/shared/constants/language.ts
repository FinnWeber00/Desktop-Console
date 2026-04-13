export const SUPPORTED_APP_LANGUAGES = [
  'zh-CN',
  'en-US',
  'de-DE',
  'ru-RU',
  'fr-FR',
  'es-ES',
  'pt-BR',
  'it-IT',
  'tr-TR',
  'pl-PL',
  'nl-NL',
  'ar',
  'ja-JP',
] as const;

export type SupportedAppLanguage = (typeof SUPPORTED_APP_LANGUAGES)[number];

export const DEFAULT_APP_LANGUAGE: SupportedAppLanguage = 'zh-CN';

export const isSupportedAppLanguage = (value?: string | null): value is SupportedAppLanguage =>
  SUPPORTED_APP_LANGUAGES.includes(value as SupportedAppLanguage);

export const normalizeAppLanguage = (value?: string | null): SupportedAppLanguage =>
  isSupportedAppLanguage(value) ? value : DEFAULT_APP_LANGUAGE;
