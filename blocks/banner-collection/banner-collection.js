import { createOptimizedPicture } from '../../scripts/aem.js';

export default function decorate(block) {
  // Use destructuring for cleaner variable assignment
  const [imageElement, textElement, pElement, linkElement] = [
    'picture',
    'h2',
    'p',
    'a'
  ].map(selector => block.querySelector(selector));

  // Early return if required elements are missing
  if (!imageElement || !textElement || !pElement || !linkElement) {
    console.warn('Banner collection: Missing required elements');
    return;
  }

  const img = imageElement.querySelector('img');
  const strong = textElement.querySelector('strong');
  
  // Prepare all content before DOM manipulation
  const content = {
    imgSrc: img?.src || '',
    altText: img?.alt || '',
    subtitle: pElement.textContent,
    title: textElement.childNodes[0]?.textContent?.trim() || '',
    strongText: strong?.textContent || '',
    description: textElement.childNodes[2]?.textContent?.trim() || '',
    link: {
      href: linkElement.href,
      text: linkElement.textContent
    }
  };

  // Use template literal with proper indentation for better readability
  block.innerHTML = `
    <div class="banner-collection-image">
      <img src="${content.imgSrc}" alt="${content.altText}">
    </div>
    <div class="banner-collection-content">
      <h5>${content.subtitle}</h5>
      <h2>${content.title}</h2>
      <h3>${content.strongText}</h3>
      <p>${content.description}</p>
      <a href="${content.link.href}" class="shop-now">${content.link.text}</a>
    </div>
  `;
}