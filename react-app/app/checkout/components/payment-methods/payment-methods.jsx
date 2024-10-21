import React, {
  useEffect, useContext,
  useCallback,
  useState,
} from 'react';
import PaymentMethod from './payment-method/payment-method';
import PaymentMethodEGiftCard from './payment-method/payment-method-egift-card';
import CartContext from '../../../../context/cart-context';
import {
  isApplePayAvailable,
  preparePaymentData,
  isUpapiPaymentMethod,
  isPostpayPaymentMethod,
  getLastOrder,
  validateOrder
} from './utilities/utils.js';
import updateCart from '../../../../api/updateCart.js';
import './payment-methods.css';
import CashOnDelivery from './payment-method/cash-on-delivery/cash-on-delivery';
import AppConstants from '../../../../utils/app.constants';
import CheckoutComUpiContext from '../../../../context/checkoutcomupi-context.jsx';
import CheckoutComUpapi from './checkout-com-upapi/index.jsx';
import placeOrder from '../../../../api/placeOrder';
import { GTM_CONSTANTS } from '../../../cart/constants.js';
import validateCartResponse from './utilities/validation_utils.js';
import { getTopupEgiftCardId, hasValue } from '../../../../utils/base-utils.js';
import validateBeforePaymentFinalise from './utilities/validateBeforePaymentFinalize.js';
import getSubCartGraphql from '../../../../api/getSubCartGraphql.js';
import ApiConstants from '../../../../api/api.constants.js';
import DefaultPayment from './default-payment/default-payment.jsx';
import Loader from '../../../../shared/loader/loader.jsx';
import RedeemEgiftCard from '../redeem-egift-card/redeem-egift-card.jsx';
import Loyalty from '../loyalty/loyalty.jsx';
import { getConfigValue, getLanguageAttr } from '../../../../../scripts/configs.js';
import CheckoutComUpiApplePay from './checkout-com-upi-apple-pay';
import { removeCartInfoFromLocal } from '../../../../utils/local-storage-util.js';

function PaymentMethods({ paymentMethods, paymentRef, paymentLogoList, blockContent }) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState();
  const [paymentCallbackSuccess, setPaymentCallbackSuccess] = useState();
  const [paymentCallbackError, setPaymentCallbackError] = useState();
  const [confirmationURI, setConfirmationURI] = useState();
  const {
    cart, setCart, cartId, placeholders, isLoggedIn, methods, setMethods, setCompletePurchaseLoading, isDisablePayment, selectedMethod, deliveryInformation, setPaymentMethodsContinuePurchaseLabels, fullPaymentByEgift, isHideSectionInCheckout, isTopupFlag
  } = useContext(CartContext);
  const {
    checkoutComUpiConfig, isConfigLoaded
  } = useContext(CheckoutComUpiContext);

  const updateCartApi = async (methodCode) => {
    const shippingDetails = cart.data.extension_attributes?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping;
    if (shippingDetails?.method && shippingDetails?.address?.firstname) {
      const mCode = fullPaymentByEgift ? AppConstants.hps_payment_method : methodCode;
      const paymentData = {
        payment: {
          method: mCode,
          additional_data: {},
        },
      };
      const paymentInfo = preparePaymentData(paymentData, paymentCallbackSuccess, paymentCallbackError);
      const result = await updateCart(paymentInfo, cart.data.id, isLoggedIn, true);
      if (result?.status !== 200 && result?.message) { // response will have a error message
        showErrorMessage(result.message);
      } else if (result?.success) {
        setSelectedPaymentMethod(methodCode);
        setCart({
          ...cart,

          data: {
            ...cart?.data,
            selected_payment_method: {
              code: methodCode
            },
            extension_attributes: {
              ...cart.data.extension_attributes,
              cart: {
                ...cart.data.extension_attributes.cart,
                extension_attributes: {
                  ...cart.data.extension_attributes.cart.extension_attributes,
                  surcharge: result.data.cart.extension_attributes.surcharge
                }
              }
            },
          },
        });
      }
    }
  };

  useEffect(() => {
    (async () => {
      const successCallback = await getConfigValue('cart-payment-callback-success-uri');
      const errorCallback = await getConfigValue('cart-payment-callback-error-uri');
      const confirmation = await getConfigValue('cart-confirmation-uri');

      setPaymentCallbackSuccess(successCallback);
      setPaymentCallbackError(errorCallback);
      setConfirmationURI(confirmation);
    })();
  }, []);

  useEffect(() => {
    if (fullPaymentByEgift) {
      const updatedMethods = methods.map((method) => {
        method.isSelected = false;
        return method;
      });
      setMethods(updatedMethods);
    }
  }, [fullPaymentByEgift]);

  const updateDataLayer = (paymentType) => {
    const deliveryOption = deliveryInformation.shippingMethods.find(method => cart.data.extension_attributes?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping?.method?.includes(method.method_code));
    window.dispatchEvent(new CustomEvent(
      'react:datalayerEvent',
      {
        detail: {
          type: 'addPaymentInfo',
          payload: {
            value: cart.data?.prices?.grand_total?.value || 0,
            currency: cart.data?.prices?.grand_total?.currency || '',
            coupon: cart.data?.extension_attributes?.totals?.coupon_code ?? '',
            discount: cart?.data?.prices?.discount?.amount?.value || 0,
            shippingTier: cart.data.extension_attributes?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping?.extension_attributes?.click_and_collect_type?.split('_').join(' '),
            deliveryOption: deliveryOption?.carrier_title,
            paymentType,
            productData: cart?.data?.items?.map((item) => {
              const gtmAttributes = item?.product?.gtm_attributes;
              return {
                gtm: {
                  'gtm-magento-product-id': gtmAttributes?.id || '',
                  'gtm-name': gtmAttributes?.name || '',
                  'gtm-brand': gtmAttributes?.brand || '',
                  'gtm-category': gtmAttributes?.category || '',
                  'gtm-variant': gtmAttributes?.variant || '',
                  'gtm-stock': item?.configured_variant?.stock_status === 'IN_STOCK' ? 'in stock' : '',
                  'gtm-price': gtmAttributes?.price || '',
                },
                discount: {
                  en: '',
                },
                quantity: item.quantity,
              };
            }),
          }
        },
      },
    ));
  }

  const onChangePaymentMethod = async (paymentMethod) => {
    const updatedMethods = methods.map((method) => {
      if (method.code === paymentMethod.code) {
        method.isSelected = true;
      } else {
        method.isSelected = false;
      }
      return method;
    });
    setMethods(updatedMethods);
    updateCartApi(paymentMethod.code);
    updateDataLayer(paymentMethod.title);
  };

  useEffect(() => {
    if (!isDisablePayment) {
      const selectedMethod = methods.find(method => method.code === cart.data.selected_payment_method.code);
      updateDataLayer(selectedMethod?.title);
    }
  }, [isDisablePayment, cart, methods]);

  const getPaymentMethodContinuePurchase = (code, content) => {
    const elements = content.querySelectorAll('p');
    let label = '';
    if (code === AppConstants.PAYMENT_METHOD_CODE_APPLEPAY) label = elements?.[1]?.innerHTML ?? '';

    return {
      code,
      label
    };
  }

  useEffect(() => {
    const availablePayments = isConfigLoaded && !checkoutComUpiConfig ? cart.data?.available_payment_methods?.filter(method => method.code !== AppConstants.PAYMENT_METHOD_CODE_CC) : cart.data?.available_payment_methods || [];

    if (paymentMethods) {
      const paymentMethodsJson = [];
      const methodsPurchaseLabels = [];
      Object.values(paymentMethods).forEach((method) => {
        const [key, isDefaultSelected, content, icon] = method.querySelectorAll('td');
        const paymentMethodCode = key.innerHTML;

        if (availablePayments.find((available) => available.code === paymentMethodCode)) {
          if (paymentMethodCode === AppConstants.PAYMENT_METHOD_CODE_APPLEPAY && !isApplePayAvailable()) {
            return;
          }
          methodsPurchaseLabels.push(getPaymentMethodContinuePurchase(paymentMethodCode, content));
          const metaData = {
            code: paymentMethodCode,
            isSelected: cart.data?.selected_payment_method.code ? cart.data?.selected_payment_method.code === paymentMethodCode : !!isDefaultSelected.innerHTML,
            icon,
            title: content.querySelector('p') ? content.querySelector('p').innerHTML : content.innerHTML,
            body: content.querySelectorAll('p').length > 1 ? Array.from(content.querySelectorAll('p')).slice(1) : [],
          };

          paymentMethodsJson.push(metaData);
        }
      });

      setPaymentMethodsContinuePurchaseLabels(methodsPurchaseLabels);

      if (!cart.data?.selected_payment_method?.code) {
        const selectedMethodPay = paymentMethodsJson.find((methodJson) => methodJson.isSelected);

        if (selectedMethodPay?.code) {
          updateCartApi(selectedMethodPay.code);
        } else if (paymentMethodsJson.length > 0) {
          paymentMethodsJson[0].isSelected = true;
          updateCartApi(paymentMethodsJson[0].code);
        }
      } else {
        /*const selectedMethodIndex = paymentMethodsJson.findIndex((methodJson) => methodJson.code === cart.data?.selected_payment_method.code);
        if (selectedMethodIndex > -1) {
          paymentMethodsJson[selectedMethodIndex].isSelected = true;
        } else if (paymentMethodsJson.length > 0) {
          paymentMethodsJson[0].isSelected = true;
          updateCartApi(paymentMethodsJson[0].code);
        }*/
      }
      const selectedMethodPay = paymentMethodsJson.find((methodJson) => methodJson.isSelected);
      if (!selectedMethodPay && paymentMethodsJson.length > 0) {
        paymentMethodsJson[0].isSelected = true;
        updateCartApi(paymentMethodsJson[0].code);
      }
      setMethods(paymentMethodsJson);
    }
  }, [cart.data?.available_payment_methods, cart.data?.selected_payment_method?.code, paymentMethods, setMethods, isConfigLoaded]);

  useEffect(() => {
    const paymentMethodCode = cart.data?.selected_payment_method?.code;
    if (paymentMethodCode) {
      setSelectedPaymentMethod(paymentMethodCode)
    }
  }, [cart]);

  const showErrorMessage = (errorMessage) => {
    if (errorMessage) {
      window.dispatchEvent(new CustomEvent('react:showPageErrorMessage', {
        detail: {
          message: errorMessage,
        },
      }));
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  };

  // eslint-disable-next-line consistent-return
  const submitOrder = useCallback(async (paymentMethod) => {
    let cartId, customerLoggedIn;
    if (getTopupEgiftCardId()) {
      cartId = getTopupEgiftCardId() ?? cart?.data?.id
      customerLoggedIn = getTopupEgiftCardId() ? false : isLoggedIn
    } else {
      cartId = cart?.data?.id
      customerLoggedIn = isLoggedIn
    }
    const cartResult = await getSubCartGraphql(isLoggedIn, cartId, [ApiConstants.CART_QUERY__EXTENSION_ATTRIBUTE]);
    if (cartResult) setCart({ ...cart, data: { ...cart?.data, ...cartResult } });
    const validationResponse = await validateBeforePaymentFinalise({ data: cartResult }, placeholders, selectedMethod);
    if (hasValue(validationResponse.data)
      && hasValue(validationResponse.data.error) && validationResponse.data.error
    ) {
      if (!validateCartResponse(validationResponse.data, placeholders)) {
        if (typeof validationResponse.data.message !== 'undefined') {
          console.error(validationResponse.message, GTM_CONSTANTS.CHECKOUT_ERRORS);
        }
      }
      if (validationResponse.data.errorMessage) showErrorMessage(validationResponse.data.errorMessage);
      setCompletePurchaseLoading(false);
      return null;
    }

    const placeOrderResponse = await placeOrder(
      {
        cartId,
      },
      cartId,
      customerLoggedIn,
    ).then(async (response) => {
      if (!response) {
        console.error('Got empty response while placing the order.');
        setCompletePurchaseLoading(false);
        return response;
      }
      if (!response.data && response.message) {
        showErrorMessage(response.message);
        window.dispatchEvent(new CustomEvent(
          'react:datalayerEvent',
          {
            detail: {
              type: 'paymentErrors',
              payload: {
                eventLabel: response.message
              }
            }
          }
        ));
        return null;
      }
      const redirectUrl = response?.data?.redirect_url;
      const result = {
        success: true,
      };
      if (redirectUrl) {
        result.success = false;
        result.redirectUrl = response.data.redirect_url;

        // This is postpay specific. In future if any other payment gateway sends
        // token, we will have to add a condition here.
        if (typeof response?.data?.token !== 'undefined') {
          result.token = response.data.token;
        }

        return { data: result };
      }

      let orderId = parseInt(response.data, 10);
      const cartId = cart?.data?.extension_attributes?.cart?.id;
      if (hasValue(response.status)
        && response.status >= 500
        && !isPostpayPaymentMethod(paymentMethod)
        && !isUpapiPaymentMethod(paymentMethod)
      ) {
        if (isLoggedIn) {
          const lastOrder = await getLastOrder();
          if (hasValue(lastOrder)
            && hasValue(lastOrder.quote_id)
            && lastOrder.quote_id === cartId
          ) {
            orderId = lastOrder.order_id;
          }
        } else {
          const maskedCartId = cart?.data?.id;
          const orderPlaced = await validateOrder(maskedCartId);
          if (hasValue(orderPlaced)
            && hasValue(orderPlaced.quote_id)) {
            orderId = orderPlaced.order_id;
          }
        }
      }

      if (!orderId || Number.isNaN(orderId)) {
        result.error = true;
        result.error_message = placeholders?.globalDefaultErrorMessage;
        return { data: result };
      }

      const secureOrderId = btoa(JSON.stringify({
        order_id: orderId,
        email: cart.data.extension_attributes.cart.billing_address.email,
      }));

      // clear cart info from local storage
      removeCartInfoFromLocal();

      result.redirectUrl = `/${getLanguageAttr()}${confirmationURI}?oid=${secureOrderId}`;
      const { message } = response.data;
      showErrorMessage(message);

      return { data: result };
    }).catch((error) => console.error(error, 'place order error'));
    if (placeOrderResponse?.data?.error_message) {
      showErrorMessage(placeOrderResponse?.data.error_message);
      return;
    }
    if (placeOrderResponse?.data) {
      window.location.href = placeOrderResponse.data.redirectUrl;
    }
  }, [cart, confirmationURI]);

  // eslint-disable-next-line consistent-return
  const finalisePayment = useCallback(async (paymentData, applePaySessionObject = '') => {
    const paymentInfo = preparePaymentData(paymentData, paymentCallbackSuccess, paymentCallbackError);
    const response = await validateBeforePaymentFinalise(cart, placeholders, selectedMethod);
    if (hasValue(response.data)
      && hasValue(response.data.error) && response.data.error
    ) {
      if (!validateCartResponse(response.data, placeholders)) {
        if (typeof response.data.message !== 'undefined') {
          console.error(response.message, GTM_CONSTANTS.CHECKOUT_ERRORS);
        }
      }
      if (response.data.error_message) {
        showErrorMessage(response.data.error_message);
      }
      setCompletePurchaseLoading(false);
      return null;
    }
    const paymentMethod = paymentData.payment.method;
    let cartId, customerLoggedIn;
    if (getTopupEgiftCardId()) {
      cartId = getTopupEgiftCardId() ?? cart?.data?.id
      customerLoggedIn = getTopupEgiftCardId() ? false : isLoggedIn
    } else {
      cartId = cart?.data?.id
      customerLoggedIn = isLoggedIn
    }
    await updateCart(paymentInfo, cartId, customerLoggedIn, true).then(async (response) => {
      if (response?.status !== 200 && response?.message) { // response will have a error
        showErrorMessage(response.message);
        return;
      }

      const resultData = response?.data;
      if (!resultData) {
        setCompletePurchaseLoading(false);
        return;
      }

      if (resultData.error === undefined && paymentMethod === AppConstants.PAYMENT_METHOD_CODE_APPLEPAY) {
        applePaySessionObject.completePayment(window.ApplePaySession.STATUS_SUCCESS);
      }
      if (resultData.error !== undefined && resultData.error) {
        setCompletePurchaseLoading(false);
        if (resultData.error_code !== undefined) {
          const errorCode = parseInt(resultData.error_code, 10);
          if (errorCode === 404) {
            window.location.href = `/${getLanguageAttr()}/cart`;
          } else {
            const errorMessage = resultData.message === undefined
              ? resultData.error_message
              : resultData.message;
            showErrorMessage(errorMessage);
          }
        }
        window.dispatchEvent(new CustomEvent(
          'react:datalayerEvent',
          {
            detail: {
              type: 'paymentErrors',
              payload: {
                eventLabel: errorMessage
              }
            }
          }
        ))
      } else if (resultData.cart?.id !== undefined && resultData.cart?.id) {
        await submitOrder(paymentMethod);
        window.dispatchEvent(new CustomEvent(
          'react:datalayerEvent',
          {
            detail: {
              type: 'placeOrderButtonClick',
            },
          },
        ));
      } else if (resultData.success === undefined || !(resultData.success)) { /* empty */ } else if (resultData.redirectUrl !== undefined) {
        window.location = resultData.redirectUrl;
      }
    }).catch((error) => {
      console.error(error);
      if (paymentMethod === AppConstants.PAYMENT_METHOD_CODE_APPLEPAY) {
        applePaySessionObject.completePayment(window.ApplePaySession.STATUS_FAILURE);
      }
    });
  }, [paymentCallbackSuccess, paymentCallbackError, cart, placeholders, selectedMethod, isLoggedIn, setCompletePurchaseLoading, submitOrder]);

  const renderMethodBody = (method) => {
    if (method?.code === AppConstants.PAYMENT_METHOD_CODE_COD) {
      return (
        <div className="payment-method-bottom-panel">
          <CashOnDelivery ref={paymentRef} finalisePayment={finalisePayment} />
        </div>
      );
    }
    if (method?.code === AppConstants.PAYMENT_METHOD_CODE_CC) {
      return (
        <div className="payment-method-bottom-panel">
          {/* <CheckoutComUpiContextProvider> */}
          <CheckoutComUpapi
            finalisePayment={finalisePayment}
            ref={paymentRef}
            paymentLogoList={paymentLogoList}
            isTopupFlag={isTopupFlag}
          />
          {/* </CheckoutComUpiContextProvider> */}
        </div>
      );
    }
    if (method?.code === AppConstants.PAYMENT_METHOD_CODE_APPLEPAY && isApplePayAvailable()) {
      return (
        <div className="payment-method-bottom-panel">
          {/* <CheckoutComUpiContextProvider> */}
          <CheckoutComUpiApplePay
            finalisePayment={finalisePayment}
            cart={cart}
            placeholders={placeholders}
            ref={paymentRef}
          />
          {/* </CheckoutComUpiContextProvider> */}
        </div>
      );
    }
    return <DefaultPayment ref={paymentRef} code={method.code} finalisePayment={finalisePayment} />;
  };

  const isFullRedeemEgift = cart?.data?.extension_attributes?.totals?.extension_attributes?.hps_redemption_type ===  AppConstants.PAYMENT_EGIFT_CARD_GUEST && fullPaymentByEgift;
  const isFullPaymentEgift = cart?.data?.extension_attributes?.totals?.extension_attributes?.hps_redemption_type ===  AppConstants.PAYMENT_EGIFT_CARD_linked && fullPaymentByEgift;

  const { redeemegifthead, redeemegifttitle, redeemegiftsubtitle, loyalty } = blockContent;
  return (
    <>
      <div id="spc-payment-methods" className={`spc-checkout-payment-options fadeInUp ${isDisablePayment ? 'in-active' : ''}`}>
        <div className="spc-checkout-section-title fadeInUp payment-method-title checkout__sub-container-title">{placeholders?.paymentMethodsTitle}</div>
        {
          isLoading
            ? <Loader />
            : (
              <div className={`payment-methods ${isDisablePayment ? 'in-active' : ''}`}>
                {isLoggedIn && !isHideSectionInCheckout && selectedPaymentMethod && !isTopupFlag && <PaymentMethodEGiftCard ref={isFullPaymentEgift ? paymentRef : null} finalisePayment={finalisePayment} />}
                {Array.from(methods).map((method) => (
                  <PaymentMethod
                    key={method.code}
                    methodCode={method.code}
                    method={method}
                    onChangePaymentMethod={(methodCode) => onChangePaymentMethod(methodCode)}
                    isLoggedIn={isLoggedIn}
                    isDisabled={isDisablePayment}
                    paymentRef={paymentRef}
                    paymentLogoList={paymentLogoList}
                    isDisableSection={fullPaymentByEgift}
                  >
                    {renderMethodBody(method)}
                  </PaymentMethod>
                ))}
              </div>
            )
        }
      </div>
      {isLoggedIn && !isHideSectionInCheckout && !isTopupFlag && <Loyalty content={loyalty} />}
      {!isHideSectionInCheckout && <RedeemEgiftCard redeemegifthead={redeemegifthead} redeemegifttitle={redeemegifttitle} redeemegiftsubtitle={redeemegiftsubtitle} ref={isFullRedeemEgift ? paymentRef : null} finalisePayment={finalisePayment} />}
    </>
  );
}
export default PaymentMethods;
