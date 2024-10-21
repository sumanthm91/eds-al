import {
  isLoggedInUser, fetchPlaceholdersForLocale,
} from '../../scripts/scripts.js';
import { getAuthorReviews, getBVConfig } from '../../scripts/reviews/api.js';
import { getCustomer } from '../../scripts/customer/api.js';
import { createCarousel } from '../carousel/carousel.js';
import { decorateReview, decorateSecondaryRatings } from '../product-details/slots/ratings.js';
import { getConfigValue } from '../../scripts/configs.js';
import { decorateIcons } from '../../scripts/aem.js';
import { performAPIMeshGraphQLQuery, productDetailsBySkuListQuery } from '../../scripts/commerce.js';

async function getCountryCode() {
  return getConfigValue('country-code').then((value) => value || 'AE');
}

async function getLocale() {
  const countryCode = await getCountryCode();
  return `${(document.documentElement.lang || 'en').toLowerCase()}_${countryCode.toUpperCase()}`;
}

function getProductImage(product) {
  const productTeaserImages = product?.attributes.find((attr) => attr.name === 'assets_teaser')?.value;
  if (productTeaserImages) {
    const assets = JSON.parse(productTeaserImages);
    if (assets.length > 0) {
      const { styles: { product_teaser: productTeaser } } = assets[0];

      const productSwatchImg = document.createElement('div');
      productSwatchImg.classList.add('swatch-img');
      const img = document.createElement('img');
      img.setAttribute('src', productTeaser);
      img.alt = product?.name || '';
      productSwatchImg.appendChild(img);

      return productSwatchImg;
    }
  }
  return document.createDocumentFragment();
}

async function decorateProduct(product, block) {
  const productDetails = document.createElement('div');
  productDetails.classList.add('product-details');

  const productSwatchImg = getProductImage(product);
  productDetails.appendChild(productSwatchImg);

  const productTitle = document.createElement('span');
  productTitle.classList.add('product-name');
  productTitle.textContent = product?.name || '';

  productDetails.appendChild(productTitle);

  block.appendChild(productDetails);
}

async function decorateRatingItems(reviews, ratingDetailsWrapper, bvConfig, locale, placeholders) {
  const productSkuList = [];
  reviews.Results?.forEach((review) => {
    if (review.ProductId && !productSkuList.includes(review.ProductId)) {
      productSkuList.push(review.ProductId);
    }
  });

  const { data: { products } } = await performAPIMeshGraphQLQuery(productDetailsBySkuListQuery, {
    sku: productSkuList,
  });

  reviews.Results?.forEach(async (review, i) => {
    const ratingItem = document.createElement('div');
    ratingItem.classList.add('rating-item');

    ratingDetailsWrapper.appendChild(ratingItem);

    const productData = products
      .filter((product) => product.sku === reviews.Results[i].ProductId)?.[0];

    decorateProduct(productData, ratingItem);

    const ratingDetails = document.createElement('div');
    ratingDetails.classList.add('rating-details');
    ratingItem.appendChild(ratingDetails);

    ratingDetails.appendChild(
      await decorateReview(review, bvConfig, (i + 1), locale, placeholders),
    );

    const ratingSecondary = document.createElement('div');
    ratingSecondary.classList.add('rating-secondary');

    ratingDetails.appendChild(ratingSecondary);

    if (reviews.Results[i].SecondaryRatingsOrder && reviews.Results[i].SecondaryRatings) {
      decorateSecondaryRatings(
        reviews.Results[i].SecondaryRatingsOrder,
        reviews.Results[i].SecondaryRatings,
        ratingSecondary,
      );
    } else {
      ratingDetails.appendChild(ratingSecondary);
    }

    decorateIcons(ratingItem);

    const commonStyleConfig = {
      navButtons: true,
      isRTL: document.documentElement.dir === 'rtl',
      defaultStyling: true,
      visibleItems: [
        {
          items: 3,
          condition: () => window.innerWidth < 768,
        },
        {
          items: 5,
        },
      ],
    };
    ratingDetails.querySelectorAll('.carousel.cards')?.forEach((element) => {
      if (!element.querySelector('.carousel-item')) {
        createCarousel(element, null, { ...commonStyleConfig });
      }
    });
  });
}

async function decorateReviewsDetails(reviews, block, customerId, bvConfig) {
  const placeholders = await fetchPlaceholdersForLocale();
  const locale = await getLocale();
  const { ratingLoadMore } = placeholders;

  const wrapper = document.createElement('div');
  wrapper.classList.add('rating-wrapper');

  const ratingDetailsWrapper = document.createElement('div');
  ratingDetailsWrapper.classList.add('rating-details-wrapper');

  wrapper.appendChild(ratingDetailsWrapper);

  await decorateRatingItems(reviews, ratingDetailsWrapper, bvConfig, locale, placeholders);

  const hasMoreReviews = reviews.TotalResults > reviews.Limit;

  if (hasMoreReviews) {
    const loadMore = document.createElement('a');
    loadMore.classList.add('ratings--load-more', 'button', 'secondary');
    loadMore.innerHTML = `
      <span>${ratingLoadMore || 'Load more reviews'}</span>
    `;
    loadMore.href = '#';
    loadMore.dataset.offset = reviews.Offset + reviews.Limit;
    loadMore.addEventListener('click', async (event) => {
      event.preventDefault();
      if (loadMore.classList.contains('loader')) {
        return;
      }
      loadMore.classList.add('loader');
      const { offset } = loadMore.dataset;
      const newReviews = await getAuthorReviews(customerId, null, offset);
      loadMore.dataset.offset = newReviews.Offset + newReviews.Limit;
      await decorateRatingItems(newReviews, ratingDetailsWrapper, bvConfig, locale, placeholders);
      if (newReviews.TotalResults <= (newReviews.Offset + newReviews.Results.length ?? 0)) {
        loadMore.remove();
      }
      loadMore?.classList.remove('loader');
    });
    wrapper.appendChild(loadMore);
  }

  decorateIcons(ratingDetailsWrapper);
  block.classList.remove(...['loading', 'hide']);

  block.innerHTML = '';

  block.appendChild(wrapper);
}

export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';
  block.querySelector('div').classList.add('hide');

  const redirectUrl = `/${lang}/user/login`;
  if (!isLoggedInUser()) {
    window.location.href = redirectUrl;
    return;
  }

  block.classList.add('loading-parent', 'loading');

  const loadingBlock = document.createElement('div');
  loadingBlock.classList.add('loading-block');
  loadingBlock.innerHTML = `
      <div class="loading-spinner">
        <span class="icon icon-ic-loader"></span>
      </div>
    `;
  decorateIcons(loadingBlock);
  block.appendChild(loadingBlock);

  const customer = await getCustomer(true);

  const reviewsPromise = getAuthorReviews(customer.id);
  const bvConfigPromise = getBVConfig();

  Promise.all([reviewsPromise, bvConfigPromise]).then(([reviews, bvConfig]) => {
    if (reviews?.TotalResults === 0) {
      block.classList.remove('loading');
      block.querySelector('div').classList.remove('hide');
      return;
    }

    decorateReviewsDetails(reviews, block, customer.id, bvConfig);
  });
}
