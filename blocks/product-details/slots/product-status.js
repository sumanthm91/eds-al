import { decorateIcons } from '../../../scripts/aem.js';
import { loadFragment, createModalFromContent, openModal } from '../../../scripts/scripts.js';

const MODALS = [
  {
    key: 'member-info',
    path: 'member-info',
  },
  {
    key: 'online-returns',
    path: 'online-returns',
  }];

function isReturnable(ctx) {
  const { attributes } = ctx.data;
  const isReturnableAttribute = attributes.filter((attr) => attr.id === 'is_returnable')?.[0]?.value;
  return isReturnableAttribute === '1';
}

export default async function productStatusSlot(ctx, _, placeholders) {
  const isReturnableProduct = isReturnable(ctx);

  let returnableText = placeholders.pdpFreeOnlineReturns || 'Free online returns within statutory period';
  let returnableIcon = 'icon-delivery-return';
  if (!isReturnableProduct) {
    returnableText = placeholders.pdpNonReturnable || 'Not eligible for return';
    returnableIcon = 'icon-info';
  }

  const brand = ctx.data.attributes?.find((el) => el.id === 'brand_full_name')?.value;

  if (brand?.toLowerCase() === 'monki') {
    MODALS.find((modal) => modal.key === 'online-returns').path = 'monki-online-returns';
  }

  const productStatusSection = document.createElement('div');
  productStatusSection.classList.add('product-status-container');
  const memberEarnString = placeholders.pdpMemberEarn || 'Member earns {{points}} points';
  const memberEarn = memberEarnString.replace('{{points}}', Math.floor(ctx.data.prices?.final?.amount || 0));
  productStatusSection.innerHTML = `
    <div>
      <span class="icon icon-logo"></span>
      <span>${memberEarn}<span>
    </div>
    <div>
      <span class="icon ${returnableIcon}"></span>
      <span>${returnableText}<span>
    </div>
  `;
  decorateIcons(productStatusSection);

  // Add read more links
  productStatusSection.querySelectorAll(':scope > div').forEach((row, idx) => {
    const dialogId = `${MODALS[idx].key}-dialog`;
    const readMoreLink = document.createElement('a');
    readMoreLink.textContent = placeholders.readMoreLabel || 'Read more';
    readMoreLink.href = '#';
    readMoreLink.addEventListener('click', (event) => {
      event.preventDefault();
      openModal(dialogId);
    });
    const linkColumn = document.createElement('div');
    linkColumn.appendChild(readMoreLink);
    row.appendChild(linkColumn);
  });

  ctx.replaceWith(productStatusSection);

  window.addEventListener('delayed-loaded', () => {
    MODALS.forEach((modalObj) => {
      loadFragment(`/${document.documentElement.lang}/fragments/pdp/${modalObj.path}`).then((fragment) => {
        const [titleDiv, modalContent] = [...fragment.querySelectorAll(':scope > div')];
        createModalFromContent(`${modalObj.key}-dialog`, titleDiv.textContent, modalContent.outerHTML, ['pdp-modal']);
      });
    });
  });
}
