import axios from 'axios';
import { getCookie } from '../../scripts/commerce.js';
import { getConfigValue } from '../../scripts/configs.js';

const commerceRestEndpoint = await getConfigValue('commerce-rest-endpoint');

// Axios instance with default configurations
const instance = axios.create({
  baseURL: commerceRestEndpoint,
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    const token = getCookie('auth_user_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
instance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // TO DO: Redirect to login
    }
    return Promise.reject(error);
  },
);

export default instance;
