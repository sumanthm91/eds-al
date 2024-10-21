import ProductDetails from '@dropins/storefront-pdp/containers/ProductDetails.js';
import { render as productRenderer } from '@dropins/storefront-pdp/render.js';
import { getWishlist } from '../../scripts/wishlist/api.js';
import {
  postJSON,
  fetchPlaceholdersForLocale,
  loadFragment,
  createModalFromContent,
  openModal, closeModal,
} from '../../scripts/scripts.js';
import {
  buildHits,
  getProductListingConfig,
  attributesToRetrieve,
  responseFields,
  buildAlgoliaIndexUrl,
  buildLoadMoreContainer,
  updatePageLoader,
} from '../algolia-product-listing/algolia-product-listing.js';
import { getSignInToken, loadProduct } from '../../scripts/commerce.js';
import { decorateIcons } from '../../scripts/aem.js';

import {
  getLocale,
  initializeProduct, renderPromotions, renderRegularPrice, renderSpecialPrice,
} from '../product-details/product-details.js';

import actionsSlot, { createSocialShareButton } from '../product-details/slots/actions.js';
import optionsSlot, { decorateSizeGuide } from '../product-details/slots/options.js';

import renderAddToBagDialog from '../added-to-bag/added-to-bag.js';

let wishlistConfig;
let placeholders;
let wishlistPage = 0;

const responsesCollection = {
  hits: [],
  nbHits: 0,
};
const MAX_ITEMS_IN_CHUNK = 30;

function getColumnsClass(block) {
  const columnsClass = Array.from(block.classList).find((className) => className.startsWith('columns-'));
  block.classList.remove(columnsClass);
  return columnsClass || 'columns-4';
}

function isMobile() {
  return window.matchMedia('(max-width: 767px)').matches;
}

function displayEmptyWishlist() {
  const block = document.querySelector('.wishlist.block');
  const emptyWishlistContainer = document.createElement('div');
  emptyWishlistContainer.classList.add('empty-wishlist-container');

  const emptyWishlistText = document.createElement('p');
  emptyWishlistText.innerText = placeholders.favouritesEmptyText;
  emptyWishlistContainer.appendChild(emptyWishlistText);

  const emptyWishlistButton = document.createElement('a');
  emptyWishlistButton.classList.add('button');
  emptyWishlistButton.classList.add('primary');
  emptyWishlistButton.setAttribute('href', placeholders.favouritesGoShoppingUrl);
  emptyWishlistButton.innerText = placeholders.favouritesEmptyButton;
  emptyWishlistContainer.appendChild(emptyWishlistButton);
  block.appendChild(emptyWishlistContainer);
}

function addWishlistButtons() {
  const allProducts = document.querySelectorAll('.product-item:not(:has(.basket-buttons-container))');
  allProducts.forEach((productItem) => {
    // Build add to basket button
    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList.add('basket-buttons-container');
    const addToBasket = document.createElement('button');
    addToBasket.classList.add('add-to-basket');
    addToBasket.setAttribute('aria-label', 'Add to basket');
    addToBasket.innerHTML = `<span>${placeholders.favouritesAddToBasket}</span>`;

    const { product: wishlistIdInfoList } = productItem.querySelector('.wishlist-button-wrapper').dataset;
    const productData = JSON.parse(wishlistIdInfoList);
    productItem.setAttribute('data-sku', productData.sku);
    if (productItem.querySelector('.overlay-out-of-stock-container') || productItem.querySelector('.preview')) {
      addToBasket.disabled = true;
    } else {
      addToBasket.addEventListener('click', async () => {
        addToBasket.classList.add('loader');
        const productDiv = document.createElement('div');
        productDiv.setAttribute('id', 'product-overview-popup');
        window.product = await loadProduct(productData.sku);
        const [sku, product] = window.product;
        const locale = await getLocale();
        await initializeProduct(product, locale);

        const slots = {
          Options: (ctx) => {
            optionsSlot(ctx, productDiv, placeholders, true);
            decorateSizeGuide(productDiv.querySelector('.pdp-swatches-size__link--container'), ctx, placeholders);
          },
          Actions: (ctx) => {
            actionsSlot(ctx, productDiv, placeholders, true);
            const productHref = `${window.location.origin}/${document.documentElement.lang || 'en'}/${ctx.data.urlKey}`;
            const viewProductDetails = document.createElement('a');
            viewProductDetails.setAttribute('href', productHref);
            viewProductDetails.setAttribute('target', '_blank');
            viewProductDetails.classList.add('view-product-details');
            viewProductDetails.classList.add('button');
            viewProductDetails.textContent = placeholders.favouritesViewProductDetails;
            if (isMobile()) {
              productDiv.querySelector('.pdp-product__buttons').append(viewProductDetails);
            } else {
              const dialogFooter = document.createElement('div');
              dialogFooter.classList.add('modal-footer');
              document.querySelector('.wishlist-product-overview').appendChild(dialogFooter);
              productDiv.querySelector('.pdp-product__buttons').prepend(viewProductDetails);
              document.querySelector('#wishlist-product-overview .modal-footer').appendChild(productDiv.querySelector('.pdp-product__buttons'));
              document.querySelector('#wishlist-product-overview .modal-footer').appendChild(productDiv.querySelector('.pdp-product__quantity'));
            }
            createSocialShareButton(product, productHref);
          },
          Title: (ctx) => {
            const titleDiv = document.createElement('div');
            const brand = ctx.data.attributes?.find((el) => el.id === 'brand_full_name')?.value;
            if (brand) {
              const subtitle = document.createElement('p');
              subtitle.classList.add('pdp-product__subtitle');
              subtitle.textContent = brand;
              titleDiv.appendChild(subtitle);
            }
            const title = document.createElement('h6');
            title.classList.add('pdp-product__title');
            title.textContent = ctx.data.name;
            titleDiv.appendChild(title);
            ctx.replaceWith(titleDiv);
          },
          RegularPrice: (ctx) => {
            renderRegularPrice(ctx, placeholders);
          },
          SpecialPrice: (ctx) => {
            renderSpecialPrice(ctx, placeholders);
          },
          ShortDescription: (ctx) => {
            const shortDescription = document.createElement('div');
            ctx.replaceWith(shortDescription);
          },
          Description: (ctx) => {
            const description = document.createElement('div');
            ctx.replaceWith(description);
          },
          Attributes: (ctx) => {
            renderPromotions(ctx);
            productDiv.querySelector('.pdp-product__prices').insertAdjacentElement('afterend', productDiv.querySelector('.pdp-product__attributes'));
          },
        };

        await productRenderer.render(ProductDetails, {
          sku,
          slots,
          carousel: {
            imageParams: {
              width: null,
            },
          },
          hideURLParams: true,
          hideSku: true,
        })(productDiv);

        createModalFromContent('wishlist-product-overview', placeholders.favouritesQuickView, productDiv, ['wishlist-product-overview'], '', true).then(async () => {
          await openModal('wishlist-product-overview').then(() => {
            addToBasket.classList.remove('loader');
            document.querySelectorAll('.pdp-product .pdp-product__images .pdp-gallery-grid__item').forEach((item) => {
              item.addEventListener('click', (event) => {
                event.stopImmediatePropagation();
              }, { capture: true });
            });
          });
        });
      });
    }
    buttonsDiv.appendChild(addToBasket); // TODO: add to basket functionality
    productItem.appendChild(buttonsDiv);

    // Build remove from wishlist button
    const { product: wishlistIdInfo } = productItem.querySelector('.wishlist-button-wrapper').dataset;
    const removeFromWishlist = document.createElement('a');
    removeFromWishlist.classList.add('remove-from-wishlist');
    removeFromWishlist.setAttribute('data-product', `${wishlistIdInfo}`);
    removeFromWishlist.innerText = `${placeholders.favouritesRemove}`;

    // Add event listeners
    removeFromWishlist.addEventListener('click', async (event) => {
      const wishlistButton = event.target.closest('.product-item').querySelector('.wishlist-button-wrapper');
      if (wishlistButton) {
        wishlistButton.click();
        event.target.closest('.product-item').remove();
        const productsContainer = document.querySelector('.products-container');
        if (productsContainer.children.length === 0) {
          productsContainer.remove();
          displayEmptyWishlist();
        }
        const progressCount = document.querySelector('#progress-count');
        progressCount.innerText = progressCount.innerText.replace(/\d+/g, (match) => parseInt(match, 10) - 1); // Decrement item counts
      }
    });
    buttonsDiv.appendChild(removeFromWishlist);
  });
}

function showMessageInHeader(messageBlock, className) {
  const wishlistBlock = document.querySelector('.wishlist.block');
  const contentBlock = document.createElement('div');
  const icon = document.createElement('span');

  icon.classList.add('icon', 'icon-info');
  contentBlock.classList.add('header-message', className);
  contentBlock.appendChild(icon);
  decorateIcons(contentBlock);
  contentBlock.appendChild(messageBlock);
  wishlistBlock.insertBefore(contentBlock, wishlistBlock.firstChild);
}

async function showHoldOnFavoritesMessage() {
  const lang = document.documentElement.lang || 'en';
  const fragmentPath = `/${lang}/fragments/wishlist/hold-on-favorites`;
  const messageBlock = await loadFragment(fragmentPath);
  showMessageInHeader(messageBlock, 'info-message');
}

function showProductDoesNotExistMessage() {
  const messageBlock = document.createElement('div');
  messageBlock.innerText = placeholders.favouritesProductDoesNotExistText;
  decorateIcons(messageBlock);
  showMessageInHeader(messageBlock, 'warn-message');
}

function getWishlistItemsForPage() {
  const itemsPerPage = wishlistConfig['favourites-hits-per-page'];

  return {
    results: [{
      hits: responsesCollection.hits.slice(
        wishlistPage * itemsPerPage,
        (wishlistPage + 1) * itemsPerPage,
      ),
      hitsPerPage: itemsPerPage,
      nbHits: responsesCollection.nbHits,
      page: wishlistPage,
    }],
  };
}

async function fetchWishlistItemsFromAlgolia(algoliaUrl, productRequestBody) {
  const response = await postJSON(algoliaUrl, productRequestBody);
  responsesCollection.hits.push(...response.results[0].hits);
  responsesCollection.nbHits += response.results[0].nbHits;
}

async function buildWishlist(replaceProducts = true) {
  const wishlistItems = await getWishlist();
  if (wishlistItems.items.length === 0) {
    displayEmptyWishlist();
    return;
  }

  // If no hits, it means this is the first request and need to fetch products from Algolia
  if (responsesCollection.nbHits === 0) {
    const algoliaUrl = buildAlgoliaIndexUrl(wishlistConfig);

    // Build and run chunked queries
    const promises = [];
    for (let i = 0; i < wishlistItems.items.length; i += MAX_ITEMS_IN_CHUNK) {
      const wishlistQuery = wishlistItems.items.slice(i, i + MAX_ITEMS_IN_CHUNK).map((item) => item.sku).join(' OR ');
      const productRequestBody = {
        requests: [{
          indexName: wishlistConfig['algolia-search-index'],
          params: `query=${wishlistQuery}&attributesToRetrieve=${attributesToRetrieve}&responseFields=${responseFields}&hitsPerPage=${MAX_ITEMS_IN_CHUNK}`,
        }, { indexName: wishlistConfig['algolia-search-index'] }],
      };

      promises.push(fetchWishlistItemsFromAlgolia(algoliaUrl, productRequestBody));
    }

    await Promise.all(promises);

    if (wishlistItems.items.length > responsesCollection.nbHits) {
      showProductDoesNotExistMessage();
    }

    // Show sign in/sign up message for guest users
    const token = await getSignInToken();
    if (!token && responsesCollection.nbHits > 0) {
      showHoldOnFavoritesMessage();
    }
  }

  // If after requests there are still no hits, display empty wishlist
  if (responsesCollection.nbHits === 0) {
    displayEmptyWishlist();
    return;
  }

  // Sort the hits based on the order of the wishlist items
  responsesCollection.hits.sort((a, b) => {
    const indexA = wishlistItems.items.findIndex((item) => item.sku === b.sku);
    const indexB = wishlistItems.items.findIndex((item) => item.sku === a.sku);
    return indexA - indexB;
  });

  const response = getWishlistItemsForPage();
  buildHits(response, replaceProducts, true, wishlistConfig, placeholders);
  if (!document.querySelector('.products-pager-container')) {
    const block = document.querySelector('.wishlist.block');
    const loadMoreContainer = buildLoadMoreContainer(placeholders.plpLoadMoreProducts);
    loadMoreContainer.querySelector('.pager-button').addEventListener('click', async () => {
      wishlistPage += 1;
      await buildWishlist(false);
      updatePageLoader(response, placeholders, 'loadMore');
    });
    block.appendChild(loadMoreContainer);
  }

  // Observer used to wait for a blocking function in buildHits
  const observer = new MutationObserver((mutationsList, obs) => {
    if (mutationsList[0]?.type === 'childList') {
      addWishlistButtons();
      obs.disconnect();
    }
  });
  const targetNode = document.querySelector('.products-container');
  const config = {
    childList: true,
  };
  observer.observe(targetNode, config);
}

export default async function decorate(block) {
  // Get config values
  placeholders = await fetchPlaceholdersForLocale();
  wishlistConfig = await getProductListingConfig();
  const columnSetting = getColumnsClass(block);

  // Create products container
  const productsContainer = document.createElement('div');
  productsContainer.classList.add('products-container');
  productsContainer.classList.add(columnSetting);
  block.appendChild(productsContainer);

  // Build wishlist cards
  buildWishlist();
  document.querySelector('main').addEventListener('addtobag-updated', async (event) => {
    await renderAddToBagDialog(event);
    const { detail: { product } } = event;
    const addToWishlistButton = document.querySelector('.dropin-button-bar button.add-to-favorite');
    if (addToWishlistButton.classList.contains('in-wishlist')) {
      const productContainer = document.querySelector(`[data-sku="${product.sku}"]`);
      productContainer.remove();
      addToWishlistButton.click();
      const thisProductsContainer = document.querySelector('.products-container');
      if (thisProductsContainer.children.length === 0) {
        thisProductsContainer.remove();
        displayEmptyWishlist();
      }
    }
    await closeModal('wishlist-product-overview');
  });
}
