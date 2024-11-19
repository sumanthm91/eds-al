import { getConfigValue } from './configs.js';
import { getCookie } from './commerce.js';
import { getLoggedInUserAttributes, getPageAttributes, createCategories } from './analytics/google-data-layer.js';
import { store } from './minicart/api.js';

export const EVENT_QUEUE = [];

/**
 * Common XDM payload for all target calls
 * @returns XDM payload for authenticated users, empty object otherwise
 */
export async function xdmPayload() {
  const isAuthenticated = !!getCookie('auth_user_token');
  if (!isAuthenticated) return {};
  const [{ userID = null }, brand = null] = await Promise.all([
    getLoggedInUserAttributes(),
    getConfigValue('brand'),
  ]);
  const xdmObj = {
    identityMap: {
      customerSourceID: [
        {
          authenticatedState: 'authenticated',
          id: `${userID}-MAGENTO_${brand}`,
          primary: true,
        },
      ],
    },
  };
  return xdmObj;
}

/**
 * Common payload for all pages where target call is fired
 * @returns Promise of attributes object
 */
export async function pageLoadData() {
  const [{ brand, countryCode, language }, environment] = await Promise.all([
    getPageAttributes(),
    getConfigValue('target-environment'),
  ]);
  const market = countryCode?.toLowerCase();
  const productsInCart = store
    .getCart()
    ?.cart?.items?.map(
      ({ extension_attributes: attribs = {} }) => `${attribs.parent_product_sku}_${market}`,
    );
  const currentPath = window.location.pathname;
  const cartIds = (currentPath.includes('/cart') || currentPath.includes('/checkout'))
    ? productsInCart?.join(', ') || ''
    : undefined;

  return {
    channel: 'web',
    brand,
    environment,
    market,
    language,
    pageName: document.title, // The page/screen name on which the user is on
    pageType: window.pageType,
    excludedIds: productsInCart?.join(', ') || '', // List of product IDs that are already in the cart
    cartIds,
  };
}

/**
 * Send display event to Target on page load for reporting purpose
 * @param {*} payload Custom scoped Propositions displayed on the page
 */
export async function targetDisplayEvent(payload = [], noDisplayScopes = []) {
  const propositions = payload
    ?.filter(({ renderAttempted, scope, key }) => (
      renderAttempted === false && !noDisplayScopes.includes(scope || key)
    ))
    ?.map(({
      id = '',
      scope = '',
      key = '',
      scopeDetails = {},
    }) => ({
      id,
      scope: scope || key,
      scopeDetails,
    }));
  if (!window.alloy || propositions.length === 0) return;
  const [datasetId, pageAttributes] = await Promise.all([
    getConfigValue('target-display-dataset-id'),
    pageLoadData(),
  ]);
  delete pageAttributes.cartIds;
  window.alloy('sendEvent', {
    xdm: {
      eventType: 'decisioning.propositionDisplay',
      _experience: {
        decisioning: {
          propositions,
          propositionEventType: {
            display: 1,
          },
        },
      },
    },
    data: {
      __adobe: {
        target: pageAttributes,
      },
    },
    edgeConfigOverrides: {
      com_adobe_experience_platform: {
        datasets: {
          event: {
            datasetId,
          },
        },
      },
    },
  });
}

/**
 * Find and return the activity payload attributes from target response meta data
 * @param {*} targetId decision scope
 * @returns activity payload attributes
 */
function getActivityInfo(targetId) {
  const { meta } = EVENT_QUEUE?.find((el) => el.key === targetId)?.data?.[0] || {};
  return {
    activityId: meta?.['activity.id'],
    activityName: meta?.['activity.name'],
    experienceID: meta?.['experience.id'],
    experienceName: meta?.['experience.name'],
  };
}

/**
 * Create payload for recommendations click event
 * @param {*} targetId recommendation target id / decision scope
 * @param {*} recommendationName recommendation name
 * @returns payload object
 */
async function getRecommendationsClickPayload(targetId, recommendationName) {
  if (!recommendationName) return Promise.resolve({});
  return {
    button: 'Recommendation Tile',
    recommendationName,
    ...getActivityInfo(targetId),
  };
}

/**
 * Create payload for personalized banner / popup cta click event
 * @param {*} targetId personalized block target id / decision scope
 * @param {*} personalizationCta cta clicked
 * @returns payload object
 */
async function getPersonalizationCtaPayload(targetId, personalizationCta) {
  if (!personalizationCta) return Promise.resolve({});
  return {
    button: personalizationCta,
    ...getActivityInfo(targetId),
  };
}

/**
 * Send display event to Target on CTA clicks for reporting purpose
 * @param {param.key} key clicked entity / decision scope
 * @param {param.recommendationName} recommendationName Optional.recommendation name
 * @param {param.personalizationCta} personalizationCta Optional.personalization CTA clicked
 */
export async function targetClickTrackingEvent({ key, recommendationName, personalizationCta }) {
  if (!window.alloy || !key) return;
  const [
    recommendationAttribs,
    personalizationAttribs,
    pageAttribs,
    datasetId,
  ] = await Promise.all([
    getRecommendationsClickPayload(key, recommendationName),
    getPersonalizationCtaPayload(key, personalizationCta),
    pageLoadData(),
    getConfigValue('target-display-dataset-id'),
  ]);
  delete pageAttribs.cartIds;
  const data = {
    __adobe: {
      target: {
        clicked: key,
        ...recommendationAttribs,
        ...personalizationAttribs,
        ...pageAttribs,
      },
    },
  };
  window.alloy('sendEvent', {
    xdm: {
      eventType: 'decisioning.propositionDisplay',
      _experience: {
        decisioning: {
          propositions: [
            {
              scope: 'mboxClickTracking',
            },
          ],
          propositionEventType: {
            display: 1,
          },
        },
      },
    },
    renderDecisions: false,
    data,
    edgeConfigOverrides: {
      com_adobe_experience_platform: {
        datasets: {
          event: {
            datasetId,
          },
        },
      },
    },
  });
}

const MALE_LIST = ['men', 'male', 'boys'];
const FEMALE_LIST = ['women', 'female', 'girls'];

/**
 * Auxillary function to check gender of the product
 * based on pre-defined logic from category list
 * @param {*} categoryList Category list of currently viewed product
 * @returns gender - male, female or unisex
 */
function checkGender(categoryList) {
  const hasMaleItem = categoryList.some((item) => MALE_LIST.includes(item.toLowerCase()));
  const hasFemaleItem = categoryList.some((item) => FEMALE_LIST.includes(item.toLowerCase()));
  let gender = 'Unisex';
  if (hasMaleItem && !hasFemaleItem) {
    gender = 'Male';
  } else if (hasFemaleItem && !hasMaleItem) {
    gender = 'Female';
  }
  return gender;
}

/**
 * Utility to find attribute is array of objects and return it's value
 * @param {*} arr Array of attributes object
 * @param {*} attribute Attribute name to find
 * @returns Attribute value
 */
function getValue(arr, attribute) {
  const value = arr.find((el) => el.name === attribute)?.value;
  return Array.isArray(value) ? value.join(', ') : value;
}

/**
 * Method to create data object for PLP page
 * @param {*} categoryList Array of All the current and parent categories
 * @returns plp data object
 */
export async function plpLoadData(categoryList = []) {
  const categoryIdObj = {
    'user.categoryId': categoryList.join(':'),
    'entity.categoryId': categoryList.join(':'),
  };
  const categoryObj = createCategories(categoryList, 'entity');
  const commonPageData = await pageLoadData();
  return { ...commonPageData, ...categoryIdObj, ...categoryObj };
}

/**
 * Method to create data object for PDP page
 * @param {gtm, attributes, options} product Product data from commerce
 * @returns pdp data object
 */
export async function pdpLoadData({
  gtm,
  attributes = [],
  options,
  sku,
}) {
  const categoryList = gtm?.category?.split('/') || [];
  let defaultCategoryList;
  const plpCategoryList = localStorage.getItem('categoryListName');
  if (plpCategoryList?.startsWith('PLP')) {
    defaultCategoryList = plpCategoryList.split('|').slice(1) || [];
  }
  // Category id structure is created from product category list
  // or default category list through navigation (if coming from PLP) based on
  // predefined logic given by target team
  const categoryId = (defaultCategoryList || categoryList)
    ?.filter((item) => item)
    ?.reduce((acc, item) => {
      const prefix = acc.split(', ').pop();
      const newItem = prefix ? `${prefix}:${item}` : item;
      return acc === '' ? newItem : `${acc}, ${newItem}`;
    }, '');

  const size = options
    ?.find((el) => el.id === 'size')
    ?.values?.filter((el) => el.inStock)
    ?.map((el) => el.value)
    ?.join(', ');

  const commonPageData = await pageLoadData();
  const dataObj = {
    'entity.id': `${sku}_${commonPageData.market}`, // This is mandatory field
    'entity.value': gtm?.price?.toString(),
    'user.categoryId': categoryId,
    'entity.categoryId': categoryId,
    'entity.brand': commonPageData.brand,
    'entity.sub_brand': getValue(attributes, 'product_brand'),
    'entity.gender': checkGender(categoryList),
    'entity.market': commonPageData.market,
    'entity.color': getValue(attributes, 'color'),
    'entity.size': size,
    'entity.name': gtm?.name,
    'entity.context': getValue(attributes, 'context'),
    'entity.is_new': Boolean(getValue(attributes, 'is_new'))?.toString(),
    'entity.collection_type': getValue(attributes, 'product_collection'),
    'entity.on_sale': Boolean(getValue(attributes, 'is_sale'))?.toString(),
    'entity.concept': getValue(attributes, 'concept'),
    'entity.age_group': getValue(attributes, 'age_group'),
    'entity.color_family': getValue(attributes, 'color_family'),
    'entity.departmentId': categoryList.join(' | '),
  };
  const categoryObj = createCategories(categoryList, 'entity');
  return { ...commonPageData, ...dataObj, ...categoryObj };
}

export async function targetOrderConfirmationLoadData({ purchaseId, totalPrice, products = [] }) {
  const commonPageData = await pageLoadData();
  const data = {
    ...commonPageData,
    'orderConfirmationMbox.order.purchaseID': purchaseId,
    'orderConfirmationMbox.order.priceTotal': totalPrice,
    'orderConfirmationMbox.order.purchases.value': 1, // Only this should be always 1
    'orderConfirmationMbox.productListItems': products.map(({ sku }) => sku),
  };
  const xdm = {
    commerce: {
      order: {
        purchaseID: purchaseId,
        priceTotal: totalPrice,
      },
      purchases: {
        value: 1, // Only this should be always 1
      },
    },
    productListItems: products.map(({ sku }) => ({ SKU: sku })),
  };
  return {
    data, xdm,
  };
}
