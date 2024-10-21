/* eslint-disable max-len, camelcase */
import {
  fetchPlaceholdersForLocale,
  formatDate, openModal,
  createModalFromContent,
  formatPrice,
} from '../../scripts/scripts.js';
import { decorateIcons } from '../../scripts/aem.js';
import { getConfigValue } from '../../scripts/configs.js';
import { getRMAsByOrderId, getRecentOrders } from '../../scripts/order/api.js';
import { getCustomer } from '../../scripts/customer/api.js';
import { performAPIMeshGraphQLQuery, productDetailsBySkuListQuery } from '../../scripts/commerce.js';
import { getAuthorReviews, getBVConfig, getStoredMyReview } from '../../scripts/reviews/api.js';
import { decorateReview, decorateSecondaryRatings, starRating } from '../product-details/slots/ratings.js';

export const ORDER_STATUSES = {
  COMPLETE: ['COMPLETE'],
  PROCESSING: ['ACCEPTED',
    'CUSTOMER_CANCELLATION_INITIATED',
    'FAILED_DELIVERY',
    'IN_TRANSIT',
    'PAYMENT_SETTLED',
    'PENDING_PAYMENT',
    'PICKED',
    'RECEIVED_IN_OMS',
    'SENT_TO_OMS',
    'REMINDER_SENT',
    'STOCK_SHORTAGE',
    'STOCK_SHORTAGE_PARTIAL',
    'CANCELLED_STOCK_SHORTAGE_PARTIAL',
    'BACKORDER'],
  DELIVERED: ['DELIVERED'],
  COLLECTED: ['COLLECTED_BY_CUSTOMER'],
  REFUNDED: ['PARTIAL_REFUND'],
  REFUNDED_FULLY: ['COMPLETE_REFUND',
    'CANCELLED_FAILED_DELIVERY'],
  RETURNED: ['COMPLETE_RETURN',
    'PARTIAL_RETURN'],
  CANCELLED: ['AUTO_CANCELED',
    'CUSTOMER_CANCELLED',
    'CANCELLED_STOCK_SHORT',
    'CUSTOMER_CANCELLATION_COMPLETE',
    'PAYMENT_GATEWAY_DECLINED',
    'SETTLEMENT_FAILED',
    'ORDER_PAYMENT_EXPIRED',
    'ORDER_EXPIRED_BENEFIT_PAY',
    'ORDER_CANCELED'],
  DISPATCHED: ['DISPATCHED'],
  READY_TO_COLLECT: ['READY_TO_COLLECT'],
};

export function getOrderStatus(order) {
  if (ORDER_STATUSES.COMPLETE.includes(order.status.toUpperCase())) {
    return 'complete';
  } if (ORDER_STATUSES.PROCESSING.includes(order.status.toUpperCase())) {
    return 'processing';
  } if (ORDER_STATUSES.DELIVERED.includes(order.status.toUpperCase())) {
    return 'delivered';
  } if (ORDER_STATUSES.COLLECTED.includes(order.status.toUpperCase())) {
    return 'collected';
  } if (ORDER_STATUSES.REFUNDED.includes(order.status.toUpperCase())) {
    return 'refunded';
  } if (ORDER_STATUSES.REFUNDED_FULLY.includes(order.status.toUpperCase())) {
    return 'refunded-fully';
  } if (ORDER_STATUSES.RETURNED.includes(order.status.toUpperCase())) {
    return 'returned';
  } if (ORDER_STATUSES.CANCELLED.includes(order.status.toUpperCase())) {
    return 'cancelled';
  } if (ORDER_STATUSES.DISPATCHED.includes(order.status.toUpperCase())) {
    return 'dispatched';
  } if (ORDER_STATUSES.READY_TO_COLLECT.includes(order.status.toUpperCase())) {
    return 'ready to collect';
  }
  return 'unknown';
}

export function convertToCamelCase(str) {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

const countryToTimeZone = {
  AE: 'Asia/Dubai',
  QA: 'Asia/Qatar',
  SA: 'Asia/Riyadh',
  KW: 'Asia/Kuwait',
  BH: 'Asia/Bahrain',
  OM: 'Asia/Muscat',
  JO: 'Asia/Amman',
  LB: 'Asia/Beirut',
  EG: 'Africa/Cairo',
};

const FREE_ITEM_PRICE = 0.01;

export async function formatDateTime(dateString, locale) {
  let newLocale = locale;
  if (locale?.includes('_')) {
    newLocale = locale.replaceAll('_', '-');
  }

  const date = new Date(`${dateString}+0000`);
  const countryCode = await getConfigValue('country-code');
  const timeZone = countryToTimeZone[countryCode];
  const dateOptions = {
    year: 'numeric', month: 'short', day: '2-digit', numberingSystem: 'latn',
  };

  const timeOptions = {
    timeZone, hour12: false, hour: '2-digit', hourCycle: 'h12', minute: '2-digit', numberingSystem: 'latn',
  };
  const formattedDate = new Intl.DateTimeFormat(newLocale, dateOptions).format(date);
  const formattime = new Intl.DateTimeFormat(newLocale, timeOptions).format(date);

  const [hours, minutes] = formattime.split(':');
  const formattedTime = `${hours}h${minutes}`;

  return `${formattedDate} @ ${formattedTime}`;
}

async function getCountryCode() {
  return getConfigValue('country-code').then((value) => value || 'AE');
}

async function getLocale() {
  const countryCode = await getCountryCode();
  return `${(document.documentElement.lang || 'en').toLowerCase()}_${countryCode.toUpperCase()}`;
}

function getRefundPendingItemsCount(order) {
  return order.items
    .filter((item) => !item.parent_item_id)
    .reduce((acc, item) => acc + item.qty_refunded, 0);
}

function getCancelledOrderLineCount(item) {
  if (item?.extension_attributes?.qty_adjustments) {
    const { qty_stock_shortage: qty } = JSON.parse(item.extension_attributes.qty_adjustments);

    return qty || 0;
  }

  return 0;
}

export function getCancelledOrderCount(order) {
  return order.items
    .filter((item) => !item.parent_item_id && item?.extension_attributes?.qty_adjustments)
    .reduce((acc, item) => {
      let updatedQty = acc;
      updatedQty += getCancelledOrderLineCount(item);

      return updatedQty;
    }, 0);
}

export function getTotalItemsCount(order) {
  return order.items
    .filter((item) => !item.parent_item_id)
    .reduce((acc, item) => acc + item.qty_ordered, 0);
}

export function getOrderDeliveredItems(order) {
  return order.items
    .filter((item) => !item.parent_item_id)
    .filter((item) => (getCancelledOrderLineCount(item)) !== item.qty_ordered);
}

export function getOrderRefundedItems(order) {
  if (order.items.some((item) => item?.extension_attributes?.qty_adjustments)) {
    return null;
  }

  return order.items
    .filter((item) => !item.parent_item_id)
    .filter((item) => item.qty_ordered > 0 && item.qty_refunded > 0);
}

export function isRefundedFully(order) {
  return order.status === ORDER_STATUSES.REFUNDED.COMPLETE_REFUND;
}

export function getDeliveredItemsCount(item) {
  return item?.qty_ordered || 0;
}

export function getCancelledItemsCount(item) {
  if (item?.extension_attributes?.qty_adjustments) {
    const { qty_stock_shortage: qty } = JSON.parse(item.extension_attributes.qty_adjustments);

    return qty;
  }
  return 0;
}

export function getProductSkuList(orders) {
  const productSkuList = [];
  orders?.items?.forEach((order) => {
    order?.items?.forEach((item) => {
      if (item.extension_attributes?.parent_product_sku
        && !productSkuList.includes(item.extension_attributes?.parent_product_sku)) {
        productSkuList.push(item.extension_attributes?.parent_product_sku);
      }
    });
  });
  return productSkuList;
}

export async function fetchProductDataForOrders(orders) {
  const productSkuList = getProductSkuList(orders);

  const { data: { products } } = await performAPIMeshGraphQLQuery(productDetailsBySkuListQuery, {
    sku: productSkuList,
  });

  return products;
}

export async function fetchReviewsForOrders(orders) {
  const productSkuList = getProductSkuList(orders);
  if (productSkuList.length === 0) {
    return null;
  }

  const customer = await getCustomer(true);
  const reviews = await getAuthorReviews(customer.id, productSkuList, 0, productSkuList.length);

  return reviews;
}

function getReview(productSku, reviews) {
  return reviews?.Results?.find((review) => review.ProductId === productSku);
}

function isReturnEligible(order) {
  return order?.extension_attributes?.is_return_eligible === 1;
}

function isReturnInStoreEligible() {
  return true;
}
/**
 * Returns if the return is requested for an order
 * @param {Object} rmaData The RMA return object
 * @returns Boolean
 */
export async function isReturnRequested(rmaData) {
  if (!rmaData) {
    return false;
  }

  if (rmaData?.total_count === 0) {
    return false;
  }

  // If there are items in the RMA object &
  // all the items in the RMA data is in closed state,
  // means there are items requested for return state
  const isAllRmasClosed = rmaData?.items.every((item) => item.status === 'closed');

  if (isAllRmasClosed) {
    return false;
  }

  return true;
}

export function isClickAndCollect(order) {
  return order?.extension_attributes?.shipping_assignments?.some((shipping_assignments) => (shipping_assignments.shipping?.extension_attributes?.click_and_collect_type === 'reserve_and_collect' || shipping_assignments.shipping?.extension_attributes?.click_and_collect_type === 'ship_to_store'));
}

export function getOrderCancelledItems(order) {
  return order.items
    .filter((item) => !item.parent_item_id)
    .filter((item) => {
      if (item?.extension_attributes?.qty_adjustments) {
        const { qty_stock_shortage: qty } = JSON.parse(item.extension_attributes.qty_adjustments);

        return qty > 0;
      }

      return false;
    });
}

export function getOrderProductNames(order) {
  const name = order.items.filter((item) => !item.parent_item_id)
    .reduce((acc, item) => `${acc}${item.name}, `, '');
  return name.slice(0, -2);
}

export function getProductImage(product) {
  const productTeaserImages = product?.attributes.find((attr) => attr.name === 'assets_teaser')?.value;
  if (productTeaserImages) {
    const assets = JSON.parse(productTeaserImages);
    if (assets.length > 0) {
      const { styles: { product_teaser: productTeaser } } = assets[0];

      const productSwatchImg = document.createElement('div');
      productSwatchImg.classList.add('swatch-img');
      const img = document.createElement('img');
      img.setAttribute('src', productTeaser);
      img.alt = product?.name || '';
      productSwatchImg.appendChild(img);

      return productSwatchImg;
    }
  }
  return document.createDocumentFragment();
}

function getReturnExpirationDate(order) {
  return order?.extension_attributes?.return_expiration;
}

function isInReturnWindow(order) {
  const returnExpirationDate = getReturnExpirationDate(order);

  const returnDate = new Date(returnExpirationDate);

  const now = new Date();

  return returnDate >= now;
}

async function getRecentOrdersUsingAPI(numberOfOrdersToDisplay) {
  return getRecentOrders(numberOfOrdersToDisplay || 3);
}

export function getOrderItems(order, isCancelled = false) {
  if (isCancelled) {
    return getOrderCancelledItems(order);
  }

  if (order?.state === 'closed') {
    return getOrderRefundedItems(order);
  }

  return getOrderDeliveredItems(order);
}

async function decorateProductReview(productName, productImage, block) {
  const productDetails = document.createElement('div');
  productDetails.classList.add('product-details');

  const productSwatchImg = document.createElement('div');
  productSwatchImg.classList.add('swatch-img');
  const img = document.createElement('img');
  img.setAttribute('src', productImage);
  img.setAttribute('alt', productName || '');
  img.setAttribute('title', productName || '');
  productSwatchImg.appendChild(img);

  productDetails.appendChild(productSwatchImg);

  const productTitle = document.createElement('span');
  productTitle.classList.add('product-name');
  productTitle.textContent = productName || '';

  productDetails.appendChild(productTitle);

  block.appendChild(productDetails);
}

async function decorateAndShowReview(review, productImage, productName, bvConfig, placeholders, locale) {
  const reviewWrapper = document.createElement('div');
  reviewWrapper.classList.add('review-wrapper');

  decorateProductReview(productName, productImage, reviewWrapper);

  reviewWrapper.appendChild(await decorateReview(review, bvConfig, 0, locale, placeholders));

  if (review.SecondaryRatingsOrder && review.SecondaryRatings) {
    const ratingSecondary = document.createElement('div');
    ratingSecondary.classList.add('rating-secondary');
    reviewWrapper.appendChild(ratingSecondary);

    decorateSecondaryRatings(
      review.SecondaryRatingsOrder,
      review.SecondaryRatings,
      ratingSecondary,
    );
  }

  decorateIcons(reviewWrapper);
  createModalFromContent('order-view-ratings', placeholders.orderMyReview || 'My Review', reviewWrapper.outerHTML, ['pdp-modal', 'order-view-ratings']).then(() => {
    openModal('order-view-ratings');
  });
}

export async function decorateReviews(parent, orders, reviews, placeholders, locale) {
  const bvConfig = await getBVConfig();
  parent.querySelectorAll('.order-item-review').forEach((orderItemReview) => {
    const productImage = orderItemReview.closest('.order-item').querySelector('.order-item-image img');
    const { productName, productId: productSku } = orderItemReview.dataset;
    const review = getReview(productSku, reviews);
    const storedReview = getStoredMyReview(productSku);

    if (review) {
      orderItemReview.innerHTML = '';

      const reviewItem = document.createElement('div');
      reviewItem.classList.add('review-item');

      reviewItem.appendChild(starRating(review.Rating));

      const reviewLink = document.createElement('a');
      reviewLink.classList.add('review-link');
      reviewLink.textContent = placeholders.viewReview || 'View Review';
      reviewLink.href = '#';

      reviewItem.appendChild(reviewLink);

      decorateIcons(reviewItem);

      orderItemReview.appendChild(reviewItem);

      reviewLink.addEventListener('click', (event) => {
        event.preventDefault();
        decorateAndShowReview(review, productImage?.src || '', productName, bvConfig, placeholders, locale);
      });
    } else if (storedReview) {
      // disable review button
      const writeReviewButton = orderItemReview.querySelector('.order-item-review-button');
      writeReviewButton.setAttribute('disabled', 'disabled');
      writeReviewButton.classList.add('disabled');
    }
  });
}

function decorateOrderItems(parent, order, productData, placeholders, locale, isCancelled = false) {
  const orderItems = getOrderItems(order, isCancelled);

  if (orderItems.length === 0) {
    return;
  }
  const orderItemsList = document.createElement('div');
  orderItemsList.classList.add('order-items-wrapper', isCancelled ? 'order-items-cancelled' : 'order-items-delivered');
  const {
    orderDetailsCancelled, orderDetailsDelivered,
  } = placeholders;

  parent.appendChild(orderItemsList);

  const orderItemsHeader = document.createElement('div');
  orderItemsHeader.classList.add('order-items-header');

  const orderItemsDesc = document.createElement('h5');
  orderItemsDesc.classList.add('order-items-desc');
  orderItemsDesc.textContent = isCancelled ? orderDetailsCancelled || 'Cancelled Items' : orderDetailsDelivered || 'Delivered Items';

  orderItemsHeader.appendChild(orderItemsDesc);

  orderItemsList.appendChild(orderItemsHeader);

  if (isCancelled && getRefundPendingItemsCount(order) > 0) {
    const refundNote = document.createElement('div');
    refundNote.classList.add('refund-note');
    refundNote.textContent = placeholders.orderItemsRefundNote || 'The refund for the cancelled items will be made to your account within 14 working days if you have paid for your order.';
    orderItemsList.appendChild(refundNote);
  }

  orderItems.forEach(async (item) => {
    const itemSku = item.extension_attributes?.parent_product_sku;
    const product = productData?.find((p) => p.sku === itemSku);
    const orderItem = document.createElement('div');
    orderItem.classList.add('order-item');

    const orderItemImage = document.createElement('div');
    orderItemImage.classList.add('order-item-image');

    const orderItemImg = getProductImage(product);

    orderItemImage.appendChild(orderItemImg);

    const orderItemInfo = document.createElement('div');
    orderItemInfo.classList.add('order-item-info');

    const recentOrderBrandFullNameValue = item.extension_attributes?.brand_full_name;

    if (recentOrderBrandFullNameValue) {
      const recentOrderBrandFullNameSpan = document.createElement('span');
      recentOrderBrandFullNameSpan.classList.add('order-item-brand', 'order-brand-label');
      recentOrderBrandFullNameSpan.textContent = recentOrderBrandFullNameValue;
      orderItemInfo.appendChild(recentOrderBrandFullNameSpan);
    }

    const orderItemName = document.createElement('span');
    orderItemName.classList.add('order-item-name', 'order-detail-value');
    orderItemName.textContent = item.name;

    orderItemInfo.appendChild(orderItemName);

    const orderItemSku = document.createElement('span');
    orderItemSku.classList.add('order-item-sku', 'order-detail-label');
    orderItemSku.textContent = `Item Code: ${item.sku}`;

    orderItemInfo.appendChild(orderItemSku);

    const orderItemQuantityMessage = placeholders.orderItemQuantity || 'Quantity: {{}}';

    const orderItemQuantity = document.createElement('span');
    orderItemQuantity.classList.add('order-item-quantity', 'order-detail-label');
    orderItemQuantity.textContent = `${orderItemQuantityMessage.replace('{{}}', (isCancelled ? getCancelledItemsCount(item) : getDeliveredItemsCount(item)))}`;

    orderItemInfo.appendChild(orderItemQuantity);

    const orderItemAmount = document.createElement('div');
    orderItemAmount.classList.add('order-item-amount');

    const orderItemPriceLabel = document.createElement('span');
    orderItemPriceLabel.classList.add('order-item-price-label', 'order-detail-label');
    orderItemPriceLabel.textContent = placeholders.unitPrice || 'Unit Price';

    orderItemAmount.appendChild(orderItemPriceLabel);

    const orderItemPrice = document.createElement('span');
    orderItemPrice.classList.add('order-item-price', 'order-detail-value');

    // Set price or set as free if price is 0.01
    orderItemPrice.textContent = item.price_incl_tax === FREE_ITEM_PRICE ? placeholders.orderPriceFree ?? 'Free' : await formatPrice(order.order_currency_code, item.price_incl_tax);

    orderItemAmount.appendChild(orderItemPrice);

    const orderItemReview = document.createElement('div');
    orderItemReview.classList.add('order-item-review');
    orderItemReview.dataset.productId = product?.sku;
    orderItemReview.dataset.productName = product?.name;
    orderItemReview.innerHTML = `
            <button class="order-item-review-button"><span>${placeholders.orderItemWriteReview || 'Write a Review'}</span></button>`;

    const productImage = orderItemImage.querySelector('img');
    orderItemReview.querySelector('button').addEventListener('click', (e) => {
      e.preventDefault();
      e.target.classList.add('loader');
      import('../product-details/slots/write-review.js').then((module) => {
        module.default({
          sku: product?.sku,
          name: product?.name,
          images: [{
            url: `${productImage?.getAttribute('src') || ''}`,
          }],
        }, null, placeholders, locale, true).then(() => {
          openModal('write-ratings-dialog');
          e.target.classList.remove('loader');
        });
      });
    });
    orderItem.appendChild(orderItemImage);
    orderItem.appendChild(orderItemInfo);
    orderItem.appendChild(orderItemAmount);
    if (!isCancelled) {
      orderItem.appendChild(orderItemReview);
    }
    orderItemsList.appendChild(orderItem);
  });
}

export async function decorateOrderReturnDetails(orderReturn, order, placeholders, locale) {
  const isReturnable = isReturnEligible(order);
  const inReturnWindow = isInReturnWindow(order);
  const returnInStoreEligible = isReturnInStoreEligible(order);
  const orderReturnDate = formatDate(getReturnExpirationDate(order), locale);
  const storeLink = `/${document.documentElement.lang || 'en'}/store-finder`;
  const returnLink = `/${document.documentElement.lang || 'en'}/user/account/orders/return?orderId=`;

  if (isReturnable && inReturnWindow) {
    const rmaData = await getRMAsByOrderId(order.entity_id);
    const returnRequested = await isReturnRequested(rmaData);
    const isClickAndCollectOrder = isClickAndCollect(order);

    const onlineReturnText = placeholders.orderReturnOnline || 'You have until {{date}} to return the items';
    const onlineReturnTextRequested = placeholders.orderReturnOnlineRequested || 'Eligible for return until {{date}}.';
    let onlineReturnTextRequestedMsg = '';

    if (!isClickAndCollectOrder) {
      const onlineReturnWrapper = document.createElement('div');
      onlineReturnWrapper.classList.add('order-return-online');

      const returnWrapperLeftContent = document.createElement('div');
      returnWrapperLeftContent.classList.add('order-return-left-flexwrapper');
      onlineReturnWrapper.appendChild(returnWrapperLeftContent);

      orderReturn.appendChild(onlineReturnWrapper);

      const orderReturnIcon = document.createElement('span');
      orderReturnIcon.classList.add('icon', 'icon-delivery-return');
      returnWrapperLeftContent.appendChild(orderReturnIcon);

      const orderReturnLabel = document.createElement('span');
      orderReturnLabel.classList.add('order-return-text');

      const orderReturnLabelMsg = document.createElement('span');
      orderReturnLabelMsg.classList.add('order-return-text-msg');

      if (returnRequested) {
        orderReturnLabel.textContent = onlineReturnTextRequested.replace('{{date}}', orderReturnDate);

        onlineReturnTextRequestedMsg = placeholders.orderReturnOnlineRequestedMsg || 'Online returns can be placed once existing returns are processed.';
        orderReturnLabelMsg.innerText = onlineReturnTextRequestedMsg;
      } else {
        orderReturnLabel.textContent = onlineReturnText.replace('{{date}}', orderReturnDate);
      }

      const orderReturnInnerWrapper = document.createElement('div');
      orderReturnInnerWrapper.appendChild(orderReturnLabel);
      orderReturnInnerWrapper.appendChild(orderReturnLabelMsg);

      if (!returnRequested) {
        const orderReturnButton = document.createElement('a');
        orderReturnButton.classList.add('order-return-button', 'button', 'secondary');
        orderReturnButton.textContent = placeholders.orderReturnOnlineButton || 'Return Items Online';
        orderReturnButton.href = `${returnLink}${order.entity_id}`;

        orderReturnInnerWrapper.appendChild(orderReturnButton);
      }

      returnWrapperLeftContent.appendChild(orderReturnInnerWrapper);
    }

    if (returnInStoreEligible) {
      const orderReturnStoreText = placeholders.orderReturnInStore || 'or return directly in a store';
      const orderReturnStoreReturnText = placeholders.orderReturnOnline || 'you have until {{date}} to return the items';
      const orderReturnStoreCnCText = placeholders.orderReturnInStoreClickCollect || '(CLICK & COLLECT orders can only be returned at stores)';
      const orderReturnStoreSearch = placeholders.orderReturnStoreSearch || 'Search for a nearby store';

      const orderReturnStore = document.createElement('div');
      orderReturnStore.classList.add('order-return-store');

      if (isClickAndCollectOrder) {
        orderReturnStore.classList.add('order-cnc');
        orderReturnStore.innerHTML = `
                <div class="order-return-left-flexwrapper">
                <span class="icon icon-delivery-return"></span>
                <div>
                <span>${orderReturnStoreReturnText.replace('{{date}}', orderReturnDate)}</span>
                <span>${orderReturnStoreCnCText}</span>
                </div>
                </div>
                <div class="order-return-right-flexwrapper">
                <span>${orderReturnStoreSearch}</span>
                 <a href="${storeLink}">${placeholders.orderReturnInStoreButton || 'Find a store'}</a>
                </div>`;
      } else {
        orderReturnStore.innerHTML = `
                <span>${orderReturnStoreText}</span>
                <a href="${storeLink}">${placeholders.orderReturnInStoreButton || 'Find a store'}</a>`;
      }

      orderReturn.appendChild(orderReturnStore);
    }
    orderReturn.classList.remove('hide');
  } else if (isReturnable) {
    const onlineReturnWrapper = document.createElement('div');
    orderReturn.classList.add('order-return-online', 'out-of-return-window');

    orderReturn.appendChild(onlineReturnWrapper);

    const orderReturnIcon = document.createElement('span');
    orderReturnIcon.classList.add('icon', 'icon-delivery-return');
    onlineReturnWrapper.appendChild(orderReturnIcon);

    const orderReturnClosedText = placeholders.orderReturnWindowClosed || 'Return window closed on {{date}}';

    const orderReturnLabel = document.createElement('span');
    orderReturnLabel.classList.add('order-return-text');
    orderReturnLabel.textContent = orderReturnClosedText.replace('{{date}}', orderReturnDate);
    onlineReturnWrapper.appendChild(orderReturnLabel);

    orderReturn.classList.remove('hide');
  }
}

async function decorateOrderDetails(parent, order, productData, placeholders, locale) {
  const orderItemsList = document.createElement('div');
  orderItemsList.classList.add('order-details-wrapper', 'hide');

  const orderReturn = document.createElement('div');
  orderReturn.classList.add('order-return', 'hide');

  orderItemsList.appendChild(orderReturn);

  await decorateOrderReturnDetails(orderReturn, order, placeholders, locale);

  const lang = document.documentElement.lang || 'en';
  const viewDetailsLink = `/${lang}/user/account/orders/details?orderId=`;

  decorateOrderItems(orderItemsList, order, productData, placeholders, locale, false);
  decorateOrderItems(orderItemsList, order, productData, placeholders, locale, true);

  const orderItemsFooter = document.createElement('div');
  orderItemsFooter.classList.add('order-items-footer');

  orderItemsFooter.innerHTML = `
        <span class="order-items-footer-link">
            <a href="${viewDetailsLink}${order.entity_id}">${placeholders.orderDetailsViewOrders || 'View order details'}</a>
        </span>`;

  orderItemsList.appendChild(orderItemsFooter);

  parent.appendChild(orderItemsList);
}

async function decorateRecentOrders(recentOrdersContainer, orders, productData, placeholders, locale) {
  const recentOrdersList = document.createElement('div');
  recentOrdersList.classList.add('recent-orders-list');

  orders.items.forEach((order) => {
    const orderItem = document.createElement('div');
    orderItem.classList.add('recent-order-item', 'details-pending');
    orderItem.dataset.orderId = order.entity_id;

    const orderSummary = document.createElement('div');
    orderSummary.classList.add('order-summary');

    const orderNumber = document.createElement('div');
    orderNumber.classList.add('order-number', 'order-header');

    const orderNumberLabel = document.createElement('span');
    orderNumberLabel.classList.add('order-number', 'order-detail-label');
    orderNumberLabel.textContent = placeholders.orderNumber || 'Order ID';

    orderNumber.appendChild(orderNumberLabel);

    const orderNumberText = document.createElement('span');
    orderNumberText.classList.add('order-number', 'order-detail-value');
    orderNumberText.textContent = order.increment_id;

    orderNumber.appendChild(orderNumberText);

    const orderDate = document.createElement('span');
    orderDate.classList.add('order-date', 'order-detail-label');
    formatDateTime(order.created_at, locale).then((formattedDate) => {
      orderDate.textContent = formattedDate;
    });

    orderNumber.appendChild(orderDate);

    const orderItems = document.createElement('div');
    orderItems.classList.add('order-items', 'order-header');

    const orderItemsDesc = document.createElement('span');
    orderItemsDesc.classList.add('order-items-desc', 'order-detail-value');
    orderItemsDesc.textContent = `${getOrderProductNames(order)}`;

    orderItems.appendChild(orderItemsDesc);

    const orderTotalCount = getTotalItemsCount(order);
    const orderTotalItemsMessage = orderTotalCount > 1 ? placeholders.orderItemsTotal || 'Total {{}} items' : placeholders.orderItemTotal || 'Total {{}} item';

    const orderItemsValue = document.createElement('span');
    orderItemsValue.classList.add('order-items-value', 'order-detail-label');
    orderItemsValue.textContent = orderTotalItemsMessage.replace('{{}}', orderTotalCount);

    orderItems.appendChild(orderItemsValue);

    const cancelledItems = getCancelledOrderCount(order);
    if (cancelledItems > 0) {
      const orderCancelledItemsMessage = placeholders.orderItemsCancelled || 'Cancelled: {{}} items';

      const orderItemsCancelled = document.createElement('span');
      orderItemsCancelled.classList.add('order-items-cancelled', 'order-detail-label');
      orderItemsCancelled.innerHTML = `<a href="#">${orderCancelledItemsMessage.replace('{{}}', cancelledItems)}</a>`;
      orderItems.appendChild(orderItemsCancelled);

      orderItemsCancelled.addEventListener('click', (event) => {
        event.preventDefault();
        const orderItemsCancelledElem = orderItem.querySelector('.order-items-wrapper.order-items-cancelled');
        setTimeout(() => {
          orderItemsCancelledElem.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        }, 100);
      });
    }

    const orderStatus = document.createElement('div');
    orderStatus.classList.add('order-status', 'order-header');

    const orderStatusText = getOrderStatus(order);

    const orderStatusValue = document.createElement('span');
    orderStatusValue.classList.add('order-status', `order-status-${orderStatusText.replaceAll(' ', '-')}`);
    const orderStatusKey = convertToCamelCase(`order-status-${orderStatusText.replaceAll(' ', '-')}`);
    orderStatusValue.textContent = placeholders[orderStatusKey] || orderStatusText;

    if (isRefundedFully(order)) {
      orderStatusValue.classList.add('order-status-refunded-fully');
    }

    orderStatus.appendChild(orderStatusValue);

    const orderTotal = document.createElement('div');
    orderTotal.classList.add('order-total', 'order-header');

    const orderTotalLabel = document.createElement('span');
    orderTotalLabel.classList.add('order-total', 'order-detail-label');
    orderTotalLabel.textContent = placeholders.orderTotal || 'Order Total';

    orderTotal.appendChild(orderTotalLabel);

    const orderTotalValue = document.createElement('span');
    orderTotalValue.classList.add('order-total', 'order-detail-value');
    formatPrice(order.order_currency_code, order.grand_total).then((formattedPrice) => {
      orderTotalValue.textContent = formattedPrice;
    });

    orderTotal.appendChild(orderTotalValue);

    const orderExpand = document.createElement('div');
    orderExpand.classList.add('order-expand');

    const orderExpandLink = document.createElement('a');
    orderExpandLink.classList.add('order-expand-link');

    orderExpandLink.innerHTML = `
        <span class="icon icon-chevron-down"></span>
        <span class="icon icon-chevron-up expand"><span></span>`;

    orderExpand.appendChild(orderExpandLink);

    orderSummary.appendChild(orderNumber);
    orderSummary.appendChild(orderItems);
    orderSummary.appendChild(orderStatus);
    orderSummary.appendChild(orderTotal);
    orderSummary.appendChild(orderExpand);

    orderItem.appendChild(orderSummary);

    decorateOrderDetails(orderItem, order, productData, placeholders, locale);

    recentOrdersList.appendChild(orderItem);

    orderSummary.addEventListener('click', () => {
      recentOrdersList.querySelectorAll('.recent-order-item').forEach((item) => {
        if (item !== orderItem) {
          const accordionContent = item.querySelector('.order-details-wrapper');
          item.classList.remove('expanded');
          accordionContent.style.height = 0;
        }
      });
      orderItem.classList.toggle('expanded');
      const accordionContent = orderItem.querySelector('.order-details-wrapper');
      if (orderItem.classList.contains('expanded')) {
        accordionContent.style.height = `${accordionContent.scrollHeight}px`;
        orderSummary.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
      } else {
        accordionContent.style.height = 0;
      }
    });
  });
  recentOrdersContainer.appendChild(recentOrdersList);
  decorateIcons(recentOrdersList);
}

async function numberOfOrders() {
  return getConfigValue('recent-order-count') || 3;
}

export default async function decorate(block) {
  const placeholders = await fetchPlaceholdersForLocale();
  const numberOfOrdersToDisplay = await numberOfOrders(block);

  const titleDiv = block.children[0] ? block.children[0] : block;
  const viewAllOrdersLink = titleDiv.querySelector('a');
  const recentOrdersTitle = titleDiv.querySelector('h2, h3, h4, h5, h6');

  const emptyOrders = block.children.length >= 2 ? block.children[1] : null;

  const emptyOrdersDiv = document.createElement('div');
  emptyOrdersDiv.classList.add('empty-orders');
  emptyOrdersDiv.innerHTML = emptyOrders?.innerHTML || '';

  const noteContent = block.children.length >= 3 ? block.children[2] : null;

  const note = document.createElement('div');
  note.classList.add('order-notes');
  note.innerHTML = noteContent?.innerHTML || '';
  decorateIcons(note);

  block.innerHTML = '';

  const recentOrdersContainer = document.createElement('div');
  recentOrdersContainer.classList.add('recent-orders-container');

  const successTitleWrapper = document.createElement('div');
  successTitleWrapper.classList.add('title-wrapper');

  successTitleWrapper.appendChild(recentOrdersTitle);
  successTitleWrapper.appendChild(viewAllOrdersLink);

  viewAllOrdersLink.classList.remove('button');

  recentOrdersContainer.appendChild(successTitleWrapper);

  recentOrdersContainer.appendChild(emptyOrdersDiv);

  recentOrdersContainer.classList.add('loading-parent', 'loading');

  const loadingBlock = document.createElement('div');
  loadingBlock.classList.add('loading-block');
  loadingBlock.innerHTML = `
      <div class="loading-spinner">
        <span class="icon icon-ic-loader"></span>
      </div>
    `;
  decorateIcons(loadingBlock);
  recentOrdersContainer.appendChild(loadingBlock);

  getRecentOrdersUsingAPI(numberOfOrdersToDisplay).then(async (orders) => {
    if (orders?.items?.length > 0) {
      recentOrdersContainer.classList.add('has-orders');
      const productData = await fetchProductDataForOrders(orders);
      const locale = await getLocale();

      recentOrdersContainer.classList.remove('loading');
      await decorateRecentOrders(recentOrdersContainer, orders, productData, placeholders, locale);

      window.addEventListener('delayed-loaded', () => {
        fetchReviewsForOrders(orders).then((reviews) => {
          decorateReviews(recentOrdersContainer, orders, reviews, placeholders, locale);
        });
      });
    }

    recentOrdersContainer.classList.remove('loading');
    recentOrdersContainer.appendChild(note);
  });

  block.appendChild(recentOrdersContainer);
}
