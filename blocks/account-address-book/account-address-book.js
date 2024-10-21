import {
  createAddress, updateAddress, makePrimaryAddress, deleteAddress,
  getDeliveryMatrixAddressStructure,
  getAddressCitySegments,
  getAddressAreas,
} from '../../scripts/address/api.js';
import { decorateIcons } from '../../scripts/aem.js';
import { getConfigValue } from '../../scripts/configs.js';
import { getCustomer } from '../../scripts/customer/api.js';
import {
  setErrorMessageForField,
  validateForm,
  validateInput,
  validatePhone,
  showErrorMessage,
  customSelectbox,
  validateCustomerEmail,
} from '../../scripts/forms.js';
import {
  fetchPlaceholdersForLocale,
  createModalFromContent,
  openModal,
  closeModal,
  showToastNotification,
} from '../../scripts/scripts.js';
import {
  getMaxLengthByCountryCode,
  getCountryIso,
} from '../../scripts/helpers/country-list.js';
import { dataLayerCustomerExistCheckoutErrors } from '../../scripts/analytics/google-data-layer.js';

// Hide the 'new-address-container' element by adding the 'hide' class
function hideNewAddressCta() {
  const newAddressContainer = document.querySelector('.new-address-container');
  newAddressContainer?.classList.add('hide');
}

// Handling address hovering effect
function handleAddressHover(addressWrapper) {
  const cta = addressWrapper.querySelector('.make-primary-cta');
  cta?.addEventListener('mouseover', () => {
    const addressFirstRow = cta.closest('.address').querySelector('.address-data');
    addressFirstRow?.classList.add('primary-address-data');
  });
  cta?.addEventListener('mouseout', () => {
    const addressFirstRow = cta.closest('.address').querySelector('.address-data');
    addressFirstRow?.classList.remove('primary-address-data');
  });

  const data = addressWrapper.querySelector('.address-data');
  data?.addEventListener('mouseover', () => {
    data.closest('.address').querySelector('.make-primary-cta')?.classList.add('hovered');
  });
  data?.addEventListener('mouseout', () => {
    data.closest('.address').querySelector('.make-primary-cta')?.classList.remove('hovered');
  });
}

function enableDropdownSearch(dropdown) {
  const searchInput = dropdown.querySelector('.select-search');
  const options = dropdown.querySelectorAll('.select-items div:not([disabled])');
  const noResultsOption = dropdown.querySelector('.no-results');
  searchInput.addEventListener('keyup', function () {
    const filter = this.value.toLowerCase();
    let anyVisible = false;

    options.forEach((option) => {
      const text = option.textContent.toLowerCase();
      if (text.includes(filter)) {
        option.classList.remove('hide');
        anyVisible = true;
      } else {
        option.classList.add('hide');
      }
    });

    if (!anyVisible) {
      noResultsOption.classList.remove('hide');
    } else {
      noResultsOption.classList.add('hide');
    }
  });
}

async function updateArea(countryCode, cityValue, form, placeholders) {
  const areas = await getAddressAreas(countryCode, cityValue);
  const areaField = form.querySelector('#area');
  const areaSelect = areaField.querySelector('.select-selected');
  const areaItems = areaField.querySelector('.select-items');
  const initialAreaValue = areaSelect?.getAttribute('data-initial-value');
  areaItems.innerHTML = `<div data-value="" class="no-results hide">${placeholders.dropdownNoResultsFound || 'No Results Found'}</div>`;
  let selectedAreaLabel;

  areas.items?.forEach((area) => {
    if (area.location_id === Number(initialAreaValue)) {
      selectedAreaLabel = area.label;
    }
    const option = document.createElement('div');
    option.setAttribute('data-value', area.location_id);
    option.textContent = area.label;
    areaItems.appendChild(option);
  });
  areaField.querySelector('.select-items > div[disabled]')?.remove();
  enableDropdownSearch(areaField);
  // Reset the dropdown state
  areaSelect.textContent = selectedAreaLabel || placeholders.selectArea || 'Select Area';
  areaSelect.dataset.value = initialAreaValue;

  // Clean up any existing event listeners
  const clonedAreaSelect = areaSelect.cloneNode(true);
  areaField.replaceChild(clonedAreaSelect, areaSelect);

  // Reinitialize the custom select box
  customSelectbox(form.querySelector('.input-field-wrapper.dropdown.area'));
}

// populating city in address form
async function populateCity(form, citySegments, countryCode, placeholders) {
  const cityField = form.querySelector('#address_city_segment');
  const initialCityValue = cityField.querySelector('.select-selected')?.getAttribute('data-initial-value');
  let selectedCityLabel;
  if (cityField && citySegments) {
    citySegments.items?.forEach((segment) => {
      if (segment.location_id === Number(initialCityValue)) {
        selectedCityLabel = segment.label;
      }
    });
    cityField.querySelector('.select-items > div[disabled]')?.remove();
  }
  if (selectedCityLabel) {
    cityField.querySelector('.select-selected').textContent = selectedCityLabel;
  }
  enableDropdownSearch(cityField);
  cityField.value = initialCityValue;
  cityField.querySelectorAll('.select-items div').forEach((item) => {
    item.addEventListener('click', async (event) => {
      await updateArea(countryCode, event.target.getAttribute('data-value'), form, placeholders);
    });
  });
  if (initialCityValue) {
    await updateArea(countryCode, cityField.value, form, placeholders);
  } else {
    customSelectbox(form.querySelector('.input-field-wrapper.dropdown.area'));
  }
}

// to set country code
function setCountryCode(form, countryCode) {
  const countryId = form.querySelector('#country_id');
  if (countryId) {
    countryId.value = countryCode;
    countryId.disabled = true;
  }
}

// to set telephone input
function createTelephoneInput(
  countryCode,
  maxLength,
  countryPrefix,
  fieldDiv,
  name,
  label,
  isRequired,
  value,
  isCheckoutPage,
  updateOnlyTelephone,
  infoMessage,
) {
  const pattern = '[0-9]*';
  fieldDiv.classList.add('phonevalidation', 'notransistion');
  fieldDiv.innerHTML = `<label for="${name}">${label}</label>
  <div class="input-wrapper input-field input-phone-prefix">
    <label for="countrycode" class="countrycode">${countryPrefix}</label>
    <input type="tel" id="${name}" name="${name}" data-phone-prefix="${countryPrefix}" aria-label="${label}" placeholder=" " value="${value}" ${isRequired ? 'required' : ''} pattern='${pattern}' maxlength='${maxLength}'>
    ${isCheckoutPage && updateOnlyTelephone ? `<span class='spc-type-tel__message'>${infoMessage}</span>` : ''}
    </div>`;
}

// adding toast notification
function addStatusMessage(message) {
  showToastNotification(message);
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}

function getSelectedLabel(countryCode, field) {
  return field.attribute.options?.find(
    (option) => option.value === countryCode,
  )?.label || countryCode;
}

function handleCheckoutFormStructure(formStructure, isLoggedIn) {
  // Helper function to add a field after a specific attribute code
  const addFieldAfterAttributeCode = (attributeCode, newField) => {
    const fieldIndex = formStructure.findIndex(
      (field) => field.attribute.attribute_code === attributeCode,
    );
    if (fieldIndex !== -1) {
      formStructure.splice(fieldIndex + 1, 0, newField);
    }
  };

  // Find the telephone field and add the email field after it
  const telephoneFieldIndex = formStructure.findIndex((field) => field.attribute.attribute_code === 'telephone');
  if (telephoneFieldIndex !== -1 && !isLoggedIn) {
    const emailField = JSON.parse(JSON.stringify(formStructure[telephoneFieldIndex]));
    emailField.attribute.attribute_code = 'email';
    emailField.attribute.store_label = 'Email';
    emailField.attribute.frontend_input = 'text';
    emailField.attribute.required = true;

    addFieldAfterAttributeCode('telephone', emailField);
  }
}

// to show address form
export async function showAddressForm(
  $parent,
  placeholders,
  addressObj,
  newCustomer = false,
  isCheckoutPage = false,
  isLoggedIn = false,
  config = {},
  updateOnlyTelephone = false,
  infoMessage = '',
) {
  if (isCheckoutPage) {
    window.dispatchEvent(new CustomEvent('react:addressFormLoading'));
  }
  const countryCode = await getConfigValue('country-code');
  const addressesContainer = document.querySelector('.addresses-container');
  const formStructure = await getDeliveryMatrixAddressStructure(countryCode);
  const citySegments = await getAddressCitySegments(countryCode);
  const isUpdate = Object.keys(addressObj).length > 0;
  const block = $parent.closest('.account-address-book');
  const maxLength = await getMaxLengthByCountryCode(countryCode);
  const countryPrefix = `+${await getCountryIso(countryCode)}`;

  const form = document.createElement('form');
  let cityDefaultLabel = placeholders.selectCity || 'Select City';
  let areaDefaultLabel = placeholders.selectArea || 'Select Area';

  formStructure.sort((a, b) => {
    if (a.sort_order < b.sort_order) return -1;
    if (a.sort_order > b.sort_order) return 1;
    return 0;
  });

  if (isCheckoutPage) {
    handleCheckoutFormStructure(formStructure, isLoggedIn);
  }

  formStructure
    .filter((field) => field.visible === '1' && field.attribute.attribute_code !== 'lastname')
    .forEach(async (field) => {
      const fieldDiv = document.createElement('div');
      fieldDiv.classList.add('input-field-wrapper');
      if (isCheckoutPage && updateOnlyTelephone && field.attribute.attribute_code !== 'telephone') {
        fieldDiv.classList.add('address-form-field-disabled');
      }
      const validations = [];
      if (field.attribute.required) {
        validations.push('required');
      }

      field.attribute.validation_rules?.forEach((rule) => {
        if (rule.name === 'min_text_length') {
          validations.push(`minlength="${rule.value}"`);
        } else if (rule.name === 'max_text_length') {
          validations.push(`maxlength="${rule.value}"`);
        }
      });

      if (field.attribute.attribute_code === 'telephone') {
        createTelephoneInput(countryCode, maxLength, countryPrefix, fieldDiv, field.attribute.attribute_code, field.attribute.store_label, field.attribute.required, addressObj?.[field.attribute.attribute_code] ? addressObj[field.attribute.attribute_code].replace(countryPrefix, '') : '', isCheckoutPage, updateOnlyTelephone, infoMessage);
      } else if (field.attribute.frontend_input === 'text') {
        let textInputValue = addressObj?.[field.attribute.attribute_code];
        let label = field.attribute.store_label;
        let attributeCode = field.attribute.attribute_code;
        if (field.attribute.attribute_code === 'firstname') {
          textInputValue = textInputValue ? `${textInputValue} ${addressObj?.lastname ?? ''}` : '';
          label = placeholders.fullname || 'Full Name';
          attributeCode = 'fullName';
        }
        fieldDiv.innerHTML = `
        <div class="input-field-wrapper">
          <div class="input-wrapper input-field">
            <input type="text" id="${attributeCode}" name="${attributeCode}" aria-label="${label}" 
            placeholder=" " 
            value="${textInputValue || ''}" 
            ${field.attribute.attribute_code === 'firstname' ? 'pattern="^[A-Za-z]+(?:\\s[A-Za-z]+)+$"' : ''}
            ${field.attribute.attribute_code === 'email' ? 'pattern="^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"' : ''}
            ${validations.join(' ')}>
            <label for="${attributeCode}">${label}</label>
          </div>
        </div>
      `;
      } else if (field.attribute.frontend_input === 'select') {
        const defaultLabelContent = field.attribute?.attribute_code === 'country_id'
          ? getSelectedLabel(countryCode, field)
          : `${placeholders.select || 'Select'} ${field.attribute.store_label}`;

        if (field.attribute?.attribute_code === 'city') {
          cityDefaultLabel = defaultLabelContent;
        } else if (field.attribute?.attribute_code === 'area') {
          areaDefaultLabel = defaultLabelContent;
        }
        const classesToAdd = ['dropdown', 'notransistion', field.attribute.attribute_code];

        if (isCheckoutPage && field.attribute.attribute_code === 'country_id') {
          classesToAdd.push('hidden');
        }

        fieldDiv.classList.add(...classesToAdd);
        fieldDiv.innerHTML = `
        <div class="input-wrapper input-field">
          <label for="${field.attribute.attribute_code}">${field.attribute.store_label}</label>
          <div class="custom-select" id="${field.attribute.attribute_code}" name="${field.attribute.attribute_code}" aria-label="${field.attribute.store_label}" ${validations.join(' ')}>
            <div class="select-selected${field.attribute.attribute_code === 'country_id' ? ' disabled' : ''}">${defaultLabelContent}</div>
            <input type="text" class="select-search hide ${isCheckoutPage && 'hideSearch'}" placeholder="${isCheckoutPage && field.attribute.attribute_code !== 'country_id' ? defaultLabelContent : ''}">
            <div class="select-items select-hide">
              <div data-value="" class="no-results ${field.attribute.attribute_code === 'area' ? '' : 'hide'}">${placeholders.dropdownNoResultsFound || 'No Results Found'}</div>
              ${field.attribute.attribute_code === 'area' ? '' : field.attribute.options?.filter((option) => option.label !== 'Select an option')
    .map((option) => `<div data-value="${option.value}" ${addressObj?.[field.attribute.attribute_code] === option.value ? 'selected' : ''}>${option.label}</div>`)
    .join('')}
            </div>
          </div>
        </div>
      `;

        field.attribute.options?.map((option) => `<div data-value="${option.value}">${option.label}</div>`);
      } else if (field.attribute.frontend_input === 'multiline') {
        const rows = field.attribute.multiline_count ? `rows="${field.attribute.multiline_count}"` : '';
        fieldDiv.innerHTML = `
          <div class="input-field-wrapper">
            <div class="input-wrapper input-field">
              <textarea id="${field.attribute.attribute_code}" name="${field.attribute.attribute_code}" aria-label="${field.attribute.store_label}" placeholder=" " ${validations.join(' ')} ${rows}>${addressObj?.[field.attribute.attribute_code] || ''}</textarea>
              <label for="${field.attribute.attribute_code}">${field.attribute.store_label}</label>
            </div>
          </div>
        `;
      }

      if (field.attribute.attribute_code === 'area' || field.attribute.attribute_code === 'address_building_segment' || field.attribute.attribute_code === 'address_apartment_segment' || field.attribute.attribute_code === 'address_city_segment') {
        const value = addressObj.custom_attributes?.find((attr) => attr.attribute_code === field.attribute.attribute_code)?.value || '';
        const inputField = fieldDiv.querySelector('input, .select-selected, textarea');
        inputField.value = value;
        inputField.setAttribute('data-initial-value', value);
      }
      form.appendChild(fieldDiv);
    });
  let submitButtonLabel = placeholders.addAddress || 'Add Address';
  if (isUpdate || isCheckoutPage) {
    submitButtonLabel = placeholders.save || 'Save';
  }

  const addressFormButtons = isCheckoutPage
    ? `<div class="address-form-button-wrapper">
        <button type="submit" class="address-submit-button address-form-button" aria-label="${submitButtonLabel}"><span>${submitButtonLabel}</span></button>
      </div>`
    : `<div class="address-form-button-wrapper">
        <button type="submit" class="address-submit-button address-form-button" aria-label="${submitButtonLabel}"><span>${submitButtonLabel}</span></button>
        <button type="button" class="address-cancel-button secondary address-form-button" aria-label="${placeholders.cancel || 'Cancel'}">${placeholders.cancel || 'Cancel'}</button>
      </div>`;

  form.insertAdjacentHTML('beforeend', addressFormButtons);

  form.noValidate = true;
  setCountryCode(form, countryCode);
  await populateCity(form, citySegments, countryCode, placeholders);

  form.querySelectorAll('input, .custom-select, textarea').forEach((input) => {
    setErrorMessageForField(input, placeholders);
    input.addEventListener('input', () => {
      validateInput(input);
    });
  });

  const phoneInput = form.querySelector('#telephone');
  phoneInput.addEventListener('input', async (event) => {
    event.target.value = event.target.value.replace(/[^0-9]/g, '');
    if (event.target.value.length >= phoneInput.maxLength) {
      const isValidPhoneNumber = await validatePhone(
        phoneInput.value,
        countryCode,
      );
      let phoneErrorMessage = placeholders.invalidMobileNumber || `The number provided ${phoneInput.value} is not a valid mobile number.`;
      phoneErrorMessage = phoneErrorMessage.replace('{{mobile}}', phoneInput.value);

      if (!isValidPhoneNumber) {
        showErrorMessage(phoneInput, phoneErrorMessage);
      }
    }
  });

  const addressCancelButton = form.querySelector('.address-cancel-button');
  addressCancelButton?.addEventListener('click', () => {
    if (newCustomer) {
      $parent?.firstChild?.querySelectorAll('input, textarea').forEach((input) => {
        input.value = '';
      });
      document.querySelector('.dropdown.address_city_segment .select-selected').textContent = cityDefaultLabel;
      document.querySelector('.dropdown.area .select-selected').textContent = areaDefaultLabel;
    } else {
      $parent?.classList.add('hide');
    }
    window.scrollTo(0, 0);
  });
  const addressSubmitButton = form.querySelector('.address-submit-button');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!validateForm(form, placeholders, isCheckoutPage)) {
      return;
    }
    const phoneValue = phoneInput.value;
    const isValidPhoneNumber = await validatePhone(phoneValue, countryCode);
    if (!isValidPhoneNumber) {
      let phoneNumberErrorMessage = placeholders.invalidMobileNumber || `The number provided ${phoneInput.value} is not a valid mobile number.`;
      phoneNumberErrorMessage = phoneNumberErrorMessage.replace('{{mobile}}', phoneInput.value);
      showErrorMessage(phoneInput, phoneNumberErrorMessage);
      return;
    }

    addressSubmitButton.classList.add('loader');

    if (isCheckoutPage && !isLoggedIn) {
      const emailInput = form.querySelector('#email');
      const responseData = await validateCustomerEmail(emailInput.value);
      if (responseData?.customerExists) {
        const emailErrorMessage = placeholders.emailExist || 'You already have an account. Please log in.';
        showErrorMessage(emailInput, emailErrorMessage, true);
        dataLayerCustomerExistCheckoutErrors();
        addressSubmitButton.classList.remove('loader');
        return;
      }
      emailInput.classList.remove('error');
    }

    const address = {};

    const customAttributeNames = new Set([
      'address_city_segment',
      'area',
      'address_building_segment',
      'address_apartment_segment',
    ]);
    const inputs = form.querySelectorAll('input, .custom-select, textarea');

    inputs.forEach((input) => {
      const name = input?.getAttribute('name');
      if (!name) return;

      let key = name;
      let value = input.value?.trim() || '';

      switch (name) {
        case 'country_id':
          key = 'country_code';
          break;

        case 'address_city_segment':
        case 'area': {
          const selected = input.querySelector('.select-selected');
          const dataValue = selected?.getAttribute('data-value') || '';
          const dataInitialValue = selected?.getAttribute('data-initial-value') || '';
          value = input.classList.contains('custom-select')
            ? dataValue || dataInitialValue
            : value;

          if (name === 'address_city_segment') {
            address.city = isCheckoutPage ? (dataValue || dataInitialValue || '-') : (dataValue || '-');
          }
          break;
        }

        case 'fullName': {
          const [firstName = '', ...rest] = value.split(/\s+/);
          address.firstname = firstName;
          address.lastname = rest.join(' ');
          return;
        }

        case 'telephone':
          address.telephone = `${countryPrefix}${value}`;
          return;

        default:
          break;
      }

      if (customAttributeNames.has(name)) {
        address.custom_attributes = address.custom_attributes || [];
        address.custom_attributes.push({
          attribute_code: key,
          value,
        });
      } else {
        address[key] = value;
      }
    });

    let res = null;
    let message;
    if (isUpdate && !isCheckoutPage) {
      res = await updateAddress(addressObj.id, address);
      if (res?.success) {
        message = placeholders.addressUpdated || 'Address is updated successfully.';
      }
    } else if (isCheckoutPage) {
      if (isLoggedIn) {
        delete address.address;
        if (isUpdate) {
          const response = await updateAddress(addressObj.id, address, config);
          address.id = response?.data?.commerce_updateCustomerAddress?.id;
          address.street = response?.data?.commerce_updateCustomerAddress?.street;
        } else {
          const response = await createAddress(address, config);
          address.id = response?.data?.commerce_createCustomerAddress?.id;
          address.street = response?.data?.commerce_createCustomerAddress?.street;
        }
      }
      window.dispatchEvent(new CustomEvent('react:addressFormSubmitted', { detail: { address, isUpdate } }));
    } else {
      res = await createAddress(address);
      if (res?.success) {
        message = placeholders.addressAdded || 'Address is added successfully.';
      }
    }
    if (res?.success) {
      block.dispatchEvent(new CustomEvent('address-updated'));
      addressesContainer.classList.remove('hide');
      $parent.classList.add('hide');
      document.querySelector('.new-address-container').classList.remove('hide');
      addStatusMessage(message);
    }
  });

  decorateIcons(form);
  if (!isCheckoutPage) {
    customSelectbox(form.querySelector('.input-field-wrapper.dropdown.country_id'));
  }
  customSelectbox(form.querySelector('.input-field-wrapper.dropdown.address_city_segment'));
  $parent.innerHTML = '';
  $parent.appendChild(form);
  if (isCheckoutPage) {
    window.dispatchEvent(new CustomEvent('react:addressFormLoaded'));
  }
  $parent.classList.remove('hide');
}

// to shoe address form for new customer
function handleNewCustomer(placeholders, addressesContainer) {
  const addressForm = document.querySelector('.address-form');
  showAddressForm(addressForm, placeholders, {}, true);
  addressesContainer.classList.add('hide');
  hideNewAddressCta();
}

// to show delete address modal
async function showDeleteAddressModal(addressId, placeholders, addressesContainer) {
  const deleteTitle = placeholders.deleteAddressModalTitle || 'Delete Address';
  const deleteContent = document.createElement('div');
  deleteContent.classList.add('delete-content');

  deleteContent.innerHTML = `<span class="delete-title">${placeholders.deleteAddressModalTitle || 'Delete Address'}</span>
    <span class="delete-message">${placeholders.deleteAddressModalMessage || 'You have selected to delete this address, are you sure?'}</span>
    <div class="delete-buttons">
      <button class="delete-cancel secondary" aria-label="${placeholders.deleteAddressCancel || 'No'}">${placeholders.deleteAddressCancel || 'No'}</button>
      <button class="delete-confirm" aria-label="${placeholders.deleteAddressConfirm || 'Yes'}">${placeholders.deleteAddressConfirm || 'Yes'}</button>
    </div>`;
  await createModalFromContent('delete-address-modal', deleteTitle, deleteContent.outerHTML, ['delete-address-modal'], 'trash', false, 'icon-close-black');

  document.querySelector('.delete-address-modal .delete-cancel').addEventListener('click', () => {
    closeModal('delete-address-modal');
  });

  document.querySelector('.delete-address-modal .delete-confirm').addEventListener('click', async () => {
    closeModal('delete-address-modal');
    const res = await deleteAddress(addressId);
    if (res?.success) {
      const message = placeholders.addressDeleted || 'Address is deleted successfully.';
      addStatusMessage(message);
      const block = addressesContainer.closest('.account-address-book');
      block?.dispatchEvent(new CustomEvent('address-updated'));
    }
  });
  openModal('delete-address-modal');
}

// to display addresses list
const displayAddressList = async function (addressForm, addressesContainer, placeholders) {
  addressesContainer.innerHTML = '';
  const countryCode = await getConfigValue('country-code');
  const customerPromise = getCustomer(false);
  const citySegmentsPromise = getAddressCitySegments(countryCode);
  const areasPromise = getAddressAreas(countryCode);
  const formStructurePromise = getDeliveryMatrixAddressStructure(countryCode);

  const [customer, citySegments, areas, formStructure] = await Promise.all([customerPromise,
    citySegmentsPromise,
    areasPromise,
    formStructurePromise,
  ]);

  const country = formStructure
    .find((field) => field.visible === '1' && field?.attribute?.attribute_code === 'country_id')
    ?.attribute?.options?.find((option) => option.value === countryCode)?.label;
  if (customer?.addresses?.length < 1) {
    handleNewCustomer(placeholders, addressesContainer);
    return;
  }
  customer?.addresses.sort((a, b) => (b.default_billing === true) - (a.default_billing === true));
  customer?.addresses?.forEach((address) => {
    const addressWrapper = document.createElement('div');
    addressWrapper.classList.add('address-wrapper');

    const addressDiv = document.createElement('div');
    addressDiv.classList.add('address');

    const editAddressHtml = `<div class="edit-address-cta-wrapper">
     <a href="#" class="edit-address-cta" aria-label="${placeholders.edit || 'Edit'}"><span>${placeholders.edit || 'Edit'}</span></a>
    </div>`;

    const city = citySegments.items
      ?.find((item) => item.location_id === Number(address.custom_attributes?.find((attr) => attr.attribute_code === 'address_city_segment')?.value))?.label;

    const area = areas.items
      ?.find((item) => item.location_id === Number(address.custom_attributes?.find((attr) => attr.attribute_code === 'area')?.value))?.label;

    const buildingName = address.custom_attributes?.find((attr) => attr.attribute_code === 'address_building_segment')?.value;
    const apartment = address.custom_attributes?.find((attr) => attr.attribute_code === 'address_apartment_segment')?.value;

    const countrySpan = country ? `<span>${country}</span>` : '';
    const citySpan = city ? `<span>${city}</span>` : '';
    const areaSpan = area ? `<span>${area}</span>` : '';
    const buildingSpan = buildingName ? `<span>${buildingName}</span>` : '';
    const apartmentSpan = apartment ? `<span>${apartment}</span>` : '';

    const addressContent = `
      <div class="address-data ${address.default_billing || customer.addresses.length === 1 ? 'primary-address-data' : ''}">
        <div class="address-userinfo">
          <div class="address-section col-1 deliveryTo">
            <p class="label"><span>${placeholders.deliveryTo || 'Delivery To'}</span></p>
            <p class="address-value"><span>${address.firstname} ${address.lastname}</span></p>
          </div>
          <div class="address-section col-1 contact-number">
            <p class="label"><span>${placeholders.contactNumber || 'Contact Number'}</span></p>
            <p class="address-value"><span>${address.telephone}</span></p>
          </div>
        </div>
        <div class="address-section address-line">
          <p class="label"><span>${placeholders.deliveryAddress || 'Delivery Address'}</span></p>
          <p class="address-value">
          ${countrySpan}
          ${citySpan}${areaSpan}
          <span>${address.street}</span>${buildingSpan}${apartmentSpan}
          </p>
        </div>
      </div>
      ${address.default_billing ? `
        <div class="address-section cta-container primary-address-cta-container">
          <div class="primary-address-cta-wrapper">
          <span class="icon icon-radio-active"></span>
          <span>${placeholders.primaryAddress || 'Primary Address'}</span>
          </div>
          ${editAddressHtml}
        </div>` : `
        <div class="address-section cta-container address-cta-container">
          <div class="make-primary-cta-wrapper">
          <span class="icon icon-radio-active hovericon"></span>
          <span class="icon icon-radio-icon"></span>
          <a class="make-primary-cta" aria-label="${placeholders.makePrimary || 'Make Primary'}"><span>${placeholders.makePrimary || 'Make Primary'}</span></a>
          </div>
          ${editAddressHtml}
        <div class="delete-address-cta-wrapper">
          <a href="#" class="delete-address-cta" aria-label="${placeholders.delete || 'Delete'}"><span>${placeholders.delete || 'Delete'}</span></a>
        </div>`
}`;

    addressDiv.innerHTML = addressContent;
    addressWrapper.appendChild(addressDiv);
    decorateIcons(addressWrapper);

    const editButton = addressWrapper.querySelector('.edit-address-cta');
    if (editButton) {
      editButton.addEventListener('click', async () => {
        editButton.classList.add('loader');
        await showAddressForm(addressForm, placeholders, address);
        editButton.classList.remove('loader');
      });
    }

    const deleteButton = addressWrapper.querySelector('.delete-address-cta');
    deleteButton?.addEventListener('click', async () => {
      await showDeleteAddressModal(address.id, placeholders, addressesContainer);
    });

    const makePrimaryButton = addressWrapper.querySelector('.make-primary-cta-wrapper');
    makePrimaryButton?.addEventListener('click', async () => {
      const res = await makePrimaryAddress(address.id);
      if (res?.success) {
        const message = placeholders.primaryAddressUpdated || 'Primary address is updated successfully.';
        addStatusMessage(message, placeholders);
        const block = addressWrapper.closest('.account-address-book');
        block?.dispatchEvent(new CustomEvent('address-updated'));
      }
    });
    handleAddressHover(addressWrapper);
    addressesContainer.appendChild(addressWrapper);
    const addressSubmitButton = document.querySelector('.address-submit-button');
    addressSubmitButton?.classList.remove('hide');
  });
};

export default async function decorate(block) {
  const placeholders = await fetchPlaceholdersForLocale();

  // Clear the initial HTML
  block.innerHTML = '';

  const newAddressContainer = document.createElement('div');
  newAddressContainer.classList.add('new-address-container');
  const newAddressWrapper = document.createElement('div');
  newAddressWrapper.classList.add('new-address-wrapper');
  newAddressContainer.appendChild(newAddressWrapper);
  const plusButton = '<span class="icon icon-plus-big"></span>';
  newAddressWrapper.insertAdjacentHTML('afterbegin', plusButton);
  decorateIcons(newAddressWrapper);

  const newAddressLinkHtml = `<a class="new-address" aria-label="${placeholders.addNewAddress || 'Add New Address'}" href="#">${placeholders.addNewAddress || 'Add New Address'}</a>`;
  newAddressWrapper.insertAdjacentHTML('beforeend', newAddressLinkHtml);

  block.parentElement.previousSibling.firstChild.insertAdjacentElement('afterend', newAddressContainer);
  let newAddressLink = document.querySelector('.new-address');
  if (window.innerWidth < 768) {
    newAddressLink = document.querySelector('.new-address-wrapper');
  }
  const addressForm = document.createElement('div');
  addressForm.classList.add('address-form');
  block.appendChild(addressForm);
  newAddressLink.addEventListener('click', async (event) => {
    event.preventDefault();
    showAddressForm(addressForm, placeholders, {});
  });
  // Create addresses container
  const addressesContainer = document.createElement('div');
  addressesContainer.classList.add('addresses-container');
  await displayAddressList(addressForm, addressesContainer, placeholders);
  block.appendChild(addressesContainer);
  block.addEventListener('address-updated', async () => {
    await displayAddressList(addressForm, addressesContainer, placeholders);
  });
}
