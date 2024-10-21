import { useCallback, useContext, useEffect } from 'react';
import getRestApiClient from '../utils/api-client.js';
import CartContext from '../context/cart-context.jsx';
import ApiConstants from './api.constants.js';

/**
 * Fetches the current guest cart
 * @returns {{cartData: boolean|{}}}
 */
const useGetCart = () => {
  const {
    isLoggedIn, cartId, cart, setCart,
  } = useContext(CartContext); // Get the cart context

  const getCartURI = isLoggedIn
    ? ApiConstants.API_URI_LOGGED_IN_GET_CART
    : ApiConstants.API_URI_GUESTS_GET_CART.replace('{{CART_ID}}', cartId);

  const fetchCart = useCallback(() => {
    setCart({ ...cart, isLoading: true });
    getRestApiClient(getCartURI, isLoggedIn).then((response) => {
      setCart({ ...cart, data: response.response });
    });
  }, [cartId, setCart, cart]);

  useEffect(() => {
    if (cartId) {
      fetchCart();
    }
  }, [cartId, setCart]);

  return null;
};

export default useGetCart;
