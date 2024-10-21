import { showError, removeError } from './conditions-util';
import { getInlineErrorSelector, getElementValueByType } from './link_card_sign_up_modal_helper';

/**
 * Utility function to validate input by element type.
 */
function validateElementValueByType(type, context, placeholders) {
  const inputValue = getElementValueByType(type, context);
  const { loyaltyMobileEmptyError, loyaltyEmailEmptyError, loyaltyCardEmptyError } = placeholders;

  if (type === 'mobile' || type === 'mobileCheckout') {
    if (inputValue.length === 0 || inputValue.match(/^[0-9]+$/) === null) {
      showError(getInlineErrorSelector(type)[type], loyaltyMobileEmptyError);

      return false;
    }
    removeError(getInlineErrorSelector(type)[type]);
    return true;
  }

  if (type === 'email' || type === 'emailCheckout') {
    if (inputValue.length === 0 || inputValue.match(/^([\w.%+-]+)@([\w-]+\.)+([\w]{2,})$/i) === null) {
      showError(getInlineErrorSelector(type)[type], loyaltyEmailEmptyError);
      return false;
    }
    removeError(getInlineErrorSelector(type)[type]);
    return true;
  }

  if (type === 'cardNumber' || type === 'cardNumberCheckout') {
    if (inputValue.length === 0 || inputValue.match(/^[0-9]+$/) === null) {
      showError(getInlineErrorSelector(type)[type], loyaltyCardEmptyError);
      return false;
    }
    removeError(getInlineErrorSelector(type)[type]);
    return true;
  }

  return true;
}

export default validateElementValueByType;
