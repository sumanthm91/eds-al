import { decorateIcons } from '../../../scripts/aem.js';
import { datalayerSizeSelectorEvent, datalayerSizeGuide, datalayerColorSwatchEvent } from '../../../scripts/analytics/google-data-layer.js';
import {
  loadFragment, createModalFromContent, openModal,
  formatPrice,
  isLoggedInUser,
} from '../../../scripts/scripts.js';
import { performCatalogServiceQuery, cacheProductData, isPDP } from '../../../scripts/commerce.js';
import {
  initSizeGuideDefaults,
  setDefaultSizeGuideFilters,
} from '../../size-guide/size-guide-utility.js';

const SIZE_GUIDE_DIALOG_ID = 'size-guide-dialog';

export async function decorateSizeGuide(sizeGuideBlock, ctx, placeholders) {
  const sizeGuideModal = await loadFragment(`/${document.documentElement.lang}/fragments/pdp/size-guide/sizes`);
  const sizeGuideTitle = placeholders.pdpSizeGuideLabel || 'Size Guide';
  await createModalFromContent(SIZE_GUIDE_DIALOG_ID, sizeGuideTitle, sizeGuideModal, ['size-guide-modal', 'pdp-modal'], null, true);
  await import('../../../templates/tabbed-size-guide/tabbed-size-guide.js');
  const categoryItems = ctx.data?.gtmAttributes?.category.split('/');
  setDefaultSizeGuideFilters(categoryItems[0], categoryItems[2]);
  sizeGuideBlock.onclick = () => {
    openModal(SIZE_GUIDE_DIALOG_ID);
  };
}

const variantsQuery = `
  query getProductSearchDetails(
    $filter: [SearchClauseInput!]
    $phrase: String!
    $sort: [ProductSearchSortInput!]
    $pageSize: Int!
  ) {
    productSearch(
      phrase: $phrase
      filter: $filter
      sort: $sort
      page_size: $pageSize
    ) {
      total_count
      page_info {
        current_page
        page_size
        total_pages
      }
      items {
        productView {
          sku
          id
          name
          description
          urlKey
          inStock
          metaTitle
          metaDescription
          metaKeyword
          attributes {
            name
            label
            roles
            value
          }
          ... on SimpleProductView {
            price {
              final {
                amount {
                  value
                  currency
                }
              }
              regular {
                amount {
                  value
                  currency
                }
              }
              roles
            }
          }
          ... on ComplexProductView {
            variants {
              variants {
                selections
                product {
                  id
                  name
                  sku
                  ... on SimpleProductView {
                    price {
                      final {
                        amount {
                          currency
                          value
                        }
                      }
                      regular {
                        amount {
                          currency
                          value
                        }
                      }
                    }
                  }
                  attributes {
                    name
                    label
                    roles
                    value
                  }
                }
              }
            }
            options {
              id
              title
              required
              multi
              values {
                id
                title
                ... on ProductViewOptionValueProduct {
                  title
                  quantity
                  isDefault
                }
                ... on ProductViewOptionValueSwatch {
                  id
                  title
                  type
                  value
                }
              }
            }
            priceRange {
              maximum {
                final {
                  amount {
                    value
                    currency
                  }
                }
                regular {
                  amount {
                    value
                    currency
                  }
                }
                roles
              }
              minimum {
                final {
                  amount {
                    value
                    currency
                  }
                }
                regular {
                  amount {
                    value
                    currency
                  }
                }
                roles
              }
            }
          }
        }
      }
    }
  }
`;

function formatSwatchUrl(url, placeholders) {
  const productSwatchThumbnail = placeholders.productSwatchThumbnail || 80;
  let outputUrl = url.replace(/width=\d+&?/g, '').replace(/height=\d+&?/g, '').replace('/original/', '/');
  outputUrl = outputUrl.includes('?') ? `${outputUrl}&` : `${outputUrl}?`;
  outputUrl = `${outputUrl}height=${productSwatchThumbnail}`;
  return outputUrl;
}

async function decorateMemberPrice(ctx, memberPrice, placeholders) {
  if (memberPrice) {
    const priceDiv = document.querySelector('.pdp-product__prices');
    const memberPriceContainer = document.createElement('div');
    memberPriceContainer.classList.add('pdp-member-price');
    priceDiv.classList.add('member-price');

    if (isLoggedInUser()) {
      memberPriceContainer.classList.add('logged-in');
      priceDiv.classList.add('member-price-logged-in');
    }

    const memberPriceIcon = document.createElement('span');
    memberPriceIcon.classList.add('icon', 'icon-logo');

    const memberPriceElement = document.createElement('div');
    memberPriceElement.classList.add('pdp-member-price-container');

    const memberPriceText = document.createElement('span');
    memberPriceText.classList.add('pdp-member-price--text');
    const currency = ctx.data.prices?.final?.currency || 'AED';
    memberPriceText.textContent = await formatPrice(currency, memberPrice);

    const memberPriceLabel = document.createElement('span');
    memberPriceLabel.classList.add('pdp-member-price--label');
    memberPriceLabel.textContent = placeholders.memberPriceLabel || 'Member Price';

    memberPriceContainer.appendChild(memberPriceIcon);
    memberPriceElement.appendChild(memberPriceText);
    memberPriceElement.appendChild(memberPriceLabel);

    memberPriceContainer.appendChild(memberPriceElement);

    decorateIcons(memberPriceContainer);
    priceDiv.appendChild(memberPriceContainer);
  }
}

async function renderVariantSwatches(ctx, block, placeholders) {
  const swatchesList = document.createElement('div');
  swatchesList.classList.add('pdp-swatches-list-container');
  const swatchesContainer = document.createElement('div');
  swatchesContainer.classList.add('pdp-swatches-refs');
  const swatchesTitle = document.createElement('p');
  swatchesTitle.classList.add('pdp-swatches__title');

  const styleCode = ctx.data.attributes.find((attr) => attr.id === 'style_code')?.value;
  const productSku = ctx.data.sku;
  const variables = {
    phrase: '',
    filter: [
      { attribute: 'style_code', eq: styleCode },
    ],
    sort: [
      { attribute: 'price', direction: 'DESC' },
    ],
    pageSize: 100,
  };

  let memberPrice = null;
  await performCatalogServiceQuery(variantsQuery, variables).then((allVariants) => {
    allVariants?.productSearch?.items?.forEach((item) => {
      const itemSku = item.productView.sku;
      cacheProductData(item.productView);
      const colorLabel = item.productView.variants.variants[0]?.product?.attributes.find((attr) => attr.name === 'color_label')?.value;
      const swatchImageJSON = item?.productView?.variants?.variants[0]?.product?.attributes.find((attr) => attr.name === 'assets_swatch')?.value;
      const memberPriceValue = item?.productView?.variants?.variants[0]?.product?.attributes.find((attr) => attr.name === 'member_price')?.value;
      console.log(productSku, itemSku, colorLabel, memberPrice);
      if (memberPriceValue && itemSku === productSku) {
        memberPrice = memberPriceValue;
      }

      let swatchImage = '';
      try {
        const swatchImageArray = JSON.parse(swatchImageJSON.replaceAll('\\', ''));
        swatchImage = formatSwatchUrl(swatchImageArray[0].styles.product_listing, placeholders);
      } catch (e) {
        console.warn(`Swatch image not found for ${item.productView.name}`);
      }
      const link = document.createElement('a');
      link.href = `/${document.documentElement.lang || 'en'}/${item.productView.urlKey}`;
      link.setAttribute('data-swatch-title', colorLabel);
      link.innerHTML = `<img src="${swatchImage}" alt="${item.productView.name}" />`;
      link.querySelector('img').addEventListener('mouseover', (e) => {
        const title = e.target.parentElement.getAttribute('data-swatch-title');
        document.querySelector('.pdp-swatches__title').textContent = title;
      });
      link.querySelector('img').addEventListener('mouseout', () => {
        const title = document.querySelector('.pdp-swatches-refs a').getAttribute('data-swatch-title');
        document.querySelector('.pdp-swatches__title').textContent = title;
      });
      swatchesContainer.append(link);
      if (itemSku === productSku) {
        swatchesTitle.textContent = colorLabel;
        link.classList.add('main-asset');
      }
    });
  });

  decorateMemberPrice(ctx, memberPrice, placeholders);

  swatchesList.appendChild(swatchesTitle);
  swatchesList.appendChild(swatchesContainer);
  if (window.matchMedia('(min-width: 768px)').matches) {
    // append swatches to the block for desktop view
    block.querySelector('.pdp-swatches').prepend(swatchesList);
  } else {
    // appending swatches for mobile view
    const actionsElement = block.querySelector('.pdp-product__content-column');
    if (document.querySelector('#product-overview-popup') && actionsElement) {
      actionsElement.appendChild(swatchesList, actionsElement);
    } else {
      block.querySelector('.pdp-product__content-column .pdp-product__header').prepend(swatchesList);
    }
  }

  const colourSwatches = block.querySelectorAll('.pdp-swatches-refs a');
  colourSwatches.forEach((colour) => {
    colour.addEventListener('click', () => {
      const colorName = colour.getAttribute('data-swatch-title');
      datalayerColorSwatchEvent('pdp', colorName);
    });
  });
}

export default function slot(ctx, $block, placeholders) {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  const sizeLabelText = placeholders.pdpSizeLabel || 'Size';
  const sizeGuideText = placeholders.pdpSizeGuideLabel || 'Size Guide';

  const size = ctx.getSlotElement('product-swatch--size');

  renderVariantSwatches(ctx, $block, placeholders);

  if (size) {
    // check if only NO SIZE option is available
    const noSizeOption = ctx.data.options.find((option) => option.id === 'size' && option.items.length === 1
      && (option.items[0].value === 'NO SIZE' || option.items[0].value === 'NOSIZE'));

    if (noSizeOption) {
      const emptySize = document.createElement('div');
      emptySize.classList.add('pdp-swatches__field--empty', 'pdp-swatches__field--disabled');
      size.prependChild(emptySize);
    }

    // add size label
    const sizeLabel = document.createElement('div');
    sizeLabel.classList.add('pdp-swatches__field__label');

    const sizeLabelSpan = document.createElement('span');
    sizeLabelSpan.classList.add('pdp-swatches__field__label--text');
    sizeLabelSpan.textContent = sizeLabelText;

    const sizeLabelSelection = document.createElement('span');
    sizeLabelSelection.classList.add('pdp-swatches__field__label--selection');

    sizeLabel.appendChild(sizeLabelSpan);
    sizeLabel.appendChild(sizeLabelSelection);

    size.prependChild(sizeLabel);

    // Size selector datalayer event
    const sizeList = document
      .querySelector('.pdp-swatches__field#swatch-item-size')
      ?.querySelectorAll('.pdp-swatches__options .dropin-text-swatch__label:not([class$="out-of-stock"]');
    sizeList.forEach((sizeBox) => {
      sizeBox.addEventListener('click', () => datalayerSizeSelectorEvent(sizeBox.textContent));
    });

    ctx.onChange((next) => {
      const sizeOption = next.data.options.find((option) => option.id === 'size');
      const currentSelection = document.querySelector('.pdp-swatches__options .dropin-text-swatch__container input.dropin-text-swatch--selected')?.getAttribute('value');
      if (!currentSelection) {
        document.querySelector('.pdp-product__actions .pdp-product__buttons .dropin-button--primary')?.removeAttribute('disabled');
        return;
      }
      if (sizeOption) {
        const selectedSize = sizeOption.items.find((item) => item.selected);
        if (selectedSize && selectedSize.label === currentSelection) {
          document.querySelector('.pdp-product__actions .pdp-product__buttons .dropin-button--primary')?.removeAttribute('disabled');
        } else {
          document.querySelector('.pdp-product__actions .pdp-product__buttons .dropin-button--primary')?.setAttribute('disabled', '');
        }
      }
    });

    document.querySelectorAll('.pdp-swatches__options').forEach((element) => {
      element.addEventListener('click', (event) => {
        event.stopPropagation();
      });
    });

    // add error message
    const errorDiv = document.createElement('div');
    errorDiv.classList.add('error-message-container', 'pdp-product__options-size__error', 'hidden', 'error-pdp');

    const errorField = document.createElement('span');
    errorField.textContent = placeholders?.selectSize || 'Please select a size';
    errorField.className = 'error-message';

    const icon = document.createElement('span');
    icon.classList.add('icon', 'icon-info-small-error');
    errorDiv.appendChild(icon);
    errorDiv.appendChild(errorField);

    decorateIcons(errorDiv);

    size.prependChild(errorDiv);

    const sizeLinkWrapper = document.createElement('div');
    sizeLinkWrapper.classList.add('pdp-swatches-size__link--wrapper');

    const sizeLink = document.createElement('div');
    sizeLink.classList.add('pdp-swatches-size__link--container');

    const sizeIcon = document.createElement('span');
    sizeIcon.classList.add('icon', 'icon-size');
    sizeLink.appendChild(sizeIcon);

    const sizeAnchor = document.createElement('a');
    sizeAnchor.href = '#';
    sizeAnchor.innerText = sizeGuideText;
    sizeAnchor.classList.add('pdp-swatches-size__link--anchor');
    sizeAnchor.onclick = (event) => { event.preventDefault(); };

    sizeLink.appendChild(sizeAnchor);
    window.addEventListener('delayed-loaded', async () => {
      // This is the code that will be auto apply filter based on target PDP
      sizeAnchor.addEventListener('click', () => {
        initSizeGuideDefaults();
        datalayerSizeGuide();
      });
      decorateSizeGuide(sizeLink, ctx, placeholders);
    });

    const sizeClose = document.createElement('div');
    sizeClose.classList.add('pdp-product__options-size__close');
    const sizeCloseIcon = document.createElement('span');
    sizeCloseIcon.classList.add('icon', 'icon-close');
    sizeClose.appendChild(sizeCloseIcon);

    sizeClose.addEventListener('click', (event) => {
      event.preventDefault();
      $block.querySelector('.pdp-swatches__field#swatch-item-size').classList.remove('pdp-product__options-size--open');
      document.querySelector('.generic-overlay-background').classList.remove('show');
    });

    sizeLinkWrapper.appendChild(sizeLink);
    sizeLinkWrapper.appendChild(sizeClose);

    decorateIcons(sizeLinkWrapper);
    size.appendChild(sizeLinkWrapper);

    sizeLabel.addEventListener('click', (event) => {
      event.preventDefault();
      if (!isMobile) return;
      $block.querySelector('.pdp-swatches__field#swatch-item-size').classList.add('pdp-product__options-size--open');
      document.querySelector('.generic-overlay-background').classList.add('show');
    });

    if (isMobile) {
      const carousel = $block.querySelector('.pdp-carousel');
      const pdpProductButtons = $block.querySelector('.pdp-product__buttons');
      const swatchItemSizeMobile = $block.querySelector('.pdp-swatches__field#swatch-item-size');

      const sizeSelectInMobile = (sizelabel) => {
        const overlayBg = document.querySelector('.generic-overlay-background');
        swatchItemSizeMobile.classList.remove('pdp-product__options-size--open');
        if (overlayBg && overlayBg.classList.contains('show')) {
          overlayBg.classList.remove('show');
        }
        sizeLabelSelection.textContent = sizelabel.textContent;
      };
      const actionsElement = document.querySelector('.pdp-product__actions');
      const observer = new MutationObserver((mutationsList) => {
        const buttonBar = document.querySelector('.dropin-button-bar');
        mutationsList.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('dropin-button-bar')) {
              if (isPDP()) {
                carousel.appendChild(node.parentElement);
              } else {
                actionsElement.appendChild(buttonBar);
                actionsElement.classList.add('button-bar-wishlist');
              }
            }
          });
        });
      });
      observer.observe(pdpProductButtons, { childList: true, subtree: true });

      const allSelectableSizes = document.querySelectorAll('label.dropin-text-swatch__label');
      allSelectableSizes.forEach((selectableSize) => {
        selectableSize.addEventListener('click', () => {
          sizeSelectInMobile(selectableSize);
        });
      });
    }

    ctx.onChange((next) => {
      let hasSize = false;
      next.data.options.forEach((option) => {
        if (option.id === 'size') {
          const sizeOption = option.items.find((item) => item.selected);
          if (sizeOption) {
            sizeLabelSelection.textContent = sizeOption.label;
            hasSize = true;
          }
        }
      });

      if (hasSize) {
        $block.querySelector('.error-message-container').classList.add('hidden');
      }
    });
  }
}
