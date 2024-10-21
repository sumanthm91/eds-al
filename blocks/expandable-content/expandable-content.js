import { fetchPlaceholdersForLocale } from '../../scripts/scripts.js';

export default async function decorate(block) {
  const isforcereload = block.classList.contains('force-reload');
  const placeholders = await fetchPlaceholdersForLocale();

  const { readMore } = placeholders;
  const readMoreDiv = document.createElement('div');
  readMoreDiv.classList.add('read-more');

  const readMoreButton = document.createElement('button');
  readMoreButton.classList.add('read-more-button-text');
  // Sets the 'Read more' text from the placeholders
  block.setAttribute('data-expand-text', readMore);
  readMoreButton.textContent = readMore;
  readMoreDiv.appendChild(readMoreButton);
  block.appendChild(readMoreDiv);

  const expandBlock = (e) => {
    e.preventDefault();
    e.target.closest('.expandable-content').classList.add('expanded');
    readMoreButton.classList.add('hidden');
  };

  // reload the page when page is loaded from bfcache
  if (isforcereload) {
    window.onpageshow = (e) => {
      if (e.persisted) {
        window.location.reload();
      }
    };
  }
  readMoreButton.addEventListener('click', expandBlock);
}
