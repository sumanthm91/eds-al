import { toCamelCase } from '../../scripts/aem.js';
/**
 * Gets placeholders object.
 * @param {string} [prefix] Location of placeholders
 * @param {string} [query] filter placeholder by sheet using query sheet=${sheetName}
 * @returns {object} Window placeholders object
 */
async function fetchPlaceholdersForLocale(prefix = 'default', query = '') {
  window.placeholders = window.placeholders || {};
  const cacheKey = prefix + query;
  if (!window.placeholders[cacheKey]) {
    window.placeholders[cacheKey] = new Promise((resolve) => {
      fetch(
        `${prefix === 'default' ? '' : prefix}/placeholders-cart.json`,
      )
        .then((resp) => {
          if (resp.ok) {
            return resp.json();
          }
          return {};
        })
        .then((json) => {
          const placeholders = {};
          json.data
            .filter((placeholder) => placeholder.Key)
            .forEach((placeholder) => {
              placeholders[toCamelCase(placeholder.Key)] = placeholder.Text;
            });
          window.placeholders[cacheKey] = placeholders;
          resolve(window.placeholders[cacheKey]);
        })
        .catch(() => {
          // error loading placeholders
          window.placeholders[cacheKey] = {};
          resolve(window.placeholders[cacheKey]);
        });
    });
  }
  return window.placeholders[cacheKey];
}

export default fetchPlaceholdersForLocale;
