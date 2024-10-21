import getRestApiClient from '../utils/api-client.js';
import ApiConstants from './api.constants.js';

/**
 * Fetches the current customer's saved card list
 *
 * @returns {Promise<{response: null}>|*}
 */
const getCardTokensList = () => getRestApiClient(ApiConstants.API_URI_GET_TOKEN_LIST, true);

export default getCardTokensList;
