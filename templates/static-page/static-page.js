import { getMetadata } from '../../scripts/aem.js';
import { fetchPlaceholdersForLocale, replacePlaceholders } from '../../scripts/scripts.js';

export default async function decorate(main) {
  const dynamicKeys = getMetadata('dynamic-keys');

  if (dynamicKeys && dynamicKeys.toLowerCase() === 'true') {
    const placeholders = await fetchPlaceholdersForLocale();
    replacePlaceholders(main, placeholders);
  }

  return main;
}
