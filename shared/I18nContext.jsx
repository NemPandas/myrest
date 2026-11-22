import React, { createContext, useContext } from 'react';
import { getLocale, t } from './i18n.js';
const LocaleContext = createContext(null);
export function LocaleProvider({ language, children }) {
  return <LocaleContext.Provider value={language}>{children}</LocaleContext.Provider>;
}
export const useLocale = () => useContext(LocaleContext) || getLocale();
export function useTranslation() {
  const language = useLocale();
  return value => t(value, language);
}
