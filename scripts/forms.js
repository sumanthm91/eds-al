/* eslint-disable import/no-cycle */
import { closeModal } from './scripts.js';
import openOtpVerificationModal from './customer/otp.js';
import { fetchSendOtp, fetchVerifyOtp } from './customer/register-api.js';
import { getConfigValue } from './configs.js';
import { getAppbuilderClient } from '../react-app/utils/api-client.js';

export const EMAIL_PATTERN = String.raw`[A-Za-z0-9\._%+\-]+@[A-Za-z0-9\.\-]+\.[A-Za-z]+$`;
export const PASSWORD_PATTERN = String.raw`(?=.*[!@#$%^&*\(\),.?:\{\}\|<>])(?=.*\d)[^\s]{8,}`;
export const FULLNAME_PATTERN = String.raw`^\p{L}+(?:\s\p{L}+)+$`;
export const DATE_PATTERN = /^(?!0)\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const PHONE_PATTERN = String.raw`[0-9]{9}`;

export function resetMessageForm() {
  document.querySelector('.page-error-message')?.classList.remove('visible');
  document.querySelector('.page-success-message')?.classList.remove('visible');
}

export function showPageSuccessMessage(message, source) {
  const errorContainer = document.querySelector('.page-error-message');
  if (errorContainer) {
    errorContainer.remove();
  }
  const successContainer = document.querySelector('.page-success-message') || document.createElement('div');
  successContainer.classList.add('page-success-message');
  successContainer.innerHTML = message;
  successContainer.classList.add('visible');
  if (source === 'prependMainWrapper') {
    const bodyTag = document.querySelector('body');
    bodyTag.insertBefore(successContainer, document.querySelector('.main-wrapper'));
  } else {
    document.querySelector('main').prepend(successContainer);
  }
}

export function showPageErrorMessage(message, source) {
  const successContainer = document.querySelector('.page-success-message');
  if (successContainer) {
    successContainer.remove();
  }
  const errorContainer = document.querySelector('.page-error-message') || document.createElement('div');
  errorContainer.classList.add('page-error-message');
  errorContainer.innerHTML = message;
  errorContainer.classList.add('visible');

  if (source === 'prependMainWrapper') {
    const bodyTag = document.querySelector('body');
    bodyTag.insertBefore(errorContainer, document.querySelector('.main-wrapper'));
  } else {
    document.querySelector('main').prepend(errorContainer);
  }
}

export function showPageErrorMessageFromErrors(errors = []) {
  const errorList = document.createElement('ul');
  errors.forEach((error) => {
    console.log('error', error);
    const errorElement = document.createElement('li');
    errorElement.textContent = error.message;
    errorList.appendChild(errorElement);
  });
  showPageErrorMessage(errorList.outerHTML);
}

export function togglePasswordVisibility(e) {
  const unmaskPassword = e.target;
  const passwordInput = document.getElementById(unmaskPassword.getAttribute('aria-controls'));
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    unmaskPassword.classList.add('visible');
  } else {
    passwordInput.type = 'password';
    unmaskPassword.classList.remove('visible');
  }
}

export function setErrorForField($field) {
  const errorDiv = document.createElement('div');
  errorDiv.classList.add('error-message-container', 'hide');

  const errorField = document.createElement('span');
  errorField.textContent = '';
  errorField.className = 'error-message';

  const icon = document.createElement('span');
  icon.classList.add('icon', 'icon-info-small-error');
  errorDiv.appendChild(icon);
  errorDiv.appendChild(errorField);

  $field.closest('.input-field-wrapper').appendChild(errorDiv);
}

function convertToCamelCase(str) {
  let newString = str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  newString = newString.charAt(0).toUpperCase() + newString.slice(1).toLowerCase();
  return newString;
}

export function getErrorMessageForField(fieldName, fieldLabel, placeholders, errorType = 'required', fieldType = 'text', chars = 0, chars1 = 0) {
  let errorMessage = placeholders[`error${convertToCamelCase(errorType) + convertToCamelCase(fieldName)}`];

  if (!errorMessage) {
    if (errorType === 'required') {
      errorMessage = placeholders[`error${convertToCamelCase(errorType)}`] || 'Please enter {{label}}';
    } else if (errorType === 'typeMismatch') {
      errorMessage = placeholders[`error${convertToCamelCase(errorType)}`] || 'The {{label}} should be a valid {{type}}';
    } else if (errorType === 'tooShort') {
      errorMessage = placeholders[`error${convertToCamelCase(errorType)}`] || 'The {{label}} must be at least {{chars}} characters';
    } else if (errorType === 'tooLong') {
      errorMessage = placeholders[`error${convertToCamelCase(errorType)}`] || 'The {{label}} must be at most {{chars}} characters';
    } else if (errorType === 'patternMismatch') {
      errorMessage = placeholders[`error${convertToCamelCase(errorType)}`] || 'The {{label}} does not match the expected format';
    } else if (errorType === 'specialChar') {
      errorMessage = placeholders[`error${convertToCamelCase(errorType)}`] || 'The {{label}} must contain at least one special character';
    } else if (errorType === 'numeric') {
      errorMessage = placeholders[`error${convertToCamelCase(errorType)}`] || 'The {{label}} must contain at least one numeric character';
    } else if (errorType === 'spaces') {
      errorMessage = placeholders[`error${convertToCamelCase(errorType)}`] || 'The {{label}} cannot contain spaces';
    } else if (errorType === 'previous') {
      errorMessage = placeholders[`error${convertToCamelCase(errorType)}`] || 'The {{label}} cannot be the same as the previous four passwords';
    } else if (errorType === 'priceRange') {
      errorMessage = placeholders[`error${convertToCamelCase(errorType)}`] || 'Please enter amount in the range of {{chars}} to {{chars1}}';
    }
  }

  return errorMessage ? errorMessage.replace('{{label}}', fieldLabel).replace('{{chars}}', chars).replace('{{chars1}}', chars1).replace('{{type}}', fieldType) : '';
}

export function showErrorMessage(input, message, errorWithLink = false) {
  if (message !== '') {
    const parent = input.closest('.input-field-wrapper');
    if (!parent) {
      return;
    }
    input.ariaInvalid = true;
    input.setAttribute('aria-errormessage', message);
    const errorMessageField = parent.querySelector('.error-message');
    const errorMessageContainer = parent.querySelector('.error-message-container');
    if (errorMessageField) {
      if (errorWithLink && message.includes('Please log in')) {
        const redirectUrl = `/${document.documentElement.lang}/cart/login?redirect=/${document.documentElement.lang}/checkout`;
        const linkedMessage = message.replace(
          'Please log in',
          `<a href="${redirectUrl}">Please log in</a>`,
        );

        errorMessageField.innerHTML = linkedMessage;
      } else {
        errorMessageField.innerText = message;
      }
    }

    if (errorMessageContainer) {
      errorMessageContainer.classList.remove('hide');
    }
    parent.classList.add('invalid');
  }
}

export function resetMessage(input) {
  const parent = input.closest('.input-field-wrapper');
  if (!parent) {
    return;
  }

  input.ariaInvalid = false;
  input.removeAttribute('aria-errormessage');
  input.setCustomValidity?.('');
  const errorMessageField = parent.querySelector('.error-message');
  const errorMessageContainer = parent.querySelector('.error-message-container');
  if (errorMessageField) {
    errorMessageField.innerText = '';
  }

  if (errorMessageContainer) {
    errorMessageContainer.classList.add('hide');
  }
  parent.classList.remove('invalid');
}

export function setErrorMessageForField($field, placeholders) {
  const title = $field.getAttribute('aria-label') || $field.placeholder;
  if ($field.type === 'password') {
    $field.dataset.validationSpecialCharMessage = getErrorMessageForField($field.name, title, placeholders, 'specialChar');
    $field.dataset.validationNumericMessage = getErrorMessageForField($field.name, title, placeholders, 'numeric');
    $field.dataset.validationSpacesMessage = getErrorMessageForField($field.name, title, placeholders, 'spaces');
    $field.dataset.validationPreviousMessage = getErrorMessageForField($field.name, title, placeholders, 'previous');
  }

  if ($field.required) {
    $field.dataset
      .validationRequiredMessage = getErrorMessageForField($field.name, title, placeholders, 'required');
  }

  if ($field.pattern) {
    $field.dataset
      .validationPatternMismatchMessage = getErrorMessageForField($field.name, title, placeholders, 'patternMismatch', $field.type);
  }

  if ($field.getAttribute('minlength')) {
    $field.dataset
      .validationTooShortMessage = getErrorMessageForField($field.name, title, placeholders, 'tooShort', $field.type, $field.minLength);
  }

  if ($field.getAttribute('maxlength')) {
    $field.dataset
      .validationTooLongMessage = getErrorMessageForField($field.name, title, placeholders, 'tooLong', $field.type, $field.maxLength);
  }

  if ($field.type === 'email') {
    $field.dataset
      .validationTypeMismatchMessage = getErrorMessageForField($field.name, title, placeholders, 'typeMismatch', $field.type);
  }

  if ($field.getAttribute('min') && $field.getAttribute('max')) {
    $field.dataset.validationPriceRangeMessage = getErrorMessageForField($field.name, title, placeholders, 'priceRange', $field.type, $field.min, $field.max);
  }

  setErrorForField($field);
}

export async function validateAddressDropdowns(form, placeholders, isCheckoutPage) {
  let selectedFromDropdown = true;
  form.querySelectorAll('.custom-select').forEach((dropdown) => {
    const selectionBox = dropdown.querySelector('.select-selected');
    if (dropdown.hasAttribute('name') && !selectionBox.classList.contains('disabled')) {
      if (isCheckoutPage && selectionBox.getAttribute('data-initial-value')) {
        resetMessage(dropdown);
        selectedFromDropdown = true;

        return;
      }

      if (!selectionBox.getAttribute('data-value')) {
        let errorMessage = placeholders.addAddressSelectError || `Please select ${dropdown.getAttribute('aria-label')}`;
        errorMessage = errorMessage.replace('{{label}}', dropdown.getAttribute('aria-label'));
        showErrorMessage(dropdown, errorMessage);
        selectedFromDropdown = false;
      } else {
        resetMessage(dropdown);
        selectedFromDropdown = true;
      }
    }
    if (!selectionBox.getAttribute('data-value')) {
      let errorMessage = placeholders.contactUsFeedback || `Please select ${dropdown.getAttribute('aria-label')}`;
      errorMessage = errorMessage.replace('{{label}}', dropdown.getAttribute('aria-label'));
      showErrorMessage(dropdown, errorMessage);
      selectedFromDropdown = false;
    } else {
      resetMessage(dropdown);
      selectedFromDropdown = true;
    }
  });
  return selectedFromDropdown;
}

export function validateInput(input) {
  resetMessage(input);
  if (typeof input.checkValidity === 'function' && !input.checkValidity()) {
    let errorMessage = '';
    if (input.validity.valueMissing) {
      errorMessage = input.dataset.validationRequiredMessage;
    } else if (input.validity.typeMismatch) {
      errorMessage = input.dataset.validationTypeMismatchMessage;
    } else if (input.validity.tooShort) {
      errorMessage = input.dataset.validationTooShortMessage;
    } else if (input.validity.tooLong) {
      errorMessage = input.dataset.validationTooLongMessage;
    } else if (input.validity.patternMismatch) {
      errorMessage = input.dataset.validationPatternMismatchMessage;
    } else if (input.validity.rangeUnderflow) {
      errorMessage = input.dataset.validationPriceRangeMessage;
    } else if (input.validity.rangeOverflow) {
      errorMessage = input.dataset.validationPriceRangeMessage;
    }

    showErrorMessage(input, errorMessage);
    return false;
  }

  return true;
}

export function validateInputSame(input, otherInput, message) {
  if (!input.validity.valid) {
    return false;
  }
  resetMessage(input);
  if (input.value !== otherInput.value) {
    input.setCustomValidity(message);
    showErrorMessage(input, message);
    return false;
  }

  return true;
}

export function validateForm(form, placeholders, isCheckoutPage = false) {
  resetMessageForm();
  let isValid = true;
  const isCustomSelectAvailableInsideForm = form.querySelector('.custom-select');
  if (
    isCustomSelectAvailableInsideForm
    && !validateAddressDropdowns(form, placeholders, isCheckoutPage)
  ) {
    isValid = false;
  }
  form.querySelectorAll('input:not(div.custom-select input), textarea:not(div.custom-select textarea)').forEach((input) => {
    if (!validateInput(input)) {
      isValid = false;
    }
  });
  return isValid;
}

function formatDateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function isDateBefore(dateString, compareDateString) {
  const date = new Date(dateString);
  return date < compareDateString;
}

export async function dateValidation(dateInput, placeholders) {
  const today = new Date();
  const eighteenYearsAgo = new Date(today.setFullYear(today.getFullYear() - 18));
  const inputValue = dateInput.value;
  const isValidDateBefore = await isDateBefore(inputValue, eighteenYearsAgo);
  const dateformat = formatDateToISO(eighteenYearsAgo);
  if (DATE_PATTERN.test(inputValue)) {
    const createNewAccountButton = document.querySelector('.createNewAccountButton');
    const saveButton = document.querySelector('.saveButton');
    const targetButton = createNewAccountButton || saveButton;
    if (!isValidDateBefore) {
      showErrorMessage(dateInput, `${placeholders.isValidDate} ${dateformat}.`);
      if (targetButton) {
        targetButton.disabled = true;
      }
    } else if (targetButton) {
      targetButton.disabled = false;
    }
  }
}

export async function validatePhone(phoneNumber, market) {
  await import('./third-party/libphonenumber-min.js');
  const phoneNumberCheck = window.libphonenumber.parsePhoneNumber(phoneNumber, market);
  return phoneNumberCheck.isValid();
}

const maxResendLimit = 3;
export async function sendOtp(phoneInput, countryIso, resendCounter, placeholders) {
  if (resendCounter >= maxResendLimit) {
    const sendOtpButton = document.querySelector('.otp-button');
    showErrorMessage(phoneInput, placeholders.maxSendOtpAttemptError);
    sendOtpButton.disabled = true;
    closeModal('otp-verification-dialog');
    return { success: false, resendCounter };
  }
  const response = await fetchSendOtp(phoneInput, countryIso);
  let updatedResendCounter = resendCounter;

  if (response.data) {
    updatedResendCounter += 1;
    openOtpVerificationModal(phoneInput, countryIso, updatedResendCounter, placeholders);
    return { success: true, updatedResendCounter };
  }

  return { success: false, updatedResendCounter };
}

export function setupOtpValidation(otpInputs, otpVerifyButton, otpLine) {
  otpInputs[0].focus();
  otpInputs.forEach((input, index) => {
    input.addEventListener('input', () => {
      if (input.value.length === 1 && index < otpInputs.length - 1) {
        otpInputs[index + 1].focus();
      }
      otpLine[index].classList.toggle('hidden', input.value.length === 1);
      const otpValues = Array.from(otpInputs).map((i) => i.value).join('');
      otpVerifyButton.disabled = otpValues.length !== 6;
    });

    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && index > 0 && input.value.length === 0) {
        otpLine[index - 1].classList.remove('hidden');
        otpInputs[index - 1].focus();
      }
    });
  });
}

export async function verifyOtp(countryIso, phoneInput, otp, placeholders) {
  const response = await fetchVerifyOtp(countryIso, phoneInput, otp);

  if (response) {
    phoneInput.closest('.input-field-wrapper').classList.add('success');
    showErrorMessage(phoneInput, placeholders.otpVerifiedMessage);
    document.querySelector('.otp-button').disabled = true;
    closeModal('otp-verification-dialog');
    if (document.querySelector('.createNewAccountButton')) {
      document.querySelector('.createNewAccountButton').disabled = false;
    } else if (document.querySelector('.saveButton')) {
      document.querySelector('.saveButton').disabled = false;
    }
  } else {
    document.querySelector('.otp-verification-container').classList.add('otp-error');
    document.querySelector('.otp-verify-button').disabled = true;
  }
}

export function customSelectbox(form) {
  form.querySelectorAll('.select-selected').forEach((item) => {
    item.addEventListener('click', function () {
      const currentItems = this.parentNode.querySelector('.select-items');

      // Hide all other dropdowns
      document.querySelectorAll('.select-items').forEach((selectItem) => {
        if (selectItem !== currentItems) {
          selectItem.classList.add('select-hide');
          selectItem.parentNode.querySelector('.select-search')?.classList.add('hide');
        }
      });

      // Toggle the clicked dropdown
      currentItems.classList.toggle('select-hide');
      currentItems.parentNode.querySelector('.select-search')?.classList.toggle('hide');
    });
  });

  form.querySelectorAll('.select-items div').forEach((item) => {
    item.addEventListener('click', function () {
      const currentDropdown = this.parentNode.parentNode;
      const selected = currentDropdown.querySelector('.select-selected');
      selected.textContent = this.textContent;
      selected.dataset.value = this.dataset.value;
      this.parentNode.classList.add('select-hide');
      currentDropdown.querySelector('.select-search')?.classList.add('hide');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.matches('.custom-select, .custom-select *')) {
      form.querySelectorAll('.select-items').forEach((item) => {
        item.classList.add('select-hide');
        item.parentNode.querySelector('.select-search')?.classList.add('hide');
      });
    }
  });
}

export async function phoneWithIso(countryIso) {
  let phoneNumberWithIso = '';
  const phoneInputValue = document.querySelector('#phone').value;
  if (phoneInputValue) {
    phoneNumberWithIso = `+${countryIso}${phoneInputValue}`;
  }
  return phoneNumberWithIso;
}

export async function addRecaptchaScript(siteKey) {
  const captchaScript = document.createElement('script');
  captchaScript.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
  document.head.appendChild(captchaScript);
}

export async function validateReCaptchaV3(responseKey) {
  try {
    const apiDomain = await getConfigValue('commerce-cdn-domain');
    const apiEndPoint = await getConfigValue('recaptchaV3-api-endpoint');
    const apiUrl = `${apiDomain}${apiEndPoint}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ responseKey }),
    });
    if (!response.ok) {
      const errorDetails = await response.json().catch(() => 'Unknown error');
      throw new Error(`Server responded with an error: ${response.status} ${errorDetails}`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Server responded with an error: ${data['error-codes']}`);
    }
    const thresholdScore = Number(await getConfigValue('recaptchaV3-threshold-score')) || 0.4;
    return data.score > thresholdScore;
  } catch (error) {
    console.error('Recaptcha Error logging in', error);
    return false;
  }
}

export async function getErrorfields(form) {
  const errorList = form.querySelectorAll('.error-message-container:not(.hide)');
  const inputTypes = Object.values(errorList).map((ele) => {
    const inputElement = ele.parentNode.querySelector('input');
    const inputElementField = inputElement.type === 'text' ? inputElement.id : inputElement.type;
    return inputElementField;
  });
  return inputTypes.join(', ');
}

export async function validateCustomerEmail(email) {
  const requestData = {
    storeViewCode: await getConfigValue('commerce-store-view-code'),
    email,
  };

  const responseData = await getAppbuilderClient(
    await getConfigValue('appbuilder-email-verification-endpoint'),
    requestData,
  );

  return responseData?.response;
}
