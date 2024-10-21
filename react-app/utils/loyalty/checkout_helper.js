import { getElementValueByType } from './link_card_sign_up_modal_helper.js';
import validateElementValueByType from './validation_helper.js';

/**
 * Utility function to get user input value.
 */
function getUserInput(linkCardOption, placeholders) {
  if (!validateElementValueByType(linkCardOption, '', placeholders)) {
    return {};
  }

  const element = {
    key: linkCardOption,
    type: linkCardOption,
    value: getElementValueByType(linkCardOption),
  };

  if (linkCardOption === 'mobileCheckout') {
    element.type = 'phone';
  }

  if (linkCardOption === 'emailCheckout') {
    element.key = 'email';
    element.type = 'email';
  }

  if (linkCardOption === 'cardNumberCheckout') {
    element.type = 'apcNumber';
  }

  return element;
}

export default getUserInput;
