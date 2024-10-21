import getRestApiClient from '../utils/api-client.js';
import ApiConstants from './api.constants.js';

/**
 * Fetches the current customer's cart
 * @param payload
 * @returns {Promise<{response: null}>|*}
 */
const associateCarts = (payload) => {
  return getRestApiClient(ApiConstants.API_URI_ASSOCIATE_CARTS, true, 'POST', payload);
};

export default associateCarts;
