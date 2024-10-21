import { fetchPlaceholdersForLocale, isLoggedInUser } from '../../scripts/scripts.js';
import { FORGOT_PASSWORD_SOURCE } from '../commerce-login/commerce-login.js';
import {
  setErrorMessageForField, validateForm, validateInput, showPageErrorMessage,
} from '../../scripts/forms.js';
import { forgotPassword } from '../../scripts/customer/api.js';
import { decorateIcons } from '../../scripts/aem.js';
import { datalayerLogin } from '../../scripts/analytics/google-data-layer.js';

export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';
  if (isLoggedInUser()) {
    window.location.href = `/${lang}/user/account`;
    return;
  }
  const placeholders = await fetchPlaceholdersForLocale();
  const sourcePage = FORGOT_PASSWORD_SOURCE;
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="input-field-wrapper">
      <div class="input-wrapper input-field">
      <input type="email" id="email" name="email" placeholder="" aria-label="${placeholders.email || 'Email'}" required autocomplete="email">
        <label for="email">${placeholders.email || 'Email'}</label>
      </div>
    </div>
   <button type="submit"><span>${placeholders.submit || 'Submit'}</span></button>
  `;

  form.noValidate = true;

  form.querySelectorAll('input').forEach((input) => {
    setErrorMessageForField(input, placeholders);
  });

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      validateInput(input);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(form)) {
      return;
    }
    form.querySelector('button').classList.add('loader');
    const email = form.querySelector('#email').value;

    const responseData = await forgotPassword(email);

    if (responseData?.success) {
      const url = new URL(`/${lang}/user/login`, window.location.origin);
      url.searchParams.append('source', `${sourcePage}`);
      datalayerLogin('Forget Password - Submit', 'Email');
      window.location.href = url.toString();
      return;
    }
    if (responseData.errors) {
      const errorList = [];
      responseData.errors.forEach((error) => {
        errorList.push(error.message);
      });
      showPageErrorMessage(errorList[0]);
    }
    form.querySelector('button').classList.remove('loader');
  });
  const forgotPasswordContainer = document.createElement('div');
  forgotPasswordContainer.classList.add('password-container');
  forgotPasswordContainer.appendChild(form);
  decorateIcons(forgotPasswordContainer);
  block.appendChild(forgotPasswordContainer);
}
