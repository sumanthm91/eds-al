import { decorateIcons } from '../../scripts/aem.js';
import { getSavedCards, deleteSavedCard } from '../../scripts/customer/api.js';
import {
  isLoggedInUser, fetchPlaceholdersForLocale, createModalFromContent, openModal, closeModal,
} from '../../scripts/scripts.js';
import { showPageErrorMessage } from '../../scripts/forms.js';

function getCardMaskedNumber(maskedCC, type) {
  if (type.toLowerCase() === 'american express') {
    return `•••• ••••••• •${maskedCC}`;
  }
  return `•••• •••• •••• ${maskedCC}`;
}

function getFormattedCardExpiry(expiryDate) {
  if (!expiryDate) {
    return '';
  }
  const expiryDateArray = expiryDate.split('/');
  let month = expiryDateArray[0];
  if (month.length === 1) {
    month = `0${month}`;
  }
  return `${month}/${expiryDateArray[1]}`;
}

async function deleteCard(parent, publicHash, placeholders) {
  const block = parent.closest('.account-saved-cards');

  const deleteTitle = placeholders.deleteCardTitle || 'Delete Card';

  const deleteMessage = placeholders.deleteCardMessage || 'You have selected to delete this payment card, are you sure?';

  const deleteConfirm = placeholders.deleteCardConfirm || 'Yes';

  const deleteCancel = placeholders.deleteCardCancel || 'No';

  const deleteContent = document.createElement('div');
  deleteContent.classList.add('delete-content');

  const deleteTitleElement = document.createElement('span');
  deleteTitleElement.classList.add('delete-title');
  deleteTitleElement.textContent = deleteTitle;
  deleteContent.appendChild(deleteTitleElement);

  const deleteMessageElement = document.createElement('span');
  deleteMessageElement.textContent = deleteMessage;
  deleteContent.appendChild(deleteMessageElement);

  const deleteButtons = document.createElement('div');
  deleteButtons.classList.add('delete-buttons');
  deleteContent.appendChild(deleteButtons);

  const deleteCancelButton = document.createElement('button');
  deleteCancelButton.textContent = deleteCancel;
  deleteCancelButton.classList.add('delete-cancel', 'secondary');
  deleteButtons.appendChild(deleteCancelButton);

  const deleteConfirmButton = document.createElement('button');
  deleteConfirmButton.textContent = deleteConfirm;
  deleteConfirmButton.classList.add('delete-confirm');
  deleteButtons.appendChild(deleteConfirmButton);

  decorateIcons(deleteContent);

  await createModalFromContent('delete-card-modal', deleteTitle, deleteContent.outerHTML, ['delete-card-modal'], 'trash', false, 'icon-close-black');

  document.querySelector('.delete-card-modal .delete-cancel').addEventListener('click', () => {
    closeModal('delete-card-modal');
  });

  document.querySelector('.delete-card-modal .delete-confirm').addEventListener('click', async () => {
    const response = await deleteSavedCard(publicHash);
    if (!response.success) {
      showPageErrorMessage(placeholders.errorDeletingCard || 'Error deleting saved card');
    }

    closeModal('delete-card-modal');

    block.dispatchEvent(new CustomEvent('saved-cards-updated'));
    return response.data;
  });

  openModal('delete-card-modal');
}

function decorateSavedCard(parent, wrapper, card, placeholders) {
  const {
    token_details: tokenDetails, public_hash: publicHash,
  } = card;

  const {
    savedCardsCardNumber, savedCardsCardExpiryDate,
  } = placeholders;

  const tokenJson = JSON.parse(tokenDetails);

  const cardWrapper = document.createElement('div');
  cardWrapper.classList.add('card');

  const cardDetailsDiv = document.createElement('div');
  cardDetailsDiv.classList.add('card-details-wrapper');

  cardWrapper.appendChild(cardDetailsDiv);

  const cardIconDiv = document.createElement('div');
  cardIconDiv.classList.add('card-icon');
  cardIconDiv.innerHTML = `<span class="icon icon-${tokenJson.type.split(' ').join('-').toLowerCase()}"/>`;

  cardDetailsDiv.appendChild(cardIconDiv);

  const cardDetails = document.createElement('div');
  cardDetails.classList.add('card-details');

  cardDetailsDiv.appendChild(cardDetails);

  const cardNumber = document.createElement('div');
  cardNumber.classList.add('card-number');
  cardNumber.innerHTML = `
            <span class="card-label">${savedCardsCardNumber || 'Card Number'}</span>
            <span class="card-number-masked">${getCardMaskedNumber(tokenJson.maskedCC, tokenJson.type)}</span>
        `;
  cardDetails.appendChild(cardNumber);

  const cardExpiry = document.createElement('div');
  cardExpiry.classList.add('card-expiry');
  cardExpiry.innerHTML = `
            <span class="card-label" >${savedCardsCardExpiryDate || 'Expiry Date'}</span>
            <span class="card-expiry-date">${getFormattedCardExpiry(tokenJson.expirationDate)}</span>
        `;
  cardDetails.appendChild(cardExpiry);

  const cardActions = document.createElement('div');
  cardActions.classList.add('card-actions');
  cardActions.innerHTML = `
    <span class="icon icon-trash-light"></span>
    <span class="icon icon-trash hovericon"></span>`;

  cardActions.addEventListener('click', () => {
    deleteCard(parent, publicHash, placeholders);
  });

  cardWrapper.appendChild(cardActions);

  wrapper.appendChild(cardWrapper);
}

async function decorateSavedCards(block, parent) {
  const savedCards = await getSavedCards();

  if (savedCards?.total_count === 0) {
    block.classList.remove('hide');
    block.classList.add('empty');

    parent.innerHTML = '';
    return;
  }
  const placeholders = await fetchPlaceholdersForLocale();
  const { savedCardsExpiryMessage } = placeholders;

  const cardWrapper = document.createElement('div');
  cardWrapper.classList.add('card-wrapper');

  savedCards.items
    .filter((card) => (card.is_active === true && card.is_visible === true))
    .forEach((card) => {
      decorateSavedCard(parent, cardWrapper, card, placeholders);
    });

  parent.innerHTML = '';

  decorateIcons(cardWrapper);

  parent.appendChild(cardWrapper);

  const expiryMessage = document.createElement('span');
  expiryMessage.classList.add('expiry-message');
  expiryMessage.textContent = savedCardsExpiryMessage || 'Your expired cards will be automatically removed from your account.';

  parent.appendChild(expiryMessage);
  block.classList.remove('hide');
}

export default async function decorate(block) {
  const isLoggedIn = await isLoggedInUser();
  if (!isLoggedIn) {
    window.location.href = '/en/user/login';
  }

  const emptyCards = document.createElement('div');
  emptyCards.classList.add('empty-cards');
  emptyCards.innerHTML = block.innerHTML;

  block.innerHTML = '';

  block.appendChild(emptyCards);

  const cardWrapper = document.createElement('div');
  cardWrapper.classList.add('card-wrapper-outer');
  block.appendChild(cardWrapper);

  const loadingBlock = document.createElement('div');
  loadingBlock.classList.add('loading-block');
  loadingBlock.innerHTML = `
      <div class="loading-spinner">
        <span class="icon icon-ic-loader"></span>
      </div>
    `;
  decorateIcons(loadingBlock);
  block.appendChild(loadingBlock);

  block.classList.add('hide');

  decorateSavedCards(block, cardWrapper);

  block.addEventListener('saved-cards-updated', () => {
    decorateSavedCards(block, cardWrapper);
  });
}
