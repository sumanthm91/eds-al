import { getAddressAreas, getAddressCitySegments } from '../../scripts/address/api.js';
import { getConfigValue } from '../../scripts/configs.js';
import {
  getEGiftCardList,
  getOrder,
  getOrderReturnsConfig,
  getRMAsByOrderId,
  postCreateReturn,
} from '../../scripts/order/api.js';
import {
  fetchPlaceholdersForLocale,
  getLocale,
  openModal,
  formatPrice,
  createModalFromContent,
  closeModal,
} from '../../scripts/scripts.js';
import {
  getReturnEligibleItems,
  renderOrderSummaryPanel,
  renderReturnLoader,
  toggleGlobalLoader,
} from '../account-orders-detail/account-orders-detail.js';
import {
  fetchProductDataForOrders,
  getCancelledItemsCount,
  getDeliveredItemsCount,
  getProductImage,
  isReturnRequested,
} from '../account-recent-orders/account-recent-orders.js';

const returnItemsObj = {};
let promotionProducts = [];
// The RMA return data object
let rmaDataObject = {};
const FREE_ITEM_PRICE = 0.01;

/**
 * Checks the truthy state of a value
 * @param {*} value can be any datatype value
 * @returns Boolean
 */
const hasValue = (value) => {
  if (typeof value === 'undefined') {
    return false;
  }

  if (value === null) {
    return false;
  }

  if (Object.prototype.hasOwnProperty.call(value, 'length') && value.length === 0) {
    return false;
  }

  if (value.constructor === Object && Object.keys(value).length === 0) {
    return false;
  }

  return Boolean(value);
};

/**
 * Initialize the RMA return data object
 * @param {Object} order The order data object
 */
const initRmaDataObject = (order) => {
  if (!order) {
    return;
  }

  rmaDataObject = {
    order_id: order?.entity_id || '',
    order_increment_id: order?.increment_id || '',
    store_id: order?.store_id || '',
    customer_id: order?.customer_id || '',
    items: [],
    extension_attributes: {},
    status: 'pending',
  };
};

/**
 * Adds and removes classnames from an element based on state
 * @param {HTMLElement} elem The html element
 * @param {String} className The name of the class that needs to be toggled
 * @param {Boolean} state determine the toggle state
 * @returns
 */
const toggleElementClass = (elem, className, state) => {
  if (!elem) {
    return;
  }

  if (state) {
    elem.classList.add(className);
  } else {
    elem.classList.remove(className);
  }
};

/**
 * Validates the selected row from the items to return section
 * @returns
 */
const validateSelectItemToReturn = () => {
  const isValid = Object.values(returnItemsObj)?.length
    && Object.values(returnItemsObj)
      .every((item) => item.reason !== null);

  const btnContinue = document.getElementById('btn-return-content-footer');
  if (btnContinue) {
    if (isValid) {
      btnContinue.disabled = false;
    } else {
      btnContinue.disabled = true;
    }
  }

  return isValid;
};

/**
 * Validates each row and toggles the state of element based on the selection
 * @returns
 */
const validateItemRows = () => {
  const itemRows = document.querySelectorAll('.order-return-item-row');
  if (!itemRows?.length) {
    return;
  }

  itemRows.forEach((row) => {
    const { itemId } = row.dataset;

    if (!itemId) {
      return;
    }

    const checkbox = document.getElementById(`order-item-checkbox-input-${itemId}`);
    const reasonsColumn = document.getElementById(`return-reasons-column-${itemId}`);
    const quantityColumn = document.getElementById(`return-quantity-column-${itemId}`);
    const returnReasonsInput = document.getElementById(`return-reasons-options-${itemId}`);
    const returnQuantityInput = document.getElementById(`return-quantity-options-${itemId}`);

    if (returnItemsObj[itemId]) {
      checkbox.checked = true;
      toggleElementClass(reasonsColumn, 'hidden', false);
      toggleElementClass(quantityColumn, 'hidden', false);

      if (returnQuantityInput && returnItemsObj?.[itemId]?.isPromotion) {
        returnQuantityInput.disabled = true;
        returnQuantityInput.value = returnItemsObj[itemId].qty_ordered;
      }
    } else {
      if (!checkbox) {
        return;
      }

      checkbox.checked = false;
      toggleElementClass(reasonsColumn, 'hidden', true);
      toggleElementClass(quantityColumn, 'hidden', true);

      if (returnReasonsInput) {
        returnReasonsInput.value = '';
      }

      if (returnQuantityInput) {
        returnQuantityInput.value = '1';
      }
    }

    validateSelectItemToReturn();
  });
};

/**
 * Handles the selected state of an item in the item to returns section
 * @param {*} items The array of items to return
 * @param {*} returnsConfig Return configuration
 * @param {*} isPromotion is the item belong to a promotion or not
 * @returns
 */
const handleSelectedItems = (items, returnsConfig, isPromotion = false) => {
  if (!returnsConfig) {
    return;
  }

  const resolutions = returnsConfig?.resolutions;
  if (!resolutions) {
    return;
  }

  const refundResolution = resolutions.find((resolution) => (resolution.label).toLowerCase() === 'refund');
  if (!refundResolution) {
    return;
  }

  items.forEach((item) => {
    returnItemsObj[item.item_id] = {
      order_item_id: item.item_id,
      qty_requested: isPromotion ? item.qty_ordered : 1,
      qty_ordered: item.qty_ordered,
      reason: null,
      resolution: refundResolution.id,
      status: 'pending',
      isPromotion,
    };
  });

  validateItemRows();
};

/**
 * Handles the click of 'Continue' button in the promotion modal
 * @param {*} returnsConfig Return configurations
 * @param {*} isPromotion is the item belong to a promotion or not
 */
const handlePromotionModalContinue = (returnsConfig, isPromotion = false) => {
  closeModal('order-return-promotion-modal');
  handleSelectedItems(promotionProducts, returnsConfig, isPromotion);
};

const handlePromotionModalDeselect = () => {
  closeModal('order-return-promotion-modal');
  validateItemRows();
};

const handleDeselectedItems = (items) => {
  items.forEach((item) => {
    const itemId = item?.item_id;
    if (!itemId) {
      return;
    }

    const currentReturnItem = returnItemsObj[itemId];
    if (!currentReturnItem) {
      return;
    }

    delete returnItemsObj[itemId];
  });

  validateItemRows();
};

/**
 * Creates and renders the promotion modal
 * @param {*} returnsConfig Return configurations
 * @param {*} placeholders The placeholder translations object
 */
const createReturnPromotionModal = async (returnsConfig, placeholders) => {
  const modalTitle = placeholders?.orderReturnPromotionModalTitle || 'Selected item is Promotional Item';

  const modalContentWrapper = document.createElement('div');

  const modalContent = document.createElement('div');
  modalContent.classList.add('order-return-promotion-modal-content');

  const modalContentTextOne = document.createElement('p');
  modalContentTextOne.innerText = placeholders?.orderReturnPromotionModalContentTextOne || 'To receive refund for promotional items, all items related to the promotion has to be refunded.';

  const modalContentTextTwo = document.createElement('p');
  modalContentTextTwo.innerText = placeholders?.orderReturnPromotionModalContentTextTwo || 'Clicking continue will select all items in this promotion.';

  const btnWrapper = document.createElement('div');
  btnWrapper.classList.add('order-return-btn-wrapper');

  const btnContinue = document.createElement('button');
  btnContinue.setAttribute('id', 'order-return-promotion-btn-continue');
  btnContinue.innerText = placeholders?.orderReturnPromotionModalContinue || 'Continue';

  const btnDeselect = document.createElement('button');
  btnDeselect.classList.add('secondary');
  btnDeselect.setAttribute('id', 'order-return-promotion-btn-deselect');
  btnDeselect.innerText = placeholders?.orderReturnPromotionModalDeselect || 'Deselect this item';

  btnWrapper.appendChild(btnContinue);
  btnWrapper.appendChild(btnDeselect);

  modalContent.appendChild(modalContentTextOne);
  modalContent.appendChild(modalContentTextTwo);
  modalContentWrapper.appendChild(modalContent);
  modalContentWrapper.appendChild(btnWrapper);

  await createModalFromContent('order-return-promotion-modal', modalTitle, modalContentWrapper.innerHTML, ['order-return-promotion-modal', 'order-return-modal'], '', false, 'icon-close-black', validateItemRows);

  const continueBtn = document.getElementById('order-return-promotion-btn-continue');
  continueBtn.addEventListener('click', () => handlePromotionModalContinue(returnsConfig, true));

  const deselectBtn = document.getElementById('order-return-promotion-btn-deselect');
  deselectBtn.addEventListener('click', handlePromotionModalDeselect);
};

/**
 * Creates and renders the inelligible items to return modal
 * @param {*} placeholders The placeholder translations object
 */
const createInelligibleReturnModal = async (placeholders) => {
  const modalContent = document.createElement('div');
  modalContent.classList.add('order-ineligible-return-modal-content');

  const modalContentText = document.createElement('p');
  modalContentText.innerText = placeholders?.orderIneligibleReturnModalContent || 'One or more products selected are not eligible for a return as they are on promotion. Please select a different product to proceed';

  modalContent.appendChild(modalContentText);

  await createModalFromContent('order-ineligible-return-modal', '', modalContent.outerHTML, ['order-ineligible-return-modal', 'order-return-modal'], '', false, 'icon-close-black');
};

const updateReturnItem = (itemId, key, value) => {
  const selectedReturnItem = returnItemsObj[itemId];
  if (!selectedReturnItem) {
    return;
  }

  selectedReturnItem[key] = value;

  validateSelectItemToReturn();
};

/**
 * Handles the state when the user click or checks the checkbox of each return item.
 * @param {*} event The click event
 * @param {*} item The item selected for return
 * @param {*} order The complete oder details data
 * @param {*} returnsConfig The return configurations
 * @returns
 */
const returnRowCheckHandler = async (event, item, order, returnsConfig, placeholders) => {
  const { checked } = event.target;

  const {
    extension_attributes: {
      auto_select: autoSelect,
    },
    applied_rule_ids: appliedRuleIdsWithDiscount,
  } = item;
  let selectedItemDiscountPromotion = [];

  // Check for discount promotion only if autoselect is set.
  if (autoSelect && hasValue(appliedRuleIdsWithDiscount)) {
    selectedItemDiscountPromotion = appliedRuleIdsWithDiscount.split(',');
  }
  let discountedProducts = [];
  let itemEligibleForReturn = true;
  const relatedPromotionalProducts = [];

  if (selectedItemDiscountPromotion.length > 0) {
    // Filter out all the valid product which are having discounted rule id and
    // non zero ordered qty available.
    discountedProducts = order.items.filter(
      (product) => product.applied_rule_ids
        && item.sku !== product.sku
        && product.qty_ordered > 0
        && product?.extension_attributes?.auto_select,
    );

    // Check if item is eligible for return or not.
    itemEligibleForReturn = !(discountedProducts.some(
      (individualItem) => {
        // Explode all the applied discounted rule ids.
        const itemDiscountedRuleIds = individualItem.applied_rule_ids.split(',');
        const hasSameDiscount = itemDiscountedRuleIds.some(
          (pid) => selectedItemDiscountPromotion.includes(pid),
        );
        // If current product has same applied rule id as the selected
        // product, we check if it is returnable or not.
        // Return false if it is returnable to continue the loop and check
        // next discounted product, else return true.
        if (hasSameDiscount) {
          relatedPromotionalProducts.push(individualItem);

          return !(individualItem?.extension_attributes?.is_returnable === 1);
        }
        // Continue the loop to check next discounted product.
        return false;
      },
    ));
  }

  if (!itemEligibleForReturn) {
    openModal('order-ineligible-return-modal');
    validateItemRows();
    return;
  }

  promotionProducts = [item, ...relatedPromotionalProducts];

  if (checked) {
    if (selectedItemDiscountPromotion?.length > 0) {
      await createReturnPromotionModal(returnsConfig, placeholders);
      // Update the promotion products data which will be used
      // by the promotion modal
      // Opens the promotion modal
      openModal('order-return-promotion-modal');
    } else {
      handleSelectedItems([item], returnsConfig, false);
    }
  } else if (selectedItemDiscountPromotion?.length > 0) {
    handleDeselectedItems(promotionProducts, true);
  } else {
    handleDeselectedItems([item], false);
  }
};

/**
 * Handles the reason select change event
 * @param {*} event The select dropdown change handler
 * @returns
 */
const returnReasonSelectHandler = (event) => {
  const { itemId } = event.target.dataset;
  if (!itemId) {
    return;
  }

  const reasonCode = event.target.value;
  updateReturnItem(itemId, 'reason', reasonCode === '' ? null : reasonCode);
};

const handleCollapseHeadClick = (event) => {
  const parent = event.target.parentNode;
  if (parent.classList.contains('is-disabled')) {
    return;
  }

  if (parent.classList.contains('is-closed')) {
    parent.classList.remove('is-closed');
  } else {
    parent.classList.add('is-closed');
  }
};

const returnQuantitySelectHandler = (event) => {
  const { itemId } = event.target.dataset;
  if (!itemId) {
    return;
  }

  const quantity = event.target.value;
  updateReturnItem(itemId, 'qty_requested', +quantity);
};

/**
 * Utility method to update the RMA data object
 * @param {String} key key name
 * @param {*} data the data to be updated
 */
const updateProcessedRmaDataObject = (key, data) => {
  if (!rmaDataObject[key]) {
    return;
  }

  rmaDataObject[key] = data;
};

/**
 * Handles the 'Continue' button click handler
 */
const itemsToReturnContinueHandler = () => {
  Object.values(returnItemsObj).forEach((item) => {
    delete item.qty_ordered;
    delete item.isPromotion;
    rmaDataObject.items.push(item);
  });

  // Collapse the 'Select items to return' collpasible section
  const itemToReturnCollapsible = document.getElementById('item-to-return-collapse-wrapper');
  if (itemToReturnCollapsible) {
    itemToReturnCollapsible.classList.add('is-closed');
  }

  // Open the 'Return and refund' collpasible section
  const returnRefundCollapsible = document.getElementById('return-refund-collapse-wrapper');
  if (returnRefundCollapsible) {
    returnRefundCollapsible.classList.remove('is-closed', 'is-disabled');
  }
};

/**
 * Handles the 'Confirm' return button click event
 */
const confirmRefundButtonHandler = async () => {
  window.onbeforeunload = null;
  toggleGlobalLoader(true);

  const { entity_id: returnId, order_id: orderId } = await postCreateReturn({ rmaDataObject });

  if (!(returnId && orderId)) {
    return;
  }

  const lang = document.documentElement.lang || 'en';

  window.location.href = `/${lang}/user/account/orders/confirm-return?orderId=${orderId}&returnId=${returnId}`;
};

/**
 * Creates and renders each Refund method input sections based on type
 * @param {*} type Type of the refund method
 * @param {*} value value of the input
 * @param {*} icon icon name
 * @param {*} label Label text
 * @param {*} mainDescription Main description
 * @param {*} subDescription Sub description
 * @param {*} extenstionData extendsion data to be send as part of RMA object
 * @param {*} isSelected determines if the input should be checked or not
 * @param {*} hasInput determines if the refund method has input or not
 */
const getRefundMethodInput = async (
  type,
  value,
  icon,
  label,
  mainDescription,
  subDescription,
  extenstionData,
  isSelected = false,
  hasInput = false,
  isHybrid = false,
) => {
  const methodInput = document.createElement('div');
  methodInput.classList.add('return-method-item', `return-method-${type}`);

  const methodLabel = document.createElement('label');
  methodLabel.setAttribute('for', `return-method-${type}-input`);

  if (hasInput) {
    const input = document.createElement('input');
    input.setAttribute('type', 'radio');
    input.setAttribute('name', 'refund_mode');
    input.setAttribute('value', value);
    if (isSelected) {
      input.setAttribute('checked', true);
    }
    input.setAttribute('id', `return-method-${type}-input`);
    input.addEventListener('change', () => updateProcessedRmaDataObject('extension_attributes', extenstionData));
    methodLabel.appendChild(input);
  }

  const methodIcon = document.createElement('img');
  methodIcon.setAttribute('src', `/icons/${icon}.svg`);

  const methodTitle = document.createElement('span');
  methodTitle.innerText = label;

  if (icon) {
    methodLabel.appendChild(methodIcon);
  }
  methodLabel.appendChild(methodTitle);

  methodInput.appendChild(methodLabel);

  if (mainDescription && !isHybrid) {
    const methodMainDescription = document.createElement('div');
    methodMainDescription.classList.add('method-main-description');
    methodMainDescription.innerText = mainDescription;
    methodInput.appendChild(methodMainDescription);
  }

  if (subDescription) {
    const methodSubDescription = document.createElement('div');
    methodSubDescription.classList.add('method-sub-description');
    methodSubDescription.innerText = subDescription;
    methodInput.appendChild(methodSubDescription);
  }

  return methodInput;
};

/**
 * Creates and renders the E-Gift refund method
 * @param {Object} order The order data object
 * @param {Object} placeholders The translation placeholder object
 * @param {Boolean} hasInput determines if the refund method has input or not
 * @param {Function} callback callback method to be executed
 */
const getEGiftRefundMethodContent = async (
  order,
  placeholders,
  hasInput = false,
  callback = null,
  isHybrid = false,
) => {
  const eGiftLabel = placeholders?.orderRefundEgiftCard || 'eGift Card';
  let eGiftMainDescription = placeholders?.orderRefundEgiftCardMainDescription || 'Details of your eGift Card will be sent to your email address';
  eGiftMainDescription += ` "${order?.customer_email || ''}"`;

  const eGiftCardList = await getEGiftCardList();

  if (!eGiftCardList?.card_list) {
    return null;
  }

  const extenstionData = {};

  if (eGiftCardList.card_list.length > 0) {
    extenstionData.refund_mode = 'hps_payment';
    extenstionData.egift_card_type = 'linked';
    extenstionData.egift_card_number = eGiftCardList.card_list[0]?.card_number || '';
  } else {
    extenstionData.refund_mode = 'hps_payment';
    extenstionData.egift_card_type = 'new';
  }

  if (callback) {
    callback(extenstionData);
  }

  const eGift = await getRefundMethodInput(
    'egift',
    'e-gift',
    'egift',
    eGiftLabel,
    eGiftMainDescription,
    null,
    extenstionData,
    true,
    hasInput,
    isHybrid,
  );

  return eGift;
};

/**
 * Creates and renders the QPay refund method
 * @param {Object} order The order data object
 * @param {Object} placeholders The translation placeholder object
 * @param {Boolean} hasInput determines if the refund method has input or not
 * @param {Function} callback callback method to be executed
 */
const getQPayRefundMethodContent = async (
  placeholders,
  hasInput = false,
) => {
  const label = placeholders?.orderRefundQpay || 'NAPS Qatar Debit Card';
  const icon = '';
  const mainDescription = placeholders?.orderRefundQpayMainDescription || '';
  const subDescription = placeholders?.orderRefundQpaySubDescription || 'Estimated refund in 3-5 business days after we receive the item';
  const extenstionData = {};

  const qPay = await getRefundMethodInput(
    'egift',
    'qpay',
    icon,
    label,
    mainDescription,
    subDescription,
    extenstionData,
    true,
    hasInput,
  );

  return qPay;
};
/**
 * Creates and renders the Card refund method
 * @param {Object} order The order data object
 * @param {Object} placeholders The translation placeholder object
 * @param {Boolean} hasInput determines if the refund method has input or not
 */
const getCardRefundMethodContent = async (
  order,
  placeholders,
  hasInput = false,
) => {
  let cardLabel = '';
  let cardIcon = '';

  if (order?.extension_attributes?.payment_additional_info) {
    cardIcon = order?.extension_attributes?.payment_additional_info?.find((info) => info.key === 'scheme')?.value;

    if (cardIcon) {
      cardIcon = cardIcon.toLowerCase();
    }

    const maskedCC = order?.extension_attributes?.payment_additional_info?.find((info) => info.key === 'last4')?.value || '';

    cardLabel = (placeholders?.orderRefundCreditcardEnding || 'Credit Card ending {{}}').replace('{{}}', maskedCC);
  }

  const extenstionData = {};
  const cardMainDescription = null;
  const cardSubDescription = placeholders?.orderRefundCreditcardSubDescription || 'Estimated refund in 3-5 business days after we receive the item';

  const card = await getRefundMethodInput('card', 'card', cardIcon, cardLabel, cardMainDescription, cardSubDescription, extenstionData, false, hasInput);

  return card;
};

const getAuraRefundMethodContent = async (order, placeholders) => {
  const loyaltyCardNum = (order?.extension_attributes?.loyalty_card || '').slice(-4);
  const label = (placeholders?.orderRefundAura || 'Aura Loyalty Card ending in {{}}').replace('{{}}', loyaltyCardNum);
  const icon = 'aura';
  const mainDescription = placeholders?.orderRefundAuraMainDescription || '';
  const subDescription = placeholders?.orderRefundAuraSubDescription || '';
  const extenstionData = {};

  const aura = await getRefundMethodInput('aura', 'aura', icon, label, mainDescription, subDescription, extenstionData);

  return aura;
};

const getTabbyRefundMethodContent = async (placeholders) => {
  const label = placeholders?.orderRefundTabby || 'Tabby';
  const icon = 'tabby';
  const mainDescription = placeholders?.orderRefundTabbyMainDescription || '';
  const subDescription = placeholders?.orderRefundTabbySubDescription || '';
  const extenstionData = {};

  const tabby = await getRefundMethodInput('tabby', 'tabby', icon, label, mainDescription, subDescription, extenstionData);

  return tabby;
};

const getTamaraRefundMethodContent = async (placeholders) => {
  const label = placeholders?.orderRefundTamara || 'Tamara';
  const icon = 'tamara';
  const mainDescription = placeholders?.orderRefundTamaraMainDescription || '';
  const subDescription = placeholders?.orderRefundTamaraSubDescription || '';
  const extenstionData = {};

  const tamara = await getRefundMethodInput('tamara', 'tamara', icon, label, mainDescription, subDescription, extenstionData);

  return tamara;
};

/**
 * Creates and renders the refund method section content
 * @param {Object} order The order data object
 * @param {Object} placeholders The translation placeholder object
 */
const getRefundMethodsContent = async (order, placeholders) => {
  const refundMethodsContent = document.createElement('div');
  refundMethodsContent.classList.add('refund-methods-content', 'refund-detail-section-right');

  const refundMethod = order?.payment?.method;
  if (!refundMethod) {
    return null;
  }

  // Card Payment
  if (refundMethod === 'checkout_com_upapi') {
    let isHybrid = false;
    let showRadioInput = true;

    if (order?.extension_attributes?.hps_redeemed_amount > 0) {
      isHybrid = true;
      showRadioInput = false;

      const hybridPaymentMainText = document.createElement('div');
      hybridPaymentMainText.classList.add('hybrid-payment-main-description');
      hybridPaymentMainText.innerText = placeholders?.orderHybridPaymentMainTitle || 'Original Multiple payment methods used';
      refundMethodsContent.appendChild(hybridPaymentMainText);

      const hybridPaymentSubText = document.createElement('div');
      hybridPaymentSubText.classList.add('hybrid-payment-sub-description');
      hybridPaymentSubText.innerText = placeholders?.orderHybridPaymentSubTitle || 'Your refund will be credited back to the following payment methods.';
      refundMethodsContent.appendChild(hybridPaymentSubText);
    }

    // E-Gift
    const eGift = await getEGiftRefundMethodContent(order, placeholders, showRadioInput, (data) => updateProcessedRmaDataObject('extension_attributes', data), isHybrid);
    if (eGift) {
      refundMethodsContent.appendChild(eGift);
    }

    // Card
    const card = await getCardRefundMethodContent(order, placeholders, showRadioInput);
    if (card) {
      refundMethodsContent.appendChild(card);
    }
  }

  if (
    refundMethod === 'cashondelivery'
    || refundMethod === 'checkout_com_upapi_fawry'
  ) {
    const eGift = await getEGiftRefundMethodContent(order, placeholders, false, (data) => updateProcessedRmaDataObject('extension_attributes', data));

    if (eGift) {
      refundMethodsContent.appendChild(eGift);
    }
  }

  if (refundMethod === 'hps_payment') {
    let isHybrid = false;
    let hasHybridAura = false;
    const showRadioInput = false;

    if (order?.extension_attributes?.apc_redeemed_points) {
      isHybrid = true;
      hasHybridAura = true;
    }

    if (isHybrid) {
      const hybridPaymentMainText = document.createElement('div');
      hybridPaymentMainText.classList.add('hybrid-payment-main-description');
      hybridPaymentMainText.innerText = placeholders?.orderHybridPaymentMainTitle || 'Original Multiple payment methods used';
      refundMethodsContent.appendChild(hybridPaymentMainText);

      const hybridPaymentSubText = document.createElement('div');
      hybridPaymentSubText.classList.add('hybrid-payment-sub-description');
      hybridPaymentSubText.innerText = placeholders?.orderHybridPaymentSubTitle || 'Your refund will be credited back to the following payment methods.';
      refundMethodsContent.appendChild(hybridPaymentSubText);
    }

    const eGift = await getEGiftRefundMethodContent(order, placeholders, showRadioInput, (data) => updateProcessedRmaDataObject('extension_attributes', data));

    if (eGift) {
      refundMethodsContent.appendChild(eGift);
    }

    if (hasHybridAura) {
      const aura = await getAuraRefundMethodContent(order, placeholders);

      if (aura) {
        refundMethodsContent.appendChild(aura);
      }
    }
  }

  if (refundMethod === 'aura_payment') {
    const aura = await getAuraRefundMethodContent(order, placeholders);

    if (aura) {
      refundMethodsContent.appendChild(aura);
    }
  }

  if (refundMethod === 'tabby') {
    const tabby = await getTabbyRefundMethodContent(placeholders);

    if (tabby) {
      refundMethodsContent.appendChild(tabby);
    }
  }

  if (refundMethod === 'tamara') {
    const tamara = await getTamaraRefundMethodContent(placeholders);

    if (tamara) {
      refundMethodsContent.appendChild(tamara);
    }
  }

  if (refundMethod === 'checkout_com_upapi_qpay') {
    let isHybrid = false;
    let hasHybridEgift = false;
    let hasHybridAura = false;
    const showRadioInput = false;

    if (order?.extension_attributes?.hps_redeemed_amount > 0) {
      isHybrid = true;
      hasHybridEgift = true;
    }

    if (order?.extension_attributes?.apc_redeemed_points) {
      isHybrid = true;
      hasHybridAura = true;
    }

    if (isHybrid) {
      const hybridPaymentMainText = document.createElement('div');
      hybridPaymentMainText.classList.add('hybrid-payment-main-description');
      hybridPaymentMainText.innerText = placeholders?.orderHybridPaymentMainTitle || 'Original Multiple payment methods used';
      refundMethodsContent.appendChild(hybridPaymentMainText);

      const hybridPaymentSubText = document.createElement('div');
      hybridPaymentSubText.classList.add('hybrid-payment-sub-description');
      hybridPaymentSubText.innerText = placeholders?.orderHybridPaymentSubTitle || 'Your refund will be credited back to the following payment methods.';
      refundMethodsContent.appendChild(hybridPaymentSubText);
    }

    const qPay = await getQPayRefundMethodContent(placeholders, showRadioInput);

    if (qPay) {
      refundMethodsContent.appendChild(qPay);
    }

    if (hasHybridAura) {
      const aura = await getAuraRefundMethodContent(order, placeholders);

      if (aura) {
        refundMethodsContent.appendChild(aura);
      }
    }

    if (hasHybridEgift) {
      // E-Gift
      const eGift = await getEGiftRefundMethodContent(order, placeholders, showRadioInput, (data) => updateProcessedRmaDataObject('extension_attributes', data), isHybrid);

      if (eGift) {
        refundMethodsContent.appendChild(eGift);
      }
    }
  }

  return refundMethodsContent;
};

/**
 * Creates and renders the refund method details
 * @param {*} order The order data object
 * @param {*} placeholders The translation placeholder object
 */
const renderRefundMethodDetails = async (order, placeholders) => {
  const refundMethodDetails = document.createElement('div');
  refundMethodDetails.classList.add('refund-method-wrapper');

  const refundMethod = document.createElement('div');
  refundMethod.classList.add('refund-method', 'refund-row');
  const refundMethodTitle = document.createElement('div');
  refundMethodTitle.classList.add('refund-method-title');
  refundMethodTitle.innerText = placeholders?.orderRefundMethod || 'Refund Method';

  refundMethod.appendChild(refundMethodTitle);
  const refundMethodsContent = await getRefundMethodsContent(order, placeholders);
  if (refundMethodsContent) {
    refundMethod.appendChild(refundMethodsContent);
  }

  refundMethodDetails.appendChild(refundMethod);

  return refundMethodDetails;
};

/**
 * Creates and renders the refund amount details
 * @param {*} placeholders
 */
const renderRefundAmountDetails = (placeholders) => {
  const refundAmountDetails = document.createElement('div');
  refundAmountDetails.classList.add('refund-method-wrapper');

  const refundMethod = document.createElement('div');
  refundMethod.classList.add('refund-amount', 'refund-row');
  const refundMethodTitle = document.createElement('div');
  refundMethodTitle.classList.add('refund-amount-title');
  refundMethodTitle.innerText = placeholders?.orderRefundAmount || 'Refund Amount';

  const refundMethodsContent = document.createElement('div');
  refundMethodsContent.classList.add('refund-detail-section-right');
  refundMethodsContent.innerText = placeholders?.orderRefundAmountDescription || 'Your refund amount will be notified to you through mail once we receive the items in warehouse';

  refundMethod.appendChild(refundMethodTitle);
  refundMethod.appendChild(refundMethodsContent);

  refundAmountDetails.appendChild(refundMethod);

  return refundAmountDetails;
};

/**
 * Creates and renders the refund pickup details
 * @param {Object} placeholders The translation placeholder object
 */
const renderRefundPickupDetails = (placeholders) => {
  const refundAmountDetails = document.createElement('div');
  refundAmountDetails.classList.add('refund-method-wrapper');

  const refundMethod = document.createElement('div');
  refundMethod.classList.add('pickup-detail', 'refund-row');
  const refundMethodTitle = document.createElement('div');
  refundMethodTitle.classList.add('pickup-detail-title');
  refundMethodTitle.innerText = placeholders?.orderRefundPickupDetails || 'Pick-up Details';

  const refundMethodsContent = document.createElement('div');
  refundMethodsContent.classList.add('refund-detail-section-right');
  refundMethodsContent.innerText = placeholders?.orderRefundPickupDetailsDescription || 'Your Items to Return will be picked up in 3 - 4 days.';

  refundMethod.appendChild(refundMethodTitle);
  refundMethod.appendChild(refundMethodsContent);

  refundAmountDetails.appendChild(refundMethod);

  return refundAmountDetails;
};

/**
 * Creates and renders the refund pickup details
 * @param {Object} order The order data object
 * @param {Object} placeholders The translation placeholder object
 */
const renderRefundPickupAddress = async (order, placeholders) => {
  const refundAmountDetails = document.createElement('div');
  refundAmountDetails.classList.add('refund-method-wrapper');

  const refundMethod = document.createElement('div');
  refundMethod.classList.add('pickup-address', 'refund-row');
  const refundMethodTitle = document.createElement('div');
  refundMethodTitle.classList.add('pickup-address-title');

  const refundMethodTitleMain = document.createElement('p');
  refundMethodTitleMain.classList.add('refund-method-title-main');
  refundMethodTitleMain.innerText = placeholders?.orderRefundPickupAddressMain || 'Pick-up Address';

  const refundMethodTitleSub = document.createElement('p');
  refundMethodTitleSub.classList.add('refund-method-title-sub');
  refundMethodTitleSub.innerText = placeholders?.orderRefundPickupAddressSub || '(Last used address and phone number will be applied)';

  refundMethodTitle.appendChild(refundMethodTitleMain);
  refundMethodTitle.appendChild(refundMethodTitleSub);

  // Delivery address data
  const pickupAddressContent = document.createElement('div');
  pickupAddressContent.classList.add('pickup-address-content', 'refund-detail-section-right');

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

  pickupAddressContent.innerHTML = `
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
  `;

  refundMethod.appendChild(refundMethodTitle);
  refundMethod.appendChild(pickupAddressContent);

  refundAmountDetails.appendChild(refundMethod);

  return refundAmountDetails;
};

const renderCollapsibleItems = async (block, collapseTitle, content, isClosed, isDisabled, id = '') => {
  const collapseWrapper = document.createElement('div');
  collapseWrapper.classList.add('return-collapse-wrapper');
  collapseWrapper.setAttribute('id', `${id}-collapse-wrapper`);
  if (isClosed) {
    collapseWrapper.classList.add('is-closed');
  }
  if (isDisabled) {
    collapseWrapper.classList.add('is-disabled');
  }

  const collapseHead = document.createElement('div');
  collapseHead.classList.add('return-collapse-head');
  collapseHead.setAttribute('id', `${id}-collapse-head`);
  collapseHead.innerText = collapseTitle;

  collapseHead.addEventListener('click', handleCollapseHeadClick);

  const collapseContent = document.createElement('div');
  collapseContent.classList.add('return-collapse-content');
  collapseContent.appendChild(content);

  collapseWrapper.appendChild(collapseHead);
  collapseWrapper.appendChild(collapseContent);

  block.appendChild(collapseWrapper);
};

const buildOrderReturnList = async (
  order,
  items,
  productData,
  returnsConfig,
  placeholders,
  isCancelled = false,
) => {
  const itemsList = document.createElement('div');
  itemsList.classList.add('items-list');

  items.forEach(async (item) => {
    const itemRow = document.createElement('div');
    itemRow.classList.add('order-item', 'order-return-item', 'order-return-item-row');
    itemRow.setAttribute('data-item-id', item.item_id);
    itemRow.setAttribute('id', `order-return-item-${item.item_id}`);

    const itemSku = item.extension_attributes?.parent_product_sku;
    const product = productData?.find((p) => p.sku === itemSku);

    const orderItemCheckbox = document.createElement('div');
    orderItemCheckbox.classList.add('order-item-checkbox');

    if (item.extension_attributes?.is_returnable === 1) {
      const checkboxInput = document.createElement('input');
      checkboxInput.setAttribute('type', 'checkbox');
      checkboxInput.setAttribute('id', `order-item-checkbox-input-${item.item_id}`);
      checkboxInput.setAttribute('data-item-id', item.item_id);
      checkboxInput.addEventListener('change', async (e) => returnRowCheckHandler(e, item, order, returnsConfig, placeholders));
      orderItemCheckbox.appendChild(checkboxInput);
    }

    const orderItemImage = document.createElement('div');
    orderItemImage.classList.add('order-item-image');
    const orderSwatchImg = getProductImage(product);

    if (item.extension_attributes?.is_returnable !== 1) {
      const inelligibleBadge = document.createElement('span');
      inelligibleBadge.classList.add('swatch-img-badge');
      inelligibleBadge.innerText = placeholders?.orderReturnInelligibleBadge || 'Inelligible for return';
      orderSwatchImg.appendChild(inelligibleBadge);
    }

    orderItemImage.appendChild(orderSwatchImg);

    const productInfo = document.createElement('div');
    productInfo.classList.add('product-info', 'text-ellipsis');

    const orderReturnBrandFullNameValue = item.extension_attributes?.brand_full_name;
    if (orderReturnBrandFullNameValue) {
      const orderReturnBrandFullNameParagraph = document.createElement('p');
      orderReturnBrandFullNameParagraph.classList.add('text-light', 'text-md');
      orderReturnBrandFullNameParagraph.textContent = orderReturnBrandFullNameValue;
      productInfo.appendChild(orderReturnBrandFullNameParagraph);
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
    itemCode.classList.add('item-code', 'text-ellipsis', 'text-md', 'text-light');
    itemCode.textContent = `${placeholders?.orderItemCode || 'Item Code'}: ${item.sku}`;
    productInfo.appendChild(itemCode);

    // Quantity of an item
    const itemQuantity = isCancelled ? getCancelledItemsCount(item) : getDeliveredItemsCount(item);

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
    totalPrice.textContent = item.price_incl_tax === FREE_ITEM_PRICE ? placeholders.orderPriceFree ?? 'Free' : await formatPrice(order.order_currency_code, itemQuantity * item.price_incl_tax);

    total.appendChild(totalPrice);

    // Select reason for return
    const returnReasons = document.createElement('div');
    returnReasons.classList.add('return-reasons-column', 'return-config-column', 'hidden');
    returnReasons.setAttribute('id', `return-reasons-column-${item.item_id}`);

    const reasonTitle = document.createElement('h6');
    reasonTitle.classList.add('text-dark');
    reasonTitle.innerText = placeholders.orderReasonForReturn || 'Reason for Return';

    const returnReasonOptions = document.createElement('select');
    returnReasonOptions.classList.add('return-reasons-options', `return-reasons-options-${item.item_id}`);
    returnReasonOptions.setAttribute('id', `return-reasons-options-${item.item_id}`);
    returnReasonOptions.setAttribute('data-item-id', item.item_id);
    const defaultReasonOption = document.createElement('option');
    defaultReasonOption.setAttribute('value', '');
    defaultReasonOption.innerText = placeholders.ordersChooseAReason || 'Choose a reason';
    returnReasonOptions.appendChild(defaultReasonOption);
    if (returnsConfig?.return_reasons?.length) {
      returnsConfig.return_reasons.forEach((reason) => {
        const option = document.createElement('option');
        option.setAttribute('value', reason.id);
        option.innerText = reason?.label || '';
        returnReasonOptions.appendChild(option);
      });
    }

    returnReasonOptions.addEventListener('change', returnReasonSelectHandler);

    returnReasons.appendChild(reasonTitle);
    returnReasons.appendChild(returnReasonOptions);

    // Select quantity
    const returnQuantity = document.createElement('div');
    returnQuantity.classList.add('return-quantity-column', 'return-config-column', 'hidden');
    returnQuantity.setAttribute('id', `return-quantity-column-${item.item_id}`);

    const returnQuantityTitle = document.createElement('h6');
    returnQuantityTitle.classList.add('text-dark');
    returnQuantityTitle.innerText = placeholders.ordersSelectQuantity || 'Select quantity';

    const returnQuantityOptions = document.createElement('select');
    returnQuantityOptions.classList.add('return-quantity-options', `return-quantity-options-${item.item_id}`);
    returnQuantityOptions.setAttribute('id', `return-quantity-options-${item.item_id}`);
    returnQuantityOptions.setAttribute('data-item-id', item.item_id);

    Array.from({ length: item?.qty_ordered || 1 }).forEach((_, qty) => {
      const quantityOption = document.createElement('option');
      quantityOption.setAttribute('value', qty + 1);
      quantityOption.innerText = qty + 1;
      returnQuantityOptions.appendChild(quantityOption);
    });

    returnQuantityOptions.addEventListener('change', returnQuantitySelectHandler);

    returnQuantity.appendChild(returnQuantityTitle);
    returnQuantity.appendChild(returnQuantityOptions);

    itemRow.appendChild(orderItemCheckbox);
    itemRow.appendChild(orderItemImage);
    itemRow.appendChild(productInfo);
    itemRow.appendChild(unitInfo);
    itemRow.appendChild(total);
    itemRow.appendChild(returnReasons);
    itemRow.appendChild(returnQuantity);

    itemsList.appendChild(itemRow);
  });

  return itemsList;
};

const renderItemsToReturn = async (block, order, returnsConfig, placeholders) => {
  const collapseTitle = `1. ${placeholders?.orderSelectItemsToReturnTitle || 'Select items to return'}`;
  const isClosed = false;
  const isDisabled = false;

  const returnItemsContent = document.createElement('div');
  returnItemsContent.classList.add('return-items-wrapper', 'order-itemized-wrapper');

  const returnEligibleItems = getReturnEligibleItems(order);
  if (!returnEligibleItems?.length) {
    return;
  }

  const productData = await fetchProductDataForOrders({ items: [order] });

  const returnItemsList = await buildOrderReturnList(
    order,
    returnEligibleItems,
    productData,
    returnsConfig,
    placeholders,
  );
  if (returnItemsList) {
    returnItemsContent.appendChild(returnItemsList);
  }

  const returnContentFooter = document.createElement('div');
  returnContentFooter.classList.add('return-content-footer');
  const btnContinue = document.createElement('button');
  btnContinue.classList.add('btn-return-content-footer');
  btnContinue.setAttribute('id', 'btn-return-content-footer');
  btnContinue.setAttribute('disabled', true);
  btnContinue.innerText = placeholders?.orderReturnSelectItemContinue || 'Continue';
  btnContinue.addEventListener('click', () => {
    itemsToReturnContinueHandler(order);
    document.getElementById('item-to-return-collapse-head').scrollIntoView({
      behavior: 'smooth',
    });
  });
  returnContentFooter.appendChild(btnContinue);

  returnItemsContent.appendChild(returnContentFooter);

  renderCollapsibleItems(block, collapseTitle, returnItemsContent, isClosed, isDisabled, 'item-to-return');
};

const renderReturnAndRefunds = async (block, order, placeholders) => {
  const collapseTitle = `2. ${placeholders?.orderReturnAndRefundTitle || 'Return and refund details'}`;
  const isClosed = true;
  const isDisabled = true;

  const returnItemsContent = document.createElement('div');
  returnItemsContent.classList.add('return-and-refund-wrapper', 'order-itemized-wrapper');

  const refundSection = document.createElement('div');
  refundSection.classList.add('return-refund-section');

  const refundMethodDetails = await renderRefundMethodDetails(order, placeholders);
  if (refundMethodDetails) {
    refundSection.appendChild(refundMethodDetails);
  }

  const refundAmountDetails = renderRefundAmountDetails(placeholders);
  if (refundAmountDetails) {
    refundSection.appendChild(refundAmountDetails);
  }

  const pickupSection = document.createElement('div');
  pickupSection.classList.add('return-pickup-section');

  const pickupDetails = renderRefundPickupDetails(placeholders);
  if (pickupDetails) {
    pickupSection.appendChild(pickupDetails);
  }

  const pickupAddress = await renderRefundPickupAddress(order, placeholders);
  if (pickupAddress) {
    pickupSection.appendChild(pickupAddress);
  }

  returnItemsContent.appendChild(refundSection);
  returnItemsContent.appendChild(pickupSection);

  const returnContentFooter = document.createElement('div');
  returnContentFooter.classList.add('return-content-footer');
  const btnConfirmRefund = document.createElement('button');
  btnConfirmRefund.classList.add('btn-return-content-footer', 'btn-confirm-refund');
  btnConfirmRefund.setAttribute('id', 'btn-confirm-refund');
  btnConfirmRefund.innerText = placeholders?.orderReturnConfirmRefund || 'Confirm your refund';
  returnContentFooter.appendChild(btnConfirmRefund);

  btnConfirmRefund.addEventListener('click', () => confirmRefundButtonHandler(order));

  returnItemsContent.appendChild(returnContentFooter);

  renderCollapsibleItems(block, collapseTitle, returnItemsContent, isClosed, isDisabled, 'return-refund');
};

export const renderReturnFooter = (order, footerBottom, placeholders) => {
  const lang = document.documentElement.lang || 'en';

  const footerWrapper = document.createElement('div');
  footerWrapper.classList.add('return-footer-wrapper');

  const footerTop = document.createElement('div');
  footerTop?.classList.add('order-return-footer-top');

  const footerTopTitle = document.createElement('div');
  footerTopTitle.innerText = placeholders?.orderDontWantToReturn || 'Don\'t want to return?';
  footerTop.appendChild(footerTopTitle);

  const orderDetailsLink = document.createElement('a');
  orderDetailsLink.setAttribute('href', `/${lang}/user/account/orders/details?orderId=${order?.entity_id}`);
  orderDetailsLink.innerText = placeholders?.orderGoBackToOrderDetails || 'Go back to order details';
  footerTop.appendChild(orderDetailsLink);

  footerWrapper.appendChild(footerTop);

  if (footerBottom) {
    footerBottom.classList.add('order-return-footer-bottom');
    const footerBottomLinks = footerBottom.querySelectorAll('a');
    footerBottomLinks.forEach((link) => {
      link.setAttribute('target', '_self');
    });

    footerWrapper.appendChild(footerBottom);
  }

  return footerWrapper;
};

const registerEvents = () => {
  // Select items to return section head click handler
  const itemToReturnCollapseHead = document.getElementById('item-to-return-collapse-head');
  const returnRefundSection = document.getElementById('return-refund-collapse-wrapper');

  if (!itemToReturnCollapseHead) {
    return;
  }

  itemToReturnCollapseHead.addEventListener('click', () => {
    if (!returnRefundSection) {
      return;
    }

    returnRefundSection.classList.add('is-closed');
    returnRefundSection.classList.add('is-disabled');
  });
};

const renderOrderReturns = async (block, orderId, placeholders, locale) => {
  const rmaData = await getRMAsByOrderId(orderId);
  const returnRequested = await isReturnRequested(rmaData);

  // If the return is already requested for an order,
  // redirect back to order details page.
  if (returnRequested) {
    const lang = document.documentElement.lang || 'en';

    window.location.href = `/${lang}/user/account/orders/details?orderId=${orderId}`;

    return;
  }

  const [footerBottom] = block.querySelectorAll(':scope > div');

  const order = await getOrder(orderId);
  block.innerHTML = '';
  block.classList.add('account-orders');

  renderReturnLoader(block);

  // Initialize the RMA Data object to be sent for the return request
  initRmaDataObject(order);

  const returnsConfig = await getOrderReturnsConfig();

  await createReturnPromotionModal(returnsConfig, placeholders);
  await createInelligibleReturnModal(placeholders);

  // Renders the order summary panel
  const orderSummaryPanel = await renderOrderSummaryPanel(order, placeholders, locale, true);
  if (orderSummaryPanel) {
    block.appendChild(orderSummaryPanel);
  }

  await renderItemsToReturn(block, order, returnsConfig, placeholders, locale);

  await renderReturnAndRefunds(block, order, placeholders, locale);

  const returnFooter = renderReturnFooter(order, footerBottom, placeholders);
  if (returnFooter) {
    block.appendChild(returnFooter);
  }

  registerEvents();

  window.onbeforeunload = function () {
    return placeholders?.orderReturnLeavePageMsg || 'Changes that you made may not be saved.';
  };

  // Hides the loader
  toggleGlobalLoader(false);
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

  await renderOrderReturns(block, orderId, placeholders, locale);
}
