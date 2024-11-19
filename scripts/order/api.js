import { getConfigValue } from '../configs.js';
import { performCommerceRestMutation, performCommerceRestQuery } from '../commerce.js';

async function createUrl(endpoint) {
  const baseUrl = await getConfigValue('commerce-rest-endpoint');

  const storeViewCode = await getConfigValue('commerce-store-view-code');

  const url = `${baseUrl}/${storeViewCode}/V1/${endpoint}`;

  return url;
}

async function searchOrdersInternal(searchCriteria) {
  const url = await createUrl('customer-order/me');

  const response = await performCommerceRestQuery(`${url}?${searchCriteria}`, true);

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error fetching orders', status, message);
    return null;
  }

  return data;
}

export async function searchOrders(searchString, orderStatus = null, page = 1, pageSize = 10) {
  let searchCriteria = `searchCriteria[pageSize]=${pageSize}&searchCriteria[currentPage]=${page}`;
  searchCriteria += '&searchCriteria[sortOrders][0][field]=created_at&searchCriteria[sortOrders][0][direction]=DESC';

  let filterGroup = 1;

  if (searchString) {
    const fields = ['increment_id', 'sku', 'name'];
    let filterIndex = 0;
    const searchStringEncoded = encodeURIComponent(`%${searchString}%`);
    fields.forEach((field) => {
      searchCriteria += `&searchCriteria[filter_groups][${filterGroup}][filters][${filterIndex}][field]=${field}&searchCriteria[filter_groups][${filterGroup}][filters][${filterIndex}][value]=${searchStringEncoded}&searchCriteria[filter_groups][${filterGroup}][filters][${filterIndex}][condition_type]=like`;
      filterIndex += 1;
    });
    filterGroup += 1;
  }

  if (orderStatus && Array.isArray(orderStatus)) {
    let filterIndex = 0;
    orderStatus.forEach((status) => {
      searchCriteria += `&searchCriteria[filter_groups][${filterGroup}][filters][${filterIndex}][field]=status&searchCriteria[filter_groups][${filterGroup}][filters][${filterIndex}][value]=${status}&searchCriteria[filter_groups][${filterGroup}][filters][${filterIndex}][condition_type]=eq`;
      filterIndex += 1;
    });
  } else if (orderStatus) {
    searchCriteria += `&searchCriteria[filter_groups][${filterGroup}][filters][0][field]=state&searchCriteria[filter_groups][${filterGroup}][filters][0][value]=${orderStatus}&searchCriteria[filter_groups][${filterGroup}][filters][0][condition_type]=eq`;
  }

  return searchOrdersInternal(searchCriteria);
}

export async function getRecentOrders(numberOfOrders = 3) {
  let searchCriteria = `searchCriteria[pageSize]=${numberOfOrders}&searchCriteria[currentPage]=1`;
  searchCriteria += '&searchCriteria[sortOrders][0][field]=created_at&searchCriteria[sortOrders][0][direction]=DESC';

  return searchOrdersInternal(searchCriteria);
}

export async function getOrder(orderId) {
  const url = await createUrl(`customer-order/me/${orderId}`);

  const response = await performCommerceRestQuery(url, true);

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error fetching order', status, message);
    return null;
  }
  return data;
}

export async function getDownloadInvoiceUrl(orderIncrementId) {
  const url = await createUrl(`order-manager/customers/invoice/${orderIncrementId}`);

  const response = await performCommerceRestQuery(url, true);

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error fetching order', status, message);
    return null;
  }
  return data;
}

export async function getOrderReturnsConfig() {
  const url = await createUrl('returnsconfig');

  const response = await performCommerceRestQuery(url, true);

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error fetching order return config', status, message);
    return null;
  }
  return data;
}

export async function getOrderReturns(orderId) {
  const url = await createUrl(`rma/returns/${orderId}`);

  const response = await performCommerceRestQuery(url, true);

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error fetching order returns', status, message);
    return null;
  }
  return data;
}

export async function getEGiftCardList() {
  const url = await createUrl('egiftcard/mine/associated-with-email');

  try {
    const response = await performCommerceRestQuery(url, true);

    const {
      data, success, message, status,
    } = response;

    if (!success) {
      console.error('Error fetching e-gift card list', status, message);
      return null;
    }
    return data;
  } catch (error) {
    return null;
  }
}

export async function postCreateReturn(returnData) {
  const url = await createUrl('rma/returns');

  const response = await performCommerceRestMutation(url, returnData, true);

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error creating return request', status, message);
    return null;
  }
  return data;
}

export async function getRMAsByOrderId(orderId) {
  const url = await createUrl(`rma/returns?searchCriteria[filterGroups][0][filters][0][field]=order_id&&searchCriteria[filterGroups][0][filters][0][value]=${orderId}`);

  const response = await performCommerceRestQuery(url, true);

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error fetching RMAs by order id', status, message);
    return null;
  }
  return data;
}

export async function putReturnCancellation(returnId, returnData) {
  const url = await createUrl(`rma/returns/${returnId}`);

  const response = await performCommerceRestMutation(url, returnData, true, 'PUT');

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error creating return cancellation request', status, message);
    return null;
  }
  return data;
}

export async function getRMAInfo(returnId) {
  const url = await createUrl(`rma/returns/${returnId}`);

  const response = await performCommerceRestQuery(url, true);

  const {
    data, success, message, status,
  } = response;

  if (!success) {
    console.error('Error fetching RMA Info', status, message);
    return null;
  }
  return data;
}
