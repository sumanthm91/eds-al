/* eslint-disable import/no-cycle */
import { store } from './api.js';
import {
  getSignInToken,
  performCommerceRestMutation,
  performCommerceRestQuery,
  getProductData,
} from '../commerce.js';

import { getConfigValue } from '../configs.js';
import { getCustomer } from '../customer/api.js';

async function createUrl(endpoint) {
  const baseUrl = await getConfigValue('commerce-rest-endpoint');

  const storeViewCode = await getConfigValue('commerce-store-view-code');

  const url = `${baseUrl}/${storeViewCode}/V1/${endpoint}`;

  return url;
}

// TODO: Refactor
const handleCartErrors = (data) => {
  if (!data) {
    return;
  }
  // Throw for everything
  throw new Error(data.message || 'An error occurred');
};

export function waitForCart() {
  const buttons = document.querySelectorAll('button.nav-cart-button, .minicart-header > .close');
  buttons.forEach((button) => { button.disabled = true; });
  return () => {
    buttons.forEach((button) => { button.disabled = false; });
  };
}

export async function getCart(resetCartStore = false) {
  const token = getSignInToken();

  if (!token && !store.getCartId()) {
    return;
  }

  const done = waitForCart();
  let data;
  let success;
  try {
    let url;

    if (token) {
      url = await createUrl('carts/mine/getCart');
    } else {
      url = await createUrl(`guest-carts/${store.getCartId()}/getCart`);
    }

    const response = await performCommerceRestQuery(url, !!token);

    ({ data, success } = response);

    if (!success) {
      handleCartErrors(data);
    }

    if (!data) {
      store.resetCart();
    }

    data.cart.items = data.cart.items.filter((item) => item);
    const cartObj = {
      id: data.cart.id,
      cart: data.cart,
      totals: data.totals,
    };

    if (resetCartStore) {
      const newCartId = token ? cartObj.id : store.getCartId();
      store.resetCart();
      await store.setCartId(newCartId);
    }

    store.setCart(cartObj);
  } catch (err) {
    console.error('Could not fetch cart', err);
  } finally {
    done();
  }
}

export async function createCart() {
  try {
    const token = getSignInToken();

    let url;
    if (token) {
      url = await createUrl('carts/mine');
    } else {
      url = await createUrl('guest-carts');
    }

    const response = await performCommerceRestMutation(url, {}, !!token);

    console.error(response);

    if (!response.success) {
      handleCartErrors(response);
    }
    const cartId = response.data;
    await store.setCartId(cartId);
    console.debug('created empty cart', cartId);
  } catch (err) {
    console.error('Could not create empty cart', err);
  }
}

function mapOption(option) {
  const decoded = atob(option);
  // eslint-disable-next-line no-unused-vars
  const [optionType, optionId, optionValue] = decoded.split('/');
  return {
    option_id: optionId,
    option_value: optionValue,
  };
}

export async function addToCart(sku, options, quantity, source = 'product-detail') {
  const done = waitForCart();
  let response;
  try {
    let variables;
    if (source === 'egift-purchase') {
      variables = {
        cartItem: {
          quote_id: store.getCartId(),
          product_type: options.product_type,
          sku,
          qty: quantity,
          product_option: {
            extension_attributes: {
              hps_giftcard_item_option: {
                hps_custom_giftcard_amount: options.custom_giftcard_amount,
                hps_giftcard_amount: options.giftcard_amount,
                hps_giftcard_sender_name: options.giftcard_sender_name,
                hps_giftcard_sender_email: options.giftcard_sender_email,
                hps_giftcard_recipient_name: options.giftcard_recipient_name,
                hps_giftcard_recipient_email: options.giftcard_recipient_email,
                hps_giftcard_message: options.giftcard_message,
                extension_attributes: {},
              },
            },
          },
        },
      };
    } else {
      variables = {
        cartItem: {
          sku,
          qty: quantity,
          product_option: {
            extension_attributes: {
              configurable_item_options: options.map((option) => mapOption(option)),
              custom_options: [],
            },
          },
          quote_id: store.getCartId(),
        },
      };
    }

    const token = getSignInToken();
    let url;

    if (token) {
      url = await createUrl('carts/mine/items');
    } else {
      url = await createUrl(`guest-carts/${store.getCartId()}/items`);
    }

    response = await performCommerceRestMutation(url, variables, !!token);

    if (!response.success) {
      handleCartErrors(response);
    }

    const { data: updatedCart } = response;
    if (updatedCart) {
      const product = await getProductData(sku);

      await getCart();

      document.querySelector('main').dispatchEvent(new CustomEvent('addtobag-updated', {
        detail: {
          product,
          cart: store.getCart(),
          updatedCart,
        },
      }));
    }
    return response;
  } catch (err) {
    console.error('Could not add item to cart', err);
    return response;
  } finally {
    done();
  }
}

export async function removeItemFromCart(itemId) {
  const done = waitForCart();

  try {
    const token = getSignInToken();

    let url;
    if (token) {
      url = await createUrl(`carts/mine/items/${itemId}`);
    } else {
      url = await createUrl(`guest-carts/${store.getCartId()}/items/${itemId}`);
    }

    const response = await performCommerceRestMutation(url, null, !!token, 'DELETE');

    console.error(response);

    if (!response.success) {
      handleCartErrors(response);
    }

    const cart = await getCart();

    console.debug('removed item from cart', itemId, cart.id);
  } catch (err) {
    console.error('Could not remove item from cart', err);
  } finally {
    done();
  }
}

export async function mergeCart() {
  try {
    const token = getSignInToken();

    if (!token) {
      return;
    }

    // check if guest exists and has items
    const guestCart = store.getCart();

    if (guestCart?.id && guestCart?.cart?.items?.length > 0) {
      const custResponse = await getCustomer();

      console.log('mergeCart custResponse', custResponse);

      const { id: customerId, store_id: storeId } = custResponse;

      console.debug('Merging cart for customer', customerId, storeId);

      const url = await createUrl(`cart-merge/customer-id/${customerId}/active-quote/${guestCart.id}/store-id/${storeId}`);

      const response = await performCommerceRestMutation(url, [], true, 'PUT');

      if (!response.success) {
        console.error('Error merging cart', response.status, response.message);
        return;
      }
    }

    // load cart anyways
    const cart = await getCart(true);

    console.debug('Merged cart', cart);
  } catch (err) {
    console.error('Could not merge cart', err);
  }
}
