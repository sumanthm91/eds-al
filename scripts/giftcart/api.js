import { getConfigValue } from '../configs.js';
import {
  getSignInToken, performCommerceRestQuery, performCommerceRestMutation,
} from '../commerce.js';

export async function createUrl(endpoint, commerceStoreViewCode) {
  const baseUrl = await getConfigValue('commerce-rest-endpoint');
  const storeViewCode = await getConfigValue('commerce-store-view-code');

  let url = `${baseUrl}/${storeViewCode}/V1/${endpoint}`;

  if (!commerceStoreViewCode) {
    url = `${baseUrl}/V1/${endpoint}`;
  }

  return url;
}

export async function linkGiftCardSendOtp(cardNumber) {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const url = await createUrl('egiftcard/link', true);

  const variables = {
    link_data: {
      action: 'send_otp',
      card_number: cardNumber,
    },
  };

  try {
    const {
      data, success, message, status,
    } = await performCommerceRestMutation(url, variables, !!token);

    if (!success) {
      console.error('Error linking gift card', status, message);
    }
    return data;
  } catch (error) {
    console.error('Error linking gift card', error);
    return null;
  }
}

export async function linkGiftCardVerifyOtp(cardNumber, otp, email, expiry, countryCode) {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const url = await createUrl('egiftcard/link', true);

  const variables = {
    link_data: {
      action: 'verify_otp_link',
      card_number: cardNumber,
      otp,
      email,
      expiry_date: expiry,
      country_code: countryCode,
    },
  };

  const {
    data, success, message, status,
  } = await performCommerceRestMutation(url, variables, !!token);

  if (!success) {
    console.error('Error linking gift card and verifying otp', status, message);
    return false;
  }

  if (data.response_type === true) {
    console.debug(data.response_message);
  }

  return data;
}

export async function linkGiftCardForRedemption(cardNumber) {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const url = await createUrl('/V1/egiftcard/link');

  const variables = {
    link_data: {
      action: 'verified_redemption_link',
      card_number: cardNumber,
    },
  };

  console.debug('linkGiftCardForRedemption', variables);

  const {
    data, success, message, status,
  } = await performCommerceRestMutation(url, variables, !!token);

  if (!success) {
    console.error('Error linking gift card for redemption', status, message);
  }

  console.debug('linkGiftCard', data);

  if (data.response_type === true) {
    console.debug(data.response_message);
  }

  return data;
}

export async function unlinkGiftCard() {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const url = await createUrl('egiftcard/unlinkcard', true);

  const {
    data, success, message, status,
  } = await performCommerceRestMutation(url, {}, !!token);

  if (!success) {
    console.error('Error fetching linked gift cards', status, message);
  }

  return data;
}

export async function getLinkedGiftCards() {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const url = await createUrl('customers/hpsCustomerData', true);

  try {
    const {
      data, success, message, status,
    } = await performCommerceRestQuery(url, !!token);

    if (!success) {
      console.error('Error fetching linked gift cards', status, message);
    }
    return data;
  } catch (error) {
    console.error('Error fetching linked gift cards', error);
    return null;
  }
}

export async function getGiftCardBalanceSendOtp(cardNumber) {
  const url = await createUrl('egiftcard/getBalance', true);

  const variables = {
    accountInfo: {
      cardNumber,
      action: 'send_otp',
    },
  };

  console.debug('getGiftCardBalance', variables);

  const {
    data, success, message, status,
  } = await performCommerceRestMutation(url, variables, false);

  if (!success) {
    console.error('Error fetching gift card balance', status, message);
  }

  console.debug('getGiftCardBalance', data);

  if (data.response_type === true) {
    console.debug(data.response_message);
  }

  return data;
}

export async function getGiftCardBalanceVerifyOtp(cardNumber, otp) {
  const url = await createUrl('egiftcard/getBalance');

  const variables = {
    accountInfo: {
      cardNumber,
      action: 'get_balance',
      otp,
    },
  };

  console.debug('getGiftCardBalance', variables);

  const {
    data, success, message, status,
  } = await performCommerceRestMutation(url, variables, false);

  if (!success) {
    console.error('Error fetching gift card balance', status, message);
  }

  console.debug('getGiftCardBalance', data);

  if (data.response_type === true) {
    console.debug(data.response_message);
  }

  return data;
}

export async function searchGiftCard(hpsNumber) {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const url = await createUrl(`/V1/egiftcard/hps-search/hpsNumber/${hpsNumber}`);

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, !!token);

  if (!success) {
    console.error('Error searching gift card', status, message);
  }

  console.debug('searchGiftCard', data);

  if (data.response_type === true) {
    console.debug(data.response_message);
  }

  return data;
}

export async function searchGiftCardByEmail(email) {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const url = await createUrl(`/V1/egiftcard/hps-search/email/${email}`);

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, !!token);

  if (!success) {
    console.error('Error searching gift card by email', status, message);
  }

  console.debug('searchGiftCardByEmail', data);

  if (data.response_type === true) {
    console.debug(data.response_message);
  }

  return data;
}

export async function topUpGiftCardGuest(amount, cardNumber) {
  const url = await createUrl('egiftcard/topup', true);

  const variables = {
    topup: {
      sku: 'giftcard_topup',
      amount,
      customer_email: '',
      cardNumber,
      top_up_type: 'other',
    },
  };

  const {
    data, success, message, status,
  } = await performCommerceRestMutation(url, variables);

  if (!success) {
    console.error('Error fetching gift card balance', status, message);
  }

  if (data.response_type === true) {
    console.debug(data.response_message);
  }

  return data;
}

export async function topUpGiftCardUser(amount, cardNumber, customerEmail) {
  const url = await createUrl('egiftcard/topup', true);

  const variables = {
    topup: {
      sku: 'giftcard_topup',
      amount,
      customerEmail,
      cardNumber,
      top_up_type: 'self',
    },
  };

  const {
    data, success, message, status,
  } = await performCommerceRestMutation(url, variables);

  if (!success) {
    console.error('Error fetching gift card balance', status, message);
  }

  if (data.response_type === true) {
    console.debug(data.response_message);
  }

  return data;
}
