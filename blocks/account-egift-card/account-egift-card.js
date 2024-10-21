import {
  fetchPlaceholdersForLocale, isLoggedInUser, formatDateToCurrentLocale, formatPrice,
  createModalFromContent, closeModal, openModal, showToastNotification,
} from '../../scripts/scripts.js';
import {
  getLinkedGiftCards, linkGiftCardSendOtp, linkGiftCardVerifyOtp, unlinkGiftCard, topUpGiftCardUser,
} from '../../scripts/giftcart/api.js';
import {
  setErrorMessageForField, setupOtpValidation, showErrorMessage, showPageErrorMessage,
  validateInput,
} from '../../scripts/forms.js';
import { getConfigValue } from '../../scripts/configs.js';
import {
  getTopUpAmount, getTopUpOptions, enableTopUpButton, checkoutTopUpEgift,
} from '../../scripts/giftcart/helper.js';
import { getCustomer } from '../../scripts/customer/api.js';

async function verifyOtpCode(otpCode, otpMessageContainer, egiftNumber) {
  const otp = await linkGiftCardVerifyOtp(egiftNumber, otpCode);

  if (otp.response_type) {
    window.location.reload();
  } else {
    otpMessageContainer.style.display = 'block';
  }
}

async function sendOtpEmail(egiftNumber, placeholders) {
  const otpResponse = await linkGiftCardSendOtp(egiftNumber);
  if (!otpResponse) {
    showPageErrorMessage(placeholders.egiftOtpError || 'An error occurred while sending OTP.');
  }
  return otpResponse;
}

async function decorateOtpForm(form, egiftNumber, placeholders) {
  const otpVerifyContainer = document.createElement('div');
  otpVerifyContainer.classList.add('otp-verification-container');

  const otpContainerTitle = document.createElement('h5');
  otpContainerTitle.textContent = placeholders.otpSentText || 'Verification code sent to ';

  otpVerifyContainer.appendChild(otpContainerTitle);

  const otpFieldsContainer = document.createElement('div');
  otpFieldsContainer.classList.add('otp-fields-container');

  for (let i = 0; i < 6; i += 1) {
    const otpInputContainer = document.createElement('div');
    otpInputContainer.classList.add('otp-input-container');
    const otpInput = document.createElement('input');
    otpInput.type = 'text';
    otpInput.classList.add('otp-input');
    otpInput.autocomplete = 'one-time-code';
    otpInput.inputMode = 'numeric';
    otpInput.maxLength = 1;
    otpInput.pattern = '\\d{1}';

    const line = document.createElement('div');
    line.classList.add('line');

    otpInputContainer.appendChild(otpInput);
    otpInputContainer.appendChild(line);
    otpFieldsContainer.appendChild(otpInputContainer);

    otpInput.addEventListener('input', (event) => {
      if (event.target.value.trim() !== '') {
        event.target.nextElementSibling.style.display = 'none';
      } else {
        event.target.nextElementSibling.style.display = 'block';
      }
    });
  }
  otpVerifyContainer.appendChild(otpFieldsContainer);

  const otpVerifyButton = document.createElement('button');
  otpVerifyButton.textContent = placeholders.otpVerifyLinkButton || 'Verify & link';
  otpVerifyButton.classList.add('otp-verify-button');
  otpVerifyButton.disabled = true;
  otpVerifyContainer.appendChild(otpVerifyButton);

  const otpMessageContainer = document.createElement('p');
  otpMessageContainer.textContent = placeholders.egiftOtpError || 'Incorrect OTP entered. Please try again.';
  otpMessageContainer.classList.add('otp-message-container');
  otpVerifyContainer.appendChild(otpMessageContainer);

  const resendCodeText = document.createElement('div');
  resendCodeText.textContent = placeholders.egiftResendCodeText || 'Didn\'t receive?';
  const resendCode = document.createElement('a');
  resendCode.href = '';
  resendCode.textContent = placeholders.egiftResendCode || 'Resend Code';
  resendCode.classList.add('resend-code');
  resendCodeText.appendChild(resendCode);
  otpVerifyContainer.appendChild(resendCodeText);

  form.innerHTML = '';
  form.appendChild(otpVerifyContainer);

  const changeCard = document.createElement('a');
  changeCard.href = '';
  changeCard.textContent = placeholders.egiftChangeCard || 'Change card?';
  changeCard.classList.add('change-card');
  form.appendChild(changeCard);

  document.querySelector('.account-egift-card > div > div > p:last-child').style.display = 'none';

  const otpInputs = form.querySelectorAll('.otp-input');
  otpInputs.forEach((input) => {
    input.addEventListener('input', (event) => {
      event.target.value = event.target.value.replace(/\D/g, '');
    });
  });

  const otpLine = form.querySelectorAll('.line');
  const otpVerifyButtonField = form.querySelector('.otp-verify-button');

  setupOtpValidation(otpInputs, otpVerifyButtonField, otpLine);

  otpVerifyButtonField.addEventListener('click', async (event) => {
    event.preventDefault();
    const otpCode = Array.from(otpInputs).map((i) => i.value).join('');
    await verifyOtpCode(otpCode, otpMessageContainer, egiftNumber);
  });

  resendCode.addEventListener('click', async (event) => {
    event.preventDefault();
    const otp = await sendOtpEmail(egiftNumber, placeholders);
    if (otp.response_type) {
      decorateOtpForm(form, egiftNumber, placeholders);
    }
  });
}

async function decorateReloadBlock(form, linkedGiftCards, placeholders) {
  const reloadBlock = document.createElement('div');
  reloadBlock.classList.add('egift-card-reload-container');

  const bottomWrapper = document.querySelector('.egift-card-info-bottom-container');
  const parent = bottomWrapper.parentNode;
  parent.replaceChild(reloadBlock, bottomWrapper);

  const topUpOptions = await getTopUpOptions();

  const reloadAmountOptions = document.createElement('div');
  reloadAmountOptions.classList.add('egift-card-reload-amount-options');
  reloadAmountOptions.id = 'reloadAmountOptions';
  reloadAmountOptions.innerHTML = topUpOptions.map((option) => `
  <input type="radio" id="amount${option}" name="reloadAmount" value="${option}">
`).join('');

  reloadBlock.innerHTML = `
      <div class="egift-card-reload-amount-wrapper">
          <h4>${placeholders.egiftReloadAmount || 'Choose Top-up Amount'}</h4>
          ${reloadAmountOptions.outerHTML}
          <div class="egift-card-reload-amount">
            <p>${placeholders.egiftCustomAmount || 'Or Enter Custom Top-up Amount'}</p>
            <div class="input-field-wrapper">
              <div class="input-wrapper input-field">
                <input type="number" class="egift-reload-amount" id="egiftReloadAmount" placeholder=" " min="50" max="10000" step="1">
                <label for="egiftReloadAmount">${placeholders.egiftEnterReloadAmount || 'Enter amount'}</label>
              </div>
            </div>
          </div>
      </div>
          <div class="egift-card-reload-button-container">
            <a class="egift-card-reload-cancel" id="egiftCardReloadCancel">${placeholders.cancel || 'CANCEL'}</a>
            <button type="submit" class="egift-card-reload-button" id="egiftCardReloadButton" disabled>${placeholders.topUp || 'Top up'}</button>
          </div>
      
      `;

  const reloadAmountRadios = document.querySelectorAll('input[type="radio"]');
  const reloadAmountInput = document.querySelector('#egiftReloadAmount');
  const reloadAmountButton = form.querySelector('#egiftCardReloadButton');

  // condition to enter amount only between minimum and maximum value without decimals
  const warningMessage = document.createElement('p');
  warningMessage.classList.add('warning-message');
  warningMessage.style.color = 'var(--color-primary-90)';
  warningMessage.style.display = 'none';
  warningMessage.style.visibility = 'hidden';
  warningMessage.textContent = 'Please enter amount in the range of 50 to 10000';

  reloadAmountInput.parentNode.appendChild(warningMessage);

  reloadAmountInput.addEventListener('input', () => {
    const { value } = reloadAmountInput;

    if (value % 1 !== 0 || value < 50 || value > 10000) {
      reloadAmountButton.disabled = true;
      warningMessage.style.display = 'block';
      warningMessage.style.visibility = 'visible';
    } else {
      reloadAmountButton.disabled = false;
      warningMessage.style.visibility = 'hidden';
    }

    // Deselect radio buttons if custom amount is entered
    reloadAmountRadios.forEach((radio) => {
      radio.checked = false;
    });
  });

  // Event listener to clear reload amount input and warning when radio button is selected
  reloadAmountRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      reloadAmountInput.value = '';
      warningMessage.style.display = 'none';
      reloadAmountButton.disabled = false;
      enableTopUpButton(form, reloadAmountInput, reloadAmountRadios, reloadAmountButton);
    });
  });

  const cancelButton = reloadBlock.querySelector('#egiftCardReloadCancel');
  cancelButton.addEventListener('click', () => {
    parent.replaceChild(bottomWrapper, reloadBlock);
  });

  // Add top up to the cart
  reloadAmountButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const topUpAmount = getTopUpAmount(reloadAmountRadios, reloadAmountInput);
    const egiftNumber = linkedGiftCards.card_number;
    const customer = await getCustomer();
    const res = await topUpGiftCardUser(topUpAmount, egiftNumber, customer.email);

    if (res.response_type === true) {
      checkoutTopUpEgift(res.digital_cart_id);
    } else {
      const message = placeholders.topUpError || 'An error occurred while adding top up to the cart.';
      showPageErrorMessage(message);
    }
  });
}

async function decorateUnlinkedForm(form, placeholders) {
  document.querySelector('.account-egift-card > div').style.display = 'block';
  document.querySelector('#egiftContainer').className = 'egift-unlinked-container';

  form.innerHTML = `
      <div class="input-field-wrapper">
        <div class="input-wrapper input-field">
          <input type="text" inputmode="numeric" pattern="\\d{16}" class="egift-number" id="egiftNumber" placeholder=" " aria-label="${placeholders.egiftCardNumber || 'eGift Card Number'}" required>
          <label for="egiftNumber">${placeholders.egiftNumber || 'eGift Card Number'}</label>
        </div>
      </div>
      <div class="input-field-wrapper">
        <div class="input-wrapper input-field">
          <input type="number" class="egift-otp" id="egiftOtp" required minlength="6" maxlength="6" style="display: none">
          <label for="egiftOtp" id="egiftOtpLabel" style="display: none">${placeholders.enterVerificationCode || 'Enter verification code'}</label>
        </div>
      </div>
      <button type="submit" class="get-code" id="getCode">${placeholders.getCode || 'Get code'}</button>
      <button type="submit" class="verify-code" id="verifyCode" style="display: none">${placeholders.verify || 'Verify'}</button>
  `;

  // event listener to restrict input to digits only and not allow non-digit character
  const egiftNumberInput = document.getElementById('egiftNumber');

  egiftNumberInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');

    if (e.target.value.length > 16) {
      e.target.value = e.target.value.slice(0, 16);
    }
  });
  form.setAttribute('novalidate', '');

  form.querySelectorAll('input').forEach((input) => {
    setErrorMessageForField(input, placeholders);
  });

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      validateInput(input);
    });
  });

  form.querySelector('#getCode').addEventListener('click', async (event) => {
    event.preventDefault();
    if (!validateInput(egiftNumberInput)) {
      return;
    }
    const egiftInput = form.querySelector('#egiftNumber');
    const egiftNumber = egiftInput.value;
    const egiftErrorMsg = placeholders.egiftInvalidCard || 'Invalid card number. Please try again.';

    const otp = await sendOtpEmail(egiftNumber, placeholders);

    if (otp.response_type) {
      decorateOtpForm(form, egiftNumber, placeholders);
    } else {
      showErrorMessage(egiftInput, otp.response_message || egiftErrorMsg);
    }
  });
}

async function unlinkModal(form, placeholders) {
  const unlinkTitle = '';
  const unlinkModalContent = document.createElement('div');
  unlinkModalContent.classList.add('unlink-modal-content');

  unlinkModalContent.innerHTML = `
    <span class="unlink-modal-title">${placeholders.unlinkModalTitle || 'Do you want to unlink this card from this account?'}</span>
    <div class="unlink-buttons">
      <button class="unlink-cancel secondary" aria-label="${placeholders.egiftUnlinkCancel || 'No'}">${placeholders.egiftUnlinkCancel || 'No'}</button>
      <button class="unlink-confirm" aria-label="${placeholders.egiftUnlinkConfirm || 'Yes'}">${placeholders.egiftUnlinkConfirm || 'Yes'}</button>
    </div>`;
  await createModalFromContent('unlinkEgiftModal', unlinkTitle, unlinkModalContent.outerHTML, ['unlink-egift-modal'], '', '', 'icon-close-black');

  // swapping buttons
  const unlinkModalContainer = document.querySelector('.unlink-buttons');
  const buttonNo = unlinkModalContainer.querySelector('.unlink-cancel');
  const buttonYes = unlinkModalContainer.querySelector('.unlink-confirm');
  unlinkModalContainer.insertBefore(buttonYes, buttonNo);

  document.querySelector('.unlink-egift-modal .unlink-cancel').addEventListener('click', () => {
    closeModal('unlinkEgiftModal');
  });

  document.querySelector('.unlink-egift-modal .unlink-confirm').addEventListener('click', async () => {
    closeModal('unlinkEgiftModal');
    try {
      const res = await unlinkGiftCard();
      if (res.response_type === true) {
        const message = placeholders.egiftUnlinkSuccess || 'eGift card unlinked successfully.';
        showToastNotification(message);
        await decorateUnlinkedForm(form, placeholders);
      } else {
        showPageErrorMessage(res.response_message);
      }
    } catch (error) {
      showPageErrorMessage(placeholders.egiftUnlinkError || 'An error occurred while unlinking the eGift Card');
    }
  });
  openModal('unlinkEgiftModal');
}

async function decorateLinkedForm(form, linkedGiftCards, placeholders) {
  document.querySelector('.account-egift-card > div').style.display = 'none';
  document.querySelector('#egiftContainer').className = 'egift-linked-container';

  form.innerHTML = `
<div class="egift-card-info-top-container">
  <div class="egift-image-balance">
    <img id="egiftCardImage" alt="eGift Card">
    <div class="egift-card-card">
      <h3 id="myEgiftCard"></h3>
      <div class="egift-card-balance-wrapper">
        <div class="egift-card-balance" id="egiftCardBalance">${placeholders.balance || 'Balance: '}</div>
      </div>
    </div>
  </div>
  <a class="egift-card-unlink" id="egiftCardUnlink"></a>
</div>
<div class="egift-card-info-bottom-container">
  <div class="egift-card-number">
    <h5>${placeholders.egiftNumber || 'eGift Card Number'}</h5>
    <div class="egift-card-number" id="egiftCardNumber"></div>
  </div>
  <div class="egift-card-expiry">
    <h5>${placeholders.expiresOn || 'Expires on'}</h5>
    <div class="egift-card-expiry" id="egiftCardExpiry"></div>
  </div>
  <div class="egift-card-type">
    <h5>${placeholders.cardType || 'Card Type'}</h5>
    <div class="egift-card-type" id="egiftCardType"></div>
  </div>
  <button type="submit" class="egift-card-reload" id="egiftCardReload">${placeholders.reload || 'Top up'}</button>
</div> 
    `;
  const expiryDate = await formatDateToCurrentLocale(linkedGiftCards.expiry_date);
  const currency = await getConfigValue('currency') || 'AED';
  const balance = await formatPrice(currency, linkedGiftCards.current_balance);

  form.querySelector('#egiftCardImage').src = linkedGiftCards.card_image;
  form.querySelector('#myEgiftCard').textContent = linkedGiftCards.response_message;
  form.querySelector('#egiftCardBalance').textContent += balance;
  form.querySelector('#egiftCardNumber').textContent = linkedGiftCards.card_number;
  form.querySelector('#egiftCardExpiry').textContent = expiryDate;
  form.querySelector('#egiftCardType').textContent = linkedGiftCards.card_type;

  const unlinkButton = form.querySelector('#egiftCardUnlink');
  unlinkButton.addEventListener('click', async (event) => {
    event.preventDefault();
    await unlinkModal(form, placeholders);
  });
  const reloadButton = form.querySelector('#egiftCardReload');
  reloadButton.addEventListener('click', async (event) => {
    event.preventDefault();
    decorateReloadBlock(form, linkedGiftCards, placeholders);
  });
}

export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';
  const redirectUrl = `/${lang}/user/login`;
  const placeholders = await fetchPlaceholdersForLocale();

  if (!isLoggedInUser()) {
    window.location = redirectUrl;
  }

  const form = document.createElement('form');
  form.id = 'egiftCardForm';
  const egiftContainer = document.createElement('div');
  egiftContainer.id = 'egiftContainer';

  block.classList.add('loader');
  getLinkedGiftCards().then((linkedGiftCards) => {
    if (!linkedGiftCards) {
      showPageErrorMessage(placeholders.egiftLinkedCardsError || 'Unable to fetch eGift card details. Please try again later.');
    }
    if (linkedGiftCards?.response_type) {
      decorateLinkedForm(form, linkedGiftCards, placeholders);
    } else {
      decorateUnlinkedForm(form, placeholders);
    }
    document.querySelector('.block.account-egift-card').classList.remove('loader');
  });

  egiftContainer.appendChild(form);
  block.appendChild(egiftContainer);
}
