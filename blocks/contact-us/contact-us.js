import { fetchPlaceholdersForLocale } from '../../scripts/scripts.js';
import {
  setErrorMessageForField, validateForm, validateInput, showPageErrorMessage,
  customSelectbox,
  addRecaptchaScript,
  validateReCaptchaV3,
  validatePhone,
  validateAddressDropdowns,
  EMAIL_PATTERN,
  showErrorMessage,
} from '../../scripts/forms.js';
import { decorateIcons } from '../../scripts/aem.js';
import { getConfigValue } from '../../scripts/configs.js';
import { performCommerceRestMutation } from '../../scripts/commerce.js';
import {
  getMaxLengthByCountryCode,
  getCountryIso,
} from '../../scripts/helpers/country-list.js';

async function createUrl(endpoint) {
  const [baseUrl, storeViewCode] = await Promise.all(
    [getConfigValue('commerce-rest-endpoint'),
      getConfigValue('commerce-store-view-code')],
  );
  const url = `${baseUrl}/${storeViewCode}/V1/${endpoint}`;

  return url;
}

async function submitContactForm(variables, redirectUrl, placeholders, form) {
  const url = await createUrl('send-email');
  const response = await performCommerceRestMutation(url, variables);
  if (response.success) {
    const redirectPath = new URL(redirectUrl);
    window.location.href = redirectPath.pathname;
  } else {
    showPageErrorMessage(placeholders.contactUsError || 'An error occurred. Please try again later.');
    form.querySelector('button').classList.remove('loader');
    return null;
  }

  return response;
}

export default async function decorate(block) {
  const placeholders = await fetchPlaceholdersForLocale();
  const form = document.createElement('form');
  const redirectUrl = block.querySelector(':scope > div:first-child a')?.href;
  const feedbackDropdown = {};
  block.querySelectorAll(':scope > div:not(:first-child)').forEach((item) => {
    const itemKey = item.querySelector('div:first-of-type').textContent.trim();
    const subItems = item.querySelectorAll('div:not(:first-of-type) li');
    if (subItems) {
      const values = Array.from(subItems).map((li) => li.textContent.trim());
      feedbackDropdown[itemKey] = values;
    }
  });

  block.innerHTML = '';

  const countryCode = await getConfigValue('country-code');
  const maxLength = await getMaxLengthByCountryCode(countryCode);
  const countryPrefix = `+${await getCountryIso(countryCode)}`;
  const pattern = '[0-9]*';
  const contactEmails = await getConfigValue('contact-emails');

  form.innerHTML = `
  <div class="input-field-wrapper notransistion communication-channel">
    <div class="input-wrapper input-field">
    <label for="communication-channel">${placeholders.contactUsCommunicationChannel || 'Select Your Prefered Communication Channel'} </label>
      <div class="radio-button-wrapper">
          <div>
              <span class="icon icon-radio-icon communication-option radio-active"></span>
              <span data-value="email">${placeholders.contactUsChannelEmail || 'Email'}</span>
          </div>
          <div>
              <span class="icon icon-radio-icon communication-option"></span>
              <span data-value="mobile">${placeholders.contactUsChanelMobile || 'Mobile'}</span>
          </div>
        </div>
     </div>
  </div>
<div class="input-field-wrapper">
  <div class="input-wrapper">
    <input type="text" id="firstname" class="firstname" name="firstname" placeholder=" " aria-label="${placeholders.contactFirstname || 'First Name'}" required autocomplete="firstname" />
    <label for="firstname">${placeholders.contactUsFirstname || 'First Name'}</label>
  </div>
</div>
<div class="input-field-wrapper">
  <div class="input-wrapper">
    <input type="text" id="lastname" class="lastname" name="lastname" placeholder=" " aria-label="${placeholders.contactUsLastname || 'Last Name'}" required autocomplete="lastname" />
    <label for="lastname">${placeholders.contactUsLastname || 'Last Name'}</label>
  </div>
</div>
<div class="input-field-wrapper phonevalidation notransistion">
  <label for="phone">${placeholders.contactUsMobileNumber || 'Mobile Number'}</label>
    <div class="input-wrapper input-field input-phone-prefix">             
      <label for="mobile" class="countrycode">${countryPrefix}</label>
      <input type="tel" id="mobile" name="mobile" placeholder=" " data-phone-prefix="${countryPrefix}" aria-label="${placeholders.contactUsMobileNumber || 'Mobile Number'}" pattern='${pattern}' maxlength='${maxLength}' required>
    </div>
</div>
<div class="input-field-wrapper">
    <div class="input-wrapper input-field">
        <input type="email" id="email" name="email" placeholder="" aria-label="${placeholders.contactUsEmail || 'Email'}" required pattern="${EMAIL_PATTERN}" autocomplete="email">
        <label for="email">${placeholders.contactUsEmail || 'Email'}</label>
    </div>
</div>
<div class="input-field-wrapper dropdown notransistion feedback"> 
  <div class="input-wrapper input-field">
    <label for="feedback">${placeholders.contactUsFeedbackLabel || 'Select Feedback'}</label>
    <div class="custom-select feedback-select" aria-label="${placeholders.contactUsSelectFeedbackAria || 'Feedback'}">
      <div class="select-selected" data-field="feedback">${placeholders.contactUsSelectFeedback || 'Select Feedback'}</div>
        <div class="select-items select-hide">
          <div data-value="" disabled>${placeholders.contactUsSelectFeedback || 'Select Feedback'}</div>
          <div data-value="online-shopping">${placeholders.contactUsFeedbackShopping || 'Online Shopping'}</div>
          <div data-value="feedback-inquiry">${placeholders.contactUsFeedbackInquiry || 'Feedback Inquiry'}</div>
        </div>
    </div>
  </div>
</div>
<div class="hidden">
  <div class="input-field-wrapper dropdown notransistion feedback-type"> 
    <div class="input-wrapper input-field">
      <label for="type">${placeholders.contactUsFeedbackType || 'Select Type'}</label>
      <div class="custom-select feedback-type-select" aria-label="${placeholders.contactUsSelectFeedbackTypeAria || 'Type'}">
        <div class="select-selected" data-field="feedback-type">${placeholders.contactUsSelectFeedbackType || 'Select Type'}</div>
          <div class="select-items select-hide">
            <div data-value="" disabled>${placeholders.contactUsSelectFeedbackType || 'Select Type'}</div>
            <div data-value="complaint">${placeholders.contactUsFeedbackTypeComplaint || 'Complaint'}</div>
            <div data-value="inquiry">${placeholders.contactUsFeedbackTypeInquiry || 'Inquiry'}</div>
          </div>
      </div>
    </div>
  </div>
</div>
<div class="hidden">
  <div class="input-field-wrapper dropdown notransistion feedback-reason"> 
    <div class="input-wrapper input-field">
      <label for="reason">${placeholders.contactUsFeedbackReason || 'Select Reason'}</label>
      <div class="custom-select feedback-reason-select" aria-label="${placeholders.contactUsSelectFeedbackReasonAria || 'Reason'}">
        <div class="select-selected" data-field="feedback-reason">${placeholders.contactUsSelectFeedbackReason || 'Select Reason'}</div>
          <div class="select-items select-hide"></div>     
      </div>
    </div>
  </div>
</div>
<div class="input-field-wrapper">
  <div class="input-wrapper">
    <input type="text" id="ordernumber" class="ordernumber" name="ordernumber" placeholder=" " aria-label="${placeholders.contactUsOrdernumber || 'Order Number (Optional)'}" maxlength="20"/>
    <label for="ordernumber">${placeholders.contactUsOrdernumber || 'Order Number (Optional)'}</label>
  </div>
</div>
<div class="input-field-wrapper">
  <div class="input-wrapper">
    <input type="text" id="missingitems" class="missingitems" name="missingitems" placeholder=" " aria-label="${placeholders.contactUsMissingitems || 'Missing Items (Optional)'}" maxlength="20"/>
    <label for="missingitems">${placeholders.contactUsMissingitems || 'Missing Items (Optional)'}</label>
  </div>
</div>
<div class="input-field-wrapper">
  <div class="input-wrapper">
    <textarea id="message" class="message" name="message" placeholder=" " aria-label="${placeholders.contactUsMessage || 'Message'}" required maxlength="220"></textarea>
    <label for="message">${placeholders.contactUsMessage || 'Message'}</label>
  </div>
</div>
   <button type="submit" class="contact-submit"><span>${placeholders.contactUsSubmit || 'Submit'}</span></button>
  `;

  customSelectbox(form);
  const siteKey = await getConfigValue('recaptchaV3-sitekey');
  addRecaptchaScript(siteKey);

  form.noValidate = true;

  form.querySelectorAll('input, textarea').forEach((input) => {
    setErrorMessageForField(input, placeholders);
    input.addEventListener('input', () => {
      validateInput(input);
    });
  });

  const textareaMessage = form.querySelector('.message');

  textareaMessage.addEventListener('input', () => {
    textareaMessage.style.height = `${textareaMessage.scrollHeight}px`;
  });

  const communicationOptions = form.querySelectorAll('.communication-option');

  communicationOptions.forEach((option) => {
    option.addEventListener('click', (event) => {
      communicationOptions.forEach((item) => {
        item.classList.remove('radio-active');
        item.classList.add('radio-inactive');
      });
      event.currentTarget.classList.add('radio-active');
      event.currentTarget.classList.remove('radio-inactive');
    });
  });

  const feedbackSelect = form.querySelector('.feedback-select .select-items');
  const typeSelect = form.querySelector('.feedback-type-select .select-items');
  const reasonSelect = form.querySelector('.feedback-reason-select');
  const reasonSelectItems = form.querySelector('.feedback-reason-select .select-items');
  let typeOptions = {};
  let reasonOptions = [];

  const updateAndResetDropdown = (dropdown, placeholderText) => {
    const selectedElement = dropdown.querySelector('.select-selected');
    selectedElement.textContent = placeholderText;
    selectedElement.dataset.value = '';
  };

  const updateReasonDropdown = (options) => {
    reasonSelectItems.innerHTML = '';
    const defaultOption = document.createElement('div');
    defaultOption.dataset.value = '';
    defaultOption.textContent = placeholders.contactUsSelectFeedbackReason || 'Select Reason';
    defaultOption.setAttribute('disabled', '');
    reasonSelectItems.appendChild(defaultOption);

    options.forEach((option) => {
      const reasonOption = document.createElement('div');
      reasonOption.dataset.value = option.toLowerCase().replace(/\s/g, '-');
      reasonOption.textContent = option;
      reasonSelectItems.appendChild(reasonOption);
    });
  };

  const handleTypeSelection = (selectedValue) => {
    const typeMap = {
      'online-shopping': Object.keys(feedbackDropdown)
        .filter((key) => key.startsWith('online-shopping'))
        .reduce((result, key) => ({ ...result, [key]: feedbackDropdown[key] }), {}),
      'feedback-inquiry': Object.keys(feedbackDropdown)
        .filter((key) => key.startsWith('feedback-inquiry'))
        .reduce((result, key) => ({ ...result, [key]: feedbackDropdown[key] }), {}),
    };

    typeOptions = typeMap[selectedValue] || {};
    const typePrefix = `${selectedValue}-`;

    typeSelect?.addEventListener('click', (e) => {
      if (e.target.dataset.value === '') {
        updateAndResetDropdown(reasonSelect, `${placeholders.contactUsSelectFeedbackReason || 'Select Reason'}`);
        form.querySelector('.feedback-reason').parentElement.classList.add('hidden');
      } else {
        updateAndResetDropdown(reasonSelect, `${placeholders.contactUsSelectFeedbackReason || 'Select Reason'}`);

        const selectedType = `${typePrefix}${e.target.dataset.value}`;
        reasonOptions = typeOptions[selectedType] || [];
        updateReasonDropdown(reasonOptions);

        form.querySelector('.feedback-reason').parentElement.classList.remove('hidden');
      }
    });

    return typeOptions;
  };

  feedbackSelect?.addEventListener('click', (event) => {
    const selectedValue = event.target.dataset.value;

    if (selectedValue === '') {
      updateAndResetDropdown(form.querySelector('.feedback-type-select'), `${placeholders.contactUsSelectFeedbackType || 'Select Type'}`);
      updateAndResetDropdown(reasonSelect, `${placeholders.contactUsSelectFeedbackReason || 'Select Reason'}`);

      form.querySelector('.feedback-type').parentElement.classList.add('hidden');
      form.querySelector('.feedback-reason').parentElement.classList.add('hidden');

      form.querySelector('.feedback-select .select-selected').textContent = placeholders.contactUsSelectFeedback || 'Select Feedback';
    } else {
      reasonSelectItems.innerHTML = '';
      updateAndResetDropdown(form.querySelector('.feedback-type-select'), `${placeholders.contactUsSelectFeedbackType || 'Select Type'}`);
      updateAndResetDropdown(reasonSelect, `${placeholders.contactUsSelectFeedbackReason || 'Select Reason'}`);

      form.querySelector('.feedback-type').parentElement.classList.remove('hidden');

      typeOptions = handleTypeSelection(selectedValue);
      form.querySelector('.feedback-select .select-selected').textContent = event.target.textContent;
      feedbackSelect.classList.add('select-hide');
    }
  });

  reasonSelect?.addEventListener('click', (event) => {
    const reasonSelectSelected = event.target.dataset.value;
    if (reasonSelectSelected) {
      if (reasonSelectSelected === '') {
        reasonSelect.querySelector('.select-selected').textContent = placeholders.contactUsSelectFeedbackReason || 'Select Reason';
        return;
      }
      reasonSelect.querySelector('.select-selected').textContent = event.target.textContent;
      reasonSelect.querySelector('.select-selected').dataset.value = reasonSelectSelected.toLowerCase().replace(/\s/g, '-');
    } else {
      reasonSelect.querySelector('.select-selected').textContent = event.target.textContent;
      reasonSelect.querySelector('.select-selected').dataset.value = '';
    }
  });

  reasonSelectItems?.addEventListener('click', () => {
    reasonSelectItems.classList.add('select-hide');
  });

  const phoneInput = form.querySelector('#mobile');
  phoneInput.addEventListener('input', async () => {
    phoneInput.value = phoneInput.value.replace(/[^0-9]/g, '');
    if (phoneInput.value.length >= phoneInput.maxLength) {
      const isValidPhoneNumber = await validatePhone(
        phoneInput.value,
        countryCode,
      );
      let phoneErrorMessage = placeholders.contactUsInvalidMobileNumber || `The number provided ${phoneInput.value} is not a valid mobile number.`;
      phoneErrorMessage = phoneErrorMessage.replace('{{mobile}}', phoneInput.value);

      if (!isValidPhoneNumber) {
        showErrorMessage(phoneInput, phoneErrorMessage);
      }
    }
  });

  form.querySelectorAll('.custom-select').forEach((dropdown) => {
    setErrorMessageForField(dropdown, placeholders);
    dropdown.addEventListener('click', () => {
      validateAddressDropdowns(form, placeholders);
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = document.querySelector('.contact-submit');
    const validateDropdown = await validateAddressDropdowns(form, placeholders);
    if (!validateForm(form, placeholders)) {
      return;
    }
    if (!validateDropdown) {
      return;
    }

    form.querySelector('button').classList.add('loader');
    const data = new FormData(form);
    const variables = {
      email: contactEmails,
      content: {},
    };
    variables.content.name = `${data.get('firstname')} ${data.get('lastname')}`;
    variables.content.email = data.get('email');
    variables.content.phone_number = `${countryPrefix}${data.get('mobile')}`;
    variables.content.specific_request = form.querySelector('.feedback-select .select-selected')?.innerHTML;
    variables.content.request_type = form.querySelector('.feedback-type-select .select-selected')?.innerHTML;
    variables.content.request_reason = form.querySelector('.feedback-reason-select .select-selected')?.innerHTML;
    variables.content.ordernumber = data.get('ordernumber');
    variables.content.missingitems = data.get('missingitems');
    variables.content.message = data.get('message');
    variables.content.communication_channel = form.querySelector('.communication-option.radio-active').nextElementSibling.dataset.value;
    variables.content.prefered_channel = 'web';
    variables.content.country = countryCode;
    variables.content.number_of_persons = '';
    variables.content.date = '';

    const bypassRecaptcha = await getConfigValue('recaptcha-bypass');
    if (bypassRecaptcha === 'true') {
      submitContactForm(variables, redirectUrl, placeholders, form);
      return;
    }
    // eslint-disable-next-line no-undef
    await grecaptcha.ready(async () => {
      // eslint-disable-next-line no-undef
      const token = await grecaptcha.execute(siteKey, { action: 'submit' });
      if (!token) {
        showPageErrorMessage(placeholders.recaptchaErrorMessage || 'Verification failed. Please try again.');
        return;
      }
      const captchaValidated = await validateReCaptchaV3(token, submitButton);
      if (captchaValidated) {
        submitContactForm(variables, redirectUrl, placeholders, form);
      } else {
        submitButton?.classList.remove('loader');
        const recaptchaErrorMessage = placeholders.recaptchaErrorMessage || 'Verification failed. Please try again.';
        showPageErrorMessage(recaptchaErrorMessage);
      }
    });
  });
  const contactUsContainer = document.createElement('div');
  contactUsContainer.classList.add('contactus-container');
  contactUsContainer.appendChild(form);
  decorateIcons(contactUsContainer);

  block.appendChild(contactUsContainer);
}
