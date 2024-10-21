import { getAddressAreas, getAddressCitySegments } from '../../scripts/address/api.js';
import { decorateIcons } from '../../scripts/aem.js';
import { getConfigValue } from '../../scripts/configs.js';
import {
  getDownloadInvoiceUrl,
  getOrder,
  getRMAsByOrderId,
  putReturnCancellation,
} from '../../scripts/order/api.js';
import {
  fetchPlaceholdersForLocale,
  getLocale,
  openModal,
  formatPrice,
  closeModal,
  createModalFromContent,
} from '../../scripts/scripts.js';
import { getStores } from '../../scripts/stores/api.js';
import {
  convertToCamelCase,
  decorateOrderReturnDetails,
  decorateReviews,
  fetchProductDataForOrders,
  fetchReviewsForOrders,
  formatDateTime,
  getCancelledItemsCount,
  getCancelledOrderCount,
  getDeliveredItemsCount,
  getOrderCancelledItems,
  getOrderDeliveredItems,
  getOrderProductNames,
  getOrderRefundedItems,
  getOrderStatus,
  getProductImage,
  getTotalItemsCount,
  isClickAndCollect,
  isRefundedFully,
} from '../account-recent-orders/account-recent-orders.js';

// The return RMA object to be send to the return request
const rmaDataObject = {};
const FREE_ITEM_PRICE = 0.01;

/**
 * Renders the page loader
 * @param {HTMLElement} block
 */
export const renderReturnLoader = (block) => {
  const loader = document.createElement('div');
  loader.classList.add('return-global-loader', 'hidden');
  loader.setAttribute('id', 'return-global-loader');

  const loaderIcon = document.createElement('img');
  loaderIcon.setAttribute('src', '/icons/ic-loader.svg');
  loader.appendChild(loaderIcon);

  block.appendChild(loader);
};
/**
 * Toggles the state (show and hide) the laoder
 * @param {Boolean} state
 */
export const toggleGlobalLoader = (state) => {
  const loader = document.getElementById('return-global-loader');

  if (!loader) {
    return;
  }

  if (state) {
    loader.classList.remove('hidden');
  } else {
    loader.classList.add('hidden');
  }
};

/**
 * Renders the Download Invoice button
 * @param {Object} order The order data object
 * @param {Object} placeholders The translation placeholder object
 * @returns the Download Invoice button
 */
const getDownloadInvoiceBtn = async (order, placeholders) => {
  // checks if increment_id is present as part of the order
  // else don't render the button
  if (!order?.increment_id) {
    return null;
  }

  const downloadLink = await getDownloadInvoiceUrl(order.increment_id);

  if (!downloadLink) {
    return null;
  }

  const invoiceBtn = document.createElement('a');
  invoiceBtn.setAttribute('href', downloadLink);
  invoiceBtn.setAttribute('download', '');
  invoiceBtn.innerText = placeholders?.orderDownloadInvoice || 'Download Invoice';

  return invoiceBtn;
};

/**
 * @param {*} order The order details object
 * @param {*} placeholders The translation placeholder object
 * @returns the page header buttons
 */
const renderHeaderButtons = async (order, placeholders) => {
  if (!order) {
    return;
  }

  // Decorates the back button on the title.
  // Visible only in mobile screen resolution.
  const title = document.querySelector('.account-orders-detail-container > .default-content-wrapper').childNodes[0];
  if (title) {
    title.classList.add('order-details-page-title');
    const lang = document.documentElement.lang || 'en';
    const backToOrdersButton = document.createElement('a');
    backToOrdersButton.classList.add('button-back-to-orders');
    backToOrdersButton.setAttribute('href', `/${lang}/user/account/orders`);
    title.prepend(backToOrdersButton);
  }

  // Download invoice button
  const invoiceBtn = await getDownloadInvoiceBtn(order, placeholders);

  // Adds the button right to the title
  if (invoiceBtn) {
    const titleWrapper = document.querySelector('.account-orders-detail-container > .default-content-wrapper');
    if (titleWrapper) {
      titleWrapper.appendChild(invoiceBtn);
    }
  }
};

/**
 * Creates and renders the list of order items as part of the order
 * This mehod is reused for both Home delivery type &
 * Click and collect orders
 * @param {*} order The order details object
 * @param {*} items The array of items object as part of an order
 * @param {*} productData The product data object
 * @param {*} placeholders The translation placeholder object
 * @param {*} locale The locale string
 * @param {Boolean} isCancelled used to differentiate the home delivery & click and collect order
 * @returns
 */
const buildOrderList = (
  order,
  items,
  productData,
  placeholders,
  locale,
  isCancelled = false,
  isRmaOrder = false,
) => {
  const itemsList = document.createElement('div');
  itemsList.classList.add('items-list');

  // Iterates over each order items to render order list
  items.forEach(async (item) => {
    const itemRow = document.createElement('div');
    itemRow.classList.add('order-item');

    const itemSku = item.extension_attributes?.parent_product_sku;
    const product = productData?.find((p) => p.sku === itemSku);

    const orderItemImage = document.createElement('div');
    orderItemImage.classList.add('order-item-image');
    if (isCancelled) {
      orderItemImage.classList.add('is-cancelled');
    }
    const orderSwatchImg = getProductImage(product);
    if (isCancelled) {
      const cancelledBadge = document.createElement('span');
      cancelledBadge.classList.add('swatch-img-badge');
      cancelledBadge.innerText = placeholders?.orderCancelledBadge || 'Cancelled';
      orderSwatchImg.appendChild(cancelledBadge);
    }
    orderItemImage.appendChild(orderSwatchImg);

    const productInfo = document.createElement('div');
    productInfo.classList.add('product-info');

    const brandFullNameValue = item.extension_attributes?.brand_full_name;
    if (brandFullNameValue) {
      const brandFullNameParagraph = document.createElement('p');
      brandFullNameParagraph.classList.add('text-light', 'text-md');
      brandFullNameParagraph.textContent = brandFullNameValue;
      productInfo.appendChild(brandFullNameParagraph);
    }

    // Product Title
    const productInfoTitle = document.createElement('h6');
    productInfoTitle.classList.add('title', 'text-dark');
    productInfoTitle.textContent = item.name;
    productInfo.appendChild(productInfoTitle);

    // Product options
    const productOptions = item?.product_option?.extension_attributes?.configurable_item_options;
    const extAttributes = item?.extension_attributes?.product_options;
    if (productOptions?.length && extAttributes?.length && !isCancelled) {
      const { attributes_info: attrInfo } = JSON.parse(extAttributes[0]);

      productOptions.forEach((option) => {
        const currOption = attrInfo.find((info) => +info.option_id === +option.option_id);

        if (currOption) {
          const optionElem = document.createElement('p');
          optionElem.classList.add('text-light', 'text-md');
          optionElem.textContent = `${currOption.label}: ${currOption.value}`;
          productInfo.appendChild(optionElem);
        }
      });
    }

    // Item code
    const itemCode = document.createElement('p');
    itemCode.classList.add('item-code', 'text-md', 'text-light', 'break-word');
    itemCode.textContent = `${placeholders?.orderItemCode || 'Item Code'}: ${item.sku}`;
    productInfo.appendChild(itemCode);

    // Quantity of an item
    let itemQuantity = isCancelled ? getCancelledItemsCount(item) : getDeliveredItemsCount(item);

    if (isRmaOrder) {
      itemQuantity = item?.qty_requested || 0;
    }

    const itemQuantityElem = document.createElement('p');
    itemQuantityElem.classList.add('qty', 'text-md', 'text-light');
    itemQuantityElem.textContent = (placeholders.orderItemQuantity || 'Quantity: {{}}').replace('{{}}', itemQuantity);
    productInfo.appendChild(itemQuantityElem);

    // Unit price details
    const unitInfo = document.createElement('div');
    unitInfo.classList.add('unit-info');

    const unitInfoTitle = document.createElement('p');
    unitInfoTitle.classList.add('text-md', 'text-light');
    unitInfoTitle.textContent = placeholders.orderUnitPrice || 'Unit Price';
    unitInfo.appendChild(unitInfoTitle);

    const unitInfoPrice = document.createElement('h6');
    unitInfoPrice.classList.add('text-dark');

    // Set price or set as free if price is 0.01
    unitInfoPrice.textContent = item.price_incl_tax === FREE_ITEM_PRICE ? placeholders.orderPriceFree ?? 'Free' : await formatPrice(order.order_currency_code, item.price_incl_tax);

    unitInfo.appendChild(unitInfoPrice);

    // Total price details
    const total = document.createElement('div');
    total.classList.add('total-info');

    const totalTitle = document.createElement('p');
    totalTitle.classList.add('text-md', 'text-light');
    totalTitle.textContent = placeholders.orderTotal || 'Total';
    total.appendChild(totalTitle);

    const totalPrice = document.createElement('h6');
    totalPrice.classList.add('text-dark');
    if (isCancelled) {
      totalPrice.classList.add('text-strike');
      totalPrice.textContent = item.price_incl_tax === FREE_ITEM_PRICE ? placeholders.orderPriceFree ?? 'Free' : await formatPrice(order.order_currency_code, item?.extension_attributes?.oms_amount_refunded || 0);
    } else {
      totalPrice.textContent = item.price_incl_tax === FREE_ITEM_PRICE ? placeholders.orderPriceFree ?? 'Free' : await formatPrice(order.order_currency_code, itemQuantity * item.price_incl_tax);
    }
    total.appendChild(totalPrice);

    const itemReview = document.createElement('div');
    itemReview.classList.add('order-item-review');

    // Rendering of the Write a review button
    const reviewButton = document.createElement('button');
    reviewButton.classList.add('button', 'write-review');
    itemReview.dataset.productId = item?.extension_attributes?.parent_product_sku;
    itemReview.dataset.productName = item?.name;
    reviewButton.textContent = placeholders.orderItemWriteReview || 'Write a Review';
    itemReview.appendChild(reviewButton);

    const productImage = orderSwatchImg.querySelector('img');
    reviewButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.target.classList.add('loader');
      import('../product-details/slots/write-review.js').then((module) => {
        module.default({
          sku: item?.sku,
          name: item?.name,
          images: [{
            url: `${productImage?.getAttribute('src') || ''}`,
          }],
        }, null, placeholders, locale, true).then(() => {
          openModal('write-ratings-dialog');
          e.target.classList.remove('loader');
        });
      });
    });

    itemRow.appendChild(orderItemImage);
    itemRow.appendChild(productInfo);
    itemRow.appendChild(unitInfo);
    itemRow.appendChild(total);

    if (!isCancelled && !isRmaOrder) {
      itemRow.appendChild(itemReview);
    }

    itemsList.appendChild(itemRow);
  });

  return itemsList;
};

/**
 * Creates and renders the RMA return orders bucket items
 * @param {Object} rmaOrder The RMA return object
 * @param {Object} order The order data object
 * @param {Object} productData The product data object
 * @param {Object} placeholders The translation placeholder object
 * @param {*} locale The locale string
 * @returns the RMA return orders bucket items
 */
export const renderRmaOrderBucketContent = async (
  rmaOrder,
  order,
  productData,
  placeholders,
  locale,
) => {
  const bucketItemsContainer = document.createElement('div');
  bucketItemsContainer.classList.add('order-rma-items-wrapper', 'order-itemized-wrapper');

  // Creates the processed RMA object
  const inOrderItems = [];
  rmaOrder.items.forEach((rmaItem) => {
    order.items.forEach((orderItem) => {
      if (orderItem.item_id === rmaItem.order_item_id) {
        orderItem.qty_requested = rmaItem.qty_requested;
        inOrderItems.push(orderItem);
      }
    });
  });

  // Creates the return items list
  const rmaBucketItemList = buildOrderList(
    order,
    inOrderItems,
    productData,
    placeholders,
    locale,
    false,
    true,
  );

  bucketItemsContainer.appendChild(rmaBucketItemList);

  return bucketItemsContainer;
};

/**
 * Handles the 'Yes' button click on the cancel return modal
 * @param {String} orderId
 */
const handleReturnCancelModalYes = async (orderId) => {
  // Close the cancel return modal
  closeModal('order-return-cancel-modal');
  // Toggles the laoder to visibility
  toggleGlobalLoader(true);

  const response = await putReturnCancellation(orderId, { rmaDataObject });

  if (response?.order_id) {
    window.location.reload();
  }
};
/**
 * Creates and renders the cancel return modal
 * @param {String} orderId
 * @param {Object} placeholders The translation placeholder object
 */
const createCancelReturnModal = async (orderId, placeholders) => {
  const modalTitle = placeholders?.orderReturnCancelModalTitle || 'Cancel Return';

  const modalContentWrapper = document.createElement('div');

  const modalContent = document.createElement('div');
  modalContent.classList.add('order-return-cancel-modal-content');

  // Modal content
  const modalContentText = document.createElement('p');
  modalContentText.innerText = placeholders?.orderReturnCancelModalContentText || 'Are you sure you would like to cancel this return request?';

  const btnWrapper = document.createElement('div');
  btnWrapper.classList.add('order-return-btn-wrapper');

  const btnYes = document.createElement('button');
  btnYes.setAttribute('id', 'order-return-cancel-btn-yes');
  btnYes.innerText = placeholders?.orderReturnCancelModalYes || 'Yes';

  const btnNo = document.createElement('button');
  btnNo.classList.add('secondary');
  btnNo.setAttribute('id', 'order-return-cancel-btn-no');
  btnNo.innerText = placeholders?.orderReturnCancelModalNo || 'No';

  btnWrapper.appendChild(btnYes);
  btnWrapper.appendChild(btnNo);

  modalContent.appendChild(modalContentText);
  modalContentWrapper.appendChild(modalContent);
  modalContentWrapper.appendChild(btnWrapper);

  await createModalFromContent('order-return-cancel-modal', modalTitle, modalContentWrapper.innerHTML, ['order-return-cancel-modal', 'order-return-modal'], '', false, 'icon-close-black');

  const buttonYes = document.getElementById('order-return-cancel-btn-yes');
  buttonYes.addEventListener('click', () => handleReturnCancelModalYes(orderId));

  const buttonNo = document.getElementById('order-return-cancel-btn-no');
  buttonNo.addEventListener('click', () => closeModal('order-return-cancel-modal'));
};

/**
 * Handles the cancel RMA return
 * @param {Object} rmaOrder The RMA return object
 * @param {Object} placeholders The translation placeholder object
 */
const handleCancelRmaReturn = async (rmaOrder, placeholders) => {
  const {
    increment_id: orderIncrementId,
    entity_id: orderEntityId,
    order_id: orderOrderId,
    items: rmaItems,
  } = rmaOrder;
  const items = [];
  rmaItems.forEach((rmaItem) => {
    const {
      entity_id: itemEntityId,
      rma_entity_id: itemRmaEntityId,
      order_item_id: itemOrderItemId,
    } = rmaItem;

    items.push({
      entity_id: itemEntityId,
      rma_entity_id: itemRmaEntityId,
      order_item_id: itemOrderItemId,
      status: 'cancelled',
    });
  });

  rmaDataObject.increment_id = orderIncrementId;
  rmaDataObject.entity_id = orderEntityId;
  rmaDataObject.order_id = orderOrderId;
  rmaDataObject.items = items;
  rmaDataObject.status = 'closed';

  await createCancelReturnModal(orderOrderId, placeholders);

  openModal('order-return-cancel-modal');
};

/**
 * Creates and renders the list of RMA return bucket items
 * @param {Object} rmaData The RMA return object
 * @param {Object} order The order data object
 * @param {Object} productData The product data object
 * @param {Object} placeholders The translation placeholder object
 * @param {String} locale The locale string
 * @returns the list of RMA return bucket items
 */
const renderReturnRmaBucket = async (rmaData, order, productData, placeholders, locale) => {
  if (rmaData?.total_count === 0) {
    return null;
  }

  const invalidRmaStatusKeys = ['closed', 'customer-cancelled-return', 'goods-collected', 'refunded', 'return-rejected'];
  const processedRmaData = rmaData.items.filter((item) => !invalidRmaStatusKeys
    .some((key) => item.status === key));

  if (!processedRmaData?.length) {
    return null;
  }

  const returnRmaBucket = document.createElement('div');
  returnRmaBucket.classList.add('return-rma-bucket');

  const returnRmaBucketItems = document.createElement('div');
  returnRmaBucketItems.classList.add('return-rma-bucket-list');

  processedRmaData.forEach(async (rmaOrder) => {
    const returnRmaBucketItem = document.createElement('div');
    returnRmaBucketItem.classList.add('return-rma-bucket-list-item');

    // Return bucket heading
    const returnRmaBucketHead = document.createElement('div');
    returnRmaBucketHead.classList.add('return-rma-bucket-list-item-head');

    const returnRmaBucketHeadLeft = document.createElement('div');
    returnRmaBucketHeadLeft.classList.add('list-item-head-left');
    const returnRmaBucketHeadStatus = document.createElement('div');
    returnRmaBucketHeadStatus.classList.add('list-item-head-status');

    const returnRmaBucketHeadLabel = document.createElement('span');
    returnRmaBucketHeadLabel.classList.add('list-item-head-status-label');
    const returnRmaBucketHeadLabelClass = (rmaOrder?.extension_attributes?.customer_status_key || '')
      .replace(/_/g, '-');
    returnRmaBucketHeadLabel.classList.add(returnRmaBucketHeadLabelClass);
    returnRmaBucketHeadLabel.innerText = rmaOrder?.extension_attributes?.customer_status || '';
    returnRmaBucketHeadStatus.appendChild(returnRmaBucketHeadLabel);

    const returnRmaBucketHeadMsg = document.createElement('span');
    returnRmaBucketHeadMsg.classList.add('list-item-head-status-msg');
    returnRmaBucketHeadMsg.innerText = ` - ${(rmaOrder?.extension_attributes?.description || '')}`;
    returnRmaBucketHeadStatus.appendChild(returnRmaBucketHeadMsg);

    returnRmaBucketHeadLeft.appendChild(returnRmaBucketHeadStatus);

    const returnIdLabel = document.createElement('p');
    returnIdLabel.classList.add('text-xs', 'text-light');
    const returnIdLabelPlaceholder = placeholders?.orderReturnId || 'Return ID';
    returnIdLabel.innerText = `${returnIdLabelPlaceholder}: ${rmaOrder?.increment_id || ''}`;

    returnRmaBucketHeadLeft.appendChild(returnIdLabel);

    const returnRmaBucketHeadRight = document.createElement('div');
    returnRmaBucketHeadRight.classList.add('list-item-head-right');

    // Cancel button
    const cancelReturnButton = document.createElement('button');
    cancelReturnButton.innerText = placeholders?.orderCancelReturn || 'Cancel Return';
    if (rmaOrder?.extension_attributes?.customer_status_key === 'goods_collected') {
      cancelReturnButton.disabled = true;
      cancelReturnButton.classList.add('disabled', 'btn-return-request-cancel');
    } else {
      cancelReturnButton.classList.add('secondary', 'btn-return-request-cancel');
      cancelReturnButton.addEventListener('click', () => handleCancelRmaReturn(rmaOrder, placeholders));
    }

    returnRmaBucketHeadRight.appendChild(cancelReturnButton);

    returnRmaBucketHead.appendChild(returnRmaBucketHeadLeft);
    returnRmaBucketHead.appendChild(returnRmaBucketHeadRight);

    returnRmaBucketItem.appendChild(returnRmaBucketHead);

    // Return Bucket content
    const rmaOrderBucketContent = await renderRmaOrderBucketContent(
      rmaOrder,
      order,
      productData,
      placeholders,
      locale,
    );
    if (rmaOrderBucketContent) {
      returnRmaBucketItem.appendChild(rmaOrderBucketContent);
    }

    returnRmaBucketItems.appendChild(returnRmaBucketItem);
  });

  returnRmaBucket.appendChild(returnRmaBucketItems);

  return returnRmaBucket;
};

export const getReturnEligibleItems = (order) => order.items
  .filter((item) => !item.parent_item_id)
  .filter((item) => item.qty_ordered && !item?.extension_attributes?.qty_adjustments);

/**
 * Renders the order summary panel including the order title,
 * the order ID and the order total
 * @param {*} order The order details object
 * @param {*} placeholders translation placeholder object
 * @param {*} locale The locale string
 * @returns
 */
export const renderOrderSummaryPanel = async (order, placeholders, locale, isReturn = false) => {
  const summaryPanel = document.createElement('div');
  summaryPanel.classList.add('order-summary-row');

  const orderTotalCount = getTotalItemsCount(order);
  const orderTotalMessage = orderTotalCount > 1 ? placeholders.orderItemsTotal || 'Total {{}} items' : placeholders.orderItemTotal || 'Total {{}} item';
  const orderTotalItemsMessage = orderTotalMessage.replace('{{}}', orderTotalCount);

  // Rendering cancelled items label
  let cancelledItemsLabel = '';
  const cancelledLinkClassnames = ['cancelled-items-link'];
  if (!isReturn) {
    const cancelledItemsCount = getCancelledOrderCount(order);
    if (cancelledItemsCount === 0) {
      cancelledLinkClassnames.push('hidden');
    }
    cancelledItemsLabel = `${cancelledItemsCount} ${placeholders?.orderCancelled || 'Cancelled'}`;
  }

  const orderStatus = getOrderStatus(order);
  const orderStatusClassnames = ['order-status', `order-status-${orderStatus.replaceAll(' ', '-')}`];

  if (isRefundedFully(order)) {
    orderStatusClassnames.push('order-status-refunded-fully');
  }

  // Status of the order
  const orderStatusKey = convertToCamelCase(`order-status-${orderStatus.replaceAll(' ', '-')}`);
  const orderStatusText = placeholders[orderStatusKey] || orderStatus;

  const formattedPrice = await formatPrice(order.order_currency_code, order.grand_total);

  summaryPanel.innerHTML = `
    <div class="order-transaction">
      <p class="text-ellipsis text-light text-xs">${placeholders?.orderNumber || 'Order ID'}</p>
      <h6 class="text-dark">${order.increment_id}</h6>
      <p class="text-light text-xs">${await formatDateTime(order.created_at, locale)}</p>
    </div>
    <div class="order-name">
      <h6 class="text-ellipsis text-dark">${getOrderProductNames(order)}</h6>
      <p class="text-ellipsis text-light">${orderTotalItemsMessage}</p>
      <a href="#cancelled-items-section ${isReturn ? 'hidden' : ''}" class="${cancelledLinkClassnames.join(' ')}">${cancelledItemsLabel}</a>
    </div>
    <div class="order-summary-status">
      <span class="${orderStatusClassnames.join(' ')}">${orderStatusText}</span>
    </div>
    <div class="order-total above-mobile">
      <p class="text-light text-xs">${placeholders?.orderTotal || 'Order Total'}</p>
      <h6 class="text-dark">${formattedPrice}</h6>
    </div>
    <div class="empty-cell"></div>
  `;

  return summaryPanel;
};

/**
 * Renders the order return eligibility banner
 * @param {Object} order The order details object
 * @param {Object} placeholders translation placeholder object
 * @param {String} locale The locale string
 * @param {HTMLElement} block The parent block element
 */
const renderEligibilityMessage = (order, placeholders, locale, block) => {
  const eligibilityWrapper = document.createElement('div');
  eligibilityWrapper.classList.add('order-return', 'hide');

  block.appendChild(eligibilityWrapper);

  decorateOrderReturnDetails(eligibilityWrapper, order, placeholders, locale);
  decorateIcons(eligibilityWrapper);
};

/**
 * @param {String} code The payment method code
 * @returns Payment method name
 */
const getOrderPaymentMethodName = (order) => {
  const paymentMethodTitle = order?.extension_attributes?.payment_additional_info?.find((info) => info.key === 'method_title')?.value;

  if (paymentMethodTitle) {
    return paymentMethodTitle;
  }

  return '';
};

/**
 * Renders the order delivery details section for the Home delivery order
 * This inludes delivery details, billing details, payment methods
 * @param {*} order The order details object
 * @param {*} placeholders The translation placeholder object
 * @returns
 */
const buildHomeDeliveryDetails = async (order, placeholders) => {
  const deliveryDetailsContent = document.createElement('div');
  deliveryDetailsContent.classList.add('delivery-details-content');

  // Delivery address data
  let delAddr = {};
  const shippingData = order?.extension_attributes?.shipping_assignments?.[0]?.shipping;
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

  // Billing address data
  const billAddr = order.billing_address;
  const billAddrName = `${billAddr.firstname} ${billAddr.lastname}`;
  const billCountry = billAddr.country_id;

  const billAreaSegment = billAddr.extension_attributes?.area;
  const billCitySegment = billAddr.extension_attributes?.address_city_segment;

  let billCity = '';
  if (cityData?.items?.length > 0) {
    const billCityObj = cityData.items.find((cityObj) => cityObj.location_id === billCitySegment);

    if (billCityObj) {
      billCity = billCityObj.name;
    }
  }

  // Fetches the list of billing areas as part of the city segment
  let billArea = '';
  const billAreaData = await getAddressAreas(countryCode, billCitySegment);
  if (billAreaData?.items?.length > 0) {
    const billAreaObj = billAreaData.items.find(
      (areaObj) => areaObj.location_id === billAreaSegment,
    );

    if (billAreaObj) {
      billArea = billAreaObj.name;
    }
  }

  const billStreet = billAddr?.street?.length > 0 ? billAddr.street.join(', ') : '';
  const billBuilding = billAddr?.extension_attributes?.address_building_segment ?? '';
  const billTelNumber = billAddr.telephone;

  const paymentMethod = getOrderPaymentMethodName(order);

  let paymentDetails = '';
  if (order?.payment?.method === 'checkout_com_upapi_knet') {
    const paymentId = order?.extension_attributes?.payment_additional_info?.find((info) => info.key === 'knet_payment_id')?.value;
    const transactionId = order?.extension_attributes?.payment_additional_info?.find((info) => info.key === 'knet_transaction_id')?.value;
    const resultCode = order?.extension_attributes?.payment_additional_info?.find((info) => info.key === 'knet_result')?.value;

    if (transactionId) {
      paymentDetails += `<h6 class="text-dark">${placeholders?.orderTransactionId || 'Transaction ID'}</h6>
        <p>${transactionId}</p>`;
    }

    if (paymentId) {
      paymentDetails += `<h6 class="text-dark">${placeholders?.orderPaymentId || 'Payment ID'}</h6>
        <p>${paymentId}</p>`;
    }

    if (resultCode) {
      paymentDetails += `<h6 class="text-dark">${placeholders?.orderResultCode || 'Result Code'}</h6>
        <p>${resultCode}</p>`;
    }
  }

  if (order?.payment?.method === 'checkout_com_upapi_qpay') {
    const paymentId = order?.extension_attributes?.payment_additional_info?.find((info) => info.key === 'pun')?.value;
    const transactionId = order?.extension_attributes?.payment_additional_info?.find((info) => info.key === 'confirmation_id')?.value;
    const resultCode = order?.extension_attributes?.payment_additional_info?.find((info) => info.key === 'status')?.value;

    if (transactionId) {
      paymentDetails += `<h6 class="text-dark">${placeholders?.orderTransactionId || 'Transaction ID'}</h6>
        <p class="break-word">${transactionId}</p>`;
    }

    if (paymentId) {
      paymentDetails += `<h6 class="text-dark">${placeholders?.orderPaymentId || 'Payment ID'}</h6>
        <p>${paymentId}</p>`;
    }

    if (resultCode) {
      paymentDetails += `<h6 class="text-dark">${placeholders?.orderResultCode || 'Result Code'}</h6>
        <p>${resultCode}</p>`;
    }
  }

  deliveryDetailsContent.innerHTML = `
    <div class="delivery-details-info">
      <h6 class="text-dark">${placeholders?.orderDeliveryDetails || 'Delivery Details'}</h6>

      <div class="address">
        <p>${delAddrName}</p>
        <p>${delCountry}</p>
        <p>${delCity}</p>
        <p>${delArea}</p>
        <p>${delStreet}</p>
        <p>${delBuilding}</p>
      </div>

      <div class="mobile">
        <h6>${placeholders?.orderMobileNumber || 'Mobile Number'}:</h6>
        <p class="mobile-number-order-details">${delTelNumber}</p>
      </div>
    </div>

    <div class="billing-details-info">
      <h6 class="text-dark">${placeholders?.orderBillingDetails || 'Billing details'}</h6>

      <div class="address">
        <p>${billAddrName}</p>
        <p>${billCountry}</p>
        <p>${billCity}</p>
        <p>${billArea}</p>
        <p>${billStreet}</p>
        <p>${billBuilding}</p>
      </div>

      <div class="mobile">
        <h6>${placeholders?.orderMobileNumber || 'Mobile Number'}:</h6>
        <p class="mobile-number-order-details">${billTelNumber}</p>
      </div>
    </div>

    <div class="empty-cell"></div>

    <div class="payment-info">
      <div class="payment-method">
        <h6 class="text-dark">${placeholders?.orderPaymentMethod || 'Payment method'}</h6>
        <p>${paymentMethod}</p>
      ${paymentDetails}
      </div>

      <div class="delivery-method">
        <h6 class="text-dark">${placeholders?.orderDeliveryMethod || 'Delivery Method'}</h6>
        <p>${order?.shipping_description || ''}</p>
      </div>
    </div>

    <div class="empty-cell"></div>
  `;

  return deliveryDetailsContent;
};

/**
 * Renders the order delivery details section for the
 * Click and collect delivery order
 * This inludes delivery details, billing details, payment methods
 * @param {*} order The order details object
 * @param {*} placeholders The translation placeholder object
 * @returns
 */
const buildClickNCollectDeliveryDetails = async (order, placeholders) => {
  const deliveryDetailsContent = document.createElement('div');
  deliveryDetailsContent.classList.add('delivery-details-content', 'click-n-collect');

  const storeId = order?.store_id;
  const storeData = await getStores();

  if (!storeData) {
    return null;
  }

  const orderStore = storeData.items.find((store) => store.store_id === storeId);

  const address = {};
  if (orderStore?.address) {
    Object.values(orderStore.address).forEach((entity) => {
      address[entity.code] = entity.value;
    });
  }

  const countryCode = await getConfigValue('country-code');
  // Fetches the list of cities
  const cityData = await getAddressCitySegments(countryCode);

  const collectAreaSegment = address?.area ? +(address.area) : '';
  const collectCitySegment = address?.address_city_segment ? +(address.address_city_segment) : '';
  const collectStoreName = orderStore?.store_name || '';
  const collectStreet = address?.street || '';

  let collectCity = '';
  if (cityData?.items?.length > 0) {
    const collectCityObj = cityData.items.find(
      (cityObj) => cityObj.location_id === collectCitySegment,
    );

    if (collectCityObj) {
      collectCity = collectCityObj.name;
    }
  }

  // Fetches the list of collection areas as part of the city segment
  let collectArea = '';
  const collectAreaData = await getAddressAreas(countryCode, collectCitySegment);
  if (collectAreaData?.items?.length > 0) {
    const billAreaObj = collectAreaData.items.find(
      (areaObj) => areaObj.location_id === collectAreaSegment,
    );

    if (billAreaObj) {
      collectArea = billAreaObj.name;
    }
  }

  // Renders the google maps link for find a store
  const collectStorePhone = orderStore?.store_phone || '';
  const collectStoreMapLink = `https://maps.google.com/?q=${orderStore?.latitude},${orderStore?.longitude}`;

  const collectionAddressInfo = document.createElement('div');
  collectionAddressInfo.classList.add('delivery-details-info');
  collectionAddressInfo.innerHTML = `
    <h6 class="text-dark text-xs">${placeholders?.orderCollectionAddress || 'Collection Address'}</h6>

    <div class="address">
      <p>${collectStoreName}</p>
      <p>${collectStreet}</p>
      <p>${collectArea}</p>
      <p>${collectCity}</p>
    </div>

    <div class="view-on-map">
      <a href="${collectStoreMapLink}" target="_blank">${placeholders?.orderViewOnMap || 'View on map'}</a>
    </div>

    <div class="mobile">
      <h6 class="text-xs">${placeholders?.orderCollectorContactNo || 'Collector contact no.'}</h6>
      <p>${collectStorePhone}</p>
    </div>
  `;

  // Collection Times details
  const collectionTimesWrapper = document.createElement('div');
  collectionTimesWrapper.classList.add('collection-times-wrapper');
  collectionTimesWrapper.innerHTML = `
    <h6 class="text-dark text-xs">${placeholders?.orderCollectionTimes || 'Collection Times'}</h6>
  `;
  const collectionTimesElem = document.createElement('div');
  collectionTimesElem.classList.add('collection-times');
  orderStore?.store_hours?.forEach((hours) => {
    const hourWrapper = document.createElement('div');
    const dayElem = document.createElement('p');
    dayElem.innerText = hours?.label || '';
    const timeElem = document.createElement('p');
    timeElem.innerText = hours?.value || '';

    hourWrapper.appendChild(dayElem);
    hourWrapper.appendChild(timeElem);
    collectionTimesElem.appendChild(hourWrapper);
  });
  collectionTimesWrapper.appendChild(collectionTimesElem);

  // Billing address details
  const billAddr = order.billing_address;
  const billAddrName = `${billAddr.firstname} ${billAddr.lastname}`;
  const billCountry = billAddr.country_id;

  const billAreaSegment = billAddr.extension_attributes?.area;
  const billCitySegment = billAddr.extension_attributes?.address_city_segment;

  let billCity = '';
  if (cityData?.items?.length > 0) {
    const billCityObj = cityData.items.find((cityObj) => cityObj.location_id === billCitySegment);

    if (billCityObj) {
      billCity = billCityObj.name;
    }
  }

  let billArea = '';
  const billAreaData = await getAddressAreas(countryCode, billCitySegment);
  if (billAreaData?.items?.length > 0) {
    const billAreaObj = billAreaData.items.find(
      (areaObj) => areaObj.location_id === billAreaSegment,
    );

    if (billAreaObj) {
      billArea = billAreaObj.name;
    }
  }

  const billStreet = billAddr?.street?.length > 0 ? billAddr.street.join(', ') : '';
  const billBuilding = billAddr?.extension_attributes?.address_building_segment ?? '';
  const billTelNumber = billAddr.telephone;

  const billingAddressInfo = document.createElement('div');
  billingAddressInfo.classList.add('billing-details-info');
  billingAddressInfo.innerHTML = `
    <h6 class="text-dark text-xs">${placeholders?.orderBillingDetails || 'Billing details'}</h6>

    <div class="address">
      <p>${billAddrName}</p>
      <p>${billCountry}</p>
      <p>${billCity}</p>
      <p>${billArea}</p>
      <p>${billStreet}</p>
      <p>${billBuilding}</p>
    </div>

    <div class="mobile">
      <h6 class="text-xs">${placeholders?.orderMobileNumber || 'Mobile Number'}:</h6>
      <p>${billTelNumber}</p>
    </div>
  `;

  // Payment information details
  const paymentInfo = document.createElement('div');
  paymentInfo.classList.add('payment-info');

  const paymentMethod = getOrderPaymentMethodName(order?.payment?.method);

  paymentInfo.innerHTML = `
    <div class="payment-method">
      <h6 class="text-dark text-xs">${placeholders?.orderPaymentMethod || 'Payment method'}</h6>
      <p>${paymentMethod}</p>
    </div>

    <div class="delivery-method">
      <h6 class="text-dark text-xs">${placeholders?.orderDeliveryMethod || 'Delivery Method'}</h6>
      <p>${order?.shipping_description || ''}</p>
    </div>
  `;

  const emptyCell = document.createElement('div');

  deliveryDetailsContent.appendChild(collectionAddressInfo);
  deliveryDetailsContent.appendChild(collectionTimesWrapper);
  deliveryDetailsContent.appendChild(billingAddressInfo);
  deliveryDetailsContent.appendChild(paymentInfo);
  deliveryDetailsContent.appendChild(emptyCell);

  return deliveryDetailsContent;
};

/**
 * Renders the delivery address banner
 * @param {*} order
 * @param {*} placeholders
 * @returns
 */
const renderDeliveryDetails = async (order, placeholders) => {
  const isClickAndCollectOrder = isClickAndCollect(order);

  const orderDeliveryDetails = document.createElement('div');
  orderDeliveryDetails.classList.add('order-delivery-details');

  const deliveryDetailsMsg = document.createElement('div');
  deliveryDetailsMsg.classList.add('delivery-details-msg');

  let orderDeliveryMessage = placeholders?.orderHomeDeliveryToAddressMsg || 'Your order will be delivered at the following address';
  if (isClickAndCollectOrder) {
    orderDeliveryMessage = placeholders?.orderClickandcollectDeliveryToAddressMsg || 'Your order will be available for pickup at the following store';
  }

  deliveryDetailsMsg.innerHTML = `
    <span class="ico">
      <img src="/icons/info-white.svg" />
    </span>
    <h6 class="message">
      ${orderDeliveryMessage}
    </h6>
  `;
  orderDeliveryDetails.appendChild(deliveryDetailsMsg);

  if (isClickAndCollectOrder) {
    const clickNCollectDeliveryDetails = await buildClickNCollectDeliveryDetails(
      order,
      placeholders,
    );
    if (clickNCollectDeliveryDetails) {
      orderDeliveryDetails.appendChild(clickNCollectDeliveryDetails);
    }
  } else {
    const homeDeliveryDetails = await buildHomeDeliveryDetails(order, placeholders);
    orderDeliveryDetails.appendChild(homeDeliveryDetails);
  }

  return orderDeliveryDetails;
};

/**
 * @param {String} status The order status
 * @param {*} placeholders The placeholder translation object
 * @returns The status text
 */
const getDeliveredBucketName = (status, placeholders, count) => {
  let processingTitle = placeholders?.orderDetailsOrderedItem || 'Ordered Item';
  if (count > 1) {
    processingTitle = placeholders?.orderDetailsOrderedItems || 'Ordered Items';
  }

  let deliveredTitle = placeholders?.orderDetailsDeliveredItem || 'Delivered Item';
  if (count > 1) {
    deliveredTitle = placeholders?.orderDetailsDeliveredItems || 'Delivered Items';
  }

  switch (status) {
    case 'processing':
      return processingTitle;
    default:
      return deliveredTitle;
  }
};

/**
 * Renders the list of deliverd items as part of an order
 * @param {*} order The order details object
 * @param {*} placeholders translation placeholder object
 * @param {*} locale The locale string
 * @returns
 */
const renderDeliveredItems = async (order, productData, placeholders, locale) => {
  const isCancelled = false;

  const deliveredItems = getOrderDeliveredItems(order);
  if (!deliveredItems?.length) {
    return null;
  }

  const deliveredItemsContainer = document.createElement('div');
  deliveredItemsContainer.classList.add('order-delivered-items-wrapper', 'order-itemized-wrapper');

  const title = document.createElement('div');
  title.classList.add('order-itemized-title');

  const orderStatus = getOrderStatus(order);
  title.innerHTML = `<h5>${getDeliveredBucketName(orderStatus, placeholders, deliveredItems.length)}</h5>`;

  deliveredItemsContainer.appendChild(title);

  const deliveredList = buildOrderList(
    order,
    deliveredItems,
    productData,
    placeholders,
    locale,
    isCancelled,
  );

  deliveredItemsContainer.appendChild(deliveredList);

  return deliveredItemsContainer;
};

/**
 * Renders the list of cancelled items as part of an order
 * @param {*} order The order details object
 * @param {*} placeholders translation placeholder object
 * @param {*} locale The locale string
 * @returns
 */
const renderCancelledItems = async (order, productData, placeholders, locale) => {
  const isCancelled = true;

  const cancelledItems = getOrderCancelledItems(order);
  if (!cancelledItems?.length) {
    return null;
  }

  const cancelledItemsContainer = document.createElement('div');
  cancelledItemsContainer.classList.add('order-cancelled-items-wrapper', 'order-itemized-wrapper');
  cancelledItemsContainer.setAttribute('id', 'cancelled-items-section');

  const title = document.createElement('div');
  title.classList.add('order-itemized-title');
  title.innerHTML = `
    <h5>${placeholders?.orderCancelledItems || 'Cancelled Items'}</h5>
  `;
  cancelledItemsContainer.appendChild(title);

  const cancelledRefundTitle = document.createElement('div');
  cancelledRefundTitle.classList.add('order-cancelled-refund-title');
  const cancelledRefundTitleText = (placeholders.orderCancelledRefundMessage || 'The refund for cancelled items will be made to your account within {{}} working days if you have paid for your order.').replace('{{}}', '14');
  cancelledRefundTitle.innerHTML = `
    <p>${cancelledRefundTitleText}</p>
  `;
  cancelledItemsContainer.appendChild(cancelledRefundTitle);

  const cancelledList = buildOrderList(
    order,
    cancelledItems,
    productData,
    placeholders,
    locale,
    isCancelled,
  );

  cancelledItemsContainer.appendChild(cancelledList);

  return cancelledItemsContainer;
};

/**
 * Renders the list of cancelled items as part of an order
 * @param {*} order The order details object
 * @param {*} placeholders translation placeholder object
 * @param {*} locale The locale string
 * @returns
 */
const renderRefundedItems = async (order, productData, placeholders, locale) => {
  const isCancelled = false;

  const refundedItems = getOrderRefundedItems(order);

  if (!refundedItems?.length) {
    return null;
  }

  const refundedItemsContainer = document.createElement('div');
  refundedItemsContainer.classList.add('order-cancelled-items-wrapper', 'order-itemized-wrapper');
  refundedItemsContainer.setAttribute('id', 'cancelled-items-section');

  const cancelledList = buildOrderList(
    order,
    refundedItems,
    productData,
    placeholders,
    locale,
    isCancelled,
  );

  refundedItemsContainer.appendChild(cancelledList);

  return refundedItemsContainer;
};

/**
 * Renders the price details of an order at the footer of the listing table
 * @param {*} order The order details object
 * @param {*} placeholders translation placeholder object
 * @returns
 */
const renderOrderTotals = async (order, placeholders) => {
  const orderTotals = document.createElement('div');
  orderTotals.classList.add('order-totals-wrapper');

  const deliveryChargeValue = order
    ?.extension_attributes
    ?.shipping_assignments
    ?.[0]?.shipping
    ?.total?.shipping_incl_tax || 0;

  const subTotalText = await formatPrice(order.order_currency_code, order.subtotal_incl_tax);
  const subTotal = document.createElement('div');
  subTotal.classList.add('row-subtotal', 'total-row');
  subTotal.innerHTML = `
    <div class="col-1">
      <p>${placeholders?.orderSubTotal || 'Subtotal'}</p>
    </div>
    <div class="price">
      <p>${subTotalText}</p>
    </div>
  `;
  orderTotals.appendChild(subTotal);

  if (order.discount_amount !== 0) {
    const discountText = await formatPrice(order.order_currency_code, order.discount_amount);
    const discount = document.createElement('div');
    discount.classList.add('row-discount', 'total-row');
    discount.innerHTML = `
      <div class="col-1">
        <p>${placeholders?.orderDiscount || 'Discount'}</p>
      </div>
      <div class="price">
        <p>${discountText}</p>
      </div>
    `;
    orderTotals.appendChild(discount);
  }

  const deliveryChargeText = await formatPrice(order.order_currency_code, deliveryChargeValue);
  const deliveryCharge = document.createElement('div');
  deliveryCharge.classList.add('row-delivery-charge', 'total-row');
  deliveryCharge.innerHTML = `
    <div class="col-1">
      <p>${placeholders?.orderDeliveryCharge || 'Delivery Charge'}</p>
    </div>
    <div class="price">
      <p>${deliveryChargeText}</p>
    </div>
  `;
  orderTotals.appendChild(deliveryCharge);

  if (order.extension_attributes?.surcharge !== 0) {
    const surchargeText = await formatPrice(
      order.order_currency_code,
      order.extension_attributes?.surcharge || 0,
    );
    const surcharge = document.createElement('div');
    surcharge.classList.add('row-order-total', 'total-row');
    surcharge.innerHTML = `
      <div class="col-1">
        <p>${placeholders?.codSurcharge || 'Cash on delivery service charge'}</p>
      </div>
      <div class="price">
        <p>${surchargeText}</p>
        
        <div class="surcharge-price-info">
          <img src="/icons/info-blue.svg" id="surcharge-price-info-icon" />
          <span class="hidden">
            ${placeholders?.orderDetailsSurchargeInfo || 'Pay on delivery service'}
          </span>
        </div>
      </div>
    `;
    orderTotals.appendChild(surcharge);
  }

  const showVatValue = await getConfigValue('commerce-show-vat-included');
  const showVat = showVatValue?.toLocaleLowerCase() === 'true';

  const orderTotalText = await formatPrice(order.order_currency_code, order.grand_total);
  const orderTotal = document.createElement('div');
  orderTotal.classList.add('row-order-total', 'total-row');

  const vatText = `<p class="text-light">(${placeholders?.orderInclusiveOfVat || 'Inclusive of VAT'})</p>`;

  orderTotal.innerHTML = `
    <div class="col-1">
      <p class="text-dark">${placeholders?.orderDetailsOrderSummaryOrderTotal || 'ORDER TOTAL'}</p>
      ${showVat ? vatText : ''}
    </div>
    <div class="price">
      <p class="text-dark">${orderTotalText}</p>
    </div>
  `;
  orderTotals.appendChild(orderTotal);

  if (order?.total_refunded > 0) {
    const orderTotalRefundAmount = await formatPrice(
      order.order_currency_code,
      order.total_refunded,
    );
    const orderTotalRefund = document.createElement('div');
    orderTotalRefund.classList.add('row-order-total-refund', 'total-row');

    orderTotalRefund.innerHTML = `
    <div class="col-1">
      <p class="text-dark">${placeholders?.orderTotalRefundAmount || 'TOTAL REFUND AMOUNT'}</p>
    </div>
    <div class="price">
      <p class="text-dark">${orderTotalRefundAmount}</p>
    </div>
  `;
    orderTotals.appendChild(orderTotalRefund);
  }

  return orderTotals;
};

/**
 * The main execution entry point of different section in the order details page
 * @param {HTMLElement} block The parent block element
 * @param {String} orderId The ID of the current order
 * @param {*} placeholders translation placeholder object
 * @param {*} locale The locale string
 */
const renderOrderDetails = async (block, orderId, placeholders, locale) => {
  const order = await getOrder(orderId);
  block.innerHTML = '';
  block.classList.add('account-orders');

  renderReturnLoader(block);

  // Renders the header title buttons (Download invoice, Print)
  await renderHeaderButtons(order, placeholders);

  const rmaData = await getRMAsByOrderId(orderId);
  // Renders the order summary panel
  const orderSummaryPanel = await renderOrderSummaryPanel(order, placeholders, locale);
  if (orderSummaryPanel) {
    block.appendChild(orderSummaryPanel);
  }

  // Return eligibility banner
  renderEligibilityMessage(order, placeholders, locale, block);

  const deliveryDetails = await renderDeliveryDetails(order, placeholders);
  if (deliveryDetails) {
    block.appendChild(deliveryDetails);
  }

  const productData = await fetchProductDataForOrders({ items: [order] });

  const returnRmaBucket = await renderReturnRmaBucket(
    rmaData,
    order,
    productData,
    placeholders,
    locale,
  );
  if (returnRmaBucket) {
    block.appendChild(returnRmaBucket);
  }

  // Renders the list of items that are delivered as part of the order
  const deliveredItems = await renderDeliveredItems(order, productData, placeholders, locale);
  if (deliveredItems) {
    block.appendChild(deliveredItems);
  }

  // Renders the list of items that are cancelled as part of the order
  const cancelledItems = await renderCancelledItems(order, productData, placeholders, locale);
  if (cancelledItems) {
    block.appendChild(cancelledItems);
  }

  // Renders the list of items that are refunded as part of the order
  const refundedItems = await renderRefundedItems(order, productData, placeholders, locale);
  if (refundedItems) {
    block.appendChild(refundedItems);
  }

  // Renders the order total section at the footer of the details panel
  const orderTotals = await renderOrderTotals(order, placeholders);
  if (orderTotals) {
    block.appendChild(orderTotals);
  }

  toggleGlobalLoader(false);

  window.addEventListener('delayed-loaded', () => {
    const reviewOrders = { items: [order] };
    fetchReviewsForOrders(reviewOrders).then((reviews) => {
      decorateReviews(block, reviewOrders, reviews, placeholders, locale);
    });
  });

  document.querySelectorAll('.cancelled-items-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();

      const cancelledItemsSection = document.getElementById('cancelled-items-section');

      if (cancelledItemsSection) {
        cancelledItemsSection.scrollIntoView({
          behavior: 'smooth',
        });
      }
    });
  });

  const surchargeIcon = document.getElementById('surcharge-price-info-icon');
  if (surchargeIcon) {
    surchargeIcon.addEventListener('mouseover', function () {
      const badge = this.parentNode.querySelector('span');

      if (badge) {
        badge.classList.remove('hidden');
      }
    });

    surchargeIcon.addEventListener('mouseleave', function () {
      const badge = this.parentNode.querySelector('span');

      if (badge) {
        badge.classList.add('hidden');
      }
    });
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

  await renderOrderDetails(block, orderId, placeholders, locale);
}
