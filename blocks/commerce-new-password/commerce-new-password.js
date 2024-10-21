import { fetchPlaceholdersForLocale, isLoggedInUser } from '../../scripts/scripts.js';
import { NEW_PASSWORD_SOURCE } from '../commerce-login/commerce-login.js';
import {
  setErrorMessageForField, validateInput, validateInputSame, togglePasswordVisibility,
  validateForm, showPageErrorMessage, PASSWORD_PATTERN,
} from '../../scripts/forms.js';
import { decorateIcons } from '../../scripts/aem.js';
import { resetPassword } from '../../scripts/customer/api.js';

function extractAndDeleteParamsFromURL(paramsToExtract) {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  const extractedParams = {};

  paramsToExtract.forEach((param) => {
    extractedParams[param] = params.get(param);
    params.delete(param);
  });

  window.history.replaceState({}, '', url);
  return extractedParams;
}

export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';
  if (isLoggedInUser()) {
    window.location.href = `/${lang}/user/account`;
    return;
  }

  const validationRulesContent = block.querySelector('ul');

  const { token, email } = extractAndDeleteParamsFromURL(['token', 'email']);
  const placeholders = await fetchPlaceholdersForLocale();
  const sourcePage = NEW_PASSWORD_SOURCE;
  const form = document.createElement('form');
  form.innerHTML = `
  <div class="input-field-wrapper">
      <div class="input-wrapper input-field">
        <input type="password" id="newPassword" name="newPassword" placeholder=" " aria-label="${placeholders.newPassword || 'New Password'}" required autocomplete="new-password">
        <label for="newPassword">${placeholders.newPassword || 'New Password'}</label>
        <span class="unmask-password" aria-controls="newPassword"></span>
      </div>
    </div>
    <div class="input-field-wrapper">
      <div class="input-wrapper input-field">
        <input type="password" id="retypePassword" name="retypePassword" placeholder=" " aria-label="${placeholders.retypePassword || 'Retype Password'}" required autocomplete="new-password">
        <label for="retypePassword">${placeholders.retypePassword || 'Retype Password'}</label>
        <span class="unmask-password" aria-controls="retypePassword"></span>
    </div>
    </div>
  `;

  if (validationRulesContent) {
    validationRulesContent.classList.add('validation-container', 'hide');
    form.appendChild(validationRulesContent);
  }

  const button = document.createElement('button');
  button.type = 'submit';
  button.innerHTML = `
    <span>${placeholders.submit || 'Submit'}</span>`;
  form.appendChild(button);

  form.noValidate = true;

  form.querySelectorAll('input').forEach((input) => {
    input.setAttribute('pattern', PASSWORD_PATTERN);
    setErrorMessageForField(input, placeholders);
  });

  const unmaskPasswordEls = form.querySelectorAll('.unmask-password');
  unmaskPasswordEls.forEach((el) => {
    el.addEventListener('click', togglePasswordVisibility);
  });

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      validateInput(input);

      if (input.id === 'retypePassword') {
        const newPassword = form.querySelector('#newPassword');
        validateInputSame(input, newPassword, `${placeholders.passwordsDoNotMatch || 'Passwords do not match'}`);
      }

      const newPassword = form.querySelector('#newPassword').value;
      const retypePassword = form.querySelector('#retypePassword').value;
      const validationContainer = form.querySelector('.validation-container');
      if (newPassword !== '' || retypePassword !== '') {
        validationContainer.classList.remove('hide');
      } else {
        validationContainer.classList.add('hide');
      }
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(form) || !validateInputSame(form.querySelector('#retypePassword'), form.querySelector('#newPassword'), `${placeholders.passwordsDoNotMatch || 'Passwords do not match'}`)) {
      return;
    }
    form.querySelector('button').classList.add('loader');
    const newPassword = form.querySelector('#newPassword').value;

    if (email && token && newPassword) {
      const responseData = await resetPassword(email, token, newPassword);
      if (responseData?.data?.resetPassword || responseData?.data?.commerce_resetPassword) {
        const url = new URL(`/${lang}/user/login`, window.location.origin);
        url.searchParams.append('source', `${sourcePage}`);
        window.location.href = url.toString();
        return;
      }
      if (responseData?.errors) {
        const errorMessage = responseData?.errors[0].message
        || placeholders.newPasswordError
        || 'Cannot set new password for the customer';
        showPageErrorMessage(errorMessage);
      }

      form.querySelector('button').classList.remove('loader');
    } else {
      showPageErrorMessage(placeholders.newPasswordSessionExpired || 'Session expired, generate new link');
    }
  });

  block.innerHTML = '';

  const newPasswordContainer = document.createElement('div');
  newPasswordContainer.classList.add('new-password-container');
  newPasswordContainer.appendChild(form);
  decorateIcons(newPasswordContainer);
  block.appendChild(newPasswordContainer);
}
