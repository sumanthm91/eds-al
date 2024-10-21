import React, {
  forwardRef, useCallback, useContext, useImperativeHandle,
} from 'react';
import { getPayable } from '../utilities/utils.js';
import CheckoutComUpiContext from '../../../../../context/checkoutcomupi-context.jsx';
import { getConfigValue } from '../../../../../../scripts/configs.js';
import AppConstants from '../../../../../utils/app.constants.js';

let applePaySessionObject;

const CheckoutComUpiApplePay = forwardRef((props, ref) => {
  const {
    finalisePayment,
    cart,
    placeholders
  } = props;

  const {
    checkoutComUpiConfig,
  } = useContext(CheckoutComUpiContext);

  const isPossible = () => {
    const identifier = checkoutComUpiConfig.apple_pay_merchant_id;
    return window.ApplePaySession.canMakePaymentsWithActiveCard(identifier).then((canMakePayments) => {
      return canMakePayments;
    }).catch((error) => {
      console.error(error);
      return false;
    });
  };

  /**
   * Get Supported version
   * @returns {number}
   */
  const getApplePaySupportedVersion = () => {
    for (let i = 6; i > 1; i--) {
      if (window.ApplePaySession.supportsVersion(i)) {
        return i;
      }
    }

    return 1;
  };

  /**
   * Validate merchant
   * @param event
   * @returns {Promise<void>}
   */
  const onValidateMerchant = async (event) => {
    const url = await getConfigValue('commerce-base-endpoint');
    const endpoint = await getConfigValue('appbuilder-apple-pay-endpoint');
    const fetchUrl = `${url}/${endpoint}`;
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Referrer: window.location.host,
      },
    };

    options.body = JSON.stringify({
      data: {
        apple_pay_gateway: event.validationURL,
        brand_name: await getConfigValue('brand'),
      },
    });

    const responseData = await fetch(fetchUrl, options);
    const merchantSession = await responseData.json();
    applePaySessionObject.completeMerchantValidation(merchantSession);
  };

  /**
   * On Payment Authorize
   * @param event
   * @returns {Promise<void>}
   */
  const onPaymentAuthorized = async (event) => {
    const url = checkoutComUpiConfig.api_url+'tokens';
    const { token } = event.payment;
    const params = {
      type: AppConstants.PAYMENT_METHOD_APPLEPAY_TYPE,
      token_data: {
        version: token.paymentData.version,
        data: token.paymentData.data,
        signature: token.paymentData.signature,
        header: {
          ephemeralPublicKey: token.paymentData.header.ephemeralPublicKey,
          publicKeyHash: token.paymentData.header.publicKeyHash,
          transactionId: token.transactionIdentifier,
        },
      },
    };

    const headers = {
      'Content-Type': 'application/json',
      Authorization: checkoutComUpiConfig.public_key,
    };

    const options = {
      method: 'POST',
      headers,
      body: JSON.stringify(params),
    };

    const tokenResponse = await fetch(url, options);
    const tokenResponseData = await tokenResponse.json();

    let payloadData = {};
    const type = tokenResponseData?.type;
    if (type === AppConstants.PAYMENT_METHOD_APPLEPAY_TYPE) {
      payloadData = {
        payment: {
          method: AppConstants.PAYMENT_METHOD_CODE_APPLEPAY,
          additional_data: {
            token: tokenResponseData?.token,
            bin: tokenResponseData?.bin,
            type: type,
            expires_on: tokenResponseData?.expires_on,
            expiry_month: tokenResponseData?.expiry_month,
            expiry_year: tokenResponseData?.expiry_year,
            last4: tokenResponseData?.last4,
          },
        },
      };

      finalisePayment(payloadData, applePaySessionObject);
    }
  };

  /**
   * Start payment
   * @param total
   * @returns {Promise<void>}
   */
  const startPayment = async (total) => {
    let networks = checkoutComUpiConfig.apple_pay_supported_networks.split(',');
    if (getApplePaySupportedVersion() < 5) {
      networks = networks.filter((element) => element !== 'mada');
    }

    let merchantCapabilites = checkoutComUpiConfig.apple_pay_merchant_capabilities.split(',');
    merchantCapabilites.push('supports3DS');

    const paymentRequest = {
      merchantIdentifier: checkoutComUpiConfig.apple_pay_merchant_id,
      currencyCode: await getConfigValue('currency'),
      countryCode: await getConfigValue('country-code'),
      total: {
        label: placeholders?.storeLabel,
        amount: total,
      },
      supportedNetworks: networks,
      merchantCapabilities: merchantCapabilites,
    };

    try {
      applePaySessionObject = new window.ApplePaySession(1, paymentRequest);
      applePaySessionObject.onvalidatemerchant = onValidateMerchant;
      applePaySessionObject.onpaymentauthorized = onPaymentAuthorized;
      applePaySessionObject.oncancel = () => {
        console.debug('payment cancel');
      };
      applePaySessionObject.begin();
    } catch (e) {
      console.error(e);
    }
  };

  /**
   * validateBeforePlaceOrder
   * @returns {Promise<boolean>}
   */
  const validateBeforePlaceOrder = useCallback(async () => {
    try {
      if(isPossible()) {
        const payableAmount = getPayable(cart);
        startPayment(payableAmount);
      }
    } catch (e) {
      console.log(e);
    }

    return false;
  }, [cart]);

  useImperativeHandle(ref, () => ({
    completePurchase: () => {
      validateBeforePlaceOrder();
    },
  }));
});

export default CheckoutComUpiApplePay;
