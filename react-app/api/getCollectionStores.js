import { getGraphqlClient } from '../utils/api-client.js';

const getCollectionStoresGraphQl = async (cartId, lat, lon, isLoggedIn) => {
  const query = `query (${isLoggedIn ? '' : '$cartId: String,'} $lat: Float!, $lon: Float!) {
    Commerce_Storelocator (input: { ${isLoggedIn ? '' : 'cartId: $cartId,'} lat: $lat, lon: $lon }) {
      items {
        id
        store_code
        store_name
        latitude
        longitude
        pudo_service
        sts_service
        sts_delivery_time_label
        rnc_service
        store_phone
        store_email
        address {
          code
          value
        }
        store_hours {
          code
          label
          value
        }
        price_amount
        distance
        collection_point
      }
      errors
    }
  }`;

  let responseData = {};
  try {
    const response = await getGraphqlClient(query, { cartId, lat, lon }, true);
    responseData = response.response.data.Commerce_Storelocator;
  } catch (error) {
    console.error('Error updating quantity:', error);
  }

  return responseData;
};

export default getCollectionStoresGraphQl;
