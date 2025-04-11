export default function decorate(block) {
  // Get header content
  const header = block.children[0];
  const title = header?.querySelector('h2')?.textContent || '';
  const description = header?.querySelector('p')?.textContent || '';

  // Get card items (skip the first div which contains header)
  const cardItems = Array.from(block.children).slice(1);

  // Create cards HTML
  const cardsHTML = cardItems.map(card => {
    const picture = card.querySelector('picture');
    const title = card.querySelector('p:not(:last-child)')?.textContent || '';
    const downloadLink = card.querySelector('a')?.href || '#';

    return `
      <div class="card">
        ${picture ? picture.outerHTML : ''}
        <h3>${title}</h3>
        <p>${description}</p>
        <a href="${downloadLink}" class="download-button">Download</a>
      </div>
    `;
  }).join('');

  // Create new HTML structure
  block.innerHTML = `
    <div class="header">
      <h2>${title}</h2>
      <p>${description}</p>
    </div>
    <div class="cards-container">
      ${cardsHTML}
    </div>
  `;
}
