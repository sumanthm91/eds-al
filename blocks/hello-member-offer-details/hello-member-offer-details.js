import {
  fetchPlaceholdersForLocale, createModal, openModal, showToastNotification,
  getLocale, formatDate,
} from '../../scripts/scripts.js';
import { qrcode } from '../../scripts/render.qrcode.js';
import {
  applyOfferToCart, getHelloMemberCouponDetails, getHelloMemberOfferDetails, applyVoucherToCart,
} from '../../scripts/hellomember/api.js';
import { store } from '../../scripts/minicart/api.js';
import { showPageErrorMessage } from '../../scripts/forms.js';
import { decorateIcons } from '../../scripts/aem.js';
import { getCart } from '../../scripts/minicart/cart.js';

function isOfferApplied(offer) {
  const offerCode = offer.code;
  const cart = store.getCart();
  const extensionAttributes = cart?.cart?.extension_attributes || {};

  const isVoucher = offer?.promotion_type === 'voucher';
  if (isVoucher) {
    return extensionAttributes.applied_hm_voucher_codes?.includes(offerCode);
  }

  const isOffer = offer?.promotion_type === 'offer';
  if (isOffer) {
    return extensionAttributes.applied_hm_offer_code === offerCode;
  }

  return false;
}

async function applyOffer(offer, isCouponType) {
  if (isCouponType) {
    return applyVoucherToCart(offer.code);
  }

  return applyOfferToCart(offer.code, offer.type);
}

async function displayDetails(item, block, isCouponType, placeholders) {
  if (!item) {
    if (isCouponType) {
      showPageErrorMessage(placeholders.helloMemberCouponNotFound || 'Coupon not found.');
    } else {
      showPageErrorMessage(placeholders.helloMemberOfferNotFound || 'Offer not found.');
    }
    return;
  }

  const locale = await getLocale();
  const {
    redeemInStoreButtonLabel,
    memberidTextPlaceholder,
    hellomemberModalTitleQrCode,
    addToBagButtonLabel,
    emptyCartButtonLabel,
    helloMemberOfferAddedToBagButtonLabel,
    helloMemberOfferAddedToBagMsg,
    hellomemberAddedToBagNotification,
    helloMemberOfferNotApplicable,
    helloMemberExpiryDateNone,
    enterNowButtonLabel,
    learnMoreButtonLabel,
    shopNowButtonLabel,
    bookNowButtonLabel,
    redeemNowButtonLabel,
    helloMemberExpiresOn,
    helloMemberExpiredOn,
    benefitMemberidTextPlaceholder,
  } = placeholders;

  const detailsContainer = document.createElement('div');
  detailsContainer.classList.add('offer-details-container');

  const image = document.createElement('img');
  image.src = item.large_image;
  image.classList.add('large-image');
  image.alt = item.description || item.name;
  detailsContainer.appendChild(image);

  const categoryName = document.createElement('div');
  categoryName.textContent = item.category_name;
  categoryName.classList.add('category-name');
  detailsContainer.appendChild(categoryName);

  const description = document.createElement('div');
  description.textContent = item.description;
  description.classList.add('detailed-description-title');
  detailsContainer.appendChild(description);

  if (item.end_date || item.expiry_date) {
    const expiringText = helloMemberExpiresOn || 'Expires on {{date}}';
    const expiredText = helloMemberExpiredOn || 'Expired on {{date}}';

    const expiryDate = document.createElement('p');
    expiryDate.classList.add('expired-detailed');
    let expiryMessage = '';
    if (item.end_date || item.expiry_date) {
      const endDate = new Date(item.end_date || item.expiry_date);
      const today = new Date();
      const formattedDate = formatDate(endDate, locale);
      if (endDate < today) {
        expiryMessage = expiredText.replace('{{date}}', formattedDate);
        expiryDate.classList.add('expired');
      } else {
        expiryMessage = expiringText.replace('{{date}}', formattedDate);
      }
    } else {
      expiryMessage = helloMemberExpiryDateNone || '';
    }
    if (expiryMessage) {
      expiryDate.textContent = expiryMessage;
      detailsContainer.appendChild(expiryDate);
    }
  }

  const tags = item.tag ? item.tag.split(',') : [];

  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('button-container');

  if (tags.includes('S') || tags.includes('O')) {
    const redeemButton = document.createElement('button');
    redeemButton.classList.add('redeem-button', 'secondary');
    redeemButton.textContent = redeemInStoreButtonLabel || 'Redeem in Store';

    redeemButton.addEventListener('click', async () => {
      const modalContent = document.createElement('div');
      modalContent.classList.add('member-qr-content');

      // Member QR Code Container
      const memberIdContainer = document.createElement('div');
      memberIdContainer.classList.add('member-id-container');

      const memberIDText = document.createElement('p');
      memberIDText.textContent = memberidTextPlaceholder || 'Your Member ID';
      memberIDText.classList.add('modal-member-id-text');
      memberIdContainer.appendChild(memberIDText);

      const memberQRCode = document.createElement('div');
      memberQRCode.id = 'member-qrcode';
      memberQRCode.classList.add('modal-qrcode-benefit');
      memberIdContainer.appendChild(memberQRCode);

      const benefitMemberID = document.createElement('p');
      benefitMemberID.textContent = `${item.member_identifier || ''}`;
      benefitMemberID.classList.add('modal-member-id-text');
      memberIdContainer.appendChild(benefitMemberID);

      modalContent.appendChild(memberIdContainer);

      // Offer and Coupons QR Code Container
      const offerCouponContainer = document.createElement('div');
      offerCouponContainer.classList.add('offer-container');

      const benefitIDText = document.createElement('p');
      benefitIDText.textContent = benefitMemberidTextPlaceholder || 'Benefit';
      benefitIDText.classList.add('modal-member-id-text');
      offerCouponContainer.appendChild(benefitIDText);

      const offerQRCode = document.createElement('div');
      offerQRCode.id = 'offer-qrcode';
      offerQRCode.classList.add('modal-qrcode');
      offerCouponContainer.appendChild(offerQRCode);

      const benefitQrId = document.createElement('p');
      const isCoupon = item.type === 'coupon';
      if (isCoupon) {
        benefitQrId.textContent = item.category_name && item.code ? `${item.category_name} | ${item.code}` : '';
      } else {
        benefitQrId.textContent = item.code ? `${item.code}` : '';
      }
      benefitQrId.classList.add('modal-offer-code');
      offerCouponContainer.appendChild(benefitQrId);

      modalContent.appendChild(offerCouponContainer);

      await createModal('member-id-modal', hellomemberModalTitleQrCode || 'QR Code', modalContent.outerHTML);
      const modalElement = document.getElementById('member-id-modal');
      modalElement.classList.add('member-id-modal');

      const memberData = { apc_identifier_number: 'member_id' };
      qrcode(document.getElementById('member-qrcode'), memberData.apc_identifier_number);

      qrcode(document.getElementById('offer-qrcode'), item.code || '');

      openModal('member-id-modal');
    });
    buttonContainer.appendChild(redeemButton);
  }

  if (tags.includes('E') || tags.includes('O')) {
    const addToCartButton = document.createElement('button');
    addToCartButton.classList.add('add-to-cart-button');
    const cartHasItems = store.getCart()?.cart?.items_qty > 0;
    const itemApplicable = true;
    const offerApplied = isOfferApplied(item);
    if (!cartHasItems) {
      addToCartButton.disabled = true;
      addToCartButton.textContent = emptyCartButtonLabel || 'Your Cart is Empty';
    } else if (itemApplicable && !offerApplied) {
      addToCartButton.disabled = false;
      addToCartButton.textContent = addToBagButtonLabel || 'Add to Bag';
    } else if (offerApplied) {
      addToCartButton.disabled = true;
      addToCartButton.textContent = helloMemberOfferAddedToBagButtonLabel || 'This offer has been added to your bag';
    }
    const itemNotApplicableMessage = helloMemberOfferNotApplicable || 'This item is not applicable on current items in the shopping bag';
    addToCartButton.addEventListener('click', async () => {
      if (itemApplicable) {
        addToCartButton.classList.add('loader');
        const res = await applyOffer(item, isCouponType);

        if (res.success) {
          item.codeApplied = true;
          addToCartButton.disabled = true;
          addToCartButton.textContent = helloMemberOfferAddedToBagMsg || 'This offer has been added to your bag';
          const toastMessage = `${hellomemberAddedToBagNotification || 'Added to your bag'} ${item.description || ''}`;
          showToastNotification(toastMessage);
        } else {
          showPageErrorMessage(res.message);
        }
        addToCartButton.classList.remove('loader');
        addToCartButton.disabled = true;
      } else {
        showPageErrorMessage(itemNotApplicableMessage);
      }
    });
    buttonContainer.appendChild(addToCartButton);
  }

  if (tags.includes('C') || tags.includes('I') || tags.includes('ER') || tags.includes('ES') || tags.includes('EB')) {
    const url = item.benefit_url;

    if (tags.includes('C') && item.benefit_url) {
      const enterNowButton = document.createElement('a');
      enterNowButton.classList.add('button', 'primary', 'enter-now-button');
      enterNowButton.textContent = enterNowButtonLabel || 'Enter Now';
      enterNowButton.href = url;
      buttonContainer.appendChild(enterNowButton);
    }

    if (tags.includes('I') && item.benefit_url) {
      const learnMoreButton = document.createElement('a');
      learnMoreButton.classList.add('button', 'primary', 'learn-more-button');
      learnMoreButton.textContent = learnMoreButtonLabel || 'Learn More';
      learnMoreButton.href = url;
      buttonContainer.appendChild(learnMoreButton);
    }

    if (tags.includes('ER') && item.benefit_url) {
      const redeemNowButton = document.createElement('a');
      redeemNowButton.classList.add('button', 'primary', 'redeem-now-button');
      redeemNowButton.textContent = redeemNowButtonLabel || 'Redeem Now';
      redeemNowButton.href = url;
      buttonContainer.appendChild(redeemNowButton);
    }

    if (tags.includes('ES') && item.benefit_url) {
      const shopNowButton = document.createElement('a');
      shopNowButton.classList.add('button', 'primary', 'shop-now-button');
      shopNowButton.textContent = shopNowButtonLabel || 'Shop Now';
      shopNowButton.href = url;
      buttonContainer.appendChild(shopNowButton);
    }

    if (tags.includes('EB') && item.benefit_url) {
      const bookNowButton = document.createElement('a');
      bookNowButton.classList.add('button', 'primary', 'book-now-button');
      bookNowButton.textContent = bookNowButtonLabel || 'Book Now';
      bookNowButton.href = url;
      buttonContainer.appendChild(bookNowButton);
    }
  }

  detailsContainer.appendChild(buttonContainer);

  const conditionsWrapper = document.createElement('div');
  conditionsWrapper.classList.add('conditions-wrapper');

  const appliedConditions = document.createElement('div');
  appliedConditions.classList.add('applied-conditions');
  appliedConditions.innerHTML = item.applied_conditions || '';
  conditionsWrapper.appendChild(appliedConditions);
  detailsContainer.appendChild(conditionsWrapper);

  // Expiry Date after the description
  if (item.end_date || item.expiry_date) {
    const expiringText = placeholders.helloMemberExpiresOnLast || 'EXPIRES ON:';
    const expiredText = placeholders.helloMemberExpiredOnLast || 'EXPIRED ON:';

    const expiryContent = document.createElement('div');
    expiryContent.classList.add('expiry-content');

    const expiryLabel = document.createElement('div');
    expiryLabel.classList.add('expiry-label-last');

    const expiryDateDiv = document.createElement('div');
    expiryDateDiv.classList.add('expiry-date-last');

    if (item.end_date || item.expiry_date) {
      const endDate = new Date(item.end_date || item.expiry_date);
      const today = new Date();
      const formattedDate = formatDate(endDate, locale);

      if (endDate < today) {
        expiryLabel.textContent = expiredText;
        expiryDateDiv.classList.add('expired');
      } else {
        expiryLabel.textContent = expiringText;
      }

      expiryDateDiv.textContent = formattedDate;
    } else {
      expiryLabel.textContent = helloMemberExpiryDateNone || '';
    }

    if (expiryLabel.textContent) {
      expiryContent.appendChild(expiryLabel);
      expiryContent.appendChild(expiryDateDiv);
      detailsContainer.appendChild(expiryContent);
    }
  }
  block.innerHTML = '';
  block.appendChild(detailsContainer);
}

export default async function decorate(block) {
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  const offerId = urlParams.get('offerId');
  const couponId = urlParams.get('couponId');

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

  const placeholders = await fetchPlaceholdersForLocale();
  await getCart();

  const {
    helloMemberOfferNotFound,
    helloMemberCouponNotFound,
    helloMemberInvalidRequest,
    helloMemberUnexpectedError,
  } = placeholders;

  try {
    if (offerId) {
      getHelloMemberOfferDetails(offerId).then(async (offer) => {
        block.classList.remove('loading');
        if (!offer.success) {
          showPageErrorMessage(helloMemberOfferNotFound || 'Offer not found.');
        } else if (offer?.data?.offers?.length === 0) {
          showPageErrorMessage(helloMemberOfferNotFound || 'Offer not found.');
        } else {
          displayDetails(offer?.data?.offers[0], block, false, placeholders);
        }
      });
    } else if (couponId) {
      getHelloMemberCouponDetails(couponId).then(async (coupon) => {
        block.classList.remove('loading');
        if (!coupon.success) {
          showPageErrorMessage(helloMemberOfferNotFound || 'Offer not found.');
        } else if (coupon?.data?.coupons?.length === 0) {
          showPageErrorMessage(helloMemberCouponNotFound || 'Coupon not found.');
        } else {
          displayDetails(coupon?.data?.coupons[0], block, true, placeholders);
        }
      });
    } else {
      showPageErrorMessage(helloMemberInvalidRequest || 'Invalid request.');
      block.classList.remove('loading');
    }
  } catch (error) {
    showPageErrorMessage(helloMemberUnexpectedError || 'An Unexpected error  occured');
    block.classList.remove('loading');
  }
}
