import { getLanguageAttr } from '../../../../../../scripts/configs';
import getCardTokensList from '../../../../../api/getCardTokenList';
import { allowedCardsMapping, PAYMENT_CONSTANTS, } from '../../../../cart/constants';
import { getCustomerLastOrder } from '../../../../../../scripts/customer/api.js';
import { hasValue } from '../../../../../utils/base-utils.js';
import placeOrder from '../../../../../api/placeOrder';

/**
 * Bin validation.
 *
 * @param {*} bin
 */
export const binValidation = (bin, checkoutComUpiBinConfig) => {
  const { supportedPaymentMethods, cardBinNumbers } = checkoutComUpiBinConfig;
  let valid = true;
  let errorMessage = PAYMENT_CONSTANTS?.invalidCard;

  supportedPaymentMethods.split(',').every((paymentMethod) => {
    // If the given bin number matches with the bins of given payment method
    // then this card belongs to that payment method, so throw an error
    // asking user to use that payment method.
    const paymentMethodBinNumbers = cardBinNumbers[paymentMethod];

    if (paymentMethodBinNumbers !== undefined
      && Object.values(paymentMethodBinNumbers.split(',')).includes(bin)) {
      valid = false;
      errorMessage = `card_bin_validation_error_message_${paymentMethod}`;
      return false;
    }
    return true;
  });

  if (valid === false) {
    return ({ error: true, error_message: errorMessage });
  }

  return valid;
};

export const getPaymentCardType = (cardNumber, checkoutComUpiBinConfig) => {
  const { mada_bin_numbers: madaBins } = checkoutComUpiBinConfig;
  // Get rid of anything but numbers.
  const curCardNumber = cardNumber.replace(/\D/g, '');
  let cardType = ''; // Variable to store the card type.

  // Min length of bin is 6.
  // If more than 5 chars have been entered then check for mada bin match.
  if (madaBins.length > 0 && curCardNumber.length > 5) {
    const cardInitials = curCardNumber.slice(0, 6);
    // If 6 chars entered then check if exact match is available.
    if (curCardNumber.length === 6 && madaBins.includes(curCardNumber)) {
      cardType = 'mada';
    }
    // We need to check matches only within 6 char bins if 7 chars entered.
    if (curCardNumber.length === 7) {
      // Filter out 8 digit Mada bins.
      const filteredMadaBins = madaBins.filter((bin) => bin.length === 6);
      if (filteredMadaBins.some((bin) => bin === cardInitials)) {
        cardType = 'mada';
      }
    }
    // Compare if any bin is present matching with 6 first chars of entered card number.
    if (curCardNumber.length >= 8) {
      // Check for mada bin match.
      if (madaBins.some((bin) => bin.startsWith(cardInitials))) {
        cardType = 'mada';
      }
    }
  }

  // Current brand is not MADA then check rest.
  // Compare entered chars with regular exp of AmEx, Visa and Master Card.
  if (cardType === '') {
    // American Express
    const amexRegex = new RegExp('^3[47][0-9]{0,}$'); // 34, 37
    // Visa
    const visaRegex = new RegExp('^4[0-9]{0,}$'); // 4
    // MasterCard
    const mastercardRegex = new RegExp(
      '^(5[1-5]|222[1-9]|22[3-9]|2[3-6]|27[01]|2720)[0-9]{0,}$',
    ); // 2221-2720, 51-55

    if (curCardNumber.match(amexRegex)) {
      cardType = 'amex';
    } else if (curCardNumber.match(visaRegex)) {
      cardType = 'visa';
    } else if (curCardNumber.match(mastercardRegex)) {
      cardType = 'master';
    }
  }

  // Partially checking mada bin if none matches for 4 chars.
  if (curCardNumber.length > 3 && cardType === '') {
    const partialMatch = madaBins.some((bin) => bin.startsWith(curCardNumber));
    if (partialMatch) {
      cardType = 'mada';
    }
  }
  return cardType;
};

/**
 * Returns balance payable amount if present.
 *
 * @returns {string}
 *   Amount.
 */
export const getPayable = (cart) => {
  const balancePaymentObject = cart?.data?.extension_attributes?.totals?.total_segments?.find(item => item?.code === 'balance_payable');
  return hasValue(balancePaymentObject)
    ? balancePaymentObject?.value
    : cart?.data?.prices?.grand_total?.value;
}

export const isApplePayAvailable = () => !!window.ApplePaySession;

/**
 * Checks if upapi payment method (payment method via checkout.com).
 *
 * @param {string} paymentMethod
 *   Payment method code.
 *
 * @return {bool}
 *   TRUE if payment methods from checkout.com
 */
export const isUpapiPaymentMethod = (paymentMethod) => paymentMethod.indexOf('upapi', 0) !== -1;

/**
 * Checks if postpay payment method.
 *
 * @param {string} paymentMethod
 *   Payment method code.
 *
 * @return {bool}
 *   TRUE if payment methods from postpay
 */
export const isPostpayPaymentMethod = (paymentMethod) => paymentMethod.indexOf('postpay', 0) !== -1;

/**
 * Checks if tabby payment method.
 *
 * @param {string} paymentMethod
 *   Payment method code.
 *
 * @return {bool}
 *   TRUE if payment methods from tabby
 */
const isTabbyPaymentMethod = (paymentMethod) => paymentMethod.indexOf('tabby', 0) !== -1;

/**
 * Checks if tamara payment method.
 *
 * @param {string} paymentMethod
 *   Payment method code.
 *
 * @return {bool}
 *   TRUE if payment methods from tamara
 */
const isTamaraPaymentMethod = (paymentMethod) => paymentMethod.indexOf('tamara', 0) !== -1;

/**
 * Process payment data before placing order.
 *
 * @param paymentData
 * @param data
 * @returns {{cvv: string, public_hash: string}}
 */
const processPaymentData = (paymentData, data) => {
  const additionalInfo = data;
  switch (paymentData.method) {
    case 'checkout_com_upapi':
      switch (additionalInfo.card_type) {
        case 'new':
          additionalInfo.is_active_payment_token_enabler = parseInt(additionalInfo.save_card, 10);
          break;

        case 'existing': {
          const { cvvCheck } = true;
          const { cvv, id } = additionalInfo;

          if (cvvCheck && !cvv) {
            return {
              data: {
                error: true,
                error_code: '505',
                message: 'CVV missing for credit/debit card.',
              },
            };
          }

          if (!id) {
            return {
              data: {
                error: true,
                error_code: '505',
                message: 'Invalid card token.',
              },
            };
          }

          additionalInfo.public_hash = atob(id);

          if (cvvCheck) {
            additionalInfo.cvv = atob(decodeURIComponent(cvv));
          }

          break;
        }

        // no default
      }
      break;

    // no default
  }

  return additionalInfo;
};

/**
 * Prepare message to log when API fail after payment successful.
 *
 * @param {array} cart
 *   Cart Data.
 * @param {array} data
 *   Payment data.
 * @param {string} exceptionMessage
 *   Exception message.
 * @param {string} api
 *   API identifier which failed.
 *
 * @return {string}
 *   Prepared error message.
 */
const prepareOrderFailedMessage = (cart, data, exceptionMessage, api) => {
  const orderId = cart?.cart?.extension_attributes?.real_reserved_order_id;
  const message = [];
  message.push(`exception:${exceptionMessage}`);
  message.push(`api:${api}`);
  message.push(`order_id:${orderId}`);

  const cartObj = cart?.cart;

  if (cartObj) {
    message.push(`cart_id:${cart.cart.id}`);
    message.push(`amount_paid:${cart.totals.base_grand_total}`);
  }

  const paymentMethod = data?.method ?? data.paymentMethod?.method;
  message.push(`payment_method:.${paymentMethod}`);

  const paymentAdditionalData = data?.paymentMethod?.additional_data ?? '';
  const additionalData = data?.paymentMethod?.additional_data ?? '';
  let additionalInfo = '';
  if (paymentAdditionalData) {
    additionalInfo = JSON.stringify(paymentAdditionalData);
  } else if (additionalData) {
    additionalInfo = JSON.stringify(data.additional_data);
  }
  message.push(`additional_information:${additionalInfo}`);

  const cartShippingMethod = cart?.shipping?.method;
  if (cartShippingMethod) {
    message.push(`shipping_method:${cart.shipping.method}`);
    _.each(cart.shipping.custom_attributes, (value) => {
      message.push(`${value.attribute_code}:${value.value}`);
    });
  }

  return (message) ? message.join('||') : '';
};

/**
 * Adds payment method in the cart and returns the cart.
 *
 * @param {object} data
 *   The data object to send in the API call.
 *
 * @returns params
 *   A promise object.
 */
export const preparePaymentData = (data, paymentCallbackSuccess = '', paymentCallbackError = '') => {
  const paymentData = data.payment;
  const additionalData = paymentData?.additional_data;
  const params = {
    extension: {
      action: 'update payment',
    },
    payment: {
      method: paymentData.method,
      additional_data: (additionalData) ?? {},
    },
  };

  const analytics = data?.payment_info?.payment?.analytics;
  if (analytics) {
    const analyticsData = data.payment_info.payment.analytics;

    params.extension.ga_client_id = analyticsData?.clientId ?? '';
    params.extension.tracking_id = analyticsData?.trackingId ?? '';
    params.extension.user_id = 0;
    params.extension.user_type = 'Guest User';
    params.extension.user_agent = navigator.userAgent;
    params.extension.client_ip = '';
    params.extension.attempted_payment = 1;
  }

  // If upapi payment method (payment method via checkout.com).
  if (isUpapiPaymentMethod(paymentData.method)
    || isPostpayPaymentMethod(paymentData.method)
    || isTabbyPaymentMethod(paymentData.method)
    || isTamaraPaymentMethod(paymentData.method)) {
    // Add success and fail redirect url to additional data.
    params.payment.additional_data.successUrl = `${window.location.origin}/${getLanguageAttr()}${paymentCallbackSuccess}`;
    params.payment.additional_data.failUrl = `${window.location.origin}/${getLanguageAttr()}${paymentCallbackError}`;
  }

  // Process payment data by paymentMethod.
  const processedData = processPaymentData(paymentData, params.payment.additional_data);
  if (typeof processedData.data !== 'undefined' && processedData.data.error) {
    console.error(processedData);
    return processedData;
  }
  params.payment.additional_data = processedData;

  if (paymentData.method === 'checkout_com_upapi') {
    const hash = params?.payment?.additional_data?.public_hash;
    if (hash) {
      params.payment.method = 'checkout_com_upapi_vault';
    }
  }

  return params;
};

// eslint-disable-next-line consistent-return
export const validatePaymentUpdateError = (oldCartData, newCartData, paymentInfoData) => {
  const cartError = newCartData?.data?.error;
  if (cartError) {
    const paymentData = paymentInfoData.payment_info.payment;
    const errorMessage = (newCartData.data.error_code > 600) ? 'Back-end system is down' : newCartData.data.error_message;
    newCartData.data.message = errorMessage;
    const message = prepareOrderFailedMessage(oldCartData.data, paymentData, errorMessage, 'update cart', 'NA');
    console.error(message);

    return newCartData;
  }
};

export const redirectToCart = () => {
  if (window.location.pathname.search(/checkout/i) >= 0) {
    window.location = `/${getLanguageAttr()}/cart`;
  }
};

export const isObject = (value) => {
  const type = typeof value;
  return ((type === 'object' || type === 'function') && !Array.isArray(value));
};

export async function getCardTokens() {
  let savedCards = [];
  if (allowedCardsMapping) {
    const tokenizedCards = await getCardTokensList();

    if (tokenizedCards) {
      let savedCard = [];
      let { items } = tokenizedCards.response;
      // Sort the items based on the created time.
      if (items) {
        items = Object.values(items).sort((card1, card2) => card1.created_at < card2.created_at);
        items.forEach((item) => {
          savedCard = JSON.parse(item.token_details);
          savedCard.public_hash = btoa(item.public_hash);
          // Map the card type to card type machine name.
          const type = savedCard.type.toLowerCase();
          savedCard.type = allowedCardsMapping[type]
            ? allowedCardsMapping[type] : savedCard.type;
          savedCard.paymentMethod = savedCard.type;
          savedCard.isActive = item.is_active;
          savedCard.entityId = item.entity_id;
          // Assign an object if not exists.
          if (!savedCard.public_hash) {
            savedCard.public_hash = {};
          }
          savedCards = savedCards.concat(savedCard);
        });
      }
    }
  }
  return savedCards;
}

export async function getLastOrder() {
    const getLastOrderDetails = await getCustomerLastOrder();
    if(getLastOrderDetails?.success) {
      return processLastOrder(getLastOrderDetails?.data)
    }

    return null;
}

export async function validateOrder(cartId) {
  const getOrderDetails = await placeOrder({}, cartId, false);
  if(getOrderDetails?.response) {
    return processLastOrder(getOrderDetails?.response)
  }

  return null;
}

const processLastOrder = (orderData) => {
  const order = { ...orderData };
  if (!hasValue(order.entity_id)) {
    return order;
  }

  const data = {};
  data.order_id = order.entity_id;

  // Customer info.
  data.firstname = order.customer_firstname;
  data.lastname = order.customer_lastname;
  data.email = order.customer_email;

  // Items.
  data.items = order.items;

  // Coupon code.
  data.coupon = hasValue(order.coupon_code) ? order.coupon_code : '';

  // Extension.
  data.extension = order.extension_attributes;
  delete order.extension_attributes;

  // Shipping.
  data.shipping = data.extension.shipping_assignments[0].shipping;
  data.shipping.address.customer_id = order.customer_id;
  delete data.shipping.address.entity_id;
  delete data.shipping.address.parent_id;

  data.shipping.commerce_address = data.shipping.address;
  data.shipping.extension = data.shipping.address.extension_attributes;

  // Billing.
  data.billing = order.billing_address;
  data.billing.customer_id = order.customer_id;
  delete order.billing_address.entity_id;
  delete order.billing_address.parent_id;

  data.billing_commerce_address = data.billing;
  delete order.billing_address;
  data.billing.extension = data.billing.extension_attributes;

  Object.assign(order, data);

  return order;
};
