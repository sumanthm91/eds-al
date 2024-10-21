import { loadCSS } from '../../scripts/aem.js';
import {
  fetchPlaceholdersForLocale,
  createModalFromContent,
  openModal,
  getLanguageAttr,
  getCurrencyFormatter,
  loadFragment,
  fireTargetCall,
} from '../../scripts/scripts.js';
import { getSignInToken } from '../../scripts/commerce.js';
import { pdpLoadData } from '../../scripts/target-events.js';

/**
 * @param {Object} products The details of the products in the cart
 */
const getProductImage = (product) => {
  let assetsCart = product?.attributes?.find((attr) => attr.name === 'assets_cart')?.value || product?.variants?.variants[0]?.product?.attributes.find((attr) => attr.name === 'assets_cart')?.value;
  let imageUrl = null;
  if (assetsCart && assetsCart !== '[]') {
    const assets = JSON.parse(assetsCart);
    if (assets.length > 0) {
      const { styles: { cart_thumbnail: cartThumbnail } } = assets[0];
      imageUrl = cartThumbnail;
    }
  } else if (!assetsCart || assetsCart === '[]') {
    assetsCart = product?.attributes?.find((attr) => attr.name === 'swatch_image_url')?.value;
    if (assetsCart) {
      imageUrl = assetsCart;
    }
  }
  if (imageUrl) {
    const productSwatchImg = document.createElement('div');
    productSwatchImg.classList.add('swatch-img');
    const img = document.createElement('img');
    img.setAttribute('src', imageUrl);
    productSwatchImg.appendChild(img);
    return productSwatchImg;
  }
  return document.createDocumentFragment();
};
/**
 * @param {Object} productOptions Contains the configurable options of cart item
 * @param {Object} product The details of the product in the cart
 * @returns the list of configurable attributes of the cart item, like size, color etc...
 */
const getProductConfigs = (updatedCart, product, placeholders) => {
  const { product_option: productOptions, qty } = updatedCart;

  const validOptions = [{
    label: `${placeholders.qty || 'Qty'}: `,
    value: qty,
  }];
  if (productOptions?.extension_attributes?.configurable_item_options?.length > 0) {
    const { extension_attributes: { configurable_item_options: options } } = productOptions;

    // Filter the valid configurable options of the cart items
    // excluding the season_code.
    options.forEach(({ option_id: optionId, option_value: optionValue }) => {
      if (product?.options?.length > 0) {
        const { options: configurableOptions } = product;

        configurableOptions.filter((option) => option.id !== 'season_code')
          .forEach((option) => {
            const baseEncodedOptionValue = btoa(`configurable/${optionId}/${optionValue}`);
            const configValueObj = option.values
              .find((value) => value.id === baseEncodedOptionValue);
            if (configValueObj) {
              if (option.id === 'size' && (configValueObj.title === 'NO SIZE' || configValueObj.title === 'NOSIZE ')) {
                return;
              }
              validOptions.push({
                label: `${option.title}: `,
                value: configValueObj.title,
              });
            }
          });
      }
    });
  }

  // check for variants
  if (product?.variants?.variants?.length > 0) {
    const color = product?.variants?.variants[0].product?.attributes.find((attr) => attr.name === 'color_label');

    if (color) {
      validOptions.push({
        label: `${placeholders.productColor || 'Color:'} `,
        value: color.value,
      });
    }
  }

  // Creates and returns the HTML element for rendering.
  if (validOptions.length > 0) {
    const productConfigs = document.createElement('ul');
    productConfigs.classList.add('product-configs');
    validOptions.forEach((o) => {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.innerText = o.label;
      const value = document.createElement('span');
      value.innerText = o.value;
      li.appendChild(label);
      li.appendChild(value);
      productConfigs.appendChild(li);
    });

    return productConfigs;
  }

  return document.createDocumentFragment();
};
/**
 * @param {Object} products The details of the products in the cart
 * @returns the list of configurable attributes of the cart item, like size, color etc...
 * @param {Object} cartData details of current cart item
 * @returns HTMLElement the HTML for the price block
 */
const getProductPrice = async (product, cartData, updatedCart) => {
  const actualPrice = updatedCart?.price || 0;

  if (product?.priceRange?.maximum) {
    const {
      maximum: {
        final: finalPrice,
        regular: regularPrice,
      },
    } = product.priceRange;

    let discount = 0;

    const currencyFormat = await getCurrencyFormatter(cartData?.currency?.base_currency_code);
    const productPrice = document.createElement('div');
    productPrice.classList.add('product-price');
    const priceLabels = document.createElement('div');
    priceLabels.classList.add('price-lables');
    // Final price of the item
    const productFinalPrice = document.createElement('h4');

    if (actualPrice > 0 && actualPrice !== finalPrice?.amount?.value) {
      productFinalPrice.innerText = currencyFormat.format(actualPrice);
      priceLabels.appendChild(productFinalPrice);
    } else {
      productFinalPrice.innerText = currencyFormat.format(finalPrice?.amount?.value);
      priceLabels.appendChild(productFinalPrice);
    }

    if (regularPrice?.amount?.value !== finalPrice?.amount?.value
      || regularPrice?.amount?.value !== actualPrice) {
      // Regular price of the item
      const productRegularPrice = document.createElement('h5');
      productRegularPrice.innerText = currencyFormat.format(regularPrice?.amount?.value);
      priceLabels.appendChild(productRegularPrice);

      // Discount %
      if (regularPrice?.amount?.value > 0 && finalPrice?.amount?.value > 0) {
        discount = (regularPrice.amount.value - finalPrice.amount.value);
        discount /= regularPrice.amount.value;
        discount *= 100;
      }
    }
    productPrice.appendChild(priceLabels);

    if (discount > 0) {
      const productDiscountPrice = document.createElement('div');
      productDiscountPrice.innerHTML = `<span>-${Math.floor(discount)}%</span>`;
      productPrice.appendChild(productDiscountPrice);
    }

    return productPrice;
  }
  return document.createDocumentFragment();
};

/**
 * @param {CustomEvent} event
 * The main rendering of the add to bag block
 */
export default async function renderAddToBagDialog(event) {
  const ADDED_TO_BAG_DIALOG_ID = 'added-to-bag-dialog';
  const placeholders = await fetchPlaceholdersForLocale();
  const lang = getLanguageAttr();
  const token = getSignInToken();
  const { detail: { product, cart, updatedCart } } = event;

  const addedToBagModalTitle = placeholders.addedToBag || 'Added to Bag';
  const addedToBagModalOverlay = document.createElement('div');

  const modalProducts = document.createElement('div');
  modalProducts.classList.add('modal-products');

  const modalProduct = document.createElement('div');
  modalProduct.classList.add('modal-product');
  const productSwatchImg = getProductImage(product);

  const productContent = document.createElement('div');
  productContent.classList.add('product-content');
  const productTitle = document.createElement('h4');
  productTitle.classList.add('product-title');
  productTitle.innerText = updatedCart?.name || '';

  const productPrice = await getProductPrice(product, cart, updatedCart);

  productContent.appendChild(productTitle);
  productContent.appendChild(productPrice);
  const productConfigs = getProductConfigs(updatedCart, product, placeholders);
  productContent.appendChild(productConfigs);

  modalProduct.appendChild(productSwatchImg);
  modalProduct.appendChild(productContent);
  modalProducts.appendChild(modalProduct);

  /** Modal Buttons */
  const modalButtons = document.createElement('div');
  modalButtons.classList.add('modal-buttons');
  const buttonViewBag = document.createElement('a');
  // View bag button in the modal
  buttonViewBag.classList.add(...['button', 'secondary']);
  buttonViewBag.setAttribute('href', `/${lang}/cart`);
  buttonViewBag.innerText = placeholders.viewBag || 'View Bag';

  /* Modal carousel */
  const modalCarousel = document.createElement('div');
  modalCarousel.classList.add('modal-carousel');

  // Checkout button in the modal
  const buttonCheckout = document.createElement('a');
  buttonCheckout.classList.add(...['button', 'primary']);
  let buttonCheckoutUrl = `/${lang}/cart/login?redirect=/${lang}/checkout`;
  if (token) {
    buttonCheckoutUrl = `/${lang}/checkout`;
  }
  buttonCheckout.setAttribute('href', buttonCheckoutUrl);
  buttonCheckout.innerText = placeholders.checkout || 'Checkout';
  modalButtons.appendChild(buttonViewBag);
  modalButtons.appendChild(buttonCheckout);

  /** Modal footer */
  const modalFooter = document.createElement('div');
  modalFooter.classList.add('modal-footer');
  const itemsInBagText = document.createElement('h4');
  itemsInBagText.innerText = `${placeholders.itemsInYourBag || 'Items in your bag'}: ${cart?.totals?.items_qty || 0}`;
  const subTotalText = document.createElement('h4');
  const subTotalValue = cart.totals?.subtotal_incl_tax || 0;
  const decimalDigits = placeholders.decimalDigits || 2;
  const subTotal = (Math.round(subTotalValue * 100) / 100).toFixed(decimalDigits);
  subTotalText.innerText = `${placeholders.subTotal || 'Subtotal'}: ${subTotal}`;
  modalFooter.appendChild(itemsInBagText);
  modalFooter.appendChild(subTotalText);

  addedToBagModalOverlay.appendChild(modalProducts);
  addedToBagModalOverlay.appendChild(modalButtons);
  addedToBagModalOverlay.appendChild(modalCarousel);
  addedToBagModalOverlay.appendChild(modalFooter);
  const [carouselBlockSection, fullProductData] = await Promise.all([
    loadFragment(`/${lang}/fragments/add-to-bag/recommendations`),
    window.product,
    createModalFromContent(
      ADDED_TO_BAG_DIALOG_ID,
      addedToBagModalTitle,
      addedToBagModalOverlay.outerHTML,
      [ADDED_TO_BAG_DIALOG_ID],
      'tick-verified',
    ),
    loadCSS('/blocks/added-to-bag/added-to-bag.css'),
  ]);
  const [targetPayload] = await Promise.all([
    pdpLoadData(fullProductData?.[1]),
    openModal(ADDED_TO_BAG_DIALOG_ID),
  ]);
  const addToBadTargetId = carouselBlockSection.querySelector('div[data-target-id]')?.dataset?.targetId;
  if (addToBadTargetId) {
    document.querySelector('.modal-carousel').appendChild(carouselBlockSection);
    fireTargetCall(targetPayload, [addToBadTargetId], false).then(() => {
      window.setTimeout(() => {
        window.dispatchEvent(new CustomEvent('target-response'));
      }, 2000);
    });
  }
}
