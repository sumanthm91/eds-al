import getRestApiClient from '../utils/api-client.js';
import ApiConstants from './api.constants.js';

/**
 * Fetches city locations based on search criteria.
 *
 * @param {string} countryId - The country code (default is 'QA' for Qatar).
 * @returns {Promise<{response: null}>|*}
 */
const getCityLocations = (countryId, attributeCode) => {
  const queryParams = `?searchCriteria[filter_groups][0][filters][0][field]=attribute_id&searchCriteria[filter_groups][0][filters][0][value]=${attributeCode}&searchCriteria[filter_groups][0][filters][0][condition_type]=eq&searchCriteria[filter_groups][0][filters][1][field]=country_id&searchCriteria[filter_groups][0][filters][1][value]=${countryId}&searchCriteria[filter_groups][0][filters][1][condition_type]=eq`;

  return getRestApiClient(`${ApiConstants.API_URI_ADDRESS_LOCATIONS_SEARCH}${queryParams}`, true);
};

export default getCityLocations;
