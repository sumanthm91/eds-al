import getRestApiClient from '../utils/api-client.js';
import { removeCartInfoFromLocal } from '../utils/local-storage-util.js';

const updateCart = async (body, cartId, isLoggedIn, responseObj = false) => {
  // Get the cart context

  const getCartURI = isLoggedIn
    ? 'carts/mine/updateCart'
    : `guest-carts/${cartId}/updateCart`;

  let responseData = {};
  try {
    const response = await getRestApiClient(getCartURI, isLoggedIn, 'POST', body, 'V1', responseObj);
    if(responseObj && response?.response?.status === 404) {
      removeCartInfoFromLocal();
      window.location.href = `/${document.documentElement?.lang || 'en'}/cart`;
    }
    responseData = response?.response;
    window.dispatchEvent(new CustomEvent('updateMiniCart'));
  } catch (error) {
    console.log(error, 'error');
  }
  return responseData;
};

export default updateCart;
