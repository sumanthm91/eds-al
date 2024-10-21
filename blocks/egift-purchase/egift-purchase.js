import { getConfigValue } from '../../scripts/configs.js';
import { performCommerceRestQuery } from '../../scripts/commerce.js';
import { fetchPlaceholders, decorateIcons } from '../../scripts/aem.js';
import {
  setErrorForField,
  EMAIL_PATTERN,
} from '../../scripts/forms.js';
import renderAddToBagDialog from '../added-to-bag/added-to-bag.js';

let egiftRestEndpoint = null;
let storeCode = null;
const egiftItems = [];
let customAmount = null;
let commerceRestEndpoint = null;
const egiftPurchase = '/V1/products?searchCriteria%5BpageSize%5D=5&searchCriteria%5BcurrentPage%5D=1&searchCriteria%5BfilterGroups%5D%5B0%5D%5Bfilters%5D%5B0%5D%5Bfield%5D=visibility&searchCriteria%5BfilterGroups%5D%5B0%5D%5Bfilters%5D%5B0%5D%5Bvalue%5D=4&searchCriteria%5BfilterGroups%5D%5B0%5D%5Bfilters%5D%5B0%5D%5BconditionType%5D=eq&searchCriteria%5BfilterGroups%5D%5B1%5D%5Bfilters%5D%5B0%5D%5Bfield%5D=status&searchCriteria%5BfilterGroups%5D%5B1%5D%5Bfilters%5D%5B0%5D%5Bvalue%5D=1&searchCriteria%5BfilterGroups%5D%5B1%5D%5Bfilters%5D%5B0%5D%5BconditionType%5D=eq&searchCriteria%5BfilterGroups%5D%5B2%5D%5Bfilters%5D%5B0%5D%5Bfield%5D=sku&searchCriteria%5BfilterGroups%5D%5B2%5D%5Bfilters%5D%5B0%5D%5Bvalue%5D=giftcard_topup&searchCriteria%5BfilterGroups%5D%5B2%5D%5Bfilters%5D%5B0%5D%5BconditionType%5D=neq&searchCriteria%5BfilterGroups%5D%5B3%5D%5Bfilters%5D%5B0%5D%5Bfield%5D=type_id&searchCriteria%5BfilterGroups%5D%5B3%5D%5Bfilters%5D%5B0%5D%5Bvalue%5D=virtual&searchCriteria%5BfilterGroups%5D%5B3%5D%5Bfilters%5D%5B0%5D%5BconditionType%5D=eq';
let egiftIndex = 0;
let currency = null;
let placeholders = null;
let nameError = '';
let emailError = '';
let amountError = '';
let egiftMsgMaxLength;

async function extracteGiftItems() {
  const data = await performCommerceRestQuery(egiftRestEndpoint, false);
  data.data.items.forEach((item) => {
    const prices = item.extension_attributes.hps_giftcard_amount
      .map((priceOption) => priceOption.value);
    egiftItems.push({
      name: item.name,
      sku: item.sku,
      priceOptions: prices,
      productType: item.type_id,
      minPrice: item.custom_attributes.find((attr) => attr.attribute_code === 'amount_open_from_hps')?.value,
      maxPrice: item.custom_attributes.find((attr) => attr.attribute_code === 'amount_open_to_hps')?.value,
      image: item.custom_attributes.find((attr) => attr.attribute_code === 'image')?.value,
      smallImage: item.custom_attributes.find((attr) => attr.attribute_code === 'small_image')?.value,
      thumbnailImage: item.custom_attributes.find((attr) => attr.attribute_code === 'thumbnail')?.value,
      swatchImage: item.custom_attributes.find((attr) => attr.attribute_code === 'swatch_image')?.value,
    });
  });
}

async function loadConfigs() {
  commerceRestEndpoint = await getConfigValue('commerce-rest-endpoint');
  storeCode = await getConfigValue('commerce-store-view-code');
  currency = await getConfigValue('currency');
  const prefix = storeCode ? `/${storeCode}` : '';
  egiftRestEndpoint = `${commerceRestEndpoint}${prefix}${egiftPurchase}`;
  egiftMsgMaxLength = await getConfigValue('egift-msg-char-limit') || 200;
  await extracteGiftItems();
}

function toggleSections(action) {
  if (action === 'hide') {
    document.querySelector('.egift-recipient-wrapper-parent').classList.remove('egift-visible');
    document.querySelector('.egift-recipient-wrapper-parent').classList.add('egift-hidden');
    document.querySelector('.egift-recipient').classList.add('greyed');
    document.querySelector('.egift-add-to-bag').classList.add('disabled-btn');
    document.querySelector('.egift-action-btns span').classList.add('egift-hidden');
  } else {
    document.querySelector('.egift-recipient-wrapper-parent').classList.remove('egift-hidden');
    document.querySelector('.egift-recipient-wrapper-parent').classList.add('egift-visible');
    document.querySelector('.egift-recipient').classList.remove('greyed');
    document.querySelector('.egift-add-to-bag').classList.remove('disabled-btn');
    document.querySelector('.egift-action-btns span').classList.add('egift-hidden');
  }
}

function generateInputField(item, parent, type, errorMsg, classList = [], attributes = {}) {
  const fieldWrapper = document.createElement('div');
  fieldWrapper.classList.add('input-field-wrapper');
  const inputWrapper = document.createElement('div');
  inputWrapper.classList.add('input-wrapper', 'input-field');
  const input = document.createElement('input');
  input.type = type;
  classList.forEach((cls) => input.classList.add(cls));
  input.setAttribute('aria-label', item.innerText);
  input.setAttribute('aria-errormessage', errorMsg);
  Object.keys(attributes).forEach((attribute) => {
    input.setAttribute(attribute, attributes[attribute]);
  });
  const inputLabel = document.createElement('label');
  inputLabel.innerText = item.innerText;
  inputWrapper.appendChild(input);
  inputWrapper.appendChild(inputLabel);
  fieldWrapper.appendChild(inputWrapper);
  setErrorForField(fieldWrapper);
  fieldWrapper.querySelector('.error-message-container').classList.add('hide');
  fieldWrapper.querySelector('.error-message').innerText = errorMsg;
  decorateIcons(fieldWrapper);
  parent.appendChild(fieldWrapper);
  item.remove();
  return fieldWrapper;
}

function replaceInputWithTextarea(inputElem) {
  const textarea = document.createElement('textarea');
  let i = 0;
  for (; i < inputElem.attributes.length; i += 1) {
    const attr = inputElem.attributes[i];
    if (attr.name !== 'type') {
      textarea.setAttribute(attr.name, attr.value);
    }
  }
  textarea.value = inputElem.value;
  inputElem.parentNode.replaceChild(textarea, inputElem);
}

function decorateEgiftPurchase(block) {
  const content = document.createElement('div');
  content.classList.add('egift-content');

  const contentTop = document.createElement('div');
  contentTop.classList.add('egift-content-top');
  content.appendChild(contentTop);

  const contentLeft = document.createElement('div');
  contentLeft.classList.add('egift-content-left');
  contentTop.appendChild(contentLeft);

  const image = document.createElement('img');
  image.classList.add('egift-image');
  contentLeft.appendChild(image);

  const contentRight = document.createElement('div');
  contentRight.classList.add('egift-content-right');
  contentTop.appendChild(contentRight);

  const contentBottom = document.createElement('div');
  contentBottom.classList.add('egift-content-bottom');
  content.appendChild(contentBottom);

  block.querySelector('h3').classList.add('egift-choose-card');
  contentRight.appendChild(block.querySelector('h3'));

  const cardName = document.createElement('p');
  cardName.classList.add('egift-card-name');
  contentRight.appendChild(cardName);

  const cardList = document.createElement('div');
  cardList.classList.add('egift-card-list');
  contentRight.appendChild(cardList);

  block.querySelector('h3').classList.add('egift-choose-amount');
  contentRight.appendChild(block.querySelector('h3'));

  const amountList = document.createElement('div');
  amountList.classList.add('egift-amount-list');
  contentRight.appendChild(amountList);

  block.querySelector('h3').classList.add('egift-custom-amount', 'egift-visible');
  customAmount = block.querySelector('h3').innerText;
  contentRight.appendChild(block.querySelector('h3'));
  const amountFieldAttributes = {
    inputmode: 'numeric',
  };
  const amountFieldWrapper = generateInputField(block.querySelector('p'), contentRight, 'text', amountError, ['egift-amount-input'], amountFieldAttributes);
  const currencyDiv = document.createElement('span');
  currencyDiv.classList.add('open-amount-currency');
  currencyDiv.innerText = currency;
  amountFieldWrapper.querySelector('.input-wrapper').append(currencyDiv);
  contentRight.querySelector('.input-field-wrapper').classList.add('egift-visible');

  block.querySelector('h3').classList.add('egift-recipient', 'greyed');
  contentBottom.appendChild(block.querySelector('h3'));

  const recipientWrapperDiv = document.createElement('div');
  recipientWrapperDiv.classList.add('egift-recipient-wrapper-parent', 'egift-hidden');
  contentBottom.appendChild(recipientWrapperDiv);

  block.querySelector('h3').classList.add('egift-recipient-wrapper');
  const recipientWrapper = block.querySelector('h3');
  recipientWrapperDiv.appendChild(recipientWrapper);

  const recipientContainer = document.createElement('div');
  recipientContainer.classList.add('egift-recipient-container');
  const recipientDetail = document.createElement('div');
  recipientDetail.classList.add('egift-recipient-detail');
  recipientWrapperDiv.appendChild(recipientContainer);

  generateInputField(block.querySelector('ul li'), recipientDetail, 'text', nameError);
  generateInputField(block.querySelector('ul li'), recipientDetail, 'email', emailError);
  recipientContainer.appendChild(recipientDetail);
  const textAreaField = generateInputField(block.querySelector('ul li'), recipientContainer, 'text', nameError);
  textAreaField.querySelector('.error-message-container').remove();
  replaceInputWithTextarea(textAreaField.querySelector('input'));

  const actionBtns = document.createElement('div');
  actionBtns.classList.add('egift-action-btns');
  const loader = document.createElement('span');
  loader.classList.add('icon', 'icon-ic-loader', 'egift-hidden');
  actionBtns.appendChild(loader);
  block.querySelector('p').classList.add('egift-add-to-bag', 'disabled-btn');
  actionBtns.appendChild(block.querySelector('p'));
  contentBottom.appendChild(actionBtns);
  decorateIcons(actionBtns);

  block.querySelectorAll('div').forEach((div) => div.remove());
  block.appendChild(content);
}

function updatePrimaryImage() {
  document.querySelector('.egift-image').src = egiftItems[egiftIndex].image;
  document.querySelector('.egift-image').setAttribute('title', egiftItems[egiftIndex].name);
  document.querySelector('.egift-image').setAttribute('alt', egiftItems[egiftIndex].name);
}

function updatePriceOptions() {
  document.querySelector('.egift-amount-list').innerHTML = '';
  document.querySelector('.egift-amount-input').value = '';
  egiftItems[egiftIndex].priceOptions.forEach((price) => {
    const amountP = document.createElement('p');
    amountP.innerText = price;
    document.querySelector('.egift-amount-list').appendChild(amountP);
  });
  const amountP = document.createElement('p');
  amountP.classList.add('custom-amount');
  amountP.innerText = customAmount;
  document.querySelector('.egift-amount-list').appendChild(amountP);
  document.querySelectorAll('.egift-amount-list p').forEach((p) => {
    p.addEventListener('click', (e) => {
      if (e.target.classList.contains('selected')) {
        document.querySelectorAll('.egift-amount-list p').forEach((para) => {
          para.classList.remove('selected');
        });
        document.querySelector('.egift-amount-input').value = '';
        document.querySelector('.egift-content-right .input-wrapper label').classList.remove('inputfilled');
        document.querySelector('.egift-content-right .input-wrapper span').classList.remove('show');
        toggleSections('hide');
        return;
      }

      document.querySelectorAll('.egift-amount-list p').forEach((para) => {
        para.classList.remove('selected');
      });
      e.target.classList.add('selected');
      if (p.classList.contains('custom-amount')) {
        document.querySelector('.egift-amount-input').value = '';
        document.querySelector('.egift-content-right .input-wrapper label').classList.remove('inputfilled');
        document.querySelector('.egift-content-right .input-wrapper span').classList.remove('show');
        toggleSections('hide');
        return;
      }
      document.querySelectorAll('.egift-action-btns p').forEach((para) => {
        para.classList.remove('disabled-btn');
      });
      document.querySelector('.egift-amount-input').value = '';
      document.querySelector('input.egift-amount-input').value = e.target.innerText;
      document.querySelector('.egift-content-right .error-message-container').classList.add('hide');
      document.querySelector('.egift-content-right input').classList.remove('invalid');
      if (document.querySelector('input.egift-amount-input').value !== '') {
        document.querySelector('.egift-content-right .input-wrapper label').classList.add('inputfilled');
        document.querySelector('.egift-content-right .input-wrapper span').classList.add('show');
      } else {
        document.querySelector('.egift-content-right .input-wrapper label').classList.remove('inputfilled');
        document.querySelector('.egift-content-right .input-wrapper span').classList.remove('show');
      }
      document.querySelector('.egift-recipient-wrapper-parent').classList.remove('egift-hidden');
      document.querySelector('.egift-recipient-wrapper-parent').classList.add('egift-visible');
      document.querySelector('.egift-content-right .input-field-wrapper').classList.remove('egift-hidden');
      document.querySelector('.egift-content-right .input-field-wrapper').classList.add('egift-visible');
      document.querySelector('.egift-recipient').classList.remove('greyed');
    });
  });
}

function updatePrimaryOptions() {
  updatePrimaryImage();
  updatePriceOptions();
}

function updateContent() {
  updatePrimaryOptions(egiftItems[egiftIndex]);
  egiftItems.forEach((item) => {
    const cardDiv = document.createElement('div');
    const cardImage = document.createElement('img');
    cardImage.src = item.swatchImage;
    cardImage.setAttribute('title', item.name);
    cardImage.setAttribute('alt', item.name);
    cardDiv.appendChild(cardImage);
    document.querySelector('.egift-card-list').appendChild(cardDiv);
  });
  document.querySelector('p.egift-card-name').innerText = egiftItems[egiftIndex].name;
  document.querySelector('.egift-card-list > div:first-child').classList.add('selected');
  document.querySelector('.open-amount-currency').innerText = currency;
  document.querySelector('.egift-recipient-container textarea').setAttribute('maxlength', egiftMsgMaxLength);
}

function updateCardSelection() {
  document.querySelector('p.egift-card-name').innerText = egiftItems[egiftIndex].name;
  document.querySelectorAll('.egift-card-list div').forEach((div) => {
    div.classList.remove('selected');
  });
  document.querySelectorAll('.egift-card-list div')[egiftIndex].classList.add('selected');
}

function updateInputValidation() {
  document.querySelectorAll('.input-field-wrapper').forEach((ele) => {
    if (ele.querySelector('input')) {
      ele.querySelector('input').value = '';
      ele.querySelector('input').classList.remove('invalid');
    }
    ele.querySelector('label').classList.remove('inputfilled');
    ele.querySelector('span')?.classList.remove('show');
    ele.querySelector('.error-message-container')?.classList.add('hide');
  });
}

function validateFields() {
  let isValid = true;
  document.querySelectorAll('.input-field-wrapper input').forEach((input) => {
    if (input.type === 'email') {
      if (!(new RegExp(EMAIL_PATTERN).test(input.value))) {
        input.parentElement.parentElement.querySelector('.error-message-container').classList.remove('hide');
        input.classList.add('invalid');
        isValid = false;
      } else {
        input.parentElement.parentElement.querySelector('.error-message-container').classList.add('hide');
        input.classList.remove('invalid');
      }
    } else if (input.classList.contains('egift-amount-input')) {
      const validInput = parseFloat(input.value) >= parseFloat(egiftItems[egiftIndex].minPrice)
        && parseFloat(input.value) <= parseFloat(egiftItems[egiftIndex].maxPrice);
      if (input.value === '' || !validInput) {
        input.parentElement.parentElement.querySelector('.error-message-container .error-message').innerText = amountError.replace('{{minPrice}}', parseFloat(egiftItems[egiftIndex].minPrice)).replace('{{maxPrice}}', parseFloat(egiftItems[egiftIndex].maxPrice));
        input.parentElement.parentElement.querySelector('.error-message-container').classList.remove('hide');
        input.classList.add('invalid');
        isValid = false;
        toggleSections('hide');
      } else {
        input.parentElement.parentElement.querySelector('.error-message-container').classList.add('hide');
        input.classList.remove('invalid');
        toggleSections('show');
      }
    } else if (input.type === 'text') {
      if (input.value === '') {
        input.parentElement.parentElement.querySelector('.error-message-container').classList.remove('hide');
        input.classList.add('invalid');
        isValid = false;
      } else {
        input.parentElement.parentElement.querySelector('.error-message-container').classList.add('hide');
        input.classList.remove('invalid');
      }
    }
  });
  return isValid;
}

async function attachEvents() {
  // Added to bag dialog
  document.querySelector('main').addEventListener('addtobag-updated', async (event) => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    await renderAddToBagDialog(event);
  });

  // textarea change event
  document.querySelector('.input-field-wrapper textarea').addEventListener('input', () => {
    document.querySelector('.input-field-wrapper textarea').classList.remove('invalid');
    if (document.querySelector('.input-field-wrapper textarea').value === '') {
      document.querySelector('.input-field-wrapper textarea').parentElement.querySelector('label').classList.remove('inputfilled');
    } else {
      document.querySelector('.input-field-wrapper textarea').parentElement.querySelector('label').classList.add('inputfilled');
    }
  });

  document.querySelectorAll('.egift-amount-input').forEach((input) => {
    input.addEventListener('input', (event) => {
      const { value } = event.target;
      let cursorPosition = event.target.selectionStart;
      const cleanValue = value.replace(/\D/g, '');
      if (value.length > cleanValue.length) {
        cursorPosition -= 1;
      }
      event.target.value = cleanValue;
      event.target.setSelectionRange(cursorPosition, cursorPosition);
    });
  });

  // input change event
  document.querySelectorAll('.input-field-wrapper input').forEach((input) => {
    input.addEventListener('input', () => {
      input.parentElement.parentElement.querySelector('.error-message-container').classList.add('hide');
      input.classList.remove('invalid');
      if (input.value === '') {
        input.parentElement.querySelector('label').classList.remove('inputfilled');
        input.parentElement.querySelector('span')?.classList.remove('show');
      } else {
        input.parentElement.querySelector('label').classList.add('inputfilled');
        input.parentElement.querySelector('span')?.classList.add('show');
      }

      // change to custom amount selection if custom amount is entered
      if (input.classList.contains('egift-amount-input')) {
        document.querySelectorAll('.egift-amount-list p').forEach((para) => {
          para.classList.remove('selected');
        });
        document.querySelector('.egift-amount-list p.custom-amount').classList.add('selected');
      }
    });

    // data validation event
    input.addEventListener('focusout', () => {
      if (input.type === 'email') {
        if (!(new RegExp(EMAIL_PATTERN).test(input.value))) {
          input.parentElement.parentElement.querySelector('.error-message-container').classList.remove('hide');
          input.classList.add('invalid');
        } else {
          input.parentElement.parentElement.querySelector('.error-message-container').classList.add('hide');
          input.classList.remove('invalid');
        }
      } else if (input.classList.contains('egift-amount-input')) {
        const validInput = parseFloat(input.value) >= parseFloat(egiftItems[egiftIndex].minPrice)
          && parseFloat(input.value) <= parseFloat(egiftItems[egiftIndex].maxPrice);
        if (input.value === '' || !validInput) {
          input.parentElement.parentElement.querySelector('.error-message-container .error-message').innerText = amountError.replace('{{minPrice}}', parseFloat(egiftItems[egiftIndex].minPrice)).replace('{{maxPrice}}', parseFloat(egiftItems[egiftIndex].maxPrice));
          input.parentElement.parentElement.querySelector('.error-message-container').classList.remove('hide');
          input.classList.add('invalid');
          toggleSections('hide');
        } else {
          input.parentElement.parentElement.querySelector('.error-message-container').classList.add('hide');
          input.classList.remove('invalid');
          toggleSections('show');
        }
      } else if (input.type === 'text') {
        if (input.value === '') {
          input.parentElement.parentElement.querySelector('.error-message-container')?.classList.remove('hide');
          input.classList.add('invalid');
        } else {
          input.parentElement.parentElement.querySelector('.error-message-container').classList.add('hide');
          input.classList.remove('invalid');
        }
      }
    });
  });

  // Add To Bag Event
  document.querySelector('.egift-add-to-bag').addEventListener('click', async (e) => {
    e.preventDefault();
    if (e.target.parentElement.classList.contains('disabled-btn')) {
      return;
    }
    if (validateFields()) {
      const buttonEle = e.target.querySelector('a') || e.target;
      const spanEle = buttonEle.closest('.egift-action-btns').querySelector('span');
      buttonEle.innerText = '';
      buttonEle.append(spanEle);
      spanEle.classList.remove('egift-hidden');
      const options = {
        product_type: egiftItems[egiftIndex].productType,
        custom_giftcard_amount: document.querySelector('.egift-amount-input').value,
        giftcard_amount: 'custom',
        giftcard_sender_name: document.querySelector('.egift-recipient-detail input[type="text"]').value,
        giftcard_recipient_name: document.querySelector('.egift-recipient-detail input[type="text"]').value,
        giftcard_sender_email: document.querySelector('.egift-recipient-detail input[type="email"]').value,
        giftcard_recipient_email: document.querySelector('.egift-recipient-detail input[type="email"]').value,
        giftcard_message: document.querySelector('.egift-recipient-container textarea').value,
      };
      const { cartApi } = await import('../../scripts/minicart/api.js');
      await cartApi.addToCart(egiftItems[egiftIndex].sku, options, 1, 'egift-purchase');
      spanEle.classList.add('egift-hidden');
      buttonEle.closest('.egift-action-btns').prepend(spanEle);
      buttonEle.innerText = buttonEle.getAttribute('title');
    }
  });

  // selecting different eGift cards
  document.querySelectorAll('.egift-card-list div').forEach((div, index) => {
    div.addEventListener('click', () => {
      egiftIndex = index;
      updateCardSelection();
      updatePrimaryImage();
      updatePriceOptions();
      updateInputValidation();
    });
  });
}

export default async function decorate(block) {
  placeholders = await fetchPlaceholders(`/${document.documentElement.lang}`);
  nameError = placeholders.egiftErrorMsgName || 'Please enter recipient name';
  emailError = placeholders.egiftErrorMsgEmail || 'Please enter valid email address';
  amountError = placeholders.egiftErrorMsgAmount || 'Please enter amount in range of {{minPrice}} and {{maxPrice}}';
  decorateEgiftPurchase(block);

  loadConfigs().then(() => {
    if (egiftItems.length > 0) {
      updateContent();
      attachEvents();
    }
  });
}
