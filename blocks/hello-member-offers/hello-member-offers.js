import {
  fetchPlaceholdersForLocale,
  getLocale,
  formatDate,
} from '../../scripts/scripts.js';
import { decorateIcons } from '../../scripts/aem.js';
import { getHelloMemberCoupons, getHelloMemberOffers } from '../../scripts/hellomember/api.js';

async function decorateOfferCard(
  item,
  index,
  couponDetailLink,
  cardsContainer,
  placeholders,
  isCoupon = false,
  couponCount = 0,
) {
  const locale = await getLocale();
  const benefitsCard = document.createElement('div');
  benefitsCard.classList.add('benefits-card');
  benefitsCard.dataset.index = index;

  if ((isCoupon && index >= 3) || (!isCoupon && (index + couponCount) >= 3)) {
    benefitsCard.classList.add('hide');
  }

  const imageContainer = document.createElement('div');
  imageContainer.classList.add('image-container');

  const img = document.createElement('img');
  img.src = item.small_image;
  imageContainer.appendChild(img);

  const title = document.createElement('div');
  title.classList.add('category-name');
  title.textContent = item.name || item.category_name;

  const info = document.createElement('div');
  info.classList.add('offer-description');
  info.textContent = item.description;

  benefitsCard.appendChild(imageContainer);
  benefitsCard.appendChild(title);
  benefitsCard.appendChild(info);

  const expiringText = placeholders.helloMemberExpiresOn || 'Expires on {{date}}';
  const expiredText = placeholders.helloMemberExpiredOn || 'Expired on {{date}}';

  if (item.end_date || item.expiry_date) {
    const expiry = document.createElement('div');
    expiry.classList.add('expiry-date');
    expiry.textContent = `${expiringText.replace('{{date}}', formatDate(item.expiry_date || item.end_date, locale))}`;

    if (new Date(item.end_date || item.expiry_date) < new Date()) {
      expiry.textContent = `${expiredText.replace('{{date}}', formatDate(item.expiry_date || item.end_date, locale))}`;
      expiry.classList.add('expired');
    }

    benefitsCard.appendChild(expiry);
  }

  benefitsCard.addEventListener('click', () => {
    if (isCoupon) {
      window.location.href = `${couponDetailLink}?couponId=${item.id}`;
    } else {
      window.location.href = `${couponDetailLink}?offerId=${item.code}`;
    }
  });

  cardsContainer.appendChild(benefitsCard);
}

async function displayOffers(couponDetailLink, block, offers, coupons) {
  const placeholders = await fetchPlaceholdersForLocale();

  const {
    showAllButtonLabel,
    showLessButtonLabel,
  } = placeholders;

  const couponVoucherJsonData = {
    offers: offers?.offers || [],
    coupons: coupons?.coupons || [],
  };

  const combinedItems = [
    ...couponVoucherJsonData.coupons,
    ...couponVoucherJsonData.offers,
  ];

  const benefitsHeading = document.querySelector('.default-content-wrapper > h2');

  if (combinedItems.length === 0) {
    block.classList.add('hide');
    if (benefitsHeading) {
      benefitsHeading.classList.add('benefit-title-hidden');
    }
    return;
  }

  const cardsContainer = document.createElement('div');
  cardsContainer.classList.add('cards-container');

  couponVoucherJsonData.coupons.forEach(async (item, index) => {
    await decorateOfferCard(item, index, couponDetailLink, cardsContainer, placeholders, true);
  });

  const couponCount = couponVoucherJsonData.coupons?.length || 0;

  couponVoucherJsonData.offers.forEach(async (item, index) => {
    await decorateOfferCard(
      item,
      index,
      couponDetailLink,
      cardsContainer,
      placeholders,
      false,
      couponCount,
    );
  });

  block.appendChild(cardsContainer);

  if (combinedItems.length > 3) {
    const toggleButtonWrapper = document.createElement('div');
    toggleButtonWrapper.classList.add('toggle-button-wrapper');

    const toggleButton = document.createElement('button');
    toggleButton.classList.add('secondary');
    toggleButton.textContent = showAllButtonLabel || 'Show All';
    toggleButtonWrapper.appendChild(toggleButton);

    block.appendChild(toggleButtonWrapper);

    let showingAll = false;

    toggleButton.addEventListener('click', () => {
      const cards = cardsContainer.querySelectorAll('.benefits-card');
      if (showingAll) {
        cards?.forEach((card, index) => {
          if (index >= 3) {
            card.classList.add('hide');
          }
        });
        toggleButton.textContent = showAllButtonLabel || 'Show All';
      } else {
        cards?.forEach((card) => {
          card.classList.remove('hide');
        });
        toggleButton.textContent = showLessButtonLabel || 'Show Less';
      }
      showingAll = !showingAll;
    });
  }
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  let couponDetailLink = '';

  if (link) {
    couponDetailLink = link.href;
  }

  block.innerHTML = '';

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

  const couponsPromise = getHelloMemberCoupons();
  const offersPromise = getHelloMemberOffers();

  Promise.all([couponsPromise, offersPromise]).then(async ([coupons, offers]) => {
    block.classList.remove('loading');
    await displayOffers(couponDetailLink, block, offers, coupons);
  });
}
