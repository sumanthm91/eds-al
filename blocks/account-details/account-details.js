import { fetchPlaceholdersForLocale } from '../../scripts/scripts.js';
import { getCustomer } from '../../scripts/customer/api.js';

export default async function decorate(block) {
  const editAccountLink = block.querySelector('a');
  const accountTitle = block.querySelector('h2, h3, h4, h5, h6');
  const placeholders = await fetchPlaceholdersForLocale();
  const customer = await getCustomer(true);
  const accountDetailsContainer = document.createElement('div');
  accountDetailsContainer.classList.add('account-details-container');

  const successTitleWrapper = document.createElement('div');
  successTitleWrapper.classList.add('title-wrapper');

  successTitleWrapper.appendChild(accountTitle);
  if (editAccountLink) {
    editAccountLink.classList.remove('button');
    successTitleWrapper.appendChild(editAccountLink);
  }

  accountDetailsContainer.appendChild(successTitleWrapper);

  const emailContainer = document.createElement('div');
  emailContainer.classList.add('email-container');

  const emailLabel = document.createElement('span');
  emailLabel.classList.add('label');
  emailLabel.textContent = placeholders.accountEmail || 'Email';

  const emailValue = document.createElement('span');
  emailValue.classList.add('value');
  emailValue.textContent = customer.email;

  emailContainer.appendChild(emailLabel);
  emailContainer.appendChild(emailValue);

  accountDetailsContainer.appendChild(emailContainer);
  const mobileNumber = customer.custom_attributes.find((attr) => attr.attribute_code === 'phone_number')?.value;

  if (mobileNumber) {
    const contactNumberContainer = document.createElement('div');
    contactNumberContainer.classList.add('contact-number-container');

    const contactNumberLabel = document.createElement('span');
    contactNumberLabel.classList.add('label');
    contactNumberLabel.textContent = placeholders.accountContactNumber || 'Contact Number';

    const contactNumberValue = document.createElement('span');
    contactNumberValue.classList.add('value');
    contactNumberValue.setAttribute('dir', 'ltr');
    contactNumberValue.textContent = mobileNumber;

    contactNumberContainer.appendChild(contactNumberLabel);
    contactNumberContainer.appendChild(contactNumberValue);

    accountDetailsContainer.appendChild(contactNumberContainer);
  }

  block.appendChild(accountDetailsContainer);
}
