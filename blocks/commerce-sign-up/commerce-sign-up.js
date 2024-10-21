import { getConfigValue } from '../../scripts/configs.js';
import {
  isLoggedInUser,
  fetchPlaceholdersForLocale,
} from '../../scripts/scripts.js';
import { fetchStoreViews } from '../../scripts/customer/register-api.js';
import {
  getMaxLengthByCountryCode,
  getCountryIso,
} from '../../scripts/helpers/country-list.js';
import {
  togglePasswordVisibility,
  setErrorMessageForField,
  validateForm,
  validateInput,
  EMAIL_PATTERN,
  PASSWORD_PATTERN,
  FULLNAME_PATTERN,
  DATE_PATTERN,
  validatePhone,
  sendOtp,
  showErrorMessage,
  dateValidation,
  customSelectbox,
  phoneWithIso,
  showPageErrorMessage,
  addRecaptchaScript,
  validateReCaptchaV3,
  getErrorfields,
} from '../../scripts/forms.js';
import { datalayerLogin } from '../../scripts/analytics/google-data-layer.js';

import { decorateIcons } from '../../scripts/aem.js';

// handles sign up
async function signup(form, placeholders, lang, countryIso) {
  const commerceRestEndpoint = await getConfigValue('commerce-rest-endpoint');
  const storeCode = await getConfigValue('commerce-store-view-code');
  const storeViews = await fetchStoreViews();
  const storeView = storeViews.find((view) => view.code === storeCode);
  const websiteId = storeView?.website_id || 1;
  const storeId = storeView?.id || 1;
  const fullname = form.querySelector('#fullname').value;
  const [firstname, lastname] = fullname.split(' ');
  const email = form.querySelector('#username').value;
  const password = form.querySelector('#password').value;
  const isSubscribed = form.querySelector('#newsletter').checked;
  const dob = form.querySelector('#dateOfBirth').value;
  const customerGender = form.querySelector('.gender .select-selected').dataset.value;
  const phoneNumber = await phoneWithIso(countryIso);

  const response = await fetch(`${commerceRestEndpoint}/${storeCode}/V1/customers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customer: {
        email,
        firstname,
        lastname,
        websiteId,
        storeId,
        dob,
        custom_attributes: [
          { attribute_code: 'channel', value: 'web' },
          { attribute_code: 'phone_number', value: `${phoneNumber}` },
          { attribute_code: 'communication_preference', value: 'email' },
        ],
        extension_attributes: { is_subscribed: isSubscribed, is_verified: 'Y', customer_gender: customerGender },
      },
      password,
    }),
  });

  const data = await response.json();
  const errorContainer = form.querySelector('.error-container');
  const successContainer = form.querySelector('.success-container');
  if (response.ok && data?.email === email) {
    datalayerLogin('Registration Success', 'Email');
    errorContainer.innerHTML = '';
    successContainer.textContent = placeholders.signupSuccessMessage || `Account created successfully for ${data.firstname}. Redirecting to login page...`;
    successContainer.textContent = successContainer.textContent?.replace('{{}}', data.firstname);
    sessionStorage.setItem('userId', `${data.id}`);
    window.location.href = `/${lang}/user/complete?email=${email}&user=${data.id}`;
  } else {
    document.querySelector('.submit-container button.createNewAccountButton')?.classList.remove('loader');
    const errorMessage = `${data.message}`;
    if (errorMessage.includes('same email address')) {
      datalayerLogin('Registration Attempt', 'Email : invalid - email');
      showErrorMessage(form.querySelector('#username'), placeholders.alreadyTakenMail || 'The email address is already taken');
    } else {
      datalayerLogin('Registration Attempt', 'Email : valid');
    }
  }
}
export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';

  if (isLoggedInUser()) {
    window.location.href = `/${lang}/user/account`;
    return;
  }
  const validationRulesContent = block.querySelector('ul');
  if (validationRulesContent) {
    validationRulesContent.classList.add('validation-container', 'hide');
  }
  const placeholders = await fetchPlaceholdersForLocale();

  const market = await getConfigValue('country-code');
  const countryIso = await getCountryIso(market);

  const form = document.createElement('form');
  form.innerHTML = `
<div class="input-field-wrapper">
  <div class="input-wrapper">
    <input type="text" id="fullname" class="fullname" name="fullname" pattern="${FULLNAME_PATTERN}" placeholder=" " aria-label="${placeholders.fullname || 'Full Name'}" required autocomplete="fullname" />
    <label for="fullname">${placeholders.fullname || 'Full Name'}</label>
  </div>
</div>
<div class="input-field-wrapper">
  <div class="input-wrapper">
    <input type="email" id="username" name="username" pattern="${EMAIL_PATTERN}" aria-label="${placeholders.email || 'Email'}" placeholder=" " required autocomplete="email" />
    <label for="username">${placeholders.email || 'Email'}</label>
  </div>
</div>
<div class="input-field-wrapper">
  <div class="input-wrapper">
    <input type="password" id="password" class="password" name="password" pattern="${PASSWORD_PATTERN}" placeholder=" " aria-label="${placeholders.password || 'Password'}" required />
    <label for="password">${placeholders.password || 'Password'}</label>
    <span class="unmask-password" aria-controls="password"></span>
  </div>
</div>
${validationRulesContent ? validationRulesContent.outerHTML : ''}
<div class="commerce-sign-up accordion plus">
  <details>
    <summary class="acc-sum">
      <span class="acc-heading">${placeholders.addMoreGetMore || 'Add More & Get More'} </span>
      <span class="acc-optional">${placeholders.registerOptionalLabel || '(Optional)'}</span>
      <p class="acc-body">${placeholders.completeYourProfile || 'Complete your profile to get points'}</p>
    </summary>
    <div class="accordion-item-body">
      <p class="acc-item-p">${placeholders.addmoreDescription || 'Did you know that you can add more information to your profile and get more personalized offers?'}</p>
      <div class="dob">
        <div class="input-field-wrapper">
          <div class="input-wrapper input-field date-field">
           <label for="dateOfBirth" class="date-label">${placeholders.dateOfBirthButton || 'Date of Birth'}</label>
            <input type="date" id="dateOfBirth" name="dateOfBirth" class="dateOfBirth" placeholder=" " aria-label="${placeholders.dob || 'Date of Birth'}" pattern=${DATE_PATTERN} max="9999-12-31"/>
          </div>
          <p class="dobtext">${placeholders.dobhelptext}</p>
        </div>
      </div>
        <div class="input-field-wrapper dropdown notransistion gender">
          <div class="input-wrapper input-field">
            <label for="gender">${placeholders.gender || 'Gender'} </label>
              <div class="custom-select">
                <div class="select-selected">${placeholders.selectSelectedGender || 'Select Gender'}</div>
                <div class="select-items select-hide">
                  <div data-value="" disabled>${placeholders.selectGender || 'Select Gender'}</div>
                  <div data-value="m">${placeholders.genderMale || 'Male'} </div>
                  <div data-value="f">${placeholders.genderFemale || 'Female'}</div>
                  <div data-value="ns">${placeholders.genderOther || 'Prefer not to say'}</div>
                </div>
              </div>          
          </div>
        </div>      
        <div class="mobile-wrapper">
        <div class="mobileHeading">
          <label for="phone">${placeholders.mobileNumberInputText || 'Mobile Number'}</label>
        </div>
        <div class="mobile-input-wrapper">
          <div class="mobile-input">
            <div class="input-field-wrapper">
              <div class="input-wrapper input-prefix">
                <div class="prefix">+${countryIso}</div>
                  <input type="tel" id="phone" class="phone" name="phone" placeholder=" " autocomplete="tel" aria-label="${placeholders.mobileNumber || 'Mobile Number'}" />
                    <div class="mobile-button">
                      <button type="button" id="otp-button" class="otp-button">${placeholders.sendOtpButtonText || 'SEND OTP'}</button>
                    </div>
                </div>
             </div>
          </div>
        </div>
        <label class="otp-bottom-text-label">${placeholders.otpSentToPhoneText || 'OTP will be send to your mobile number to verify'}</label>
      </div>
    </div>
  </details>
</div>

<div class="input-field-wrapper">
  <div class="input-wrapper">
    <input type="checkbox" id="newsletter" class="newsletter" name="newsletter" checked/>
    <label for="newsletter">${placeholders.newsLetterText || 'Be the first to hear about our latest offers and promotions via email and sms.'}</label>
    <span class="terms-condition-text">${placeholders.signupTermsConditionText || 'By clicking "Become a member", I agree to the H&M Membership'}
    <a class="terms-condition-link" href = "${placeholders.signupTermsConditionLink || `/${lang}/website-terms-and-conditions`}">${placeholders.signupTermsConditionLinkLabel || 'Terms & Conditions.'}</a></span>
  </div>
</div>
<div class="submit-container">
  <button type="submit" class="createNewAccountButton"><span>${placeholders.createNewAccountButtonText || 'Create a new account'}</span></button>
</div>
<div class="error-container"></div>
<div class="success-container"></div>
  `;

  customSelectbox(form);
  const siteKey = await getConfigValue('recaptchaV3-sitekey');
  addRecaptchaScript(siteKey);
  form.setAttribute('novalidate', '');

  const sendOtpButton = form.querySelector('.otp-button');
  const dateInput = form.querySelector('.dateOfBirth');
  const phoneInput = form.querySelector('.phone');
  const maxPhoneNumberInputLength = await getMaxLengthByCountryCode(market);
  phoneInput.maxLength = maxPhoneNumberInputLength;
  phoneInput.minLength = maxPhoneNumberInputLength;

  form.querySelectorAll('input').forEach((input) => {
    setErrorMessageForField(input, placeholders);
  });

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      validateInput(input);

      if (input.id === 'password') {
        const validationContainer = form.querySelector('.validation-container');

        if (validationContainer) {
          if (input.value !== '') {
            validationContainer.classList.remove('hide');
          } else {
            validationContainer.classList.add('hide');
          }
        }
      }
    });
  });

  dateInput.addEventListener('input', async (event) => {
    event.preventDefault();
    dateValidation(dateInput, placeholders);
  });

  phoneInput.addEventListener('input', () => {
    phoneInput.value = phoneInput.value.replace(/\D/g, '');
    phoneInput.closest('.input-field-wrapper').classList.remove('success');
    sendOtpButton.disabled = phoneInput.value.length < maxPhoneNumberInputLength;
    document.querySelector('.createNewAccountButton').disabled = phoneInput.value.length === maxPhoneNumberInputLength;
  });

  let resendCounter = 0;
  sendOtpButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const isValidPhoneNumber = await validatePhone(phoneInput.value, market);
    if (isValidPhoneNumber) {
      const result = await sendOtp(phoneInput, countryIso, resendCounter, placeholders);
      resendCounter = result.updatedResendCounter;
    } else {
      showErrorMessage(phoneInput, placeholders.invalidPhonenumberError);
    }
  });

  block.innerHTML = '';
  const commerceSignupContainer = document.createElement('div');
  commerceSignupContainer.classList.add('commerce-signup-container');

  commerceSignupContainer.appendChild(form);
  decorateIcons(commerceSignupContainer);
  block.appendChild(commerceSignupContainer);
  document.querySelector('.unmask-password').addEventListener('click', togglePasswordVisibility);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = document.querySelector('.submit-container button.createNewAccountButton');
    submitButton?.classList.add('loader');
    if (!validateForm(form, placeholders)) {
      const errorFieldsList = await getErrorfields(form);
      datalayerLogin('Registration Attempt', `Email : invalid - ${errorFieldsList}`);
      return;
    }
    const bypassRecaptcha = await getConfigValue('recaptcha-bypass');
    if (bypassRecaptcha === 'true') {
      signup(form, placeholders, lang, countryIso);
      return;
    }
    // eslint-disable-next-line no-undef
    grecaptcha.ready(async () => {
      // eslint-disable-next-line no-undef
      const token = await grecaptcha.execute(siteKey, { action: 'submit' });
      if (!token) {
        showPageErrorMessage(placeholders.recaptchaErrorMessage || 'Verification failed. Please try again.');
        return;
      }
      const captchaValidated = await validateReCaptchaV3(token, submitButton);
      if (captchaValidated) {
        signup(form, placeholders, lang, countryIso);
      } else {
        submitButton?.classList.remove('loader');
        const recaptchaErrorMessage = placeholders.recaptchaErrorMessage || 'Verification failed. Please try again.';
        showPageErrorMessage(recaptchaErrorMessage);
      }
    });
  });

  const signupContainer = document.createElement('div');
  signupContainer.classList.add('signup-container');
  signupContainer.appendChild(form);
  block.appendChild(signupContainer);
}
