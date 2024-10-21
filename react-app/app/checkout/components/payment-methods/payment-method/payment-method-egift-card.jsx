import React, { useState, useContext, useEffect, forwardRef, useImperativeHandle } from "react";
import { getConfigValue } from '../../../../../../scripts/configs.js';
import CartContext from '../../../../../context/cart-context';
import RedeemEgiftCardModal from '../../redeem-egift-card/redeem-egift-modal.jsx';
import transact from '../../../../../api/transact.js';
import updateRedeemAmount from '../../../../../api/giftCard.js';
import Loader from '../../../../../shared/loader/loader.jsx';
import { getLinkedGiftCards } from '../../../../../../scripts/giftcart/api.js';
import removeRedemption from '../../../../../api/removeRedemption';
import getSubCartGraphql from '../../../../../api/getSubCartGraphql.js';
import ApiConstants from '../../../../../api/api.constants.js';
import AppConstants from '../../../../../utils/app.constants.js';

const PaymentMethodEGiftCard = forwardRef((props, ref) => {

  const {
    finalisePayment
  } = props;


  const [isChecked, setIsChecked] = useState(false);
  const [availableBalance, setAvailableBalance] = useState(0);
  const [giftCardData, setGiftCardData] = useState(null);
  const [currency, setCurrency] = useState('');
  const [editAmount, setEditAmount] = useState(false);
  const [appliedGiftCardValue, setAppliedGiftCardValue] = useState(0);
  const [inputAmountRedeeme, setInputAmountRedeeme] = useState(0);
  const [inputRedeemAmountError, setInputRedeemAmountError] = useState(false);
  const [remainingGiftCardBalance, setRemainingGiftCardBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showEditOption, setShowEditOption] = useState(false);
  const [isGCAmountEdited, setIsGCAmountEdited] = useState(false);
  const [epayGiftCardEditedMessage, setEpayGiftCardEditedMessage] = useState('');
  const [isDisableSection, setIsDisableSection] = useState(false);
  const [isLinkedGCLoading, setIsLinkedGCLoading] = useState(false);
  const [noGiftCard, setNoGiftCard] = useState(false);
  const [balancePayable, setBalancePayable] = useState(0);

  const {
    placeholders,
    cardAppliedAmount,
    cart,
    setCart,
    methods,
    isLoggedIn,
    setFullPaymentByEgift
  } = useContext(CartContext);

  const {
    epayGiftcardTitle = '',
    epayGiftcardAvailableBalance = '',
    epayGiftcardEditText = '',
    epayGiftcardEditMessage = ''
  } = placeholders;

  const cart_Id = cart?.data?.extension_attributes?.cart?.id;
  const cartData = cart?.data?.extension_attributes?.totals?.extension_attributes;
  const selectedPaymentMethod = methods?.find((method) => method.isSelected);
  const isCashOnDeliverySelected = selectedPaymentMethod?.code === AppConstants.PAYMENT_METHOD_CODE_COD || false;
  const egiftRedeemedAmount = cart?.data?.extension_attributes?.totals?.extension_attributes?.hps_redeemed_amount;
  const egiftCurrentBalance = cart?.data?.extension_attributes?.totals?.extension_attributes?.hps_current_balance;

  const balancePayment = cart?.data?.extension_attributes?.totals?.total_segments?.find((item) => item?.code === 'balance_payable');
  const auraPayment = cart?.data?.extension_attributes?.totals?.total_segments?.find((item) => item?.code === 'aura_payment');
  const baseGrandTotal = cart?.data?.extension_attributes?.totals?.base_grand_total ?? 0;

  useEffect(() => {
    setEpayGiftCardEditedMessage(epayGiftcardEditMessage);

    const fetchCurrency = async () => {
      setIsLinkedGCLoading(true);
      const currencyData = await getConfigValue('currency');
      setCurrency(currencyData);

      const getGiftCardData = await getLinkedGiftCards();
      setGiftCardData(getGiftCardData);
      setAvailableBalance(getGiftCardData.current_balance);
      setIsLinkedGCLoading(false);

      if (!getGiftCardData?.response_type) {
        setNoGiftCard(true);

        return;
      }

      const isEgiftChecked = cartData?.hps_redemption_type === AppConstants.PAYMENT_EGIFT_CARD_linked;
      if (isEgiftChecked && !isCashOnDeliverySelected) {
        handleCheckboxChange({ target: { checked: true } }, getGiftCardData, currencyData);
      }
    };
    fetchCurrency();
  }, []);

  useEffect(() => {
    setAppliedGiftCardValue(cardAppliedAmount);
  }, [cardAppliedAmount]);

  useEffect(() => {
    setIsDisableSection((cartData?.hps_redemption_type === AppConstants.PAYMENT_EGIFT_CARD_GUEST) || isCashOnDeliverySelected);
  }, [methods, cart]);

  useImperativeHandle(ref, () => ({
    completePurchase: async () => {
      const payload = {
        payment: {
          method: AppConstants.hps_payment_method,
        },
      };
      await finalisePayment(payload);
    },
  }));

  const opentModal = () => setEditAmount(true);

  const closeModal = () => setEditAmount(false);

  const updateTotalInCartContext = (totals) => {
    setCart((prevCart) => ({
      ...prevCart,
      data: {
        ...prevCart.data,
        extension_attributes: {
          ...prevCart.data.extension_attributes,
          totals
        }
      }
    }));
  };

  const handleCheckboxChange = async (event, gcData = null, currencyData = null) => {
    setIsChecked(event.target.checked);
    setIsLoading(true);
    if (event.target.checked) {
      const hpsData = giftCardData || gcData;
      if (!hpsData) {
        setIsLoading(false);
        return;
      }

      const { card_number } = hpsData;
      const payload = {
        redeem_points: {
          action: 'set_points',
          quote_id: cart_Id,
          amount: hpsData.current_balance,
          card_number,
          payment_method: 'hps_payment',
          card_type: 'linked'
        }
      };

      const invokeGCRedeem = await transact(payload);
      if (invokeGCRedeem?.response_type) {
        const { current_balance, redeemed_amount, totals } = invokeGCRedeem;
        const selectedCurrency = currencyData || currency;
        const currentPriceWithCurrency = ` ${selectedCurrency} ${current_balance}`;
        setRemainingGiftCardBalance(currentPriceWithCurrency);
        const redeemedAmountWithCurrency = ` ${selectedCurrency} ${redeemed_amount}`;
        setAppliedGiftCardValue(redeemedAmountWithCurrency);
        setInputAmountRedeeme(redeemed_amount);
        setShowEditOption(true);
        setFullPaymentByEgift(redeemed_amount === totals.grand_total);
        updateTotalInCartContext(totals);
      } else {
        setNoGiftCard(true);
      }

      setIsLoading(false);
    } else {
      const payload = {
        redemptionRequest: {
          quote_id: cart_Id
        }
      };

      setFullPaymentByEgift(false);

      await removeRedemption(payload, isLoggedIn);

      const result = await getSubCartGraphql(isLoggedIn, cart_Id, [ApiConstants.CART_QUERY__EXTENSION_ATTRIBUTE, ApiConstants.CART_QUERY__PRICES]);

      if (result) {
        setCart((prevCart) => ({
          ...prevCart,
          data: {
            ...prevCart.data,
            extension_attributes: result?.extension_attributes,
            prices: result?.prices
          }
        }));
      }
      setShowEditOption(false);
      setIsLoading(false);
    }
  };

  const replacePlaceholders = (message, replacements) => {
    let updatedMessage = message;
    for (const [key, value] of Object.entries(replacements)) {
      updatedMessage = updatedMessage.replace(`{{${key}}}`, value);
    }
    return updatedMessage;
  };

  const updateEGBalance = async() => {

    let cartTotal = baseGrandTotal;
    // The cart total for egift should be less than the redemption amount and
    // the pending balance.
    if (balancePayment?.value >= 0
      && egiftRedeemedAmount >= 0
      && (balancePayment.value + egiftRedeemedAmount) < cartTotal) {
      cartTotal = balancePayment.value + egiftRedeemedAmount;
    }

    // Handling validation for the changing the amount of egift card.
    let errorMessage = '';
    // Proceed only if user has entered some value.
    if (inputAmountRedeeme.length === 0) {
      errorMessage = placeholders?.formEgiftAmount ?? '';
    } else if (egiftCurrentBalance && (inputAmountRedeeme > (egiftRedeemedAmount + egiftCurrentBalance))) {
      errorMessage = placeholders?.egiftInsufficientBalance ?? '';
    } else if (inputAmountRedeeme <= 0) {
      errorMessage = placeholders?.egiftValidAmount ?? '';
    } else if (inputAmountRedeeme > cartTotal) {
      errorMessage = placeholders?.redeemEgiftError ?? '';
    } else if (auraPayment && ((parseFloat(inputAmountRedeeme) + auraPayment?.value) < baseGrandTotal)) {
      errorMessage = placeholders?.redeemEgiftFullError ?? '';
    }
    setInputRedeemAmountError(errorMessage);
    if(errorMessage) {
      return;
    }
    const newAmount = parseFloat(inputAmountRedeeme);

    setIsLoading(true);

    const payload = {
      redemptionRequest: {
        amount: newAmount
      }
    };

    const updateGC = await updateRedeemAmount(payload, isLoggedIn);

    const { balance_payable, totals } = updateGC;
    updateTotalInCartContext(totals);
    const replacements = {
      currency,
      amount: balance_payable
    };
    let updatedMessage = replacePlaceholders(epayGiftcardEditMessage, replacements);
    setFullPaymentByEgift(balance_payable <= 0);
    setBalancePayable(balance_payable);
    setEpayGiftCardEditedMessage(updatedMessage);
    setIsGCAmountEdited(true);
    setIsLoading(false);
    setEditAmount(false);
  }

  if (noGiftCard) {
    return null;
  }

  if (isLinkedGCLoading) {
    return <Loader />;
  }

  return (
    <div className={`payment-method fadeInUp payment-method-checkout_com_upapi payment-method__egift-card ${isDisableSection ? 'in-active' : ''}`}>
      {isLoading && (
        <div className="loader_overlay">
          <Loader />
        </div>
      )}
      <div className="payment-method-top-panel">
        <div className="payment-method-label-wrapper">
          <input
            type="checkbox"
            id="link-egift-card"
            checked={isChecked}
            onChange={handleCheckboxChange}
          />
          <label
            htmlFor="link-egift-card"
            className="checkbox-sim checkbox-label egift-link-card-label"
          >
            <span className="checkmark"></span>
            <span> {epayGiftcardTitle} </span>
            <span>({epayGiftcardAvailableBalance} {currency} {availableBalance})</span>
          </label>
        </div>
      </div>

      {
        showEditOption && (
          <div className="payment-method-bottom-panel payment-method-form checkout_com_egift_linked_card">
            {
              isGCAmountEdited && balancePayable !== 0 && (
                <div className="desc-content">{epayGiftCardEditedMessage}</div>
              )
            }
            <button className="edit-egift-payment-amount" onClick={opentModal}>{epayGiftcardEditText}</button>
          </div>
        )
      }

      {editAmount && (
        <RedeemEgiftCardModal
          placeholders={placeholders}
          handleCloseModal={closeModal}
          appliedCardValue={appliedGiftCardValue}
          totalCardBalance={remainingGiftCardBalance}
          inputAmountRedeeme={inputAmountRedeeme}
          setInputAmountRedeeme={setInputAmountRedeeme}
          handleEditApplyAmount={updateEGBalance}
          inputRedeemAmountError={inputRedeemAmountError}
          showModal={editAmount}
        />
      )}
    </div>
  );
});

export default PaymentMethodEGiftCard;