import {
  resetMessageForm, showPageErrorMessage, showPageSuccessMessage, validatePhone,
} from './forms.js';
import { loadFragment, fireTargetCall, logout } from './scripts.js';
import { targetOrderConfirmationLoadData } from './target-events.js';
import { showAddressForm } from '../blocks/account-address-book/account-address-book.js';
import {
  datalayerViewCartEvent, datalayerRemoveFromCartEvent,
  dataLayerCartErrorsEvent, dataLayerPromoCodeEvent,
  datalayerBeginCheckoutEvent,
  datalayerAddShippingInfo,
  dataLayerDeliveryOption,
  dataLayerPlaceOrderButtonClick,
  dataLayerSaveAddressEvent,
  dataLayerCustomerExistCheckoutErrors,
  dataLayerCheckoutErrors,
  datalayerConfirmationPageViewEvent,
  datalayerAddPaymentInfo,
  datalayerCodOtpVerification,
  datalayerPaymentErrors,
  datalayerLoyaltySwitchEvent,
} from './analytics/google-data-layer.js';
import { getConfigValue } from './configs.js';

window.addEventListener('react:loadFragment', async (event) => {
  const fragment = await loadFragment(event.detail.path);
  if (fragment) {
    document.querySelector(event.detail.targetSelector)?.appendChild(fragment);
  }
});

window.addEventListener('react:showPageErrorMessage', (eve) => {
  showPageErrorMessage(eve.detail.message, '');
});

window.addEventListener('react:showPageSuccessMessage', (eve) => {
  showPageSuccessMessage(eve.detail.message, '');
});

window.addEventListener('react:resetPageMessage', () => {
  resetMessageForm();
});

window.addEventListener('react:loadAddressForm', async (event) => {
  const {
    // eslint-disable-next-line max-len
    targetSelector, placeholder, newCustomer, isCheckoutPage, address, isLoggedIn, config, updateOnlyTelephone, infoMessage,
  } = event.detail;
  const updatedAddress = Object.keys(address).length === 0
    ? address
    : { ...address, address: address?.custom_attributes?.find((attribute) => attribute.attribute_code === 'address')?.value };
  showAddressForm(
    targetSelector,
    placeholder,
    updatedAddress,
    newCustomer,
    isCheckoutPage,
    isLoggedIn,
    config,
    updateOnlyTelephone,
    infoMessage,
  );
});

window.addEventListener('react:datalayerViewCartEvent', (event) => {
  datalayerViewCartEvent(event.detail);
});

window.addEventListener('react:datalayerRemoveFromCartEvent', (event) => {
  datalayerRemoveFromCartEvent(event.detail);
});

window.addEventListener('react:dataLayerCartErrorsEvent', (event) => {
  dataLayerCartErrorsEvent(event.detail);
});

window.addEventListener('react:dataLayerPromoCodeEvent', (event) => {
  dataLayerPromoCodeEvent(event.detail);
});

window.addEventListener('react:datalayerEvent', (event) => {
  switch (event?.detail?.type) {
    case 'beginCheckoutEvent':
      datalayerBeginCheckoutEvent(event.detail?.payload);
      break;
    case 'add_shipping_info':
      datalayerAddShippingInfo(event?.detail?.payload);
      break;
    case 'deliveryOption':
      dataLayerDeliveryOption(event?.detail?.payload);
      break;
    case 'placeOrderButtonClick':
      dataLayerPlaceOrderButtonClick(event?.detail?.payload);
      break;
    case 'saveAddressOnCheckoutPage':
      dataLayerSaveAddressEvent(event?.detail?.payload);
      break;
    case 'customerExistError':
      dataLayerCustomerExistCheckoutErrors(event?.detail?.payload);
      break;
    case 'checkoutErrors':
      dataLayerCheckoutErrors(event?.detail?.payload);
      break;
    case 'PurchaseView':
      datalayerConfirmationPageViewEvent(event.detail.payload);
      break;
    case 'addPaymentInfo':
      datalayerAddPaymentInfo(event.detail.payload);
      break;
    case 'codOtpVerification':
      datalayerCodOtpVerification(event.detail.payload);
      break;
    case 'paymentErrors':
      datalayerPaymentErrors(event.detail.payload);
      break;
    case 'loyaltySwitch':
      datalayerLoyaltySwitchEvent(event.detail.payload);
      break;
    default:
      console.warn(`Unhandled event type: ${event?.type}`);
  }
});

window.addEventListener('react:validateMobileNumber', async (event) => {
  const countryCode = await getConfigValue('country-code');
  const isValidPhoneNumber = await validatePhone(event.detail.mobile, countryCode);
  window.dispatchEvent(new CustomEvent('react:validateMobileNumberResult', { detail: { mobile: !isValidPhoneNumber } }));
});

window.addEventListener('react:fireTargetCall', async (event) => {
  const payload = event.detail;
  const { data, xdm = {} } = await targetOrderConfirmationLoadData(payload);
  fireTargetCall(data, [], true, xdm);
});

window.addEventListener('react:logout', async (event) => {
  const { redirectUrl } = event.detail;
  logout(redirectUrl);
});

window.dispatchEvent(new CustomEvent('reactBridgeLoaded'));
