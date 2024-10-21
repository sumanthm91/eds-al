import getRestApiClient from "../utils/api-client";

const updateRedeemAmount = async (body, isLoggedIn) => {

    const getCartURI = 'egiftcard/mine/update-redemption-amount';

    let responseData = {};
    try {
        const response = await getRestApiClient(getCartURI, isLoggedIn, 'POST', body);
        responseData = response?.response;
    } catch (error) {
        console.log(error, 'error');
    }
    return responseData;
};

export default updateRedeemAmount;