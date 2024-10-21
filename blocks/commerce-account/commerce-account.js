import { isLoggedInUser, logout } from '../../scripts/scripts.js';
import { getConfigValue } from '../../scripts/configs.js';
import { getCookie } from '../../scripts/commerce.js';

export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';
  const redirectUrl = `/${lang}/user/login`;

  if (!isLoggedInUser()) {
    window.location = redirectUrl;
  }

  const commerceRestEndpoint = await getConfigValue('commerce-rest-endpoint');
  const storeCode = await getConfigValue('commerce-store-view-code');
  const response = await fetch(`${commerceRestEndpoint}/${storeCode}/V1/customers/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getCookie('auth_user_token')}`,
    },
  });
  if (!response.ok) {
    logout(redirectUrl);
    return;
  }
  const data = await response.json();

  block.innerHTML = `
    <div>
        <h1>Welcome back, ${data.firstname}!</h1>
    </div>
  `;
}
