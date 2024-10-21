import { datalayerPdpAccordionToggleEvent } from '../../../scripts/analytics/google-data-layer.js';

export default async function descriptionSlot(ctx, $block, placeholders, attributesToShow) {
  const descriptionContainer = document.createElement('details');
  descriptionContainer.classList.add('pdp-product__description', 'accordion-item');

  const descriptionTitle = document.createElement('h3');
  descriptionTitle.classList.add('pdp-product__description--title');
  descriptionTitle.textContent = placeholders.productDescription || 'Product Description';

  const summary = document.createElement('summary');
  summary.className = 'accordion-item-label';
  summary.append(descriptionTitle);

  const content = document.createElement('div');
  content.classList.add('pdp-product__description--details', 'accordion-item-body');

  const descriptionSchema = document.createElement('div');

  const descriptionContent = document.createElement('div');
  descriptionContent.classList.add('pdp-product__description--content');
  descriptionContent.innerHTML = ctx.data.description;
  descriptionSchema.appendChild(descriptionContent);
  content.appendChild(descriptionSchema);

  const attributes = document.createElement('div');
  attributes.classList.add('pdp-product-description__attributes');
  attributesToShow
    .forEach((attribute) => {
      const pdpAttribute = ctx.data.attributes
        .find((attr) => attr.id === attribute.trim().toLowerCase());
      if (!pdpAttribute) {
        return;
      }
      const attributeElement = document.createElement('ul');
      attributeElement.classList.add('pdp-product-description__attribute');
      if (pdpAttribute.value) {
        attributeElement.innerHTML = `<li class="pdp-product-description__attribute--label">${pdpAttribute.label}</li>
        <li class="pdp-product-description__attribute--value">${pdpAttribute.value}</li>`;
        attributes.appendChild(attributeElement);
      }
    });
  content.appendChild(attributes);

  descriptionContainer.append(summary, content);
  ctx.replaceWith(descriptionContainer);

  // Product Details toggle datalayer event
  summary.addEventListener('click', () => {
    const accordionState = descriptionContainer.hasAttribute('open') ? 'collapse' : 'expand';
    datalayerPdpAccordionToggleEvent(descriptionTitle.textContent, accordionState);
  });
}
