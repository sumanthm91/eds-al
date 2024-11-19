import { getConfigValue } from '../configs.js';
import {
  getSignInToken, performCommerceRestMutation, performCommerceRestQuery,
  performMonolithGraphQLQuery, performRestMutation,
} from '../commerce.js';

const changePasswordQuery = `
  mutation changeCustomerPassword($currentPassword: String!, $newPassword: String!) {
    commerce_changeCustomerPassword (
      currentPassword: $currentPassword
      newPassword: $newPassword
    ) {
      id
      email
    }
  }
`;
const requestPasswordResetMutation = `
  mutation requestPasswordResetEmail($email: String!) {
    commerce_requestPasswordResetEmail(
      email: $email
    )
  }`;

const resetPasswordMutation = `
  mutation resetPassword($email: String!, $token: String!, $newPassword: String!) {
    commerce_resetPassword(
      email: $email
      resetPasswordToken: $token
      newPassword: $newPassword
    )
  }
`;
class Store {
  constructor() {
    this.type = 'guest';
    this.customer = null;
  }

  static DEFAULT_CUSTOMER = {
    firstname: '',
    lastname: '',
    email: '',
  };

  static load() {
    const token = getSignInToken();

    if (token) {
      this.type = 'customer';
    }
  }

  getCustomer() {
    if (!this.isGuest && !this.customer) {
      return Store.DEFAULT_CUSTOMER;
    }

    return this.customer;
  }

  setCustomer(customer) {
    this.customer = customer;
    this.type = 'customer';
  }

  isGuest() {
    return this.type === 'guest';
  }
}

export const store = new Store();

async function createUrl(endpoint) {
  const baseUrl = await getConfigValue('commerce-rest-endpoint');

  const storeViewCode = await getConfigValue('commerce-store-view-code');

  const url = `${baseUrl}/${storeViewCode}/V1/${endpoint}`;

  return url;
}

export async function getCustomerLastOrder() {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  const url = await createUrl('customer-order/me/getLastOrder');

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, true);

  if (!success) {
    console.error('Error fetching customer data', status, message);
    return null;
  }

  return data;
}

export async function getCustomer(useCache = true) {
  const token = getSignInToken();

  if (!token) {
    return null;
  }

  // load from store
  if (useCache && store.customer) {
    console.log('from cache', store.customer);
    return store.customer;
  }

  const url = await createUrl('customers/me');

  const {
    data, success, message, status,
  } = await performCommerceRestQuery(url, true);

  if (!success) {
    console.error('Error fetching customer data', status, message);
    return null;
  }

  store.setCustomer(data);

  return data;
}

export async function updateCustomer(customer, phoneNumber, phoneVerified) {
  if (!getSignInToken()) {
    return null;
  }

  const firstname = customer.name.split(' ')[0];
  const lastname = customer.name.split(' ').slice(1).join(' ');
  const dob = customer.dateofBirth;
  const variables = {
    customer: {
      firstname,
      lastname,
      email: store.customer.email,
      dob,
      extension_attributes: {
      },
      custom_attributes: [
      ],
    },
  };

  if (phoneNumber && phoneVerified) {
    variables.customer.custom_attributes.push({
      attribute_code: 'phone_number',
      value: phoneNumber,
    });
    variables.customer.extension_attributes.is_verified = 'Y';
  } else {
    variables.customer.custom_attributes.push({
      attribute_code: 'phone_number',
      value: '',
    });
    delete variables.customer.extension_attributes.is_verified;
  }

  if (customer.gender !== '') {
    variables.customer.extension_attributes.customer_gender = customer.gender;
  } else {
    variables.customer.extension_attributes.customer_gender = '';
  }

  const url = await createUrl('customers/me');

  const response = await performRestMutation(url, variables, true, 'PUT');

  const { success, data } = response;

  if (!success) {
    console.error('Error making customer updates', data.message);
    return { success: false, message: 'Error customer updates', data };
  }

  return { success, data };
}

export async function updateCustomer2(customer) {
  if (!getSignInToken()) {
    return null;
  }

  const url = await createUrl('customers/me');

  const variables = { customer };

  const response = await performRestMutation(url, variables, true, 'PUT');

  const { success, data } = response;

  if (!success) {
    console.error('Error updating communication preference', data.message);
    return { success, data };
  }

  return { success, data };
}

export async function changePassword(currentPassword, newPassword) {
  document.querySelector('.change-password-container button').classList.add('loader', 'disabled');
  if (!getSignInToken()) {
    return null;
  }
  const variables = { currentPassword, newPassword };

  const response = await performMonolithGraphQLQuery(changePasswordQuery, variables, false, true);

  const { data, errors } = response;

  if (errors) {
    console.error('Error making password change', errors);
    return { success: false, message: 'Error during password change', errors };
  }

  return { success: true, data };
}

export async function forgotPassword(email) {
  const body = { email };

  const response = await performMonolithGraphQLQuery(requestPasswordResetMutation, body, false);

  const { data, errors } = response;

  if (errors) {
    console.error('Error forgot password', errors);
    return { success: false, message: 'Error during forgot password', errors };
  }

  return { success: true, data };
}

export async function resetPassword(email, token, newPassword) {
  const body = { email, token, newPassword };

  const response = await performMonolithGraphQLQuery(resetPasswordMutation, body, false);

  const { data, errors } = response;

  if (errors) {
    console.error('Error reset password', errors);
    return { success: false, message: 'Error during reset password', errors };
  }

  return { success: true, data };
}

export async function getSavedCards() {
  const url = await createUrl('checkoutcomupapi/getTokenList');

  const response = await performCommerceRestQuery(url, true);

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error fetching saved cards', status, message);
    return null;
  }

  return data;
}

export async function deleteSavedCard(publicHash) {
  const customer = await getCustomer(true);

  if (!customer) {
    return {
      success: false, message: 'No customer', status: 400,
    };
  }

  const url = await createUrl(`checkoutcomupapi/deleteTokenByPublicHash/${publicHash}`);

  const response = await performCommerceRestMutation(url, {}, true, 'DELETE');

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error deleting saved card', data, status, message);
    return null;
  }

  return response;
}
