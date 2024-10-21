export const GTM_CONSTANTS = {
  CART_ERRORS: 'cart errors',
  CHECKOUT_ERRORS: 'checkout errors',
  PAYMENT_ERRORS: 'other payment errors',
  GENUINE_PAYMENT_ERRORS: 'payment errors',
};

export const cartErrorCodes = {
  cartHasOOSItem: 506,
  cartOrderPlacementError: 505,
  cartCheckoutQuantityMismatch: 9010,
  cartHasUserError: 610,
};

export const cartSettings = {
  'Fraud rule detected. Reauthorization is required':
    'FRAUD',
  'Not all of your products are available in the requested quantity.':
    'OOS',
  'Some of the products are out of stock.':
    'OOS',
  'The maximum quantity per item has been exceeded':
    'quantity_limit',
  'The requested qty is not available':
    'not_enough',
  'This product is out of stock.':
    'OOS',
  "We don't have as many":
    'not_enough',
};

export const allowedCardsMapping = {
  'american express': 'amex',
  'diners club international': 'diners',
  mastercard: 'mastercard',
  visa: 'visa',
};

export const PAYMENT_CONSTANTS = {
  OutOfStock: '005',
  invalidCard: 'invalid_card'
};