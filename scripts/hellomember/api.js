/* eslint-disable import/no-cycle */
import { getConfigValue } from '../configs.js';
import { getSignInToken, performCommerceRestMutation, performCommerceRestQuery } from '../commerce.js';
import { getCustomer } from '../customer/api.js';

async function createUrl(endpoint) {
  const baseUrl = await getConfigValue('commerce-rest-endpoint');

  const storeViewCode = await getConfigValue('commerce-store-view-code');

  const url = `${baseUrl}/${storeViewCode}/V1/${endpoint}`;

  return url;
}

export async function getAPCCustomerData(programCode = 'hello_member') {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const customer = await getCustomer(true);

  if (!customer) {
    return null;
  }

  const url = await createUrl(`customers/apcCustomerData/${customer.id}?customerId=${customer.id}&programCode=${programCode}`);

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, !!token);

  if (!success) {
    console.error('Error fetching APC customer data', status, message);
  }

  console.log('getAPCCustomerData', data);

  return data;
}

export async function getAPCTierProgressData(useCache = false, programCode = 'hello_member') {
  const token = getSignInToken();

  if (!token) {
    return null;
  }
  const lang = document.documentElement.lang || 'en';
  const cachedData = sessionStorage.getItem(`apcTierProgressData:${lang}`);
  if (useCache && cachedData?.expiryTime > Date.now()) {
    return JSON.parse(cachedData.data);
  }

  const customer = await getCustomer(true);

  if (!customer) {
    return null;
  }

  const url = await createUrl(`customers/apcTierProgressData/customerId/${customer.id}?customerId=${customer.id}&programCode=${programCode}`);

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, !!token);

  if (!success) {
    console.error('Error fetching APC customer data', status, message);
  }

  sessionStorage.setItem(`apcTierProgressData:${lang}`, {
    data: JSON.stringify(data),
    expiryTime: Date.now() + 1000 * 60 * 10, // TTL 10 minutes
  });
  return data;
}

export async function getHelloMemberCoupons(programCode = 'hello_member') {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const customer = await getCustomer(true);

  if (!customer) {
    return null;
  }

  const url = await createUrl(`hello-member/customers/coupons?customerId=${customer.id}&programCode=${programCode}`);

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, !!token);

  if (!success) {
    console.error('Error fetching Hello Member Coupons data', status, message);
  }

  console.log('getHelloMemberCoupons', data);

  return data;
}

export async function getHelloMemberOffers(programCode = 'hello_member') {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const customer = await getCustomer(true);

  if (!customer) {
    return null;
  }

  const url = await createUrl(`hello-member/customers/offers?customerId=${customer.id}&programCode=${programCode}`);

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, !!token);

  if (!success) {
    console.error('Error fetching Hello Member Offers data', status, message);
  }

  console.log('getHelloMemberOffers', data);

  return data;
}

export async function getHelloMemberCouponDetails(couponId, programCode = 'hello_member') {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const customer = await getCustomer(true);

  if (!customer) {
    return null;
  }

  const url = await createUrl(`hello-member/customers/coupons/id/${couponId}?customerId=${customer.id}&programCode=${programCode}&code=${couponId}`);

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, !!token);

  if (!success) {
    console.error('Error fetching Hello Member Coupon Details data', status, message);
    return { success: false, message };
  }

  console.log('getHelloMemberCouponDetails', data);

  return { success: true, data };
}

export async function getHelloMemberOfferDetails(offerCode, programCode = 'hello_member') {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const customer = await getCustomer(true);

  if (!customer) {
    return null;
  }

  const url = await createUrl(`hello-member/customers/offers/code/${offerCode}?customerId=${customer.id}&programCode=${programCode}&code=${offerCode}`);

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, !!token);

  if (!success) {
    console.error('Error fetching Hello Member Offer Details data', status, message);
    return { success: false, message };
  }

  console.log('getHelloMemberOfferDetails', customer);

  return { success: true, data };
}

export async function applyOfferToCart(offerCode, offerType, programCode = 'hello_member') {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const customer = await getCustomer(true);

  if (!customer) {
    return null;
  }

  const variables = {
    customerId: customer.id,
    programCode,
    offerCode,
    offerType,
  };

  const url = await createUrl(`hello-member/carts/mine/memberOffers?customerId=${customer.id}&programCode=${programCode}&code=${offerCode}`);

  const {
    data, success, message, status,
  } = await performCommerceRestMutation(url, variables, !!token, 'POST');

  if (!success) {
    console.error('Error applying Hello Member Offer to cart', status, message);
    return { success: false, message };
  }

  console.log('applyOfferToCart', data);
  return { success: true, data, message };
}

export async function applyVoucherToCart(couponCode, programCode = 'hello_member') {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const customer = await getCustomer(true);

  if (!customer) {
    return null;
  }

  const variables = {
    customerId: customer.id,
    programCode,
    voucherCodes: [couponCode],
  };

  const url = await createUrl('hello-member/carts/mine/bonusVouchers');

  const {
    data, success, message, status,
  } = await performCommerceRestMutation(url, variables, !!token, 'POST');

  if (!success) {
    console.error('Error applying Hello Member Voucher to cart', status, message);
    return { success: false, message };
  }

  console.log('applyVoucherToCart', data);
  return { success: true, data, message };
}

export async function getAPCTransactions(programCode = 'hello_member', firstResult = 1, pageSize = 10) {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const customer = await getCustomer(true);

  if (!customer) {
    return null;
  }

  const url = await createUrl(`customers/apcTransactions?customerId=${customer.id}&programCode=${programCode}&firstResult=${firstResult}&pageSize=${pageSize}`);

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, !!token);

  if (!success) {
    console.error('Error fetching APC Transactions data', status, message);
  }

  console.log('getAPCTransactions', data);

  return data;
}
