import { fetchPlaceholdersForLocale } from '../../scripts/scripts.js';
import { getConfigValue } from '../../scripts/configs.js';

export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';
  const commerceRestEndpoint = await getConfigValue('commerce-rest-endpoint');
  const storeCode = await getConfigValue('commerce-store-view-code');
  const placeholders = await fetchPlaceholdersForLocale();
  const key = new URLSearchParams(window.location.search).get('key');
  let userEmail = new URLSearchParams(window.location.search).get('customer_email');
  if (userEmail) {
    userEmail = userEmail.replace(/\s/g, '+');
  }
  const response = await fetch(`${commerceRestEndpoint}/${storeCode}/V1/alshaya/${userEmail}/activate`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      confirmationKey: `${key}`,
    }),
  });

  if (response.ok) {
    const successMessage = placeholders.successVerifyEmail || 'You have just used your one-time login link. Your account is now active and you are authenticated. Please login to continue.';
    localStorage.setItem('verifyEmailSuccessRedirect', successMessage);
    window.location.href = `/${lang}/user/login?source=verifyEmailSuccess`;
  } else {
    const errorMessage = placeholders.errorVerifyEmail || 'The mail is already activate or expired/invalid.';
    localStorage.setItem('verifyEmailErrorRedirect', errorMessage);
    window.location.href = `/${lang}/user/login?source=verifyEmailError`;
  }
  const verifyEmailContainer = document.createElement('div');
  block.appendChild(verifyEmailContainer);
}
