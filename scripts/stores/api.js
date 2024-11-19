import { getConfigValue } from '../configs.js';
import { performCommerceRestQuery } from '../commerce.js';

// eslint-disable-next-line import/prefer-default-export
export async function getStores() {
  const baseUrl = await getConfigValue('commerce-rest-endpoint');
  const storeViewCode = await getConfigValue('commerce-store-view-code');

  const searchCriteriaList = [];
  searchCriteriaList.push('searchCriteria[filter_groups][0][filters][0][field]=status');
  searchCriteriaList.push('searchCriteria[filter_groups][0][filters][0][value]=1');

  const searchCriteria = searchCriteriaList.join('&');

  console.debug('getStores', searchCriteria);

  const url = `${baseUrl}/${storeViewCode}/V1/storeLocator/search?${encodeURI(searchCriteria)}`;
  const response = await performCommerceRestQuery(url, false);
  const { data, success } = response;

  console.debug(data);
  if (success) {
    return data;
  }
  return null;
}
