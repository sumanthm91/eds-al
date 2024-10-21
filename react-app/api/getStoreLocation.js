import getRestApiClient from '../utils/api-client.js';

/**
 * Fetches store locator information based on search criteria.
 *
 * @param {string} storeCode
 * @returns {Promise<{response: null}>|*}
 */
const getStoreLocator = (storeCode) => {
  const endpoint = 'storeLocator/search';

  const params = `?searchCriteria[filter_groups][0][filters][0][field]=status&searchCriteria[filter_groups][0][filters][0][value]=1&searchCriteria[filter_groups][1][filters][0][field]=store_code&searchCriteria[filter_groups][1][filters][0][value]=${storeCode}`;

  return getRestApiClient(`${endpoint}${params}`, true);
};

export default getStoreLocator;
