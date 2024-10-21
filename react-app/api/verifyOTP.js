import getRestApiClient from '../utils/api-client.js';

/**
 * Verify the OTP
 * @param payload
 * @returns {Promise<{response: null}>|*}
 */
const verifyOTP = (payload) => getRestApiClient('carts/otp/verify', true, 'POST', payload);

export default verifyOTP;
