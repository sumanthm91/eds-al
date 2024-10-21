import getRestApiClient from '../utils/api-client.js';

const removeRedeemCardRedemption = async (body, isLoggedIn) => {
  const removeRedemptionURI = isLoggedIn ? 'egiftcard/remove-redemption': 'guest-carts/remove-redemption';

  let responseData = {};
  try {
    const response = await getRestApiClient(removeRedemptionURI, isLoggedIn, 'POST', body);
    responseData = response?.response;
  } catch (error) {
    console.log(error, 'error');
  }
  return responseData;
};

export default removeRedeemCardRedemption;
