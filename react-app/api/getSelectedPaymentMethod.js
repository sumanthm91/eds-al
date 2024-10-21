import getRestApiClient from '../utils/api-client.js';

/**
 * Fetches selected payment method
 *
 * @param {string} cartId - Cart id
 * @returns {Promise<{response: null}>|*}
 */
const getSelectedPaymentMethod = async (isLoggedIn, cartId) => {
  const getSelectedPaymentMethodURI = isLoggedIn ? 'carts/mine/selected-payment-method' : `guest-carts/${cartId}/selected-payment-method`;

  let responseData = {};
  try {
    const response = await getRestApiClient(getSelectedPaymentMethodURI, isLoggedIn);
    responseData = response?.response;
  } catch (error) {
    console.log(error, 'error');
  }
  return responseData;
};

export default getSelectedPaymentMethod;
