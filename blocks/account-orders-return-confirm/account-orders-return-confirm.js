import { getAddressAreas, getAddressCitySegments } from '../../scripts/address/api.js';
import { getConfigValue } from '../../scripts/configs.js';
import { getOrder, getRMAInfo } from '../../scripts/order/api.js';
import { fetchPlaceholdersForLocale, getLocale } from '../../scripts/scripts.js';
import { renderRmaOrderBucketContent } from '../account-orders-detail/account-orders-detail.js';
import { renderReturnFooter } from '../account-orders-return/account-orders-return.js';
import { fetchProductDataForOrders, formatDateTime } from '../account-recent-orders/account-recent-orders.js';

/**
 * Creates and renders the Return ID informations section
 * @param {Object} returnData The RMA return object
 * @param {Object} placeholders The translation placeholder object
 * @param {String} locale The locale string
 */
const renderReturnIdInfoBox = async (returnData, placeholders, locale) => {
  const infoBox = document.createElement('div');
  infoBox.classList.add('return-confirm-info-box', 'info-box-return-id');

  const returnIdLabel = document.createElement('p');
  returnIdLabel.classList.add('text-md', 'text-light');
  returnIdLabel.innerText = placeholders?.orderReturnId || 'Return ID';
  infoBox.appendChild(returnIdLabel);

  const returnIdText = document.createElement('p');
  returnIdText.classList.add('text-dark');
  returnIdText.innerText = returnData?.increment_id || '';
  infoBox.appendChild(returnIdText);

  const returnTime = document.createElement('p');
  returnTime.classList.add('text-md', 'text-light');
  returnTime.innerText = await formatDateTime(returnData.date_requested, locale);
  infoBox.appendChild(returnTime);

  return infoBox;
};

/**
 * Creates and renders the Refund method contents
 * @param {String} icon
 * @param {String} label
 */
const getRefundMethodContent = (icon, label) => {
  const refundMethod = document.createElement('div');
  refundMethod.classList.add('refund-method-content');

  const refundIcon = document.createElement('img');
  refundIcon.setAttribute('src', `/icons/${icon}.svg`);
  refundMethod.appendChild(refundIcon);

  const refundLabel = document.createElement('span');
  refundLabel.innerText = label;
  refundMethod.appendChild(refundLabel);

  return refundMethod;
};

/**
 * Creates and renders the refund method information content
 * @param {Object} orderData The order details object
 * @param {Object} returnData The RMA return object
 * @param {Object} placeholders translation placeholder object
 */
const renderRefundMethodInfoBox = (orderData, returnData, placeholders) => {
  const infoBox = document.createElement('div');
  infoBox.classList.add('return-confirm-info-box', 'info-box-refund-method');

  const refundMethodLabel = document.createElement('p');
  refundMethodLabel.classList.add('text-md', 'text-light');
  refundMethodLabel.innerText = placeholders?.orderReturnRefundMethod || 'Refund Method';
  infoBox.appendChild(refundMethodLabel);

  // Gets the refund method type
  const refundMethod = returnData?.extension_attributes?.refund_mode ?? orderData?.payment?.method;

  if (!refundMethod) {
    return null;
  }

  let icon = '';
  let label = '';
  let methodContent = null;

  switch (refundMethod) {
    // Card or e-Gift
    case 'checkout_com_upapi':
      if (orderData?.payment?.extension_attributes?.vault_payment_token?.token_details) {
        const {
          maskedCC,
          type,
        } = JSON.parse(orderData.payment.extension_attributes.vault_payment_token.token_details);

        label = (placeholders?.orderRefundCreditcardEnding || 'Credit Card ending {{}}').replace('{{}}', maskedCC);
        icon = type.toLowerCase();
      }
      break;

    // e-Gift card
    case 'hps_payment':
      label = placeholders?.orderRefundEGiftCard || 'e-Gift Card';
      icon = 'egift';
      break;

    // Cash on delivery
    case 'cashondelivery':
      label = placeholders?.orderRefundCashOnDelivery || 'Cash on delivery';
      icon = 'cod';
      break;

    // Aura
    case 'aura_payment':
      label = placeholders?.orderRefundAura || 'Aura';
      icon = 'aura';
      break;

    // Tabby (BNPL)
    case 'tabby':
      label = placeholders?.orderRefundTabby || 'Tabby';
      icon = 'tabby';
      break;

    // Tamara
    case 'tamara':
      label = placeholders?.orderRefundTamara || 'Tamara';
      icon = 'tamara';
      break;

    // Fawry
    case 'checkout_com_upapi_fawry':
      label = placeholders?.orderRefundFawry || 'Fawry';
      icon = 'fawry';
      break;

    default:
      break;
  }

  methodContent = getRefundMethodContent(icon, label);

  if (methodContent) {
    infoBox.appendChild(methodContent);
  }

  return infoBox;
};

/**
 * Creates and renders the pickup details informations
 * @param {Object} orderData The RMA return object
 * @param {Object} placeholders The translation placeholder object
 */
const renderPickupFromInfoBox = async (orderData, placeholders) => {
  const infoBox = document.createElement('div');
  infoBox.classList.add('return-confirm-info-box', 'info-box-refund-method');

  const pickupFromLabel = document.createElement('p');
  pickupFromLabel.classList.add('text-md', 'text-light');
  pickupFromLabel.innerText = placeholders?.orderReturnPickupFrom || 'Pick-up From';
  infoBox.appendChild(pickupFromLabel);

  const pickupAddressContent = document.createElement('div');
  pickupAddressContent.classList.add('pickup-address-content');

  // Delivery address details
  let delAddr = {};
  const shippingData = orderData?.extension_attributes?.shipping_assignments?.[0]?.shipping;
  if (shippingData) {
    delAddr = shippingData.address;
  }
  const delAddrName = `${delAddr?.firstname} ${delAddr?.lastname}`;
  const delCountry = delAddr?.country_id;

  const countryCode = await getConfigValue('country-code');
  // Fetches the list of cities
  const cityData = await getAddressCitySegments(countryCode);

  const delAreaSegment = delAddr?.extension_attributes?.area;
  const delCitySegment = delAddr?.extension_attributes?.address_city_segment;

  let delCity = '';
  if (cityData?.items?.length > 0) {
    const delCityObj = cityData.items.find((cityObj) => cityObj.location_id === delCitySegment);

    if (delCityObj) {
      delCity = delCityObj.name;
    }
  }

  // Fetches the list of delivery areas as part of the city segment
  let delArea = '';
  const delAreaData = await getAddressAreas(countryCode, delCitySegment);
  if (delAreaData?.items?.length > 0) {
    const delAreaObj = delAreaData.items.find(
      (areaObj) => areaObj.location_id === delAreaSegment,
    );

    if (delAreaObj) {
      delArea = delAreaObj.name;
    }
  }

  const delStreet = delAddr?.street?.length > 0 ? delAddr.street.join(', ') : '';
  const delBuilding = delAddr?.extension_attributes?.address_building_segment ?? '';
  const delTelNumber = delAddr.telephone;

  pickupAddressContent.innerHTML = `
    <div class="delivery-details-info">
      <div class="address">
        <p>${delAddrName}</p>
        <p>${delCountry}</p>
        <p>${delCity}</p>
        <p>${delArea}</p>
        <p>${delStreet}</p>
        <p>${delBuilding}</p>
      </div>

      <div class="mobile">
        <p class="mobile-number-order-details">${delTelNumber}</p>
      </div>
    </div>
  `;

  infoBox.appendChild(pickupAddressContent);

  return infoBox;
};

/**
 * @param {Object} returnData The RMA return object
 * @param {Object} orderData The order data object
 * @param {Object} productData The product data object
 * @param {Object} placeholders The translation placeholder object
 * @param {String} locale The locale string
 */
const renderReturnRmaItems = async (returnData, orderData, productData, placeholders, locale) => {
  if (!returnData) {
    return null;
  }

  const returnRmaBucket = document.createElement('div');
  returnRmaBucket.classList.add('return-rma-bucket');

  const returnRmaBucketItems = document.createElement('div');
  returnRmaBucketItems.classList.add('return-rma-bucket-list');

  const returnRmaBucketItem = document.createElement('div');
  returnRmaBucketItem.classList.add('return-rma-bucket-list-item');

  // Bucket content
  const rmaOrderBucketContent = await renderRmaOrderBucketContent(
    returnData,
    orderData,
    productData,
    placeholders,
    locale,
  );

  if (rmaOrderBucketContent) {
    returnRmaBucketItem.appendChild(rmaOrderBucketContent);
  }

  returnRmaBucketItems.appendChild(returnRmaBucketItem);

  returnRmaBucket.appendChild(returnRmaBucketItems);

  return returnRmaBucket;
};

/**
 * Creates and renders the block header buttons
 * @param {*} order The order details object
 * @param {*} placeholders translation placeholder object
 */
const renderHeaderButtons = (order, placeholders) => {
  const header = document.querySelector('.section.return-confirm-header');
  if (!header) {
    return;
  }

  const title = header.querySelector('.default-content-wrapper');

  if (!title) {
    return;
  }

  const lang = document.documentElement.lang || 'en';

  const orderDetailsLink = document.createElement('a');
  orderDetailsLink.classList.add('button');
  orderDetailsLink.setAttribute('href', `/${lang}/user/account/orders/details?orderId=${order?.entity_id}`);
  orderDetailsLink.innerText = placeholders?.orderGoToOrderDetails || 'Go to order details';
  title.appendChild(orderDetailsLink);
};

/**
 * @param {Object} orderData The order details object
 * @param {Object} returnData The RMA return object
 * @param {Object} placeholders The translation placeholder object
 * @param {String} locale The locale string
 */
const renderReturnDetails = async (orderData, returnData, placeholders, locale) => {
  const returnDetails = document.createElement('div');
  returnDetails.classList.add('return-confirm-return-details', 'return-confirm-section');

  const title = document.createElement('div');
  title.classList.add('return-confirm-section-title');
  title.innerText = placeholders?.orderReturnDetails || 'Return Details';

  returnDetails.appendChild(title);

  const returnDetailContent = document.createElement('div');
  returnDetailContent.classList.add('return-confirm-return-detail-content');

  // Return details information
  const returnIdInfoBox = await renderReturnIdInfoBox(returnData, placeholders, locale);
  if (returnIdInfoBox) {
    returnDetailContent.appendChild(returnIdInfoBox);
  }

  // Refund details information
  const refundMethodInfoBox = renderRefundMethodInfoBox(
    orderData,
    returnData,
    placeholders,
  );
  if (refundMethodInfoBox) {
    returnDetailContent.appendChild(refundMethodInfoBox);
  }

  // Pickup details informations
  const pickupFromInfoBox = await renderPickupFromInfoBox(
    orderData,
    placeholders,
    locale,
  );
  if (pickupFromInfoBox) {
    returnDetailContent.appendChild(pickupFromInfoBox);
  }

  returnDetails.appendChild(returnDetailContent);

  const returnDetailsNote = document.createElement('p');
  returnDetailsNote.classList.add('text-sm', 'text-light', 'return-confirm-details-note');
  returnDetailsNote.innerText = placeholders?.orderReturnConfirmDetailsNote || 'Note - You can cancel this return order before 24hrs from the time of pick-up.';
  returnDetails.appendChild(returnDetailsNote);

  return returnDetails;
};

/**
 * Renders the list of items to return
 * @param {*} orderData The order data object
 * @param {*} returnData The RMA return object
 * @param {*} placeholders The translation placeholder object
 * @param {*} locale The locale string
 */
const renderItemsToReturn = async (orderData, returnData, placeholders, locale) => {
  const itemsToReturn = document.createElement('div');
  itemsToReturn.classList.add('return-confirm-items-to-return', 'return-confirm-section');

  const title = document.createElement('div');
  title.classList.add('return-confirm-section-title');
  title.innerText = placeholders?.orderItemsToReturn || 'Items to return';

  itemsToReturn.appendChild(title);

  const productData = await fetchProductDataForOrders({ items: [orderData] });
  const itemsToReturnContent = await renderReturnRmaItems(
    returnData,
    orderData,
    productData,
    placeholders,
    locale,
  );

  itemsToReturn.appendChild(itemsToReturnContent);

  return itemsToReturn;
};

/**
 * Renders the order confirmtion section content
 * @param {HTMLElement} block The block element
 * @param {String} orderId Order ID
 * @param {String} returnId Return ID
 * @param {Object} placeholders The translation placeholder object
 * @param {String} locale The locale string
 */
const renderOrderConfirmation = async (block, orderId, returnId, placeholders, locale) => {
  if (!(orderId && returnId)) {
    return;
  }

  const [footerBottom] = block.querySelectorAll(':scope > div');

  const orderData = await getOrder(orderId);
  const returnData = await getRMAInfo(returnId);

  block.innerHTML = '';
  block.classList.add('account-return-confirm', 'account-orders');

  renderHeaderButtons(orderData, block, placeholders);

  // Renders the return details
  const returnDetails = await renderReturnDetails(orderData, returnData, placeholders, locale);
  if (returnDetails) {
    block.appendChild(returnDetails);
  }

  // Renders the items to return section
  const itemsToReturn = await renderItemsToReturn(orderData, returnData, placeholders, locale);
  if (itemsToReturn) {
    block.appendChild(itemsToReturn);
  }

  // Renders the page footer
  const returnFooter = renderReturnFooter(orderData, footerBottom, placeholders);
  if (returnFooter) {
    block.appendChild(returnFooter);
  }
};

/**
 * The main block decoration begins here
 * @param {*} block The parent element of the block
 */
export default async function decorate(block) {
  const placeholders = await fetchPlaceholdersForLocale();
  const locale = await getLocale();

  const urlParams = new URLSearchParams(window.location.search);
  const orderId = urlParams.get('orderId');
  const returnId = urlParams.get('returnId');

  await renderOrderConfirmation(block, orderId, returnId, placeholders, locale);
}
