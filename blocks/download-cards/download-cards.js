export default function decorate(block) {
  // Create header section
  const headerDiv = document.createElement('div');
  headerDiv.className = 'download-cards-header';
  
  // Get header content from first div
  const firstDiv = block.children[0];
  if (firstDiv) {
    const h2 = firstDiv.querySelector('h2');
    const p = firstDiv.querySelector('p');
    if (h2) headerDiv.appendChild(h2);
    if (p) headerDiv.appendChild(p);
  }

  // Create grid for download cards
  const gridDiv = document.createElement('div');
  gridDiv.className = 'download-cards-grid';

  // Process remaining divs as download cards
  Array.from(block.children).slice(1).forEach((div) => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'download-cards-item';

    // Create image section
    const imageDiv = document.createElement('div');
    imageDiv.className = 'download-cards-image';
    const picture = div.querySelector('picture');
    if (picture) {
      imageDiv.appendChild(picture);
    }
    cardDiv.appendChild(imageDiv);

    // Create content section
    const contentDiv = document.createElement('div');
    contentDiv.className = 'download-cards-content';
    const title = div.querySelector('p:not(:last-child)');
    const downloadLink = div.querySelector('a');
    if (title) {
      const titleP = document.createElement('p');
      titleP.textContent = title.textContent;
      contentDiv.appendChild(titleP);
    }
    if (downloadLink) {
      const linkP = document.createElement('p');
      linkP.appendChild(downloadLink);
      contentDiv.appendChild(linkP);
    }
    cardDiv.appendChild(contentDiv);

    gridDiv.appendChild(cardDiv);
  });

  // Clear block and add new structure
  block.textContent = '';
  block.appendChild(headerDiv);
  block.appendChild(gridDiv);
}
