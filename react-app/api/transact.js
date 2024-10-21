import getRestApiClient from "../utils/api-client";

const transact = async (body) => {

    const getCartURI = `egiftcard/transact`;

    let responseData = {};
    try {
        const response = await getRestApiClient(getCartURI, false, 'POST', body);
        responseData = response?.response;
    } catch (error) {
        console.log(error, 'error');
    }
    return responseData;
};

export default transact;