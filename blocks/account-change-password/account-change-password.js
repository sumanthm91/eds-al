import { decorateIcons } from '../../scripts/aem.js';
import { CHANGE_PASSWORD_SOURCE } from '../commerce-login/commerce-login.js';
import {
  showPageErrorMessage, showErrorMessage, togglePasswordVisibility, setErrorMessageForField,
  validateForm,
  validateInput,
  PASSWORD_PATTERN,
} from '../../scripts/forms.js';
import { fetchPlaceholdersForLocale, logout } from '../../scripts/scripts.js';
import { changePassword } from '../../scripts/customer/api.js';

export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';
  const placeholders = await fetchPlaceholdersForLocale();

  const validationRulesContent = block.querySelector('ul');

  const form = document.createElement('form');
  form.innerHTML = `
  <div class="input-field-wrapper">
    <div class="input-wrapper input-field">
      <input type="password" id="current-password" name="current-password" placeholder=" " aria-label="${placeholders.currentPassword || 'Current password'}" required minlength="7" autocomplete="password">
      <label for="current-password">${placeholders.currentPassword || 'Current password'}</label>
      <span class="unmask-password" aria-controls="current-password"></span>
    </div>
  </div>
  <div class="input-field-wrapper">
    <div class="input-wrapper input-field">
      <input type="password" id="new-password" name="new-password" required minlength="7" pattern="${PASSWORD_PATTERN}" placeholder=" " aria-label="${placeholders.newPassword || 'New password'}" autocomplete="new-password">
      <label for="new-password">${placeholders.newPassword || 'New password'}</label>
      <span class="unmask-password" aria-controls="new-password"></span>
    </div>    
  </div>
  `;
  form.setAttribute('novalidate', '');

  if (validationRulesContent) {
    validationRulesContent.classList.add('validation-container', 'hide');
    form.appendChild(validationRulesContent);
  }

  const button = document.createElement('button');
  button.type = 'submit';
  button.innerHTML = `
    <span>${placeholders.changePasswordButton || 'Save'}</span>`;
  form.appendChild(button);

  form.querySelectorAll('input').forEach((input) => {
    setErrorMessageForField(input, placeholders);
  });

  const unmaskPasswordEls = form.querySelectorAll('.unmask-password');
  unmaskPasswordEls.forEach((el) => {
    el.addEventListener('click', togglePasswordVisibility);
  });

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      validateInput(input);

      if (input.id === 'new-password') {
        const validationContainer = form.querySelector('.validation-container');
        if (input.value !== '') {
          validationContainer.classList.remove('hide');
        } else {
          validationContainer.classList.add('hide');
        }
      }
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(form)) {
      return;
    }
    const eventButton = form.querySelector('button');
    if (eventButton.classList.contains('loader')) {
      return;
    }

    eventButton.classList.add('loader');
    const currentPassword = form.querySelector('#current-password');
    const newPassword = form.querySelector('#new-password');

    if (!validateForm(form)) {
      return;
    }

    changePassword(currentPassword.value, newPassword.value).then((responseData) => {
      eventButton.classList.remove('loader');

      // TODO: eval email against user email in storage
      if (responseData.data?.commerce_changeCustomerPassword?.email) {
        const url = new URL(`/${lang}/user/login`, window.location.origin);
        logout(url, CHANGE_PASSWORD_SOURCE);
        return;
      }
      if (responseData.errors) {
        const errorList = [];
        responseData.errors.forEach((error) => {
          errorList.push(error.message);
        });
        showErrorMessage(newPassword, errorList[0]);
        form.reset();
        return;
      }
      showPageErrorMessage(placeholders.passwordChangeFailed || 'Password change failed.');
    });
  });
  const changePasswordContainer = document.createElement('div');
  changePasswordContainer.classList.add('change-password-container');
  changePasswordContainer.appendChild(form);
  decorateIcons(changePasswordContainer);
  block.appendChild(changePasswordContainer);
}
