import { getSignInToken } from '../../scripts/commerce.js';
import { getConfigValue } from '../../scripts/configs.js';
import { getTopupEgiftCardId } from './base-utils.js';
import AppConstants from './app.constants.js';

const CHANNEL = 'web';

function getPageIdentifier() {
  const url = window.location.href;
  if (url.includes('/cart')) {
    return 'cart';
  } if (url.includes('/checkout')) {
    return 'checkout';
  }
  return '';
}

/**
 * Fetches data from the REST API
 *
 * @param endpoint
 * @param useToken
 * @param method
 * @param requestData
 * @param apiVersion
 * @returns {Promise<{response: null}|*>}
 */
export default async function getRestApiClient(
  endpoint,
  useToken = false,
  method = 'GET',
  requestData = null,
  apiVersion = 'V1',
  responseObject = false,
) {
  let response = null;
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Store: await getConfigValue('commerce-store-view-code'),
        'Alshaya-Channel': CHANNEL,
      },
    };

    if (useToken) {
      const token = getSignInToken();
      if (token) {
        options.headers.Authorization = `Bearer ${token}`;
      }
    }

    if (requestData && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(requestData);
    }

    const baseUrl = await getConfigValue('commerce-rest-endpoint');
    const storeViewCode = await getConfigValue('commerce-store-view-code');
    const responseData = await fetch(
      `${baseUrl}/${storeViewCode}/${apiVersion}/${endpoint}`,
      options,
    );


    if (responseData.status === 401) {
      const lang = document.documentElement.lang || 'en';
      const redirectUrl = `/${lang}/cart`;
      window.dispatchEvent(new CustomEvent('react:logout', {
        detail: {
          redirectUrl
        }
      }));
      return;
    }

    if (responseObject) {
      response = {
        success: !!responseData.ok,
        status: responseData.status,
        message: responseData.statusText,
        data: await responseData.json(),
      };
    } else {
      response = await responseData.json();
    }

    if (response.data?.message) {
      response.message = response.data.message;
    }
  } catch (err) {
    console.error(err);
  }

  return {
    response,
  };
}

// Fetch data from graphql endpoint
export async function getGraphqlClient(query, variables = {}, isMeshEndPoint = false) {
  let response = null;
  try {
    const token = getSignInToken();

    let headers = {
      'Content-Type': 'application/json',
      Store: await getConfigValue('commerce-store-view-code'),
      'Alshaya-Channel': CHANNEL,
      'Alshaya-Page-Identifier': getPageIdentifier(),
      'Alshaya-Country-Code': await getConfigValue('country-code'),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    if (getTopupEgiftCardId()) {
      headers = {
        ...headers,
        'Alshaya-Digital-Cart-Id': getTopupEgiftCardId(),
      }
    }
    const options = {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    };

    const baseUrl = isMeshEndPoint
      ? await getConfigValue('cart-mesh-endpoint')
      : await getConfigValue('commerce-endpoint');
    const responseData = await fetch(baseUrl, options);

    response = await responseData.json();
    
    if (response?.errors?.[0]?.extensions?.category === AppConstants.GRAPHQL_AUTHORIZATION) {
      const lang = document.documentElement.lang || 'en';
      const redirectUrl = `/${lang}/cart`;
      window.dispatchEvent(new CustomEvent('react:logout', {
        detail: {
          redirectUrl
        }
      }));
    }
  } catch (err) {
    console.error(err);
  }

  return {
    response,
  };
}

// Fetch data by calling AppBuilder
export async function getAppbuilderClient(
  endpoint,
  requestData = null,
  method = 'POST',
) {
  let response = null;
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        Store: await getConfigValue('commerce-store-view-code'),
        'Alshaya-Channel': CHANNEL,
      },
    };

    if (requestData && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(requestData);
    }

    const baseUrl = await getConfigValue('commerce-base-endpoint');
    const responseData = await fetch(
      `${baseUrl}/${endpoint}`,
      options,
    );
    response = await responseData.json();

    if (responseData.data?.message) {
      response.message = responseData.data.message;
    }
  } catch (err) {
    console.error(err);
  }

  return {
    response,
  };
}
