import de from './locales/de.json';

// Hungarian source strings are the default dictionary. Locale is fixed per page load;
// prerendering sets it before each synchronous render. Admin previews default to hu.
let locale = 'hu';
export const getLocale = () => locale;
export function setLocale(value) { locale = value === 'de' ? 'de' : 'hu'; }
export function t(value) {
  if (locale !== 'de' || typeof value !== 'string') return value;
  if (Object.hasOwn(de, value)) return de[value];
  const key = value.trim();
  return Object.hasOwn(de, key) ? value.replace(key, de[key]) : value;
}
export function languagePath(path, language = locale) {
  return '/' + language + (path.startsWith('/') ? path : '/' + path);
}
