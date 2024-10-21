import getRestApiClient from '../utils/api-client.js';

/**
 * Send the OTP
 * @param payload
 * @returns {Promise<{response: null}>|*}
 */
const sendOTP = (payload) => getRestApiClient('carts/otp/send', true, 'POST', payload);

export default sendOTP;
