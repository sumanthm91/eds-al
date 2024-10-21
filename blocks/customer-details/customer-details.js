import { getCustomer, updateCustomer } from '../../scripts/customer/api.js';
import {
  FULLNAME_PATTERN,
  DATE_PATTERN,
  showPageSuccessMessage,
  showPageErrorMessage,
  setErrorMessageForField,
  validateForm,
  validateInput,
  dateValidation,
  validatePhone,
  sendOtp,
  showErrorMessage,
  customSelectbox,
} from '../../scripts/forms.js';
import { fetchPlaceholdersForLocale } from '../../scripts/scripts.js';
import { decorateIcons } from '../../scripts/aem.js';
import { getConfigValue } from '../../scripts/configs.js';
import {
  getMaxLengthByCountryCode,
  getCountryIso,
} from '../../scripts/helpers/country-list.js';
import { getAPCSearchData } from '../../scripts/customer/register-api.js';

function toggleAccordionItem(e) {
  const item = e.currentTarget;
  item.closest('.accordion').classList.toggle('open');
}

export default async function decorate(block) {
  const placeholders = await fetchPlaceholdersForLocale();
  const customer = await getCustomer();
  const market = await getConfigValue('country-code');
  const countryIso = await getCountryIso(market);

  const form = document.createElement('form');
  form.innerHTML = `
  <div class="input-field-wrapper">
      <div class="input-wrapper input-field">
        <input type="text" id="fullName" name="fullName" pattern="${FULLNAME_PATTERN}" aria-label="${placeholders.fullName || 'Full Name'}" required autocomplete="name">
        <label for="fullName">${placeholders.fullName || 'Full Name'}</label>
      </div>
    </div>
    <div class="input-field-wrapper">
      <div class="input-wrapper input-field">
        <input type="email" id="email" name="email" placeholder=" " aria-label="${placeholders.email || 'Email'}" required autocomplete="email" disabled>
        <label for="email">${placeholders.email || 'Email'}</label>
      </div>
    </div>
    <div class="add-more-section accordion plus">
      <div class="accordion-item-label">
        <h3>${placeholders.addmoreTitle} <span>(optional)</span></h3>
        <span class="accordion-subhead">${placeholders.addmoreSubtitle}</span>
      </div>
      <div class="add-more-fields accordion-item-body">
        <span class="add-more-field">${placeholders.addmoreDescription}</span>
        <div class="input-field-wrapper">
          <div class="input-wrapper input-field">
            <input type="date" id="dob" name="dob" placeholder=" " aria-label="${placeholders.dob || 'Date of Birth'}" autocomplete="bday" pattern=${DATE_PATTERN} max="9999-12-31">
            <label for="dob">${placeholders.dob || 'Date of Birth'}</label>
          </div>
          <p class="dobtext">${placeholders.dobhelptext}</p>
        </div>
        <div class="input-field-wrapper dropdown notransistion gender">
          <div class="input-wrapper input-field">
            <label for="gender">${placeholders.gender || 'Gender'} </label>
              <div class="custom-select">
                <div class="select-selected">Select Gender</div>
                <div class="select-items select-hide">
                  <div data-value="" disabled>${placeholders.selectGender || 'Select Gender'}</div>
                  <div data-value="m">${placeholders.genderMale || 'Male'} </div>
                  <div data-value="f">${placeholders.genderFemale || 'Female'}</div>
                  <div data-value="ns">${placeholders.genderOther || 'Prefer not to say'}</div>
                </div>
              </div>
          </div>
        </div>
        <div class="input-field-wrapper phonevalidation notransistion">
          <label for="phone">${placeholders.phone || 'Mobile Number'}</label>
          <div>
            <div class="input-wrapper input-field">             
              <label for="countrycode" class="countrycode">+${countryIso}</label>
              <input type="tel" id="phone" name="phone" placeholder=" " aria-label="${placeholders.mobileNumber || 'Mobile Number'}" autocomplete="tel" maxlength="9">
            </div>
            <button type="button" class="otp-button" id="otp-button" disabled><span>${placeholders.sendotp || 'SEND OTP'}</span></button>
          </div>
        </div>
        <p class="otp-helptext">${placeholders.otpHelptext}</p>
      </div>
    </div>
    <button type="submit" class="saveButton"><span>${placeholders.save || 'Save'}</span></button>
  `;

  form.setAttribute('novalidate', '');

  // displaying the field values post updation of user details
  form.querySelector('#fullName').value = `${customer.firstname} ${customer.lastname}`;
  form.querySelector('#email').value = customer.email;

  if (customer?.dob) {
    form.querySelector('#dob').disabled = true;
  }
  form.querySelector('#dob').value = customer.dob;

  const genderList = form.querySelectorAll('.select-items div');
  const selectedGender = Object.values(genderList)
    .filter((item) => item.dataset.value === customer.extension_attributes.customer_gender);
  form.querySelector('.gender .select-selected').textContent = selectedGender[0]?.innerHTML;
  form.querySelector('.gender .select-selected').dataset.value = customer.extension_attributes.customer_gender;

  const phonenumberdata = customer.custom_attributes.find((attr) => attr.attribute_code === 'phone_number');
  form.querySelector('#phone').value = phonenumberdata === undefined ? '' : phonenumberdata?.value.split(countryIso)[1];

  const sendOtpButton = form.querySelector('.otp-button');
  const dateInput = form.querySelector('#dob');
  const phoneInput = form.querySelector('#phone');
  const maxPhoneNumberInputLength = await getMaxLengthByCountryCode(market);
  phoneInput.maxLength = maxPhoneNumberInputLength;
  phoneInput.minLength = maxPhoneNumberInputLength;

  customSelectbox(form);

  form.querySelectorAll('input').forEach((input) => {
    setErrorMessageForField(input, placeholders);
  });

  form.querySelectorAll('input').forEach((input) => {
    input.addEventListener('input', () => {
      validateInput(input);
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
    form.querySelector('.saveButton').disabled = phoneInput.value.length === maxPhoneNumberInputLength;
  });

  let resendCounter = 0;
  sendOtpButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const button = event.target.closest('button');
    button.classList.add('loader');
    const isValidPhoneNumber = await validatePhone(phoneInput.value, market);
    if (isValidPhoneNumber) {
      const searchPhoneNumber = await getAPCSearchData(phoneInput, countryIso);
      if (searchPhoneNumber.apc_identifier_number) {
        button.classList.remove('loader');
        showErrorMessage(phoneInput, placeholders.phoneNumberLinked);
        return;
      }
      const result = await sendOtp(phoneInput, countryIso, resendCounter, placeholders);
      resendCounter = result.updatedResendCounter;
    } else {
      showErrorMessage(phoneInput, placeholders.invalidPhonenumberError);
    }
    button.classList.remove('loader');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!validateForm(form)) {
      return;
    }
    form.querySelector('button.saveButton').classList.add('loader');
    const fullName = form.querySelector('#fullName').value;
    const dob = form.querySelector('#dob').value;
    const genderSelect = form.querySelector('.gender .select-selected').dataset.value;
    const tel = `+${countryIso}${form.querySelector('#phone').value}`;
    const data = {
      name: fullName,
      email: customer.email,
      dateofBirth: dob,
      gender: genderSelect,
    };

    let phoneVerification = false;
    if (form.querySelector('.phonevalidation').classList.contains('success')
    || document.querySelector('.phonevalidation input').value !== '') {
      phoneVerification = true;
    }

    const responseData = await updateCustomer(data, tel, phoneVerification);
    form.querySelector('button.saveButton').classList.remove('loader');
    if (responseData.success) {
      form.querySelector('#dob').disabled = true;
      showPageSuccessMessage(placeholders.mydetailsSave, 'prependMainWrapper');
      return;
    }
    showPageErrorMessage(responseData.message, 'prependMainWrapper');
  });

  const accordionitem = form.querySelector('.accordion-item-label');
  accordionitem.addEventListener('click', toggleAccordionItem);

  const myDetailsContainer = document.createElement('div');
  myDetailsContainer.classList.add('my-details-container');
  myDetailsContainer.appendChild(form);
  decorateIcons(myDetailsContainer);
  block.appendChild(myDetailsContainer);
}
