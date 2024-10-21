import React, { useContext, useState, useEffect } from 'react';
import CartContext from '../../../../../context/cart-context.jsx';
import { redeemOrRemovePoints, simulateSales } from '../../../../../api/auraDetails.js';
import Loader from '../../../../../shared/loader/loader.jsx';
import { getConfigValue } from '../../../../../../scripts/configs.js';
import AppConstants from '../../../../../utils/app.constants.js';

function AuraFormRedeemPoints({ pointsInAccount, apcIdentifierNumber, conversionRate, decimalPlaces }) {
  const {
    cart,
    isLoggedIn,
    placeholders,
    setCart,
    setSalesPoints,
  } = useContext(CartContext);

  const { REDEEM_PAYMENT_METHOD_CODE } = AppConstants;

  const {
    redeemAuraPointsTitle = '',
    redeemAuraPointsUseButton = '',
    redeemAuraPointsRemoveButton = '',
    redeemAuraSuccessMessage = '',
    redeemAuraSuccessMessagePoints = '',
    redeemAuraSuccessMessageWorth = '',
  } = placeholders;

  const quoteId = cart?.data?.extension_attributes?.cart?.id;

  const [enteredPoints, setEnteredPoints] = useState(0);
  const [auraTransaction, setAuraTransaction] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [convertedValue, setConvertedValue] = useState(0.000);
  const [redeemRemovePtsAura, setRedeemRemovePtsAura] = useState('');
  const [simulateSaleAura, setSimulateSaleAura] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      const redeemRemovePtsVal = await getConfigValue('redeem-remove-pts-aura');
      setRedeemRemovePtsAura(redeemRemovePtsVal);

      const simulateSaleVal = await getConfigValue('simulate-sale-aura');
      setSimulateSaleAura(simulateSaleVal);

      handleChange({ target: { value: pointsInAccount } } );
    };

    fetchConfig();
  }, []);

  const redemptionLimit = (finalAmount) => {
    const grandTotalPoints = Math.round(finalAmount);

    const pointsAllowedToRedeem = (pointsInAccount < grandTotalPoints)
      ? pointsInAccount
      : grandTotalPoints;

    return pointsAllowedToRedeem;
  };

  const convertPointsToAmount = (numericValue = null) => {
    const convertedPoints = (numericValue * conversionRate).toFixed(decimalPlaces);
    setConvertedValue(convertedPoints);
  }

  const handleChange = async (e) => {
    const userEnteredPoints = e.target.value;
    const numericValue = userEnteredPoints.replace(/[^0-9]/g, '');
    if (numericValue.length > 1 && numericValue.startsWith('0')) {
      return;
    }

    setEnteredPoints(numericValue);

    if (numericValue === '') {
      setConvertedValue('0.000');
      return;
    }

    convertPointsToAmount(numericValue);
  };

  const grandTotal = cart?.data?.prices?.grand_total;
  const currencyCode = grandTotal?.currency;
  const finalAmount = grandTotal?.value;
  redemptionLimit(finalAmount);

  const updateCartTotal = (data) => {
    setCart((prevState) => {
      const balancePayableSegment = {
        code: 'balance_payable',
        title: 'Balance Payable',
        value: data?.redeem_response?.balance_payable || 0,
      };

      const auraPaymentSegment = {
        code: REDEEM_PAYMENT_METHOD_CODE,
        title: 'Paid By Aura',
        value: data?.redeem_response?.cashback_requested_value || 0,
      };

      const totalSegments = prevState.data.extension_attributes.totals.total_segments;

      const balancePayableIndex = totalSegments.findIndex((segment) => segment.code === 'balance_payable');
      const auraPaymentIndex = totalSegments.findIndex((segment) => segment.code === REDEEM_PAYMENT_METHOD_CODE);

      let updatedTotalSegments = totalSegments.map((segment, index) => {
        if (index === balancePayableIndex) {
          return balancePayableSegment;
        } if (index === auraPaymentIndex) {
          return auraPaymentSegment;
        }
        return segment;
      });

      if (balancePayableIndex === -1) {
        updatedTotalSegments = [...updatedTotalSegments, balancePayableSegment];
      }

      if (auraPaymentIndex === -1) {
        updatedTotalSegments = [...updatedTotalSegments, auraPaymentSegment];
      }

      return {
        ...prevState,
        data: {
          ...prevState.data,
          extension_attributes: {
            ...prevState.data.extension_attributes,
            totals: {
              ...prevState.data.extension_attributes.totals,
              total_segments: updatedTotalSegments,
            },
          },
        },
      };
    });
  };

  const triggerRedeemPoints = async () => {
    setIsLoading(true);

    const redeemPointsBody = {
      redeemPoints: {
        quote_id: quoteId,
        action: auraTransaction ? 'remove points' : 'set points',
        ...(auraTransaction ? {} : {
          redeem_points: enteredPoints,
          converted_money_value: convertedValue,
          currencyCode,
          payment_method: REDEEM_PAYMENT_METHOD_CODE,
        }),
      },
    };

    try {
      const redeemOrRemoveEndpoint = redeemRemovePtsAura?.replace('{{identifierNo}}', apcIdentifierNumber);
      const responseData = await redeemOrRemovePoints(redeemPointsBody, redeemOrRemoveEndpoint, isLoggedIn);
      console.log(responseData);
      if (!responseData?.error) {
        updateCartTotal(responseData);
        setAuraTransaction(!auraTransaction);

        try {
          const simulateSaleAuraEndPoint = simulateSaleAura?.replace('{{identifierNo}}', apcIdentifierNumber);
          const salesData = await simulateSales(simulateSaleAuraEndPoint, isLoggedIn, redeemPointsBody.redeemPoints.quote_id);
          if (salesData && salesData.apc_points) {
            setSalesPoints(salesData.apc_points);
          }
        } catch (error) {
          console.error('Error simulating sales:', error);
          // Handle the error appropriately, e.g., show an error message to the user
        }
      }
    } catch (error) {
      console.error('Error using or removing points:', error);

      // Handle error (e.g., show error message to the user)
    } finally {
      setIsLoading(false);
    }
  };

  const btnLabel = auraTransaction ? redeemAuraPointsRemoveButton : redeemAuraPointsUseButton;
  const redeemButtonDisabled = auraTransaction ? false : enteredPoints === 0;

  return (
    <div className="spc-aura-redeem-points-form-wrapper">
      {isLoading && (
        <div className="loader_overlay">
          <Loader />
        </div>
      )}
      { !auraTransaction && <span className="label">{redeemAuraPointsTitle}</span> }
      <div className="form-items">
        <div className="inputs">
          {
          !auraTransaction
            ? (
              <>
                <div className="spc-aura-textfield spc-aura-redeem-field-points-form-item">
                  <input
                    placeholder="0"
                    name="spc-aura-redeem-field-points"
                    className="spc-aura-redeem-field-points"
                    type="text"
                    value={enteredPoints}
                    onChange={handleChange}
                  />
                </div>
                <span className="spc-aura-redeem-points-separator">=</span>
                <div className="spc-aura-textfield spc-aura-redeem-field-amount-form-item">
                  <input
                    placeholder={`${currencyCode} 0.000`}
                    name="spc-aura-redeem-field-amount"
                    className="spc-aura-redeem-field-amount"
                    type="text"
                    value={`${currencyCode} ${convertedValue}`}
                    disabled
                  />
                </div>
              </>
            )
            : (
              <div className="successful-redeem-msg" data-aura-points-used={enteredPoints}>
                <span> {enteredPoints} </span>
                <span> {redeemAuraSuccessMessagePoints} </span>
                <span className='successful-redeem-msg'> {redeemAuraSuccessMessageWorth} </span>
                <span> {currencyCode} </span>
                <span> {convertedValue} </span>
                <span className='successful-redeem-msg'> {redeemAuraSuccessMessage} </span>
              </div>
            )
        }

          <button
            type="submit"
            className="spc-aura-redeem-form-submit spc-aura-button"
            onClick={triggerRedeemPoints}
            disabled={redeemButtonDisabled}
          >
            {btnLabel}
          </button>
        </div>
      </div>
      <div id="spc-aura-link-api-response-message" className="spc-aura-link-api-response-message" />
    </div>
  );
}

export default AuraFormRedeemPoints;
