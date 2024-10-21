import getRestApiClient from '../utils/api-client.js';

/**
 *  Place order API
 * @param body
 * @param cartId
 * @param isLoggedIn
 * @returns {Promise<{}>}
 */
const placeOrder = async (body, cartId, isLoggedIn) => {
  const getCartURI = isLoggedIn
    ? 'carts/mine/order'
    : `guest-carts/${cartId}/order`;

  let responseData = {};
  try {
    const response = await getRestApiClient(getCartURI, isLoggedIn, 'PUT', body, 'V1', true);
    responseData = response?.response;
    window.dispatchEvent(new CustomEvent('updateMiniCart'));
  } catch (error) {
    console.log(error, 'error');
  }
  return responseData;
};

export default placeOrder;
