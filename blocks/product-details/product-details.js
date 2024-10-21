/* eslint-disable import/no-unresolved */
/* eslint-disable import/no-extraneous-dependencies */
// Dropin Tools
import { initializers } from '@dropins/tools/initializer.js';
// Dropin APIs
import * as pdpApi from '@dropins/storefront-pdp/api.js';

// Dropin Providers
import { render as productRenderer } from '@dropins/storefront-pdp/render.js';

// Dropin Containers
import ProductDetails from '@dropins/storefront-pdp/containers/ProductDetails.js';

// Dropin Slots
import infoContentSlot from './slots/info-content.js';
import actionsSlot from './slots/actions.js';
import optionsSlot from './slots/options.js';
import productStatusSlot from './slots/product-status.js';
import descriptionSlot from './slots/description.js';
import { getConfigValue } from '../../scripts/configs.js';
import { setJsonLd } from '../../scripts/commerce.js';
import {
  loadFragment,
  fetchPlaceholdersForLocale,
  setMetaAttribute,
  fireTargetCall,
  getLanguageAttr,
  showCommerceErrorPage,
  getVisitorEligibility,
  getRedirectUrl,
} from '../../scripts/scripts.js';
import {
  datalayerViewItemEvent,
  sendCategoriesToDataLayer,
} from '../../scripts/analytics/google-data-layer.js';
import { pdpLoadData } from '../../scripts/target-events.js';
import renderAddToBagDialog from '../added-to-bag/added-to-bag.js';
import { decorateBnpl } from './slots/bnpl.js';

const imgUrlMap = {};
const lang = getLanguageAttr();
export async function isVatIncludedDisplayed() {
  return getConfigValue('commerce-show-vat-included').then((value) => value?.toLocaleLowerCase() === 'true');
}

async function getCountryCode() {
  return getConfigValue('country-code').then((value) => value || 'AE');
}

export async function getLocale() {
  const countryCode = await getCountryCode();
  return `${(document.documentElement.lang || 'en').toLowerCase()}_${countryCode.toUpperCase()}`;
}

async function getAttributesToShow() {
  const displayAttributes = await getConfigValue('pdp-display-attributes');
  const attributesToShow = displayAttributes ? displayAttributes.split(',') : [];
  return attributesToShow;
}

async function isRatingEnabled() {
  const bvRatingEnabled = await getConfigValue('pdp-rating-enabled');
  return bvRatingEnabled === 'true';
}

async function setJsonLdProduct(data) {
  const {
    inStock, name, description, sku, images, prices: { final },
  } = data;
  const brand = await getConfigValue('ga-graph-org-name');

  const jsonLd = {
    '@context': 'http://schema.org',
    '@type': 'Product',
    name,
    description,
    brand: {
      '@type': 'Brand',
      name: brand,
    },
    sku,
    image: images?.map((img) => img.url),
    offers: {
      '@type': 'http://schema.org/Offer',
      price: final.amount,
      priceCurrency: final.currency,
      availability: inStock ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock',
    },
  };
  setJsonLd(jsonLd, 'product');
}

function decorateMetadata(product, placeholders) {
  const titleSuffix = placeholders.pageTitleSuffix || '';
  // set meta
  const pageTitle = product.name.toLowerCase().split(' ')
    .map((s) => s.charAt(0).toUpperCase() + s.substring(1)).join(' ');
  const description = product.metaDescription || new DOMParser().parseFromString(product.shortDescription, 'text/html').documentElement.innerText;
  const metaTitle = document.querySelector('title');
  if (lang === 'ar') {
    metaTitle.innerText = titleSuffix ? `${titleSuffix} | ${pageTitle}` : pageTitle;
  } else {
    metaTitle.innerText = titleSuffix ? `${pageTitle} | ${titleSuffix}` : pageTitle;
  }
  const metaOgTitle = setMetaAttribute('og:title', product.metaTitle || pageTitle, metaTitle, true);
  const metaOgDescription = setMetaAttribute('og:description', description, metaOgTitle, true);
  const metaTwitterTitle = setMetaAttribute('twitter:title', product.metaTitle || pageTitle, metaOgDescription);
  const metaDescription = setMetaAttribute('description', description, metaTitle);
  if (product.metaKeywords) {
    setMetaAttribute('keywords', product.metaKeywords, metaDescription);
  }
  setMetaAttribute('twitter:description', description, metaTwitterTitle);
}

function formatPDPUrlAttributes(url, src = 'main') {
  const placeholders = fetchPlaceholdersForLocale();
  const heightDimension = (src === 'main') ? placeholders.productZoomMedium || 630 : placeholders.productZoomLarge || 800;
  let formatUrl = url.replace(/width=\d+&?/g, '').replace(/height=\d+&?/g, '').replace('/original/', '/');
  formatUrl = formatUrl.includes('?') ? `${formatUrl}&height=${heightDimension}` : `${formatUrl}?height=${heightDimension}`;
  return formatUrl;
}

/**
 * Fetches Personalization & Recommendations content from target
 */
async function addTargetContent(product) {
  const [targetPayload, dynamicContentFragment] = await Promise.all([
    pdpLoadData(product),
    loadFragment(
      `/${lang}/fragments/pdp/personalization-and-recommendations`,
    ),
  ]);
  const additionalDecisionScope = [];
  const dropinsContainer = document.querySelector('.section.product-details-container');
  if (dropinsContainer?.dataset.sectionStatus !== 'loaded') {
    dynamicContentFragment.classList.add('hidden');
    const observer = new MutationObserver((mutationList) => {
      mutationList.forEach((mutation) => {
        if (mutation.type === 'attributes'
          && mutation.attributeName === 'data-section-status'
          && dropinsContainer.attributes.getNamedItem('data-section-status').value === 'loaded') {
          dynamicContentFragment.classList.remove('hidden');
          observer.disconnect();
        }
      });
    });
    observer.observe(dropinsContainer, { attributes: true });
  }
  document.querySelector('main').append(dynamicContentFragment);
  await fireTargetCall(targetPayload, additionalDecisionScope.filter((el) => el));
}

async function toggleProductQuantityDisplay() {
  const showQuantitySelector = await getConfigValue('pdp-show-quantity-selector');
  const isProductQuantityEnabled = showQuantitySelector === 'true';
  const quantityElement = document.querySelector('.pdp-product__quantity');
  const optionsElement = document.querySelector('.pdp-product__options');
  const actionsElement = document.querySelector('.pdp-product__buttons');
  const swatchElement = document.querySelector('.pdp-swatches');
  quantityElement.classList.toggle('pdp-product__quantity--hidden', !isProductQuantityEnabled);
  optionsElement.classList.toggle('modified-flex', !isProductQuantityEnabled);
  actionsElement.classList.toggle('modified-flex', !isProductQuantityEnabled);
  swatchElement.classList.toggle('modified-flex', !isProductQuantityEnabled);
}

export async function initializeProduct(product, locale) {
  // Set Fetch Endpoint (Service)
  pdpApi.setEndpoint(await getConfigValue('commerce-saas-endpoint'));

  // Set Fetch Headers (Service)
  pdpApi.setFetchGraphQlHeaders({
    'Content-Type': 'application/json',
    'Magento-Environment-Id': await getConfigValue('commerce-environment-id'),
    'Magento-Website-Code': await getConfigValue('commerce-website-code'),
    'Magento-Store-View-Code': await getConfigValue('commerce-store-view-code'),
    'Magento-Store-Code': await getConfigValue('commerce-store-code'),
    'Magento-Customer-Group': await getConfigValue('commerce-customer-group'),
    'x-api-key': await getConfigValue('commerce-x-api-key'),
  });

  // Initialize Dropins
  initializers.register(pdpApi.initialize, {
    defaultLocale: locale,
    models: {
      ProductDetails: {
        initialData: product,
        transform: (data) => {
          const pdpAssetsAttr = product.attributes.find((a) => a.name === 'assets_pdp');
          if (pdpAssetsAttr) {
            const pdpAssetsJson = JSON.parse(pdpAssetsAttr.value);
            data.images = pdpAssetsJson.map((img, i) => {
              const imagesData = {
                url: formatPDPUrlAttributes(img.url),
                zoomUrl: formatPDPUrlAttributes(img.url, 'zoom'),
                label: `Product image ${i + 1} of ${pdpAssetsJson?.length ?? 0} for product "${product.name}"`,
                width: 500,
                height: 500,
              };
              imgUrlMap[imagesData.url] = imagesData.zoomUrl;
              return imagesData;
            });
          }

          const promotions = product.attributes.find((a) => a.name === 'promotions');
          if (promotions) {
            data.promotions = JSON.parse(promotions.value);
          }
          setJsonLdProduct(data);
          const gtm = product?.attributes?.find((el) => el.name === 'gtm_attributes')?.value;
          data.gtmAttributes = gtm ? JSON.parse(gtm) : null;
          return data;
        },
      },
    },
  });

  initializers.mount();
}

function getCurrencyFormatter(currencyCode, countryCode, decimalDigits) {
  const currency = currencyCode || '';

  return new Intl.NumberFormat(`${document.documentElement.lang || 'en'}-${countryCode}`, {
    style: 'currency',
    currency,
    minimumFractionDigits: parseInt(decimalDigits, 10) || 2,
    maximumFractionDigits: parseInt(decimalDigits, 10) || 2,
  });
}

function formatPrice(currency, price, countryCode, decimalDigits) {
  const currentFormatter = getCurrencyFormatter(currency, countryCode, decimalDigits);

  const newPrice = parseFloat(price);

  return currentFormatter.format(newPrice);
}

export function renderSpecialPrice(ctx, placeholders, decimalDigits, countryCode) {
  const special = ctx.data.prices.special || ctx.data.prices.final;

  const { maximumAmount, minimumAmount, amount } = special;
  let maxPrice;
  let minPrice;
  let price;

  const minimumFractionDigits = (decimalDigits);
  const maximumFractionDigits = (decimalDigits);

  if (maximumAmount && minimumAmount) {
    maxPrice = formatPrice(special.currency, maximumAmount, countryCode, maximumFractionDigits);
    minPrice = formatPrice(special.currency, minimumAmount, countryCode, minimumFractionDigits);
  } else {
    price = formatPrice(special.currency, amount, countryCode, decimalDigits);
  }
  const specialPriceHtml = document.createElement('div');
  specialPriceHtml.classList.add('pdp-price-range');
  specialPriceHtml.setAttribute('itemprop', 'offers');
  specialPriceHtml.setAttribute('itemscope', '');
  specialPriceHtml.setAttribute('itemtype', 'http://schema.org/Offer');

  const specialPriceMin = document.createElement('span');
  specialPriceMin.classList.add('dropin-price', 'dropin-price--default', 'dropin-price--small', 'dropin-price--bold');
  specialPriceMin.setAttribute('itemprop', 'price');
  specialPriceMin.textContent = minPrice;

  const specialPriceHyphen = document.createElement('span');
  specialPriceHyphen.classList.add('pdp-price-range__label');
  specialPriceHyphen.textContent = '-';

  const specialPriceMax = document.createElement('span');
  specialPriceMax.classList.add('dropin-price', 'dropin-price--default', 'dropin-price--small', 'dropin-price--bold');
  specialPriceMax.setAttribute('itemprop', 'price');
  specialPriceMax.textContent = maxPrice;

  const specialPriceSpan = document.createElement('span');
  specialPriceSpan.classList.add('dropin-price', 'dropin-price--default', 'dropin-price--small', 'dropin-price--bold');
  specialPriceSpan.setAttribute('itemprop', 'price');
  specialPriceSpan.textContent = price;

  if (maximumAmount && minimumAmount) {
    specialPriceHtml.appendChild(specialPriceMin);
    specialPriceHtml.appendChild(specialPriceHyphen);
    specialPriceHtml.appendChild(specialPriceMax);
  } else {
    specialPriceHtml.appendChild(specialPriceSpan);
  }

  ctx.replaceWith(specialPriceHtml);

  if (isVatIncludedDisplayed()
    && (!ctx.data.prices.regular || ctx.data.prices.regular.variant === 'default')) {
    const includingVat = document.createElement('div');
    includingVat.classList.add('pdp-product__price--including-vat');
    includingVat.textContent = placeholders.priceIncludingVat || 'Inc. VAT';
    ctx.appendChild(includingVat);
    // KW has no VAT
  }

  ctx.onChange((next) => {
    const newSpecial = next.data.prices.special || next.data.prices.final;
    const {
      maximumAmount: newMaximumAmount, minimumAmount: newMinimumAmount, amount: newAmount,
    } = newSpecial;

    if (newSpecial) {
      price = formatPrice(
        newSpecial.currency,
        newAmount,
        countryCode,
        decimalDigits,
      );
      minPrice = formatPrice(
        newSpecial.currency,
        newMinimumAmount,
        countryCode,
        minimumFractionDigits,
      );
      maxPrice = formatPrice(
        newSpecial.currency,
        newMaximumAmount,
        countryCode,
        maximumFractionDigits,
      );

      if (newMaximumAmount && newMinimumAmount) {
        specialPriceMin.textContent = minPrice;
        specialPriceMax.textContent = maxPrice;
        specialPriceHtml.innerHTML = '';
        specialPriceHtml.appendChild(specialPriceMin);
        specialPriceHtml.appendChild(specialPriceHyphen);
        specialPriceHtml.appendChild(specialPriceMax);
      } else {
        specialPriceSpan.textContent = price;
        specialPriceHtml.innerHTML = specialPriceSpan.outerHTML;
      }
    }
  });
}

export function renderRegularPrice(ctx, placeholders, decimalDigits, countryCode) {
  const { regular } = ctx.data.prices;
  const formattedPrice = formatPrice(regular.currency, regular.amount, countryCode, decimalDigits);

  const regularPrice = document.createElement('div');
  regularPrice.classList.add('pdp-price-range');
  regularPrice.setAttribute('itemprop', 'offers');
  regularPrice.setAttribute('itemscope', '');
  regularPrice.setAttribute('itemtype', 'http://schema.org/Offer');

  const regularPriceSpan = document.createElement('span');
  regularPriceSpan.classList.add('dropin-price', 'dropin-price--small', 'dropin-price--bold');
  regularPriceSpan.setAttribute('itemprop', 'price');
  regularPriceSpan.textContent = `${formattedPrice}`;

  regularPrice.appendChild(regularPriceSpan);

  if (regular.variant) {
    regularPriceSpan.classList.add(`dropin-price--${regular.variant}`);
  }

  ctx.replaceWith(regularPrice);

  if (isVatIncludedDisplayed() && ctx.data.prices.regular) {
    const { priceIncludingVat } = placeholders;
    const includingVat = document.createElement('div');
    includingVat.classList.add('pdp-product__price--including-vat');
    includingVat.textContent = priceIncludingVat || 'Inc. VAT';
    ctx.appendChild(includingVat);
    // KW has no VAT
  }
  ctx.onChange((next) => {
    const { regular: newRegular } = next.data.prices;
    const newFormattedPrice = formatPrice(
      newRegular.currency,
      newRegular.amount,
      countryCode,
      decimalDigits,
    );

    regularPriceSpan.textContent = `${newFormattedPrice}`;
  });
}

export function renderPromotions(ctx) {
  ctx.replaceWith(document.createElement('div'));

  const productPromotions = ctx.data.promotions || [];

  const { final, regular } = ctx.data.prices;
  if (final?.amount < regular?.amount) {
    const discount = Math.floor(((regular.amount - final.amount) / regular.amount) * 100);
    productPromotions.unshift({
      label: `-${discount}%`,
    });
  }
  if (productPromotions.length) {
    const promoWithoutLinks = productPromotions.filter((promotion) => !promotion.url);
    const promoWithLinks = productPromotions.filter((promotion) => !!promotion.url);

    const labelsContainer = document.createElement('div');
    labelsContainer.classList.add('pdp-product__promotion-labels-container');
    promoWithoutLinks.forEach((promotion) => {
      const promotionLabel = document.createElement('div');
      promotionLabel.classList.add('promo-label');
      promotionLabel.textContent = promotion.label;
      labelsContainer.appendChild(promotionLabel);
    });
    ctx.prependSibling(labelsContainer);

    if (promoWithLinks.length) {
      const linksContainer = document.createElement('div');
      linksContainer.classList.add('pdp-product__promotion-links-container');
      promoWithLinks.forEach((promotion) => {
        const promotionLabel = document.createElement('div');
        promotionLabel.classList.add('promo-label');
        promotionLabel.innerHTML = `<a href="/${lang}/${promotion.url}" alt="${promotion.description}">${promotion.label}</a>`;
        linksContainer.appendChild(promotionLabel);
      });
      ctx.prependSibling(linksContainer);
    }
  }
}

export default async function decorate($block) {
  const [sku, product] = await window.product;
  if (!product) {
    showCommerceErrorPage();
    return Promise.resolve();
  }
  const amastyLabel = product.attributes?.find((el) => el.name === 'product_labels')?.value;
  const amastyData = amastyLabel && JSON.parse(amastyLabel);

  const decimalDigits = await getConfigValue('cart-price-decimals') || 2;
  const countryCode = await getCountryCode();
  let isVisitorEligible = true;
  const previewPreaccessAttr = product.attributes
    ?.find((el) => el.name === 'preview_preaccess_data')
    ?.value;
  const previewPreaccessData = previewPreaccessAttr ? JSON.parse(previewPreaccessAttr) : null;
  if (previewPreaccessData) {
    const visitorEligibleData = await getVisitorEligibility(
      previewPreaccessData,
      document.documentElement.lang,
    );
    isVisitorEligible = visitorEligibleData.isVisitorEligible;
    if (visitorEligibleData?.type && visitorEligibleData.type === 'preview') {
      if (!visitorEligibleData.isVisitorEligible) {
        const redirectUrl = await getRedirectUrl(
          visitorEligibleData.isVisitorEligible,
          visitorEligibleData.visitorTier,
          document.documentElement.lang,
        );
        window.location.href = redirectUrl;
        return Promise.resolve();
      }
    }
  }

  const locale = await getLocale();
  const placeholders = await fetchPlaceholdersForLocale();

  decorateMetadata(product, placeholders);

  await initializeProduct(product, locale);
  const attributesToShow = await getAttributesToShow();
  const brandLabelExclude = await getConfigValue('pdp-exclude-label');

  const slots = {
    Options: (ctx) => optionsSlot(ctx, $block, placeholders),
    Actions: (ctx) => actionsSlot(ctx, $block, placeholders, isVisitorEligible),
    Title: (ctx) => {
      const schema = document.createElement('div');
      const excludeBrands = brandLabelExclude?.split(',').map((b) => b.trim().toLowerCase());

      const brand = ctx.data.attributes?.find((el) => el.id === 'brand_full_name')?.value;
      if (brand && !excludeBrands?.includes(brand.toLowerCase())) {
        const subtitle = document.createElement('p');
        subtitle.classList.add('pdp-product__subtitle');
        subtitle.textContent = brand;
        schema.appendChild(subtitle);
      }

      const title = document.createElement('h6');
      title.classList.add('pdp-product__title');
      title.textContent = ctx.data.name;

      schema.appendChild(title);
      ctx.replaceWith(schema);
    },
    RegularPrice: (ctx) => {
      renderRegularPrice(ctx, placeholders, decimalDigits, countryCode);
    },
    SpecialPrice: (ctx) => {
      renderSpecialPrice(ctx, placeholders, decimalDigits, countryCode);
    },
    ShortDescription: (ctx) => productStatusSlot(ctx, $block, placeholders),
    Description: (ctx) => descriptionSlot(ctx, $block, placeholders, attributesToShow),
    InfoContent: (ctx) => infoContentSlot(ctx, placeholders),
    Attributes: (ctx) => {
      renderPromotions(ctx);

      const bnplContainer = document.createElement('div');
      bnplContainer.classList.add('pdp-product__bnpl', 'loading', 'pdp-collapsible-container');
      ctx.prependSibling(bnplContainer);
      decorateBnpl(ctx, bnplContainer, placeholders);

      const ratingsContainer = document.createElement('div');
      ratingsContainer.classList.add('pdp-product__ratings', 'loading');
      ctx.prependSibling(ratingsContainer);

      // amasty labels
      const isMobileView = window.matchMedia('(max-width: 1024px)').matches;
      if (amastyLabel?.length > 0 && amastyData.length > 0) {
        const pdpImageBlock = isMobileView ? document.querySelector('.pdp-carousel.pdp-product__images') : document.querySelector('.pdp-gallery-grid.pdp-product__images');
        const amastyBlock = document.createElement('div');
        amastyBlock.classList.add('amastyLabel');
        const amastyImage = document.createElement('img');
        amastyImage.setAttribute('src', amastyData[0]?.image);
        amastyImage.setAttribute('alt', amastyData[0]?.name);
        amastyBlock.appendChild(amastyImage);
        pdpImageBlock.appendChild(amastyBlock);
      }

      window.addEventListener('delayed-loaded', async () => {
        const ratingEnabled = await isRatingEnabled();
        if (ratingEnabled) {
          import('./slots/ratings.js').then(({ decorateRatings }) => {
            decorateRatings(ctx, ratingsContainer, placeholders, locale);
          });
        }

        /**
         * Event listener for PDP image hover
         */
        document.querySelectorAll('.pdp-gallery-grid__item').forEach((item) => {
          item.addEventListener('mousemove', (e) => {
            const rect = e.target.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            e.target.style.transformOrigin = `${x}% ${y}%`;
          });

          // hiding the chat for PDP image viewer overlay
          item.addEventListener('click', () => {
            if (document.querySelector('.pdp-overlay__content')) {
              document.querySelector('.spr-lc-light').style.display = 'none';
            }
            document.querySelector('.pdp-overlay__close-button').addEventListener('click', () => {
              document.querySelector('.spr-lc-light').style.display = 'block';
            });
            document.querySelectorAll('.pdp-overlay__content img').forEach((img) => {
              img.src = imgUrlMap[img.src];
            });
          });
        });
      });
    },
  };
  // Following extraction is done one time to avoid the same in multiple datalayer events
  const gtm = product?.attributes?.find((el) => el.name === 'gtm_attributes')?.value;
  product.gtm = gtm ? JSON.parse(gtm) : null;

  // For cases when user manually opens PDP URL, there would not be any prior list available
  if (document.referrer === '') {
    localStorage.removeItem('categoryListName');
    localStorage.removeItem('categoryListId');
  }
  window.addEventListener('lazy-loaded', async () => {
    sendCategoriesToDataLayer(product?.gtm?.category?.split('/'));
    datalayerViewItemEvent(product);
  }, { once: true });

  try {
    addTargetContent(product);
  } catch (e) {
    console.error(e);
  }
  window.addEventListener('delayed-loaded', () => {
    window.dispatchEvent(new CustomEvent('target-response'));
  });

  /**
    Event listener for add to bad cart update
  */
  document.querySelector('main').addEventListener('addtobag-updated', async (event) => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    await renderAddToBagDialog(event);
  });

  const render = await productRenderer.render(ProductDetails, {
    sku,
    slots,
    carousel: {
      imageParams: {
        width: null,
      },
    },
    hideURLParams: true,
    hideSku: true,
  })($block);

  await toggleProductQuantityDisplay();

  const mobileBreadcrumb = await getConfigValue('pdp-display-breadcrumb-mobile');
  if (mobileBreadcrumb === 'true') {
    document.querySelector('.breadcrumb-wrapper').classList.add('mobile-visible');
  }

  return render;
}
