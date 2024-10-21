// Helper function to get the DOM element and handle potential null values
const getElementById = (id) => document.getElementById(id);

// Centralized error logging function
const logError = (operation, error) => {
  console.error(`${operation} fail ${error.message}`);
};

export const resetField = (id) => {
  try {
    const element = getElementById(id);
    if (element) {
      element.innerHTML = '';
      element.classList.remove('error');
    }
  } catch (e) {
    logError('resetField', e);
  }
};

export const displayErrorMessage = (id, message) => {
  try {
    const element = getElementById(id);
    if (element) {
      element.innerHTML = message;
      element.classList.add('error');
    }
  } catch (e) {
    logError('displayErrorMessage', e);
  }
};

export const showRequiredMessage = (id) => {
  try {
    const element = getElementById(id);
    if (element) {
      const title = element.parentNode?.querySelector('label');
      element.innerHTML = title
        ? `Please enter your  ${title.innerHTML}`
        : 'This field is required.';

      element.classList.add('error');
    }
  } catch (e) {
    logError('showRequiredMessage', e);
  }
};

export const handleValidationMessage = (id, value, isValid, invalidMessage) => {
  if (isValid) {
    resetField(id);
  } else {
    displayErrorMessage(id, invalidMessage);
  }
};
