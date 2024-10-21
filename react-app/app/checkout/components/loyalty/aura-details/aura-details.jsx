import React, { useContext, useState, useEffect } from 'react';
import AuraFormFieldOptions from '../aura-form-field-options/aura-form-field-options.jsx';
import CartContext from '../../../../../context/cart-context.jsx';
import AuraToolTip from '../aura-tool-tip/aura-tool-tip';
import LinkCardOptionCard from './link-card-option.jsx';
import LinkCardOptionEmail from './link-email-option.jsx';
import LinkCardOptionMobile from './link-mobile-option.jsx';
import { hasValue, showError, removeError } from '../../../../../utils/loyalty/conditions-util.js';
import { getInlineErrorSelector } from '../../../../../utils/loyalty/link_card_sign_up_modal_helper';
import getUserInput from '../../../../../utils/loyalty/checkout_helper.js';
import {
  getEnrolledStatus, setLoyaltyCard, simulateSales, getApcPointsBalance,
} from '../../../../../api/auraDetails.js';
import { getCountryIso } from '../../../../../../scripts/helpers/country-list.js';
import { getConfigValue } from '../../../../../../scripts/configs.js';
import RedeemAuraPoints from './redeem-aura-points.jsx';
import Loader from '../../../../../shared/loader/loader.jsx';
import './aura-details.css';

function AuraDetailsForm() {
  const {
    placeholders,
    isLoggedIn,
    cartId,
    cart,
    salesPoints,
    setSalesPoints,
  } = useContext(CartContext);

  const [state, setState] = useState({
    linkCardOption: 'cardNumber',
    loyaltyCardLinkedToCart: false,
    cardNumber: '',
    email: '',
    mobile: '',
    isFullyEnrolled: false,
    points: 0,
    expiringPoints: 0,
    expiryDate: null,
    userInput: {},
    isLoading: false,
    countryPrefix: '',
    verifyOtpAura: '',
    setLoyaltyAura: '',
    getEnrolledAura: '',
    simulateSaleAura: '',
    apcPtsBalanceAura: '',
    apcIdentifierNumber: '',
  });

  const {
    enterAuraDetails = '',
    enterAuraDetailsToolTip = '',
    loyaltyCardPlaceholder = '',
    loyaltyEmailPlaceholder = '',
    loyaltyMobilePlaceholder = '',
    loyalCardInvalid = '',
    loyalMobileNotRegistered = '',
    loyalEmailNotRegistered = '',
    earnAuraPointsInfo = '',
    earnAuraSalesPoints = '',
    submitText = '',
  } = placeholders;

  useEffect(() => {
    const fetchCountryPrefix = async () => {
      const countryCode = await getConfigValue('country-code');
      const prefix = `+${await getCountryIso(countryCode)}`;
      const setLoyaltyAura = await getConfigValue('set-loyalty-aura');
      const getEnrolledAura = await getConfigValue('get-enrolled-aura');
      const simulateSaleAura = await getConfigValue('simulate-sale-aura');
      const apcPtsBalanceAura = await getConfigValue('apc-pts-balance-aura');

      setState((prevState) => ({
        ...prevState,
        countryPrefix: prefix,
        setLoyaltyAura,
        getEnrolledAura,
        simulateSaleAura,
        apcPtsBalanceAura,
      }));
    };

    fetchCountryPrefix();
  }, []);

  const showErrorMessage = (type) => {
    const { linkCardOption } = state;

    let errorMessage;
    if (linkCardOption === 'email') {
      errorMessage = loyalEmailNotRegistered;
    } else if (linkCardOption === 'mobile') {
      errorMessage = loyalMobileNotRegistered;
    } else {
      errorMessage = loyalCardInvalid;
    }


    showError(getInlineErrorSelector(type)[type], errorMessage);
  };

  const processCheckout = async (data, type) => {
    const countryCode = data?.countryCode?.replace('+', '') || '';
    const value = (data.type === 'phone')
      ? countryCode + data.value
      : data.value;

    const {
      setLoyaltyAura, getEnrolledAura, simulateSaleAura, apcPtsBalanceAura,
    } = state;

    try {
      const enrolledEndPoint = getEnrolledAura
        ?.replace('{{inputValue}}', value)
        ?.replace('{{searchedType}}', data.type);

      const enrolledData = await getEnrolledStatus(enrolledEndPoint, isLoggedIn);
      const { apc_identifier_number: apcIdentifierNumber, email, mobile } = enrolledData ?? {};

      if (!apcIdentifierNumber) {
        showErrorMessage(type);

        return;
      }


      setState((prevState) => ({ ...prevState, email, mobile, apcIdentifierNumber }));

      try {

        await setLoyaltyCard(apcIdentifierNumber, isLoggedIn, cartId, setLoyaltyAura);
      } catch (error) {
        console.error('Error setting loyalty card:', error);
        setState((prevState) => ({ ...prevState, isLoading: false }));
      }

      try {
        const simulateSaleAuraEndPoint = simulateSaleAura?.replace('{{identifierNo}}', apcIdentifierNumber);
        const idCart = isLoggedIn ? cart?.data?.extension_attributes?.cart?.id : cartId;
        const salesData = await simulateSales(simulateSaleAuraEndPoint, isLoggedIn, idCart);
        if (salesData && salesData.apc_points) {
          setSalesPoints(salesData.apc_points);
        }
      } catch (error) {
        console.error('Error simulating sales:', error);
        setState((prevState) => ({ ...prevState, isLoading: false }));
      }

      try {
        const apcPtsBalanceAuraEndPoint = apcPtsBalanceAura?.replace('{{identifierNo}}', apcIdentifierNumber);
        const apcPointsBalanceData = await getApcPointsBalance(apcPtsBalanceAuraEndPoint, isLoggedIn);
        if (!apcPointsBalanceData.error) {
          const {
            apc_points: apcPoints,
            apc_points_expiry_date: apcPointsExpiryDate,
            apc_points_to_expire: apcPointsToExpire,
          } = apcPointsBalanceData;
          setState((prevState) => ({
            ...prevState,
            points: apcPoints,
            expiringPoints: apcPointsToExpire,
            expiryDate: apcPointsExpiryDate,
          }));
        } else {
          console.error('Error fetching APC points balance:', apcPointsBalanceData.error);

          setState((prevState) => ({ ...prevState, isLoading: false }));
        }
      } catch (error) {
        console.error('Error fetching APC points balance:', error);

        setState((prevState) => ({ ...prevState, isLoading: false }));
      }
    } catch (error) {
      setState((prevState) => ({ ...prevState, isLoading: false }));
    } finally {
      setState((prevState) => ({ ...prevState, isLoading: false }));
    }
  };

  const addCard = () => {
    const { linkCardOption, countryPrefix } = state;
    const userInput = getUserInput(`${linkCardOption}Checkout`, placeholders);

    if (userInput && Object.keys(userInput).length === 0) {

      return;
    }

    setState((prevState) => ({
      ...prevState,
      userInput,
    }));

    if (hasValue(userInput)) {
      const { type } = userInput;
      setState((prevState) => ({ ...prevState, isLoading: true }));
      const data = { ...userInput, action: 'add' };
      if (type === 'phone') {
        data.countryCode = countryPrefix;
      }

      processCheckout(data, `${linkCardOption}Checkout`);
    }
  };

  const selectOption = (option) => {
    const type = `${option}Checkout`;
    removeError(getInlineErrorSelector(type)[type]);

    setState((prevState) => ({
      ...prevState,
      linkCardOption: option,
    }));
  };

  const {
    linkCardOption,
    cardNumber,
    email,
    mobile,
    points,
    userInput,
    isLoading,
    expiringPoints,
    expiryDate,
    apcIdentifierNumber
  } = state;

  const updatedSalesText = earnAuraSalesPoints.replace('{points}', salesPoints);

  return (
    <>
      <div className="loyalty__main-wrapper">
        {isLoading && (
          <div className="loader_overlay">
            <Loader />
          </div>
        )}
        {
          points === 0 && (
            <>
              <div className="aura-details__container">
                <AuraToolTip data={enterAuraDetails} type="info" content={enterAuraDetailsToolTip} />
              </div>
              <AuraFormFieldOptions
                selectedOption={linkCardOption}
                selectOptionCallback={selectOption}
                cardNumber={cardNumber}
              />
            </>
          )
        }
        <div className="spc-aura-link-card-form-content active">
          {
            points === 0 ? (
              <>
                <div className="spc-aura-link-card-wrapper">
                  <div className="form-items">
                    {(linkCardOption === 'email')
                      && <LinkCardOptionEmail email={email} loyaltyEmailPlaceholder={loyaltyEmailPlaceholder} />}
                    {(linkCardOption === 'cardNumber')
                      && <LinkCardOptionCard cardNumber={cardNumber} loyaltyCardPlaceholder={loyaltyCardPlaceholder} />}
                    {(linkCardOption === 'mobile')
                      && (
                        <LinkCardOptionMobile
                          loyaltyMobilePlaceholder={loyaltyMobilePlaceholder}
                        />
                      )}
                    <button
                      type="submit"
                      className="spc-aura-link-card-submit spc-aura-button"
                      disabled={false}
                      onClick={addCard}
                    >
                      {submitText}
                    </button>
                  </div>
                </div>
                <div id="spc-aura-link-api-response-message" className="spc-aura-link-api-response-message"></div>
              </>
            ) : <RedeemAuraPoints points={points} mobile={mobile} expiryDate={expiryDate} expiringPoints={expiringPoints} apcIdentifierNumber={apcIdentifierNumber} />
          }
        </div>
      </div>

      <div className="loyalty__salesinfo">
        <span className="loyalty__salesinfo__points-earned-message">{updatedSalesText}</span>
        <AuraToolTip data='' newClass="question" type="info" content={earnAuraPointsInfo} salesPoints={salesPoints} />
      </div>
    </>
  );
}

export default AuraDetailsForm;
