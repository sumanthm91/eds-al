/* eslint-disable max-len */

import { fetchCategoriesByUrlKey } from '../../scripts/commerce.js';
import { getConfigValue } from '../../scripts/configs.js';
import {
  buildUrlKey,
  postJSON,
  enableStickyElements,
  fetchPlaceholdersForLocale,
  fireTargetCall,
  formatPrice,
  loadFragment,
  setMetaAttribute,
  isSearchPage,
  showCommerceErrorPage,
  getRedirectUrl,
  getVisitorEligibility,
  getPreviewPreaccessType,
} from '../../scripts/scripts.js';
import {
  datalayerViewItemListEvent,
  datalayerSelectItemListEvent,
  datalayerFilterEvent,
  datalayerSortingEvent,
  datalayerImageSwipeEvent,
  datalayerColorSwatchEvent,
  dataLayerGridSelectionEvent,
  datalayerAddToWishlistEvent,
  dataLayerLoadMoreSelectionEvent,
  datalayerColorSwatchChevron,
  dataLayerInternalSearchSuccessEvent,
  dataLayerInternalSearchEmptyEvent,
  sendCategoriesToDataLayer,
} from '../../scripts/analytics/google-data-layer.js';
import { plpLoadData, pageLoadData } from '../../scripts/target-events.js';
import { cartApi } from '../../scripts/minicart/api.js';
import { getFilterAliaseValues } from '../../scripts/product-list/api.js';

// TODO exclude all EDS categories
const EXCLUDED_CATEGORIES = ['view-all'];

// constants
const COLOR_ATTRIBUTE = 'attr_color_family';
const RATING_ATTRIBUTE = 'attr_bv_rating';
const PRICE_ATTRIBUTE = 'final_price';
const SIZE_ATTRIBUTE = 'attr_size';
const SWIPE_NEXT = 'swipenext';
const SWIPE_PREV = 'swipeprev';
const DEFAULT_LANGUAGE = 'en';
const CATEGORY_CONTEXT_PREFIX = 'web';
const MAX_FILTER_ITEMS = 5;
const CURRENT_CATEGORY = buildUrlKey().split('/')?.pop();

// global states
const productListingLanguage = document.documentElement.lang;
const categoryPath = [];
const urlFacets = [];
let urlPrice = '';
let ruleContexts = '';
let categoryLevel = -1;
let searchTerm = '';
let placeholders;
let datalayerPageType = 'plp';
let listingType = '';
let offerListSku = '';
export const attributesToRetrieve = `[
  "url",
  "attr_product_collection",
  "attr_preview_preaccess_data",
  "product_labels",
  "media",
  "title",
  "article_swatches",
  "promotions",
  "discount",
  "original_price",
  "final_price",
  "gtm",
  "sku",
  "attr_color",
  "in_stock"
]`;
const attributesToRetrieveWithLang = `[
  "url.${productListingLanguage}",
  "attr_product_collection.${productListingLanguage}",
  "media",
  "title.${productListingLanguage}",
  "article_swatches.${productListingLanguage}",
  "promotions.${productListingLanguage}",
  "discount.${productListingLanguage}",
  "original_price.${productListingLanguage}",
  "final_price.${productListingLanguage}",
  "attr_preview_preaccess_data.${productListingLanguage}",
  "product_labels.${productListingLanguage}",
  "swatches.${productListingLanguage}",
  "gtm",
  "sku",
  "attr_product_brand",
  "attr_color.${productListingLanguage}",
  "attr_brand_full_name.${productListingLanguage}"
]`;
export const responseFields = `[
  "userData",
  "facets",
  "renderingContent",
  "hits",
  "nbHits",
  "page",
  "hitsPerPage",
  "params"
]`;
const facetsToRetrieve = '["*"]';
let productListingConfig;
let productListingPage = 0;
let touchStartX = 0;
let touchEndX = 0;
let intervalId;
let lastSearchTerm = '';
let filterAliasValues;
// yield and start new macrotask to avoid blocking time (TBT)
async function performanceYield() {
  await new Promise((resolve) => { setTimeout(resolve, 0); });
}

/**
 * Build Algolia index URL
 *
 * @returns string
 */
export function buildAlgoliaIndexUrl(config) {
  const algoliaConfig = {
    'x-algolia-agent': config['x-algolia-agent'],
    'x-algolia-application-id': config['x-algolia-application-id'],
    'x-algolia-api-key': config['x-algolia-api-key'],
  };

  const searchParams = new URLSearchParams(algoliaConfig);
  const algoliaDefaultUrl = config['algolia-default-url'];
  return `${algoliaDefaultUrl}?${searchParams.toString()}`;
}

/**
 * Get Algolia index name according to selected sorting
 *
 * @returns {string|string|Promise<string|undefined>}
 */
function getAlgoliaIndexName(config = productListingConfig) {
  if (document.querySelector('.filters-body-main-ul [data-attribute="sorting"] ul li.filter-radio-active') !== null) {
    return document.querySelector('.filters-body-main-ul [data-attribute="sorting"] ul li.filter-radio-active')
      .getAttribute('data-index');
  }
  return (searchTerm ? config['algolia-search-index'] : config['algolia-plp-index']);
}

function buildUrlWithFilters(filtersString) {
  return isSearchPage() ? `${window.location.origin}${window.location.pathname}/${filtersString}`
    : `${window.location.href.replace(/\/+$/, '')}/${filtersString}`;
}

/**
 * Get all config values for product listing
 */
export async function getProductListingConfig() {
  return {
    'plp-hits-per-page': '' || await getConfigValue('plp-hits-per-page'),
    'plp-show-discount-value': '' || await getConfigValue('plp-show-discount-value'),
    'plp-show-review-ratings': '' || await getConfigValue('plp-show-review-ratings'),
    'plp-max-carousel-images': '' || await getConfigValue('plp-max-carousel-images'),
    'plp-swatch-style': '' || await getConfigValue('plp-swatch-style'),
    'plp-max-swatch-count': '' || await getConfigValue('plp-max-swatch-count'),
    'plp-swatch-link-pdp': '' || await getConfigValue('plp-swatch-link-pdp'),
    'algolia-default-url': '' || await getConfigValue('algolia-default-url'),
    'algolia-plp-index': '' || await getConfigValue('algolia-plp-index'),
    'algolia-search-index': '' || await getConfigValue('algolia-search-index'),
    'algolia-filters-on-main-page': '' || await getConfigValue('algolia-filters-on-main-page'),
    'algolia-hidden-filters': '' || await getConfigValue('algolia-hidden-filters'),
    'x-algolia-agent': '' || await getConfigValue('x-algolia-agent'),
    'x-algolia-application-id': '' || await getConfigValue('x-algolia-application-id'),
    'x-algolia-api-key': '' || await getConfigValue('x-algolia-api-key'),
    'favourites-hits-per-page': '' || await getConfigValue('favourites-hits-per-page'),
    'plp-show-swatches': '' || await getConfigValue('plp-show-swatches'),
  };
}

/**
 * Search for value in the object
 *
 * @param value
 * @returns {*|null}
 */
function findValueInObject(value) {
  const entry = Object.entries(filterAliasValues.data).find(([, obj]) => Object.values(obj).includes(value));
  return entry ? entry[1] : null;
}

function safeEncodeURIComponent(str) {
  try {
    if (decodeURIComponent(str) === str) {
      return encodeURIComponent(str);
    }
    return str;
  } catch (e) {
    return encodeURIComponent(str);
  }
}

function getAttributeNameByPage(attributeName) {
  if (isSearchPage()) {
    return attributeName;
  }
  return `${attributeName}.${productListingLanguage}`;
}

function isOfferListing() {
  return listingType === 'offer-listing';
}

function buildFilterStrings() {
  const facetFilters = [];
  const activeFacets = [];
  document.querySelectorAll('.filters-body-main-ul .filters-values-ul .active-checkbox')?.forEach((activeCheckbox) => {
    let facetName = activeCheckbox.getAttribute('data-filter-attr-name');
    const facetValue = activeCheckbox.getAttribute('data-filter-attr-value');
    if (facetName !== `${getAttributeNameByPage(COLOR_ATTRIBUTE)}.value`) {
      facetName = `${getAttributeNameByPage(facetName)}`;
    }

    if (facetFilters[facetName] === undefined) {
      facetFilters[facetName] = [facetValue];
    } else {
      facetFilters[facetName].push(facetValue);
    }
    activeFacets[facetName] = facetName;
  });

  while (urlFacets.length > 0) {
    const facet = urlFacets.pop().split('-');
    let facetName;
    if (!PRICE_ATTRIBUTE.includes(facet[0])) {
      facetName = `attr_${facet[0]}`;
    }

    const facetValue = `${encodeURIComponent(facet[1])}`;
    if (facetName === COLOR_ATTRIBUTE) {
      facetName = `${getAttributeNameByPage(facetName)}.value`;
    } else if (facetName !== PRICE_ATTRIBUTE) {
      facetName = `${getAttributeNameByPage(facetName)}`;
    }

    if (facetFilters[facetName] === undefined) {
      facetFilters[facetName] = [facetValue];
    } else {
      facetFilters[facetName].push(facetValue);
    }
    facetFilters[facetName] = [...new Set(facetFilters[facetName])];
    activeFacets[facetName] = facetName;
  }

  let numericFilters = '';
  // get active price range
  if (document.querySelector('.filters-body-main-ul .filters-values-ul .active-checkbox-price-range') !== null) {
    const priceFrom = document.querySelector('.filters-values-ul .active-checkbox-price-range').getAttribute('data-filter-attr-value').split('-')[0].trim();
    const priceTo = document.querySelector('.filters-values-ul .active-checkbox-price-range').getAttribute('data-filter-attr-value').split('-')[1].trim();
    // build price filter
    const priceField = searchTerm ? PRICE_ATTRIBUTE : `${getAttributeNameByPage(PRICE_ATTRIBUTE)}`;
    numericFilters += `&numericFilters=["${priceField}>${priceFrom}",`;
    numericFilters += `"${priceField}<=${priceTo}"]`;
    activeFacets.final_price = PRICE_ATTRIBUTE;
  } else if (urlPrice) {
    const urlPriceSplit = urlPrice.split(' - ');
    numericFilters += `&numericFilters=["${getAttributeNameByPage(PRICE_ATTRIBUTE)}>${urlPriceSplit[0]}",`;
    numericFilters += `"${getAttributeNameByPage(PRICE_ATTRIBUTE)}<=${urlPriceSplit[1]}"]`;
    activeFacets.final_price = PRICE_ATTRIBUTE;
  }

  const algoliaCategoryPath = `${categoryPath.join(' > ')}`;
  const filterCriteria = isOfferListing() ? ` AND (${offerListSku})` : ` AND (field_category_name.${DEFAULT_LANGUAGE}.lvl${categoryLevel}: "${algoliaCategoryPath}")`;
  let facetFiltersString = searchTerm
    ? `attributesToRetrieve=${attributesToRetrieve}&responseFields=${responseFields}&clickAnalytics=true&facets=${facetsToRetrieve}&filters=stock%20%3E%200&highlightPostTag=</ais-highlight-0000000000>&highlightPreTag=<ais-highlight-0000000000>&hitsPerPage=${productListingConfig['plp-hits-per-page']}&analyticsTags=["web","customer"]&query=${searchTerm}&page=${productListingPage}${numericFilters}`
    : `attributesToRetrieve=${attributesToRetrieveWithLang}&responseFields=${responseFields}&clickAnalytics=true&facets=${facetsToRetrieve}&filters=(stock > 0)${filterCriteria}&hitsPerPage=${productListingConfig['plp-hits-per-page']}&ruleContexts=[${ruleContexts}]&optionalFilters=null&page=${productListingPage}${numericFilters}`;

  if (document.querySelectorAll('.filters-body-main-ul .filters-values-ul .active-checkbox').length !== 0 || Object.keys(facetFilters).length !== 0) {
    facetFiltersString += '&facetFilters=[';
    Object.entries(facetFilters).forEach(([filterKey, filterValue]) => {
      facetFiltersString += '[';
      filterValue.forEach((value) => {
        facetFiltersString += `"${safeEncodeURIComponent(filterKey.replace('*', 'value'))}:${safeEncodeURIComponent(value)}",`;
      });
      facetFiltersString = facetFiltersString.slice(0, -1);
      facetFiltersString += '],';
    });
    facetFiltersString = facetFiltersString.slice(0, -1);
    facetFiltersString += ']';
  }
  return {
    algoliaCategoryPath, facetFilters, activeFacets, numericFilters, facetFiltersString,
  };
}

/* returns true only if search term is new */
function isNewSearch() {
  return searchTerm && searchTerm !== lastSearchTerm;
}

/**
 * Send ViewItemList & Search events to dataLayer
 * @param {*} response Algolia response
 */
function dataLayerViewListEvents(response) {
  datalayerViewItemListEvent(response?.results?.[0]?.hits);
  const totalItemsLength = response?.results?.[0]?.hits?.length;
  if (window.location.href.includes('/search?q=') && isNewSearch()) {
    if (totalItemsLength !== 0 && totalItemsLength > 0) {
      dataLayerInternalSearchSuccessEvent(totalItemsLength, searchTerm);
    } else {
      dataLayerInternalSearchEmptyEvent(searchTerm);
    }
    lastSearchTerm = searchTerm;
  }
}
/**
 * Build Algolia request
 *
 * @returns requests: [{indexName: (string|*), params: string}]
 */
function buildAlgoliaRequest(skipFilters = false) {
  const index = getAlgoliaIndexName();

  let {
    // eslint-disable-next-line prefer-const
    algoliaCategoryPath, facetFilters, activeFacets, numericFilters, facetFiltersString,
  } = buildFilterStrings();

  const data = {
    requests: [
      {
        indexName: index,
        params: facetFiltersString,
      }],
  };

  if (skipFilters) {
    return data;
  }

  const buildFacetFiltersString = (facetFilterName) => {
    const filterCriteria = isOfferListing() ? ` AND (${offerListSku})` : ` AND (field_category_name.${DEFAULT_LANGUAGE}.lvl${categoryLevel}: "${algoliaCategoryPath}")`;
    if (searchTerm) {
      if (facetFilterName === PRICE_ATTRIBUTE) {
        numericFilters = '';
      }
      facetFiltersString = `clickAnalytics=true&facets=["*"]&filters=stock>0&highlightPostTag=</ais-highlight-0000000000>&highlightPreTag=<ais-highlight-0000000000>&hitsPerPage=${productListingConfig['plp-hits-per-page']}&query=${searchTerm}&page=0&ruleContexts=[${ruleContexts}]&optionalFilters=null&facets=${facetFilterName}${numericFilters}`;
    } else {
      facetFiltersString = `clickAnalytics=true&filters=(stock > 0)${filterCriteria}&hitsPerPage=0&optionalFilters=null&ruleContexts=[${ruleContexts}]&page=0&facets=${facetFilterName}${facetFilterName === PRICE_ATTRIBUTE ? `.${productListingLanguage}` : numericFilters}`;
    }
    facetFiltersString += '&facetFilters=[';

    Object.entries(facetFilters).forEach(([filterKey, filterValue]) => {
      if (filterKey !== facetFilterName) {
        facetFiltersString += '[';
        filterValue.forEach((value) => {
          facetFiltersString += `"${safeEncodeURIComponent(filterKey)}:${safeEncodeURIComponent(value)}",`;
        });
        facetFiltersString = facetFiltersString.slice(0, -1);
        facetFiltersString += '],';
      }
    });
    facetFiltersString = facetFiltersString.slice(0, -1);
    facetFiltersString += ']';
    return facetFiltersString;
  };

  const dataRequests = Object.keys(activeFacets).map((facetKey) => {
    let facetFilterName = facetKey;
    if (facetKey === `${getAttributeNameByPage(COLOR_ATTRIBUTE)}.value`) {
      facetFilterName = `${getAttributeNameByPage(COLOR_ATTRIBUTE)}.value`;
    }
    facetFiltersString = buildFacetFiltersString(facetFilterName);
    return {
      indexName: index,
      params: facetFiltersString,
    };
  });

  data.requests.push(...dataRequests);

  return data;
}

/**
 * No products found when there is an error
 */
function noProductsFound() {
  const noProductTitle = isSearchPage() ? `${placeholders.noResultsFor || 'No results for'} "${searchTerm}"` : placeholders.plpNoProductsFound;
  document.querySelector('.section.plp-header').innerHTML = `<h2 class='plp-category-title no-products'>${noProductTitle}</h2>`;
}

/**
 * Hide filters on the main page
 */
function hideMainPageFilters() {
  document.querySelectorAll('.filters-body .page-filters').forEach((filterLi) => {
    filterLi.classList.remove('active-values');
  });
}

/**
 * Hide popup with filters
 */
function hideFilters() {
  const popupOverlay = document.querySelector('.filters-popup-overlay');
  popupOverlay.classList.remove('active');
  document.body.classList.remove('no-scroll');
  document.querySelector('.filters-popup').classList.remove('active');
}

/**
 * Disable clear filters if no filter selected
 */
function disableClearfilters() {
  const clearFilter = document.querySelector('.button-clear-filter');
  if (document.querySelector('.main-page-filters-chosen-values').hasChildNodes()) {
    clearFilter.classList.remove('disable');
  } else {
    clearFilter.classList.add('disable');
  }
}

// close filter dropdowns when clicked outside
window.addEventListener('click', (event) => {
  if (!event.target.matches('.main-filter-title-span')) {
    hideMainPageFilters();
  }
});

/**
 * Show popup with filters
 */
function showFilters() {
  const popupOverlay = document.querySelector('.filters-popup-overlay');
  popupOverlay.classList.add('active');
  popupOverlay.style.top = 0;
  popupOverlay.style.height = '100%';
  document.body.classList.add('no-scroll');
  popupOverlay.addEventListener('click', hideFilters);
  document.querySelector('.filters-popup').classList.add('active');
  // if no filters selected the disable the clear filter button
  disableClearfilters();
  // if some filters is open on the main page hide them
  hideMainPageFilters();
}

/**
 * When click on specific filter show filter values
 *
 * @param element
 */
function showFilterValues(element) {
  if (!element.querySelector('.filters-values-ul').classList.contains('active-values')) {
    document.querySelector('#filters-popup-title').classList.add('hide');
    document.querySelector('#filters-values-popup-title').classList.remove('hide');
    element.querySelector('.filters-values-ul').classList.add('active-values');
  }
}

/**
 * Hide filter values
 */
function hideFilterValues() {
  document.querySelector('#filters-popup-title').classList.remove('hide');
  document.querySelector('#filters-values-popup-title').classList.add('hide');
  document.querySelectorAll('.filters-values-ul').forEach((filterValuesUl) => {
    filterValuesUl.classList.remove('active-values');
  });
}

/**
 * When open a filter hide all other filters popup
 *
 * @param element
 */
function toggleMainPageFilterValues(element) {
  document.querySelectorAll('.filters-body .page-filters').forEach((filterValuesLi) => {
    if (element === filterValuesLi) {
      filterValuesLi.classList.toggle('active-values');
    } else {
      filterValuesLi.classList.remove('active-values');
    }
  });
}

/**
 * Build loader for PLP
 */
function buildLoader() {
  const fullscreenLoader = document.createElement('div');
  fullscreenLoader.classList.add('fullscreen-loader');
  fullscreenLoader.setAttribute('id', 'fullscreen-loader');
  document.body.appendChild(fullscreenLoader);
}

/**
 * Show loader while fetching data
 */
function showLoader() {
  const loader = document.querySelector('.fullscreen-loader');
  loader.classList.add('active');
  hideMainPageFilters();
}

/**
 * Hide loader when data is fetched
 */
function hideLoader() {
  const loader = document.querySelector('.fullscreen-loader');
  loader.classList.remove('active');
}

/**
 * Build promotions for the product
 *
 * @param promotions
 * @returns {string}
 */
function buildPromotionsHTML(promotions) {
  let promotionsHTML = '<div class="promotions-container">';
  promotions?.forEach((promo) => {
    promotionsHTML += `<p class="product-item-promotion">${promo.text}</p>`;
  });
  promotionsHTML += '</div>';
  return promotionsHTML;
}

// get currency code
let currencyCode;
async function initializeCurrencyCode() {
  currencyCode = await getConfigValue('currency');
}
initializeCurrencyCode();

async function buildPricingHTML(product) {
  let pricingHTML = '';
  const discount = (product.discount[productListingLanguage] !== null) ? product.discount[productListingLanguage] : product.discount;
  const originalPrice = product.original_price[productListingLanguage] ? product.original_price[productListingLanguage] : product.original_price;
  const finalPrice = product.final_price[productListingLanguage] ? product.final_price[productListingLanguage] : product.final_price;
  const formattedFinalPrice = await formatPrice(currencyCode, finalPrice);
  const formattedOriginalPrice = await formatPrice(currencyCode, originalPrice);

  if (!discount) {
    pricingHTML = `<div class="product-item-price">
                      <p class="item-price">${formattedFinalPrice}</p>
                  </div>`;
  } else {
    pricingHTML += `<p class="item-price-discounted">${formattedFinalPrice}</p>`;
    pricingHTML += `<p class="item-price-original-slashed">${formattedOriginalPrice}</p>`;
    const pricingDiscountDiv = '<div class="product-item-discount-price">#pricing#</div>';
    pricingHTML = pricingDiscountDiv.replace('#pricing#', pricingHTML);
    if (productListingConfig['plp-show-discount-value'] === 'true') {
      pricingHTML += `<p class="item-price-discount-value">(${placeholders.plpSave} ${discount}%)</p>`;
    }
  }
  return pricingHTML;
}

function buildProductImagesHTML(product, config = productListingConfig, isWishlist = false) {
  let imgs = '';
  let btns = '';
  const productTitle = product.title[productListingLanguage] ? product.title[productListingLanguage] : product.title;
  const productUrl = product.url[productListingLanguage] ? product.url[productListingLanguage] : product.url;
  const maxImages = !isWishlist ? config['plp-max-carousel-images'] : 1;
  product.media.forEach((img, index) => {
    if (index < maxImages) {
      imgs += `<img width="450" height="675" src="${img.url}" title="${productTitle}" alt="${productTitle}" />`;
      if (config) {
        btns += `<button aria-label="View image ${index + 1}" value="${index + 1}" class="product-image-btn${index === 0 ? ' selected' : ''}"></button>`;
      }
    }
  });
  return `
    <a data-link='pdp' href="${productUrl?.replace('.html', '') || '#'}">
      <div class="item-images" data-image-position="1">${imgs}</div>
    </a>
    <div class="product-carousel-buttons">${btns}</div>
  `;
}

function buildOutOfStockHTML(product, isWishlist = false) {
  let outOfStockHTML = '';
  if (isWishlist && product.in_stock !== 1) {
    outOfStockHTML = `<div class="overlay-out-of-stock-container">
                        <div class="overlay-out-of-stock-background"></div>
                        <div class="overlay-out-of-stock-line"></div>
                        <div class="overlay-out-of-stock-text">${placeholders.outOfStockLabel}</div>
                      </div>`;
  }
  return outOfStockHTML;
}

function getDetailsByType(data, type) {
  const result = data.find((item) => item.type === type);
  return result ? { position: result.position, text: result.text } : null;
}

function buildProductLabelHTML(product) {
  const prevPreData = product.attr_preview_preaccess_data[productListingLanguage];
  let prevPreInfo;
  if (!prevPreData) {
    prevPreInfo = getPreviewPreaccessType(product.attr_preview_preaccess_data, productListingLanguage);
  } else {
    prevPreInfo = getPreviewPreaccessType(prevPreData, productListingLanguage);
  }
  if (prevPreInfo?.type) {
    let pLabel;
    if (!product.product_labels[productListingLanguage]) {
      pLabel = getDetailsByType(product.product_labels, prevPreInfo.type);
    } else {
      pLabel = getDetailsByType(product.product_labels[productListingLanguage], prevPreInfo.type);
    }
    if (pLabel) {
      return `<div class="product-label label-preview ${pLabel.position} ${prevPreInfo.type}">
                           ${pLabel.text} </div>`;
    }
  }
  return '';
}

function buildSwatchHTML(product, config) {
  if (config['plp-show-swatches'] !== 'true') {
    return '';
  }

  const swatchesList = product.article_swatches[productListingLanguage] ? product.article_swatches[productListingLanguage] : product.article_swatches;
  const swatches = swatchesList?.filter((swatch) => swatch.rgb_color) || [];
  const style = config['plp-swatch-style'];
  const maxSwatchCount = parseInt(config['plp-max-swatch-count'], 10);
  let swatchHTML = '';
  let swatchDiv = '<div class="swatch-selection">#swatches#</div>';
  swatches.forEach((swatch, i) => {
    if (style === 'circle' && i === maxSwatchCount) {
      swatchHTML += `<div class="swatch" data-sku="${product.sku}">
                      <p class="swatch-overflow-count">+${swatches.length - maxSwatchCount}</p>
                    </div>`;
    } else if (i < maxSwatchCount) {
      // condition if the color starts with #f for white circles
      const hasGreyBorder = swatch.rgb_color.startsWith('#F');
      swatchHTML += `<div class="swatch${(hasGreyBorder ? ' border' : '')}${(i === 0) && (style === 'square') ? ' selected' : ''}" data-sku="${swatch.article_sku_code}">
                      <div style="background-color: ${swatch.rgb_color}"></div>
                    </div>`;
    }
  });
  if (swatches.length > 4 && style === 'square') {
    const dir = document.getElementsByTagName('html')[0].getAttribute('dir');
    swatchDiv = `<button data-icon-name="swatch-arrow-left" class="swatch-carousel-left carousel-nav-button ${dir === 'rtl' ? '' : 'hidden'}">
      <span class="icon icon-swatch-arrow-left"><img src="/icons/swatch-arrow-left.svg" alt="" loading="lazy"></span>
    </button> ${swatchDiv}`;
    swatchDiv += `<button data-icon-name="swatch-arrow-right" class="swatch-carousel-right carousel-nav-button ${dir === 'rtl' ? 'hidden' : ''}">
                    <span class="icon icon-swatch-arrow-right"><img src="/icons/swatch-arrow-right.svg" alt="" loading="lazy"></span>
                  </button>`;
  }
  swatchHTML = swatchDiv.replace('#swatches#', swatchHTML);
  return swatchHTML;
}

function buildRatingHTML(product, config) {
  if (config['plp-show-review-ratings'] !== 'true') {
    return '';
  }

  const productUrl = product.url[productListingLanguage] ? product.url[productListingLanguage] : product.url;
  let numStars = 0;
  if (product.attr_bv_rating) {
    const productBvRating = (product.attr_bv_rating[productListingLanguage] !== null) ? product.attr_bv_rating[productListingLanguage] : product.attr_bv_rating;
    numStars = productBvRating?.join(' - ').split('_')[1];
  }
  const reviewCount = product.attr_bv_total_review_count || 0;
  let ratingDiv = '<div class="review-rating-stars">#stars#</div>';
  let starsHtml = '<div class="star-container">';

  for (let i = 0; i < 5; i += 1) {
    starsHtml = `${starsHtml} <span class="star-${i < numStars ? 'filled' : 'empty'}"></span>`;
  }

  starsHtml = `${starsHtml}</div>`;
  starsHtml = `${starsHtml} <a href="${productUrl.replace('.html', '')}"><span class="rating-value-rating_${numStars} rating-count">(${reviewCount})</span></a>`;
  ratingDiv = ratingDiv.replace('#stars#', starsHtml);
  return ratingDiv;
}

function handleSwatchCarousel(e, productTitle, sku) {
  let { target } = e;
  if (target.tagName !== 'BUTTON') {
    target = e.target.closest('button');
  }

  const swatchContainer = target.closest('.color-swatch-container').querySelector('.swatch-selection');
  const scrollDistance = swatchContainer.scrollWidth - swatchContainer.offsetWidth;
  const dir = document.getElementsByTagName('html')[0].getAttribute('dir');
  const dirMultiplier = document.getElementsByTagName('html')[0].getAttribute('dir') === 'rtl' ? -1 : 1;
  const swatchWidth = target.offsetWidth;
  let chevronClick = `${dir === 'rtl' ? 'left' : 'right'}`;
  if (target.dataset.iconName.includes('right')) {
    swatchContainer.scrollLeft += 2 * swatchWidth; // 2 * width of the swatch divs
  } else {
    swatchContainer.scrollLeft -= 2 * swatchWidth;
  }

  if ((swatchContainer.scrollLeft * dirMultiplier) > 0 && swatchContainer.parentNode.querySelector('button.hidden')) {
    swatchContainer.parentNode.querySelector('button.hidden').classList.remove('hidden');
  }
  if (swatchContainer.scrollLeft === 0 || swatchContainer.scrollLeft === -1) {
    swatchContainer.parentNode.querySelector(`button.swatch-carousel-${dir === 'rtl' ? 'right' : 'left'}`).classList.add('hidden');
    if (swatchContainer.parentNode.querySelector(`button.swatch-carousel-${dir === 'rtl' ? 'left' : 'right'}`).classList.contains('hidden')) {
      swatchContainer.parentNode.querySelector(`button.swatch-carousel-${dir === 'rtl' ? 'left' : 'right'}`).classList.remove('hidden');
    }
    chevronClick = `${dir === 'rtl' ? 'right' : 'left'}`;
  }
  if ((swatchContainer.scrollLeft * dirMultiplier) + 1 >= scrollDistance) {
    swatchContainer.parentNode.querySelector(`button.swatch-carousel-${dir === 'rtl' ? 'left' : 'right'}`).classList.add('hidden');
    if (swatchContainer.parentNode.querySelector(`button.swatch-carousel-${dir === 'rtl' ? 'right' : 'left'}`).classList.contains('hidden')) {
      swatchContainer.parentNode.querySelector(`button.swatch-carousel-${dir === 'rtl' ? 'right' : 'left'}`).classList.remove('hidden');
    }
    chevronClick = `${dir === 'rtl' ? 'left' : 'right'}`;
  }
  datalayerColorSwatchChevron(chevronClick, productTitle, sku);
}

// check if we still need swatch carousel after a resize
function checkSwatchCarouselButtons() {
  const allSwatchContainers = document.body.querySelectorAll('.color-swatch-container:has(.swatch)');
  const dir = document.getElementsByTagName('html')[0].getAttribute('dir');
  allSwatchContainers.forEach((div) => {
    const swatchSelection = div.querySelector('.swatch-selection');
    // scroll bar no longer exists, remove carousel buttons
    if (!(swatchSelection.scrollWidth > swatchSelection.clientWidth)) {
      div.querySelectorAll('button').forEach((btn) => {
        if (!btn.classList.contains('hidden')) {
          btn.classList.add('hidden');
        }
      });
    } else if (div.querySelector(`button.swatch-carousel-${dir === 'rtl' ? 'left' : 'right'}`)) {
      div.querySelector(`button.swatch-carousel-${dir === 'rtl' ? 'left' : 'right'}`).classList.remove('hidden');
    }
  });
}

/**
 * Adds cloned images to the front and back to help with infinite scroll
 * @param {HTMLElement} itemImages - The element containing the item images.
 */
function addImageClones(itemImages) {
  const allImages = itemImages.querySelectorAll('img');
  const firstImage = allImages[0].cloneNode(true);
  const lastImage = allImages[allImages.length - 1].cloneNode(true);

  firstImage.classList.add('clone');
  lastImage.classList.add('clone');
  itemImages.appendChild(firstImage);
  itemImages.prepend(lastImage);

  firstImage.addEventListener('load', () => {
    itemImages.style.transition = 'none';
    itemImages.style.transform = `translateX(${(document.dir === 'rtl' ? 1 : -1) * firstImage.width}px)`;
    // eslint-disable-next-line
    itemImages.offsetHeight;
    itemImages.style.transition = '';
  }, { once: true });
}

function updateSelectedImageButton(allButtons, selectedButton) {
  allButtons.forEach((btn) => {
    btn.classList.remove('selected');
  });
  selectedButton.classList.add('selected');
}

function handleScrollOverflow(itemImages, imagePosition, maxPosition, direction, imageWidth) {
  let position = imagePosition;
  if (imagePosition > maxPosition) {
    position = 1;
  } else if (imagePosition < 1) {
    position = maxPosition;
  } else {
    return position;
  }

  const translationValue = direction * position * imageWidth;
  itemImages.addEventListener('transitionend', () => {
    itemImages.style.transition = 'none';
    itemImages.style.transform = `translateX(${translationValue}px)`;
    // eslint-disable-next-line
    itemImages.offsetHeight;
    itemImages.style.transition = '';
    itemImages.dataset.imagePosition = position;
  }, { once: true });
  return position;
}

function handleImageSwipe(e) {
  const imageCount = e.detail.target.querySelectorAll('.item-images img').length;
  if (imageCount <= 1) {
    return;
  }

  const itemImages = e.detail.target.querySelector('.item-images');
  const imageWidth = itemImages.querySelector('img').offsetWidth;
  const direction = document.dir === 'rtl' ? 1 : -1;
  const maxPosition = parseInt(e.detail.target.querySelector('.product-image-btn:last-child').value, 10);
  let imagePosition = parseInt(itemImages.dataset.imagePosition, 10);
  if (e.type === SWIPE_PREV) {
    imagePosition -= 1;
  } else if (e.type === SWIPE_NEXT) {
    imagePosition += 1;
  }
  if (!e.detail.auto) {
    if (direction === 1) {
      datalayerImageSwipeEvent(e.type === SWIPE_NEXT ? 'right' : 'left', datalayerPageType);
    } else {
      datalayerImageSwipeEvent(e.type === SWIPE_NEXT ? 'left' : 'right', datalayerPageType);
    }
  }
  const translationValue = direction * imagePosition * imageWidth;
  itemImages.style.transform = `translateX(${translationValue}px)`;
  // eslint-disable-next-line
  imagePosition = handleScrollOverflow(itemImages, imagePosition, maxPosition, direction, imageWidth);

  const allButtons = e.detail.target.querySelectorAll('button');
  const selectedButton = e.detail.target.querySelector(`button[value="${imagePosition}"]`);
  updateSelectedImageButton(allButtons, selectedButton);
  itemImages.dataset.imagePosition = imagePosition;
}

function handleImageCarouselButton(e) {
  const itemImages = e.target.closest('.product-image-container').querySelector('.item-images');
  const imagePosition = parseInt(e.target.value, 10);
  const imageWidth = itemImages.querySelector('img').offsetWidth;
  const direction = document.dir === 'rtl' ? 1 : -1;
  const allButtons = e.target.closest('.product-carousel-buttons').querySelectorAll('button');
  const swipeDirection = [...allButtons].findIndex((btn) => btn.classList.contains('selected')) + 1 > imagePosition ? 'right' : 'left';
  datalayerImageSwipeEvent(swipeDirection, datalayerPageType);
  updateSelectedImageButton(allButtons, e.target);

  itemImages.style.transform = `translateX(${direction * imagePosition * imageWidth}px)`;
  itemImages.dataset.imagePosition = imagePosition;
}

/**
 * Handles the image hover event.
 * Hover animation behaves like a swipe so the same function is used.
 * @param {Event} e - The event object.
 */
function handleImageHover(e) {
  if (e.type === 'mouseout') {
    clearInterval(intervalId);
  } else {
    intervalId = setInterval(() => {
      handleImageSwipe(new CustomEvent(SWIPE_NEXT, { detail: { target: e.target.closest('.product-image-container'), auto: true } }));
    }, 2000);
  }
}

function imageTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX;
}

function imageTouchMove(e) {
  touchEndX = e.changedTouches[0].screenX;
}

function imageTouchEnd() {
  const direction = document.dir === 'rtl' ? 1 : -1;
  const swipe = (touchEndX - touchStartX) * direction > 0 ? SWIPE_NEXT : SWIPE_PREV;
  handleImageSwipe(new CustomEvent(swipe, { detail: { target: this } }));
}

function addImageListeners(imageContainer) {
  imageContainer.addEventListener('mouseover', handleImageHover);
  imageContainer.addEventListener('mouseout', handleImageHover);
  imageContainer.addEventListener('touchstart', imageTouchStart, false);
  imageContainer.addEventListener('touchmove', imageTouchMove, false);
  imageContainer.addEventListener('touchend', imageTouchEnd, false);
}

async function handleSwatchSelector(e, config, isWishlist) {
  const { target } = e;
  const swatchElement = target.closest('.swatch');
  const idxName = await getAlgoliaIndexName(config);
  const productRequestBody = {
    requests: [{
      indexName: idxName,
      params: `query=${swatchElement.dataset.sku}`,
    }, { indexName: idxName }],
  };
  const algoliaUrl = await buildAlgoliaIndexUrl(config);
  postJSON(algoliaUrl, productRequestBody)
    .then(async (response) => {
      const product = response.results[0].hits[0];
      const productUrl = product.url[productListingLanguage] ? product.url[productListingLanguage] : product.url;
      const pdpProductUrl = productUrl?.replace('.html', '');
      const redirectToPDP = config['plp-swatch-link-pdp'] === 'true';
      if (redirectToPDP) {
        window.location = pdpProductUrl;
      } else {
        const productItemDiv = e.target.closest('.product-item');
        const newProductData = product;
        datalayerColorSwatchEvent(datalayerPageType, newProductData.attr_color?.en?.[0]);
        // update image(s)
        const productImgs = productItemDiv.querySelector('div.product-image-container');
        productImgs.innerHTML = buildProductImagesHTML(product, config, isWishlist);

        // update product info
        const productInfo = productItemDiv.querySelector('div.product-item-info');
        const productTitle = newProductData.title[productListingLanguage] ? newProductData.title[productListingLanguage] : newProductData.title;
        productInfo.querySelector('.product-item-price').innerHTML = await buildPricingHTML(newProductData);
        productInfo.querySelector('.product-item-title').innerText = productTitle;
        productInfo.querySelector('.product-item-title')
          .closest('a').href = pdpProductUrl;

        // update promotions
        const productPromos = productItemDiv.querySelector('div.promotions-container');
        productPromos.innerHTML = buildPromotionsHTML(newProductData.promotions[productListingLanguage]);

        productItemDiv.querySelectorAll('.product-carousel-buttons button').forEach((btn) => {
          btn.addEventListener('click', handleImageCarouselButton);
        });

        // add image clones for carousel
        const imageContainer = productItemDiv.querySelector('.product-image-container');
        if (imageContainer.querySelectorAll('.item-images img').length > 1) {
          addImageClones(imageContainer.querySelector('.item-images'));
        }

        // re-add listeners for image selection
        addImageListeners(productImgs);
      }
    });

  const swatchSelection = e.target.closest('.swatch-selection')
    .querySelectorAll('div.swatch');
  swatchSelection.forEach((div) => {
    div.classList.remove('selected');
  });
  e.target.closest('.swatch')
    .classList
    .add('selected');
}

/**
 * During resize check images and apply the necessary transformations to maintain alignment.
 */
function checkImageCarousel() {
  const allImageContainers = document.body.querySelectorAll('.product-image-container .item-images');
  allImageContainers.forEach((container) => {
    const imageCount = container.querySelectorAll('img').length;
    if (imageCount > 1) {
      container.style.transition = 'none';
      const translationValue = container.dataset.imagePosition * container.offsetWidth * (document.dir === 'rtl' ? 1 : -1);
      container.style.transform = `translateX(${translationValue}px)`;
      // eslint-disable-next-line
      container.offsetHeight;
      container.style.transition = '';
    }
  });
}

function handleGridSelection(e) {
  const productsContainer = document.body.querySelector('div.products-container');
  productsContainer.classList.forEach((cls) => {
    if (cls.includes('columns-')) {
      productsContainer.classList.remove(cls);
    }
  });
  productsContainer.classList.add(e.target.dataset.iconName);

  const layoutSelected = document.body.querySelector('.grid-layout-selectors .selected:has(img)');
  layoutSelected.classList.remove('selected');
  layoutSelected.querySelector('img').src = layoutSelected.querySelector('img').src.replace('primary', 'secondary');
  e.target.src = e.target.src.replace('secondary', 'primary');
  e.target.closest('div').classList.add('selected');
  checkImageCarousel();
  dataLayerGridSelectionEvent(layoutSelected.classList.contains('four-column-grid'), datalayerPageType);
}

/**
 * Update the page loader progress bar
 *
 * @param response
 */
export function updatePageLoader(response, placeholdersList, eventload = '', replaceProducts = false) {
  const currentProductCount = (response.results[0].page + 1) * response.results[0].hitsPerPage;
  const totalProductCount = response.results[0].nbHits;
  const loadMoreContainer = document.querySelector('.products-pager-container');

  const percentViewed = (currentProductCount / totalProductCount) * 100;
  const progressCount = loadMoreContainer.querySelector('#progress-count');
  progressCount.innerText = `${placeholdersList.plpShowing} ${totalProductCount <= currentProductCount ? totalProductCount : currentProductCount} ${placeholdersList.plpOf} ${totalProductCount} ${placeholdersList.plpItems}`;
  const progressBar = loadMoreContainer.querySelector('.progress-bar');
  progressBar.style = `width: ${percentViewed}%;`;

  if (totalProductCount <= 0) {
    loadMoreContainer.classList.add('hidden');
  }
  if (totalProductCount <= currentProductCount) {
    loadMoreContainer.querySelector('.pager-button-container').classList.add('hidden');
  } else {
    loadMoreContainer.querySelector('.pager-button-container').classList.remove('hidden');
  }

  const countOfFoundItemsOnMain = document.querySelector('#count-of-found-items-on-main');
  const countOfFoundItemsContainer = document.querySelector('#count-of-found-items');
  if (countOfFoundItemsOnMain && countOfFoundItemsContainer) {
    countOfFoundItemsOnMain.innerHTML = `${response.results[0].nbHits} ${placeholdersList.plpItems}`;
    countOfFoundItemsContainer.innerHTML = `${response.results[0].nbHits} ${placeholdersList.plpItems}`;
  }

  if (eventload === 'loadMore' && !replaceProducts) {
    dataLayerLoadMoreSelectionEvent(currentProductCount, totalProductCount, datalayerPageType);
  }
}

/**
 * Add currency to price
 *
 * @param rangeValues
 * @returns {string}
 */
function buildPriceRangeValuesWithCurrency(rangeValues) {
  const priceValueFrom = parseFloat(rangeValues.split(' - ')[0]).toFixed(2);
  const priceValueTo = parseFloat(rangeValues.split(' - ')[1]).toFixed(2);
  return `${placeholders.plpDefaultCurrency} ${priceValueFrom} - ${placeholders.plpDefaultCurrency} ${priceValueTo}`;
}

export function buildLoadMoreContainer(buttonText) {
  const loadMoreContainer = document.createElement('div');
  loadMoreContainer.classList.add('products-pager-container');
  loadMoreContainer.innerHTML = `
          <div class="pager-progress">
            <p id="progress-count"></p>
            <div class="progress-bar-container">
              <div class="progress-bar"></div>
            </div>
          </div>
          <div class="pager-button-container">
            <button type="button" class="pager-button" rel="next">${buttonText}</button>
          </div>
      `;
  return loadMoreContainer;
}

/**
 * Build rating values text
 *
 * @param ratingAttrValue
 * @returns {string}
 */
function buildRatingValues(ratingAttrValue) {
  const countOfStart = ratingAttrValue.split('_')[1];
  if (countOfStart === '1') {
    return `${countOfStart} ${placeholders.plpStar}`;
  }
  return `${countOfStart} ${placeholders.plpStars}`;
}

/**
 * Get range values for filters
 *
 * @param values
 * @returns {{}}
 */
function getRangeValues(values = {}) {
  const ranges = {};
  Object.entries(values).forEach(([filterKey, filterValue]) => {
    const minusValue = filterKey % 5 === 0 ? 5 : filterKey % 5;
    const fromRange = filterKey - minusValue;
    const toRange = fromRange + 5;

    const rangeKey = `${fromRange} - ${toRange}`;
    if (ranges[rangeKey] === undefined) {
      ranges[rangeKey] = filterValue;
    } else {
      ranges[rangeKey] += filterValue;
    }
  });
  return ranges;
}

/**
 * Display chosen filter values on the main page
 */
function buildChosenFilterValuesOnMainPage() {
  const chosenValuesContainer = document.querySelector('#main-page-filters-chosen-values-container');
  const chosenValuesUl = document.querySelector('#main-page-filters-chosen-values');
  if (document.querySelectorAll('.filters-values-ul .filter-item.active-checkbox, .filters-values-ul .filter-item.active-checkbox-price-range').length > 0) {
    chosenValuesContainer.classList.remove('hide');
    chosenValuesUl.innerHTML = '';
    document.querySelectorAll('.filters-values-ul .filter-item.active-checkbox, .filters-values-ul .filter-item.active-checkbox-price-range').forEach((filterItem) => {
      const filterKey = filterItem.getAttribute('data-filter-attr-name');
      const filterValue = filterItem.getAttribute('data-filter-attr-value');
      const filterText = filterItem.getAttribute('aria-label');

      if (document.querySelectorAll(`#main-page-filters-chosen-values [data-filter-attr-name="${filterKey}"][data-filter-attr-value="${filterValue}"]`).length === 0) {
        const chosenFilter = document.createElement('li');
        chosenFilter.classList.add('main-page-filters-chosen-value');
        chosenFilter.setAttribute('data-filter-attr-name', filterKey.toLowerCase());
        chosenFilter.setAttribute('data-filter-attr-value', filterValue.toLowerCase());
        if (filterKey === RATING_ATTRIBUTE) {
          chosenFilter.innerHTML = buildRatingValues(filterValue);
        } else if (filterKey === PRICE_ATTRIBUTE) {
          chosenFilter.innerHTML = buildPriceRangeValuesWithCurrency(filterValue);
        } else if (filterKey.includes(COLOR_ATTRIBUTE)) {
          [chosenFilter.innerHTML] = filterText.split(',');
        } else {
          chosenFilter.innerHTML = filterText;
        }
        chosenFilter.addEventListener('click', () => {
          document.querySelector(`.filters-body-container .filters-values-ul [data-filter-attr-name="${filterKey}"][data-filter-attr-value="${filterValue}"]`).click();
        });
        chosenValuesUl.appendChild(chosenFilter);
      }
    });
  } else {
    chosenValuesContainer.classList.add('hide');
    chosenValuesUl.innerHTML = '';
  }
}

/**
 * Display chosen filter values on the main popup
 */
function editFilterValuesAtTheMainContainer() {
  const facetFiltersActive = {};
  const filterActiveCount = {};
  document.querySelectorAll('.filters-body-main-ul .filters-values-ul .filter-item.active-checkbox, .filters-values-ul .filter-item.active-checkbox-price-range').forEach((filterItem) => {
    let key = filterItem.getAttribute('data-filter-attr-name');
    if (key === `${getAttributeNameByPage(COLOR_ATTRIBUTE)}.value`) {
      key = COLOR_ATTRIBUTE;
    }
    const filterValue = filterItem.getAttribute('data-filter-attr-value');
    if (facetFiltersActive[key] === undefined) {
      facetFiltersActive[key] = [filterValue];
      filterActiveCount[key] = 1;
    } else if (facetFiltersActive[key].length < 2) {
      facetFiltersActive[key].push(filterValue);
      filterActiveCount[key] += 1;
    } else if (facetFiltersActive[key].length === 2) {
      filterActiveCount[key] += 1;
    }
  });

  document.querySelectorAll('.filters-body-main-ul .main-filter-chose-values').forEach((filterChosenText) => {
    const attributeName = filterChosenText.parentElement.getAttribute('data-attribute');
    if (facetFiltersActive[attributeName] !== undefined) {
      let addCount = '';
      if (filterActiveCount[attributeName] > 2) {
        addCount = ` (+ ${filterActiveCount[attributeName] - 1})`;
      }
      if (attributeName === PRICE_ATTRIBUTE) {
        filterChosenText.innerHTML = buildPriceRangeValuesWithCurrency(facetFiltersActive[attributeName].join(' - ') + addCount);
      } else if (attributeName === RATING_ATTRIBUTE) {
        filterChosenText.innerHTML = buildRatingValues(facetFiltersActive[attributeName].join(' - ')) + addCount;
      } else {
        filterChosenText.innerHTML = facetFiltersActive[attributeName].join(', ') + addCount;
      }
    } else {
      filterChosenText.innerHTML = '';
    }
  });
}

/**
 * Add top space to the first item
 *
 * @param attrName
 */
function addTopSpaceToTheFirstItem(attrName) {
  let a = 0;
  document.querySelectorAll(`.filters-body-container .filters-body-main-ul [data-attribute="${attrName}"] ul li`).forEach((filterLi) => {
    if (!filterLi.classList.contains('hide') && a === 0) {
      filterLi.classList.add('top-space');
      a += 1;
    } else {
      filterLi.classList.remove('top-space');
    }
  });
}

function getResultsIndex(response, facetKey) {
  let idx = 0;
  let maxLen = 0;
  let curMax = 0;

  for (let i = 1; i < response.results.length; i += 1) {
    if (response.results[idx].facets[facetKey] && response.results[i].facets[facetKey]) {
      curMax = Math.max(
        Object.keys(response.results[idx].facets[facetKey]).length,
        Object.keys(response.results[i].facets[facetKey]).length,
      );
      idx = curMax === Object.keys(response.results[idx].facets[facetKey]).length ? idx : i;
    } else if (response.results[idx].facets[facetKey]) {
      curMax = Object.keys(response.results[idx].facets[facetKey]).length;
    } else if (response.results[i].facets[facetKey]) {
      curMax = Object.keys(response.results[i].facets[facetKey]).length;
      idx = i;
    }
    if (curMax >= maxLen) {
      maxLen = curMax;
    }
  }
  return idx;
}

/**
 * Build filters for products returned, if a filter has no associated products then it's hidden
 *
 * @param response
 */
function buildCheckedFilters(response) {
  if (response.results.length > 1) {
    for (let i = 0; i < response.results.length; i += 1) {
      // eslint-disable-next-line no-loop-func
      Object.entries(response.results[i].facets).forEach(([filterKey, filterValue]) => {
        const keysToIgnore = [COLOR_ATTRIBUTE, PRICE_ATTRIBUTE, RATING_ATTRIBUTE];
        if (!keysToIgnore.some((ignore) => filterKey.includes(ignore))) {
          Object.keys(filterValue).forEach((key) => {
            // Check if a string is a number
            if (!/^\d+$/.test(key)) {
              const lowerCaseKey = key.toLowerCase();
              filterValue[lowerCaseKey] = { value: filterValue[key], label: key };
              if (key !== lowerCaseKey) {
                delete filterValue[key];
              }
            }
          });
        }

        let key = filterKey.replace(`.${productListingLanguage}`, '').toLowerCase();
        if (key === `${COLOR_ATTRIBUTE}.value`) {
          key = COLOR_ATTRIBUTE;
        }
        if (Object.keys(response.results[i].facets[filterKey]).length > 1) {
          document.querySelectorAll(`[data-attribute="${key}"]`).forEach((filterDiv) => {
            const mainFilters = document.querySelector('ul.filters-body');
            if (mainFilters.querySelectorAll('li.page-filters:not(.hide)').length < MAX_FILTER_ITEMS) {
              filterDiv.classList.remove('hide');
            }
          });
        }

        document.querySelectorAll(`[data-attribute="${key}"] ul li`).forEach((filterLi) => {
          const filterAttr = filterLi.getAttribute('data-filter-attr-value').toLowerCase();
          let value = filterValue[filterAttr];
          if (filterValue[filterAttr] && Object.keys(filterValue[filterAttr]).length > 1) {
            value = filterValue[filterAttr].value;
          }
          if (key === PRICE_ATTRIBUTE) {
            const idx = getResultsIndex(response, `${getAttributeNameByPage(key)}`);
            const priceRanges = getRangeValues(response.results[idx].facets[`${key}${searchTerm ? '' : `.${productListingLanguage}`}`]);
            if (priceRanges[filterAttr] !== undefined) {
              // rewrite the filter value with the new value for chosen filter
              filterLi.querySelector('.filter-count').innerHTML = `(${priceRanges[filterAttr]})`;
              filterLi.classList.remove('hide');
            } else {
              filterLi.classList.add('hide');
            }
          } else if (key === COLOR_ATTRIBUTE) {
            if (filterValue[filterAttr] !== undefined) {
              filterLi.querySelector('.filter-count').innerHTML = `(${value})`;
              filterLi.classList.remove('hide');
            } else {
              filterLi.classList.add('hide');
            }
          } else if (key === RATING_ATTRIBUTE) {
            if (filterValue[filterAttr] !== undefined) {
              filterLi.querySelector(`.rating-value-${filterAttr}`).innerHTML = `(${response.results[i].facets[`${getAttributeNameByPage(key)}`][filterAttr]})`;
              filterLi.classList.remove('hide');
            } else {
              filterLi.classList.add('hide');
            }
          } else if (filterValue[filterAttr] !== undefined) {
            // rewrite the filter value with the new value for chosen filter
            filterLi.querySelector('.filter-count').innerHTML = `(${value})`;
            filterLi.classList.remove('hide');
          } else {
            filterLi.classList.add('hide');
          }
        });

        addTopSpaceToTheFirstItem(key);
      });
    }
  }
}

/**
 * Build hits
 *
 * @param response
 * @param replace
 * @param isWishlist
 * @param config
 * @param placeholdersList
 */
let positionindex = 0;
export function buildHits(response, replace = true, isWishlist = false, config = productListingConfig, placeholdersList = {}) {
  const block = document.body.querySelector('.algolia-product-listing.block') || document.body.querySelector('.wishlist.block');
  const productsContainer = block.querySelector('.products-container');
  const itemCountParagraph = !isWishlist ? block.querySelector('.result-count-mobile > p') : '';

  if (Object.keys(placeholdersList).length > 0) {
    placeholders = placeholdersList;
  }

  if (replace) {
    productListingPage = 0;
    productsContainer.innerHTML = '';
    if (!isWishlist) {
      itemCountParagraph.innerHTML = `${response.results[0].nbHits} items`;
    }
  }
  response?.results[0]?.hits?.forEach(async (product, _, list) => {
    const productCollection = (Object.keys(product.attr_product_collection).includes(productListingLanguage)) ? product.attr_product_collection[productListingLanguage] : product.attr_product_collection;
    const productTitle = product.title[productListingLanguage] ? product.title[productListingLanguage] : product.title;
    const productUrl = product.url[productListingLanguage] ? product.url[productListingLanguage] : product.url;
    const productPromotions = product.promotions[productListingLanguage] ? product.promotions[productListingLanguage] : product.promotions;
    const swatchStyle = config['plp-swatch-style'];
    const htmlTemplate = `
        <div class="product-image-container">
          #productlabel#
          #images#
          #overlay#
        </div>
        <div class="wishlist-button-wrapper ${isWishlist ? 'in-wishlist' : ''}" data-product='${JSON.stringify({ sku: product.sku, name: productTitle })}'>
          ${!isWishlist ? `<div class="wishlist-icon corner-align">${placeholders.plpAddToFavourite}</div>` : ''}
        </div>
        ${swatchStyle === 'square' ? `<div class="color-swatch-container ${swatchStyle}">#swatches#</div>` : ''}
        <div class="product-item-info">
            ${productCollection ? '<p class="product-item-collection">#collection#</p>' : ''}
            <a class="product-item-title" data-link='pdp' title='${productTitle}' href="${productUrl?.replace('.html', '') || '#'}">
              <h6>#title#</h6>
            </a>
            #rating#
            #pricing#
            #promotions#
        </div>
        ${swatchStyle === 'circle' ? `<div class="color-swatch-container ${swatchStyle}">#swatches#</div>` : ''}
      `;
    let productItemHtml = htmlTemplate.replace('#images#', buildProductImagesHTML(product, config, isWishlist));
    productItemHtml = productItemHtml.replace('#overlay#', buildOutOfStockHTML(product, isWishlist));
    productItemHtml = productItemHtml.replace('#productlabel#', buildProductLabelHTML(product));
    productItemHtml = productItemHtml.replace('#swatches#', buildSwatchHTML(product, config));
    productItemHtml = productItemHtml.replace('#collection#', productCollection);
    productItemHtml = productItemHtml.replace('#title#', productTitle);
    productItemHtml = productItemHtml.replace('#rating#', buildRatingHTML(product, config));
    productItemHtml = productItemHtml.replace('#pricing#', await buildPricingHTML(product));
    productItemHtml = productItemHtml.replace('#promotions#', buildPromotionsHTML(productPromotions));

    const productItemDiv = document.createElement('div');
    productItemDiv.classList.add('product-item');
    productItemDiv.dataset.insightsQueryId = response?.results?.[0]?.queryID;
    positionindex += 1;
    productItemDiv.setAttribute('data-index', positionindex);
    productItemDiv.innerHTML = productItemHtml;

    // add event listeners
    productItemDiv.querySelector('.wishlist-button-wrapper').addEventListener('click', async (event) => {
      if (event.target.classList.contains('disabled')) {
        return;
      }
      event.target.classList.add('disabled');
      const { updateWishlist } = await import('../../scripts/wishlist/api.js');
      const { product: currentProduct } = !isWishlist ? event.target.parentElement.dataset : event.target.dataset;
      const wishListIconState = event.target.classList.contains('in-wishlist');
      updateWishlist(JSON.parse(currentProduct), wishListIconState).then(({ status, message }) => {
        console.debug(message);
        if (status) {
          if (wishListIconState) {
            event.target.classList.remove('in-wishlist');
          } else {
            event.target.classList.add('in-wishlist');
          }
          const indexVal = event.target.closest('.product-item').getAttribute('data-index');
          datalayerAddToWishlistEvent(!wishListIconState, product, !isWishlist ? 'plp' : 'wishlist', indexVal);
        }
        event.target.classList.remove('disabled');
      });
    });
    productItemDiv.querySelectorAll('.swatch').forEach((color) => {
      color.addEventListener('click', (e) => handleSwatchSelector(e, config, isWishlist));
    });
    productItemDiv.querySelectorAll('.color-swatch-container button').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        handleSwatchCarousel(e, productTitle, product.sku);
      });
    });
    productItemDiv.querySelectorAll('.product-carousel-buttons button').forEach((btn) => {
      btn.addEventListener('click', handleImageCarouselButton);
    });
    const imageContainer = productItemDiv.querySelector('.product-image-container');
    if (imageContainer.querySelectorAll('.item-images img').length > 1) {
      addImageClones(imageContainer.querySelector('.item-images'));
    }
    addImageListeners(imageContainer);
    productItemDiv.querySelectorAll('a[data-link="pdp"]').forEach((pdpLink) => {
      pdpLink?.addEventListener('click', () => {
        const indexVal = pdpLink?.parentNode?.parentNode?.getAttribute('data-index');
        datalayerSelectItemListEvent(product, list.length, indexVal);
        sessionStorage.setItem('scroll', window.scrollY);
      });
    });
    productsContainer.appendChild(productItemDiv);
  });
  checkSwatchCarouselButtons();
}

/**
 * Updates wishlist icons based on the current wishlist by fetching the wishlist data and adjusting
 * the display of icons for each product.
 *
 */
const updateWishlistIcons = () => {
  import('../../scripts/wishlist/api.js').then(({ getWishlist }) => {
    // Fetch wishlist
    getWishlist().then((wishlist) => {
      const wishlistSKUs = wishlist.items.map((item) => item.sku);

      // Select all wishlist button wrappers
      const wishlistButtonWrappers = document.querySelectorAll('.wishlist-button-wrapper');

      wishlistButtonWrappers.forEach((wrapper) => {
        const productData = JSON.parse(wrapper.getAttribute('data-product'));
        const productSKU = productData.sku;
        const wishlistIcon = wrapper.querySelector('.wishlist-icon');
        // Add or remove the 'in-wishlist' class based on SKU presence in wishlist
        if (wishlistSKUs.includes(productSKU)) {
          wishlistIcon.classList.add('in-wishlist');
        } else {
          wishlistIcon.classList.remove('in-wishlist');
        }
      });
    });
  });
};

/**
 * Method to check if the filter has any active element
 */
function filterContainsActiveItem(filterAttribute) {
  let hasActiveCheckbox = false;
  const filter = document.querySelectorAll(`[data-attribute="${filterAttribute}"]`);
  for (let i = 0; i < filter.length; i += 1) {
    const filterLiElement = filter[i];
    const filterValueElement = filterLiElement.querySelectorAll('ul > li');
    for (let filterLiIndex = 0; filterLiIndex < filterValueElement.length; filterLiIndex += 1) {
      if (filterValueElement[filterLiIndex].classList.contains('active-checkbox')) {
        hasActiveCheckbox = true;
        break;
      }
    }

    if (hasActiveCheckbox) {
      break;
    }
  }
  return hasActiveCheckbox;
}

/**
 * Hide additional filters and the 'all filters' button
 */
function hideExtraFilters() {
  const mainFilter = document.querySelector('ul.filters-body');
  const filterElements = mainFilter.querySelectorAll('li.page-filters:not(.hide)');
  filterElements.forEach((li, index) => {
    if (index >= MAX_FILTER_ITEMS) {
      li.classList.add('hide');
    }
  });
  const allFilter = mainFilter.querySelector('li.filters-icon');
  const filterLi = document.querySelectorAll('.filters-body-main-ul > li:not(.hide)');
  if (filterLi.length <= MAX_FILTER_ITEMS) {
    allFilter.classList.add('hide');
  } else {
    allFilter.classList.remove('hide');
  }
}

/**
 * Check if filter value applicable to url
 *
 * @param filterAttr
 * @param filterKey
 * @returns {boolean}
 */
function isFilterNotApplicableToUrl(filterAttr, filterKey) {
  return (productListingLanguage !== DEFAULT_LANGUAGE) && !/^\d+$/.test(filterKey) && filterAttr !== PRICE_ATTRIBUTE;
}

function removeFilterFromUrl(filterAttr, filterKey) {
  const urlSplit = window.location.href.split('/--').slice(1);
  let key = filterKey;
  if (COLOR_ATTRIBUTE.includes(filterAttr.replace('attr_', ''))) {
    [key] = filterKey.split(',');
  }
  if (findValueInObject(key)) {
    const aliasValue = findValueInObject(key);
    key = aliasValue.alias;
  } else {
    if (isFilterNotApplicableToUrl(filterAttr, key)) {
      return;
    }
    key = filterKey.toLowerCase().replace(/ /g, '__').replace(/\//g, '_').replace(/-/g, '_');
  }
  let resultUrl = window.location.href;
  let attr;

  if (filterAttr.includes('price')) {
    attr = 'price';
    [key] = filterKey.split(' - ');
  } else {
    attr = filterAttr.replace('attr_', '');
  }

  urlSplit.forEach((facet) => {
    if (facet.includes(attr) && facet.includes(key)) {
      const facetSplit = facet.split('-');
      // single filter for the selected attr
      if (facetSplit.length === 2) {
        resultUrl = resultUrl.replace(`/--${attr}-${key}`, '');
      } else {
        const facetRemoved = facetSplit.filter((item) => item !== key).join('-');
        resultUrl = resultUrl.replace(facet, facetRemoved);
      }
    }
  });
  window.history.replaceState(null, '', resultUrl);
}

function writeFilterToUrl(filterAttr, filterKey) {
  let attr;
  let key = filterKey;
  if (filterAttr !== PRICE_ATTRIBUTE) {
    attr = filterAttr.replace('attr_', '');
    if (filterAttr.includes(COLOR_ATTRIBUTE)) {
      [key] = filterKey.split(',');
    }
    if (findValueInObject(key)) {
      const aliasIndex = findValueInObject(key);
      key = aliasIndex.alias;
    } else {
      if (isFilterNotApplicableToUrl(filterAttr, filterKey)) {
        return;
      }
      key = key.toLowerCase().replace(/ /g, '__');
      key = key.toLowerCase().replace(/\//, '_');
      key = key.replace(/-/g, '_');
    }
  } else {
    attr = filterAttr.replace('final_', '');
    key = filterKey.split('-')[0].trim();
  }

  const combinedString = `--${attr}-${key}`;
  let resultUrl = '';
  if (!window.location.href.includes(`--${attr}-`)) {
    resultUrl = buildUrlWithFilters(combinedString);
  } else {
    let urlWithoutSearchParam = window.location.href;
    const queryIndex = window.location.href.indexOf('?');
    if (queryIndex !== -1) {
      urlWithoutSearchParam = window.location.href.slice(0, queryIndex);
    }
    const urlSplit = urlWithoutSearchParam.split('/');
    let updatedUrl = '';
    urlSplit.forEach((part) => {
      if (part.includes('--price-') && attr.includes('price')) {
        updatedUrl += `--price-${key}/`;
      } else if (part.includes(`--${attr}-`) && !part.includes(`-${key}`)) {
        updatedUrl += `${part}-${key}/`;
      } else {
        updatedUrl += `${part}/`;
      }
    });
    resultUrl = updatedUrl;
  }
  resultUrl = resultUrl.replace(/\/+$/, '');
  window.history.pushState({}, '', resultUrl + window.location.search);
}

/**
 * Build the checkbox filter
 *
 * @param response
 * @param values
 * @param sortBy
 * @param filterAttr
 * @param ulDiv
 */
function buildCheckboxFilter(response, values, sortBy, filterAttr, ulDiv, gtmFilterTitle) {
  const idx = response.results.length > 1 ? response.results.length - 1 : 0;

  const sortOrderLeftValues = {};
  if (sortBy === 'custom') {
    Object.entries(response.results[idx].renderingContent.facetOrdering.values[`${getAttributeNameByPage(filterAttr)}`].order)
      .forEach(([, filterKey]) => {
        if (values[filterKey] !== undefined) {
          sortOrderLeftValues[filterKey] = values[filterKey];
          // create a li for each filter value
          const filterLi = document.createElement('li');
          filterLi.classList.add('filter-item');

          filterLi.setAttribute('aria-label', filterKey);
          filterLi.setAttribute('data-filter-attr-name', filterAttr.toLowerCase());
          filterLi.setAttribute('data-filter-attr-value', filterKey.toLowerCase());
          filterLi.innerHTML = filterKey;

          const countSpan = document.createElement('span');
          countSpan.classList.add('filter-count');
          countSpan.innerHTML = `(${values[filterKey]})`;
          filterLi.append(countSpan);

          filterLi.addEventListener('click', async (e) => {
            let isActive = true;
            document.querySelectorAll(`[data-filter-attr-name="${filterAttr}"][data-filter-attr-value="${filterKey.toLowerCase()}"]`)
              .forEach((filterItem) => {
                filterItem.classList.toggle('active-checkbox');
                if (!filterItem.classList.contains('active-checkbox')) {
                  isActive = false;
                }
              });
            if (isActive) {
              writeFilterToUrl(filterAttr, filterKey);
            } else {
              removeFilterFromUrl(filterAttr, filterKey);
            }
            // eslint-disable-next-line no-use-before-define
            await makeRequestToAlgolia();

            e.stopPropagation(); // prevent parent li click event
            // build Algolia request with the selected filter
            datalayerFilterEvent(gtmFilterTitle, filterKey, CURRENT_CATEGORY);
          });

          // append filter value li to filter values ul
          ulDiv.append(filterLi);
        }
      });
  }
  Object.entries(values).forEach(([filterKey, filterValue]) => {
    if (sortOrderLeftValues[filterKey] !== undefined) {
      return;
    }
    // create a li for each filter value
    const filterLi = document.createElement('li');
    let filterKeyLabel = filterKey;
    let filterKeyValue = filterValue;
    filterLi.classList.add('filter-item');
    if (Object.keys(filterValue).length > 1) {
      filterKeyLabel = filterValue.label;
      filterKeyValue = filterValue.value;
    }
    filterLi.setAttribute('aria-label', filterKeyLabel);
    filterLi.setAttribute('data-filter-attr-name', filterAttr.toLowerCase());
    filterLi.setAttribute('data-filter-attr-value', filterKeyLabel.toLowerCase());

    filterLi.innerHTML = filterKeyLabel;

    const countSpan = document.createElement('span');
    countSpan.classList.add('filter-count');
    countSpan.innerHTML = `(${filterKeyValue})`;
    filterLi.append(countSpan);

    filterLi.addEventListener('click', async (e) => {
      let isActive = true;
      document.querySelectorAll(`[data-filter-attr-name="${filterAttr}"][data-filter-attr-value="${filterKeyLabel.toLowerCase()}"]`)
        .forEach((filterItem) => {
          filterItem.classList.toggle('active-checkbox');
          if (!filterItem.classList.contains('active-checkbox')) {
            isActive = false;
          }
        });
      if (isActive) {
        writeFilterToUrl(filterAttr, filterKeyLabel);
      } else {
        removeFilterFromUrl(filterAttr, filterKeyLabel);
      }
      // eslint-disable-next-line no-use-before-define
      await makeRequestToAlgolia();

      e.stopPropagation(); // prevent parent li click event
      // build Algolia request with the selected filter
      datalayerFilterEvent(gtmFilterTitle, filterKeyLabel, CURRENT_CATEGORY);
    });

    // append filter value li to filter values ul
    ulDiv.append(filterLi);
  });
}

/**
 * Resort filter values by count or alphabetically
 *
 * @param response
 * @param attrName
 * @param sortBy
 * @returns {{}|*}
 */
function resortFilterValues(response, attrName, sortBy) {
  let values = response.results[0].facets[getAttributeNameByPage(attrName)];
  if (response.results.length > 1) {
    values = {};
    for (let i = 0; i < response.results.length; i += 1) {
      values = { ...values, ...response.results[i].facets[`${getAttributeNameByPage(attrName)}`] };
    }
  }
  if (sortBy === 'count') {
    return Object.keys(values)
      .sort((a, b) => values[b] - values[a])
      .reduce((acc, key) => {
        acc[key] = values[key];
        return acc;
      }, {});
  } if (sortBy === 'alpha') {
    return Object.keys(values)
      .sort()
      .reduce((acc, key) => {
        acc[key] = values[key];
        return acc;
      }, {});
  } if (sortBy === 'alphadesc') {
    const keys = Object.keys(values);
    keys.sort((a, b) => b.localeCompare(a));
    const sortedObj = {};
    keys.forEach((key) => {
      sortedObj[key] = values[key];
    });
    return sortedObj;
  } if (sortBy === 'custom') {
    // TODO implement custom sorting
  }
  return values;
}

/**
 * Build the rating filter
 *
 * @param values
 * @param filterAttr
 * @param ulDiv
 */
function buildRatingFilters(values, filterAttr, ulDiv, gtmFilterTitle) {
  Object.entries(values).forEach(([filterKey, filterValue]) => {
    const filterLi = document.createElement('li');
    filterLi.classList.add('filter-item');
    filterLi.classList.add('filter-item-rating');
    filterLi.setAttribute('data-filter-attr-name', filterAttr);

    const countOfStart = filterKey.split('_')[1];

    const starsCount = document.createElement('span');
    starsCount.classList.add('filter-count-stars');
    starsCount.innerHTML = buildRatingValues(filterKey);

    filterLi.appendChild(starsCount);

    for (let i = 0; i < 5; i += 1) {
      const starSpan = document.createElement('span');
      starSpan.classList.add(`${i < countOfStart ? 'star-filled' : 'star-empty'}`);
      filterLi.appendChild(starSpan);
    }
    const ratingValueSpan = document.createElement('span');
    ratingValueSpan.innerHTML = ` (${filterValue})`;
    ratingValueSpan.classList.add(`rating-value-${filterKey}`);
    ratingValueSpan.classList.add('filter-count'
      + '');
    filterLi.appendChild(ratingValueSpan);
    filterLi.setAttribute('data-filter-attr-value', filterKey);

    filterLi.addEventListener('click', (e) => {
      document.querySelectorAll(`[data-filter-attr-name="${filterAttr}"][data-filter-attr-value="${filterKey}"]`)
        .forEach((filterItem) => {
          filterItem.classList.toggle('active-checkbox');
        });
      // eslint-disable-next-line no-use-before-define
      makeRequestToAlgolia();
      e.stopPropagation(); // prevent parent li click event
      // build Algolia request with the selected filter
      datalayerFilterEvent(gtmFilterTitle, filterKey, CURRENT_CATEGORY);
    });

    ulDiv.appendChild(filterLi);
  });
}

/**
 * Build the checkbox price range filter
 *
 * @param values
 * @param filterAttr
 * @param ulDiv
 */
function buildCheckboxPriceRangeFilter(values, filterAttr, ulDiv, gtmFilterTitle) {
  const ranges = getRangeValues(values);

  Object.entries(ranges).forEach(([rangeKey, rangeValue]) => {
    const filterLi = document.createElement('li');
    filterLi.classList.add('filter-item');

    filterLi.setAttribute('aria-label', rangeKey);
    filterLi.setAttribute('data-filter-attr-name', filterAttr);
    filterLi.setAttribute('data-filter-attr-value', rangeKey);
    const rangeWithCurrency = buildPriceRangeValuesWithCurrency(rangeKey);
    filterLi.innerHTML = rangeWithCurrency;

    const countSpan = document.createElement('span');
    countSpan.classList.add('filter-count');
    countSpan.innerHTML = `(${rangeValue})`;
    filterLi.append(countSpan);

    filterLi.addEventListener('click', async (e) => {
      let isActive = true;
      document.querySelectorAll(`[data-filter-attr-name="${filterAttr}"][data-filter-attr-value="${rangeKey}"]`)
        .forEach((filterItem) => {
          filterItem.classList.toggle('active-checkbox-price-range');
          if (!filterItem.classList.contains('active-checkbox-price-range')) {
            isActive = false;
          }
        });
      if (isActive) {
        writeFilterToUrl(filterAttr, rangeKey);
      } else {
        removeFilterFromUrl(filterAttr, rangeKey);
      }
      document.querySelectorAll(`[data-filter-attr-name="${filterAttr}"]`)
        .forEach((filterItem) => {
          const attrName = filterItem.getAttribute('data-filter-attr-name');
          const attrValue = filterItem.getAttribute('data-filter-attr-value');
          if (attrName === filterAttr && attrValue !== rangeKey) {
            filterItem.classList.remove('active-checkbox-price-range');
          }
        });
      // build Algolia request with the selected filter
      // eslint-disable-next-line no-use-before-define
      await makeRequestToAlgolia();
      e.stopPropagation(); // prevent parent li click event
      datalayerFilterEvent(gtmFilterTitle, rangeWithCurrency, CURRENT_CATEGORY);
    });
    // append filter value li to filter values ul
    ulDiv.append(filterLi);
  });
}

/**
 * Build the swatcher filter
 *
 * @param values
 * @param filterAttr
 * @param ulDiv
 */
function buildSwatcherFilter(values, filterAttr, ulDiv, gtmFilterTitle) {
  const filterAttrEdited = `${getAttributeNameByPage(filterAttr)}.value`;
  Object.entries(values).forEach(([filterKey, filterValue]) => {
    const colorValues = filterKey.split(',');
    if (!colorValues[1]) {
      return;
    }
    const colorTitle = colorValues[0].trim();
    const color = colorValues[1].replace('swatch_color:', '').trim();

    // create a li for each filter value
    const filterLi = document.createElement('li');
    filterLi.classList.add('filter-item');
    filterLi.classList.add('filter-item-color');

    const colorSpan = document.createElement('span');
    colorSpan.classList.add('color-span');
    colorSpan.style.backgroundColor = color;

    filterLi.setAttribute('aria-label', filterKey);
    filterLi.setAttribute('data-filter-attr-name', filterAttrEdited);
    filterLi.setAttribute('data-filter-attr-value', colorTitle);
    filterLi.appendChild(colorSpan);

    const colorSpanCount = document.createElement('span');
    colorSpanCount.setAttribute('id', `color-span-count-${colorTitle}`);
    colorSpanCount.innerHTML = `${colorTitle}`;
    filterLi.appendChild(colorSpanCount);

    const countSpan = document.createElement('span');
    countSpan.classList.add('filter-count');
    countSpan.innerHTML = `(${filterValue})`;
    filterLi.append(countSpan);

    filterLi.addEventListener('click', async (e) => {
      let isActive = true;
      document.querySelectorAll(`[data-filter-attr-name="${filterAttrEdited}"][data-filter-attr-value="${colorTitle}"]`)
        .forEach((filterItem) => {
          filterItem.classList.toggle('active-checkbox');
          if (!filterItem.classList.contains('active-checkbox')) {
            isActive = false;
          }
        });
      if (isActive) {
        writeFilterToUrl(filterAttr, filterKey);
      } else {
        removeFilterFromUrl(filterAttr, filterKey);
      }
      // build Algolia request with the selected filter
      // eslint-disable-next-line no-use-before-define
      await makeRequestToAlgolia();
      e.stopPropagation(); // prevent parent li click event
      datalayerFilterEvent(gtmFilterTitle, filterKey, CURRENT_CATEGORY);
    });

    // append filter value li to filter values ul
    ulDiv.append(filterLi);
  });
}

function rebuildMissingFilters(response, facetFilters, attrDataName, value, ul) {
  const facetFiltersKey = attrDataName === COLOR_ATTRIBUTE ? `${getAttributeNameByPage(attrDataName)}.value` : attrDataName;
  if (ul.querySelectorAll('li').length < facetFilters[facetFiltersKey].length) {
    const activeSelections = Array.from(ul.querySelectorAll('.active-checkbox, .active-checkbox-price-range')).map((li) => ({
      attributeName: li.getAttribute('data-filter-attr-name'),
      attributeValue: li.getAttribute('data-filter-attr-value'),
    }));
    ul.innerHTML = '';
    const gtmFilterTitle = value.label?.en;
    let sortedValues = [];
    let sortBy = 'alpha';
    let idx;
    if (value.widget.type === 'checkbox') {
      const attrOrder = response.results[0].renderingContent.facetOrdering.values[attrDataName];
      if (attrOrder !== undefined) {
        if (attrOrder.order !== undefined) {
          sortBy = 'custom';
        } else {
          sortBy = attrOrder.sortRemainingBy;
        }
      }
      sortedValues = resortFilterValues(response, attrDataName, sortBy);
      buildCheckboxFilter(
        response,
        sortedValues,
        sortBy,
        attrDataName,
        ul,
        gtmFilterTitle,
      );
    } else if (value.widget.type === 'star_rating') {
      sortedValues = resortFilterValues(response, attrDataName, 'alphadesc');
      buildRatingFilters(
        sortedValues,
        attrDataName,
        ul,
        gtmFilterTitle,
      );
    } else if (value.widget.type === 'range_checkbox') {
      idx = getResultsIndex(response, `${getAttributeNameByPage(attrDataName)}`);
      buildCheckboxPriceRangeFilter(
        response.results[idx].facets[`${getAttributeNameByPage(attrDataName)}`],
        attrDataName,
        ul,
        gtmFilterTitle,
      );
    } else if (value.widget.type === 'swatch_list') {
      const colorLabel = facetFiltersKey.replace('.value', '.label');
      idx = getResultsIndex(response, colorLabel);
      buildSwatcherFilter(
        response.results[idx].facets[colorLabel],
        attrDataName,
        ul,
        gtmFilterTitle,
      );
    }
    activeSelections.forEach((attr) => {
      ul.querySelector(`[data-filter-attr-name="${attr.attributeName}"][data-filter-attr-value="${attr.attributeValue}"]`).classList.add(`active-checkbox${attr.attributeName === PRICE_ATTRIBUTE ? '-price-range' : ''}`);
    });
  }
}

/**
 * Build all filters from the response, chosen filters will be rewritten with the new values
 *
 * @param response
 */
async function buildAllFilters(response) {
  const promises = Object.entries(response.results[0].renderingContent.facetOrdering.facets.order)
    .map(async ([, attributeName]) => {
      await performanceYield();
      const attributeNameWithoutLanguage = attributeName.replace(`.${productListingLanguage}`, '').trim();
      const value = response.results[0].userData[0].facets_config[attributeNameWithoutLanguage];

      let filterValues = response.results[0].facets[attributeName];
      // iterate all of the arrays within the response to merge the facets and its values
      response.results.forEach((result) => {
        let tempAttributeName = attributeName;
        if (attributeNameWithoutLanguage === COLOR_ATTRIBUTE) {
          tempAttributeName = `${getAttributeNameByPage(COLOR_ATTRIBUTE)}.value`;
          filterValues = response.results[0].facets[tempAttributeName];
        }
        const filterValuesFromResult = result.facets[tempAttributeName];
        if (filterValuesFromResult !== undefined) {
          Object.keys(filterValuesFromResult).forEach((filterVal) => {
            if (filterValues[filterVal] === undefined) {
              filterValues[filterVal] = filterValuesFromResult[filterVal];
            }
          });
        }
      });
      const hiddenFilterList = productListingConfig['algolia-hidden-filters']?.split(',');
      if (value !== undefined && filterValues !== undefined
        && (hiddenFilterList === undefined || !hiddenFilterList.includes(value.label[productListingLanguage]))) {
        if (Object.keys(filterValues).length <= 1
          && attributeNameWithoutLanguage !== PRICE_ATTRIBUTE
          && !filterContainsActiveItem(attributeNameWithoutLanguage)) {
          document.querySelectorAll(`[data-attribute="${attributeNameWithoutLanguage}"]`).forEach((filter) => {
            if (attributeNameWithoutLanguage !== PRICE_ATTRIBUTE) {
              filter.classList.add('hide');
            }
          });
        } else {
          document.querySelectorAll(`[data-attribute="${attributeNameWithoutLanguage}"]`).forEach((filter) => {
            if (filter.parentElement.classList.contains('filters-body')) {
              if (Array.from(filter.parentElement.children).indexOf(filter) < MAX_FILTER_ITEMS
                || filter.parentElement.querySelectorAll('li.page-filters:not(.hide)').length < MAX_FILTER_ITEMS) {
                filter.classList.remove('hide');
              }
            } else {
              filter.classList.remove('hide');
            }
          });
          const facetFilters = {};

          if (attributeNameWithoutLanguage === PRICE_ATTRIBUTE) {
            const priceRanges = getRangeValues(filterValues);
            Object.entries(priceRanges).forEach(([filterValue]) => {
              if (facetFilters[attributeNameWithoutLanguage] === undefined) {
                facetFilters[attributeNameWithoutLanguage] = [filterValue];
              } else {
                facetFilters[attributeNameWithoutLanguage].push(filterValue);
              }
            });
          } else if (attributeNameWithoutLanguage === COLOR_ATTRIBUTE) {
            const colorFilterattributeNameWithoutLanguage = `${getAttributeNameByPage(COLOR_ATTRIBUTE)}.value`;
            Object.entries(filterValues).forEach(([filterValue]) => {
              const filterValueLower = filterValue.toLowerCase();
              if (facetFilters[colorFilterattributeNameWithoutLanguage] === undefined) {
                facetFilters[colorFilterattributeNameWithoutLanguage] = [filterValueLower];
              } else {
                facetFilters[colorFilterattributeNameWithoutLanguage].push(filterValueLower);
              }
            });
          } else {
            Object.entries(filterValues).forEach(([filterValue]) => {
              const filterValueLower = filterValue;
              if (facetFilters[attributeNameWithoutLanguage] === undefined) {
                facetFilters[attributeNameWithoutLanguage] = [filterValueLower];
              } else {
                facetFilters[attributeNameWithoutLanguage].push(filterValueLower);
              }
            });
          }
          const attrDataName = attributeNameWithoutLanguage;
          let allAttributeUls = document.querySelectorAll(`[data-attribute="${attrDataName}"] .filters-values-ul`);
          if (!document.querySelector(`[data-attribute="${attrDataName}"]`)) {
            // doesnt exist, create new
            const mainUL = document.querySelector('.filters-body-main-ul');
            const filterTitle = value.label[productListingLanguage];
            const attrToAdd = document.createElement('li');
            const filterValuesPopupTitle = document.querySelector('#filters-values-popup-title .filters-title');
            attrToAdd.addEventListener('click', () => {
              filterValuesPopupTitle.innerHTML = value.label[productListingLanguage];
              showFilterValues(attrToAdd); // show filter values popup
            });

            const mainLiSortSpan = document.createElement('span');
            mainLiSortSpan.classList.add('main-filter-title-span');
            mainLiSortSpan.innerHTML = filterTitle;

            const spanSortChoseValues = document.createElement('span');
            spanSortChoseValues.classList.add('main-filter-chose-values');

            const filterUl = document.createElement('ul');
            filterUl.classList.add('filters-values-ul');

            attrToAdd.setAttribute('aria-label', filterTitle);
            attrToAdd.setAttribute('data-attribute', attrDataName);
            attrToAdd.appendChild(mainLiSortSpan);
            attrToAdd.appendChild(spanSortChoseValues);
            attrToAdd.appendChild(filterUl);
            mainUL.appendChild(attrToAdd);

            allAttributeUls = document.querySelectorAll(`[data-attribute="${attrDataName}"] .filters-values-ul`);
          }
          allAttributeUls.forEach((ul) => {
            rebuildMissingFilters(response, facetFilters, attrDataName, value, ul);
          });

          document.querySelectorAll(`[data-attribute="${attributeNameWithoutLanguage}"] ul > li`).forEach((filterLi) => {
            const attrName = filterLi.getAttribute('data-filter-attr-name').toLowerCase();
            const attrValue = filterLi.getAttribute('data-filter-attr-value').toLowerCase();
            let idx;
            if (attributeName.includes(COLOR_ATTRIBUTE)) {
              idx = getResultsIndex(response, `${attributeName}.value`);
            } else {
              idx = getResultsIndex(response, attributeName);
            }

            if (
              facetFilters[attrName] === undefined
              || !facetFilters[attrName].map((item) => item.toLowerCase()).includes(attrValue)
            ) {
              if (document.querySelectorAll(`.filters-body-main-ul [data-attribute="${attributeNameWithoutLanguage}"] ul > li.active-checkbox`).length === 0) {
                if (attributeNameWithoutLanguage !== 'final_price') {
                  filterLi.classList.add('hide');
                }
              }
            } else if (attributeNameWithoutLanguage === PRICE_ATTRIBUTE) {
              const priceRanges = getRangeValues(response.results[idx].facets[`${getAttributeNameByPage(attributeNameWithoutLanguage)}`]);
              filterLi.querySelector('.filter-count').innerHTML = `(${priceRanges[attrValue]})`;
              filterLi.classList.remove('hide');
              const priceSplit = attrValue.split(' - ');
              if (urlPrice && priceSplit[0].replace(/ /g, '') === urlPrice.split(' - ')[0]) {
                filterLi.classList.add('active-checkbox-price-range');
              }
            } else if (attributeNameWithoutLanguage === RATING_ATTRIBUTE) {
              filterLi.querySelector(`.rating-value-${attrValue}`).innerHTML = `(${response.results[0].facets[`${getAttributeNameByPage(attributeNameWithoutLanguage)}`][attrValue]})`;
              filterLi.classList.remove('hide');
            } else if (attributeNameWithoutLanguage === COLOR_ATTRIBUTE) {
              filterLi.querySelector('.filter-count').innerHTML = `(${response.results[0].facets[`${getAttributeNameByPage(COLOR_ATTRIBUTE)}.value`][attrValue]})`;
              filterLi.classList.remove('hide');
            } else {
              const lowercaseFacets = Object.fromEntries(
                Object.entries(response.results[idx].facets[attributeName])
                  .map(([key, val]) => [key.toLowerCase(), val]),
              );
              filterLi.querySelector('.filter-count').innerHTML = `(${Object.keys(lowercaseFacets[attrValue]).length >= 1 ? lowercaseFacets[attrValue].value : lowercaseFacets[attrValue]})`;
              filterLi.classList.remove('hide');
            }
          });
        }
      } else if (document.querySelector(`[data-attribute="${attributeNameWithoutLanguage}"]`) !== null) {
        document.querySelectorAll(`[data-attribute="${attributeNameWithoutLanguage}"]`)
          .forEach((filterLi) => {
            filterLi.classList.add('hide');
          });
      }
      if (response.results[0]) {
        const params = response.results[0].params.split('&');
        const facetsApplied = Object.fromEntries(params.map((item) => item.split('='))).facetFilters;
        if (facetsApplied) {
          JSON.parse(facetsApplied).forEach((subArr) => {
            subArr.forEach((facet) => {
              const facetSplit = facet.split(':');
              if (facetSplit[0].includes(COLOR_ATTRIBUTE)) {
                document.querySelectorAll(`[data-filter-attr-name="${facetSplit[0]}"][data-filter-attr-value="${facetSplit[1].toLowerCase()}"]`).forEach((li) => {
                  li.classList.add('active-checkbox');
                  if (li.parentElement.closest('li')) {
                    li.parentElement.closest('li').classList.remove('hide');
                  }
                });
              } else if (facetSplit[0] === PRICE_ATTRIBUTE) {
                document.querySelectorAll(`[data-filter-attr-name="${facetSplit[0]}"][data-filter-attr-value^="${facetSplit[1]}"]`).forEach((li) => {
                  li.classList.add('active-checkbox-price-range');
                  if (li.parentElement.closest('li')) {
                    li.parentElement.closest('li').classList.remove('hide');
                  }
                });
              } else {
                document.querySelectorAll(`[data-filter-attr-name="${facetSplit[0].replace(`.${productListingLanguage}`, '')}"][data-filter-attr-value="${decodeURIComponent(facetSplit[1].toLowerCase())}"]`).forEach((li) => {
                  li.classList.add('active-checkbox');
                  if (li.parentElement.closest('li')) {
                    li.parentElement.closest('li').classList.remove('hide');
                  }
                });
              }
            });
          });
        }
      }
      editFilterValuesAtTheMainContainer();
      buildChosenFilterValuesOnMainPage();
    });

  await Promise.all(promises);
  await hideExtraFilters();
}

function checkUrlFacets() {
  const urlKey = buildUrlKey().replace(EXCLUDED_CATEGORIES.join(','), '').replace(/\/{1,2}$/, '');
  const [, facetsFound] = urlKey.split(/(\/--.+)/).filter(Boolean);
  const facetsFoundArray = facetsFound ? facetsFound.split('/--').filter(Boolean) : [];

  facetsFoundArray.forEach((facet) => {
    const [attrName, ...values] = facet.split(/-(?=.+)/);

    values.forEach((value) => {
      let filterValue = value;
      if (PRICE_ATTRIBUTE.includes(attrName)) {
        urlPrice = `${value} - ${parseInt(filterValue, 10) + 5}`;
      } else {
        const filterValueObject = findValueInObject(filterValue);
        if (filterValueObject) {
          filterValue = filterValueObject[productListingLanguage];
        }
        if (!SIZE_ATTRIBUTE.includes(attrName)) {
          filterValue = filterValue.replace(/__/g, '%20');
        }
        const encodedValue = safeEncodeURIComponent(filterValue.replace(/_/g, '%2D'));
        urlFacets.push(`${attrName}-${encodedValue}`);
        urlFacets.push(`${attrName}-${safeEncodeURIComponent(filterValue.replace(/_/g, '%2F'))}`);
      }
    });
  });
}

/**
 * Build checked filters from the response
 */
async function makeRequestToAlgolia(replaceProducts = true) {
  showLoader();
  if (replaceProducts) {
    productListingPage = 0;
  }
  checkUrlFacets();
  const data = await buildAlgoliaRequest();
  const algoliaUrl = await buildAlgoliaIndexUrl(productListingConfig);
  postJSON(algoliaUrl, data)
    .then((response) => {
      if (
        response.results[0].facets === undefined
        || response.results[0].userData[0] === undefined
      ) {
        noProductsFound();
      }
      buildHits(response, replaceProducts);
      dataLayerViewListEvents(response);
      updateWishlistIcons();
      updatePageLoader(response, placeholders, 'loadMore', replaceProducts);
      buildAllFilters(response);
      buildCheckedFilters(response);
      urlPrice = '';
      disableClearfilters();
      hideLoader();
    });
}

/**
 * Build the sorting filter
 *
 * @param response
 * @param filterValuesPopupTitle
 * @param changePopupTitle
 * @returns {HTMLLIElement}
 */
function buildSortFilter(
  response,
  filterValuesPopupTitle,
  changePopupTitle = false,
) {
  // create a li for sorting since it's separate from the other filters
  const sortingLabel = response.results[0].userData[0].sorting_label[productListingLanguage];
  const sortingLabelLi = document.createElement('li');
  sortingLabelLi.addEventListener('click', () => {
    if (changePopupTitle) {
      filterValuesPopupTitle.innerHTML = sortingLabel;
      showFilterValues(sortingLabelLi); // show filter values popup
    }
  });
  sortingLabelLi.setAttribute('aria-label', sortingLabel);
  sortingLabelLi.setAttribute('data-attribute', 'sorting');

  const mainLiSortSpan = document.createElement('span');
  mainLiSortSpan.classList.add('main-filter-title-span');
  mainLiSortSpan.innerHTML = sortingLabel;
  sortingLabelLi.append(mainLiSortSpan);

  const spanSortChoseValues = document.createElement('span');
  spanSortChoseValues.classList.add('main-filter-chose-values');
  sortingLabelLi.append(spanSortChoseValues);

  const sortingOptionsUl = document.createElement('ul');
  sortingOptionsUl.classList.add('filters-values-ul');
  response.results[0].userData[0].sorting_options.forEach((sortingOption) => {
    const sortingOptionLabel = response.results[0].userData[0].sorting_options_config[sortingOption]
      .label[productListingLanguage];
    const sortingOptionsLi = document.createElement('li');
    sortingOptionsLi.setAttribute('aria-label', sortingOptionLabel);
    sortingOptionsLi.setAttribute('data-sorting-option', sortingOption);
    sortingOptionsLi.setAttribute('data-index', response.results[0].userData[0].sorting_options_config[sortingOption].index[productListingLanguage]);
    if (sortingOption === 'default') {
      sortingOptionsLi.classList.add('filter-radio-active');
    }
    sortingOptionsLi.classList.add('filter-item');
    sortingOptionsLi.classList.add('filter-radio');
    sortingOptionsLi.innerHTML = sortingOptionLabel;

    sortingOptionsLi.addEventListener('click', async (e) => {
      const dataSortingOption = sortingOptionsLi.getAttribute('data-sorting-option');
      document.querySelectorAll('[data-attribute="sorting"] ul li')
        .forEach((sortingLi) => {
          if (sortingLi.getAttribute('data-sorting-option') === dataSortingOption) {
            sortingLi.classList.add('filter-radio-active');
          } else {
            sortingLi.classList.remove('filter-radio-active');
          }
        });
      await makeRequestToAlgolia();
      e.stopPropagation(); // prevent parent li click event
      // build Algolia request with the selected filter
      datalayerSortingEvent(dataSortingOption, buildUrlKey().split('/')?.pop());
    });

    sortingOptionsUl.append(sortingOptionsLi);
  });
  sortingLabelLi.append(sortingOptionsUl);

  return sortingLabelLi;
}

/**
 * Clear all filters
 */
async function clearAllFilters() {
  document.querySelectorAll('.filters-values-ul .filter-item')
    .forEach((filterItem) => {
      // remove active class from all filters
      filterItem.classList.remove('active-checkbox');
      // remove price range filter active class
      filterItem.classList.remove('active-checkbox-price-range');
    });
  document.querySelectorAll('.main-filter-chose-values')
    .forEach((filterChosenText) => {
      // remove all filter values from the main container
      filterChosenText.innerHTML = '';
    });
  window.history.replaceState({}, '', `${window.location.href.split('/--')[0]}${window.location.search}`);
  await makeRequestToAlgolia();
}

/**
 * Create filters on the main category page
 *
 * @param response
 * @param type
 * @param attrName
 * @param attrNameNoLng
 * @param sortedValues
 * @param sortBy
 * @param mainPageFilters
 * @param mainFiltersLi
 */
function createFilterOnMainPage(
  response,
  type,
  attrName,
  attrNameNoLng,
  sortedValues,
  sortBy,
  mainPageFilters,
  mainFiltersLi,
  gtmFilterTitle,
) {
  const mainFilterValuesUlMainPage = document.createElement('ul');
  mainFilterValuesUlMainPage.classList.add('filters-values-ul');

  let idx;
  if (attrNameNoLng.includes(COLOR_ATTRIBUTE)) {
    idx = getResultsIndex(response, `${getAttributeNameByPage(attrNameNoLng)}.label`);
  } else {
    idx = getResultsIndex(response, `${getAttributeNameByPage(attrName)}`);
  }

  switch (type) {
    case 'checkbox':
      buildCheckboxFilter(
        response,
        sortedValues,
        sortBy,
        attrNameNoLng,
        mainFilterValuesUlMainPage,
        gtmFilterTitle,
      );
      break;
    case 'range_checkbox':
      buildCheckboxPriceRangeFilter(
        response.results[idx].facets[attrName],
        attrNameNoLng,
        mainFilterValuesUlMainPage,
        gtmFilterTitle,
      );
      break;
    case 'swatch_list':
      buildSwatcherFilter(
        response.results[idx].facets[`${getAttributeNameByPage(attrNameNoLng)}.label`],
        attrNameNoLng,
        mainFilterValuesUlMainPage,
        gtmFilterTitle,
      );
      break;
    case 'star_rating':
      buildRatingFilters(
        sortedValues,
        attrNameNoLng,
        mainFilterValuesUlMainPage,
        gtmFilterTitle,
      );
      break;
    default:
      buildCheckboxFilter(
        response,
        sortedValues,
        sortBy,
        attrNameNoLng,
        mainFilterValuesUlMainPage,
        gtmFilterTitle,
      );
  }
  const mainFilterLiClone = mainFiltersLi.cloneNode(true);
  mainFilterLiClone.appendChild(mainFilterValuesUlMainPage);
  mainFilterLiClone.classList.add('page-filters');
  if (mainPageFilters.querySelectorAll('li.page-filters').length > 4) {
    mainFilterLiClone.classList.add('hide');
  }
  mainFilterLiClone.addEventListener('click', () => {
    toggleMainPageFilterValues(mainFilterLiClone); // show filter values popup
  });
  mainPageFilters.append(mainFilterLiClone);
}

async function getCategoryData() {
  const urlKey = buildUrlKey().replace(EXCLUDED_CATEGORIES.join(','), '').replace(/\/{1,2}$/, '').split('/--')[0];
  const categoryData = await fetchCategoriesByUrlKey([urlKey]);
  return categoryData;
}

async function buildCategoryPath(categoryData) {
  if (categoryData.commerce_categories.total_count) {
    Object.entries(categoryData.commerce_categories.items[0].breadcrumbs || []).forEach(([, cat]) => {
      categoryPath.push(encodeURIComponent(cat.category_gtm_name));
    });
    categoryPath.push(encodeURIComponent(categoryData.commerce_categories.items[0].gtm_name));
  } else if (!isOfferListing()) {
    await showCommerceErrorPage();
  }
}

async function getPreviewPreaccessData(categoryData) {
  const fields = [
    'preview_sd',
    'preview_ed',
    'preview_category_text',
    'preview_pdp_text',
    'preview_tier_type',
    'preaccess_sd',
    'preaccess_ed',
    'preaccess_tier_type',
  ];
  if (categoryData.commerce_categories.total_count > 0) {
    const item = categoryData.commerce_categories.items[0];
    const result = fields.reduce((acc, field) => {
      acc[field] = item[field] || null;
      return acc;
    }, {});

    return result;
  }
  return Object.fromEntries(fields.map((field) => [field, null]));
}

/**
 * Method to get and store category list name with path
 * and category id to local storage for datalayer.
 * - For PLP pages, adds the category list information.
 * - For SLP, adds the search results string along with referrer information.
 * @param {*} categoryData category response data
 */
function storeCategoryListData(categoryData) {
  const categoryListName = ['PLP'];
  if (isSearchPage() && document.referrer) {
    const referrerPath = new URL(document.referrer).pathname.replace(
      `/${productListingLanguage}/`,
      '/',
    );
    const category = (localStorage.getItem('categoryListName') || '').replace(
      /^(PLP)\|/,
      '',
    )?.split('|')[0];
    let referrerPageType = `${referrerPath.split('/')[1] || ''}`;
    if (referrerPath === '/') {
      referrerPageType = 'home';
    } else if (referrerPath.startsWith('/shop-')) {
      referrerPageType = `${category} PLP`;
    } else if (referrerPath.startsWith('/buy-')) {
      referrerPageType = category && !category.startsWith('Search') ? `${category} PDP` : 'PDP';
    }

    localStorage.setItem(
      'categoryListName',
      `Search Results Page on ${referrerPageType}`,
    );
    localStorage.setItem('categoryListId', '');
  } else {
    if (categoryData?.commerce_categories?.total_count) {
      Object.entries(
        categoryData.commerce_categories.items[0].breadcrumbs || [],
      ).forEach(([, cat]) => {
        categoryListName.push(cat.category_gtm_name);
      });
      categoryListName.push(categoryData.commerce_categories.items[0].gtm_name);
      const listName = localStorage.getItem('categoryListName');
      if (listName?.startsWith('bn_promo_')) {
        localStorage.setItem('categoryListName', `${listName}_${categoryListName.join('|')}`);
      } else {
        localStorage.setItem('categoryListName', categoryListName.join('|'));
      }
      localStorage.setItem(
        'categoryListId',
        categoryData?.commerce_categories?.items?.[0]?.id,
      );
    }
    categoryListName.shift();
  }
  return categoryListName;
}

function buildRuleContexts() {
  const urlKey = buildUrlKey();
  const urlParts = urlKey.split('/');
  let contextPath = '';
  const context = [];

  urlParts.forEach((part) => {
    if (!part.includes('--') && part && !EXCLUDED_CATEGORIES.includes(part)) {
      const categoryNameContext = categoryLevel === -1 ? part.replace('shop-', '').replace(/-/g, '_') : part.replace(/-/g, '_');
      contextPath += `__${categoryNameContext}`;
      context.push(`"${CATEGORY_CONTEXT_PREFIX}${contextPath}"`);
      context.push(`"${contextPath.substring(2)}"`);
      categoryLevel += 1;
    }
  });
  return context.join(',');
}

function buildSubcategories(categoryData, headerDiv) {
  const plpSubcategories = document.createElement('div');
  plpSubcategories.classList.add('plp-subcategories');
  categoryData.commerce_categories.items[0].children.forEach((subcategory) => {
    const subcategoryDiv = document.createElement('a');
    subcategoryDiv.setAttribute('href', `/${productListingLanguage}/${subcategory.url_path}`);
    subcategoryDiv.classList.add('plp-subcategory');
    subcategoryDiv.innerHTML = subcategory.name;
    plpSubcategories.appendChild(subcategoryDiv);
  });

  headerDiv.append(plpSubcategories);
}

function buildFilters(plpHeader) {
  const mainPageFilters = document.createElement('ul');
  mainPageFilters.classList.add('filters-body');

  // filters icon
  const filterIcon = document.createElement('li');
  filterIcon.classList.add('filters-icon');

  const allFiltersText = document.createElement('span');
  allFiltersText.classList.add('all-filters-text');
  allFiltersText.innerHTML = placeholders.plpAllFilters;
  filterIcon.appendChild(allFiltersText);

  filterIcon.addEventListener('click', () => {
    showFilters();
  });

  const filtersPopup = document.createElement('div');
  filtersPopup.classList.add('filters-popup');

  const filtersPopupHeaderContainer = document.createElement('div');
  filtersPopupHeaderContainer.classList.add('filters-popup-title-container');

  const filtersPopupTitleContainer = document.createElement('div');
  filtersPopupTitleContainer.setAttribute('id', 'filters-popup-title');
  filtersPopupTitleContainer.classList.add('filters-popup-title');

  const filtersPopupTitle = document.createElement('div');
  filtersPopupTitle.classList.add('filters-title');
  filtersPopupTitle.classList.add('filter-title-main');
  filtersPopupTitle.innerHTML = placeholders.plpFiltersAndSort;
  filtersPopupTitleContainer.append(filtersPopupTitle);

  const filtersPopupTitleClose = document.createElement('div');
  filtersPopupTitleClose.classList.add('filters-popup-title-close');
  filtersPopupTitleContainer.append(filtersPopupTitleClose);

  filtersPopupTitleClose.addEventListener('click', () => {
    hideFilters(); // hide filters popup
  });
  // create a li for filter values title
  const filterValuesTitleContainer = document.createElement('div');
  filterValuesTitleContainer.setAttribute('id', 'filters-values-popup-title');
  filterValuesTitleContainer.classList.add('filters-popup-title');
  filterValuesTitleContainer.classList.add('filters-popup-title-values');
  filterValuesTitleContainer.classList.add('hide');

  const filterValuesPopupTitle = document.createElement('div');
  filterValuesPopupTitle.classList.add('filters-title');
  filterValuesTitleContainer.append(filterValuesPopupTitle);

  const filterValuesPopupTitleClose = document.createElement('div');
  filterValuesPopupTitleClose.classList.add('filters-popup-title-close');
  filterValuesPopupTitleClose.addEventListener('click', (e) => {
    e.stopPropagation();
    hideFilters(); // hide filters popup
  });
  filterValuesTitleContainer.append(filterValuesPopupTitleClose);

  const filterValuesBackChevron = document.createElement('div');
  filterValuesBackChevron.classList.add('filters-values-back-chevron');
  filterValuesTitleContainer.prepend(filterValuesBackChevron);

  filterValuesBackChevron.addEventListener('click', () => {
    hideFilterValues(); // hide filter values popup
  });

  filtersPopupHeaderContainer.append(filtersPopupTitleContainer);
  filtersPopupHeaderContainer.append(filterValuesTitleContainer);

  filtersPopup.append(filtersPopupHeaderContainer);

  // create a div container for all filters
  const filtersBodyContainer = document.createElement('div');
  filtersBodyContainer.classList.add('filters-body-container');

  const filterIconMobile = document.createElement('div');
  filterIconMobile.classList.add('filters-icon-mobile');

  // Create and append the text content
  const filterContent = placeholders.filterContent || 'Filters & Sorts';
  const filterContentText = document.createElement('div');
  filterContentText.classList.add('filters-icon-mobile-text');
  filterContentText.innerHTML = filterContent;
  filterIconMobile.appendChild(filterContentText);

  filterIconMobile.addEventListener('click', () => {
    showFilters();
  });

  plpHeader.append(filtersPopup);
  plpHeader.append(filtersBodyContainer);
  return {
    mainPageFilters,
    filterIcon,
    filterIconMobile,
    filtersPopup,
    filterValuesPopupTitle,
    filtersBodyContainer,
  };
}

function decorateMetadata(categoryData) {
  // Content for meta tags
  const titleSuffix = placeholders.pageTitleSuffix || '';
  const title = categoryData.meta_title;
  const description = categoryData.meta_description;
  const keywords = categoryData.meta_keyword;

  // Set meta tags
  const metaTitle = document.querySelector('title');
  const lang = document.documentElement.lang || 'en';
  if (lang === 'ar') {
    metaTitle.innerText = titleSuffix ? `${titleSuffix} | ${title}` : title;
  } else {
    metaTitle.innerText = titleSuffix ? `${title} | ${titleSuffix}` : title;
  }
  const metaDescription = setMetaAttribute('description', description, metaTitle);
  setMetaAttribute('keywords', keywords, metaDescription);

  const metaOgTitle = setMetaAttribute('og:title', title, metaTitle, true);
  const metaOgDescription = setMetaAttribute('og:description', description, metaOgTitle, true);
  const metaTwitterTitle = setMetaAttribute('twitter:title', title, metaOgDescription);
  setMetaAttribute('twitter:description', description, metaTwitterTitle);
}

async function handleResponse(response, categoryData) {
  const plpHeader = document.createElement('div');
  document.querySelector('main').prepend(plpHeader);
  plpHeader.className = 'section plp-header';
  if (
    response.results[0].facets === undefined
    || response.results[0].userData[0] === undefined
    || response.results[0].hits[0] === undefined
  ) {
    noProductsFound();
  } else {
    const {
      mainPageFilters,
      filterIcon,
      filterIconMobile,
      filtersPopup,
      filterValuesPopupTitle,
      filtersBodyContainer,
    } = buildFilters(plpHeader);

    plpHeader.append(filterIconMobile);
    const plpCategoryTitle = document.createElement('h2');
    plpCategoryTitle.classList.add('plp-category-title');
    if (isOfferListing()) {
      const offerListTitle = document.querySelector('.section.algolia-product-listing-container .default-content-wrapper p');
      if (offerListTitle) {
        plpCategoryTitle.innerHTML = offerListTitle.innerHTML;
        offerListTitle.innerHTML = '';
      }
    } else if (categoryData) {
      plpCategoryTitle.innerHTML = categoryData.commerce_categories.items[0].name;
      buildSubcategories(categoryData, plpHeader);
      decorateMetadata(categoryData.commerce_categories.items[0], placeholders);
    } else {
      plpCategoryTitle.innerHTML = `${placeholders.searchResultsFor || 'Search results for'} "${searchTerm}"`;
    }
    plpHeader.prepend(plpCategoryTitle);

    // main ul for filters
    const mainFiltersUl = document.createElement('ul');
    mainFiltersUl.classList.add('filters-body-main-ul');

    const sortingLabelLi = buildSortFilter(response, filterValuesPopupTitle, true);
    mainFiltersUl.append(sortingLabelLi);

    const sortingLabelLiMainPage = buildSortFilter(response, filterValuesPopupTitle);
    sortingLabelLiMainPage.setAttribute('data-attribute', 'sorting');
    sortingLabelLiMainPage.addEventListener('click', () => {
      toggleMainPageFilterValues(sortingLabelLiMainPage); // show filter values popup
    });
    sortingLabelLiMainPage.classList.add('page-filters');
    mainPageFilters.prepend(sortingLabelLiMainPage);

    const popupUlMenu = document.createElement('div');
    popupUlMenu.classList.add('filters-popup-overlay');
    document.body.append(popupUlMenu);

    // the filter container that gets sticky on scroll
    const stickyFiltersContainer = document.createElement('div');
    stickyFiltersContainer.className = 'sticky-filters-container sticky-element sticky-desktop';

    // wrap sticky content
    const stickyFiltersWrapper = document.createElement('div');
    stickyFiltersWrapper.classList.add('sticky-filters-wrapper');

    const stickyLogoContainer = document.createElement('div');
    stickyLogoContainer.classList.add('sticky-logo-container');
    const stickyLogoLink = document.createElement('a');
    stickyLogoLink.setAttribute('href', `/${productListingLanguage || 'en'}`);
    const logoOnStickyFilters = document.createElement('span');
    logoOnStickyFilters.classList.add('logo-on-sticky-filters');
    stickyLogoLink.append(logoOnStickyFilters);
    stickyLogoContainer.append(stickyLogoLink);

    const stickyFiltersRightPart = document.createElement('div');
    stickyFiltersRightPart.classList.add('sticky-right-part');

    // Wishlist icon
    const wishlistEl = document.createElement('span');
    wishlistEl.setAttribute('aria-label', 'wishlist-wrapper');
    wishlistEl.innerHTML = '<a href="#" title="My Wishlist" aria-label="My Wishlist"><span class="icon wishlist-icon"/></a>';
    wishlistEl.classList.add('wishlist-wrapper');

    // Minicart icon
    const cartEl = document.createElement('span');
    cartEl.setAttribute('aria-label', 'minicart-wrapper');
    cartEl.innerHTML = '<a href="#" title="Cart" aria-label="Cart" class="minicart-wrapper"><span class="minicart-quantity"></span><span class="icon cart-icon"/></a>';
    cartEl.classList.add('minicart-wrapper');

    stickyFiltersRightPart.append(wishlistEl);
    stickyFiltersRightPart.append(cartEl);

    stickyFiltersContainer.append(stickyFiltersWrapper);
    stickyFiltersWrapper.append(stickyLogoContainer);
    stickyFiltersWrapper.append(mainPageFilters);
    stickyFiltersWrapper.append(stickyFiltersRightPart);
    plpHeader.appendChild(stickyFiltersContainer);

    const chosenFilterMainPageContainer = document.createElement('div');
    chosenFilterMainPageContainer.classList.add('main-page-filters-chosen-values-container');
    chosenFilterMainPageContainer.setAttribute('id', 'main-page-filters-chosen-values-container');
    chosenFilterMainPageContainer.classList.add('hide');

    const chosenFilterMainPageContainerUl = document.createElement('ul');
    chosenFilterMainPageContainerUl.classList.add('main-page-filters-chosen-values');
    chosenFilterMainPageContainerUl.setAttribute('id', 'main-page-filters-chosen-values');

    const clearFiltersButtonOnMainPage = document.createElement('div');
    clearFiltersButtonOnMainPage.innerHTML = placeholders.plpClearFilters;
    clearFiltersButtonOnMainPage.classList.add('clear-filters-button-on-main-page');
    clearFiltersButtonOnMainPage.addEventListener('click', () => {
      clearAllFilters(); // clear all filters
    });

    const shadowDiv = document.createElement('div');
    shadowDiv.classList.add('shadow-div');

    const selectedFiltersText = document.createElement('div');
    selectedFiltersText.innerHTML = placeholders.plpSelectedFilters;
    selectedFiltersText.classList.add('selected-filters-text');

    chosenFilterMainPageContainer.prepend(selectedFiltersText);
    chosenFilterMainPageContainer.append(chosenFilterMainPageContainerUl);
    chosenFilterMainPageContainer.append(shadowDiv);
    chosenFilterMainPageContainer.append(clearFiltersButtonOnMainPage);

    plpHeader.appendChild(chosenFilterMainPageContainer);

    const promises = Object.entries(response.results[0].renderingContent.facetOrdering.facets.order)
      .map(async ([, attrName]) => {
        await performanceYield();
        let attrNameNoLng = attrName.replace(`.${productListingLanguage}`, '').trim();
        if (attrName === `${getAttributeNameByPage(COLOR_ATTRIBUTE)}.value`) {
          attrNameNoLng = COLOR_ATTRIBUTE;
        }
        const value = response.results[0].userData[0].facets_config[attrNameNoLng];
        let sortedValues = [];
        let sortBy = 'alpha';
        const hiddenFilterList = productListingConfig['algolia-hidden-filters']?.split(',');
        if (value !== undefined && response.results[0].facets[attrName] !== undefined
          && (hiddenFilterList === undefined || !hiddenFilterList.includes(value.label[productListingLanguage]))) {
          // create a li for each filter with a filter name
          const mainFiltersLi = document.createElement('li');

          const filterTitle = value.label[productListingLanguage];
          mainFiltersLi.addEventListener('click', () => {
            filterValuesPopupTitle.innerHTML = filterTitle;
            showFilterValues(mainFiltersLi); // show filter values popup
          });
          mainFiltersLi.setAttribute('aria-label', filterTitle);
          mainFiltersLi.setAttribute('data-attribute', attrNameNoLng);

          const mainLiTitleSpan = document.createElement('span');
          mainLiTitleSpan.classList.add('main-filter-title-span');

          const gtmFilterTitle = value.label?.en;
          mainLiTitleSpan.innerHTML = filterTitle;
          mainFiltersLi.append(mainLiTitleSpan);

          // create a ul for each filter values
          const mainFilterValuesUl = document.createElement('ul');
          mainFilterValuesUl.classList.add('filters-values-ul');

          if (value.widget.type === 'checkbox') {
            const attrOrder = response.results[0].renderingContent.facetOrdering.values[attrName];
            if (attrOrder !== undefined) {
              if (attrOrder.order !== undefined) {
                sortBy = 'custom';
              } else {
                sortBy = attrOrder.sortRemainingBy;
              }
            }
            sortedValues = resortFilterValues(response, attrNameNoLng, sortBy);
            buildCheckboxFilter(
              response,
              sortedValues,
              sortBy,
              attrNameNoLng,
              mainFilterValuesUl,
              gtmFilterTitle,
            );
          } else if (value.widget.type === 'star_rating') {
            sortedValues = resortFilterValues(response, attrNameNoLng, 'alphadesc');
            buildRatingFilters(
              sortedValues,
              attrNameNoLng,
              mainFilterValuesUl,
              gtmFilterTitle,
            );
          } else if (value.widget.type === 'range_checkbox') {
            const idx = getResultsIndex(response, `${attrName}`);
            buildCheckboxPriceRangeFilter(
              response.results[idx].facets[`${attrName}`],
              attrNameNoLng,
              mainFilterValuesUl,
              gtmFilterTitle,
            );
          } else if (value.widget.type === 'swatch_list') {
            const idx = getResultsIndex(response, `${getAttributeNameByPage(attrNameNoLng)}.label`);
            buildSwatcherFilter(
              response.results[idx].facets[`${getAttributeNameByPage(attrNameNoLng)}.label`],
              attrNameNoLng,
              mainFilterValuesUl,
              gtmFilterTitle,
            );
          }

          createFilterOnMainPage(
            response,
            value.widget.type,
            attrName,
            attrNameNoLng,
            sortedValues,
            sortBy,
            mainPageFilters,
            mainFiltersLi,
            gtmFilterTitle,
          );
          const spanMainFilterChoseValues = document.createElement('span');
          spanMainFilterChoseValues.classList.add('main-filter-chose-values');

          return [mainFiltersLi, mainFilterValuesUl, spanMainFilterChoseValues];
        }
        return null;
      });

    (await Promise.allSettled(promises)).filter((x) => !!x.value).forEach((val) => {
      const [mainFiltersLi, mainFilterValuesUl, spanMainFilterChoseValues] = val.value;
      mainFiltersLi.append(spanMainFilterChoseValues);
      // append filter values ul to filter li
      mainFiltersLi.append(mainFilterValuesUl);
      // append filter li to main filters ul
      mainFiltersUl.append(mainFiltersLi);
    });

    filtersBodyContainer.append(mainFiltersUl);
    filtersPopup.append(filtersBodyContainer);

    const filtersPopupFooterContainer = document.createElement('div');
    filtersPopupFooterContainer.classList.add('filters-popup-footer-container');

    const countOfFoundItems = document.createElement('div');
    countOfFoundItems.classList.add('count-of-found-items');
    countOfFoundItems.setAttribute('id', 'count-of-found-items');
    countOfFoundItems.innerHTML = response.results[0].nbHits;

    filtersPopupFooterContainer.append(countOfFoundItems);

    const clearAllButton = document.createElement('div');
    clearAllButton.classList.add('button-filters');
    clearAllButton.classList.add('button-clear-filter');
    clearAllButton.addEventListener('click', () => {
      clearAllFilters();
      disableClearfilters(); // disable clear filters button
    });
    clearAllButton.innerHTML = placeholders.plpClearAll;

    const applyFiltersButton = document.createElement('div');
    applyFiltersButton.classList.add('button-filters');
    applyFiltersButton.classList.add('button-apply-all');
    applyFiltersButton.addEventListener('click', () => {
      hideFilters();
    });
    applyFiltersButton.innerHTML = placeholders.plpApplyFilters;

    mainPageFilters.appendChild(filterIcon);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('buttons-container');

    buttonsContainer.append(clearAllButton);
    buttonsContainer.append(applyFiltersButton);
    filtersPopupFooterContainer.append(buttonsContainer);
    filtersPopup.append(filtersPopupFooterContainer);

    await performanceYield();

    const loadMoreBlock = document.querySelector('.algolia-product-listing.block');
    const loadMoreContainer = buildLoadMoreContainer(placeholders.plpLoadMoreProducts);
    loadMoreContainer.querySelector('.pager-button').addEventListener('click', async () => {
      productListingPage += 1;
      await makeRequestToAlgolia(false);
    });

    // build total item count above product listing
    const itemDisplayTemplate = `
          <div class="result-count">
            <p id="count-of-found-items-on-main"></p>
          </div>
          <div class="grid-layout-selectors">
            <div class="three-column-grid">
              <span><img data-icon-name="columns-3" src="/icons/three-column-grid-secondary.svg" alt loading="lazy"></span>
            </div>
            <div class="four-column-grid selected">
              <span><img data-icon-name="columns-4" src="/icons/four-column-grid-primary.svg" alt loading="lazy"></span>
            </div>
          </div>
      `;
    const itemDisplayContainer = document.createElement('li');
    itemDisplayContainer.classList.add('item-count-container');
    itemDisplayContainer.innerHTML = itemDisplayTemplate;
    itemDisplayContainer.querySelector('.three-column-grid').addEventListener('click', handleGridSelection);
    itemDisplayContainer.querySelector('.four-column-grid').addEventListener('click', handleGridSelection);

    const itemCountMobile = document.createElement('div');
    itemCountMobile.classList.add('item-count-mobile');
    itemCountMobile.innerHTML = '<div class="result-count-mobile"><p></p></div>';

    const mainPageUl = document.querySelector('.filters-body');
    mainPageUl.appendChild(itemDisplayContainer);

    const productsContainer = document.createElement('div');
    productsContainer.classList.add('products-container');
    productsContainer.classList.add('columns-4');
    loadMoreBlock.appendChild(itemCountMobile);
    loadMoreBlock.appendChild(productsContainer);

    buildHits(response);
    window.addEventListener('lazy-loaded', async () => {
      dataLayerViewListEvents(response);
    }, { once: true });
    updateWishlistIcons();
    loadMoreBlock.appendChild(loadMoreContainer);
    updatePageLoader(response, placeholders);
    window.addEventListener('resize', checkSwatchCarouselButtons);
    window.addEventListener('resize', checkImageCarousel);

    await buildAllFilters(response);
    buildCheckedFilters(response);

    enableStickyElements();
  }
  hideLoader();
}

/**
 * Checks if the page is a search page, then calls algolia API and target call
 * sequentially.
 * Otherwise if PLP, Calls algolia API and target call in parallel.
 * @param {*} algoliaUrl API Request URL
 * @param {*} data Payload
 * @param {*} categoryNameList Category Name List
 * @returns Algolia Response
 */
async function getAlgoliaResponse(algoliaUrl, data, categoryNameList) {
  let algoliaResponse;
  let targetPayload;
  let plpBanner;
  if (isSearchPage()) {
    algoliaResponse = await postJSON(algoliaUrl, data);
    // Show recommendations if no products found on search
    if (algoliaResponse.results[0]?.hits?.length === 0) {
      const recommendationsBlock = await loadFragment(`/${document.documentElement.lang}/fragments/search/empty-results`);
      dataLayerInternalSearchEmptyEvent(searchTerm);
      document.querySelector('main').appendChild(recommendationsBlock);
      document.querySelector('.algolia-product-listing-container').classList.add('hidden');
    }
    targetPayload = await pageLoadData();
    await fireTargetCall(targetPayload);
    window.dispatchEvent(new CustomEvent('target-response'));
  } else {
    [algoliaResponse, targetPayload, plpBanner] = await Promise.all([
      postJSON(algoliaUrl, data),
      plpLoadData(categoryNameList),
      loadFragment(`/${document.documentElement.lang}/fragments/plp/personalization`),
    ]);
    if (algoliaResponse.results?.[0]?.hits?.length > 1) {
      document.querySelector('main').prepend(plpBanner);
      await fireTargetCall(targetPayload);
    }
  }
  window.dispatchEvent(new CustomEvent('target-response'));
  if (!algoliaResponse?.results) {
    return Promise.reject(new Error('Algolia API failed'));
  }
  return algoliaResponse;
}

export default async function decorate(block) {
  placeholders = await fetchPlaceholdersForLocale();
  filterAliasValues = await getFilterAliaseValues();
  buildLoader();
  showLoader();
  if (block?.classList.contains('offer-listing')) {
    const listItems = block.querySelectorAll('div > div > ul > li');
    offerListSku = Array.from(listItems)
      .map((li) => `sku:${li.textContent.trim()}`)
      .join(' OR ');
    listingType = 'offer-listing';
    block.innerHTML = '';
  }
  productListingConfig = await getProductListingConfig();
  let categoryData;
  let categoryNameList;

  try {
    if (isSearchPage()) {
      datalayerPageType = 'slp';
      const urlParams = new URLSearchParams(window.location.search);
      searchTerm = urlParams.get('q') || ' ';
      storeCategoryListData(categoryData);
    } else {
      if (!isOfferListing()) {
        ruleContexts = buildRuleContexts();
      }
      categoryData = await getCategoryData();
      const previewPreaccessData = await getPreviewPreaccessData(categoryData);
      const visitorEligibleData = await getVisitorEligibility(previewPreaccessData, productListingLanguage);
      if (visitorEligibleData?.type === 'preview' && !visitorEligibleData.isVisitorEligible) {
        const redirectUrl = await getRedirectUrl(visitorEligibleData.isVisitorEligible, visitorEligibleData.visitorTier, productListingLanguage);
        window.location.href = redirectUrl;
        return;
      }
      await buildCategoryPath(categoryData);
      categoryNameList = storeCategoryListData(categoryData);
      sendCategoriesToDataLayer(categoryNameList);
    }

    const scrollPosition = sessionStorage.getItem('scroll');
    if (scrollPosition) {
      setTimeout(() => {
        window.scrollTo({ top: scrollPosition, left: 0, behavior: 'smooth' });
      }, '1000');
      sessionStorage.removeItem('scroll');
    }

    checkUrlFacets();
    const data = buildAlgoliaRequest();
    const algoliaUrl = buildAlgoliaIndexUrl(productListingConfig);

    const response = await getAlgoliaResponse(algoliaUrl, data, categoryNameList);

    window.onpageshow = async (e) => {
      if (e.persisted) {
        updateWishlistIcons();
      }
    };
    await handleResponse(response, categoryData);
  } catch (error) {
    console.error(`Error in ${window.pageType}`, error);
  }

  // sticky filter on mobile
  window.addEventListener('scroll', () => {
    if (window.matchMedia('(max-width: 1024px)') && document.querySelector('.plp-header .filters-icon-mobile')) {
      const categoryTitle = document.querySelector('.plp-category-title');
      const plpHeader = document.querySelector('.plp-header');

      if (categoryTitle && plpHeader) {
        const style = window.getComputedStyle(categoryTitle);
        const marginTop = parseFloat(style.marginTop);
        const marginBottom = parseFloat(style.marginBottom);
        const height = categoryTitle.offsetHeight;
        const topValue = height + marginTop + marginBottom;
        plpHeader.style.top = `-${topValue}px`;
      }

      const productContainer = document.querySelector('.algolia-product-listing-container.section');
      if (window.matchMedia('(max-width: 768px)').matches && productContainer && plpHeader) {
        const productContainerBottom = productContainer.getBoundingClientRect().bottom;
        const plpHeaderBottom = plpHeader.getBoundingClientRect().bottom;
        const plpHeaderHeight = plpHeader.getBoundingClientRect().height;
        if (productContainerBottom <= plpHeaderBottom) {
          plpHeader.classList.add('sticky-fixed');
          productContainer.style.paddingTop = `${plpHeaderHeight}px`;
        } else {
          plpHeader.classList.remove('sticky-fixed');
          productContainer.style.paddingTop = '0';
        }
      }
    }
  });

  function updateMiniCart(minicartQuantity) {
    const minicartQuantityElement = document.querySelector('main .minicart-quantity');
    if (minicartQuantityElement) {
      minicartQuantityElement.textContent = minicartQuantity;
    }
  }

  cartApi.cartItemsQuantity.watch((quantity) => {
    const minicartQuantity = quantity > 0 ? quantity : '';

    updateMiniCart(minicartQuantity);
  });
}
