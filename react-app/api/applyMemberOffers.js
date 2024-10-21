import getRestApiClient from '../utils/api-client.js';
import ApiConstants from './api.constants.js';

/**
 * Fetches the current customer's cart
 * @param payload
 * @returns {Promise<{response: null}>|*}
 */
const applyMemberOffers = (payload) => {
  const requestMethod = (payload) ? 'POST' : 'DELETE';
  return getRestApiClient(ApiConstants.API_URI_MEMBER_OFFERS, true, requestMethod, payload);
};

export default applyMemberOffers;
