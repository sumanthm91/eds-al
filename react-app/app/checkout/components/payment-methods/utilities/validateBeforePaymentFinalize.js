import { cartErrorCodes, cartSettings, PAYMENT_CONSTANTS } from '../../../../cart/constants';
import { isObject } from './utils';
import { hasValue } from '../../../../../utils/base-utils';

const getExceptionMessageType = (msg) => {
  let type = null;
  const { exceptionMessages } = cartSettings;
  const messages = Object.keys(exceptionMessages);
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].indexOf(msg) > -1) {
      type = exceptionMessages[messages[i]];
      break;
    }
  }

  return type;
};
const isCartHasOosItem = (cartData) => {
  if (hasValue(cartData.items)) {
    for (let i = 0; i < cartData.items.length; i++) {
      const item = cartData.items[i];
      // If error at item level.
      if (hasValue(item.extensionAttributes?.extension_attributes)
        && hasValue(item.extensionAttributes.extension_attributes.error_message)
      ) {
        const exceptionType = getExceptionMessageType(item.extensionAttributes.extension_attributes.error_message);
        if (hasValue(exceptionType) && exceptionType === PAYMENT_CONSTANTS?.OutOfStock) {
          return true;
        }
      }
    }
  }
  return false;
};

const cartItemIsVirtual = (item) => (hasValue(item.extensionAttributes.product_type) && item.extensionAttributes.product_type === 'virtual')
  || (Object.prototype.hasOwnProperty.call(item.extensionAttributes.extension_attributes, 'isEgiftCard') && item.extensionAttributes.extension_attributes.isEgiftCard);

const cartContainsAnyNormalProduct = (cartItems) => {
  // A flag to keep track of the non-virtual products.
  let isNonVirtual = false;
  Object.values(cartItems).forEach((item) => {
    // Return if we have already marked a non virtual product.
    if (isNonVirtual || !hasValue(item)) {
      return;
    }
    // If there is no product type for the cart item then it's non virtual
    // product.
    if (!cartItemIsVirtual(item)) {
      isNonVirtual = true;
    }
  });

  return isNonVirtual;
};

const cartContainsOnlyVirtualProduct = (cartItems) => {
  // If egift card is not enabled then return true.
  const isEgiftCardEnabled = cartItems?.filter((item) => item?.extensionAttributes?.extension_attributes?.is_egift !== '1' || !item?.extensionAttributes?.extension_attributes?.is_free_gift);

  if (!isEgiftCardEnabled) {
    return false;
  }

  return !cartContainsAnyNormalProduct(cartItems);
};

const validateBeforePaymentFinalise = (cart, placeholders, selectedMethod) => {
  // Fetch fresh cart from magento.
  if (!hasValue(cart) || !hasValue(cart.data)) {
    return false;
  }
  const cartData = cart.data;
  let isError = false;
  let errorMessage = placeholders.deliveryInformationMissingText;
  let errorCode = cartErrorCodes.cartOrderPlacementError;
  const { shipping } = cartData.extension_attributes.cart.extension_attributes.shipping_assignments?.[0] || '';
  if (isObject(cartData) && isCartHasOosItem(cartData)) {
    isError = true;
    console.error('Error while finalizing payment. Cart has an OOS item. Cart: @cart.', {
      '@cart': JSON.stringify(cartData),
    });
    errorMessage = placeholders.outOfStockToast;
    errorCode = cartErrorCodes.cartHasOOSItem;
  } else if (shipping) {
    if (!hasValue(shipping.method)
      && !cartContainsOnlyVirtualProduct(cartData.items)
    ) {
      // Check if shipping method is present else throw error.
      isError = true;
      console.error('Error while finalizing payment. No shipping method available. Cart: @cart.', {
        '@cart': JSON.stringify(cartData),
      });
    } else if ((!hasValue(shipping.address)
      || !hasValue(shipping.address.custom_attributes))
      && !cartContainsOnlyVirtualProduct(cartData.items)
    ) {
      // If shipping address not have custom attributes.
      isError = true;
      console.error('Error while finalizing payment. Shipping address not contains all info. Cart: @cart.', {
        '@cart': JSON.stringify(cartData),
      });
    } else if ((!hasValue(shipping.address)
      || !hasValue(shipping.address.firstname)
      || !hasValue(shipping.address.lastname))
      && !cartContainsOnlyVirtualProduct(cartData.items)
    ) {
      // If first/last name not available in shipping address.
      isError = true;
      console.error('Error while finalizing payment. First name or Last name not available in cart for shipping address. Cart: @cart.', {
        '@cart': JSON.stringify(cartData),
      });
    }
  } else if (selectedMethod === 'home_delivery' && (!hasValue(cartData.extension_attributes.cart.billing_address.firstname)
    || !hasValue(cartData.extension_attributes.cart.billing_address.lastname))
  ) {
    // If first/last name not available in billing address.
    isError = true;
    console.error('Error while finalizing payment. First name or Last name not available in cart for billing address. Cart: @cart.', {
      '@cart': JSON.stringify(cartData),
    });
  }

  if (isError) {
    window.dispatchEvent(new CustomEvent(
      'react:datalayerEvent',
      {
        detail: {
          type: 'paymentErrors',
          payload: {
            eventLabel: errorMessage
          }
        }
      }
    ))
    return {
      data: {
        error: true,
        error_code: errorCode,
        error_message: errorMessage,
      },
    };
  }

  return true;
};

export default validateBeforePaymentFinalise;
