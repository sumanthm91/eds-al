import getRestApiClient from '../utils/api-client.js';

const removeRedemption = async (body, isLoggedIn) => {
  const removeRedemptionURI = 'egiftcard/remove-redemption';

  let responseData = {};
  try {
    const response = await getRestApiClient(removeRedemptionURI, isLoggedIn, 'POST', body);
    responseData = response?.response;
  } catch (error) {
    console.log(error, 'error');
  }
  return responseData;
};

export default removeRedemption;
