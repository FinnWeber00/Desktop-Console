import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_APP_LANGUAGE, SUPPORTED_APP_LANGUAGES } from '../shared/constants/language';
import { getUiMessages } from '../shared/i18n';

const resources = Object.fromEntries(
  SUPPORTED_APP_LANGUAGES.map((language) => {
    const messages = getUiMessages(language);
    const translation = Object.fromEntries(
      Object.entries(messages).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );

    return [language, { translation }];
  }),
);

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: DEFAULT_APP_LANGUAGE,
    fallbackLng: DEFAULT_APP_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
  });
}

export { i18n };
