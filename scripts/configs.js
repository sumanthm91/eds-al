export const PROD_ENV = 'prod';
export const STAGE_ENV = 'stage';
export const DEV_ENV = 'dev';
const ALLOWED_CONFIGS = [PROD_ENV, STAGE_ENV, DEV_ENV];

// store configs globally to avoid multiple requests
window.configsPromises = {};

/*
 * Returns the true origin of the current page in the browser.
 * If the page is running in a iframe with srcdoc, the ancestor origin is returned.
 * @returns {String} The true origin
 */
function getOrigin() {
  const { location } = window;
  return location.href === 'about:srcdoc' ? window.parent.location.origin : location.origin;
}

export function getLanguageAttr() {
  return document.documentElement.lang || 'en';
}
/**
 * This function calculates the environment in which the site is running based on the URL.
 * It defaults to 'prod'. In non 'prod' environments, the value can be overwritten using
 * the 'environment' key in sessionStorage.
 *
 * @returns {string} - environment identifier (dev, stage or prod'.
 */
export const calcEnvironment = () => {
  const { href } = window.location;
  let environment = 'prod';
  if (href.includes('.hlx.page') || href.includes('.aem.page')) {
    environment = 'stage';
  }
  if (href.includes('localhost')) {
    environment = 'dev';
  }
  if (href.includes('eds.factory.alshayauat.com')) {
    environment = 'preview';
  }

  const environmentFromConfig = window.sessionStorage.getItem('environment');
  if (environmentFromConfig && ALLOWED_CONFIGS.includes(environmentFromConfig) && environment !== 'prod') {
    return environmentFromConfig;
  }

  return environment;
};

function buildConfigURL(locale) {
  const origin = getOrigin();
  const localePath = locale ? `${locale}/` : '';
  const configURL = new URL(`${origin}/${localePath}configs.json?sheet=prod`);
  return configURL;
}

const getConfig = async () => {
  const language = getLanguageAttr();
  let configJSON = window.sessionStorage.getItem('config');
  let configLocaleJSON = window.sessionStorage.getItem(`config:${language}`);

  if (!configJSON || !configLocaleJSON) {
    const fetchGlobalConfig = fetch(buildConfigURL());
    const fetchLocalConfig = fetch(buildConfigURL(language));
    try {
      const responses = await Promise.all([fetchGlobalConfig, fetchLocalConfig]);

      // Extract JSON data from responses
      [configJSON, configLocaleJSON] = await Promise.all(responses
        .map((response) => response.text()));

      window.sessionStorage.setItem('config', configJSON);
      window.sessionStorage.setItem(`config:${language}`, configLocaleJSON);
    } catch (e) {
      console.error('no config loaded', e);
    }
  }

  // merge config and locale config
  const config = JSON.parse(configJSON);

  if (configLocaleJSON) {
    const configLocale = JSON.parse(configLocaleJSON);
    configLocale.data.forEach((localeConfig) => {
      const existing = config.data.find((c) => c.key === localeConfig.key);
      if (existing) {
        existing.value = localeConfig.value;
      } else {
        config.data.push(localeConfig);
      }
    });
  }

  return config;
};

/**
 * This function retrieves a configuration value for a given environment.
 *
 * @param {string} configParam - The configuration parameter to retrieve.
 * @returns {Promise<string|undefined>} - The value of the configuration parameter, or undefined.
 */
export const getConfigValue = async (configParam) => {
  const env = 'prod';
  if (!window.configsPromises?.[env]) {
    window.configsPromises[env] = getConfig(env);
  }

  const configJSON = await window.configsPromises[env];
  const configElements = configJSON.data;
  return configElements.find((c) => c.key === configParam)?.value;
};
