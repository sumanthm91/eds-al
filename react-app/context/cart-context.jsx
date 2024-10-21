import React, { createContext, useEffect, useState } from 'react';
import { getSignInToken } from '../../scripts/commerce.js';
import { getLocalStorageByKey } from '../utils/local-storage-util.js';
import { getConfigValue } from '../../scripts/configs.js';
import AppConstants from '../utils/app.constants.js';
import { getCustomerLastOrder } from '../../scripts/customer/api.js';
import updateCart from '../api/updateCart.js';
import estimateShippingMethods from '../api/estimateShippingMethods.js';

export const INIT_PLACEHOLDERS = {
  moveToFav: 'Move to favorites',
  promoBtn: 'Done',
  productArtNo: 'Art. no.',
  productColorLabel: 'Color label',
  productSize: 'Size',
  excludingDelivery: 'Excluding delivery',
  deleteSuccess: 'The product has been removed from your basket',
  inclusiveVat: 'Inclusive of VAT',
  deleteitempopupmessage: 'Do you want to move this item to favorites?',
  itemmovetofavtext: 'Yes, Move to favorites',
  itemremovetext: 'No, remove it',
  emptyCartMessage: 'Your shopping bag is empty',
  emptyCartFavMessage: 'Here are some of our favorites',
  productPriceSaveLabel: 'save',
  orderSummaryTitle: 'Order Summary',
  subTotalLabel: 'Subtotal',
  discountsLabel: 'Discounts',
  orderTotalLabel: 'Order Total',
  bagUpdatedSuccessLabel: 'Your bag has been updated successfully',
  quantityNotAvailableLabel: 'The requested quantity is not available',
  deliveryMethodTitle: 'Delivery method',
  homeDelivery: 'Home Delivery',
  clickCollect: 'Click & Collect',
  bagLabel: 'Bag',
  signInLabel: 'Sign In',
  deliveryPaymentLabel: 'Delivery & Payment',
  confirmationLabel: 'Confirmation',
  promotionLabel: 'Do you have a Promotional Code?',
  promotionInputPlaceholder: 'Promo code',
  promotionApplyButtonLabel: 'Apply',
  promotionAppliedButtonLabel: 'Applied',
  promotionRequiredValidationErrorMessage: 'Please enter a promotional code',
  promotionDiscountAndVouchersLabel: 'Discounts & Vouchers',
  promotionInvalidCodeMessage: 'Sorry, this code is invalid. Please enter a valid promotional code.',
  discountLabel: 'Discount',
  bonusVouchers: 'Bonus Vouchers',
  memberOffers: 'Member Offers',
  clearAllText: 'CLEAR ALL',
  applyOffersText: 'APPLY OFFERS',
  applyVouchersText: 'APPLY VOUCHERS',
  checkoutAsGuest: 'Checkout as a Guest',
  backToBasket: 'Back to basket',
  sepratorOrLabel: 'OR',
  signInEmail: 'sign in with email address',
  signInSocial: 'sign in with social media',
  checkoutBtn: 'Continue to Checkout',
  outOfStockContent: 'This product is out of stock',
  outOfStockToast: 'Sorry, one or more products in your bag are no longer available. Please review your bag in order to checkout securely.',
  shippingMethodFreeLabel: 'FREE',
  changeDeliveryAddressCta: 'Change',
  confirmationSentTo: 'Confirmation sent to:',
  orderNumber: 'Order Number:',
  transacioId: 'Transaction ID:',
  paymentId: 'Payment ID:',
  resultCode: 'Result Code:',
  orderDetail: 'Order Detail',
  deliveryTo: 'Delivery to:',
  billingAddress: 'Billing Address:',
  mobileNumber: 'Mobile Number:',
  paymentMethod: 'Payment Method:',
  deliveryType: 'Delivery Type:',
  expecteDeliveryWithin: 'Expected Delivery Within:',
  numberOfItems: 'Number of Items:',
  auraPointsEarned: 'Aura Points Earned:',
  homeDeliveryTitle: 'Free delivery on all orders above QAR 199.',
  clickCollectTitle: 'Order now & collect from store of your choice',
  clickCollectDisabled: 'Collect your order in-store is unavailable',
  deliveryInformationTitle: 'Delivery Information',
  deliveryInformationBtnText: 'Please add your contact details and address →',
  deliveryInformationModalTitle: 'Delivery Information',
  collectionStoreTitle: 'Collection Store..',
  collectionStoreBtnText: 'Select your preferred collection store..',
  styleText: 'Style',
  sendToText: 'Send to',
  customMessageEgift: 'Message',
  egiftcardtext: 'eGift Card',
  egiftGetcode: 'Get Code',
  egiftCardInputTitle: 'eGift Card Number',
  cashOnDeliveryLabel: 'Cash on delivery service charge',
  egiftCardInputPlaceholder: 'Enter verification code',
  discountTooltipMessageApplied: 'Discount applied',
  discountTooltipMessageMemberDiscount: 'Member Discount',
  discountTooltipMessageAdvantageCardDiscount: 'Advantage Card Discount',
  memberOffersApplied: 'Member offers applied',
  bonusVouchersApplied: 'Bonus voucher applied',
  bonusVouchersExpiresOn: 'Expires on',
  bonusVoucherAppliedLabel: 'voucher applied',
  paymentMethodsTitle: 'Payment Methods',
  availableinstorewithin: 'Available Instore Within:',
  collectionBy: 'Collection by.',
  freeGiftLabel: 'Free Gift with Purchase',
  completePurchaseButton: 'Complete Purchase',
  completePurchaseCheckbox: 'Be the first to hear about our latest offers and promotions via email and sms.',
  invalidCvvText: 'Invalid security code (CVV)',
  requiredCvvText: 'Please enter your CVV.',
  inValidCardNumberText: 'Invalid Debit / Credit Card number',
  requiredCardNumberText: 'Please enter your card number.',
  requiredExpiryText: 'Please enter your Expiry.',
  incorrectExpiryText: 'Incorrect credit card expiration date',
  mapCollectionStore: 'Collection Store...',
  mapCollectionDetails: 'Collection details',
  mapLocationAccessDenied: 'Test Message...Access to your location access has been denied by your browser. You can reenable location services in your browser settings',
  mapOutsideCountryErrorTitle: 'You are browsing outside Kuwait..',
  mapOutsideCountryErrorSubtext: 'Test We currently don’t offer delivery outside Kuwait. Please enter an address within Kuwait below to proceed.Please select a store with in country Qatar below to continue',
  mapDismissBtn: 'Dismiss..',
  mapFindNearestStore: 'Find Your Nearest Store..',
  mapExampleDoha: 'eg. Doha Test',
  mapListView: 'List view',
  mapMapView: 'Map view',
  mapMiles: 'miles',
  mapContinueBtn: 'CONTINUE..',
  mapSelectStoreBtn: 'SELECT THIS STORE..',
  mapCollectFromStore: 'Collect in store from',
  mapSelectedStore: 'Selected Store..',
  mapContactInfo: 'Contact Information..',
  mapInTouchText: 'We will send you a text message once your order is ready for collection...',
  mapEnterFullname: 'Please enter your full name...',
  mapMobileNumber: 'Mobile Number..',
  mapValidNumber: 'Please enter valid mobile number...',
  mapChangeBtn: 'Change...',
  mapCollectionBy: 'Collection by...',
  mapEditBtn: 'Edit..',
  mapFullName: 'Full Name..',
  mapEmailError: 'Please enter valid email.',
  mapNoLocation: 'Sorry, No store found for your location.',
  mapEmail: 'Email',
  saveCardText: 'Save this card for faster payment next time you shop. (CVV number will not be saved)',
  cardNumberText: 'Card Number',
  expiryText: 'Expiry',
  cvvText: 'CVV',
  changeText: 'Change',
  paymentModalTitle: 'Change payment card',
  addNewCardBtnTitle: 'Add new card',
  selectedText: 'Selected',
  selectText: 'Select',
  amountpaid: 'Amount Paid',
  auraPointsRedeemed: 'Aura points redeemed:',
  collectionStore: 'Collection Store',
  earnedAurapointTooltipText: 'Your points will be credited to your Aura account. You will be able to redeem these a day after your order is delivered.',
  paidbyaurapoints: 'Paid With Aura',
  egiftCardAmountText: 'Applied card amount -',
  egiftCardBalanceText: 'Remaining Balance -',
  changeAddressModalTitle: 'Change Address',
  addNewAddress: 'Add New Address',
  addressSelectButton: 'Select',
  addressSelectedButton: 'Selected',
  transactionId: 'Transaction ID:',
  orderSuccessfullyReceived: 'Order successfully received',
  egiftAmountText: 'Amount',
  egictCardNoOtpText: "Didn't receive?",
  egiftCardResendOtp: 'Resend Code',
  egiftCardChangeCard: 'Change Card?',
  egiftCardRemove: 'Remove',
  egiftCardVerify: 'Verify',
  egiftCardEditAmount: 'Edit amount to use',
  egiftCardPopupButton: 'Edit Amount',
  deliveryLabel: 'Delivery',
  paidWithAuraLabel: 'Paid with Aura',
  balancePaymentLabel: 'Balance Payment',
  billingAddressTitle: 'Billing Address',
  getdirections: 'Get Directions',
  emailExist: 'You already have an account. Please log in.',
  exponeaQuestion: 'How would you rate your shopping experience?',
  billingInformationModalTitle: 'Billing Information',
  loyaltyTitle: 'Loyalty',
  enterAuraDetails: 'Enter Aura details',
  enterAuraDetailsToolTip: 'Add your mobile number, Aura account number or email address below to link this purchase.',
  auraMobileLabel: 'Mobile Number',
  auraAccountNumberLabel: 'Aura account number',
  auraEmailLabel: 'Email address',
  codSurchargeText: 'Additional {{SURCHARGE}} Service Charge',
  codEnterOtpTitle: 'Enter the 4-digit OTP code sent to {{TELEPHONE}}',
  codChangeTelephoneCta: 'Change',
  codEditTelephoneCta: 'Edit',
  codResendOtpCta: 'Resend',
  codResendOtpText: "Didn't receive the code?",
  codVerifyOtpCta: 'Verify',
  codVerifiedText: 'Verified',
  codOtpResendTimeInSeconds: '60',
  globalKey: 'global-txt',
  codMobileUpdateInfoText: 'Please update mobile number',
  codErrorWrongOtp: 'Wrong OTP',
  globalDefaultErrorMessage: 'Sorry, something went wrong and we are unable to process your request right now. Please try again later.',
  transactionFailedText: 'Transaction Failed: Invalid CVV',
  deliveryInformationMissingText: 'Delivery Information is incomplete. Please update and try again.',
  outOfStockErrorText: 'Cart contains some items which are not in stock.',
  loyaltyHelloMemberTooltipText: 'The total points you will earn on this purchase will be displayed on the Order Confirmation page after applying all discounts and taxes.',
  loyaltyHelloMemberDialogTitle: 'Switch to H&M member',
  loyaltyHelloMemberDialogContent: 'This purchase will accumulate points earned towards your H&M Membership',
  loyaltyHelloMemberDialogPrimaryBtnText: 'Earn H&M points',
  loyaltyHelloMemberDialogSecondaryBtnText: 'Continue with Aura Points',
  loyaltyAuraDialogTitle: 'Switch to Aura points',
  loyaltyAuraDialogContent: 'This purchase will accumulate points earned towards your Aura Membership',
  loyaltyAuraDialogPrimaryBtnText: 'Earn Aura points',
  loyaltyAuraDialogSecondaryBtnText: 'Continue with H&M Points',
  freeGiftLabel: 'Free gift with Purchase',
  storeLabel: 'H&M Qatar',
  redeemInputErrorText: 'Redeem amount should be less than or equal to the balance payable.',
  redeemOtpErrorText: 'OTP verification failed. Please enter a valid OTP',
  redeeEgiftInvalidCard: 'enter a valid card number',
  redeemEmptyCardNumberError: 'Please enter an eGift card number.',
  redeemeOtpEmptyError: 'Please enter verification code.',
  amountToPayAfterRedeem: 'Pay {{BALANCEPAY}} using another payment method to complete purchase',
  redeemPayOrderSummary: 'Paid With eGift Card',
  formEgiftAmount: 'Please enter the amount.',
  egiftInsufficientBalance: 'Insufficient balance, Please topup the card or lower the redeem amount.',
  egiftValidAmount: 'Please enter a valid amount',
  redeemEgiftError: 'Redeem amount should be less than or equal to the balance payable',
  redeemEgiftFullError: 'You can only redeem full pending balance or use other payment method.',
  submitText: 'Submit',
  printConfirmationText: 'Print Confirmation',
  egiftCardTo: 'eGift Card To:',
  eGiftCardWillBeSentImmediately: 'eGift card will be sent immediately'

};

const INIT_CART_CONTEXT_VALUES = {
  isLoggedIn: false,
  cart: {
    cartId: null,
    data: {},
    isLoading: false,
    isError: false,
    oosDisable: false,
    isCheckoutFlag: true,
    checkoutDisable: false,
  },
  promotion: {
    isApplyingPromoCode: false,
    isRemovingPromoCode: false,
    errorMessage: '',
    data: {},
  },
  activeProgressStep: 1,
  store: null,
  deliveryInformation: {
    isDialogOpen: false,
    isModalVisible: false,
    isLoadingShippingMethods: false,
    shippingMethods: [],
    changeAddress: '',
    updateOnlyTelephone: false,
    infoMessage: '',
  },
  userAddressList: [],
  editAddress: {},
  selectedCollectionStore: null,
  selectedCollectionStoreForCheckout: null,
  cAndCInfo: null,
  isMapDetailsView: false,
  isCollectionDetails: false,
  methods: [],
  isHideSection: false,
  deliveryFeeLoader: false,
  cardAppliedAmount: null,
  paymentMethodsContinuePurchaseLabels: [],
  fullPaymentByEgift: false,
  reactBridgeLoaded: false
};

/**
 * Cart Context is used to share data between components of the cart
 */
const CartContext = createContext(INIT_CART_CONTEXT_VALUES);

export function CartContextProvider(props) {
  // add the state variables that needs to be shared accross components
  const [cart, setCart] = useState(INIT_CART_CONTEXT_VALUES.cart);
  const [isLoggedIn, setIsLoggedIn] = useState(!!getSignInToken());
  const [reactBridgeLoaded, setReactBridgeLoaded] = useState(INIT_CART_CONTEXT_VALUES.reactBridgeLoaded);
  const [cartId, setCartId] = useState(INIT_CART_CONTEXT_VALUES.cart.cartId);
  const [placeholders, setPlaceholders] = useState(props?.placeholders);
  const [activeProgressStep, setActiveProgressStep] = useState(INIT_CART_CONTEXT_VALUES.activeProgressStep);
  const [priceDecimals, setPriceDecimals] = useState(INIT_CART_CONTEXT_VALUES.store);
  const [cartShowFreeReturns, setCartShowFreeReturns] = useState(INIT_CART_CONTEXT_VALUES.store);
  const [promotion, setPromotion] = useState(INIT_CART_CONTEXT_VALUES.promotion);
  const [deliveryInformation, setDeliveryInformation] = useState(INIT_CART_CONTEXT_VALUES.deliveryInformation);
  const [userAddressList, setUserAddressList] = useState(INIT_CART_CONTEXT_VALUES.deliveryInformation);
  const [oosDisableButton, setOOSDisableButton] = useState(INIT_CART_CONTEXT_VALUES.cart.oosDisable);
  const [isCheckoutFlag, setIsCheckoutFlag] = useState(INIT_CART_CONTEXT_VALUES.cart.isCheckoutFlag);
  const [editAddress, setEditAddress] = useState(INIT_CART_CONTEXT_VALUES.cart.editAddress);
  const [selectedCollectionStore, setSelectedCollectionStore] = useState(INIT_CART_CONTEXT_VALUES.selectedCollectionStore);
  const [selectedCollectionStoreForCheckout, setSelectedCollectionStoreForCheckout] = useState(INIT_CART_CONTEXT_VALUES.selectedCollectionStoreForCheckout);
  const [cAndCInfo, setCAndCInfo] = useState(INIT_CART_CONTEXT_VALUES.cAndCInfo);
  const [isMapDetailsView, setIsMapDetailsView] = useState(INIT_CART_CONTEXT_VALUES.isMapDetailsView);
  const [isCollectionDetails, setIsCollectionDetails] = useState(INIT_CART_CONTEXT_VALUES.isCollectionDetails);
  const [checkoutOOSDisable, setCheckoutOOSDisable] = useState(INIT_CART_CONTEXT_VALUES.cart.checkoutDisable);
  const [isHideSectionInCheckout, setIsHideSectionInCheckout] = useState(INIT_CART_CONTEXT_VALUES.isHideSection);
  const [methods, setMethods] = useState(INIT_CART_CONTEXT_VALUES.methods);
  const [deliveryFeeLoader, setDeliveryFeeLoader] = useState(INIT_CART_CONTEXT_VALUES.deliveryFeeLoader);
  const [isComplePurchaseLoading, setCompletePurchaseLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('home_delivery');
  const [isDisablePayment, setDisablePayment] = useState(false);
  const [isDisablePurchaseBtn, setDisablePurcahseBtn] = useState(false);
  const [salesPoints, setSalesPoints] = useState(0);
  const [cardAppliedAmount, setCardAppliedAmount] = useState(INIT_CART_CONTEXT_VALUES.cardAppliedAmount);
  const [paymentMethodsContinuePurchaseLabels, setPaymentMethodsContinuePurchaseLabels] = useState(INIT_CART_CONTEXT_VALUES.paymentMethodsContinuePurchaseLabels);
  const [fullPaymentByEgift, setFullPaymentByEgift] = useState(INIT_CART_CONTEXT_VALUES.fullPaymentByEgift);
  const outOfStockData = cart?.data?.items?.filter((item) => item?.extensionAttributes?.extension_attributes?.is_egift !== '1' && !item?.extensionAttributes?.extension_attributes?.is_free_gift && item?.extensionAttributes?.extension_attributes?.error_message);
  const maxQuantityCheck = cart?.data?.items?.filter((item) => item?.extensionAttributes?.extension_attributes?.is_egift !== '1' && !item?.extensionAttributes?.extension_attributes?.is_free_gift && item?.isQuantityNotAvailable);
  const onlyEgiftItems = cart?.data?.items?.filter((item) => item?.extensionAttributes?.extension_attributes?.is_egift && item?.extensionAttributes?.extension_attributes?.is_egift === '1');
  const notEgiftItems = cart?.data?.items?.filter((item) => !item?.extensionAttributes?.extension_attributes?.is_egift);
  const [isTopupFlag, setIsTopupFlag] = useState(false)
  const isOnlyTopupItem = cart?.data?.extension_attributes?.cart?.items?.filter((item) => Number(item?.extension_attributes?.is_topup) === 1)
  useEffect(() => {
    window.addEventListener('reactBridgeLoaded', async (event) => {
      setReactBridgeLoaded(true);
    });
  }, [])

  //Checking whether the cart is having topup egift card or not
  useEffect(() => {
    if (isOnlyTopupItem?.length) {
      setIsTopupFlag(true)
    } else {
      setIsTopupFlag(false)
    }
  }, [isOnlyTopupItem, cart])

  useEffect(() => {
    switch (window.location.pathname) {
      case `/${document.documentElement.lang}/cart`:
        setActiveProgressStep(AppConstants.PROGRESS_BAR_STEP_CART);
        break;
      case `/${document.documentElement.lang}/cart/login`:
        if (isLoggedIn) {
          window.location.assign(`/${document.documentElement.lang}/checkout`);
          break;
        }
        if (window.location.search !== `?redirect=/${document.documentElement.lang}/checkout`) {
          window.location.assign(`/${document.documentElement.lang}/cart/login?redirect=/${document.documentElement.lang}/checkout`);
        }
        setActiveProgressStep(AppConstants.PROGRESS_BAR_STEP_LOGIN);
        break;
      case `/${document.documentElement.lang}/checkout`:
        setActiveProgressStep(AppConstants.PROGRESS_BAR_STEP_CHECKOUT);
        break;
      case `/${document.documentElement.lang}/confirmation`:
        setActiveProgressStep(AppConstants.PROGRESS_BAR_STEP_CONFIRMATION);
        break;
      default:
        setActiveProgressStep(AppConstants.PROGRESS_BAR_STEP_CART);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    setPlaceholders(props?.placeholders);
  }, [props?.placeholders]);

  useEffect(() => {
    setIsLoggedIn(!!getSignInToken());
  }, [getSignInToken]);

  /**
   * Set the masked cart id for guest from local storage.
   * Set the masked cart id for logged in customer from the cart
   * object as the local storage does not have masked cart id
   */
  useEffect(() => {
    const storageCartId = getLocalStorageByKey('M2_VENIA_BROWSER_PERSISTENCE__cartId');
    setCartId(storageCartId);
  }, []);

  useEffect(() => {
    const fetchStoreCode = async () => {
      const storeCodeVal = await getConfigValue('cart-price-decimals');
      const cartShowFreeReturn = await getConfigValue('cart-show-free-returns');
      setPriceDecimals(storeCodeVal);
      setCartShowFreeReturns(cartShowFreeReturn === 'true');
    };
    fetchStoreCode();
  }, []);

  useEffect(() => {
    if (outOfStockData?.length > 0 || maxQuantityCheck?.length > 0 || !isCheckoutFlag) {
      setOOSDisableButton(true);
    } else {
      setOOSDisableButton(false);
    }
  }, [cart, oosDisableButton, isCheckoutFlag]);

  useEffect(() => {
    if (onlyEgiftItems?.length > 0) {
      if (notEgiftItems?.length > 0) {
        setIsHideSectionInCheckout(false);
      } else {
        setIsHideSectionInCheckout(true);
      }
    }
  }, [cart, isHideSectionInCheckout, notEgiftItems, onlyEgiftItems]);

  const billingAddressInfo = cart?.data?.extension_attributes?.cart?.billing_address;
  const shippingMethodsInfo = deliveryInformation?.shippingMethods;

  useEffect(() => {
    let isPaymentDisable = false;
    let isPurchaseBtnDisable = false;

    if (!isHideSectionInCheckout) {
      if (selectedMethod === 'home_delivery') {
        isPaymentDisable = !shippingMethodsInfo?.length;
        isPurchaseBtnDisable = isPaymentDisable;
      } else {
        isPaymentDisable = !selectedCollectionStore;
        isPurchaseBtnDisable = isPaymentDisable;
      }

      if (billingAddressInfo?.firstname && shippingMethodsInfo?.length > 0) {
        isPurchaseBtnDisable = false;
      }
    } else {
      isPurchaseBtnDisable = !billingAddressInfo?.firstname;
    }
    // Checking condition : If cart extension attributes is having only topup item.
    if (cart?.data?.extension_attributes?.cart?.items?.length === 1 && cart.data.extension_attributes.cart.items[0]?.extension_attributes?.is_topup === '1') {
      isPaymentDisable = false;
      // Checking condition : Billing address check.
      if (!billingAddressInfo?.firstname) {
        isPurchaseBtnDisable = true;
      } else {
        isPurchaseBtnDisable = false;
      }
    }

    setDisablePayment(isPaymentDisable);
    setDisablePurcahseBtn(isPurchaseBtnDisable);
  }, [deliveryInformation, selectedCollectionStore, selectedMethod, isHideSectionInCheckout, billingAddressInfo]);

  /**
   * Sanitizes the given address object by removing unnecessary fields and converting
   * extension attributes into a custom attributes array.
   *
   * @param {Object} [address={}] - The address object to be sanitized. Defaults to an empty object.
   * @param {string} [address.parent_id] - (Optional) The parent ID of the address, if any. This will be deleted.
   * @param {string} [address.entity_id] - (Optional) The entity ID of the address, if any. This will be deleted.
   * @param {Object} [address.extension_attributes] - (Optional) An object containing extension attributes, if any.
   * 
   * @returns {Object} The sanitized address object with the following changes:
   *  - `parent_id` and `entity_id` are removed.
   *  - `extension_attributes` are converted into a `custom_attributes` array with `attribute_code` and `value` properties.
   *  - The `extension_attributes` field is removed from the result.
   */
  const sanitizeAddress = (address = {}) => {
    const sanitizedAddress = { ...address };

    // Remove unnecessary fields
    delete sanitizedAddress?.parent_id;
    delete sanitizedAddress?.entity_id;

    // Convert extension_attributes into custom_attributes array
    if (sanitizedAddress?.extension_attributes) {
      sanitizedAddress.custom_attributes = Object.keys(sanitizedAddress?.extension_attributes).map(key => ({
        attribute_code: key,
        value: sanitizedAddress.extension_attributes[key],
      }));
      delete sanitizedAddress.extension_attributes;
    }

    return sanitizedAddress;
  };

  /**
   * Updates the shipping address in the cart with the provided shipping details.
   *
   * @param {Object} shippingDetails - The shipping details from the customer's last order or default address.
   * @param {string} cartId - The current cart ID.
   * @param {boolean} isLoggedIn - The user's logged-in status.
   * @returns {Promise<Object>} - A promise that resolves to the updated shipping assignments in the cart.
   */
  const updateShippingAddress = async (shippingDetails, cartId, isLoggedIn) => {
    const { address, carrier_code, method_code, store_code, click_and_collect_type } = shippingDetails;

    const payload = {
      shipping: {
        shipping_address: address,
        shipping_carrier_code: carrier_code,
        shipping_method_code: method_code,
        ...(store_code && {
          extension_attributes: {
            store_code,
            click_and_collect_type,
          },
        }),
      },
      extension: { action: 'update shipping' },
    };

    // Call API to update the cart with the new shipping address
    const updatedCartData = await updateCart(payload, cartId, isLoggedIn);
    return updatedCartData?.cart?.extension_attributes?.shipping_assignments || '';
  };

  /**
   * Updates the billing address in the cart with the provided billing details.
   *
   * @param {Object} billingAddress - The billing address details from the customer's last order.
   * @param {string} cartId - The current cart ID.
   * @param {boolean} isLoggedIn - The user's logged-in status.
   * @returns {Promise<Object>} - A promise that resolves to the updated billing address in the cart.
   */
  const updateBillingAddress = async (billingAddress, cartId, isLoggedIn) => {
    const payload = {
      billing: billingAddress,
      extension: { action: 'update billing' },
    };

    // Call API to update the cart with the new billing address
    const updatedCartData = await updateCart(payload, cartId, isLoggedIn);
    return updatedCartData?.cart?.billing_address || '';
  };

  /**
   * Retrieves the default address from the list based on the specified type (shipping or billing).
   * If no default is found, it returns the first address in the list.
   *
   * @param {Array} userAddressList - List of user addresses.
   * @param {string} type - Type of address to retrieve ('shipping' or 'billing').
   * @returns {Object} - The default or first address, sanitized by applyDefaultAddress.
   */
  const getDefaultAddress = (userAddressList, type) => {
    const defaultAddress = userAddressList.find((address) => address[`default_${type}`] === true) || userAddressList[0];
    // Remove unnecessary fields from the default address
    delete defaultAddress?.customer_id;
    delete defaultAddress?.default_billing;
    delete defaultAddress?.default_shipping;
    delete defaultAddress?.region;
    delete defaultAddress?.region_id;
    delete defaultAddress?.id;
    return defaultAddress;
  };

  useEffect(() => {
    if (!isTopupFlag) {
      (async function () {
        if (window.location.href.includes('/checkout')) {
          const { id, extension_attributes } = cart?.data || {};
          const shipping = extension_attributes?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping;
          const { firstname, lastname } = shipping?.address || {};

          if (isLoggedIn && !firstname && id) {
            const customerLastOrder = await getCustomerLastOrder();
            if (customerLastOrder) {
              const { address, method, extension_attributes } = customerLastOrder?.extension_attributes?.shipping_assignments?.[0]?.shipping;
              // Update shipping address if available from last order by checking the firstname
              if (address?.firstname && method) {
                let carrier_code = null, method_code = null;
                let availableShippingMethods = [];
                const isClickAndCollect = (method === `${AppConstants.SHIPPING_METHODS.CLICK_AND_COLLECT}_${AppConstants.SHIPPING_METHODS.CLICK_AND_COLLECT}`);

                if (isClickAndCollect) {
                  carrier_code = AppConstants.SHIPPING_METHODS.CLICK_AND_COLLECT;
                  method_code = AppConstants.SHIPPING_METHODS.CLICK_AND_COLLECT;
                }
                else if (method.indexOf(AppConstants.SHIPPING_METHODS.ALSHAYA_DELIVERY) !== -1) {
                  carrier_code = AppConstants.SHIPPING_METHODS.ALSHAYA_DELIVERY;
                  method_code = method.split(`${AppConstants.SHIPPING_METHODS.ALSHAYA_DELIVERY}_`)[1];
                  const estimateShippingPayload = {
                    address: sanitizeAddress(address)
                  }

                  const shippingMethods = await estimateShippingMethods(estimateShippingPayload, cartId, isLoggedIn);
                  if (shippingMethods?.length) {
                    availableShippingMethods = shippingMethods.filter((shippingMethod) => shippingMethod?.available && shippingMethod?.carrier_code === carrier_code && shippingMethod?.method_code === method_code);
                  }
                }

                if (carrier_code && method_code) {
                  const shippingDetails = {
                    address: sanitizeAddress(address),
                    carrier_code,
                    method_code,
                    ...(isClickAndCollect && {
                      store_code: extension_attributes?.store_code,
                      click_and_collect_type: extension_attributes?.click_and_collect_type
                    })
                  }

                  if (availableShippingMethods?.length || isClickAndCollect) {
                    const updatedShippingAssignments = await updateShippingAddress(shippingDetails, cartId, isLoggedIn);
                    setCart(prevCart => ({
                      ...prevCart,
                      data: {
                        ...prevCart.data,
                        extension_attributes: {
                          ...prevCart.data.extension_attributes,
                          cart: {
                            ...prevCart.data.extension_attributes.cart,
                            extension_attributes: {
                              ...prevCart.data.extension_attributes.cart.extension_attributes,
                              shipping_assignments: updatedShippingAssignments,
                            },
                          },
                        },
                      },
                    }));
                  }
                }
              }

              // Update billing address if available from last order
              if (customerLastOrder?.billing_address) {
                const updatedBillingAddress = await updateBillingAddress(customerLastOrder.billing_address, cartId, isLoggedIn);
                setCart(prevCart => ({
                  ...prevCart,
                  data: {
                    ...prevCart.data,
                    extension_attributes: {
                      ...prevCart.data.extension_attributes,
                      cart: {
                        ...prevCart.data.extension_attributes.cart,
                        billing_address: updatedBillingAddress,
                      },
                    },
                  },
                }));
              }
            }
            else if (!firstname && !lastname && userAddressList?.length) {
              const shippingAddress = getDefaultAddress(userAddressList, 'shipping');
              const billingAddress = getDefaultAddress(userAddressList, 'billing');

              if (Object.keys(shippingAddress).length) {
                const estimateShippingPayload = {
                  address: sanitizeAddress(shippingAddress)
                }
                const shippingMethods = await estimateShippingMethods(estimateShippingPayload, cartId, isLoggedIn);

                if (shippingMethods?.[0]) {
                  const firstShippingMethod = shippingMethods?.[0];

                  if (firstShippingMethod?.carrier_code && firstShippingMethod?.method_code) {
                    const shippingDetails = {
                      address: sanitizeAddress(shippingAddress),
                      carrier_code: firstShippingMethod?.carrier_code,
                      method_code: firstShippingMethod?.method_code
                    }
                    const updatedShippingAssignments = await updateShippingAddress(shippingDetails, cartId, isLoggedIn);
                    setCart(prevCart => ({
                      ...prevCart,
                      data: {
                        ...prevCart.data,
                        extension_attributes: {
                          ...prevCart.data.extension_attributes,
                          cart: {
                            ...prevCart.data.extension_attributes.cart,
                            extension_attributes: {
                              ...prevCart.data.extension_attributes.cart.extension_attributes,
                              shipping_assignments: updatedShippingAssignments,
                            },
                          },
                        },
                      },
                    }));
                  }
                }
              }

              if (Object.keys(billingAddress).length) {
                const updatedBillingAddress = await updateBillingAddress(billingAddress, cartId, isLoggedIn);
                setCart(prevCart => ({
                  ...prevCart,
                  data: {
                    ...prevCart.data,
                    extension_attributes: {
                      ...prevCart.data.extension_attributes,
                      cart: {
                        ...prevCart.data.extension_attributes.cart,
                        billing_address: updatedBillingAddress,
                      },
                    },
                  },
                }));
              }
            }
          }
        }
      })();
    }
  }, [isLoggedIn, userAddressList, cart, isTopupFlag]);
  
  return (
    // eslint-disable-next-line react/jsx-no-constructed-context-values
    <CartContext.Provider value={{
      isLoggedIn,
      cartId,
      cart,
      setCart,
      placeholders,
      activeProgressStep,
      setActiveProgressStep,
      priceDecimals,
      promotion,
      setPromotion,
      deliveryInformation,
      setDeliveryInformation,
      userAddressList,
      setUserAddressList,
      cartShowFreeReturns,
      oosDisableButton,
      setOOSDisableButton,
      setIsCheckoutFlag,
      isCheckoutFlag,
      editAddress,
      setEditAddress,
      selectedCollectionStore,
      setSelectedCollectionStore,
      selectedCollectionStoreForCheckout,
      setSelectedCollectionStoreForCheckout,
      cAndCInfo,
      setCAndCInfo,
      methods,
      setMethods,
      isMapDetailsView,
      setIsMapDetailsView,
      isCollectionDetails,
      setIsCollectionDetails,
      setCheckoutOOSDisable,
      checkoutOOSDisable,
      isHideSectionInCheckout,
      setDeliveryFeeLoader,
      deliveryFeeLoader,
      isComplePurchaseLoading,
      setCompletePurchaseLoading,
      selectedMethod,
      setSelectedMethod,
      isDisablePayment,
      setDisablePayment,
      isDisablePurchaseBtn,
      setSalesPoints,
      salesPoints,
      cardAppliedAmount,
      setCardAppliedAmount,
      paymentMethodsContinuePurchaseLabels,
      setPaymentMethodsContinuePurchaseLabels,
      fullPaymentByEgift,
      setFullPaymentByEgift,
      reactBridgeLoaded,
      setReactBridgeLoaded,
      isTopupFlag
    }}
    >
      {props?.children}
    </CartContext.Provider>
  );
}

export default CartContext;
