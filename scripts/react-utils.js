/**
 * @param {String} prefix The URL prefix for the placeholder file
 * @returns {Object} Drupal placeholder object
 */
async function fetchDrupalPlaceholders(prefix = 'default') {
  window.drupalPlaceholders = window.drupalPlaceholders || {};
  if (!window.drupalPlaceholders[prefix]) {
    window.drupalPlaceholders[prefix] = new Promise((resolve) => {
      fetch(`${prefix === 'default' ? '' : prefix}/placeholders-drupal.json`)
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
              placeholders[placeholder.Key] = placeholder.Text;
            });
          window.drupalPlaceholders[prefix] = placeholders;
          resolve(window.drupalPlaceholders[prefix]);
        })
        .catch(() => {
          // error loading placeholders
          window.drupalPlaceholders[prefix] = {};
          resolve(window.drupalPlaceholders[prefix]);
        });
    });
  }
  return window.drupalPlaceholders[`${prefix}`];
}

/**
 * Fetches the Drupal related placeholders based on the language
 * @returns {Function} Function to return the placeholder by key
 */
async function fetchLocaleDrupalPlaceholders() {
  const langCode = document.documentElement.lang;
  let placeholders = null;
  if (!langCode) {
    placeholders = await fetchDrupalPlaceholders();
  } else {
    placeholders = await fetchDrupalPlaceholders(`/${langCode.toLowerCase()}`);
  }

  return function (key) {
    return placeholders[key] ?? '';
  };
}

export default fetchLocaleDrupalPlaceholders;
