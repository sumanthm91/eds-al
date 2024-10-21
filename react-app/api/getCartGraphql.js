import {
  useCallback, useContext, useEffect,
} from 'react';
import { getGraphqlClient } from '../utils/api-client.js';
import CartContext from '../context/cart-context.jsx';
import ApiConstants from './api.constants.js';
import { getTopupEgiftCardId } from '../utils/base-utils.js';

/**
 * Fetches the current guest cart
 * @returns {{cartData: boolean|{}}}
 */
const useGetCartGraphql = (step) => {
  const {
    isLoggedIn, cart, setCart, cartId,
  } = useContext(CartContext); // Get the cart context

  const fetchGuestCartQuery = `query ($cartId: String!) {
  commerce_cart(cart_id: $cartId) ${getTopupEgiftCardId() ? ApiConstants.DIGITAL_CART_QUERY : ApiConstants.CART_QUERY}
}`;

  //session stoarge based condition need to implement
  const fetchCustomerCartQuery = `query customerCart {
  commerce_customerCart ${getTopupEgiftCardId() ? ApiConstants.DIGITAL_CART_QUERY : ApiConstants.CART_QUERY}
}`;

  const cartQuery = isLoggedIn ? fetchCustomerCartQuery : fetchGuestCartQuery;

  const fetchCart = useCallback(
    () => {
      setCart({ ...cart, isLoading: true });
      getGraphqlClient(cartQuery, { cartId }, true).then((response) => {
        const responseData = isLoggedIn
          ? response.response.data.commerce_customerCart
          : response.response.data.commerce_cart;

        responseData.items = responseData?.items?.map((item, index) => {
          if (!responseData?.extension_attributes?.cart
            ?.items[index]?.extension_attributes?.is_free_gift) {
            if ((Number(item?.quantity) <= Number(item?.configured_variant?.stock_data?.qty))
            ) {
              return {
                ...item,
                isQuantityNotAvailable: false,
                extensionAttributes: responseData?.extension_attributes?.cart?.items
                  ?.find((element) => Number(item?.id) === Number(element?.item_id)),
              };
            }
            return {
              ...item,
              isQuantityNotAvailable: true,
              extensionAttributes: responseData?.extension_attributes?.cart?.items
                ?.find((element) => Number(item?.id) === Number(element?.item_id)),
            };
          }
          return {
            ...item,
          };
        });
        setCart({ ...cart, data: responseData, isLoading: false });
        window.dispatchEvent(new CustomEvent('updateMiniCart'));
        switch (step) {
          case 1: {
            return window.dispatchEvent(new CustomEvent(
              'react:datalayerViewCartEvent',
              {
                detail: {
                  value: responseData?.prices?.grand_total?.value || 0,
                  currency: responseData?.prices?.grand_total?.currency || '',
                  coupon: responseData?.extension_attributes?.totals?.coupon_code ?? '',
                  productData: responseData?.items?.map((item) => {
                    const gtmAttributes = item?.product?.gtm_attributes;
                    const productDynamicAttributes = item?.configured_variant?.dynamicAttributes ? JSON.parse(
                      item?.configured_variant?.dynamicAttributes
                    ) : null;
                    return {
                      gtm: {
                        'gtm-main-sku': gtmAttributes?.id || '',
                        'gtm-name': gtmAttributes?.name || '',
                        'gtm-brand': gtmAttributes?.brand || '',
                        'gtm-category': gtmAttributes?.category || '',
                        'gtm-variant': gtmAttributes?.variant || '',
                        'gtm-stock': item?.configured_variant?.stock_status === 'IN_STOCK' ? 'in stock' : '',
                        'gtm-price': gtmAttributes?.price || '',
                        "gtm-item-size":
                          productDynamicAttributes?.size_gtm || '',
                        "gtm-item-color":
                          productDynamicAttributes?.color_gtm || '',
                      },
                      discount: {
                        en: '',
                      },
                      quantity: item.quantity,
                      
                    };
                  }),
                },
              },
            ));
          }
          case 3: {
            return window.dispatchEvent(new CustomEvent(
              'react:datalayerEvent',
              {
                detail: {
                  type: 'beginCheckoutEvent',
                  payload: {
                    value: responseData?.prices?.grand_total?.value || 0,
                    currency: responseData?.prices?.grand_total?.currency || '',
                    coupon: responseData?.extension_attributes?.totals?.coupon_code ?? '',
                    productData: responseData?.items?.map((item) => {
                      const gtmAttributes = item?.product?.gtm_attributes;
                      return {
                        gtm: {
                          'gtm-main-sku': gtmAttributes?.id || '',
                          'gtm-name': gtmAttributes?.name || '',
                          'gtm-brand': gtmAttributes?.brand || '',
                          'gtm-category': gtmAttributes?.category || '',
                          'gtm-variant': gtmAttributes?.variant || '',
                          'gtm-stock': item?.configured_variant?.stock_status === 'IN_STOCK' ? 'in stock' : '',
                          'gtm-price': gtmAttributes?.price || '',
                        },
                        discount: {
                          en: '',
                        },
                        quantity: item.quantity,
                      };
                    }),
                  },
                },
              },
            ));
          }
          default: return null;
        }
      }).catch((error) => {
        console.error('getcart error', error);
        setCart({ ...cart, isError: true, isLoading: false });
      });
    },
    [isLoggedIn, cartId, setCart, cart],
  );

  useEffect(() => {
    if (cartId) {
      fetchCart();
    }
  }, [cartId]);

  return null;
};

export default useGetCartGraphql;