import getRestApiClient from "../utils/api-client";

const updateRedeemEgiftAmount = async (body, isLoggedIn) => {

    const getCartURI = isLoggedIn ? 'egiftcard/mine/update-redemption-amount' : 'egiftcard/guest-carts/update-redemption-amount';

    let responseData = {};
    try {
        const response = await getRestApiClient(getCartURI, isLoggedIn, 'POST', body);
        responseData = response?.response;
    } catch (error) {
        console.log(error, 'error');
    }
    return responseData;
};

export default updateRedeemEgiftAmount;