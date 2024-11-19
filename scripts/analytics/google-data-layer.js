import { getConfigValue, calcEnvironment } from '../configs.js';
import { getCookie } from '../commerce.js';
import { store } from '../minicart/api.js';
import { loadScript } from '../aem.js';
/**
 * Loads Google Tag Manager container by ID.
 */
export async function loadGTMContainer(containerId) {
  window.dataLayer ||= [];
  window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
  return loadScript(`https://www.googletagmanager.com/gtm.js?id=${containerId}`, { async: true });
}

/**
 * Listens for changes in the Adobe dataLayer and pushes the changes to the Google dataLayer.
 */
export function connectWithAcdl() {
  window.dataLayer = window.dataLayer || [];
  const googleDataLayer = window.dataLayer;
  window.adobeDataLayer.push((dl) => {
    dl.addEventListener('adobeDataLayer:change', (payload) => {
      googleDataLayer.push(payload);
    });
  });
}

/**
 * Loads Google Tag Manager container by the ID
 * retrieved from configs.xlsx, per current environment.
 */
export async function loadGTM(isMobileApp) {
  if (calcEnvironment() !== 'prod' || isMobileApp) {
    return;
  }
  const containerId = await getConfigValue('gtm-container-id');
  await loadGTMContainer(containerId);
}

/**
 * Generic method to send attributes to data layer
 */
export function sendAttributesToDataLayer(attributes) {
  window.dataLayer?.push(attributes);
}

/* Common Page Level DL Events */

export async function getPageAttributes() {
  const platformType = window.matchMedia('(min-width: 768px)').matches ? 'desktop' : 'mobile';
  const language = document.documentElement.lang || 'en';
  const [country = null, currency = null, brand = null, countryCode = null] = await Promise.all([
    getConfigValue('country'),
    getConfigValue('currency'),
    getConfigValue('brand'),
    getConfigValue('country-code'),
  ]);
  return {
    language,
    country,
    currency,
    platformType,
    brand,
    countryCode,
  };
}

export async function sendPageAttributes() {
  const {
    language,
    country,
    currency,
    platformType,
  } = await getPageAttributes();

  sendAttributesToDataLayer({
    pageType: window.pageType,
    language,
    country,
    currency,
    platformType,
  });
}

export function sendCartId() {
  const cartId = store.getCartId();
  if (cartId) {
    sendAttributesToDataLayer({ cartId, timestamp: Date.now() });
  }
}

export async function getLoggedInUserAttributes() {
  // eslint-disable-next-line  max-len
  const [{ getCustomer }, { getAPCTierProgressData }, { getCustomerLastOrder }] = await Promise.all([
    import('../customer/api.js'),
    import('../hellomember/api.js'),
    import('../customer/api.js'),
  ]);
  const orderData = await getCustomerLastOrder();
  const {
    email,
    id,
    firstname,
    lastname,
    custom_attributes: customAttribs,
  } = await getCustomer(true) ?? {};
  const { extension_attributes: extensionAttribs } = await getAPCTierProgressData(true) ?? {};
  const telephone = customAttribs?.find(({ attribute_code: attribCode }) => attribCode
    === 'phone_number')?.value;
  return {
    userID: id?.toString(),
    userEmailID: email,
    userPhone: telephone || null,
    customerType: orderData ? 'Repeat Customer' : 'New Customer',
    userName: `${firstname} ${lastname}` || null,
    userType: 'Logged in User',
    privilegeCustomer: 'Regular Customer', // Hardcoded as per requirement
    hello_member_tier: extensionAttribs?.current_tier_en || 'guest',
  };
}

export function getGuestUserAttributes() {
  return {
    userID: null,
    userEmailID: '',
    userPhone: '',
    customerType: 'New Customer',
    userName: '',
    userType: 'Guest User',
    privilegeCustomer: 'Regular Customer',
    hello_member_tier: 'guest',
  };
}

export async function sendUserAttributes() {
  const isAuthenticated = !!getCookie('auth_user_token');
  const userAttribs = isAuthenticated
    ? await getLoggedInUserAttributes()
    : getGuestUserAttributes();
  if (userAttribs) {
    sendAttributesToDataLayer(userAttribs);
  }
}

export async function datalayerViewBannerEvent(ctaList, bannerId, campaignName) {
  const ctaPositionsList = Object.keys(ctaList)?.map((index) => parseInt(index, 10) + 1);
  const dlObject = {
    event: 'view_promotion',
    ecommerce: {
      creative_name: ctaList?.join('|'),
      creative_slot: ctaPositionsList?.join('|'),
      promotion_id: bannerId ?? null, // Unique banner ID
      promotion_name: campaignName, // this represents name of the campaign
    },
  };
  sendAttributesToDataLayer(dlObject);
}

export function buildCategoryList(categoryData) {
  const categoryListName = [];
  if (categoryData?.total_count) {
    Object.entries(
      categoryData?.[0]?.breadcrumbs || [],
    ).forEach(([, cat]) => {
      categoryListName.push(cat?.category_gtm_name);
    });
    categoryListName.push(categoryData?.items[0]?.gtm_name);
  }
  return categoryListName;
}

/**
* Auxillary function to create listed category object from category list
* @param {*} categoryList Array of All the current and parent categories
* @param {*} entity Entity
* @returns listed category object
*/
export function createCategories(categoryList, entity) {
  const key = entity ? `${entity}.` : '';
  return {
    [`${key}majorCategory`]: categoryList?.[0] || null,
    [`${key}minorCategory`]: categoryList?.[1] || null,
    [`${key}subCategory`]: categoryList?.[2] || null,
    [`${key === 'entity' ? `${key}listingCategory` : `${key}listingName`}`]: categoryList
      ?.[categoryList.length - 1] || null,
  };
}

/**
* Function to send category object to DL
* @param {*} categories categories object
*/
export function sendCategoriesToDataLayer(categories, isDeptPage = false) {
  const categoriesObj = createCategories(categories);
  if (isDeptPage) {
    categoriesObj.departmentName = categoriesObj.listingName;
  }
  sendAttributesToDataLayer(categoriesObj);
}

export async function datalayerSelectBannerEvent(ctaName, ctaPosition, bannerId, campaignName) {
  const dlObject = {
    event: 'select_promotion',
    ecommerce: {
      creative_name: ctaName || null,
      creative_slot: ctaPosition,
      promotion_id: bannerId ?? null, // Unique banner ID
      promotion_name: campaignName, // this represents name of the campaign
    },
  };
  sendAttributesToDataLayer(dlObject);
  localStorage.setItem('bannerData', JSON.stringify(dlObject.ecommerce));
  localStorage.setItem('categoryListName', `bn_promo_${campaignName
    .toLowerCase()?.replace(/\s+/g, '')}`);
  localStorage.removeItem('categoryListId');
}

/**
 * Method to send attributes to data layer on page load
 */
export async function sendPageLoadAttributes() {
  await Promise.all([sendPageAttributes(), sendUserAttributes()]);
  sendCartId();
}

/* PLP Events */
function transformBannerData() {
  const categoryListName = localStorage.getItem('categoryListName');
  const bannerData = JSON.parse(localStorage.getItem('bannerData'));
  if (!categoryListName?.startsWith('bn_promo_') || !bannerData) {
    return {};
  }
  const {
    creative_name: creativeName = null,
    creative_slot: creativeSlot = null,
    promotion_id: promotionId = null,
    promotion_name: promotionName = null,
  } = bannerData;
  return {
    creative_name: creativeName,
    creative_slot: creativeSlot,
    promotion_id: promotionId,
    promotion_name: promotionName,
  };
}
/**
 * Transform Algolia PLP item data
 * @param {*} productData products data array
 * @param {*} quantity quantity
 * @returns trasnformed data for datalayer
 */

let productPosition = 0;
function transformProductItemData(
  productData,
  quantity,
  withoutBannerData = false,
  viewItemList = true,
  selectedIndexVal = 0,
) {
  const lang = document.documentElement.lang || 'en';
  return productData?.map(({ gtm, ...product }) => {
    const itemCategories = gtm?.['gtm-category']?.split('/') || [];
    const altBrand = typeof product.attr_product_brand === 'object'
      ? product.attr_product_brand?.en
      : product.attr_product_brand;
    productPosition += 1;
    const itemBrand = gtm?.['gtm-brand'] || altBrand || null;
    let itemVariant;
    if (viewItemList) {
      itemVariant = gtm?.['gtm-variant'] || product?.swatches?.[lang]?.find((item) => item.child_sku_code)?.child_sku_code;
    }

    // assign product color
    let gtmItemColor = null;

    if (Array.isArray(product?.attr_color)) {
      gtmItemColor = product?.attr_color[0];
    } else if (Array.isArray(product?.attr_color?.en)) {
      gtmItemColor = product?.attr_color.en[0];
    } else if (gtm?.['gtm-item-color']) {
      gtmItemColor = gtm['gtm-item-color'];
    }

    const itemData = {
      item_id: gtm?.['gtm-main-sku'] || null,
      item_name: gtm?.['gtm-name'] || null,
      affiliation: 'Online Store', // Static value
      coupon: null,
      discount: Number(product?.discount?.en) || null,
      item_brand: itemBrand,
      item_category: gtm?.['gtm-category'] || null,
      item_category2: itemCategories[0] || null,
      item_category3: itemCategories[1] || null,
      item_category4: itemCategories[2] || null,
      item_category5: itemCategories[3] || null,
      item_list_id: localStorage.getItem('categoryListId') || null,
      item_list_name: localStorage.getItem('categoryListName') || null,
      item_variant: itemVariant || null,
      in_stock: gtm?.['gtm-stock'] === 'in stock',
      price: Number(gtm?.['gtm-price']) || null,
      quantity: Number(product?.quantity || quantity),
      index: +selectedIndexVal || productPosition,
      returnEligibility: null,
      item_color: gtmItemColor,
      item_size: gtm?.['gtm-item-size'],
    };
    if (withoutBannerData) {
      return itemData;
    }
    return { ...itemData, ...transformBannerData() };
  });
}

export function datalayerViewItemListEvent(productData) {
  const dlObject = {
    event: 'view_item_list',
    eventLabel: `${productData?.length || 0} items`,
    ecommerce: {
      item_list_id: localStorage.getItem('categoryListId') || null,
      item_list_name: localStorage.getItem('categoryListName') || null,
      items: transformProductItemData(productData, 1, false, false),
    },
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export const dataLayerCustomerExistCheckoutErrors = async () => {
  const dlObject = {
    event: 'Customer exist warning on Checkout page',
    eventCategory: 'Customer exist warning on Checkout page',
  };
  sendAttributesToDataLayer(dlObject);
};
export const dataLayerCheckoutErrors = async ({ action, label }) => {
  const dlObject = {
    event: 'eventTracker',
    eventCategory: 'checkout errors', // or 'Login Success' //depending on user action
    eventAction: action,
    eventLabel: label, // provide more details about the error, so business can identify the issue
  };
  sendAttributesToDataLayer(dlObject);
};
export const datalayerAddShippingInfo = async ({
  productData, value, currency, coupon, shippingTier, discount,
}) => {
  const isAuthenticated = !!getCookie('auth_user_token');
  const dlObject = {
    event: 'add_shipping_info',
    ecommerce: {
      ...transformBannerData(),
      value,
      currency,
      coupon,
      discount,
      login_method: isAuthenticated ? 'Logged In' : 'Guest Login',
      shipping_tier: shippingTier,
      items: transformProductItemData(productData, 1, true),
    },
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
};

export const dataLayerDeliveryOption = async ({ deliverySelected }) => {
  const dlObject = {
    event: 'deliveryOption',
    eventLabel: deliverySelected,
  };
  sendAttributesToDataLayer(dlObject);
};
export const dataLayerPlaceOrderButtonClick = async () => {
  const dlObject = {
    event: 'placeOrderButtonClick',
    eventCategory: 'Payment Page',
    eventAction: 'Button Click',
    eventLabel: 'Place Order',
  };
  sendAttributesToDataLayer(dlObject);
};

export const dataLayerSaveAddressEvent = async ({ isValid, category, addressType }) => {
  const dlObject = {
    event: 'saveAddressOnCheckoutPage',
    eventCategory: category === 'update' ? 'Save Address on Checkout page' : 'Click on Add Address on Checkout page',
    eventAction: addressType,
    eventLabel: isValid === 1 ? 'valid' : 'invalid',
  };
  sendAttributesToDataLayer(dlObject);
};
export const datalayerBeginCheckoutEvent = ({
  productData, value, currency, coupon,
}) => {
  const dlObject = {
    event: 'begin_checkout',
    ecommerce: {
      ...transformBannerData(),
      value,
      currency,
      coupon,
      items: transformProductItemData(productData, 1, true),
    },
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
};

export function datalayerViewCartEvent({
  productData, value, currency, coupon,
}) {
  const dlObject = {
    event: 'view_cart',
    ecommerce: {
      ...transformBannerData(),
      value,
      currency,
      coupon,
      items: transformProductItemData(productData, 1, true),
    },
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export function datalayerSelectItemListEvent(productData, totalItems, selectedIndexVal) {
  const dlObject = {
    event: 'select_item',
    eventLabel: `${totalItems} items`, // total number of items displayed on the listing page
    ecommerce: {
      item_list_id: localStorage.getItem('categoryListId') || null,
      item_list_name: localStorage.getItem('categoryListName') || null,
      items: transformProductItemData([productData], 1, false, true, selectedIndexVal),
    },
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export function datalayerFilterEvent(filterType, filterValue, currentCategory) {
  const dlObject = {
    event: 'filter',
    siteSection: currentCategory,
    filterType,
    filterValue,
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerColorSwatchEvent(datalayerPageType, colorName = null) {
  const dlObject = {
    event: 'ecommerce',
    eventCategory: 'color click',
    eventAction: `${datalayerPageType} color click`,
    eventLabel: colorName,
    product_view_type: `${datalayerPageType}`,
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerImageSwipeEvent(direction, datalayerPageType) {
  const dlObject = {
    event: `${datalayerPageType}_imageswipe`,
    eventLabel: `${direction}_swipe`, // or 'right_swipe'
  };
  sendAttributesToDataLayer(dlObject);
}

export function dataLayerGridSelectionEvent(isSmallGridSelected, datalayerPageType) {
  const dlObject = {
    event: 'ecommerce',
    eventCategory: 'ecommerce',
    eventAction: `${datalayerPageType} clicks`,
    eventLabel: `${datalayerPageType} layout - ${isSmallGridSelected ? 'small' : 'large'} grid`,
  };
  sendAttributesToDataLayer(dlObject);
}

export function dataLayerLoadMoreSelectionEvent(currentProductCount, totalProductCount, pageType) {
  const dlObject = {
    event: 'ecommerce',
    eventCategory: 'ecommerce',
    eventAction: `${pageType} clicks`,
    eventLabel: 'load more products',
    eventLabel2: `showing ${currentProductCount} of ${totalProductCount} items`,
  };
  sendAttributesToDataLayer(dlObject);
}

export function dataLayerInternalSearchSuccessEvent(currentProductCount, searchedTerm) {
  const dlObject = {
    event: 'eventTracker',
    eventCategory: 'Internal Site Search',
    eventAction: 'Successful Search',
    eventLabel: `${searchedTerm}`,
    eventValue: `${currentProductCount}`,
  };
  sendAttributesToDataLayer(dlObject);
}

export function dataLayerInternalSearchEmptyEvent(searchedTerm) {
  const dlObject = {
    event: 'eventTracker',
    eventCategory: 'Internal Site Search',
    eventAction: '404 Results',
    eventLabel: `${searchedTerm}`,
    eventValue: 0,
    nonInteraction: 0,
  };
  sendAttributesToDataLayer(dlObject);
}

export function dataLayerCartErrorsEvent({
  eventLabel, eventAction, eventPlace, couponCode,
}) {
  const dlObject = {
    event: 'eventTracker',
    eventCategory: 'cart errors',
    eventLabel: eventLabel || '',
    eventAction: eventAction || '',
    eventPlace: eventPlace || '',
    couponCode: couponCode || '',
    'gtm.uniqueEventId': 512,
  };
  sendAttributesToDataLayer(dlObject);
}

export function dataLayerPromoCodeEvent({
  couponCode, couponStatus,
}) {
  const dlObject = {
    event: 'promoCode',
    couponCode: couponCode || '',
    couponStatus: couponStatus || '',
    'gtm.uniqueEventId': 446,
  };
  sendAttributesToDataLayer(dlObject);
}

export function dataLayerTrendingSearchEvent(inputSearchTerm, inputSearchTermIndex) {
  const dlObject = {
    event: 'Trending Search',
    eventCategory: 'Trending Search',
    eventAction: 'Trending Search Click',
    eventLabel: `${inputSearchTerm}`,
    eventValue: `${inputSearchTermIndex}`,
    nonInteraction: 0,
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerColorSwatchChevron(chevronClick, title, itemID) {
  const dlObject = {
    event: 'swatches',
    eventCategory: 'swatches_interaction',
    eventAction: 'swatches_colorChevronClick',
    eventLabel: `${chevronClick}_${title}_${itemID}`,
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerSizeGuide() {
  const dlObject = {
    event: 'sizeguide',
    eventCategory: 'sizeGuide',
    eventAction: 'open',
    eventLabel: 'pdp',
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerSearchStore(storeName) {
  const dlObject = {
    event: 'ecommerce',
    eventCategory: 'ecommerce',
    eventAction: 'pdp search stores',
    eventLabel: `${storeName}`,
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerSearchStoreFinder(searchedTerm) {
  const dlObject = {
    event: 'findStore',
    siteSection: 'store-finder',
    fsKeyword: `${searchedTerm}`,
    fsNoOfResult: 0,
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerBNPLPDP(viewtype, paymentOptions) {
  const dlObject = {
    event: 'bnpl_option',
    eventCategory: 'bnpl_option',
    eventAction: `${viewtype}`,
    eventLabel: paymentOptions.join(' | '),
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerCartError(errorMessage, cartId = null) {
  const dlObject = {
    event: 'eventTracker',
    eventCategory: 'cart error',
    eventAction: `${errorMessage}`,
    eventLabel: `${errorMessage}`,
    cart_id: `${cartId}`,
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerLogin(eventAction, loginType) {
  const loginTypeMap = {
    google: 'Google',
    facebook: 'Facebook',
  };

  const eventLabel = loginTypeMap[loginType] || loginType;
  const dlObject = {
    event: 'eventTracker',
    eventCategory: 'User Login & Register',
    eventAction: `${eventAction}`,
    eventLabel: `${eventLabel}`,
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerSortingEvent(sortingOption, siteSection = null) {
  const dlObject = {
    event: 'sort',
    siteSection,
    filterType: 'Sort By',
    filterValue: sortingOption,
  };
  sendAttributesToDataLayer(dlObject);
}

function findLanguage(language) {
  const languageMap = {
    en: 'English',
    ar: 'Arabic',
  };

  return languageMap[language] || language;
}

export function datalayerLanguageSwitchEvent(position, language) {
  const dlObject = {
    event: 'Language Switch',
    eventCategory: 'Language Switch',
    eventAction: `${position} : Language Switch Click`,
    eventLabel: findLanguage(language) || null,
  };
  sendAttributesToDataLayer(dlObject);
}

// to clear Category List information from localstorage
export function clearCategoryListCache() {
  localStorage.removeItem('categoryListName');
  localStorage.removeItem('categoryListId');
  localStorage.removeItem('bannerData');
}

export function datalayerHeaderNavigationEvent(
  level,
  ...navigationItems
) {
  const eventLabelItems = navigationItems?.join(' > ');
  const dlObject = {
    event: `${level} Navigation`,
    eventLabel: `Header : ${eventLabelItems}`,
  };
  sendAttributesToDataLayer(dlObject);
  clearCategoryListCache();
}

export function datalayerFooterNavigationEvent(navItem, navHeading, linkName) {
  sendAttributesToDataLayer({
    event: `L${navItem.getAttribute('level') || '2'} Navigation`,
    eventLabel: `Footer: ${navHeading} > ${linkName}`,
  });
  clearCategoryListCache();
}

export function datalayerMobileHamburgerEvent(state) {
  const dlObject = {
    event: 'Mobile Hamburger',
    eventCategory: 'Mobile Hamburger',
    eventAction: 'Hamburger Menu Click',
    eventLabel: `${state}`,
  };
  sendAttributesToDataLayer(dlObject);
}

/* PDP */
/**
 * Transform Commerce PDP item data
 * @param {*} productData product data
 * @param {*} bannerData banner related data if applicable
 * @returns trasnformed data for datalayer
 */
function transformPdpProductData(productData, quantity, selectedSize, withoutBannerData) {
  const { gtm, ...product } = productData;
  const itemCategories = gtm?.category?.split('/') || [];
  const itemReturnable = product?.attributes?.find((el) => el.name === 'is_returnable')?.value === '1' ? 'yes' : 'no';
  const itemBrand = product?.attributes?.find((el) => el.name === 'product_brand')?.value;
  const colorLabel = product?.variants?.variants?.[0]?.product?.attributes?.find((attr) => attr.name === 'color_label')?.value;
  const selectedSizeTitle = document.querySelector('.pdp-swatches__field__label--selection')?.textContent;
  let variantSize;
  if (selectedSize) {
    variantSize = selectedSize;
  } else {
    variantSize = product?.options?.[0]?.values.find((item) => item.inStock === true)?.id;
  }
  const selectsku = product?.variants?.variants
    .filter((variant) => variant.selections.some((option) => option === variantSize));
  const itemVariant = selectsku?.[0]?.product?.sku;
  const itemData = {
    item_id: gtm?.id,
    item_name: gtm?.name,
    affiliation: 'Online Store', // Static value
    coupon: null,
    discount: null,
    item_brand: gtm?.brand || itemBrand,
    item_category: itemCategories[0] || null,
    item_category2: itemCategories[1] || null,
    item_category3: itemCategories[2] || null,
    item_category4: itemCategories[3] || null,
    item_category5: itemCategories[4] || null,
    item_list_id: localStorage.getItem('categoryListId') || null,
    item_list_name: localStorage.getItem('categoryListName') || null,
    item_variant: itemVariant || null,
    in_stock: product.inStock || null,
    price: Number(gtm?.price ?? null),
    quantity: Number(quantity),
    index: 1,
    returnEligibility: itemReturnable,
    item_color: colorLabel || null,
    item_size: selectedSizeTitle
      || product.options?.[0]?.values?.find((value) => value.inStock === true)?.value
      || null,
  };
  if (withoutBannerData) {
    return itemData;
  }
  return { ...itemData, ...transformBannerData() };
}

// eslint-disable-next-line  max-len
async function createPdpBaseObject(eventName, productData, quantity, selectedSize, withoutBannerData) {
  const currency = await getConfigValue('currency');
  const dlObject = {
    event: `${eventName}`,
    ecommerce: {
      currency,
      value: parseFloat(productData.gtm?.price, 10) * quantity || null,
      items: [transformPdpProductData(productData, quantity, selectedSize, withoutBannerData)],
    },
  };
  dlObject.ecommerce = { ...dlObject.ecommerce, ...transformBannerData() };
  return dlObject;
}

export async function datalayerViewItemEvent(productData) {
  const dlObject = await createPdpBaseObject('view_item', productData, 1, null, null);
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export async function datalayerAddToCartEvent(addProduct, productData, quantity, selectedSize) {
  const eventName = addProduct ? 'add_to_cart' : 'remove_from_cart';
  const dlObject = await createPdpBaseObject(eventName, productData, quantity, selectedSize);
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export async function datalayerRemoveFromCartEvent({ productData, quantity }) {
  const eventName = 'remove_from_cart';
  const dlObject = await createPdpBaseObject(eventName, productData, quantity, '', true);
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export function datalayerSizeSelectorEvent(size) {
  const dlObject = {
    event: 'ecommerce',
    eventCategory: 'ecommerce',
    eventAction: 'pdp size click',
    eventLabel: `size: ${size}`,
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerSocialShareEvent(stateOrPlatform) {
  const dlObject = {
    event: 'ecommerce',
    eventCategory: 'ecommerce',
    eventAction: 'share this page',
    eventLabel: `${stateOrPlatform}`,
  };
  sendAttributesToDataLayer(dlObject);
}

export function datalayerPdpAccordionToggleEvent(title, state) {
  let eventLabel = `${title?.toLowerCase()}`;
  if (state) {
    eventLabel += ` - ${state?.toLowerCase()}`;
  }
  const dlObject = {
    event: 'ecommerce',
    eventCategory: 'ecommerce',
    eventAction: 'pdp clicks',
    eventLabel,
  };
  sendAttributesToDataLayer(dlObject);
}

/* PLP & PDP & Wishlist */

/**
 * Method to send datalayer event on adding or removing product from wishlist
 * @param {*} isAdded true if product is added to wishlist, false if removed
 * @param {*} productData Products data array for PLP or product data object for PDP
 * @param {*} pageType plp or pdp or wishlist
 * @param {*} selectedIndex index value of the product selected
 */
export async function datalayerAddToWishlistEvent(isAdded, productData, pageType, selectedIndex) {
  const currency = await getConfigValue('currency');
  const dlObject = {
    event: isAdded ? 'add_to_wishlist' : 'remove_from_wishlist',
  };
  if (pageType === 'plp') {
    dlObject.ecommerce = {
      currency,
      value: productData.gtm['gtm-price'],
      items: transformProductItemData([productData], 1, false, true, selectedIndex),
    };
  } else {
    dlObject.ecommerce = (await createPdpBaseObject('', productData, 1)).ecommerce;
  }
  dlObject.ecommerce = { ...dlObject.ecommerce, ...transformBannerData() };
  sendAttributesToDataLayer({ ecommerce: null });
  sendAttributesToDataLayer(dlObject);
}

/* DL events for Product Recommendations */

/**
 * Transform Algolia Product Recommendations item data
 * @param {*} productData products data array
 * @param {*} listname listname
 * @param {*} quantity quantity
 * @param {*} selectedIndex index value of product selected
 */
function transformRecommendedProductItemData(productData, listName, quantity, selectedIndex = '') {
  return productData?.map(({ sku, productData: product }, index) => {
    const categories = product?.category?.en;
    const itemCategories = categories?.split('|');
    const itemData = {
      item_id: sku.split('_ae')[0] || null,
      item_name: product.name?.en || null,
      affiliation: 'Online Store',
      coupon: null,
      discount: Number(product.discount) || null,
      item_brand: product.brand || null,
      item_category: categories || null,
      item_category2: itemCategories[0] || null,
      item_category3: itemCategories[1] || null,
      item_category4: itemCategories[2] || null,
      item_category5: itemCategories[3] || null,
      item_list_id: null,
      item_list_name: listName || null,
      item_variant: null,
      in_stock: product.in_stock || null,
      price: Number(product.price) || null,
      quantity: Number(quantity),
      index: selectedIndex || index + 1,
      returnEligibility: null,
      item_color: product?.color.en || null,
      item_size: null,
    };
    return { ...itemData, ...transformBannerData() };
  });
}

// to get type of current page
function getPageTypeAcronym() {
  const { pageType } = window;
  const pageTypeMap = {
    'product detail page': 'pdp',
    'product listing page': 'plp',
  };
  return pageTypeMap[pageType] || pageType;
}

export function recommendationsViewItemList(productData, title) {
  const listName = `pr-${getPageTypeAcronym()}-${title?.toLowerCase()}`;
  const dlObject = {
    event: 'view_item_list',
    eventLabel: `${productData?.length || 0} items`,
    ecommerce: {
      item_list_id: null,
      item_list_name: listName,
      items: transformRecommendedProductItemData(productData, listName, 1),
    },
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export function datalayerSelectRecommendedItemListEvent(productData, totalItems, title, indexVal) {
  const listName = `pr-${getPageTypeAcronym()}-${title?.toLowerCase()}`;
  localStorage.setItem('categoryListName', listName);
  const dlObject = {
    event: 'select_item',
    eventLabel: `${totalItems} items`, // total number of items displayed on the listing page
    ecommerce: {
      item_list_id: null,
      item_list_name: listName || null,
      items: transformRecommendedProductItemData([productData], listName, 1, indexVal),
    },
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export const datalayerConfirmationPageViewEvent = (
  data,
) => {
  const dlObject = {
    event: 'purchase',
    ecommerce: {
      ...transformBannerData(),
      ...data,
    },
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
};

export function datalayerAddPaymentInfo({
  value, currency, coupon, shippingTier, discount, productData, deliveryOption, paymentType,
}) {
  const isAuthenticated = !!getCookie('auth_user_token');
  const dlObject = {
    event: 'add_payment_info',
    ecommerce: {
      ...transformBannerData(),
      value,
      currency,
      coupon,
      login_method: isAuthenticated ? 'Logged In' : 'Guest Login',
      shipping_tier: shippingTier,
      discount,
      delivery_option: deliveryOption,
      payment_type: paymentType,
      items: transformProductItemData(productData, 1, true),
    },
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export function datalayerCodOtpVerification({ eventCategory, eventAction, eventLabel }) {
  const dlObject = {
    event: 'cod_otp_verification',
    eventCategory,
    eventAction,
    eventLabel,
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export function datalayerPaymentErrors({ eventAction, eventLabel }) {
  const dlObject = {
    event: 'eventTracker',
    eventCategory: 'payment errors',
    eventAction,
    eventLabel,
  };
  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}

export function datalayerLoyaltySwitchEvent({ eventLabel }) {
  const dlObject = {
    event: 'loyalty switch',
    eventCategory: 'loyalty switch',
    eventAction: 'loyalty switch',
    eventLabel,
  };

  sendAttributesToDataLayer({ ecommerce: null }); // Clear the previous ecommerce object.
  sendAttributesToDataLayer(dlObject);
}
