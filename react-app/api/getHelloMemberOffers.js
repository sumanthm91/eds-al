import getRestApiClient from '../utils/api-client.js';

/**
 * Fetches the current customer's cart
 *
 * @returns {Promise<{response: null}>|*}
 */
const getHelloMemberOffers = () => getRestApiClient('hello-member/customers/offers', true);

export default getHelloMemberOffers;
