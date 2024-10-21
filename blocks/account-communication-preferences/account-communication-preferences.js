import { fetchPlaceholdersForLocale, showToastNotification } from '../../scripts/scripts.js';
import { getCustomer, updateCustomer2 } from '../../scripts/customer/api.js';
import { showPageErrorMessage } from '../../scripts/forms.js';

export default async function decorate(block) {
  const customer = await getCustomer();
  if (!customer) {
    showPageErrorMessage('Failed to load customer details.');
    return;
  }
  const commsPreferenceField = customer.custom_attributes.find((attr) => attr.attribute_code === 'communication_preference');
  const commsPreferenceValue = commsPreferenceField?.value;
  const commsPreference = commsPreferenceValue?.split(',') || [];
  const placeholders = await fetchPlaceholdersForLocale();
  const form = document.createElement('form');
  const emailFieldWrapper = document.createElement('div');
  emailFieldWrapper.classList.add('input-field-wrapper', 'no-transition');
  emailFieldWrapper.innerHTML = `
    <div class="input-wrapper">
      <input type="checkbox" id="communication-email" name="communication-channel" aria-label="${placeholders.email || 'Email'}" ${commsPreference.includes('email') ? 'checked' : ''} value="email">
      <label for="communication-email">${placeholders.email || 'Email'} (${customer.email})</label>
    </div>
  `;
  form.appendChild(emailFieldWrapper);
  const mobileNumber = customer.custom_attributes.find((attr) => attr.attribute_code === 'phone_number')?.value;
  if (mobileNumber) {
    const mobileFieldWrapper = document.createElement('div');
    mobileFieldWrapper.classList.add('input-field-wrapper', 'no-transition');
    mobileFieldWrapper.innerHTML = `
      <div class="input-wrapper">
        <input type="checkbox" id="communication-phone" name="communication-channel" aria-label="${placeholders.Phone || 'Phone'}" ${commsPreference.includes('phone') ? 'checked' : ''} value="phone">
        <label for="communication-phone">${placeholders.phone || 'Phone'} (${mobileNumber})</label>
      </div>
    `;
    form.appendChild(mobileFieldWrapper);
  }
  const saveButton = document.createElement('button');
  saveButton.name = 'save';
  saveButton.id = 'save';
  saveButton.textContent = placeholders.save || 'Save';
  form.appendChild(saveButton);
  saveButton.addEventListener('click', async (event) => {
    event.preventDefault();
    const emailCheckbox = document.getElementById('communication-email');
    const phoneCheckbox = document.getElementById('communication-phone');
    const emailChecked = emailCheckbox.checked;
    const phoneChecked = phoneCheckbox?.checked || false;

    const checkedComms = [];
    if (emailChecked) {
      checkedComms.push('email');
    }
    if (phoneChecked) {
      checkedComms.push('phone');
    }
    const communicationPreference = checkedComms.join(',');
    if (commsPreferenceField) {
      commsPreferenceField.value = communicationPreference;
    } else {
      customer.custom_attributes.push({
        attribute_code: 'communication_preference',
        value: communicationPreference,
      });
    }
    const updateResult = await updateCustomer2(customer);
    if (updateResult.success) {
      showToastNotification(placeholders.communicationPreferencesSuccess || 'Your communication preferences have been saved.');
      return;
    }
    showPageErrorMessage(updateResult.data?.message || placeholders.communicationPreferencesFailed || 'Failed to save communication preferences.');
  });

  const communicationContainer = document.createElement('div');
  communicationContainer.classList.add('communication-container');
  communicationContainer.appendChild(form);
  block.appendChild(communicationContainer);
}
