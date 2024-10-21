/* eslint-disable max-len */
import { decorateIcons, loadCSS } from '../../../scripts/aem.js';
import {
  getBVConfig, getReviews, getStoredReviewFeedbacks, postReviewHelpful, reportReview,
  getStoredMyReview, getAuthorReviews, googleTranslate,
  clearStoredReview,
} from '../../../scripts/reviews/api.js';
import {
  createModalFromContent, openModal, isLoggedInUser, formatDate, getLanguageAttr, closeModal,
} from '../../../scripts/scripts.js';
import { createCarousel } from '../../carousel/carousel.js';
import { getCustomer } from '../../../scripts/customer/api.js';
import { setJsonLd } from '../../../scripts/commerce.js';

export function starRating(averageRating) {
  const starRatingDiv = document.createElement('div');
  starRatingDiv.classList.add('pdp-product__ratings--stars');
  for (let i = 0; i < 5;) {
    const star = document.createElement('span');
    let iconClass;
    if (averageRating >= i + 1) {
      iconClass = 'icon-rating-star-filled';
    } else if (averageRating > i) {
      iconClass = (averageRating % 1 > 0.5) ? 'icon-rating-star-filled' : 'icon-rating-star-half-filled';
    } else {
      iconClass = 'icon-rating-star';
    }
    star.classList.add('icon', iconClass, `rating-${i + 1}`);
    starRatingDiv.appendChild(star);
    i += 1;
  }

  return starRatingDiv;
}

function createPicture(
  photo,
  eager = false,
  breakpoints = [{ type: 'large', media: '(min-width: 600px)', width: '2000' }, { type: 'normal', width: '750' }],
) {
  const picture = document.createElement('picture');

  // webp
  breakpoints.forEach((br) => {
    const source = document.createElement('source');
    if (br.media) source.setAttribute('media', br.media);
    source.setAttribute('type', 'image/jpeg');
    source.setAttribute('srcset', `${photo.Sizes?.[br.type]?.Url}`);
    picture.appendChild(source);
  });

  // fallback
  breakpoints.forEach((br, i) => {
    if (i < breakpoints.length - 1) {
      const source = document.createElement('source');
      if (br.media) source.setAttribute('media', br.media);
      source.setAttribute('srcset', `${photo.Sizes?.[br.type]?.Url}`);
      picture.appendChild(source);
    } else {
      const img = document.createElement('img');
      img.setAttribute('loading', eager ? 'eager' : 'lazy');
      img.setAttribute('alt', photo.Caption ? photo.Caption : '');
      picture.appendChild(img);
      img.setAttribute('src', `${photo.Sizes?.normal?.Url}`);
    }
  });

  return picture;
}

function decorateSyndicatedReview(reviewInfo, placeholders, ratingDetails) {
  // Handle the syndicated review
  if (reviewInfo.IsSyndicated) {
    const reviewSyndicated = document.createElement('div');
    reviewSyndicated.classList.add('review-syndicated');

    const syndicatedIcon = document.createElement('span');
    syndicatedIcon.classList.add('icon-syndicated');
    const img = document.createElement('img');
    img.src = reviewInfo.SyndicationSource?.LogoImageUrl;
    img.loading = 'lazy';
    syndicatedIcon.append(img);
    reviewSyndicated.appendChild(syndicatedIcon);

    const reviewSyndicatedSourceText = document.createElement('span');
    reviewSyndicatedSourceText.classList.add('text-syndicated');
    const syndicatedText = placeholders.syndicatedText || 'Originally posted on {{source}} ';
    reviewSyndicatedSourceText.textContent = syndicatedText.replace('{{source}}', reviewInfo.SyndicationSource?.Name || '');

    reviewSyndicated.appendChild(reviewSyndicatedSourceText);

    ratingDetails.appendChild(reviewSyndicated);
  }
}

function decorateHelpfulButtons(reviewInfo, placeholders, ratingDetails) {
  const {
    TotalNegativeFeedbackCount, TotalPositiveFeedbackCount,
  } = reviewInfo;

  const {
    ratingHelpfulYes, ratingHelpfulNo,
    ratingHelpfulQuestion, ratingReport, ratingReported,
  } = placeholders;

  const storedReview = getStoredReviewFeedbacks();
  const feedback = storedReview?.filter((review) => review.reviewId === reviewInfo.Id)?.[0];

  const helpfulWrapper = document.createElement('div');
  helpfulWrapper.classList.add('pdp-product__ratings--helpful');

  const helpfulText = document.createElement('span');
  helpfulText.classList.add('pdp-product__ratings--helpful-text');
  helpfulText.textContent = ratingHelpfulQuestion || 'Was this review helpful?';
  helpfulWrapper.appendChild(helpfulText);

  const helpfulButtons = document.createElement('div');
  helpfulButtons.classList.add('pdp-product__ratings--helpful-buttons');

  const helpfulYes = document.createElement('a');
  helpfulYes.href = '#';
  helpfulYes.setAttribute('aria-label', ratingHelpfulYes || 'Yes');
  helpfulYes.dataset.reviewId = reviewInfo.Id;
  helpfulYes.classList.add('pdp-product__ratings--helpful-yes');

  const helpfulYesText = document.createElement('span');
  helpfulYesText.classList.add('pdp-product__ratings--helpful-yes-text');
  helpfulYesText.textContent = ratingHelpfulYes || 'Yes';

  helpfulYes.appendChild(helpfulYesText);

  const helpfulYesCount = document.createElement('span');
  helpfulYesCount.classList.add('pdp-product__ratings--helpful-yes-count');
  helpfulYesCount.dataset.value = TotalPositiveFeedbackCount;
  helpfulYesCount.textContent = `(${TotalPositiveFeedbackCount + (feedback?.positiveCount || 0)})`;
  helpfulYes.appendChild(helpfulYesCount);

  const helpfulNo = document.createElement('a');
  helpfulNo.href = '#';
  helpfulNo.setAttribute('aria-label', ratingHelpfulNo || 'No');
  helpfulNo.dataset.reviewId = reviewInfo.Id;
  helpfulNo.classList.add('pdp-product__ratings--helpful-no');

  const helpfulNoText = document.createElement('span');
  helpfulNoText.classList.add('pdp-product__ratings--helpful-no-text');
  helpfulNoText.textContent = ratingHelpfulNo || 'No';
  helpfulNo.appendChild(helpfulNoText);

  const helpfulNoCount = document.createElement('span');
  helpfulNoCount.classList.add('pdp-product__ratings--helpful-no-count');
  helpfulNoCount.dataset.value = TotalNegativeFeedbackCount;
  helpfulNoCount.textContent = `(${TotalNegativeFeedbackCount + (feedback?.negativeCount || 0)})`;
  helpfulNo.appendChild(helpfulNoCount);

  if (feedback) {
    helpfulYes.classList.add('disabled');
    helpfulNo.classList.add('disabled');
  }

  const helpfulReport = document.createElement('a');
  helpfulReport.href = '#';
  helpfulReport.setAttribute('aria-label', ratingReport || 'Report');
  helpfulReport.dataset.reviewId = reviewInfo.Id;
  helpfulReport.classList.add('pdp-product__ratings--helpful-report');
  if (feedback?.reported) {
    helpfulReport.classList.add('disabled');
  }

  const helpfulReportText = document.createElement('span');
  helpfulReportText.classList.add('pdp-product__ratings--helpful-report-text');
  helpfulReportText.textContent = feedback?.reported ? ratingReported || 'Reported' : ratingReport || 'Report';
  helpfulReportText.dataset.reportedLabel = ratingReported || 'Reported';
  helpfulReport.appendChild(helpfulReportText);

  helpfulButtons.appendChild(helpfulYes);
  helpfulButtons.appendChild(helpfulNo);
  helpfulButtons.appendChild(helpfulReport);

  helpfulWrapper.appendChild(helpfulButtons);
  ratingDetails.appendChild(helpfulWrapper);
}

function decorateBottomBadges(bvConfig, reviewInfo, placeholders, ratingDetails) {
  // eslint-disable-next-line camelcase
  const isGoogleTranslationEnabled = bvConfig?.basic?.enable_google_translation;
  const lang = getLanguageAttr();
  if (isGoogleTranslationEnabled && lang !== reviewInfo.ContentLocale.split('_')[0] && (reviewInfo.ReviewText || reviewInfo.Title)) {
    const {
      translateWithGoogle, translatedWithGoogle,
      seeOriginal,
    } = placeholders;

    const bottomBadgesWrapper = document.createElement('div');
    bottomBadgesWrapper.classList.add('pdp-product__bottom-badges');

    // Translate with Google badge
    let bottomBadgesTranslate = document.createElement('div');
    bottomBadgesTranslate.classList.add('pdp-product__bottom-badges--translate', 'active');
    let badgeIcon = document.createElement('span');
    badgeIcon.classList.add('icon', 'icon-google-translate');
    bottomBadgesTranslate.appendChild(badgeIcon);
    let badgeLink = document.createElement('a');
    badgeLink.href = '#';
    let badgeTitle = document.createElement('span');
    badgeTitle.textContent = translateWithGoogle || 'Translate with Google';
    badgeLink.classList.add('pdp-product__bottom-badges--translate-link');
    badgeLink.appendChild(badgeTitle);
    bottomBadgesTranslate.appendChild(badgeLink);
    bottomBadgesWrapper.appendChild(bottomBadgesTranslate);

    // Translated with Google badge
    bottomBadgesTranslate = document.createElement('div');
    bottomBadgesTranslate.classList.add('pdp-product__bottom-badges--translated');
    badgeIcon = document.createElement('span');
    badgeIcon.classList.add('icon', 'icon-google-translate');
    bottomBadgesTranslate.appendChild(badgeIcon);
    badgeTitle = document.createElement('span');
    badgeTitle.textContent = translatedWithGoogle || 'Translated with Google';
    badgeTitle.classList.add('pdp-product__bottom-badges--global-text');
    bottomBadgesTranslate.appendChild(badgeTitle);
    badgeLink = document.createElement('a');
    badgeLink.href = '#';
    badgeTitle = document.createElement('span');
    badgeTitle.textContent = seeOriginal || 'See original';
    badgeLink.classList.add('pdp-product__bottom-badges--translate-link');
    badgeLink.appendChild(badgeTitle);
    bottomBadgesTranslate.appendChild(badgeLink);
    bottomBadgesWrapper.appendChild(bottomBadgesTranslate);

    ratingDetails.appendChild(bottomBadgesWrapper);
  }
}

async function decoratePhotos(reviewInfo, ratingDetails) {
  const { Photos } = reviewInfo;

  if (Photos?.length > 0) {
    const ratingWrapper = document.createElement('div');
    const ratingPhotos = document.createElement('div');
    ratingPhotos.classList.add('carousel', 'cards');

    Photos.forEach((photo) => {
      const picture = createPicture(photo);
      const photoDiv = document.createElement('div');
      photoDiv.appendChild(picture);

      ratingPhotos.appendChild(photoDiv);
    });
    ratingWrapper.appendChild(ratingPhotos);
    ratingDetails.appendChild(ratingWrapper);
  }
}

function handleCloseEvent(event) {
  event.preventDefault();
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.close();
  });
}

export async function decorateReview(reviewInfo, bvConfig, index, locale, placeholders) {
  const {
    Rating, SubmissionTime, UserNickname, UserLocation, Title, ReviewText,
    OriginalProductName, Badges, BadgesOrder, TagDimensions, TagDimensionsOrder,
    AuthorId, IsRecommended,
  } = reviewInfo;

  const {
    ratingUserUnknown, ratingProductBought, ratingRecommend, ratingRecommendYes,
  } = placeholders;

  const ratingDetails = document.createElement('div');
  ratingDetails.classList.add('pdp-product__ratings--details-item', `pdp-product__ratings--details-item-${index}`);

  const ratingsItemContainer = document.createElement('div');
  ratingsItemContainer.classList.add('pdp-product__ratings--details-rating');
  ratingsItemContainer.appendChild(starRating(Rating));

  const ratingDate = document.createElement('span');
  ratingDate.classList.add('pdp-product__ratings--details-date');
  ratingDate.textContent = `${formatDate(SubmissionTime, locale)}`;

  ratingsItemContainer.appendChild(ratingDate);
  ratingDetails.appendChild(ratingsItemContainer);

  const ratingUserWrapper = document.createElement('div');
  ratingUserWrapper.classList.add('pdp-product__ratings--details-user-wrapper');

  const ratingUser = document.createElement('span');
  ratingUser.classList.add('pdp-product__ratings--details-user');
  ratingUser.dataset.authorId = AuthorId;
  ratingUser.textContent = `${UserNickname || UserLocation || ratingUserUnknown || 'Unknown'}`;
  ratingUserWrapper.appendChild(ratingUser);

  if (Badges?.verifiedPurchaser) {
    const verifiedPurchaser = document.createElement('span');
    verifiedPurchaser.classList.add('icon', 'icon-tick-verified');
    ratingUserWrapper.appendChild(verifiedPurchaser);
  }

  const topList = ['top10', 'top25', 'top50', 'top100'];

  BadgesOrder?.forEach((badge) => {
    if (badge !== 'verifiedPurchaser') {
      const badgeWrapper = document.createElement('div');
      badgeWrapper.classList.add('name-badge');
      const badgeIcon = document.createElement('span');
      const badgeTitle = document.createElement('span');

      if (topList.includes(badge)) {
        badgeIcon.classList.add('icon', 'icon-badge-top-contributor');
        badgeTitle.textContent = placeholders.topContributor || 'Top contributor';
      } else {
        badgeIcon.classList.add('icon', `icon-badge-${badge.toLowerCase()}`);
        badgeTitle.textContent = placeholders[badge.charAt(0).toLowerCase() + badge.slice(1)] || badge.charAt(0).toUpperCase() + badge.slice(1);
      }

      badgeWrapper.appendChild(badgeIcon);
      badgeWrapper.appendChild(badgeTitle);
      ratingUserWrapper.appendChild(badgeWrapper);
    }
  });

  ratingDetails.appendChild(ratingUserWrapper);

  if (Title) {
    const ratingTitle = document.createElement('span');
    ratingTitle.classList.add('pdp-product__ratings--details-title');
    ratingTitle.textContent = `${Title}`;

    ratingDetails.appendChild(ratingTitle);
  }

  if (ReviewText) {
    const ratingText = document.createElement('span');
    ratingText.classList.add('pdp-product__ratings--details-text');
    ratingText.textContent = `${ReviewText}`;

    ratingDetails.appendChild(ratingText);
  }

  const ratingProduct = document.createElement('div');
  ratingProduct.classList.add('pdp-product__ratings--details-tag');

  const ratingProductText = document.createElement('span');
  ratingProductText.classList.add('pdp-product__ratings--details-tag-label');
  ratingProductText.textContent = ratingProductBought || 'Bought:';

  ratingProduct.appendChild(ratingProductText);

  const ratingProductTitle = document.createElement('span');
  ratingProductTitle.classList.add('pdp-product__ratings--details-tag-value');

  ratingProductTitle.textContent = OriginalProductName;
  ratingProduct.appendChild(ratingProductTitle);
  ratingDetails.appendChild(ratingProduct);

  if (TagDimensionsOrder?.length > 0) {
    const ratingTags = document.createElement('div');
    ratingTags.classList.add('pdp-product__ratings--details-tags');

    TagDimensionsOrder.forEach((tag) => {
      const tagValue = TagDimensions?.[tag];
      if (!tagValue) return;

      const tagWrapper = document.createElement('span');
      tagWrapper.classList.add('pdp-product__ratings--details-tag');

      const tagLabel = document.createElement('span');
      tagLabel.classList.add('pdp-product__ratings--details-tag-label');
      tagLabel.textContent = `${tagValue.Label}:`;
      tagWrapper.appendChild(tagLabel);

      const tagValueText = document.createElement('span');
      tagValueText.classList.add('pdp-product__ratings--details-tag-value');
      tagValueText.textContent = `${tagValue.Values.join(' ,')}`;
      tagWrapper.appendChild(tagValueText);

      ratingTags.appendChild(tagWrapper);
    });

    ratingDetails.appendChild(ratingTags);
  }

  await decoratePhotos(reviewInfo, ratingDetails);

  if (IsRecommended) {
    const recommendWrapper = document.createElement('div');
    recommendWrapper.classList.add('pdp-product__ratings--recommend');

    const recommendIcon = document.createElement('span');
    recommendIcon.classList.add('icon', 'icon-tick-complete');
    recommendWrapper.appendChild(recommendIcon);

    const recommendTextContainer = document.createElement('span');
    recommendTextContainer.classList.add('pdp-product__ratings--recommend-text-container');

    const recommendText = document.createElement('span');
    recommendText.classList.add('pdp-product__ratings--recommend-text');
    recommendText.textContent = ratingRecommendYes || 'Yes';
    recommendTextContainer.appendChild(recommendText);

    const recommendLabel = document.createElement('span');
    recommendLabel.classList.add('pdp-product__ratings--recommend-label');
    recommendLabel.textContent = ratingRecommend || ', I would recommend this product.';
    recommendTextContainer.appendChild(recommendLabel);

    recommendWrapper.appendChild(recommendTextContainer);

    ratingDetails.appendChild(recommendWrapper);
  }

  decorateHelpfulButtons(reviewInfo, placeholders, ratingDetails);

  decorateSyndicatedReview(reviewInfo, placeholders, ratingDetails);

  decorateBottomBadges(bvConfig, reviewInfo, placeholders, ratingDetails);

  return ratingDetails;
}

async function decorateReviews(reviews, bvConfig, locale, placeholders) {
  const ratingDetailsWrapper = document.createElement('div');

  const promises = reviews.Results.map((result, index) => decorateReview(result, bvConfig, index + 1, locale, placeholders));
  const decoratedReviews = await Promise.all(promises);
  decoratedReviews.forEach((decoratedReview) => ratingDetailsWrapper.appendChild(decoratedReview));

  return ratingDetailsWrapper;
}

function decorateSort(bvConfig, placeholders, ratingDetailsWrapper) {
  const { ratingSortBy } = placeholders;

  // sort by drop down
  const ratingDetailsSort = document.createElement('div');
  ratingDetailsSort.classList.add('pdp-product__ratings--details-sort');

  const ratingDetailsSortLink = document.createElement('a');
  ratingDetailsSortLink.classList.add('pdp-product__ratings--details-sort-link');
  ratingDetailsSortLink.href = '#';

  const ratingDetailsSortLabel = document.createElement('span');
  ratingDetailsSortLabel.classList.add('pdp-product__ratings--details-sort-label');
  ratingDetailsSortLabel.textContent = ratingSortBy || 'Sort by';
  ratingDetailsSortLink.appendChild(ratingDetailsSortLabel);

  const ratingDetailsSortIcon = document.createElement('span');
  ratingDetailsSortIcon.classList.add('icon', 'icon-chevron-down');
  ratingDetailsSortLink.appendChild(ratingDetailsSortIcon);

  ratingDetailsSort.appendChild(ratingDetailsSortLink);

  const ratingDetailsSortList = document.createElement('ul');
  ratingDetailsSortList.classList.add('pdp-product__ratings--details-sort-select', 'input-drop-down', 'hide');
  ratingDetailsSortList.dataset.sort = ratingSortBy || 'Sort by';

  // eslint-disable-next-line camelcase
  const { sorting_options } = bvConfig;

  // eslint-disable-next-line camelcase
  sorting_options?.forEach((sort) => {
    const ratingDetailsSortItem = document.createElement('li');
    ratingDetailsSortItem.classList.add('pdp-product__ratings--details-sort-select-item', 'input-drop-down--item');
    ratingDetailsSortItem.setAttribute('aria-label', sort.label);

    const ratingDetailsSortItemLink = document.createElement('a');
    ratingDetailsSortItemLink.classList.add('pdp-product__ratings--details-sort-select-link', 'input-drop-down--item-link');
    ratingDetailsSortItemLink.setAttribute('aria-label', sort.label);
    ratingDetailsSortItemLink.dataset.sort = sort.value;
    ratingDetailsSortItemLink.href = '#';
    ratingDetailsSortItemLink.textContent = sort.label;
    ratingDetailsSortItem.appendChild(ratingDetailsSortItemLink);

    ratingDetailsSortList.appendChild(ratingDetailsSortItem);
  });

  ratingDetailsSort.appendChild(ratingDetailsSortList);
  ratingDetailsWrapper.appendChild(ratingDetailsSort);
}

async function decorateReviewSection(reviews, sku, bvConfig, locale, placeholders) {
  const { ratingLoadMore } = placeholders;
  const ratingDetailsWrapper = document.createElement('div');
  ratingDetailsWrapper.classList.add('pdp-product__ratings--details');

  decorateSort(bvConfig, placeholders, ratingDetailsWrapper);

  const authorReviews = await getStoredMyReview(sku);
  if (authorReviews) {
    const {
      writeReviewSuccessMessage, writeReviewSuccessTitle,
    } = placeholders;

    const customer = await getCustomer();

    // check if the review was published, if so clear this review from the local storage
    if (reviews.Includes?.Authors?.[customer?.id]) {
      clearStoredReview(sku);
    } else {
      const authorReviewWrapper = document.createElement('div');
      authorReviewWrapper.classList.add('pdp-product__ratings--author-review');

      const successTitleWrapper = document.createElement('div');
      successTitleWrapper.classList.add('pdp-product__ratings--author-review-title');

      const successIcon = document.createElement('span');
      successIcon.classList.add('icon', 'icon-success');
      successTitleWrapper.appendChild(successIcon);

      const successTitle = document.createElement('h6');
      successTitle.textContent = writeReviewSuccessTitle || 'Your review was saved';
      successTitleWrapper.appendChild(successTitle);

      authorReviewWrapper.appendChild(successTitleWrapper);

      const successMessage = document.createElement('span');
      successMessage.textContent = writeReviewSuccessMessage || 'Thank you for your review! Your feedback has been saved successfully. Our team will review it shortly, and it will be published within the next 24-48 hours. We appreciate your patience.';

      authorReviewWrapper.appendChild(successMessage);

      ratingDetailsWrapper.appendChild(authorReviewWrapper);
    }
  }

  const ratingDetailsItems = document.createElement('div');
  ratingDetailsItems.classList.add('pdp-product__ratings--details-items');

  ratingDetailsWrapper.appendChild(ratingDetailsItems);

  const firstPageReviews = await decorateReviews(reviews, bvConfig, locale, placeholders);

  [...firstPageReviews.children].forEach((review) => {
    ratingDetailsItems.appendChild(review);
  });

  const hasMoreReviews = reviews.TotalResults > reviews.Limit;

  if (hasMoreReviews) {
    const loadMore = document.createElement('a');
    loadMore.classList.add('pdp-product__ratings--load-more');
    loadMore.dataset.limit = reviews.Results.length;
    loadMore.textContent = ratingLoadMore || 'Load more reviews';
    loadMore.href = '#';
    ratingDetailsWrapper.appendChild(loadMore);
  }

  return ratingDetailsWrapper;
}

function handleWriteReviewEvent(event, ctx, placeholders, locale) {
  event.preventDefault();
  const fromModal = !!event.target.closest('dialog');
  if (!isLoggedInUser()) {
    window.location.href = `/${document.documentElement.lang || 'en'}/user/login?redirect=${window.location.pathname}&action=writeReview`;
  } else {
    import('./write-review.js').then((module) => {
      module.default(ctx.data, fromModal, placeholders, locale).then(() => {
        openModal('write-ratings-dialog');
      });
    });
  }
}

function handleSortExpandCollapseEvent(event) {
  event.preventDefault();
  const dropdown = event.target.closest('.pdp-product__ratings--details-sort');
  dropdown.classList.toggle('open');
  const list = dropdown.querySelector('.pdp-product__ratings--details-sort-select');
  list.classList.toggle('hide');
}

async function handleGoogleTranslatelEvent(event, translate, review) {
  event.preventDefault();
  if (translate) {
    const lang = getLanguageAttr();

    const detailedItem = event.target.closest('.pdp-product__ratings--details-item');
    const detailedText = detailedItem.querySelector('.pdp-product__ratings--details-text');
    const text = detailedText.textContent;
    const translatedTextValue = await googleTranslate(text, review.ContentLocale.split('_')[0], lang);
    detailedText.textContent = translatedTextValue;

    const detailedTitle = detailedItem.querySelector('.pdp-product__ratings--details-title');
    const title = detailedTitle.textContent;
    const translatedTitleValue = await googleTranslate(title, review.ContentLocale.split('_')[0], lang);
    detailedTitle.textContent = translatedTitleValue;

    const buttonTranslate = event.target.closest('.pdp-product__bottom-badges--translate');
    buttonTranslate.classList.remove('active');
    const buttonTranslated = detailedItem.querySelector('.pdp-product__bottom-badges--translated');
    buttonTranslated.classList.add('active');
  } else {
    const detailedItem = event.target.closest('.pdp-product__ratings--details-item');
    const detailedText = detailedItem.querySelector('.pdp-product__ratings--details-text');
    detailedText.textContent = review.ReviewText;

    const detailedTitle = detailedItem.querySelector('.pdp-product__ratings--details-title');
    detailedTitle.textContent = review.Title;

    const buttonTranslate = event.target.closest('.pdp-product__bottom-badges--translated');
    buttonTranslate.classList.remove('active');
    const buttonTranslated = detailedItem.querySelector('.pdp-product__bottom-badges--translate');
    buttonTranslated.classList.add('active');
  }
}

function handleReviewHelpfulEvent(event, helpful = true) {
  event.preventDefault();
  const link = event.target.closest('a');

  if (link.classList.contains('disabled')) return;
  const { reviewId } = link.dataset;
  postReviewHelpful(reviewId, helpful).then((response) => {
    if (response.success) {
      const review = event.target.closest('.pdp-product__ratings--helpful');
      const positiveCount = review.querySelector('.pdp-product__ratings--helpful-yes-count');
      const negativeCount = review.querySelector('.pdp-product__ratings--helpful-no-count');

      const positiveCountLink = review.querySelector('.pdp-product__ratings--helpful-yes');
      const negativeCountLink = review.querySelector('.pdp-product__ratings--helpful-no');

      if (helpful) {
        const positiveCountValue = parseInt(positiveCount.dataset.value, 10) || 0;
        positiveCount.dataset.value = positiveCountValue + 1;
        positiveCount.textContent = `(${positiveCountValue + 1})`;
      } else {
        const negativeCountValue = parseInt(negativeCount.dataset.value, 10) || 0;
        negativeCount.dataset.value = negativeCountValue + 1;
        negativeCount.textContent = `(${negativeCountValue + 1})`;
      }

      positiveCountLink.classList.add('disabled');
      negativeCountLink.classList.add('disabled');
    }
  });
}

function handleReviewReportEvent(event) {
  event.preventDefault();
  const link = event.target.closest('a');

  if (link.classList.contains('disabled')) return;
  const { reviewId } = link.dataset;
  reportReview(reviewId).then((response) => {
    if (response.success) {
      const reviewText = link.querySelector('.pdp-product__ratings--helpful-report-text');
      reviewText.textContent = reviewText.dataset.reportedLabel;
      link.classList.add('disabled');
    }
  });
}

async function handleViewPhotosEvent(event, review, placeholders) {
  const reviewPhotosModal = document.querySelector('#view-review-pictures');
  if (reviewPhotosModal) {
    closeModal('view-review-pictures');
  }

  const reviwPicturesModalHeading = placeholders.reviwPicturesModalHeading || 'Customer images';
  const container = document.createElement('div');
  container.classList.add('view-review-pictures-container');

  review.Photos.forEach((photo) => {
    const picture = createPicture(photo);
    const photoDiv = document.createElement('div');
    photoDiv.classList.add('review-image');
    photoDiv.appendChild(picture);
    container.appendChild(photoDiv);
  });

  await createModalFromContent('view-review-pictures', reviwPicturesModalHeading, container.outerHTML, ['pdp-modal', 'pdp-modal-review-pictures'], 'arrow-left')
    .then(() => {
      document.querySelector('#view-review-pictures .pdp-modal .icon-title-left')?.addEventListener('click', (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();
        const reviewModal = e.target.closest('#view-review-pictures');
        if (reviewModal) {
          reviewModal.remove();
        }
      });
      document.querySelector('#view-review-pictures .pdp-modal .modal-close')?.addEventListener('click', (e) => handleCloseEvent(e));
      openModal('view-review-pictures');
    });
}

// Define the event handler function
function createHandleClick(reviewResult, placeholders) {
  return async function handleClick(event) {
    event.stopPropagation();
    await handleViewPhotosEvent(event, reviewResult, placeholders);
  };
}

// Create a Map to store the call of the functions
const clickHandlers = new Map();
async function bindReviewItemsEvents(modal, reviewsResults, placeholders) {
  // load more link
  modal.querySelectorAll('.pdp-product__ratings--helpful-yes').forEach((element) => element.addEventListener('click', (event) => handleReviewHelpfulEvent(event)));

  modal.querySelectorAll('.pdp-product__ratings--helpful-no').forEach((element) => element.addEventListener('click', (event) => handleReviewHelpfulEvent(event, false)));

  modal.querySelectorAll('.pdp-product__ratings--helpful-report').forEach((element) => element.addEventListener('click', (event) => handleReviewReportEvent(event)));

  modal.querySelectorAll('.pdp-product__bottom-badges--translate')?.forEach((element, index) => element.addEventListener('click', (event) => handleGoogleTranslatelEvent(event, true, reviewsResults[index])));
  modal.querySelectorAll('.pdp-product__bottom-badges--translated')?.forEach((element, index) => element.addEventListener('click', (event) => handleGoogleTranslatelEvent(event, false, reviewsResults[index])));

  const commonStyleConfig = {
    navButtons: true,
    isRTL: document.documentElement.dir === 'rtl',
    defaultStyling: true,
    visibleItems: [
      {
        items: 3,
        condition: () => true,
      },
    ],
  };

  modal.querySelectorAll('.carousel.cards')?.forEach((element) => {
    if (!element.querySelector('.carousel-item')) {
      createCarousel(element, null, { ...commonStyleConfig });
    }
  });

  modal.querySelectorAll('.pdp-product__ratings--details-item')?.forEach((element, index) => {
    const reviewResult = reviewsResults[index];
    const handleClick = createHandleClick(reviewResult, placeholders);

    element.querySelectorAll('picture.carousel-item-image')?.forEach((el) => {
      const handleClickToRemove = clickHandlers.get(el);
      if (!handleClickToRemove) {
        el.addEventListener('click', handleClick);
        // Store the function in the Map
        clickHandlers.set(el, handleClick);
      }
    });
  });
}

async function handleLoadMoreEvent(event, reviews, sku, bvConfig, locale, placeholders) {
  event.preventDefault();
  const reviewsContainer = event.target.parentElement.querySelector('.pdp-product__ratings--details-items');

  const loadMore = event.target;
  const { sort } = event.target.closest('.pdp-product__ratings--details')
    .querySelector('.pdp-product__ratings--details-sort')
    .dataset;

  // eslint-disable-next-line camelcase
  const { reviews_on_loadmore } = bvConfig.basic;

  const { limit } = loadMore.dataset;

  getReviews(sku, limit, reviews_on_loadmore, sort).then(async (morereviews) => {
    const newReviews = await decorateReviews(morereviews, bvConfig, locale, placeholders);

    decorateIcons(newReviews);

    [...newReviews.children].forEach((review) => {
      reviewsContainer.appendChild(review);
    });

    // remove load more link if no more reviews
    // eslint-disable-next-line camelcase
    if ((morereviews.Offset + morereviews.Results.length) >= morereviews.TotalResults) {
      event.target.classList.add('hidden');
    }

    loadMore.dataset.limit = morereviews.Offset + morereviews.Results.length;
    const allReviews = reviews.Results.concat(morereviews.Results);
    bindReviewItemsEvents(reviewsContainer, allReviews, placeholders);
  });
}

async function handleSortChangeEvent(event, modal, sku, bvConfig, locale, placeholders) {
  event.preventDefault();
  const link = event.target.closest('a');
  const { sort } = link.dataset;

  // eslint-disable-next-line camelcase
  const { reviews_on_loadmore } = bvConfig.basic;

  const dropdown = event.target.closest('.pdp-product__ratings--details-sort');
  dropdown.classList.remove('open');

  const selectField = dropdown.querySelector('.pdp-product__ratings--details-sort-select');
  selectField.classList.add('hide');
  const label = dropdown.querySelector('.pdp-product__ratings--details-sort-label');
  label.textContent = link.textContent;

  dropdown.dataset.sort = sort;

  const reviewItems = modal.querySelector('.pdp-product__ratings--details-items');

  // add loader
  await getReviews(sku, 0, reviews_on_loadmore, sort).then(async (reviews) => {
    const firstPageReviews = await decorateReviews(reviews, bvConfig, locale, placeholders);

    reviewItems.innerHTML = '';

    [...firstPageReviews.children].forEach((review) => {
      reviewItems.appendChild(review);
    });

    decorateIcons(reviewItems);

    const hasMoreReviews = (reviews.Offset + reviews.Results.length) < reviews.TotalResults;

    if (hasMoreReviews) {
      const loadMore = modal.querySelector('.pdp-product__ratings--load-more');
      loadMore.dataset.limit = reviews.Results.length;

      if (loadMore) {
        loadMore.classList.remove('hidden');
      }
    }
    bindReviewItemsEvents(reviewItems, reviews.Results, placeholders);
  });
}

async function bindReviewsEvents(modal, reviews, ctx, bvConfig, locale, placeholders) {
  const { sku } = ctx.data;
  // load more link
  if (modal.querySelector('.pdp-product__ratings--load-more')) {
    modal.querySelector('.pdp-product__ratings--load-more').addEventListener('click', (event) => handleLoadMoreEvent(event, reviews, sku, bvConfig, locale, placeholders));
  }

  modal.querySelector('.pdp-product__ratings--write-review button').addEventListener('click', (event) => {
    handleWriteReviewEvent(event, ctx, placeholders, locale);
    modal.close();
  });

  modal.querySelector('.pdp-product__ratings--details-sort a').addEventListener('click', (event) => handleSortExpandCollapseEvent(event));

  modal.querySelectorAll('.input-drop-down--item-link').forEach((element) => element.addEventListener('click', (event) => handleSortChangeEvent(event, modal, sku, bvConfig, locale, placeholders)));

  bindReviewItemsEvents(modal, reviews.Results, placeholders);
}

function setJsonLdReviews(reviews, sku) {
  const ReviewStatistics = reviews?.Includes?.Products?.[sku]?.FilteredReviewStatistics;
  const reviewCount = ReviewStatistics?.TotalReviewCount || 0;
  const averageRating = ReviewStatistics?.AverageOverallRating || 0;
  if (reviewCount === 0 || averageRating === 0) return;
  const jsonLd = {
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: ReviewStatistics?.AverageOverallRating,
      reviewCount: ReviewStatistics?.TotalReviewCount,
    },
  };
  jsonLd.review = reviews.Results?.map((review) => ({
    '@type': 'Review',
    name: review.Title,
    description: review.ReviewText,
    reviewRating: {
      '@type': 'Rating',
      ratingValue: review.Rating,
    },
    author: {
      '@type': 'Person',
      name: review.UserNickname,
    },
  }));
  setJsonLd(jsonLd, 'product');
}

function decorateRatingBreakdown(RatingDistribution, TotalReviewCount, placeholders) {
  const ratingBreakDown = document.createElement('div');
  ratingBreakDown.classList.add('pdp-product__ratings--breakdown');

  const { ratingStars } = placeholders;

  for (let i = 5; i >= 1;) {
    const totalRatings = RatingDistribution?.filter(
      (rating) => rating.RatingValue === i,
    )[0]?.Count || 0;
    const rating = document.createElement('div');
    rating.classList.add('pdp-product__ratings--breakdown-item');

    const ratingText = document.createElement('span');
    ratingText.classList.add('pdp-product__ratings--breakdown-text');
    ratingText.textContent = `${(ratingStars || '{{}} stars').replace('{{}}', i)}`;
    rating.appendChild(ratingText);

    const ratingBar = document.createElement('div');
    ratingBar.classList.add('pdp-product__ratings--breakdown-bar');

    const ratingBarFill = document.createElement('div');
    ratingBarFill.classList.add('pdp-product__ratings--breakdown-bar-fill');
    ratingBarFill.style.width = `${(totalRatings / TotalReviewCount) * 100}%`;

    ratingBar.appendChild(ratingBarFill);
    rating.appendChild(ratingBar);

    const ratingCount = document.createElement('span');
    ratingCount.classList.add('pdp-product__ratings--breakdown-count');
    ratingCount.textContent = `${totalRatings}`;
    rating.appendChild(ratingCount);

    ratingBreakDown.appendChild(rating);

    i -= 1;
  }
  return ratingBreakDown;
}

export function decorateSecondaryRatings(
  SecondaryRatingsAveragesOrder,
  SecondaryRatingsAverages,
  ratingsSummary,
) {
  SecondaryRatingsAveragesOrder?.forEach((rating) => {
    const secondaryRating = SecondaryRatingsAverages?.[rating];

    if (!secondaryRating) return;
    const secondaryRatingContainer = document.createElement('div');
    secondaryRatingContainer.classList.add('pdp-product__ratings--secondary');

    if (secondaryRating?.DisplayType === 'NORMAL') {
      const secondaryRatingTitle = document.createElement('span');
      secondaryRatingTitle.classList.add('pdp-product__ratings--secondary-title');
      secondaryRatingTitle.textContent = `${secondaryRating?.Label}:` || 'Secondary Rating:';
      secondaryRatingContainer.appendChild(secondaryRatingTitle);

      secondaryRatingContainer.appendChild(starRating(secondaryRating?.AverageRating));
      const secondaryRatingValue = document.createElement('span');
      secondaryRatingValue.classList.add('pdp-product__ratings--secondary-value');
      secondaryRatingValue.textContent = `${secondaryRating?.AverageRating || 0}`;
      secondaryRatingContainer.appendChild(secondaryRatingValue);
    } else if (secondaryRating?.DisplayType === 'SLIDER') {
      const {
        AverageRating, ValueLabel, Label, MinLabel, MaxLabel, ValueRange,
        Value,
      } = secondaryRating;

      secondaryRatingContainer.classList.add('secondary-slider');

      const secondaryRatingTitleWrapper = document.createElement('div');
      secondaryRatingTitleWrapper.classList.add('pdp-product__ratings--secondary-title-wrapper');

      const secondaryRatingTitle = document.createElement('span');
      secondaryRatingTitle.classList.add('pdp-product__ratings--secondary-title');
      secondaryRatingTitle.textContent = `${Label}:` || 'Secondary Rating:';
      secondaryRatingTitleWrapper.appendChild(secondaryRatingTitle);

      const secondaryRatingValue = document.createElement('span');
      secondaryRatingValue.classList.add('pdp-product__ratings--secondary-value');

      const value = Math.floor(AverageRating || Value || 0);
      const valueLabel = Array.isArray(ValueLabel) ? ValueLabel[value - 1] : ValueLabel;

      secondaryRatingValue.textContent = `${valueLabel}`;
      secondaryRatingTitleWrapper.appendChild(secondaryRatingValue);

      secondaryRatingContainer.appendChild(secondaryRatingTitleWrapper);

      // TODO: Implement slider
      const secondaryRatingSlider = document.createElement('div');
      secondaryRatingSlider.classList.add('pdp-product__ratings--secondary-slider');

      const minValue = document.createElement('span');
      minValue.classList.add('pdp-product__ratings--secondary-slider-min');
      minValue.textContent = `${MinLabel || 'Min'}`;
      secondaryRatingSlider.appendChild(minValue);

      const secondaryRatingSliderContainer = document.createElement('div');
      secondaryRatingSliderContainer.classList.add('pdp-product__ratings--secondary-slider-dot-container');

      for (let i = 1; i < ValueRange; i += 1) {
        const sliderDots = document.createElement('div');
        sliderDots.classList.add('slide-dot');
        sliderDots.classList.add(`slide-range-${ValueRange}`);

        secondaryRatingSliderContainer.appendChild(sliderDots);
      }

      const isRtl = document.documentElement.getAttribute('dir') === 'rtl';

      const dynamicDot = document.createElement('div');
      dynamicDot.classList.add('dynamic-dot');
      dynamicDot.classList.add(`slide-range-${ValueRange}`);

      if (isRtl) {
        dynamicDot.style.right = `${(value - 1) * (100 / (ValueRange - 1))}%`;
      } else {
        dynamicDot.style.left = `${(value - 1) * (100 / (ValueRange - 1))}%`;
      }
      secondaryRatingSliderContainer.appendChild(dynamicDot);

      secondaryRatingSlider.appendChild(secondaryRatingSliderContainer);

      const maxValue = document.createElement('span');
      maxValue.classList.add('pdp-product__ratings--secondary-slider-max');
      maxValue.textContent = `${MaxLabel || 'Max'}`;
      secondaryRatingSlider.appendChild(maxValue);

      secondaryRatingContainer.appendChild(secondaryRatingSlider);
    }

    ratingsSummary.appendChild(secondaryRatingContainer);
  });
}

async function viewRatingsOverlay(ctx, placeholders, sku, reviews, bvConfig, locale) {
  const ReviewStatistics = reviews?.Includes?.Products?.[sku]?.FilteredReviewStatistics;

  const {
    RecommendedCount, TotalReviewCount, AverageOverallRating, SecondaryRatingsAveragesOrder,
    SecondaryRatingsAverages, RatingDistribution,
  } = ReviewStatistics;

  const {
    ratingWriteReview, ratingTitle, ratingPercentageRecommend, ratingReviewCount,
  } = placeholders;
  // round average to 1 decimal place
  const roundedAverageOverallRating = Math.round(AverageOverallRating * 10) / 10;

  const ratingsOverlayContent = document.createElement('div');
  ratingsOverlayContent.classList.add('pdp-product__ratings--overlay');

  const ratingsSummary = document.createElement('div');
  ratingsSummary.classList.add('pdp-product__ratings--summary');

  const ratingsContainer = document.createElement('div');
  ratingsContainer.classList.add('pdp-product__ratings');
  ratingsContainer.appendChild(starRating(roundedAverageOverallRating));

  const ratingsCount = document.createElement('span');
  ratingsCount.classList.add('pdp-product__ratings--average');
  const ratingsCountLabel = ratingReviewCount || '{{rating}} ( {{count}} Reviews )';
  ratingsCount.textContent = `${ratingsCountLabel.replace('{{rating}}', roundedAverageOverallRating).replace('{{count}}', TotalReviewCount)}`;
  ratingsContainer.appendChild(ratingsCount);

  ratingsSummary.appendChild(ratingsContainer);

  if (RecommendedCount !== 0) {
    const percentage = Math.round((RecommendedCount * 100) / TotalReviewCount);
    const ratingOverall = document.createElement('div');
    ratingOverall.classList.add('pdp-product__ratings--overall');

    const recommendText = ratingPercentageRecommend || ' {{percentage}} of customers recommend this product';
    ratingOverall.textContent = recommendText.replace('{{percentage}}', `${percentage}%`);
    ratingsSummary.appendChild(ratingOverall);
  }

  const ratingBreakDown = decorateRatingBreakdown(RatingDistribution, TotalReviewCount, placeholders);

  ratingsSummary.appendChild(ratingBreakDown);

  decorateSecondaryRatings(SecondaryRatingsAveragesOrder, SecondaryRatingsAverages, ratingsSummary);

  ratingsOverlayContent.appendChild(ratingsSummary);

  // eslint-disable-next-line max-len
  const ratingDetailsWrapper = await decorateReviewSection(reviews, sku, bvConfig, locale, placeholders);
  ratingsOverlayContent.appendChild(ratingDetailsWrapper);

  const writeReviewButtonContainer = document.createElement('div');
  writeReviewButtonContainer.classList.add('pdp-product__ratings--write-review');

  const writeReviewButton = document.createElement('button');
  writeReviewButton.classList.add('dropin-button', 'dropin-button--medium', 'dropin-button--primary');

  writeReviewButton.setAttribute('aria-label', ratingWriteReview || 'Write a review');
  writeReviewButton.innerHTML = `<span>${ratingWriteReview || 'Write a review'}</span>`;

  writeReviewButtonContainer.appendChild(writeReviewButton);
  ratingsOverlayContent.appendChild(writeReviewButtonContainer);

  decorateIcons(ratingsOverlayContent);

  const titleDiv = document.createElement('div');
  titleDiv.textContent = ratingTitle || 'Reviews';

  createModalFromContent('view-ratings-dialog', titleDiv.textContent, ratingsOverlayContent.outerHTML, ['pdp-modal', 'pdp-modal--ratings'])
    .then(async () => {
      if (isLoggedInUser()) {
        const reviewButton = document.querySelector('#view-ratings-dialog .pdp-product__ratings--write-review button');
        const authorEmail = await getCustomer();
        const authorReviews = await getStoredMyReview(sku);
        const authorList = await getAuthorReviews(authorEmail.id, sku);
        let alreadyReviewed = Object.keys(authorList?.Includes).length > 0;

        if (!alreadyReviewed && authorReviews) {
          alreadyReviewed = authorEmail?.email === authorReviews?.useremail && authorReviews?.productid === ctx.data.sku;
        }

        if (alreadyReviewed) {
          reviewButton.disabled = true;
        }

        const url = new URL(window.location.href);
        const params = url.searchParams;
        if (params.has('action')) {
          params.delete('action');
          window.history.replaceState({}, '', url);
          document.querySelector('.pdp-product__ratings--link').click();
          setTimeout(() => {
            if (!reviewButton.disabled) {
              reviewButton.click();
            }
          }, 100);
        }
      }
      bindReviewsEvents(document.querySelector('#view-ratings-dialog .pdp-modal'), reviews, ctx, bvConfig, locale, placeholders);
    });
}

// eslint-disable-next-line import/prefer-default-export
export async function decorateRatings(ctx, ratingsContainer, placeholders, locale) {
  getBVConfig().then((bvConfig) => {
    // eslint-disable-next-line camelcase
    const reviews_initial_load = bvConfig?.basic?.reviews_initial_load || 5;

    getReviews(ctx.data.sku, 0, reviews_initial_load).then(async (reviews) => {
      const { sku } = ctx.data;
      const ratingsLinkWrapper = document.createElement('div');
      ratingsLinkWrapper.classList.add('pdp-product__ratings--link-wrapper');
      const ratingsLink = document.createElement('a');
      ratingsLink.classList.add('pdp-product__ratings--link');
      ratingsLink.href = '#';

      if (reviews?.TotalResults > 0
          && reviews?.Includes?.Products?.[sku]) {
        const {
          TotalReviewCount, AverageOverallRating,
        } = reviews?.Includes?.Products?.[sku]?.ReviewStatistics || {};
        setJsonLdReviews(reviews, sku);

        ratingsContainer.appendChild(starRating(AverageOverallRating));

        const ratingsCount = document.createElement('a');
        ratingsCount.classList.add('pdp-product__ratings--count');
        ratingsCount.textContent = `(${TotalReviewCount})`;
        ratingsCount.href = '#';
        ratingsLinkWrapper.appendChild(ratingsCount);

        ratingsLink.textContent = placeholders.pdpViewAllReviewsLink || 'View all reviews';

        await viewRatingsOverlay(ctx, placeholders, sku, reviews, bvConfig, locale);
        ratingsLink.addEventListener('click', (e) => {
          e.preventDefault();
          openModal('view-ratings-dialog');
        });
        ratingsCount.addEventListener('click', (e) => {
          e.preventDefault();
          openModal('view-ratings-dialog');
        });
        loadCSS('/blocks/product-details/ratings.css');
      } else {
        const authorReviews = await getStoredMyReview(sku);
        const authorEmail = await getCustomer();
        if (authorReviews && authorEmail) {
          if (authorEmail.email === authorReviews.useremail && authorReviews.productid === ctx.data.sku) {
            ratingsLink.classList.add('disabled');
          }
        }
        ratingsLink.textContent = placeholders.pdpWriteReviewLink || 'Write a review';

        ratingsLink.addEventListener('click', (e) => handleWriteReviewEvent(e, ctx, placeholders, locale));

        const url = new URL(window.location.href);
        const params = url.searchParams;
        if (params.has('action')) {
          params.delete('action');
          window.history.replaceState({}, '', url);
          ratingsLink.click();
        }
      }

      ratingsLinkWrapper.appendChild(ratingsLink);

      ratingsContainer.appendChild(ratingsLinkWrapper);
      ratingsContainer.classList.remove('loading');

      decorateIcons(ratingsContainer);
    });
  });
}
