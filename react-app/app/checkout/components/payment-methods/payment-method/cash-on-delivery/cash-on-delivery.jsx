/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React, {
  forwardRef,
  useCallback, useContext, useEffect, useImperativeHandle, useState,
} from 'react';
import './cash-on-delivery.css';
import OTPInput from 'react-otp-input';
import OtpTimer from 'otp-timer';
import Icon from '../../../../../../library/icon/icon.jsx';
import CartContext from '../../../../../../context/cart-context.jsx';
import sendOTP from '../../../../../../api/sendOTP.js';
import verifyOTP from '../../../../../../api/verifyOTP.js';
import CodVerifiedText from './cod-verified-text/cod-verified-text.jsx';
import Loader from '../../../../../../shared/loader/loader.jsx';
import getSubCartGraphql from '../../../../../../api/getSubCartGraphql.js';
import ApiConstants from '../../../../../../api/api.constants.js';
import { getConfigValue } from '../../../../../../../scripts/configs.js';
import { formatPrice } from '../../../../../../utils/base-utils.js';
import AppConstants from '../../../../../../utils/app.constants.js';

const CashOnDelivery = forwardRef(({ finalisePayment }, ref) => {
  const otpLength = 4;
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isResendingOTP, setIsResendingOTP] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [currency, setCurrency] = useState('');
  const [surchargeText, setSurchargeText] = useState(null);
  const {
    cart, setCart, cartId, isLoggedIn, deliveryInformation, setDeliveryInformation, setEditAddress, placeholders,
  } = useContext(CartContext);
  const extensionAttributes = cart?.data?.extension_attributes?.cart?.extension_attributes;
  const surcharge = extensionAttributes?.surcharge;

  const mobileNumber = extensionAttributes?.shipping_assignments?.[0].shipping?.address?.telephone;
  const mobileNumberVerified = extensionAttributes?.mobile_number_verified;
  const isMobileNumberVerified = mobileNumberVerified === 1 || mobileNumberVerified === 2;
  const address = extensionAttributes?.shipping_assignments?.[0]?.shipping?.address;

  const verifyOTPHandler = async () => {
    setIsVerifyingOTP(true);
    const payload = { cart_id: cartId, code: +otp };
    const response = await verifyOTP(payload);

    if (response?.response === true) {
      const result = await getSubCartGraphql(isLoggedIn, cartId, [ApiConstants.CART_QUERY__MOBILE_NUMBER_VERIFIED]);
      if (result) {
        setCart((prevCart) => ({
          ...prevCart,
          data: {
            ...prevCart.data,
            extension_attributes: {
              ...prevCart.data.extension_attributes,
              cart: {
                ...prevCart.data.extension_attributes.cart,
                extension_attributes: {
                  ...prevCart.data.extension_attributes.cart.extension_attributes,
                  mobile_number_verified: result?.extension_attributes?.cart?.extension_attributes?.mobile_number_verified,
                },
              },
            },
          },
        }));
      }
      window.dispatchEvent(new CustomEvent('react:datalayerEvent', {
        detail: {
          type: 'codOtpVerification',
          payload: {
            eventCategory: "cod",
            eventAction: "verification",
            eventLabel: 'success'
          }
        }
      }));
    } else {
      setError(placeholders.codErrorWrongOtp);
      window.dispatchEvent(new CustomEvent('react:datalayerEvent', {
        detail: {
          type: 'codOtpVerification',
          payload: {
            eventCategory: "cod",
            eventAction: "verification",
            eventLabel: 'fail'
          }
        }
      }));
      window.dispatchEvent(new CustomEvent('react:datalayerEvent', {
        detail: {
          type: 'codOtpVerification',
          payload: {
            eventCategory: "verification error",
            eventAction: "cod_otp",
            eventLabel: placeholders.codErrorWrongOtp
          }
        }
      }));
    };

    setIsVerifyingOTP(false);
  };

  const sendOTPHandler = async (isReset = false) => {
    if (isReset) setIsResendingOTP(true);
    else setIsSendingOTP(true);

    const payload = { cart_id: cartId };
    const otpResponse = await sendOTP(payload);
    if (otpResponse.response) {
      window.dispatchEvent(new CustomEvent('react:datalayerEvent', {
        detail: {
          type: 'codOtpVerification',
          payload: {
            eventCategory: "cod",
            eventAction: isReset ? "otp resent" : "otp sent",
            eventLabel: ''
          }
        }
      }));
    }

    if (isReset) setIsResendingOTP(false);
    else setIsSendingOTP(false);
  };

  const openMobileChangeDialog = () => {
    setEditAddress(address);
    setDeliveryInformation(prev => ({ ...prev, isDialogOpen: true, changeAddress: 'shipping', isModalVisible: true, updateOnlyTelephone: true, infoMessage: placeholders.codMobileUpdateInfoText }));
  };

  const renderCODText = () => {
    const codText = placeholders.codEnterOtpTitle.replace('{{TELEPHONE}}', mobileNumber);
    return <span className="cod-text">{codText}</span>;
  };
  const fetchSurchargeText = useCallback(async () => {
    if (surcharge?.is_applied && surcharge?.amount > 0) {
      const formattedAmount = await formatPrice(currency, surcharge?.amount);
      const text = placeholders.codSurchargeText.replace('{{SURCHARGE}}', formattedAmount);
      setSurchargeText(
        <div className="cod-surcharge-desc">
          <Icon name="info-blue" />
          <span className="cod-surcharge-desc-text">{text}</span>
        </div>,
      );
    }
    else {
      setSurchargeText(null);
    }

  }, [surcharge, currency, placeholders]);

  const renderVerifyText = () => {
    if (isSendingOTP) return <Loader />;
    return (
      <div className="cod-container">
        {surchargeText}
        <div className="cod-mobile-otp">
          <div className="cod-text-wrapper">
            {renderCODText()}
            <span className={`cod-text-action ${isResendingOTP || isVerifyingOTP ? 'cod-disabled' : ''}`} onClick={openMobileChangeDialog}>{placeholders.codChangeTelephoneCta}</span>
          </div>
          <form className="cod-mobile-otp__form">
            <OTPInput
              value={otp}
              onChange={setOtp}
              numInputs={otpLength}
              inputType="number"
              containerStyle="cod-mobile-otp__input-container"
              inputStyle={`cod-mobile-otp__input ${error ? 'cod-mobile-otp__input-error' : ''}`}
              // eslint-disable-next-line react/jsx-props-no-spreading
              renderInput={(props) => <input disabled={isResendingOTP || isVerifyingOTP} {...props} />}
            />
            {error && <span className="cod-mobile-otp__error">{error}</span>}
            <div className="cod-mobile-otp__controls">
              <div className="cod-text-wrapper resend-btn">
                <span className="cod-text">{placeholders.codResendOtpText}</span>
                <span className="cod-text-action">
                  {
                    isResendingOTP ? <Loader /> : (
                      <OtpTimer
                        key={mobileNumber}
                        seconds={+placeholders.codOtpResendTimeInSeconds}
                        minutes={0}
                        resend={() => sendOTPHandler(true)}
                        text=" "
                        ButtonText={placeholders.codResendOtpCta}
                        disabled={isVerifyingOTP}
                      />
                    )
                  }
                </span>
              </div>
              <button type="button" disabled={!otp || otp.length < otpLength || isResendingOTP} className={`cod-mobile-otp__submit ${isVerifyingOTP ? 'loader' : ''}`} onClick={verifyOTPHandler}>
                {isVerifyingOTP ? '' : placeholders.codVerifyOtpCta}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isMobileNumberVerified) {
      return <CodVerifiedText mobileNumber={mobileNumber} onEdit={openMobileChangeDialog} surchargeText={surchargeText} />;
    }
    return renderVerifyText();
  };

  useEffect(() => {
    if (mobileNumberVerified === 3) setError(placeholders.codErrorWrongOtp);
    else if (mobileNumberVerified === 4) setError(placeholders.codErrorDefaultInvalidOtp);
    else setError('');
  }, [mobileNumberVerified, placeholders]);

  useEffect(() => {
    if (!isMobileNumberVerified && mobileNumber) sendOTPHandler();
  }, [mobileNumber, isMobileNumberVerified]);

  useEffect(() => {
    const fetchCurrency = async () => {
      const configValue = await getConfigValue('currency');
      setCurrency(configValue);
    };
    fetchCurrency();
  }, []);

  useEffect(() => {
    fetchSurchargeText();
  }, [fetchSurchargeText]);

  const validateBeforePlaceOrder = useCallback(() => isMobileNumberVerified);

  useImperativeHandle(ref, () => ({
    completePurchase: async () => {
      const payload = {
        payment: {
          method: AppConstants.PAYMENT_METHOD_CODE_COD,
        },
      };
      if (validateBeforePlaceOrder() && finalisePayment) await finalisePayment(payload);
    },
  }));

  return renderContent();
});

export default CashOnDelivery;
