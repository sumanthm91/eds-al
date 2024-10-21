import ApiConstants from './api.constants.js';
import { getGraphqlClient } from '../utils/api-client.js';

/**
 * Fetches the current customer's cart
 *
 * @returns {Promise<{response: null}>|*}
 */
const getCheckoutcomUpiConfig = async () => {
  let responseDataCart = [];

  try {
    const fetchConfigQuery = `query {
      Commerce_CheckoutComUpApiConfig ${ApiConstants.CHECKOUTCOM_CONFIG_QUERY}
    }`;

    await getGraphqlClient(fetchConfigQuery, { }, true).then((response) => {
      responseDataCart = response.response.data.Commerce_CheckoutComUpApiConfig;
    });
  } catch (error) {
    console.error('Error while fetching the checkoutcomUpi config:', error);
  }

  return responseDataCart;
};

export default getCheckoutcomUpiConfig;
