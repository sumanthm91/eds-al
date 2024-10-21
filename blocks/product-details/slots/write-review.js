import { decorateIcons, loadCSS } from '../../../scripts/aem.js';
import { getConfigValue } from '../../../scripts/configs.js';
import {
  getBVConfig, getBVWriteConfig, postReview, uploadPhoto,
} from '../../../scripts/reviews/api.js';
import {
  createOptimizedPicture,
  createModalFromContent,
  fetchPlaceholdersForLocale,
  openModal,
} from '../../../scripts/scripts.js';
import { getCustomer } from '../../../scripts/customer/api.js';
import {
  setErrorMessageForField,
  setErrorForField,
  validateInput,
  getErrorMessageForField,
} from '../../../scripts/forms.js';

async function decorateProgress($parent) {
  const placeholders = await fetchPlaceholdersForLocale();
  const progress = document.createElement('div');
  progress.classList.add('write-review-progress');

  const steps = [
    `${placeholders.writeReviewStep1}`,
    `${placeholders.writeReviewStep2}`,
    `${placeholders.writeReviewStep3}`,
  ];

  const progressSteps = document.createElement('ul');
  progressSteps.classList.add('write-review-progress-steps');

  const progressText = document.createElement('ul');
  progressText.classList.add('write-review-progress-steps');

  steps.forEach((step, index) => {
    const stepElement = document.createElement('li');
    stepElement.classList.add('write-review-step', `step-${index + 1}`);
    stepElement.dataset.step = index + 1;
    stepElement.textContent = step;
    if (index === 0) {
      stepElement.classList.add('active');
    }
    progressText.appendChild(stepElement);
  });

  progress.appendChild(progressText);

  $parent.appendChild(progress);
}

function decorateProduct($parent, product) {
  const productContainer = document.createElement('div');
  productContainer.classList.add('write-review-product');

  // TODO: Use actual product image
  product.image = product?.images[0]?.url;
  const image = createOptimizedPicture(product.image, product.name);
  productContainer.appendChild(image);

  const name = document.createElement('div');
  name.classList.add('product-name');
  name.textContent = product.name;
  productContainer.appendChild(name);

  $parent.appendChild(productContainer);
}

function isFieldHidden(fieldConfig, bvWriteConfig) {
  const { hide_fields_write_review: hiddenFields } = bvWriteConfig;

  return !fieldConfig || hiddenFields.includes(fieldConfig['#id']?.toLowerCase());
}

function setFieldAttributes($field, fieldConfig) {
  $field.name = fieldConfig['#id'];
  $field.ariaLabel = fieldConfig['#title'];
  $field.required = fieldConfig['#required'];
  $field.maxLength = fieldConfig['#maxlength'];
  $field.minLength = fieldConfig['#minlength'];
}

function decorateSecondaryRating($parent, bvWriteConfig) {
  const { write_review_form: writeFormConfig } = bvWriteConfig;

  Object.values(writeFormConfig)
    .filter((field) => field['#id'] && (field['#id']).startsWith('rating_') && field['#visible'] && !isFieldHidden(field, bvWriteConfig))
    .forEach((field) => {
      const secondaryRatingField = document.createElement('div');
      secondaryRatingField.classList.add('secondary-rating-field');

      const ratingSelected = document.createElement('div');
      ratingSelected.classList.add('rating-selected');
      const ratingLabel = document.createElement('span');
      ratingLabel.htmlFor = field['#id'];
      ratingLabel.textContent = `${field['#title']}:`;
      ratingSelected.appendChild(ratingLabel);

      const ratingValue = document.createElement('span');
      ratingValue.classList.add('rating-value');
      ratingValue.textContent = '';
      ratingSelected.appendChild(ratingValue);

      secondaryRatingField.appendChild(ratingSelected);

      const ratingInput = document.createElement('div');
      ratingInput.classList.add('secondary-rating-input');
      secondaryRatingField.appendChild(ratingInput);

      if (field['#group_type'] === 'slider') {
        const options = field['#options'];
        const numOptions = Object.keys(options).length;

        const optionWrapper = document.createElement('div');
        optionWrapper.classList.add('range-slider', `range-${numOptions}`);

        Object.keys(options).forEach((key) => {
          const optionInput = document.createElement('input');
          optionInput.type = 'radio';
          optionInput.name = field['#id'];
          optionInput.value = key;
          optionInput.id = `${field['#id']}_${key}`;
          optionInput.ariaLabel = options[key];

          optionWrapper.appendChild(optionInput);

          const optionLabel = document.createElement('label');
          optionLabel.htmlFor = `${field['#id']}_${key}`;
          optionWrapper.appendChild(optionLabel);

          const optionLabelSpan = document.createElement('span');
          optionLabelSpan.textContent = options[key];
          optionLabel.appendChild(optionLabelSpan);

          if (key !== Object.keys(options)[numOptions - 1]) {
            const optionBar = document.createElement('div');
            optionBar.classList.add('range-slider-bar');
            optionWrapper.appendChild(optionBar);
          }
        });
        ratingInput.appendChild(optionWrapper);

        const rangeSliderLabels = document.createElement('div');
        rangeSliderLabels.classList.add('range-slider-labels');

        const rangeSliderLabelMin = document.createElement('span');
        rangeSliderLabelMin.textContent = options[Object.keys(options)[0]];
        rangeSliderLabels.appendChild(rangeSliderLabelMin);

        const rangeSliderLabelMax = document.createElement('span');
        rangeSliderLabelMax.textContent = options[Object.keys(options)[numOptions - 1]];
        rangeSliderLabels.appendChild(rangeSliderLabelMax);

        ratingInput.appendChild(rangeSliderLabels);
      } else {
        const starInput = document.createElement('div');
        starInput.classList.add('star-counter');
        ratingInput.appendChild(starInput);

        for (let i = 1; i <= 5; i += 1) {
          const starWrapper = document.createElement('label');
          starWrapper.classList.add('star-wrapper');

          const star = document.createElement('input');
          star.type = 'radio';
          star.name = field['#id'];
          star.value = i;
          star.id = `rating-${i}`;
          starWrapper.appendChild(star);

          const starIcon = document.createElement('span');
          starIcon.classList.add('icon', 'icon-rating-star');
          starWrapper.appendChild(starIcon);

          const starIconFilled = document.createElement('span');
          starIconFilled.classList.add('icon', 'icon-rating-star-filled', 'hide');
          starWrapper.appendChild(starIconFilled);

          starInput.appendChild(starWrapper);
        }
      }

      $parent.appendChild(secondaryRatingField);
    });
}

// eslint-disable-next-line max-len
function decorateRecommendedField(productReviewContainer, recommendedConfig, bvWriteConfig, placeholders) {
  if (!isFieldHidden(recommendedConfig, bvWriteConfig)) {
    const recommendationWrapper = document.createElement('div');
    recommendationWrapper.classList.add('recommendation-wrapper', 'input-field-wrapper', 'notransistion');

    const recommendationLabel = document.createElement('span');
    recommendationLabel.textContent = recommendedConfig['#title'];
    recommendationWrapper.appendChild(recommendationLabel);

    const recommendationOptions = document.createElement('div');
    recommendationOptions.classList.add('recommendation-options');

    const recommendationYesOption = document.createElement('div');
    recommendationYesOption.classList.add('recommendation-option', 'recommendation-yes');

    const recommendationYes = document.createElement('input');
    recommendationYes.classList.add('recommendation-option', 'recommendation-yes');
    recommendationYes.textContent = `${placeholders.recommendIt}`;
    recommendationYes.type = 'radio';
    recommendationYes.name = recommendedConfig['#id'];
    recommendationYes.value = 'yes';
    recommendationYes.ariaLabelledby = 'recommendation-yes-label';
    recommendationYes.id = 'recommendation-yes';
    recommendationYes.dataset
      .errorMessageRequired = getErrorMessageForField(recommendedConfig['#id'], recommendedConfig['#title'], placeholders);

    if (recommendedConfig['#required']) {
      recommendationYes.required = true;
    }

    recommendationYesOption.appendChild(recommendationYes);

    const recommendationYesLabel = document.createElement('label');
    recommendationYesLabel.htmlFor = 'recommendation-yes';
    recommendationYesLabel.id = 'recommendation-yes-label';
    recommendationYesLabel.classList.add('radiobuttonlabel');
    const labelYes = placeholders.recommendationYesLabel || 'Yes, I would recommend it.';
    recommendationYesLabel.innerHTML = `<span>${labelYes}</span>`;

    recommendationYesOption.appendChild(recommendationYesLabel);

    recommendationOptions.appendChild(recommendationYesOption);

    const recommendationNoOption = document.createElement('div');
    recommendationNoOption.classList.add('recommendation-option', 'recommendation-no');

    const recommendationNo = document.createElement('input');
    recommendationNo.classList.add('recommendation-option', 'recommendation-no');
    recommendationNo.textContent = `${placeholders.notRecommendIt}`;
    recommendationNo.type = 'radio';
    recommendationNo.name = recommendedConfig['#id'];
    recommendationNo.value = 'no';
    recommendationNo.ariaChecked = false;
    recommendationNo.ariaLabelledby = 'recommendation-no-label';
    recommendationNo.id = 'recommendation-no';
    recommendationNo.dataset
      .errorMessageRequired = getErrorMessageForField(recommendedConfig['#id'], recommendedConfig['#title'], placeholders);

    if (recommendedConfig['#required']) {
      recommendationNo.required = true;
    }

    recommendationNoOption.appendChild(recommendationNo);

    const recommendationNoLabel = document.createElement('label');
    recommendationNoLabel.htmlFor = 'recommendation-no';
    recommendationNoLabel.id = 'recommendation-no-label';
    recommendationNoLabel.classList.add('radiobuttonlabel');
    const labelNo = placeholders.recommendationNoLabel || 'No, I would recommend it.';
    recommendationNoLabel.innerHTML = `<span>${labelNo}</span>`;
    recommendationNoOption.appendChild(recommendationNoLabel);

    recommendationOptions.appendChild(recommendationNoOption);

    recommendationWrapper.appendChild(recommendationOptions);

    setErrorForField(recommendationOptions);

    productReviewContainer.appendChild(recommendationWrapper);
  }
}

function decorateProductReviewFields($parent, sku, bvConfig, bvWriteConfig, placeholders) {
  const {
    title: titleConfig, reviewtext: reviewTextConfig, isrecommended: recommendedConfig,
    rating: ratingConfig,
  } = bvWriteConfig.write_review_form;

  const productReviewContainer = document.createElement('div');
  productReviewContainer.classList.add('product-review-fields');

  const productReviewTitle = document.createElement('h5');
  productReviewTitle.textContent = `${placeholders.productReview}`;
  productReviewContainer.appendChild(productReviewTitle);

  // product field
  const productField = document.createElement('input');
  productField.type = 'hidden';
  productField.name = 'productid';
  productField.value = sku;
  productReviewContainer.appendChild(productField);

  const ratingField = document.createElement('div');
  ratingField.classList.add('rating-field', 'input-field-wrapper', 'notransistion');

  const ratingLabel = document.createElement('label');
  ratingLabel.htmlFor = ratingConfig['#id'];
  ratingLabel.textContent = ratingConfig['#title'];
  ratingField.appendChild(ratingLabel);

  const ratingInput = document.createElement('div');
  ratingInput.classList.add('star-counter');
  ratingField.appendChild(ratingInput);

  for (let i = 1; i <= 5; i += 1) {
    const starWrapper = document.createElement('label');
    starWrapper.classList.add('star-wrapper');

    const star = document.createElement('input');
    star.type = 'radio';
    star.name = ratingConfig['#id'];
    star.value = i;
    star.id = `rating-${i}`;
    star.required = ratingConfig['#required'];
    star.dataset.validationRequiredMessage = getErrorMessageForField(ratingConfig['#id'], ratingConfig['#title'], placeholders);
    starWrapper.appendChild(star);

    const starIcon = document.createElement('span');
    starIcon.classList.add('icon', 'icon-rating-star');
    starWrapper.appendChild(starIcon);

    const starIconFilled = document.createElement('span');
    starIconFilled.classList.add('icon', 'icon-rating-star-filled', 'hide');
    starWrapper.appendChild(starIconFilled);

    ratingInput.appendChild(starWrapper);
  }

  setErrorForField(ratingInput);
  productReviewContainer.appendChild(ratingField);

  if (!isFieldHidden(titleConfig, bvWriteConfig)) {
    const titleField = document.createElement('div');
    titleField.classList.add('title-field', 'input-field-wrapper');

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.setAttribute('id', 'reviewtitle');
    titleInput.setAttribute('placeholder', '');
    setFieldAttributes(titleInput, titleConfig);
    titleField.appendChild(titleInput);

    const titleLabel = document.createElement('label');
    titleLabel.htmlFor = titleConfig['#id'];
    titleLabel.textContent = titleConfig['#title'];
    titleField.appendChild(titleLabel);
    productReviewContainer.appendChild(titleField);
    setErrorMessageForField(titleInput, placeholders);
  }

  if (!isFieldHidden(reviewTextConfig, bvWriteConfig)) {
    const reviewField = document.createElement('div');
    reviewField.classList.add('review-field', 'input-field-wrapper');

    const reviewInput = document.createElement('textarea');
    reviewInput.setAttribute('id', 'reviewfield');
    reviewInput.setAttribute('placeholder', '');
    setFieldAttributes(reviewInput, reviewTextConfig);
    reviewField.appendChild(reviewInput);

    const reviewLabel = document.createElement('label');
    reviewLabel.htmlFor = reviewTextConfig['#id'];
    reviewLabel.textContent = reviewTextConfig['#title'];
    reviewField.appendChild(reviewLabel);
    productReviewContainer.appendChild(reviewField);
    setErrorMessageForField(reviewInput, placeholders);
  }

  const rateProduct = document.createElement('span');
  rateProduct.classList.add('rate-product');
  rateProduct.textContent = `${placeholders.rateValues}`;

  const rateProductContainer = document.createElement('div');
  rateProductContainer.classList.add('rate-product-container');
  rateProductContainer.appendChild(rateProduct);

  productReviewContainer.appendChild(rateProductContainer);

  decorateSecondaryRating(rateProductContainer, bvWriteConfig);

  decorateRecommendedField(productReviewContainer, recommendedConfig, bvWriteConfig, placeholders);

  const continueTo2 = document.createElement('button');
  continueTo2.classList.add('continue-to-2');
  continueTo2.textContent = `${placeholders.continue}`;
  productReviewContainer.appendChild(continueTo2);

  $parent.appendChild(productReviewContainer);
}

// eslint-disable-next-line max-len
function decorateYourInformationFields(yourInformationContainer, sku, customerData, _bvConfig, bvWriteConfig, placeholders, isVerifiedPurchaser) {
  const { write_review_form: writeFormConfig } = bvWriteConfig;

  let name = '';
  let email = '';
  let customerid = '';
  if (customerData) {
    name = `${customerData.firstname} ${customerData.lastname}`;
    email = customerData.email;
    customerid = customerData.id;
  }

  const { useremail: useremailConfig, usernickname: usernicknameConfig } = writeFormConfig;

  const yourInformationTitleWrapper = document.createElement('div');
  yourInformationTitleWrapper.classList.add('your-information-title-wrapper');

  const yourInformationTitle = document.createElement('h5');
  yourInformationTitle.textContent = `${placeholders.infoAboutyou}`;
  yourInformationTitleWrapper.appendChild(yourInformationTitle);

  const subTitle = document.createElement('span');
  subTitle.classList.add('sub-title');
  subTitle.textContent = `${placeholders.infoAboutyouSubtitle}`;
  yourInformationTitleWrapper.appendChild(subTitle);

  yourInformationContainer.appendChild(yourInformationTitleWrapper);

  if (!isFieldHidden(usernicknameConfig, bvWriteConfig)) {
    const nameField = document.createElement('div');
    nameField.classList.add('name-field', 'input-field-wrapper');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    setFieldAttributes(nameInput, usernicknameConfig);
    nameInput.setAttribute('id', 'usernickname');
    nameInput.setAttribute('value', name);
    nameField.appendChild(nameInput);

    const nameLabel = document.createElement('label');
    nameLabel.htmlFor = usernicknameConfig['#id'];
    nameLabel.textContent = usernicknameConfig['#title'];
    nameField.appendChild(nameLabel);

    setErrorMessageForField(nameInput, placeholders);
    yourInformationContainer.appendChild(nameField);
  }

  if (!isFieldHidden(useremailConfig, bvWriteConfig)) {
    if (useremailConfig['#visible']) {
      const emailField = document.createElement('div');
      emailField.classList.add('useremail-field', 'input-field-wrapper');

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.setAttribute('readonly', '');
      nameInput.setAttribute('value', email);
      nameInput.setAttribute('id', 'useremail');
      setFieldAttributes(nameInput, useremailConfig);
      emailField.appendChild(nameInput);

      const nameLabel = document.createElement('label');
      nameLabel.htmlFor = useremailConfig['#id'];
      nameLabel.textContent = useremailConfig['#title'];
      emailField.appendChild(nameLabel);

      setErrorMessageForField(nameInput, placeholders);
      yourInformationContainer.appendChild(emailField);
    } else {
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      setFieldAttributes(nameInput, useremailConfig);
      nameInput.setAttribute('value', email);
    }
  }

  // set up hidden fields for context data
  Object.values(writeFormConfig)
    .filter((field) => field['#id'] && field['#id'].startsWith('contextdatavalue_') && !isFieldHidden(field, bvWriteConfig))
    .forEach((field) => {
      const contextDataField = document.createElement('input');
      contextDataField.type = 'hidden';
      contextDataField.name = field['#id'];
      contextDataField.value = field['#default_value'];
      yourInformationContainer.appendChild(contextDataField);

      if (field['#id'] === 'contextdatavalue_location_filter') {
        getConfigValue('country-code').then((country) => {
          contextDataField.setAttribute('value', country);
        });
      }
    });

  // set up hidden fields for additional flags
  const contextVerifiedPurchaserDataField = document.createElement('input');
  contextVerifiedPurchaserDataField.type = 'hidden';
  contextVerifiedPurchaserDataField.name = 'contextdatavalue_VerifiedPurchaser';

  contextVerifiedPurchaserDataField.setAttribute('value', isVerifiedPurchaser);

  yourInformationContainer.appendChild(contextVerifiedPurchaserDataField);

  // userid or uas token
  const userField = document.createElement('input');
  userField.type = 'hidden';
  userField.name = 'user';
  userField.setAttribute('value', customerid);

  yourInformationContainer.appendChild(userField);

  const continueTo3 = document.createElement('button');
  continueTo3.classList.add('continue-to-3');
  continueTo3.textContent = `${placeholders.continue}`;
  yourInformationContainer.appendChild(continueTo3);
}

function handleCarouselScroll(imagePreview) {
  const list = imagePreview.querySelector('.image-container');

  // scrollLeft is negative in a right-to-left writing mode
  const scrollLeft = Math.abs(list.scrollLeft);
  // off-by-one correction for Chrome, where clientWidth is sometimes rounded down
  const width = list.clientWidth + 1;
  const isAtStart = Math.floor(scrollLeft) === 0;
  const isAtEnd = Math.ceil(width + scrollLeft) >= list.scrollWidth;
  const [previous, next] = imagePreview.querySelectorAll('button[data-direction]');

  previous.setAttribute('aria-disabled', isAtStart);
  next.setAttribute('aria-disabled', isAtEnd);
}

const isRtl = (element) => window.getComputedStyle(element).direction === 'rtl';

function navigateToNextItem(list, direction) {
  const scrollAmountValue = list.querySelector('.image-preview-item')?.clientWidth || 200;
  let scrollAmount = scrollAmountValue + 8;
  scrollAmount = isRtl(list) ? -scrollAmount : scrollAmount;
  scrollAmount = direction === 'start' ? -scrollAmount : scrollAmount;
  list.scrollBy({ left: scrollAmount });
}

function handleNavigation(list, e) {
  e.preventDefault();
  const button = e.target.closest('button');
  const { direction } = button.dataset;
  const isDisabled = button.getAttribute('aria-disabled') === 'true';
  if (isDisabled) {
    return;
  }
  navigateToNextItem(list, direction);
}

function bindCarouselEvents(imagePreview) {
  const hasEvents = imagePreview.dataset.carouselEvents;
  if (hasEvents) {
    handleCarouselScroll(imagePreview);
    return;
  }
  const [previous, next] = imagePreview.querySelectorAll('button[data-direction]');

  const list = imagePreview.querySelector('.image-container');

  previous.addEventListener('click', (e) => handleNavigation(list, e));

  next.addEventListener('click', (e) => handleNavigation(list, e));

  list.addEventListener('scroll', () => handleCarouselScroll(imagePreview));

  handleCarouselScroll(imagePreview);

  imagePreview.dataset.carouselEvents = true;
}

function unBindCarouselEvents(imagePreview) {
  const hasEvents = imagePreview.dataset.carouselEvents;
  if (!hasEvents) {
    return;
  }
  const [previous, next] = imagePreview.querySelectorAll('button[data-direction]');

  previous.removeEventListener('click', handleNavigation);
  next.removeEventListener('click', handleNavigation);

  imagePreview.dataset.carouselEvents = false;
}

function uploadImage(input, placeholders, bvConfig) {
  const imageField = input.closest('.image-field');
  const imagePreview = document.querySelector('.image-preview');
  const imageContainer = imagePreview.querySelector('.image-container');
  const imageError = imageField.querySelector('.image-error');
  const form = input.closest('.form-content');
  imageError.textContent = '';
  imageField.classList.remove('error');

  // Validations
  if (!input.files || !input.files[0]) {
    return;
  }

  // check file size <= 500KB
  if (input.files[0].size > 500 * 1024) {
    imageError.textContent = placeholders.writeReviewPhotoUploadErrorFileSize || 'File size exceeds 500KB';
    imageField.classList.add('error');
    console.error('File size exceeds 500KB');
    return;
  }

  // check file type
  const validImageTypes = /^(image\/png|image\/jpeg)$/;
  const validExtensions = ['.png', '.jpg', '.jpeg'];
  const fileExtension = input.files[0].name.split('.').pop().toLowerCase();
  if (!validImageTypes.test(input.files[0].type) || !validExtensions.includes(`.${fileExtension}`)) {
    imageError.textContent = placeholders.writeReviewPhotoUploadErrorFileType || 'Only PNG or JPEG files are allowed';
    imageField.classList.add('error');
    return;
  }

  // check if image preview container exists and contains 5 images
  if (imagePreview.querySelectorAll('.image-container .image-preview-item').length >= 5) {
    imageError.textContent = placeholders.writeReviewPhotoUploadErrorFileLimit || 'Maximum number of images reached';
    imageField.classList.add('error');
    console.error('Maximum number of images reached');
    return;
  }

  imageField.classList.add('loader');
  uploadPhoto(input.files[0]).then((response) => {
    if (!response?.data?.HasErrors) {
      // success scenario
      const photoId = response.data?.Photo?.Id;
      const photoNormalUrl = response.data?.Photo?.Sizes?.normal?.Url;
      const photoThumbnailUrl = response.data?.Photo?.Sizes?.thumbnail?.Url;
      const photoLargeUrl = response.data?.Photo?.Sizes?.large?.Url;
      const imageIndex = imagePreview.querySelectorAll('.image-container .image-preview-item').length + 1;

      const imagePreviewItem = document.createElement('div');
      imagePreviewItem.classList.add('image-preview-item');

      const image = document.createElement('img');
      image.src = photoNormalUrl;
      image.dataset.photoId = photoId;
      image.dataset.photoThumbnailUrl = photoThumbnailUrl;
      image.dataset.photoNormalUrl = photoNormalUrl;
      image.dataset.photoLargeUrl = photoLargeUrl;

      const deleteLink = document.createElement('a');
      deleteLink.title = placeholders.writeReviewPhotoUploadDelete || 'Delete';
      deleteLink.href = '#';

      const deleteImage = document.createElement('span');
      deleteImage.classList.add('delete-image', 'icon', 'icon-close-icon');
      deleteLink.appendChild(deleteImage);
      deleteLink.addEventListener('click', (e) => {
        e.preventDefault();
        imagePreviewItem.remove();
        input.disabled = false;
        imageField.classList.remove('hide');

        const previewItems = imagePreview.querySelectorAll('.image-container .image-preview-item');

        for (let i = 1; i < 6; i += 1) {
          form.querySelector(`input[name="photourl_${i}"]`).value = '';
          if (previewItems[i - 1]) {
            const { photoThumbnailUrl: url } = previewItems[i - 1].querySelector('img').dataset;
            form.querySelector(`input[name="photourl_${i}"]`).value = url;
          }
        }

        if (imagePreview.querySelectorAll('.image-container .image-preview-item').length > 1) {
          bindCarouselEvents(imagePreview);
        } else {
          unBindCarouselEvents(imagePreview);
        }
      });

      imagePreviewItem.appendChild(deleteLink);
      imagePreviewItem.appendChild(image);

      decorateIcons(imagePreviewItem);

      imageContainer.appendChild(imagePreviewItem);

      form.querySelector(`input[name="photourl_${imageIndex}"]`).value = photoThumbnailUrl;

      if (imagePreview.querySelectorAll('.image-container .image-preview-item').length > 1) {
        bindCarouselEvents(imagePreview);
      } else {
        unBindCarouselEvents(imagePreview);
      }

      if (imagePreview.querySelectorAll('.image-container .image-preview-item').length >= 5) {
        // disable file input
        input.disabled = true;
        // hide add images link
        imageField.classList.add('hide');
      }
    } else {
      // error scenario
      const errorMessageList = [];
      response.data.Errors.forEach((error) => {
        const errorKey = error.Code;
        const { bv_error_messages: errorMessages } = bvConfig;
        errorMessageList.push(errorMessages[errorKey] || error.Message);
      });
      console.debug('error uploading photo', errorMessageList?.join(', '));
      imageError.textContent = errorMessageList?.join(', ') || placeholders.writeReviewPhotoUploadError || 'Error uploading photo';
      imageField.classList.add('error');
    }
    imageField.classList.remove('loader');
  });
}

// eslint-disable-next-line max-len
function decorateProductImagesFields(productImagesContainer, bvConfig, bvWriteConfig, placeholders) {
  const { write_review_form: writeFormConfig } = bvWriteConfig;
  const { basic: basicConfig } = bvConfig;

  const { photo_upload: photoUploadConfig } = writeFormConfig;

  const formContent = document.createElement('div');
  formContent.classList.add('form-content');

  const formTitle = document.createElement('h5');
  formTitle.textContent = `${placeholders.howItLooks}`;
  formContent.appendChild(formTitle);

  const uploadImageText = document.createElement('div');
  formContent.appendChild(uploadImageText);

  const subTitle = document.createElement('span');
  subTitle.classList.add('sub-title');
  subTitle.textContent = `${placeholders.addPicture}`;
  uploadImageText.appendChild(subTitle);

  const instructions = document.createElement('span');
  instructions.classList.add('instructions');
  instructions.textContent = `${placeholders.uploadText}`;
  uploadImageText.appendChild(instructions);

  if (!isFieldHidden(photoUploadConfig, bvWriteConfig)) {
    const imageField = document.createElement('div');
    imageField.classList.add('image-field');

    const addImagesLinkWrapper = document.createElement('div');
    addImagesLinkWrapper.classList.add('add-images-link-wrapper');

    const addImagesLoader = document.createElement('span');
    addImagesLoader.classList.add('icon', 'icon-ic-loader', 'image-loader');
    addImagesLinkWrapper.appendChild(addImagesLoader);

    const addImagesLoadingText = document.createElement('span');
    addImagesLoadingText.classList.add('image-loading-text');
    addImagesLoadingText.textContent = `${placeholders.writeReviewPhotoUploading || 'Uploading...'}`;
    addImagesLinkWrapper.appendChild(addImagesLoadingText);

    const addImagesIcon = document.createElement('span');
    addImagesIcon.classList.add('icon', 'icon-plus');
    addImagesLinkWrapper.appendChild(addImagesIcon);

    imageField.appendChild(addImagesLinkWrapper);

    const imageLabel = document.createElement('label');
    imageLabel.htmlFor = 'photoUploadInternal';
    imageLabel.textContent = placeholders.writeReviewPhotoAddImage || 'Add image';
    addImagesLinkWrapper.appendChild(imageLabel);
    const imageInput = document.createElement('input');
    imageInput.type = 'file';
    imageInput.name = 'photoUploadInternal';
    imageInput.accept = 'image/*';
    imageInput.id = 'photoUploadInternal';
    addImagesLinkWrapper.appendChild(imageInput);

    const imageError = document.createElement('div');
    imageError.classList.add('image-error-wrapper');

    const imageErrorIcon = document.createElement('span');
    imageErrorIcon.classList.add('icon', 'icon-info-small-error');
    imageError.appendChild(imageErrorIcon);

    const imageErrorText = document.createElement('span');
    imageErrorText.classList.add('image-error');
    imageError.appendChild(imageErrorText);

    imageField.appendChild(imageError);

    formContent.appendChild(imageField);

    for (let i = 1; i < 6; i += 1) {
      const imageFieldHidden = document.createElement('input');
      imageFieldHidden.type = 'hidden';
      imageFieldHidden.name = `photourl_${i}`;
      imageFieldHidden.value = '';
      imageFieldHidden.name = `${photoUploadConfig['#id'] || 'photourl'}_${i}`;
      formContent.appendChild(imageFieldHidden);
    }

    const imagePreview = document.createElement('div');
    imagePreview.classList.add('image-preview');
    imagePreview.setAttribute('role', 'region');
    imagePreview.setAttribute('aria-label', 'Image preview carousel');
    imagePreview.tabIndex = 0;
    imagePreview.innerHTML = `
      <button class="carousel-navigation" aria-label="Previous" data-direction="start" aria-disabled="true">
      <span class="icon icon-chevron-left"></span>
      </button>
      <div class="image-container" role="list"></div>
      <button class="carousel-navigation" aria-label="Next" data-direction="end" aria-disabled="true">
      <span class="icon icon-chevron-right"></span>
      </button>`;

    formContent.appendChild(imagePreview);
  }

  // set up hidden fields for additional flags
  Object.values(writeFormConfig)
    .filter((field) => field['#id'] && (field['#id'].startsWith('hostedauthentication_') || field['#id'].startsWith('sendemailalert'))
        && !isFieldHidden(field, bvWriteConfig))
    .forEach((field) => {
      const contextDataField = document.createElement('input');
      contextDataField.type = 'hidden';
      contextDataField.name = field['#id'];
      contextDataField.value = field['#default_value'];
      formContent.appendChild(contextDataField);
    });
  productImagesContainer.appendChild(formContent);

  const termsField = document.createElement('input');
  termsField.type = 'hidden';
  termsField.name = 'agreedtotermsandconditions';
  termsField.value = 'true';
  formContent.appendChild(termsField);

  const buttonContainer = document.createElement('div');
  buttonContainer.classList.add('buttons-container');

  console.log('basicConfig', basicConfig);
  const termsLink = document.createElement('a');
  termsLink.href = basicConfig?.write_review_tnc || '#';
  termsLink.textContent = `${placeholders.termsConditions}`;
  termsLink.target = '_blank';
  buttonContainer.appendChild(termsLink);

  const submit = document.createElement('button');
  submit.classList.add('submit-review');
  submit.textContent = `${placeholders.saveReview}`;
  buttonContainer.appendChild(submit);

  productImagesContainer.appendChild(buttonContainer);
}

async function decorateForm(
  $parent,
  product,
  bvConfig,
  bvWriteConfig,
  placeholders,
  isVerifiedPurchaser,
) {
  const form = document.createElement('form');
  form.classList.add('write-review-form-container');

  const productReviewContainer = document.createElement('div');
  productReviewContainer.classList.add('write-review-form', 'product-review-container', 'form-1');

  decorateProduct(productReviewContainer, product);

  // eslint-disable-next-line max-len
  decorateProductReviewFields(productReviewContainer, product.sku, bvConfig, bvWriteConfig, placeholders);

  form.appendChild(productReviewContainer);

  const yourInformationContainer = document.createElement('div');
  yourInformationContainer.classList.add('write-review-form', 'your-information-container', 'form-2', 'hide');

  const customerData = await getCustomer(true);
  // eslint-disable-next-line max-len
  decorateYourInformationFields(yourInformationContainer, product.sku, customerData, bvConfig, bvWriteConfig, placeholders, isVerifiedPurchaser);

  form.appendChild(yourInformationContainer);

  const productImagesContainer = document.createElement('div');
  productImagesContainer.classList.add('write-review-form', 'product-images-container', 'form-3', 'hide');

  decorateProductImagesFields(productImagesContainer, bvConfig, bvWriteConfig, placeholders);

  form.appendChild(productImagesContainer);

  $parent.appendChild(form);
}

function showSuccessScreen(modal, locale, placeholders) {
  const {
    writeReviewSuccessMessage, writeReviewSuccessTitle, writeReviewSuccessClose,
  } = placeholders;

  const successScreen = document.createElement('div');
  successScreen.classList.add('success-screen');

  const successContent = document.createElement('div');
  successContent.classList.add('success-content');

  const successIcon = document.createElement('span');
  successIcon.classList.add('icon', 'icon-success');
  successContent.appendChild(successIcon);

  const successTitle = document.createElement('h5');
  successTitle.textContent = writeReviewSuccessTitle || 'Your review was saved';
  successContent.appendChild(successTitle);

  const successMessage = document.createElement('span');
  successMessage.textContent = writeReviewSuccessMessage || 'Thank you for your review! Your feedback has been saved successfully. Our team will review it shortly, and it will be published within the next 24-48 hours. We appreciate your patience.';

  successContent.appendChild(successMessage);

  successScreen.appendChild(successContent);

  const close = document.createElement('button');
  close.classList.add('write-review-close');
  close.textContent = writeReviewSuccessClose || 'Okay';
  successScreen.appendChild(close);

  decorateIcons(successScreen);

  modal.querySelector('.write-review-container').innerHTML = '';
  modal.querySelector('.write-review-container').appendChild(successScreen);
}

function showErrorScreen(modal, data, locale, placeholders) {
  const {
    writeReviewErrorTitle, writeReviewErrorClose,
  } = placeholders;

  const errorScreen = document.createElement('div');
  errorScreen.classList.add('error-screen');

  const errorContent = document.createElement('div');
  errorContent.classList.add('error-content');

  const errorIcon = document.createElement('span');
  errorIcon.classList.add('icon', 'icon-error');
  errorContent.appendChild(errorIcon);

  const errorTitle = document.createElement('h5');
  errorTitle.textContent = writeReviewErrorTitle || 'Oops! Your review couldn\'t be saved';
  errorContent.appendChild(errorTitle);

  const errorList = document.createElement('span');
  errorList.classList.add('error-list');
  errorList.textContent = data.join(', ');

  errorContent.appendChild(errorList);

  errorScreen.appendChild(errorContent);

  const close = document.createElement('button');
  close.classList.add('write-review-close');
  close.textContent = writeReviewErrorClose || 'Okay';
  errorScreen.appendChild(close);

  decorateIcons(errorScreen);

  modal.querySelector('.write-review-container').innerHTML = '';
  modal.querySelector('.write-review-container').appendChild(errorScreen);
}

function markStepAsActive($parent, step) {
  const steps = $parent.querySelectorAll('.write-review-progress-steps li');
  steps.forEach((stepElement, index) => {
    if (index + 1 === step) {
      stepElement.classList.add('active');
      stepElement.classList.remove('complete');
    } else {
      stepElement.classList.remove('active');
      if (index + 1 < step) {
        stepElement.classList.add('complete');
      }
    }
  });
}

function showFormAtStep(modal, step) {
  const forms = modal.querySelectorAll('.write-review-form-container .write-review-form');
  forms.forEach((form, index) => {
    if (index + 1 === step) {
      form.classList.remove('hide');
    } else {
      form.classList.add('hide');
    }
  });
}

function moveToStep(modal, nextStepNumber) {
  const currentStep = modal.querySelector('.write-review-progress-steps .active').dataset.step;
  const currentStepNum = parseInt(currentStep, 10);

  // only move back
  // eslint-disable-next-line max-len
  if (currentStepNum === 1 || nextStepNumber === currentStepNum || nextStepNumber > currentStepNum) {
    return;
  }
  markStepAsActive(modal, nextStepNumber);
  showFormAtStep(modal, nextStepNumber);
}

function handleFormStep1SubmitEvent(event, modal) {
  event.preventDefault();
  const form = event.target.closest('.write-review-form');

  let isValid = true;

  form.querySelectorAll('input, textarea').forEach((input) => {
    const checkValid = validateInput(input);
    isValid = isValid && checkValid;
  });

  if (isValid) {
    const form1 = form.closest('form').querySelector('.form-1');
    const form2 = form.closest('form').querySelector('.form-2');
    form1.classList.add('hide');
    form2.classList.remove('hide');
    markStepAsActive(modal, 2);
  } else {
    const invalidFields = form.querySelectorAll('input:invalid, textarea:invalid');
    if (invalidFields.length > 0) {
      invalidFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

function handleFormStep2SubmitEvent(event, modal) {
  event.preventDefault();
  const form = event.target.closest('.write-review-form');

  let isValid = true;

  form.querySelectorAll('input, textarea').forEach((input) => {
    isValid = isValid && validateInput(input);
  });

  if (isValid) {
    const form2 = form.closest('form').querySelector('.form-2');
    const form3 = form.closest('form').querySelector('.form-3');
    form2.classList.add('hide');
    form3.classList.remove('hide');
    markStepAsActive(modal, 3);
  } else {
    const invalidFields = form.querySelectorAll('input:invalid, textarea:invalid');
    if (invalidFields.length > 0) {
      invalidFields[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}

/* eslint-disable max-len */
async function handleFormSubmitEvent(event, modal, product, bvConfig, locale, placeholders, fromModal) {
  event.preventDefault();
  const form = event.target.closest('form');

  let isValid = true;

  form.querySelectorAll('input, textarea').forEach((input) => {
    isValid = isValid && validateInput(input);
  });

  if (isValid) {
    const formData = new FormData(form);

    const response = await postReview(formData);
    // success case
    if (response.success && !response.data.HasErrors) {
      if (!fromModal) {
        document.querySelector('.pdp-product__ratings--link')?.classList.add('disabled');
      } else {
        document.querySelector('.pdp-product__ratings--write-review button').disabled = true;
      }

      showSuccessScreen(modal, locale, placeholders);
      modal.querySelector('.write-review-close').addEventListener('click', () => {
        modal.close();
      });
    } else {
      // error case
      showErrorScreen(modal, response.message, locale, placeholders);
      modal.querySelector('.write-review-close').addEventListener('click', () => {
        modal.close();
      });
    }
    console.log('Submit Review');
  }
}

function handleFormBackStep1Event(event, modal) {
  moveToStep(modal, 1);
}

function handleFormBackStep2Event(event, modal) {
  moveToStep(modal, 2);
}

function handleBackEvent(event, modal) {
  const activeStep = document.querySelector('.write-review-step.active');
  const stepNumber = activeStep.getAttribute('data-step');
  if (stepNumber > 1) {
    moveToStep(modal, stepNumber - 1);
  } else {
    event.preventDefault();
    document.querySelectorAll('dialog').forEach((dialog) => {
      dialog.close();
    });
    setTimeout(() => {
      openModal('view-ratings-dialog');
    }, 100);
  }
}

function bindEvents(modal, product, bvConfig, bvWriteConfig, locale, placeholders, fromModal) {
  // Submit step 1
  modal.querySelector('.write-review-form-container button.continue-to-2').addEventListener('click', (event) => handleFormStep1SubmitEvent(event, modal));

  // Submit step 2
  modal.querySelector('.write-review-form-container button.continue-to-3').addEventListener('click', (event) => handleFormStep2SubmitEvent(event, modal));

  // Submit step 3
  modal.querySelector('.write-review-form-container button.submit-review').addEventListener('click', (event) => handleFormSubmitEvent(event, modal, product, bvConfig, locale, placeholders, fromModal));

  modal.querySelectorAll('.write-review-form input, .write-review-form textarea').forEach((input) => {
    input.addEventListener('change', () => validateInput(input));
  });

  // Go back to Step 1
  modal.querySelector('.write-review-progress-steps .step-1').addEventListener('click', (event) => handleFormBackStep1Event(event, modal, product, bvConfig, locale));

  // Go back to Step 2
  modal.querySelector('.write-review-progress-steps .step-2').addEventListener('click', (event) => handleFormBackStep2Event(event, modal, product, bvConfig, locale));

  // Close modal
  if (modal.querySelector('.modal-header .icon-title-left')) {
    modal.querySelector('.modal-header .icon-title-left').addEventListener('click', (event) => handleBackEvent(event, modal));
  }

  modal.querySelector('.write-review-form-container .image-field input').addEventListener('change', (event) => uploadImage(event.target, placeholders, bvConfig));
}

function handleRadioClick(event) {
  const ratingValue = event.target.getAttribute('aria-label');
  const closestParent = event.target.closest('.secondary-rating-field');
  closestParent.querySelector('.rating-value').textContent = ratingValue;
}

export default async function decorate(product, fromModal, placeholders, locale, isVerifiedPurchaser = false) {
  const loadBVConfig = getBVConfig();
  const loadBVWriteConfig = getBVWriteConfig(product.sku);
  const writeAReviewModelHeading = placeholders.writeReviewModelHeading || 'Write a review';

  const [bvConfig, bvWriteConfig] = await Promise.all([loadBVConfig, loadBVWriteConfig]);

  if (!bvConfig || !bvWriteConfig) {
    return;
  }

  const container = document.createElement('div');
  container.classList.add('write-review-container', 'height100');

  await decorateProgress(container);

  await decorateForm(container, product, bvConfig, bvWriteConfig[0], placeholders, isVerifiedPurchaser);

  decorateIcons(container);

  await loadCSS('/blocks/product-details/write-review.css');

  await createModalFromContent('write-ratings-dialog', writeAReviewModelHeading, container.outerHTML, ['pdp-modal', 'pdp-modal-write-review'], fromModal ? 'arrow-left' : null);
  bindEvents(document.querySelector('#write-ratings-dialog .pdp-modal'), product, bvConfig, bvWriteConfig[0], locale, placeholders, fromModal);

  const textarea = document.querySelector('textarea');
  textarea.addEventListener('input', () => {
    textarea.style.height = 'revert-layer';
    textarea.style.height = textarea.scrollHeight > textarea.offsetHeight ? `${textarea.scrollHeight}px` : textarea.offsetHeight;
  });

  const ratingInputs = document.querySelectorAll('.rate-product-container input[type="radio"]');
  ratingInputs.forEach((radioitem) => {
    radioitem.addEventListener('change', handleRadioClick);
  });

  document.querySelector('.write-review-form-container .error-message-container');
}
