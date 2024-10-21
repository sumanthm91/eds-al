import { getGraphqlClient } from '../utils/api-client.js';
import ApiConstants from './api.constants.js';

/**
 * Fetches the product
 * @returns {{cartData: boolean|{}}}
 */
const getProducts = async (sku) => {
  const fetchOrderQuery = `query ($sku: String) {
    commerce_products(filter: { sku: { eq: $sku } }) ${ApiConstants.GET_PRODUCTS}
  }`;

  let responseData = [];
  await getGraphqlClient(fetchOrderQuery, { sku }, true).then((response) => {
    responseData = response;
  });

  return responseData;
};

export default getProducts;
