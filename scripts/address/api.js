import { getConfigValue } from '../configs.js';
import { performCommerceRestQuery, performMonolithGraphQLQuery } from '../commerce.js';
import { isLoggedInUser } from '../scripts.js';

const createAddressQuery = `
  mutation createCustomerAddress($address: commerce_CustomerAddressInput!) {
    commerce_createCustomerAddress(input: $address) {
      id
      country_code
      firstname
      lastname
      postcode
      region {
        region
        region_id
        region_code
      }
      street
      telephone
      custom_attributes {
        attribute_code
        value
      }
      default_billing
    }
  }`;

const updateAddressQuery = `
mutation updateCustomerAddress($id: Int!, $address: commerce_CustomerAddressInput!) {
  commerce_updateCustomerAddress(id: $id, input: $address) {
    id
    country_code
      firstname
      lastname
      postcode
      region {
        region
        region_id
        region_code
      }
      street
      telephone
      default_billing
      custom_attributes {
        attribute_code
        value
      }
    }
  }`;

const deleteAddressQuery = `
mutation deleteCustomerAddress($id: Int!) {
  commerce_deleteCustomerAddress(id: $id)
}
`;

export async function getDeliveryMatrixAddressStructure(countryCode) {
  const baseUrl = await getConfigValue('commerce-rest-endpoint');
  const storeViewCode = await getConfigValue('commerce-store-view-code');
  const url = `${baseUrl}/${storeViewCode}/V1/deliverymatrix/address-structure/country/${countryCode}`;
  const response = await performCommerceRestQuery(url, false);
  const { data, success } = response;
  if (success) {
    return data;
  }
  return null;
}

async function getDeliveryMatrixAddressLocations(filters) {
  const baseUrl = await getConfigValue('commerce-rest-endpoint');
  const storeViewCode = await getConfigValue('commerce-store-view-code');

  const searchCriteriaList = [];
  let index = 0;
  filters.forEach((filter) => {
    const { field, value, conditionType } = filter;
    searchCriteriaList.push(`searchCriteria[filter_groups][0][filters][${index}][field]=${field}`);
    searchCriteriaList.push(`searchCriteria[filter_groups][0][filters][${index}][value]=${value}`);
    searchCriteriaList.push(`searchCriteria[filter_groups][0][filters][${index}][condition_type]=${conditionType || 'eq'}`);
    index += 1;
  });

  const searchCriteria = searchCriteriaList.join('&');

  console.debug('getDeliveryMatrixAddressLocations', searchCriteria);

  const url = `${baseUrl}/${storeViewCode}/V1/deliverymatrix/address-locations/search?${encodeURI(searchCriteria)}`;
  const response = await performCommerceRestQuery(url, false);
  const { data, success } = response;

  console.debug(data);
  if (success) {
    return data;
  }
  return null;
}

export async function getAddressAreas(countryId, cityId) {
  const attributeId = 'area';

  const filters = [
    { field: 'attribute_id', value: attributeId },
    { field: 'country_id', value: countryId },
  ];
  if (cityId) {
    filters.push({ field: 'parent_id', value: cityId });
  }
  return getDeliveryMatrixAddressLocations(filters);
}

export async function getAddressCitySegments(countryId) {
  const attributeId = 'address_city_segment';

  const filters = [
    { field: 'attribute_id', value: attributeId },
    { field: 'country_id', value: countryId },
  ];
  return getDeliveryMatrixAddressLocations(filters);
}

export async function createAddress(addressData, config = {}) {
  if (!isLoggedInUser()) {
    return null;
  }

  const variables = { address: addressData };
  variables.address.default_billing = true;
  const response = await performMonolithGraphQLQuery(
    createAddressQuery,
    variables,
    false,
    true,
    config,
  );
  const { data, errors } = response;

  if (errors) {
    console.error('Error adding address', errors);
    return { success: false, message: 'Error adding address', errors };
  }

  return { success: true, data };
}

export async function updateAddress(id, addressData, config = {}) {
  if (!isLoggedInUser()) {
    return null;
  }

  const variables = { id, address: addressData };

  const response = await performMonolithGraphQLQuery(
    updateAddressQuery,
    variables,
    false,
    true,
    config,
  );
  const { data, errors } = response;

  if (errors) {
    console.error('Error updating address', errors);
    return { success: false, message: 'Error updating address', errors };
  }

  return { success: true, data };
}

export async function deleteAddress(id) {
  if (!isLoggedInUser()) {
    return null;
  }

  const response = await performMonolithGraphQLQuery(deleteAddressQuery, { id }, false, true);

  const { data, errors } = response;

  if (errors) {
    console.error('Error deleting address', errors);
    return { success: false, message: 'Error deleting address', errors };
  }

  return { success: true, data };
}

export async function makePrimaryAddress(id) {
  if (!isLoggedInUser()) {
    return null;
  }

  const variables = { id, address: { default_billing: true } };

  const response = await performMonolithGraphQLQuery(updateAddressQuery, variables, false, true);

  const { data, errors } = response;

  if (errors) {
    return { success: false, message: 'Error making primary address', errors };
  }

  return { success: true, data };
}
