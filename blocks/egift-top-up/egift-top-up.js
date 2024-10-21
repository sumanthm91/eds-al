import { fetchPlaceholdersForLocale } from '../../scripts/scripts.js';
import { topUpGiftCardGuest } from '../../scripts/giftcart/api.js';
import {
  getTopUpAmount, enableTopUpButton, getTopUpOptions, checkoutTopUpEgift,
} from '../../scripts/giftcart/helper.js';
import { getConfigValue } from '../../scripts/configs.js';
import { decorateIcons } from '../../scripts/aem.js';
import {
  resetMessage,
  setErrorMessageForField, showErrorMessage, validateInput,
} from '../../scripts/forms.js';

export default async function decorate(block) {
  const placeholders = await fetchPlaceholdersForLocale();

  const form = document.createElement('form');

  const topUpOptions = await getTopUpOptions();

  const topUpAmountOptions = document.createElement('div');
  topUpAmountOptions.classList.add('egift-top-up-amount-options', 'input-wrapper', 'input-field');
  topUpAmountOptions.id = 'topUpAmountOptions';
  topUpAmountOptions.innerHTML = topUpOptions.map((option) => `
  <input type="radio" class="top-up-amount-radio" name="topUpAmount" value="${option}">
`).join('');

  const customAmountOption = document.createElement('input');
  customAmountOption.type = 'radio';
  customAmountOption.id = 'customAmount';
  customAmountOption.value = placeholders.egiftTopUpCustomAmount || 'Custom Amount';
  const currency = await getConfigValue('currency') || 'AED';

  topUpAmountOptions.appendChild(customAmountOption);

  form.innerHTML = `
      <h3>${placeholders.egiftTopUpCardDetails || 'Card Details'}</h3>
      <div class="input-field-wrapper">
        <div class="input-wrapper input-field">
            <input type="text" class="egift-card-number" id="egiftCardNumber" placeholder=" " aria-label="${placeholders.egiftCardNumber || 'eGift Card Number'}" required pattern="\\d{16}">
            <label for="egiftCardNumber">${placeholders.egiftCardNumber || 'eGift Card Number'}</label>
        </div>
      </div>
      <div class="egift-top-up-amount-wrapper">
          <h4>${placeholders.egiftReloadAmount || 'Choose Top-up Amount'}</h4>
          <div class="input-field-wrapper">
            ${topUpAmountOptions.outerHTML}
          </div>
          <div class="egift-top-up-amount">
            <p>${placeholders.egiftCustomAmount || 'Custom Amount'}</p>
            <div class="input-field-wrapper">
              <div class="input-wrapper input-field">
                <input 
                  type="number" 
                  class="top-up-amount" 
                  id="egiftTopUpAmount" 
                  placeholder=" " 
                  aria-label="${placeholders.amount || 'amount'}" 
                  required
                  pattern="\\d*"
                  min="${placeholders.egiftTopUpMin || '100'}" 
                  max="${placeholders.egiftTopUpMax || '10000'}"
                >
                <label for="egiftTopUpAmount">${placeholders.egiftEnterReloadAmount || 'Enter amount'}</label>
                <span class="topup-amount-currency hide">${currency}</span>
              </div>
            </div>
          </div>
      </div>
      <div class="egift-top-up-button-container">
        <button type="submit" class="egift-top-up-button" id="egiftTopUpButton" disabled>${placeholders.topUp || 'Top up'}</button>
      </div>
  `;

  form.setAttribute('novalidate', '');

  form.querySelectorAll('input').forEach((input) => {
    setErrorMessageForField(input, placeholders);
  });

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      validateInput(input);
    });
  });

  const topUpOptionsRadios = form.querySelectorAll('#topUpAmountOptions .top-up-amount-radio');
  const customAmountRadio = form.querySelector('#customAmount');
  const customAmountInputWrapper = form.querySelector('.egift-top-up-amount');
  const customAmountInput = form.querySelector('#egiftTopUpAmount');

  const egiftCardNumberInput = form.querySelector('#egiftCardNumber');
  const egiftTopUpButton = form.querySelector('#egiftTopUpButton');

  // Event listener to deselect top up radios when custom amount is selected
  customAmountRadio.addEventListener('change', () => {
    customAmountInputWrapper.style.display = 'block';
    topUpOptionsRadios.forEach((radio) => {
      radio.checked = false;
    });
  });

  // Event listener to disable custom amount input when radio button is selected
  topUpOptionsRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      customAmountInput.value = '';
      resetMessage(customAmountInput);

      if (window.matchMedia('(max-width: 767px)').matches) {
        customAmountInputWrapper.style.display = 'none';
        customAmountRadio.checked = false;
      }
    });
  });

  // Event listener to deselect top up options when custom amount is entered (desktop)
  customAmountInput.addEventListener('input', () => {
    const reloadAmountOptionsRadios = document.querySelectorAll('#topUpAmountOptions input[type="radio"]');
    reloadAmountOptionsRadios.forEach((radio) => {
      radio.checked = false;
    });
  });

  customAmountInput.addEventListener('focusin', () => {
    document.querySelector('.topup-amount-currency').classList.remove('hide');
  });
  customAmountInput.addEventListener('focusout', () => {
    if (!customAmountInput.value) {
      document.querySelector('.topup-amount-currency').classList.add('hide');
    }
  });

  // eGift card number input validation
  egiftCardNumberInput.addEventListener('input', () => {
    let inputValue = egiftCardNumberInput.value.replace(/\D/g, '');
    if (inputValue.length > 16) {
      inputValue = inputValue.slice(0, 16);
    }
    egiftCardNumberInput.value = inputValue;
  });

  // Custom amount input validation
  customAmountInput.addEventListener('input', () => {
    const inputValue = customAmountInput.value.replace(/\D/g, '');
    customAmountInput.value = inputValue;
  });

  // Event listeners to enable top up button
  egiftCardNumberInput.addEventListener('input', () => {
    enableTopUpButton(
      form,
      customAmountInput,
      topUpOptionsRadios,
      egiftTopUpButton,
      egiftCardNumberInput,
    );
  });
  topUpOptionsRadios.forEach((radio) => {
    radio.addEventListener('change', () => {
      enableTopUpButton(
        form,
        customAmountInput,
        topUpOptionsRadios,
        egiftTopUpButton,
        egiftCardNumberInput,
      );
    });
  });
  customAmountInput.addEventListener('input', () => {
    enableTopUpButton(
      form,
      customAmountInput,
      topUpOptionsRadios,
      egiftTopUpButton,
      egiftCardNumberInput,
    );
  });

  // Add top up to the cart
  egiftTopUpButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const topUpAmount = getTopUpAmount(topUpOptionsRadios, customAmountInput);
    const egiftCardNumber = egiftCardNumberInput.value;
    const res = await topUpGiftCardGuest(topUpAmount, egiftCardNumber);

    if (res.response_type === true) {
      checkoutTopUpEgift(res.digital_cart_id);
      return;
    }

    const message = placeholders.topUpFailedMessage || 'The card number entered is invalid. Please check you\'ve entered the number correctly or try a different card.';
    showErrorMessage(egiftCardNumberInput, message);
  });
  decorateIcons(form);
  block.appendChild(form);
}
