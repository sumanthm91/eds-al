import getRestApiClient from '../utils/api-client.js';

const getEnrolledStatus = async (endpoint, isLoggedIn) => {
  let responseData = {};
  try {
    const response = await getRestApiClient(endpoint, isLoggedIn, 'GET', '', 'V2');
    responseData = response?.response;
  } catch (error) {
    console.log(error, 'error');
  }

  return responseData;
};

const setLoyaltyCard = async (identifierNo, isLoggedIn, cartId, endpoint) => {
  const data = {
    identifier_no: identifierNo,
    quote_id: cartId,
  };

  let responseData = {};
  try {
    const response = await getRestApiClient(endpoint, isLoggedIn, 'POST', data, 'V1');
    responseData = response?.response;
  } catch (error) {
    console.log(error, 'error');
  }

  return responseData;
};

const simulateSales = async (endpoint, isLoggedIn, cartId, programCode) => {
  const data = {
    ...(programCode ? { programCode } : {}),
    sales: {
      quote_id: cartId,
    },
  };

  let responseData = {};
  try {
    const response = await getRestApiClient(endpoint, isLoggedIn, 'POST', data, 'V1', true);
    responseData = response?.response;
  } catch (error) {
    console.log(error, 'error');
  }

  return responseData;
};

const getApcPointsBalance = async (endpoint, isLoggedIn) => {
  let responseData = {};
  try {
    const response = await getRestApiClient(endpoint, isLoggedIn, 'GET', '', 'V1');
    responseData = response?.response;
  } catch (error) {
    console.log(error, 'error');
  }

  return responseData;
};

const getRedeemPoint = async (endpoint, isLoggedIn) => {
  let responseData = {};
  try {
    const response = await getRestApiClient(endpoint, isLoggedIn, 'GET', '', 'V2');
    responseData = response?.response;
  } catch (error) {
    console.log(error, 'error');
  }

  return responseData;
};

const verifyOtp = async (endpoint, isLoggedIn) => {
  let responseData = {};
  try {
    const response = await getRestApiClient(endpoint, isLoggedIn, 'GET', '', 'V2');
    responseData = response?.response;
  } catch (error) {
    console.log(error, 'error');
  }

  return responseData;
};

const redeemOrRemovePoints = async (data, endpoint, isLoggedIn) => {
  let responseData = {};
  try {
    const response = await getRestApiClient(endpoint, isLoggedIn, 'POST', data, 'V1');
    responseData = response?.response;
  } catch (error) {
    console.log(error, 'error');
  }

  return responseData;
};

export {
  getEnrolledStatus,
  setLoyaltyCard,
  simulateSales,
  getApcPointsBalance,
  getRedeemPoint,
  verifyOtp,
  redeemOrRemovePoints,
};
