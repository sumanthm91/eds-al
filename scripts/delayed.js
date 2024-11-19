// eslint-disable-next-line import/no-cycle
import { getMetadata, sampleRUM } from './aem.js';
import { getConfigValue } from './configs.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

/**
 * Check if the current environment is a mobile app by checking the cookie existence
 * @returns {boolean} true if the current environment is a mobile app
 */
function isMobileApp() {
  return document.cookie.includes('app-view=true');
}

// add more delayed functionality here

// Load Commerce events SDK and collector
const config = {
  environmentId: await getConfigValue('commerce-environment-id'),
  environment: await getConfigValue('commerce-environment'),
  storeUrl: await getConfigValue('commerce-store-url'),
  websiteId: await getConfigValue('commerce-website-id'),
  websiteCode: await getConfigValue('commerce-website-code'),
  storeId: await getConfigValue('commerce-store-id'),
  storeCode: await getConfigValue('commerce-store-code'),
  storeViewId: await getConfigValue('commerce-store-view-id'),
  storeViewCode: await getConfigValue('commerce-store-view-code'),
  websiteName: await getConfigValue('commerce-website-name'),
  storeName: await getConfigValue('commerce-store-name'),
  storeViewName: await getConfigValue('commerce-store-view-name'),
  baseCurrencyCode: await getConfigValue('commerce-base-currency-code'),
  storeViewCurrencyCode: await getConfigValue('commerce-base-currency-code'),
  storefrontTemplate: 'Franklin',
  enableGlobalLiveChat: await getConfigValue('enable-global-livechat'),
};

window.adobeDataLayer.push(
  { storefrontInstanceContext: config },
  { eventForwardingContext: { commerce: true, aep: false } },
);

// Load events SDK
import('./commerce-events-sdk.js');

window.dispatchEvent(new Event('delayed-loaded'));

function loadDeviceFingerprint() {
  window.IGLOO = window.IGLOO || {
    bbout_element_id: 'ioBlackBox',
    enable_rip: true,
    enable_flash: false,
    install_flash: false,
    loader: {
      version: 'general5',
      fp_static: false,
    },
  };

  window.IGLOO.bb_callback = (blackBoxString, isComplete) => {
    if (isComplete) {
      window.IGLOO.blackBoxString = blackBoxString;
    }
  };

  import('./third-party/iovation-loader.js');
}

if (!isMobileApp()) {
  // Load LiveChat

  const loadLiveChat = getMetadata('no-livechat') !== 'true';
  const enableGlobalLiveChat = config.enableGlobalLiveChat === 'true';
  if (enableGlobalLiveChat && loadLiveChat) {
    window.setTimeout(() => import('./livechat.js'), 1000);
  }

  loadDeviceFingerprint();
}
