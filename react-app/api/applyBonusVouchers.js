import getRestApiClient from '../utils/api-client.js';
import ApiConstants from './api.constants.js';

/**
 * Fetches the current customer's cart
 * @param payload
 * @returns {Promise<{response: null}>|*}
 */
const applyBonusVouchers = (payload) => {
  const requestMethod = (payload) ? 'POST' : 'DELETE';
  return getRestApiClient(ApiConstants.API_URI_MEMBER_BONUS_VOUCHERS, true, requestMethod, payload);
};

export default applyBonusVouchers;
