import React, {
  useContext, useState, useRef, useEffect,
} from 'react';
import CartContext from '../../../../../context/cart-context.jsx';
import AuraToolTip from '../aura-tool-tip/aura-tool-tip';
import { getRedeemPoint, verifyOtp } from '../../../../../api/auraDetails.js';
import AuraFormRedeemPoints from './aura-form-redeem-points.jsx';
import Loader from '../../../../../shared/loader/loader.jsx';
import { getConfigValue } from '../../../../../../scripts/configs.js';

function RedeemAuraPoints({
  points, mobile, expiryDate, expiringPoints, apcIdentifierNumber
}) {
  const { isLoggedIn, placeholders } = useContext(CartContext);
  const [state, setState] = useState({
    redeemPoints: false,
    customerVerified: false,
    otpResponseError: false,
    isLoading: false,
    otpFieldError: '',
    getRedeemPtsAura: '',
    verifyOtpAura: '',
    conversionRate: 0,
  });

  useEffect(() => {
    const getConfigs = async () => {
      const getRedeemPtsAura = await getConfigValue('get-redeem-pts-aura');
      const verifyOtpAura = await getConfigValue('verify-otp-aura');
      const conversionRate = await getConfigValue('aura-conversion-base-value') || 0;
      const decimalPlaces = await getConfigValue('aura-decimal-places');

      setState((prevState) => ({
        ...prevState,
        getRedeemPtsAura,
        verifyOtpAura,
        conversionRate,
        decimalPlaces,
      }));
    };

    getConfigs();
  }, []);

  const {
    redeemPointQuestion = '',
    redeemPointButton = '',
    auraOtpTooltip = '',
    redeemAuraOtpTitle = '',
    redeemAuraOtpPlaceholder = '',
    redeemAuraOtpButton = '',
    redeemAuraResendButton = '',
    redeemAuraOtpInfo = '',
    auraRedeemInfoTitleTwo = '',
    auraRedeemTooltip = '',
    redeemAuraOtpEmpty = '',
    redeemAuraOtpIncorrect = '',
    apiGenericError = '',
    redeemAuraSuccessMessagePoints = '',
    auraTooltipInfoTextone = '',
  } = placeholders;

  const inputRef = useRef(null);

  const callRedeemPoints = async () => {
    setState((prevState) => ({ ...prevState, isLoading: true }));

    try {
      const { getRedeemPtsAura } = state;
      const getRedeemPtsAuraEndPoint = getRedeemPtsAura?.replace('{{identifierNo}}', apcIdentifierNumber);
      const redeemPointsData = await getRedeemPoint(getRedeemPtsAuraEndPoint, isLoggedIn);

      if (redeemPointsData) {
        setState((prevState) => ({
          ...prevState,
          redeemPoints: true,
        }));
      }
    } catch (error) {
      console.error('Error redeeming points:', error);

      setState((prevState) => ({
        ...prevState,
        redeemPoints: false,
        error: 'Failed to redeem points. Please try again later.',
      }));
    } finally {
      setState((prevState) => ({ ...prevState, isLoading: false }));
    }
  };

  const submitOtp = async () => {
    const otp = document.getElementById('otp').value;
    console.log(otp);

    if (otp.length === 0) {
      setState((prevState) => ({ ...prevState, otpFieldError: redeemAuraOtpEmpty }));

      return;
    }

    setState((prevState) => ({ ...prevState, isLoading: true, otpFieldError: '' }));
    try {
      const { verifyOtpAura } = state;
      const verifyOtpAuraEndPoint = verifyOtpAura?.replace('{{identifierNo}}', apcIdentifierNumber).replace('{{otp}}', otp);
      const otpData = await verifyOtp(verifyOtpAuraEndPoint, isLoggedIn);
      if (typeof otpData === 'boolean') {
        if (otpData) {
          setState((prevState) => ({
            ...prevState,
            customerVerified: true,
            otpFieldError: '',
          }));
        } else {
          setState((prevState) => ({ ...prevState, otpFieldError: redeemAuraOtpIncorrect }));
        }
      } else if (typeof otpData === 'object' && otpData !== null) {
        const errorMessage = otpData?.parameters[0] || apiGenericError;
        setState((prevState) => ({ ...prevState, otpFieldError: errorMessage }));
      }
    } catch (error) {
      console.error('Error verifying OTP:', error);
    } finally {
      setState((prevState) => ({ ...prevState, isLoading: false }));
    }
  };

  const handleBlur = () => {
    inputRef?.current?.classList.toggle('focus', inputRef.current.value.length > 0);
  };

  const {
    redeemPoints,
    customerVerified,
    isLoading,
    otpFieldError,
    conversionRate,
    decimalPlaces,
  } = state;

  return (
    <div className="spc-aura-link-card-form active">
      {isLoading && (
        <div className="loader_overlay">
          <Loader />
        </div>
      )}
      <div className="customer-points">
        <div className="aura-points-info">
          <div className="total-points">
            <span>
              {auraTooltipInfoTextone}
              <span className="spc-aura-highlight">
                {points} {redeemAuraSuccessMessagePoints}
              </span>
            </span>
          </div>
          <div className="spc-aura-checkout-messages">
            <div className="spc-aura-points-expiry-item">
              <div>
                <span> {expiringPoints}  {auraRedeemInfoTitleTwo} </span>
                <span className="spc-aura-highlight">{expiryDate}</span>
                <AuraToolTip newClass="question" data="" type="info" content={auraRedeemTooltip} />
              </div>
            </div>
          </div>
        </div>

        {!customerVerified
            && (
            <div className="aura-redeem-points">
              {!redeemPoints
                && (
                <>
                  <div className="redeem-msg">{redeemPointQuestion}</div>
                  <button type="submit" className="spc-aura-redeem-card spc-aura-button" onClick={callRedeemPoints}>
                    {redeemPointButton}
                  </button>
                </>
                )}
              {redeemPoints
                && (
                <div className="aura-send-otp">
                  <div className="aura-modal-form">
                    <div className="aura-enter-otp">
                      <AuraToolTip data={redeemAuraOtpTitle} type="info" content={auraOtpTooltip} />
                    </div>

                    <div className="aura-modal-form-items">
                      <div className="otp-field-section">
                        <div className="spc-type-textfield">
                          <input
                            type="text"
                            id="otp"
                            name="otp"
                            ref={inputRef}
                            onBlur={handleBlur}
                          />
                          <div className="c-input__bar" />
                          <label htmlFor="otp-input">{redeemAuraOtpPlaceholder}</label>
                          <div id="otp-error" className="error">{otpFieldError}</div>
                        </div>
                        <div className="aura-verify-otp">
                          <button type="button" className="aura-modal-form-submit" onClick={submitOtp}>{redeemAuraOtpButton}</button>
                        </div>
                        <div className="aura-otp-submit-description">
                          <button type="button" className="resend-otp" onClick={callRedeemPoints}>{redeemAuraResendButton}</button>
                        </div>
                        <div className="otp-sent-to-mobile-label">
                          <span>
                            {redeemAuraOtpInfo}
                            {' '}
                            {mobile}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                )}
            </div>
            )}
        {customerVerified
          && (
          <AuraFormRedeemPoints
            pointsInAccount={points}
            conversionRate={conversionRate}
            decimalPlaces={decimalPlaces}
            apcIdentifierNumber={apcIdentifierNumber}
          />
          )}
      </div>
    </div>
  );
}

export default RedeemAuraPoints;
