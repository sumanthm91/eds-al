import { performCommerceRestQuery, getSignInToken } from '../commerce.js';
import { getConfigValue } from '../configs.js';

async function createUrl(endpoint, commerceStoreViewCode) {
  const baseUrl = await getConfigValue('commerce-rest-endpoint');
  const storeViewCode = await getConfigValue('commerce-store-view-code');
  let url = `${baseUrl}/${storeViewCode}/V1/${endpoint}`;

  if (!commerceStoreViewCode) {
    url = `${baseUrl}/V1/${endpoint}`;
  }
  return url;
}

export async function fetchSendOtp(phoneInput, countryIso) {
  const url = await createUrl(`sendotp/phonenumber/${countryIso}${phoneInput.value}/type/reg`, true);
  const {
    data, success,
  } = await performCommerceRestQuery(url);
  if (!success) {
    return { success, data };
  }

  return { success, data };
}

export async function getAPCSearchData(phoneInput, countryIso) {
  const token = getSignInToken();
  if (!token) {
    return null;
  }
  const url = await createUrl(`customers/apc-search/phone/${countryIso}${phoneInput.value}`, true);
  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, !!token);

  if (!success) {
    console.error('Error fetching APC customer data', status, message);
  }

  return data;
}

export async function fetchVerifyOtp(countryIso, phoneInput, otp) {
  const token = getSignInToken();

  const url = await createUrl(`verifyotp/phonenumber/${countryIso}${phoneInput.value}/otp/${otp}/type/reg`, true);
  const {
    data, success,
  } = await performCommerceRestQuery(url, !!token);
  if (!success) {
    return false;
  }

  return data;
}

export async function fetchStoreViews() {
  const url = await createUrl('store/storeViews', false);
  const {
    data, success,
  } = await performCommerceRestQuery(url);

  if (!success) {
    return false;
  }

  return data;
}
