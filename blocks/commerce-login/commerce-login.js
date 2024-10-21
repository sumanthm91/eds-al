import { getConfigValue } from '../../scripts/configs.js';
import { isLoggedInUser, fetchPlaceholdersForLocale, LOGOUT_SOURCE } from '../../scripts/scripts.js';
import { decorateIcons } from '../../scripts/aem.js';
import { mergeWishlist } from '../../scripts/wishlist/api.js';
import { mergeCart } from '../../scripts/minicart/cart.js';
import { setCookie } from '../../scripts/commerce.js';
import {
  showPageSuccessMessage,
  showPageErrorMessage,
  togglePasswordVisibility,
  setErrorMessageForField,
  validateForm,
  validateInput,
  EMAIL_PATTERN,
  addRecaptchaScript,
  validateReCaptchaV3,
  getErrorfields,
} from '../../scripts/forms.js';
import { datalayerLogin } from '../../scripts/analytics/google-data-layer.js';
import { CARTID_STORE } from '../../scripts/minicart/api.js';

export const FORGOT_PASSWORD_SOURCE = 'forgotPassword';
export const NEW_PASSWORD_SOURCE = 'newPassword';
export const CHANGE_PASSWORD_SOURCE = 'changePassword';
export const VERIFY_EMAIL_SUCCESS_SOURCE = 'verifyEmailSuccess';
export const VERIFY_EMAIL_ERROR_SOURCE = 'verifyEmailError';

// handles login
async function login(form, redirectUrl) {
  const username = form.querySelector('#username').value;
  const password = form.querySelector('#password').value;
  const commerceRestEndpoint = await getConfigValue('commerce-rest-endpoint');
  const storeCode = await getConfigValue('commerce-store-view-code');
  const cookieExpiryDays = await getConfigValue('commerce-login-cookie-expiry-days') || 100;
  const placeholders = await fetchPlaceholdersForLocale();
  try {
    const response = await fetch(`${commerceRestEndpoint}/${storeCode}/V1/integration/customer/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();
    if (!response.ok && data.message) {
      const loginErrorMessage = placeholders.loginErrorMessage || 'Unrecognized email address or password.';
      showPageErrorMessage(loginErrorMessage);
      document.querySelector('.login-container button').classList.remove('loader');
      datalayerLogin('Login Attempt', 'invalid email or password');
      return;
    }
    setCookie('auth_user_token', data, cookieExpiryDays);
    datalayerLogin('Login Success', 'Email : valid');

    if (redirectUrl.includes('/checkout')) {
      const cartDetails = localStorage.getItem(CARTID_STORE);
      const cartId = JSON.parse(cartDetails).value;
      // Dispatch event to associate cart with user
      window.dispatchEvent(new CustomEvent('react:associateCart', { detail: { cartId: JSON.parse(cartId), redirectUrl } }));
    } else {
    // Handle cart and wishlist merge
      const mergeWishlistPromise = mergeWishlist();
      const mergeCartPromise = mergeCart();
      await Promise.all([mergeWishlistPromise, mergeCartPromise]);
      window.location.href = redirectUrl;
    }
  } catch (error) {
    console.error('Error logging in', error);
    const genericErrorMessage = placeholders.genericErrorMessage || 'An error occurred while logging in. Please try again.';
    showPageErrorMessage(genericErrorMessage);
    document.querySelector('.login-container button').classList.remove('loader');
  }
}

async function displayMessageBasedOnSource() {
  const placeholders = await fetchPlaceholdersForLocale();
  const url = new URL(window.location.href);
  const params = url.searchParams;
  if (params.has('source')) {
    const source = params.get('source');
    params.delete('source');
    let message;
    let errorMessage;
    if (source === FORGOT_PASSWORD_SOURCE) {
      message = `${placeholders.loginMessageForgotPassword || 'If your account is valid, an email will be sent with instructions to reset your password.'}`;
    } else if (source === NEW_PASSWORD_SOURCE) {
      message = `${placeholders.loginMessageNewPassword || 'Your password has been changed.'}`;
    } else if (source === LOGOUT_SOURCE) {
      message = `${placeholders.loginMessageLogout || 'You have been logged out.'}`;
    } else if (source === CHANGE_PASSWORD_SOURCE) {
      message = `${placeholders.loginMessageChangePassword || 'Your password has been changed.'}`;
    } else if (source === VERIFY_EMAIL_SUCCESS_SOURCE) {
      message = `${placeholders.loginMessageVerifyEmailSuccess || 'You have just used your one-time login link. Your account is now active and you are authenticated. Please login to continue.'}`;
    } else if (source === VERIFY_EMAIL_ERROR_SOURCE) {
      errorMessage = `${placeholders.loginMessageVerifyEmailError || 'The mail is already activate or expired/invalid.'}`;
    }
    if (message) {
      showPageSuccessMessage(message);
    } else if (errorMessage) {
      showPageErrorMessage(errorMessage);
    }
    window.history.replaceState({}, '', url);
  }
}

function getRedirectUrl() {
  const url = new URL(window.location.href);
  const params = url.searchParams;
  if (params.has('redirect')) {
    const redirect = params.get('redirect');
    const action = params.get('action');
    params.delete('redirect');
    params.delete('action');
    window.history.replaceState({}, '', url);
    if (action) {
      return `${redirect}?action=${action}`;
    }
    return redirect;
  }
  if (document.referrer) {
    const refererUrl = new URL(document.referrer);
    const path = refererUrl.pathname + refererUrl.search + refererUrl.hash;
    if (refererUrl.pathname.includes('login')
    || refererUrl.pathname.includes('/user/register')
    || refererUrl.pathname.includes('/customer/account/confirm')) {
      return `/${document.documentElement.lang || 'en'}/user/account`;
    }
    return `${path}`;
  }
  return `/${document.documentElement.lang || 'en'}/user/account`;
}

export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';
  const redirectUrl = getRedirectUrl();

  if (isLoggedInUser()) {
    window.location.href = redirectUrl;
    return;
  }

  const placeholders = await fetchPlaceholdersForLocale();
  const form = document.createElement('form');
  form.innerHTML = `
    <div class="input-field-wrapper">
      <div class="input-wrapper">
        <input type="email" id="username" name="username" aria-label="${placeholders.email || 'Email'}" placeholder=" " pattern="${EMAIL_PATTERN}" required autocomplete="email" >
        <label for="username">${placeholders.email || 'Email'}</label>
      </div>
    </div>
    <div class="input-field-wrapper">
      <div class="input-wrapper">
        <input type="password" id="password" name="password" aria-label="${placeholders.password || 'Password'}" placeholder=" " required autocomplete="password">
        <label for="password">${placeholders.password || 'Password'}</label>
        <span class="unmask-password" aria-controls="password"></span>
      </div>
    </div>
    <button type="submit"><span>${placeholders.signin || 'Sign In'}</span></button>
    <a href="/${lang}/user/password" class="forgot-password">${placeholders.forgotPassword}</a>
  `;

  const siteKey = await getConfigValue('recaptchaV3-sitekey');
  addRecaptchaScript(siteKey);
  form.setAttribute('novalidate', '');

  form.querySelectorAll('input').forEach((input) => {
    setErrorMessageForField(input, placeholders);
  });

  form.querySelector('.unmask-password').addEventListener('click', togglePasswordVisibility);

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      validateInput(input);
    });
  });

  form.querySelector('.forgot-password').addEventListener('click', () => {
    datalayerLogin('Forget Password - Click', 'Email');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = document.querySelector('.login-container button');
    if (!validateForm(form)) {
      const errorFieldsList = await getErrorfields(form);
      datalayerLogin('Login Attempt', `Email : invalid - ${errorFieldsList}`);
      return;
    }
    // TODO: REMOVE THIS CONDITIONAL WHEN RECAPTCHA IS ENABLED for PR domains & Multi-market set up
    const bypassRecaptcha = await getConfigValue('recaptcha-bypass');
    if (bypassRecaptcha === 'true') {
      submitButton?.classList.add('loader');
      login(form, redirectUrl);
      return;
    }
    // eslint-disable-next-line no-undef
    grecaptcha.ready(async () => {
      // eslint-disable-next-line no-undef
      const token = await grecaptcha.execute(siteKey, { action: 'submit' });
      if (!token) {
        showPageErrorMessage(placeholders.recaptchaErrorMessage || 'Verification failed. Please try again.');
        return;
      }
      const captchaValidated = await validateReCaptchaV3(token, submitButton);
      if (captchaValidated) {
        login(form, redirectUrl);
      } else {
        submitButton?.classList.remove('loader');
        const recaptchaErrorMessage = placeholders.recaptchaErrorMessage || 'Verification failed. Please try again.';
        showPageErrorMessage(recaptchaErrorMessage);
      }
    });
  });
  const loginContainer = document.createElement('div');
  loginContainer.classList.add('login-container');

  await displayMessageBasedOnSource();
  loginContainer.appendChild(form);
  decorateIcons(loginContainer);
  block.appendChild(loginContainer);
}
