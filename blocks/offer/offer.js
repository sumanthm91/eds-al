export default function decorate(block) {
  const offerContent = block.querySelector('div');
  if (!offerContent) return;

  // Extract content from the block
  const [saleText] = offerContent.querySelectorAll('h1');
  const [mainOffer] = offerContent.querySelectorAll('h2');
  const [subOffer] = offerContent.querySelectorAll('h3');
  const timestamp = [...offerContent.querySelectorAll('p')].find(p => p.textContent.includes('PM') || p.textContent.includes('AM'));
  const links = offerContent.querySelectorAll('p em a');
  const [validityText] = [...offerContent.querySelectorAll('p')].filter(p => p.textContent.includes('valid'));

  // Create the new block structure
  block.innerHTML = `
    <div class="sale-text">${saleText ? saleText.textContent : ''}</div>
    <div class="main-offer">${mainOffer ? mainOffer.textContent : ''}</div>
    <div class="sub-offer">${subOffer ? subOffer.textContent : ''}</div>
    <div class="timestamp">${timestamp ? timestamp.textContent : ''}</div>
    <div class="nav-buttons">
      ${[...links].map(link => `<a href="${link.href}" class="nav-button">${link.textContent}</a>`).join('')}
    </div>
    <div class="validity">${validityText ? validityText.textContent : ''}</div>
  `;
}
