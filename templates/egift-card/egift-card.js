import { loadCSS } from '../../scripts/aem.js';
import { getConfigValue } from '../../scripts/configs.js';
import { showErrorMessage, validateInput } from '../../scripts/forms.js';
import { getGiftCardBalanceSendOtp, getGiftCardBalanceVerifyOtp } from '../../scripts/giftcart/api.js';
import {
  closeModal, createModal, fetchPlaceholdersForLocale, formatPrice, getLanguageAttr, openModal,
} from '../../scripts/scripts.js';

const EGIFT_BALANCE_MODAL_ID = 'egift-check-balance';

async function showBalance(modalContent, data, placeholders) {
  const currency = await getConfigValue('currency');
  modalContent.innerHTML = `
    <p class="grey">${placeholders.egiftBalanceModalCurrentBalance || 'Here is your current balance'}</p>
    <p class="highlight">${await formatPrice(currency, data.current_balance)}</p>
    <p class="grey">${placeholders.egiftBalanceModalCardEnding || 'For eGift Card ending in ...'}${data.card_number.substr(data.card_number.length - 4)}</p>
    <p>${placeholders.egiftBalanceModalCardValid || 'Card valid upto'} ${data.expiry_date}</p>
  `;
  const topupBtn = document.createElement('button');
  topupBtn.id = 'egift-balance-topup';
  topupBtn.innerText = placeholders.egiftBalanceModalTopupButton || 'Top Up Card';
  topupBtn.addEventListener('click', async (evt) => {
    evt.preventDefault();
    window.location.href = `/${getLanguageAttr()}/egift-card/top-up`;
  });
  const checkOtherBtn = document.createElement('button');
  checkOtherBtn.classList.add('secondary');
  checkOtherBtn.id = 'egift-balance-check-other';
  checkOtherBtn.innerText = placeholders.egiftBalanceModalCheckOtherButton || 'Check Another Card';
  checkOtherBtn.addEventListener('click', async (evt) => {
    evt.preventDefault();
    await closeModal(EGIFT_BALANCE_MODAL_ID);
    // eslint-disable-next-line no-use-before-define
    await openBalanceModal(placeholders);
  });
  modalContent.appendChild(topupBtn);
  modalContent.appendChild(checkOtherBtn);
}

async function openBalanceModal(placeholders) {
  const modalTitle = placeholders.egiftBalanceModalTitle || 'Check Balance & Validity';
  const modalContent = document.createElement('div');
  modalContent.classList.add('egift-balance-modal-content');
  const modalSummary = document.createElement('p');
  modalSummary.innerText = placeholders.egiftBalanceModalSummary || 'Enter gift card details to check balance & validity.';
  modalContent.appendChild(modalSummary);
  const giftCardNumberPlaceholder = placeholders.egiftCardNumber || 'eGift Card Number';
  const otpPlaceholder = placeholders.egiftBalanceModalInputVerification || 'Enter Verification Code';
  const invalidNumberError = placeholders.egiftNumberInvalidError || 'Please enter a valid eGift card number.';
  const invalidOtpError = placeholders.egiftOtpInvalidError || 'Please enter a valid OTP number.';
  const form = document.createElement('form');
  form.id = 'egift-check-balance-form';
  form.classList.add('no-otp');
  form.innerHTML = `
    <div class="input-field-wrapper">
      <div class="input-wrapper input-field">
        <input type="number" id="egift-number" aria-label="${giftCardNumberPlaceholder}" required inputmode="numeric" maxlength="16" oninput="this.value=this.value.slice(0,this.maxLength)" pattern="\\d{16}" data-validation-required-message="${invalidNumberError}" data-validation-pattern-mismatch-message="${invalidNumberError}" />
        <label for="egift-number">${giftCardNumberPlaceholder}</label>
      </div>
      <div class="error-message"></div>
    </div>
    <div class="input-field-wrapper egift-verification-code">
      <div class="input-wrapper input-field">
        <input type="text" id="egift-verification-code" aria-label="${otpPlaceholder}" minlength="6" maxlength="6" autocomplete="one-time-code" inputmode="numeric" pattern="\\d{6}" 
          oninput="this.value = this.value.replace(/[^0-9]/g, '').replace(/(\\..*?)\\..*/g, '$1');"
          data-validation-required-message="${invalidOtpError}" data-validation-pattern-mismatch-message="${invalidOtpError}" data-validation-too-short-message="${invalidOtpError}" data-validation-too-long-message="${invalidOtpError}" />
        <label for="egift-verification-code">${otpPlaceholder}</label>
      </div>
      <div class="error-message"></div>
    </div>
    <button id="egift-balance-check-btn" type="submit">${placeholders.egiftBalanceModalCheckButton || 'Check now'}</button>
  `;
  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      validateInput(input);
    });
  });
  const labelNumber = form.querySelector('label[for="egift-number"]');
  form.querySelector('input#egift-number').addEventListener('input', (evt) => {
    labelNumber.classList.toggle('input-number', evt.target.value.length > 0);
  });
  const labelVerification = form.querySelector('label[for="egift-verification-code"]');
  form.querySelector('input#egift-verification-code').addEventListener('input', (evt) => {
    labelVerification.classList.toggle('input-number', evt.target.value.length > 0);
  });

  const checkBalanceBtn = form.querySelector('#egift-balance-check-btn');
  checkBalanceBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const { target } = e;
    const checkBalanceForm = target.closest('form');
    const cardNumberField = checkBalanceForm.querySelector('#egift-number');
    const otpField = checkBalanceForm.querySelector('#egift-verification-code');
    if (!validateInput(cardNumberField) || !validateInput(otpField)) {
      return;
    }
    const cardNumber = cardNumberField.value;
    const otpValue = otpField.value;
    const balanceCTAs = checkBalanceForm.closest('.egift-balance-modal-content').querySelector('.egift-balance-modal-ctas');
    let respData = null;
    const defaultErrorMsg = placeholders.egiftCheckBalanceError || 'There was an error processing your request. Please try again later.';
    target.disabled = true;
    try {
      if (cardNumber && otpValue) {
        respData = await getGiftCardBalanceVerifyOtp(cardNumber, otpValue);
        if (respData?.response_type && respData?.card_number === cardNumber) {
          await showBalance(target.closest('.egift-balance-modal-content'), respData, placeholders);
        } else {
          showErrorMessage(otpField, respData?.response_message || defaultErrorMsg);
        }
      } else if (cardNumber) {
        respData = await getGiftCardBalanceSendOtp(cardNumber);
        if (respData?.response_type && respData?.card_number === cardNumber) {
          checkBalanceForm.classList.remove('no-otp');
          balanceCTAs.classList.remove('no-otp');
          otpField.focus();
        } else {
          showErrorMessage(cardNumberField, respData?.response_message || defaultErrorMsg);
        }
      }
    } catch (err) {
      console.error(err);
      showErrorMessage(cardNumberField, defaultErrorMsg);
    }
    target.disabled = false;
  });
  modalContent.appendChild(form);
  const modalCtas = document.createElement('div');
  modalCtas.classList.add('egift-balance-modal-ctas');
  modalCtas.innerHTML = `
    <span class='resend-code'>
      ${placeholders.egiftBalanceModalNotReceive || 'Didn\'t receive?'} <a href="#" id="resend-code-link">${placeholders.egiftBalanceModalResendCode || 'Resend Code'}</a>
    </span>
    <span class='change-card'><a href="#" id="change-card-link">${placeholders.egiftBalanceModalChangeCard || 'Change Card?'}</a></span>
  `;
  modalCtas.querySelector('#change-card-link').addEventListener('click', async (evt) => {
    evt.preventDefault();
    await closeModal(EGIFT_BALANCE_MODAL_ID);
    await openBalanceModal(placeholders);
  });
  modalCtas.querySelector('#resend-code-link').addEventListener('click', async (evt) => {
    evt.preventDefault();
    const checkBalanceForm = document.querySelector('#egift-check-balance-form');
    const cardNumber = checkBalanceForm.querySelector('#egift-number').value;
    await getGiftCardBalanceSendOtp(cardNumber);
    const otpField = checkBalanceForm.querySelector('#egift-verification-code');
    otpField.value = '';
    otpField.focus();
    checkBalanceForm.classList.remove('no-otp');
  });
  checkBalanceBtn.insertAdjacentElement('beforebegin', modalCtas);
  await createModal(EGIFT_BALANCE_MODAL_ID, modalTitle, modalContent, ['egift-balance'], null, true);
  await openModal(EGIFT_BALANCE_MODAL_ID);
}

export default async function decorate(main) {
  const placeholders = await fetchPlaceholdersForLocale();
  const checkBalanceLink = document.querySelector('a[href$="/egift-card/check-balance"]');
  checkBalanceLink.addEventListener('click', async (evt) => {
    evt.preventDefault();
    loadCSS('/styles/forms.css');
    await openBalanceModal(placeholders);
  });

  return main;
}
