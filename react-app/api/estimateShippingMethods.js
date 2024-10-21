import getRestApiClient from '../utils/api-client.js';
import ApiConstants from './api.constants.js';

const estimateShippingMethods = async (body, cartId, isLoggedIn) => {
  const getCartURI = isLoggedIn
    ? ApiConstants.API_URI_LOGGED_IN_ESTIMATE_SHIPPING_METHODS
    : ApiConstants.API_URI_GUESTS_ESTIMATE_SHIPPING_METHODS.replace('{{CART_ID}}', cartId);

  let responseData = {};
  try {
    const response = await getRestApiClient(getCartURI, isLoggedIn, 'POST', body);
    responseData = response?.response?.filter(method => method.method_code !== 'click_and_collect');
  } catch (error) {
    console.log(error, 'error');
  }

  return responseData;
};

export default estimateShippingMethods;
