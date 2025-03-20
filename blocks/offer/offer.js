/**
 * Decorates the offer block
 * @param {Element} block The offer block element
 */
export function decorate(block) {
  // Get all content divs and find the one with actual content
  const divs = block.querySelectorAll(':scope > div > div');
  const content = Array.from(divs).find(div => div.textContent.trim());
  if (!content) return;

  // Extract content from the block
  const title = content.querySelector('h1')?.textContent?.trim() || '';
  const subtitle = content.querySelector('h2')?.textContent?.trim() || '';
  const subheading = content.querySelector('h3')?.textContent?.trim() || '';
  const description = content.querySelector('p:not(:last-child)')?.textContent?.trim() || '';
  const date = content.querySelector('h5')?.textContent?.trim() || '';
  
  // Extract links, filtering out empty ones
  const links = Array.from(content.querySelectorAll('p em a'))
    .filter(a => a.textContent.trim())
    .map(a => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href') || '#'
    }));

  const footer = content.querySelector('p:last-child')?.textContent?.trim() || '';

  // Create new HTML structure with proper spacing
  const newHtml = `
    ${title ? `<h1 class="offer-title">${title}</h1>` : ''}
    ${subtitle ? `<h2 class="offer-subtitle">${subtitle}</h2>` : ''}
    ${subheading ? `<p class="offer-description">${subheading}</p>` : ''}
    ${description ? `<p class="offer-description">${description}</p>` : ''}
    ${date ? `<p class="offer-date">${date}</p>` : ''}
    ${links.length ? `
      <div class="offer-buttons">
        ${links.map(link => `<a href="${link.href}" class="offer-button">${link.text}</a>`).join('')}
      </div>
    ` : ''}
    ${footer ? `<p class="offer-description">${footer}</p>` : ''}
  `;

  // Replace block content
  block.innerHTML = newHtml;
}
