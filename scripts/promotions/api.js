import { getConfigValue } from '../configs.js';

export const getPromotionsData = async () => {
  const url = await getConfigValue('promotions-schedules-path');
  if (!url) {
    return null;
  }

  const promotions = await fetch(url)
    .then((response) => response.json())
    .then((data) => data).catch((error) => {
      console.error('Failed to fetch promotion data', error.message);

      return null;
    });

  return promotions;
};

export default { getPromotionsData };
