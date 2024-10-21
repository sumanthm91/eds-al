/**
 * Utility function to get link card element selector by type.
 */
const getElementSelector = (type = 'all') => {
  const selectors = {
    emailCheckout: '#spc-aura-link-card-input-email',
    cardNumberCheckout: '#spc-aura-link-card-input-card',
    mobileCheckout: '#spc-aura-link-card-input-mobile-mobile-number',
  };

  return type === 'all' ? selectors : { [type]: selectors[type] };
};

/**
 * Utility function to get element value by type.
 */
const getElementValueByType = (type, context = '') => {
  const selector = getElementSelector(type)[type];
  const selectorWithContext = context ? `${context} ${selector}` : selector;
  const element = document.querySelector(selectorWithContext);
  let elementValue = element ? element.value : '';

  if (type === 'cardNumberCheckout' && elementValue.length > 0) {
    elementValue = elementValue.replace(/\s/g, '');
  }

  return elementValue;
};

/**
 * Utility function to get inline error selector by type.
 */
const getInlineErrorSelector = (type = 'all') => {
  const selectors = {
    cardNumberCheckout: 'spc-aura-link-api-response-message',
    emailCheckout: 'spc-aura-link-api-response-message',
    mobileCheckout: 'spc-aura-link-api-response-message',
  };

  return type === 'all' ? selectors : { [type]: selectors[type] };
};

export {
  getElementValueByType,
  getElementSelector,
  getInlineErrorSelector,
};
