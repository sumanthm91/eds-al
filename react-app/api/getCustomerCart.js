import getRestApiClient from '../utils/api-client.js';
import ApiConstants from './api.constants.js';

/**
 * Fetches the current customer's cart
 *
 * @returns {Promise<{response: null}>|*}
 */
const getCustomerCart = () => getRestApiClient(ApiConstants.API_URI_LOGGED_IN_GET_CART, true);

export default getCustomerCart;
