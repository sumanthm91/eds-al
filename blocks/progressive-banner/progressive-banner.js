import { decorateProgressive } from '../../scripts/banner-utils/banner-utils.js';

export default async function decorate(block) {
  const initialBlock = block.outerHTML;
  document.addEventListener('updateBanner', () => {
    block.innerHTML = initialBlock;
    decorateProgressive(block.querySelector('.progressive-banner'));
  });
  decorateProgressive(block, true);
}
