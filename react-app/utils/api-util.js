import instance from './api-service.js';

const getCall = async (url, opt = {}) => {
  try {
    const response = await instance.get(url, opt);
    return response;
  } catch (error) {
    return {
      error,
    };
  }
};

export default getCall;
