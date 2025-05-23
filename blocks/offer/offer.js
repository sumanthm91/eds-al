export default function decorate(block) {
  // Get all paragraphs from the block
  const paragraphs = block.querySelectorAll('p');
  
  // Extract data from paragraphs
  const offerData = {
    title: '',
    subtitle: '',
    description: '',
    placeholder: '',
    timestamp: '',
    validity: '',
    categories: []
  };

  // Process paragraphs to extract data
  paragraphs.forEach((p, index) => {
    const text = p.textContent.trim();
    if (index === 0) {
      offerData.description = text;
    } else if (index === 1) {
      offerData.placeholder = text;
    } else if (index === 2) {
      offerData.timestamp = text;
    } else if (index === 3) {
      offerData.validity = text;
    }
  });

  // Get all links which will be our categories
  const links = block.querySelectorAll('a');
  links.forEach((link) => {
    offerData.categories.push({
      text: link.textContent.trim(),
      href: link.getAttribute('href') || '#'
    });
  });

  // Create the new HTML structure
  const categoryLinks = offerData.categories.map(({href, text}) =>
    `<a href="${href}" class="offer-nav-button">${text}</a>`
  ).join('');

  const html = `
    <h1 class="offer-title">Last few days of sale 30%-70% off</h1>
    <h2 class="offer-subtitle">Buy 2 get 1 free</h2>
    <p class="offer-description">${offerData.description}</p>
    <p>${offerData.placeholder}</p>
    <p>${offerData.timestamp}</p>
    <nav class="offer-nav" aria-label="Offer categories">${categoryLinks}</nav>
    <p class="offer-validity">${offerData.validity}</p>
  `;

  // Update the block's content
  block.innerHTML = html;
}
