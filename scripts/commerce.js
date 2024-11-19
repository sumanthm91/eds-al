/* eslint-disable import/prefer-default-export, import/no-cycle, no-use-before-define */
import { getConfigValue } from './configs.js';

const API_MESH_BASE_CATEGORY_ID = '2';
/* Common query fragments */
export const priceFieldsFragment = `fragment priceFields on ProductViewPrice {
  regular {
      amount {
          currency
          value
      }
  }
  final {
      amount {
          currency
          value
      }
  }
}`;

export const categoriesLevel2Query = `query ($categoryId: String) {
  commerce_categories(filters: { ids: { eq: $categoryId } }, include_in_menu: 0) {
    items {
      error {
        code
        message
      }
      id
      level
      name
      gtm_name
      meta_title
      include_in_menu
      url_path
      url_key
      show_on_dpt
      show_in_lhn
      show_in_app_navigation
      position
      is_anchor
      display_view_all
      children {
        id
        level
        name
        gtm_name
        meta_title
        include_in_menu
        url_path
        url_key
        show_on_dpt
        show_in_lhn
        show_in_app_navigation
        position
        is_anchor
        display_view_all
      }
    }
  }
}`;

export const categoriesQuery = `query ($categoryId: String) {
  commerce_categories(filters: { ids: { eq: $categoryId } }, include_in_menu: 0) {
    items {
      error {
        code
        message
      }
      id
      level
      name
      gtm_name
      meta_title
      include_in_menu
      url_path
      url_key
      show_on_dpt
      show_in_lhn
      show_in_app_navigation
      position
      is_anchor
      display_view_all
      children {
        id
        level
        name
        gtm_name
        meta_title
        include_in_menu
        url_path
        url_key
        show_on_dpt
        show_in_lhn
        show_in_app_navigation
        position
        is_anchor
        display_view_all
        children {
          id
          level
          name
          gtm_name
          meta_title
          include_in_menu
          url_path
          url_key
          show_on_dpt
          show_in_lhn
          show_in_app_navigation
          position
          is_anchor
          display_view_all
          children {
            id
            level
            name
            gtm_name
            meta_title
            include_in_menu
            url_path
            url_key
            show_on_dpt
            show_in_lhn
            show_in_app_navigation
            position
            is_anchor
            display_view_all
            children {
              id
              level
              name
              gtm_name
              meta_title
              include_in_menu
              url_path
              url_key
              show_on_dpt
              show_in_lhn
              show_in_app_navigation
              position
              is_anchor
              display_view_all
            }
          }
        }
      }
    }
  }
}`;

/* Queries PDP */
export const refineProductQuery = `query RefineProductQuery($sku: String!, $variantIds: [String!]!) {
  refineProduct(
    sku: $sku,
    optionIds: $variantIds
  ) {
    images(roles: []) {
      url
      roles
      label
    }
    ... on SimpleProductView {
      price {
        final {
          amount {
            currency
            value
          }
        }
        regular {
          amount {
            currency
            value
          }
        }
      }
    }
    addToCartAllowed
  }
}`;

const productOptionFragment = `
fragment ProductOptionFragment on ProductViewOption {
    id
    title
    required
    multi
    values {
      id
      title
      inStock
      ... on ProductViewOptionValueProduct {
        title
        quantity
        isDefault
        product {
          sku
          shortDescription
          name
          price {
            ...priceFields
            roles
          }
        }
      }
      ... on ProductViewOptionValueSwatch {
        id
        title
        type
        value
        inStock
      }
      ... on ProductViewOptionValueProduct {
        product {
          sku
        }
      }
    }
  }
`;

const productViewFragment = `fragment productViewFields on ProductView {
  __typename
  id
  sku
  name
  urlKey
  shortDescription
  description
  inStock
  addToCartAllowed
  externalId
  images(roles: []) {
    url
    label
    roles
  }

  attributes(roles: []) {
    name
    label
    value
    roles
  }

... on SimpleProductView {
    price {
        roles
        ...priceFields
    }
}


  ... on ComplexProductView {
    variants {
      variants {
        selections
        product {
          id
          name
          sku
          ... on SimpleProductView {
            price {
              final {
                amount {
                  currency
                  value
                }
              }
              regular {
                amount {
                  currency
                  value
                }
              }
            }
          }
          attributes {
            name
            label
            roles
            value
          }
        }
      }
    }
    options {
      ...ProductOptionFragment
    }

    priceRange {
      maximum {
        ...priceFields
        roles
      }
      minimum {
        ...priceFields
        roles
      }
    }
  }
}
${productOptionFragment}
`;

export const urlKeyQuery = `
  query ProductSearch(
  $currentPage: Int = 1
  $pageSize: Int = 20
  $phrase: String = ""
  $sort: [ProductSearchSortInput!] = []
  $filter: [SearchClauseInput!] = []
    ) {
      productSearch(
        current_page: $currentPage
        page_size: $pageSize
        phrase: $phrase
        sort: $sort
        filter: $filter
      ) {
        items {
          productView {
            ...productViewFields
          }
        }
      }
    }
${productViewFragment}
${priceFieldsFragment}`;

export const productDetailQuery = `query ProductQuery($sku: String!) {
  products(skus: [$sku]) {
    ...productViewFields
  }
}
${productViewFragment}
${priceFieldsFragment}`;

export const productDetailsBySkuQuery = `query getProductSearchDetails(
    $filter: [SearchClauseInput!]
    $phrase: String!
    $sort: [ProductSearchSortInput!]
    $pageSize: Int!
  ) {
    productSearch(
      phrase: $phrase
      filter: $filter
      sort: $sort
      page_size: $pageSize
    ) {
      total_count
      page_info {
        current_page
        page_size
        total_pages
      }
      items {
        productView {
          sku
          id
          name
          description
          urlKey
          inStock
          metaTitle
          metaDescription
          metaKeyword
          attributes {
            name
            label
            roles
            value
          }
          ... on SimpleProductView {
            price {
              final {
                amount {
                  value
                  currency
                }
              }
              regular {
                amount {
                  value
                  currency
                }
              }
              roles
            }
          }
          ... on ComplexProductView {
            variants {
              variants {
                selections
                product {
                  id
                  name
                  sku
                  ... on SimpleProductView {
                    price {
                      final {
                        amount {
                          currency
                          value
                        }
                      }
                      regular {
                        amount {
                          currency
                          value
                        }
                      }
                    }
                  }
                  attributes {
                    name
                    label
                    roles
                    value
                  }
                }
              }
            }
            options {
              id
              title
              required
              multi
              values {
                id
                title
                ... on ProductViewOptionValueProduct {
                  title
                  quantity
                  isDefault
                }
                ... on ProductViewOptionValueSwatch {
                  id
                  title
                  type
                  value
                }
              }
            }
            priceRange {
              maximum {
                final {
                  amount {
                    value
                    currency
                  }
                }
                regular {
                  amount {
                    value
                    currency
                  }
                }
                roles
              }
              minimum {
                final {
                  amount {
                    value
                    currency
                  }
                }
                regular {
                  amount {
                    value
                    currency
                  }
                }
                roles
              }
            }
          }
        }
      }
    }
  }
`;

export const productDetailsBySkuListQuery = `query ($sku: [String]) {
  products(skus: $sku) {
      sku
      id
      name
      urlKey
      attributes {
        name
        label
        value
        roles
      }
    
  }
}
`;

export const breadcrumbQuery = `query($urlKey:[String]) {
  commerce_categories(filters: { url_path: { in: $urlKey } }) {
    total_count
    items {
      error {
        code
        message
      }
      id
      name
      level
      url_path
      group_by_sub_categories
      description
      meta_title
      meta_keyword
      meta_description
      image
      promo_banner_for_mobile
      promotion_banner_mobile
      promotion_banner
      display_view_all
      children {
        id
        name
        url_path
        category_quick_link_plp_mob
        gtm_name
      }
      breadcrumbs {
        category_id
        category_name
        category_level
        category_url_key
        category_url_path
        category_gtm_name
      }
      prev_prea_enabled
      preview_sd
      preview_ed
      preview_category_desc
      preview_category_text
      preview_category_title
      preview_tier_type
      preview_timer
      preaccess_sd
      preaccess_ed
      preaccess_category_text
      preaccess_tier_type
      gtm_name
    }
  }
}`;

export const productByUrlKeyQuery = `query getProductSearchDetails(
    $filter: [SearchClauseInput!]
    $phrase: String!
    $sort: [ProductSearchSortInput!]
    $pageSize: Int!
  ) {
    productSearch(
      phrase: $phrase
      filter: $filter
      sort: $sort
      page_size: $pageSize
    ) {
      total_count
      page_info {
        current_page
        page_size
        total_pages
      }
      items {
        productView {
          sku
          id
          name
          description
          urlKey
          attributes {
            name
            label
            value
          }
        }
      }
    }
  }`;

export const categoriesByKeyQuery = `query($urlKey:[String]) {
  commerce_categories(filters: { url_path: { in: $urlKey } }, include_in_menu: 0) {
    total_count
    items {
      error {
        code
        message
      }
      id
      name
      level
      url_path
      group_by_sub_categories
      description
      meta_title
      meta_keyword
      meta_description
      include_in_menu
      show_in_lhn
      prev_prea_enabled
      preview_sd
      preview_ed
      preview_category_text
      preview_pdp_text
      preview_tier_type
      preview_timer
      preaccess_sd
      preaccess_ed
      preaccess_category_text
      preaccess_pdp_text
      preaccess_tier_type
      display_view_all
      children {
        id
        level
        name
        meta_title
        url_path
        url_key
        include_in_menu
        show_in_lhn
        display_view_all
        children {
          id
          level
          name
          meta_title
          url_path
          url_key
          include_in_menu
          show_in_lhn
          display_view_all
          children {
            id
            level
            name
            meta_title
            url_path
            url_key
            include_in_menu
            show_in_lhn
            display_view_all
          }
        }
      }
      breadcrumbs {
        category_id
        category_name
        category_level
        category_url_key
        category_url_path
        category_gtm_name
      }
      gtm_name
    }
  }
}`;

export const commerceCategories = `query ($categoryId: String) {
  commerce_categories(
    filters: { ids: { eq: $categoryId } }
    include_in_menu: 1
  ) {
    items {
      error {
        code
        message
      }
      id
      name
      level
      url_path
      image
      promo_id
      banners
      prev_prea_enabled
      preview_sd
      preview_ed
      preview_category_text
      preview_pdp_text
      preview_tier_type
      preview_timer
      preaccess_sd
      preaccess_ed
      preaccess_category_text
      preaccess_pdp_text
      preaccess_tier_type
      include_in_menu
      display_view_all
      gtm_name
      breadcrumbs {
        category_level
        category_name
        category_uid
        category_url_key
        category_url_path
      }
      children {
        id
        name
        level
        image
        url_path
        promo_id
        banners
        include_in_menu
        display_view_all
        gtm_name
        children {
          id
          name
          level
          image
          url_path
          promo_id
          banners
          include_in_menu
          display_view_all
          gtm_name
          children {
            id
            name
            level
            image
            url_path
            promo_id
            banners
            include_in_menu
            display_view_all
            gtm_name
            children {
              id
              name
              level
              image
              url_path
              promo_id
              banners
              include_in_menu
              display_view_all
              gtm_name
            }
          }
        }
      }
    }
  }
}`;

/* Common functionality */

export async function performCatalogServiceQuery(query, variables) {
  const headers = {
    'Content-Type': 'application/json',
    'Magento-Website-Code': await getConfigValue('commerce-website-code'),
    'Magento-Store-View-Code': await getConfigValue('commerce-store-view-code'),
    'Magento-Store-Code': await getConfigValue('commerce-store-code'),
    'Magento-Customer-Group': await getConfigValue('commerce-customer-group'),
  };

  const apiCall = new URL(await getConfigValue('commerce-saas-endpoint'));
  apiCall.searchParams.append('query', query.replace(/(?:\r\n|\r|\n|\t|[\s]{4})/g, ' ')
    .replace(/\s\s+/g, ' '));
  apiCall.searchParams.append('variables', variables ? JSON.stringify(variables) : null);

  const response = await fetch(apiCall, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const queryResponse = await response.json();

  return queryResponse.data;
}

export async function loadProduct(productSku) {
  let product;
  let sku = productSku || document.querySelector('meta[name=sku]')?.getAttribute('content');
  if (sku) {
    const result = await performCatalogServiceQuery(productDetailQuery, { sku });
    [product] = result.products;
  } else {
    const urlKey = window.location.pathname.split('/').at(-1);
    const urlKeys = window.location.pathname.split('/');
    const category = urlKeys[1].match(/^[a-z]{2}$/) ? urlKeys.slice(2, -1).join('/') : urlKeys.slice(1, -1).join('/');

    const filter = [
      {
        attribute: 'url_key',
        eq: urlKey,
      },
    ];

    if (category) {
      filter.push({
        attribute: 'categories',
        in: category,
      });
    }

    const result = await performCatalogServiceQuery(urlKeyQuery, {
      pageSize: 1,
      currentPage: 1,
      phrase: '',
      filter,
    });

    product = result.productSearch.items[0]?.productView;
    sku = product?.sku;
  }
  return [sku, product];
}

export async function performRestQuery(url, useToken = false) {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (useToken) {
    headers.Authorization = `Bearer ${getSignInToken()}`;
  }
  const apiCall = new URL(url);

  const response = await fetch(apiCall, {
    method: 'GET',
    headers,
  });

  const queryResponse = {
    success: !!response.ok,
    status: response.status,
    message: response.statusText,
    data: await response.json(),
  };

  if (queryResponse.data?.message) {
    queryResponse.message = queryResponse.data.message;
  }

  return queryResponse;
}

export async function performRestSubmit(url, data, useToken = false, setContentType = true) {
  const headers = {
  };

  if (setContentType) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }

  if (useToken) {
    headers.Authorization = `Bearer ${getSignInToken()}`;
  }

  const apiCall = new URL(url);

  const response = await fetch(apiCall, {
    method: 'POST',
    body: data,
    headers,
  });

  if (!response.ok) {
    return null;
  }

  const queryResponse = await response.json();

  return queryResponse;
}

export async function performRestMutation(url, data, useToken = false, method = 'POST') {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (useToken) {
    headers.Authorization = `Bearer ${getSignInToken()}`;
  }
  const apiCall = new URL(url);

  if (data) {
    const response = await fetch(apiCall, {
      method,
      headers,
      body: JSON.stringify(data),
    });

    const queryResponse = {
      success: !!response.ok,
      status: response.status,
      message: response.statusText,
      data: await response.json(),
    };

    if (queryResponse.data?.message) {
      queryResponse.message = queryResponse.data.message;
    }

    return queryResponse;
  }

  const response = await fetch(apiCall, {
    method,
    headers,
  });

  const queryResponse = {
    success: !!response.ok,
    status: response.status,
    message: response.statusText,
    data: await response.json(),
  };

  if (queryResponse.data?.message) {
    queryResponse.message = queryResponse.data.message;
  }

  return queryResponse;
}

export async function performCommerceRestQuery(url, useToken = false) {
  try {
    return performRestQuery(url, useToken);
  } catch (error) {
    console.error('Error fetching data', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

export async function performCommerceRestMutation(url, data, useToken = false, method = 'POST') {
  try {
    return performRestMutation(url, data, useToken, method);
  } catch (error) {
    console.error('Error fetching data', error);
    return {
      success: false,
      message: error.message,
    };
  }
}

export async function performAlgoliaMeshQuery(query, variables) {
  const appId = await getConfigValue('x-algolia-application-id');
  const apiKey = await getConfigValue('x-algolia-api-key');
  const headers = {
    'Content-Type': 'application/json',
    'X-Algolia-Application-Id': appId,
    'X-Algolia-API-Key': apiKey,
    path: '/1/indexes/*/queries',
  };
  const queryResponse = await performAPIMeshGraphQLQuery(query, variables, headers);
  return queryResponse;
}

export async function performAlgoliaQuery(variables) {
  const agent = await getConfigValue('x-algolia-agent');
  const appId = await getConfigValue('x-algolia-application-id');
  const apiKey = await getConfigValue('x-algolia-api-key');
  const algoliaConfig = {
    'x-algolia-agent': agent,
    'x-algolia-application-id': appId,
    'x-algolia-api-key': apiKey,
  };

  const searchParams = new URLSearchParams(algoliaConfig);
  const algoliaDefaultUrl = await getConfigValue('algolia-default-url');
  const algoliaEndpoint = `${algoliaDefaultUrl}?${searchParams.toString()}`;
  const response = await fetch(algoliaEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [variables],
    }),
  });
  return response.json();
}

export function getSignInToken() {
  return getCookie('auth_user_token') ?? '';
}

export async function performAPIMeshGraphQLQuery(query, variables, headers = {}) {
  const endpoint = await getConfigValue('apimesh-endpoint');
  const endpointMethod = await getConfigValue('apimesh-endpoint-method');
  const locale = document.documentElement.lang || 'en';
  const context = await getConfigValue('apimesh-context');
  const market = await getConfigValue('apimesh-market');

  Object.assign(headers, {
    mesh_market: market,
    mesh_locale: locale,
    mesh_context: context,
    'Magento-Website-Code': await getConfigValue('commerce-store-view-code'),
    'Magento-Store-Code': await getConfigValue('commerce-store-code'),
    'Magento-Store-View-Code': await getConfigValue('commerce-store-view-code'),
  });

  const config = {
    endpoint,
    method: endpointMethod ?? 'POST',
    headers,
  };
  const response = await performMonolithGraphQLQuery(query, variables, true, false, config);

  return response;
}

export async function performMonolithGraphQLQuery(
  query,
  variables,
  GET = true,
  USE_TOKEN = false,
  config = null,
) {
  let GRAPHQL_ENDPOINT = await getConfigValue('commerce-endpoint');
  if (config?.endpoint) {
    GRAPHQL_ENDPOINT = config.endpoint;
  }

  const headers = {
    'Content-Type': 'application/json',
    Store: await getConfigValue('commerce-store-view-code'),
    ...config?.headers,
  };

  if (config?.headers) {
    Object.assign(headers, config.headers);
  }

  if (USE_TOKEN) {
    if (typeof USE_TOKEN === 'string') {
      headers.Authorization = `Bearer ${USE_TOKEN}`;
    } else {
      const token = getSignInToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
  }

  let method = 'POST';
  if (config?.method) {
    method = config.method;
  }
  let response;
  if (!GET) {
    response = await fetch(GRAPHQL_ENDPOINT, {
      method,
      headers,
      body: JSON.stringify({
        query: query.replace(/(?:\r\n|\r|\n|\t|[\s]{4})/g, ' ').replace(/\s\s+/g, ' '),
        variables,
      }),
    });
  } else {
    const endpoint = new URL(GRAPHQL_ENDPOINT);
    endpoint.searchParams.set('query', query.replace(/(?:\r\n|\r|\n|\t|[\s]{4})/g, ' ').replace(/\s\s+/g, ' '));
    endpoint.searchParams.set('variables', JSON.stringify(variables));
    response = await fetch(
      endpoint.toString(),
      { headers },
    );
  }

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function fetchCategories(multilevel = false) {
  const categories = await performAPIMeshGraphQLQuery(
    multilevel ? categoriesQuery : categoriesLevel2Query,
    { categoryId: API_MESH_BASE_CATEGORY_ID },
  ).then((response) => response.data);
  return categories;
}

export async function fetchCategoriesByUrlKey(urlKey) {
  const categories = await performAPIMeshGraphQLQuery(
    categoriesByKeyQuery,
    { urlKey },
  ).then((response) => response.data);
  return categories;
}

export async function getBreadcumbCategories(urlKey) {
  return performAPIMeshGraphQLQuery(breadcrumbQuery, { urlKey }).then((response) => response.data);
}

export async function getBreadcumbCategoriesForProduct(urlKey) {
  const variables = {
    phrase: '',
    filter: [
      {
        attribute: 'url_key',
        eq: urlKey,
      },
    ],
    sort: [],
    pageSize: 10,
  };
  return performAPIMeshGraphQLQuery(productByUrlKeyQuery, variables)
    .then((response) => response.data);
}

export function renderPrice(product, format, html = (strings, ...values) => strings.reduce((result, string, i) => result + string + (values[i] || ''), ''), Fragment = null) {
  // Simple product
  if (product.price) {
    const { regular, final } = product.price;
    if (regular.amount.value === final.amount.value) {
      return html`<span class="price-final">${format(final.amount.value)}</span>`;
    }
    return html`<${Fragment}>
      <span class="price-regular">${format(regular.amount.value)}</span> <span class="price-final">${format(final.amount.value)}</span>
    </${Fragment}>`;
  }

  // Complex product
  if (product.priceRange) {
    const { regular: regularMin, final: finalMin } = product.priceRange.minimum;
    const { final: finalMax } = product.priceRange.maximum;

    if (finalMin.amount.value !== finalMax.amount.value) {
      return html`
      <div class="price-range">
        ${finalMin.amount.value !== regularMin.amount.value ? html`<span class="price-regular">${format(regularMin.amount.value)}</span>` : ''}
        <span class="price-from">${format(finalMin.amount.value)} - ${format(finalMax.amount.value)}</span>
      </div>`;
    }

    if (finalMin.amount.value !== regularMin.amount.value) {
      return html`<${Fragment}>
      <span class="price-final">${format(finalMin.amount.value)} - ${format(regularMin.amount.value)}</span> 
    </${Fragment}>`;
    }

    return html`<span class="price-final">${format(finalMin.amount.value)}</span>`;
  }

  return null;
}

/* PDP specific functionality */

export function getSkuFromUrl() {
  const path = window.location.pathname;
  const result = path.match(/\/products\/[\w|-]+\/([\w|-]+)$/);
  return result?.[1];
}

const productsCache = {};
export async function getProduct(sku) {
  // eslint-disable-next-line no-param-reassign
  sku = sku.toUpperCase();
  if (productsCache[sku]) {
    return productsCache[sku];
  }
  const rawProductPromise = performCatalogServiceQuery(productDetailQuery, { sku });
  const productPromise = rawProductPromise.then((productData) => {
    if (!productData?.products?.[0]) {
      return null;
    }

    return productData?.products?.[0];
  });

  productsCache[sku] = productPromise;
  return productPromise;
}

// Store product view history in session storage
export async function initProductViewHistory() {
  const storeViewCode = await getConfigValue('commerce-store-view-code');
  window.adobeDataLayer.push((dl) => {
    dl.addEventListener('adobeDataLayer:change', (event) => {
      const key = `${storeViewCode}:productViewHistory`;
      let viewHistory = JSON.parse(window.localStorage.getItem(key) || '[]');
      viewHistory = viewHistory.filter((item) => item.sku !== event.productContext.sku);
      viewHistory.push({ date: new Date().toISOString(), sku: event.productContext.sku });
      window.localStorage.setItem(key, JSON.stringify(viewHistory.slice(-10)));
    }, { path: 'productContext' });
    dl.addEventListener('place-order', () => {
      const shoppingCartContext = dl.getState('shoppingCartContext');
      if (!shoppingCartContext) {
        return;
      }
      const key = `${storeViewCode}:purchaseHistory`;
      const purchasedProducts = shoppingCartContext.items.map((item) => item.product.sku);
      const purchaseHistory = JSON.parse(window.localStorage.getItem(key) || '[]');
      purchaseHistory.push({ date: new Date().toISOString(), items: purchasedProducts });
      window.localStorage.setItem(key, JSON.stringify(purchaseHistory.slice(-5)));
    });
  });
}

export function setJsonLd(data, name) {
  const existingScript = document.head.querySelector(`script[data-name="${name}"]`);
  if (existingScript) {
    const existingData = JSON.parse(existingScript.innerHTML);
    Object.assign(existingData, data);
    existingScript.innerHTML = JSON.stringify(existingData);
    return;
  }

  const script = document.createElement('script');
  script.type = 'application/ld+json';

  script.innerHTML = JSON.stringify(data);
  script.dataset.name = name;
  document.head.appendChild(script);
}

export function isPDP() {
  return !!document.querySelector('.product-details');
}

export function isPLP() {
  return !!document.querySelector('.product-listing') || !!document.querySelector('.algolia-product-listing');
}

export function isOrderConfirmation() {
  return !!document.querySelector('.order-confirmation');
}

/**
 * Get a cookie
 * @param cname the name of the cookie
 *
 * Returns the cookie value
 * @returns {string} the value of the cookie
 */
export function getCookie(cName) {
  const cookies = document.cookie.split(';');
  let foundValue;

  cookies.forEach((cookie) => {
    const [name, value] = cookie.trim().split('=');
    if (name === cName) {
      foundValue = decodeURIComponent(value);
    }
  });

  return foundValue;
}

/**
 * Set a cookie
 * @param cname the name of the cookie
 * @param cvalue the value of the cookie
 * @param exdays the expiration days of a cookie
 * @param domain the domain of the cookie
 * @param isSecured the secured flag of the cookie
 */
export function setCookie(cname, cvalue, exdays, domain, isSecured = false) {
  const date = new Date();
  let expires = '';
  date.setTime(date.getTime() + exdays * 24 * 60 * 60 * 1000);
  if (exdays > 0) {
    expires = `expires=${date.toUTCString()}`;
  } else if (exdays < 0) {
    expires = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
  }
  if (isSecured) {
    document.cookie = `${cname}=${cvalue};${expires};path=/;domain=${domain}; SameSite=None; Secure`;
    return;
  }
  document.cookie = `${cname}=${cvalue};${expires};path=/`;
}

export async function fetchCommerceCategories() {
  const categoryResponse = await performAPIMeshGraphQLQuery(
    commerceCategories,
    { categoryId: API_MESH_BASE_CATEGORY_ID },
  ).then((response) => response);

  return {
    items: categoryResponse?.data?.commerce_categories?.items,
    extensions: categoryResponse?.extensions,
  };
}

export async function cacheProductData(product) {
  window.product = window.product || {};
  window.product[product.sku] = product;
}

export async function getProductData(sku) {
  const product = window.product?.[sku];

  if (product) {
    return product;
  }

  const {
    data: { productSearch: products },
  } = await performAPIMeshGraphQLQuery(
    productDetailsBySkuQuery,
    {
      phrase: '',
      filter: [
        {
          attribute: 'sku',
          eq: sku,
        },
      ],
      sort: [
        {
          attribute: 'price',
          direction: 'DESC',
        },
      ],
      pageSize: 10,
    },
  );

  if (products?.items.length > 0) {
    return products.items[0].productView;
  }

  return null;
}
