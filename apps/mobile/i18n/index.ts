import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import ca from './locales/ca.json';
import es from './locales/es.json';
import en from './locales/en.json';
import fr from './locales/fr.json';

const deviceLang = getLocales()[0]?.languageCode || 'ca';
const supportedLangs = ['ca', 'es', 'en', 'fr'];
const fallbackLng = supportedLangs.includes(deviceLang) ? deviceLang : 'ca';

i18n.use(initReactI18next).init({
  resources: {
    ca: { translation: ca },
    es: { translation: es },
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: fallbackLng,
  fallbackLng: 'ca',
  interpolation: { escapeValue: false },
});

export default i18n;
