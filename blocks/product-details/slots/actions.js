import { decorateIcons } from '../../../scripts/aem.js';
import { isProductInWishlist } from '../../../scripts/wishlist/api.js';
import { openModal, getPreviewPreaccessType } from '../../../scripts/scripts.js';
import {
  createShareIcon, loadSocialShareModal, createModal, SOCIAL_SHARE_DIALOG_ID,
} from '../../social-share/social-share.js';
import {
  datalayerAddToWishlistEvent,
  datalayerAddToCartEvent,
  datalayerSocialShareEvent,
  datalayerCartError,
  datalayerImageSwipeEvent,
} from '../../../scripts/analytics/google-data-layer.js';
import { store } from '../../../scripts/minicart/api.js';
import { targetClickTrackingEvent } from '../../../scripts/target-events.js';

function hasSizeOption(product) {
  return product.options
    ?.filter((option) => (option.id === 'size'))?.length > 0 ?? false;
}

function isSizeSelected(product, options) {
  return product.options
    ?.filter((option) => (option.id === 'size'))?.[0].items
    .filter((item) => item.selected
      || ((item.value === 'NO SIZE' || item.value === 'NOSIZE')
      && options?.includes(item.id)))?.length > 0 ?? false;
}

function sortSeasonCode(option1, option2) {
  const seasonCode1 = option1.label;
  const seasonCode2 = option2.label;
  const year1 = parseInt(seasonCode1.substring(0, 2), 10);
  const year2 = parseInt(seasonCode2.substring(0, 2), 10);

  const cycle1 = parseInt(seasonCode1.substring(2, 3), 10);
  const cycle2 = parseInt(seasonCode2.substring(2, 3), 10);

  if (year1 < year2) {
    return -1;
  }

  if (year1 > year2) {
    return 1;
  }

  if (cycle1 === cycle2 - 1 || (cycle1 === 9 && cycle2 === 0)) {
    return -1;
  }

  if (cycle1 === cycle2 + 1 || (cycle1 === 0 && cycle2 === 9)) {
    return 1;
  }
  return 0;
}

function selectSeasonCode(product, options) {
  const seasonOptions = product.options?.filter((option) => (option.id === 'season_code'))?.[0].items;
  if (!seasonOptions || seasonOptions.length === 1) {
    return;
  }

  // Select the season code based on earliest season code which is instock
  const inStockSeasonOptions = seasonOptions.filter((option) => option.inStock === true);
  const selectedSeasonCode = inStockSeasonOptions.sort(sortSeasonCode)[0];

  seasonOptions.forEach((option) => {
    option.selected = false;
  });

  if (selectedSeasonCode) {
    selectedSeasonCode.selected = true;
    const newOptions = [];

    let oldOption;

    options.forEach((optionId) => {
      const option = product.options?.find((o) => o.items?.find((i) => i.id === optionId));
      if (option) {
        oldOption = optionId;
      }
    });
    options.forEach((optionId) => {
      if (optionId !== oldOption) {
        newOptions.push(optionId);
      }
    });
    newOptions.push(selectedSeasonCode.id);

    options.splice(0, options.length, ...newOptions);
  }
}

async function handleAddToCart(e, data, block) {
  let button = e.target;

  if (button.tagName !== 'BUTTON') {
    button = button.closest('button');
  }

  // Prevents multiple clicks
  if (button.classList.contains('loader')) {
    return;
  }

  // Extracts `selected` item `id`s for each option or
  // the first item's `id` if none are selected in that option
  const options = data.options?.map((option) => {
    const selectedOptionItemId = option.items?.find((item) => item.selected)?.id;
    return selectedOptionItemId || option.items?.[0]?.id;
  }).filter((x) => !!x) ?? [];

  selectSeasonCode(data, options);
  const errorContainer = block.querySelector('.error-message-container');
  if (hasSizeOption(data) && !isSizeSelected(data, options)) {
    errorContainer.classList.remove('hidden');
    const errorText = block.querySelector('.error-message-container .error-message').innerText;
    const cartId = store.getCartId();
    datalayerCartError(errorText, cartId);
  } else {
    errorContainer.classList.add('hidden');
    button.classList.add('loader');
    const { cartApi } = await import('../../../scripts/minicart/api.js');
    const quantity = block.querySelector('.dropin-incrementer__input')?.value ?? 1;
    console.debug('Add to Cart', data.sku, options, quantity);
    const response = await cartApi.addToCart(data.sku, options, quantity);
    if (!response.success) {
      errorContainer?.classList.remove('hidden');
      block.querySelector('.error-message-container .error-message').innerText = response.message;
    } else {
      const [, product] = await window.product;
      await datalayerAddToCartEvent(true, product, quantity, options[0]);
      targetClickTrackingEvent({ key: 'addToCart' });
      const progressCount = document.querySelector('#progress-count');
      if (progressCount) {
        progressCount.innerText = progressCount?.innerText?.replace(/\d+/g, (match) => parseInt(match, 10) - 1); // Decrement item counts
      }
    }
    button.classList.remove('loader');
  }
}

async function renderAddToFavoriteButton(placeholders) {
  const addToFavoriteLabel = placeholders.addToFavouritesLabel || 'Add to Favourites';
  const addToFavoriteButton = document.createElement('button');
  addToFavoriteButton.setAttribute('aria-label', addToFavoriteLabel);
  addToFavoriteButton.innerHTML = `<span class="icon icon-wishlist-empty-pdp"></span><span class="icon icon-wishlist-filled-pdp"></span><span class="wishlist-label">${addToFavoriteLabel}</span>`;
  return addToFavoriteButton;
}

function updateFavoriteLabelStatus(addToFavoriteButton, placeholders, productData) {
  const addToFavouritesLabel = placeholders.addToFavouritesLabel || 'Add to Favourites';
  const addedToFavouritesLabel = placeholders.addedToFavouritesLabel || 'Added to Favourites';
  const addToFavouriteLabel = addToFavoriteButton.querySelector('.wishlist-label');
  const wishlistState = addToFavoriteButton.classList.contains('in-wishlist');
  if (wishlistState) {
    addToFavoriteButton.setAttribute('aria-label', addedToFavouritesLabel);
    addToFavouriteLabel.innerText = addedToFavouritesLabel;
  } else {
    addToFavoriteButton.setAttribute('aria-label', addToFavouritesLabel);
    addToFavouriteLabel.innerText = addToFavouritesLabel;
  }
  if (productData) {
    datalayerAddToWishlistEvent(wishlistState, productData, 'pdp');
  }
}

export async function createSocialShareButton(ctx, url) {
  const {
    socialShareOverlayTitle,
    socialShareOverlay,
  } = await loadSocialShareModal(ctx.data);
  createModal({
    socialShareOverlayTitle,
    socialShareOverlay,
    shareUrl: url,
  });
}

export default async function slot(ctx, $block, placeholders, isVisitorEligible) {
  const { lang } = document.documentElement;
  const previewPreaccessAttr = ctx.data.attributes?.find((el) => el.id === 'preview_preaccess_data')?.value;
  const previewPreaccessData = previewPreaccessAttr ? JSON.parse(previewPreaccessAttr) : null;

  const typeInfo = getPreviewPreaccessType(previewPreaccessData, lang);

  let addToCartLabel = placeholders.addToCartLabel || 'Add to Cart';
  const outOfStockLabel = placeholders.outOfStockLabel || 'Out of Stock';

  const addToCartButton = document.createElement('button');
  addToCartButton.classList.add('dropin-button', 'dropin-button--medium', 'dropin-button--primary');

  if (!ctx.data.addToCartAllowed) {
    addToCartButton.classList.add('addtocart-not-allowed');
  }
  if (typeInfo.type === 'preview') {
    addToCartButton.classList.add('pdp-product-add-to-cart__hide');
  }
  if (typeInfo.type === 'pre-access') {
    if (!isVisitorEligible) {
      addToCartButton.classList.add('pdp-product-add-to-cart__hide');
    }
  }
  if (typeInfo?.type && typeInfo?.pdpText) {
    const divElement = document.createElement('div');
    const spanElement = document.createElement('span');
    spanElement.textContent = typeInfo?.pdpText;
    divElement.classList.add('pdp-product__previewtxt');
    divElement.appendChild(spanElement);
    ctx.appendChild(divElement);
  }

  // when the product is in stock but atleast one size is not available
  const swatchContainers = document.querySelectorAll('.dropin-text-swatch__container');
  swatchContainers.forEach((inStockSwatchContainer) => {
    const inStockLabel = inStockSwatchContainer.querySelector('label');
    if (inStockLabel.classList.contains('dropin-text-swatch__label--out-of-stock')) {
      const inStockInput = inStockSwatchContainer.querySelector('input');
      inStockInput.disabled = true;
    }
  });

  // when the product is out of stock
  if (!ctx.data.inStock) {
    // disabled add to card button and lable it with out of stock
    addToCartButton.classList.add('dropin-button--primary--disabled');
    addToCartButton.disabled = true;
    addToCartLabel = outOfStockLabel;

    // size should not be selected when the product is out of stock
    swatchContainers.forEach((oosSwatchContainer) => {
      const oosInputs = oosSwatchContainer.querySelector('input');
      oosInputs.disabled = true;
    });
  }
  addToCartButton.setAttribute('aria-label', addToCartLabel);
  addToCartButton.innerHTML = `<span>${addToCartLabel}</span>`;
  ctx.appendChild(addToCartButton);

  const buttonBar = document.createElement('div');
  buttonBar.classList.add('dropin-button-bar');
  const carousel = $block.querySelector('.pdp-carousel');
  const productButtons = $block.querySelector('.pdp-product__buttons');

  // hide add to fav and share for OOS products
  if (ctx.data.inStock) {
    ctx.appendChild(buttonBar);

    // listen to the resize event to update the button bar position
    // Create a ResizeObserver instance
    const isMobile = window.innerWidth < 768;
    const resizeObserver = new ResizeObserver(() => {
      if (isMobile) {
        carousel.appendChild(buttonBar.parentElement);
      } else {
        productButtons.appendChild(buttonBar.parentElement);
      }
    });

    // Start observing the element
    resizeObserver.observe($block);
  }
  // image swipe mutationObserver
  const targetNode = $block.querySelector('.pdp-carousel__wrapper');
  let previousActiveImage = $block.querySelector('.pdp-carousel__slide--active');

  const observer = new MutationObserver((mutationList) => {
    mutationList.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        const { target } = mutation;
        target.classList.forEach((className) => {
          if (className.endsWith('--active')) {
            let direction;
            if (previousActiveImage) {
              // Determine swipe direction based on previous and current active images
              const allSlides = Array.from(document.querySelectorAll('.pdp-carousel__slide '));
              const previousIndex = allSlides.indexOf(previousActiveImage);
              const currentIndex = allSlides.indexOf(target);
              if (previousIndex !== currentIndex) {
                if (currentIndex > previousIndex) {
                  direction = 'left';
                } else if (currentIndex < previousIndex) {
                  direction = 'right';
                }
                datalayerImageSwipeEvent(direction, 'pdp');
              }
            }
            previousActiveImage = target;
          }
        });
      }
    });
  });
  const observerButtonBar = new MutationObserver((mutationList) => {
    mutationList.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation?.previousSibling?.className === 'amastyLabel') {
        const findButtonBar = document.querySelector('.pdp-carousel .dropin-button-bar');
        if (!findButtonBar) {
          carousel?.appendChild(buttonBar?.parentElement);
        }
      }
    });
  });

  observerButtonBar.observe(carousel, {
    attributes: true, subtree: true, childList: true, attributeFilter: ['class'],
  });

  observer.observe(targetNode, { attributes: true, subtree: true, attributeFilter: ['class'] });

  // Add to favorite button
  const addToFavoriteButton = await renderAddToFavoriteButton(placeholders);
  addToFavoriteButton.classList.add('dropin-button', 'dropin-button--medium', 'dropin-button--secondary', 'add-to-favorite', 'secondary');

  // check if the product is already in the wishlist
  isProductInWishlist(ctx.data.sku).then((index) => {
    if (index !== -1) {
      addToFavoriteButton.classList.add('in-wishlist');
      updateFavoriteLabelStatus(addToFavoriteButton, placeholders);
    }
  });

  // listener to add the product to the wishlist
  addToFavoriteButton.addEventListener('click', () => {
    if (addToFavoriteButton.classList.contains('disabled')) {
      return;
    }
    addToFavoriteButton.classList.add('loader');

    addToFavoriteButton.classList.add('disabled');
    import('../../../scripts/wishlist/api.js')
      .then(async (module) => {
        const wishListIconState = addToFavoriteButton.classList.contains('in-wishlist');
        const status = await module.updateWishlist(ctx.data, wishListIconState);

        addToFavoriteButton.classList.remove('loader');

        addToFavoriteButton.classList.remove('disabled');
        const [, product] = await window.product;

        if (status && status.status) {
          addToFavoriteButton.classList.toggle('in-wishlist');
          updateFavoriteLabelStatus(addToFavoriteButton, placeholders, product);
        } else {
          console.error(status?.message);
        }
      });
  });

  buttonBar.appendChild(addToFavoriteButton);

  const shareButton = document.createElement('button');
  shareButton.classList.add('dropin-button', 'dropin-button--medium', 'dropin-button--secondary', 'dropin-button--icon', 'secondary', 'social-share--icon');

  const shareLink = await createShareIcon();
  shareButton.appendChild(shareLink);

  buttonBar.appendChild(shareButton);
  decorateIcons(buttonBar);

  let addToCartListener;
  addToCartListener = async (e) => {
    handleAddToCart(e, ctx.data, $block);
  };
  addToCartButton.addEventListener('click', addToCartListener);

  ctx.onChange((next) => {
    if (addToCartListener) {
      addToCartButton.removeEventListener('click', addToCartListener);
    }
    addToCartListener = (e) => handleAddToCart(e, next.data, $block);
    addToCartButton.addEventListener('click', addToCartListener);
  });

  shareButton.addEventListener('click', async (e) => {
    e.preventDefault();
    openModal(SOCIAL_SHARE_DIALOG_ID);
    datalayerSocialShareEvent('open');
  });

  window.addEventListener('delayed-loaded', async () => {
    await createSocialShareButton(window.location.href, ctx.data);
  });
}
