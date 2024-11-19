import { performAlgoliaMeshQuery, performAlgoliaQuery } from '../commerce.js';
import { getConfigValue } from '../configs.js';

export async function getSearchSuggestions(searchTerm = '', maxResults = 4) {
  const query = `query($indexName: String!, $params: String!) {
    getSearchTerms(input: { requests: [
      {
        indexName: $indexName,
        params: $params
      }
    ]}) {
      results {
        hits
        nbHits
        page
        nbPages
        hitsPerPage
        exhaustiveNbHits
        exhaustiveTypo
        exhaustive
        query
        params
        index
        renderingContent
        processingTimeMS
        processingTimingsMS
        serverTimeMS
      } 
    }
  }`;
  const searchQueryIndex = await getConfigValue('algolia-search-query-index');
  const variables = {
    indexName: searchQueryIndex,
    params: `facets=%5B%5D&highlightPostTag=%3C%2Fais-highlight-0000000000%3E&highlightPreTag=%3Cais-highlight-0000000000%3E&hitsPerPage=${maxResults}&query=${searchTerm}&analytics=false&analyticsTags=%5B%22web%22%2C%22customer%22%5D`,
  };
  const queryResponse = await performAlgoliaMeshQuery(query, variables);
  return queryResponse?.data?.getSearchTerms?.results[0]?.hits || [];
}

export async function getProductSuggestions(searchTerm = '', maxResults = 4) {
  const searchQueryIndex = await getConfigValue('algolia-search-index');
  const variables = {
    indexName: searchQueryIndex,
    params: `facets=%5B%5D&highlightPostTag=%3C%2Fais-highlight-0000000000%3E&highlightPreTag=%3Cais-highlight-0000000000%3E&hitsPerPage=${maxResults}&query=${searchTerm}&analytics=false&analyticsTags=%5B%22web%22%2C%22customer%22%5D`,
  };
  // TODO: change to API Mesh query when available
  const queryResponse = await performAlgoliaQuery(variables);
  return queryResponse?.results[0]?.hits || [];
}

export const getFilterAliaseValues = async () => {
  const url = '/plp-filters-values.json';
  if (!url) {
    return null;
  }

  return fetch(url)
    .then((response) => response.json())
    .then((data) => data)
    .catch((error) => {
      console.error('Failed to fetch filters data', error.message);

      return null;
    });
};
