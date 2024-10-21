import getRestApiClient from '../utils/api-client.js';
import ApiConstants from './api.constants.js';

/**
 * Fetches the current customer's cart
 *
 * @returns {Promise<{response: null}>|*}
 */
const getHelloMemberCoupons = () => getRestApiClient(ApiConstants.API_URI_CUSTOMER_COUPONS, true);

export default getHelloMemberCoupons;
