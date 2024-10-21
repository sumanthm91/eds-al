import React, {
  useCallback, useContext, forwardRef, useImperativeHandle,
  useEffect,
  useState,
} from 'react';
import NewCard from './new-card/new-card.jsx';
import { handleValidationMessage } from '../utilities/manageHtmlErrors.js';
import CheckoutComUpiContext from '../../../../../context/checkoutcomupi-context.jsx';
import CartContext from '../../../../../context/cart-context.jsx';
import AppConstants from '../../../../../utils/app.constants.js';
import { hasValue } from '../../../../../utils/base-utils.js';
import { GTM_CONSTANTS } from '../../../../cart/constants.js';
import { getCardTokens } from '../utilities/utils.js';
import SelectedCard from './selected-card/selected-card.jsx';
import './selected-card/selected-card.css';
import CardSelectionDialog from './card-selection-dialog/card-selection-dialog.jsx';
import Dialog from '../../../../../shared/dialog/dialog.jsx';
import './index.css';

const CheckoutComUpapi = forwardRef((props, ref) => {
  const {
    cardConfig,
    setCardConfig,
    checkoutComUpiConfig
  } = useContext(CheckoutComUpiContext);
  const { placeholders, isLoggedIn, setCompletePurchaseLoading, isTopupFlag } = useContext(CartContext);
  const [selectedCard, setSelectedCard] = useState('new');
  const [tokenizedCard, setTokenizedCard] = useState('');
  const [activeCard, setActiveCard] = useState({});
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [savedCards, setSavedCards] = useState([]);

  const {
    finalisePayment,
    paymentLogoList,
  } = props;

  useEffect(() => {
    if (isLoggedIn && !isTopupFlag) {
      const tokenizedCardsList = getCardTokens();
      if (tokenizedCardsList instanceof Promise) {
        tokenizedCardsList.then((result) => {
          const selectedCardList = 'existing';
          if (result?.length) {
            const tokenizedCardData = Object.keys(result)[0] || '';
            const activeCardList = result.find((card) => card.isActive);
            setSelectedCard(selectedCardList);
            setTokenizedCard(tokenizedCardData);
            setActiveCard(activeCardList);
            setSavedCards(result);
          }
        });
      }
    }
  }, [isLoggedIn, isTopupFlag]);

  const labelEffect = (e, handler) => {
    if (handler === 'blur') {
      if (e.currentTarget.value.length > 0) {
        e.currentTarget.classList.add('focus');
      } else {
        e.currentTarget.classList.remove('focus');
      }
    }
  };

  const validateCvv = (cvv) => {
    const cvvLength = cvv.toString().length;
    return [3, 4].includes(cvvLength) && !Number.isNaN(cvv);
  };

  const cvvValidations = useCallback((e) => {
    const cvv = e.target.value.trim();
    const valid = validateCvv(cvv);

    handleValidationMessage(
      'spc-cc-cvv-error',
      e.target.value,
      valid,
      placeholders?.invalidCvvText,
    );

    setCardConfig({
      ...cardConfig,
      cvvValid: valid,
      cvv,
    });
  }, [cardConfig, setCardConfig]);

  const handleCardCvvChange = useCallback((event, handler) => {
    const cvv = event.target.value;
    if (!cvv) {
      handleValidationMessage(
        'spc-cc-cvv-error',
        cvv,
        false,
        placeholders?.requiredCvvText,
      );
      return;
    }
    cvvValidations(event);
    labelEffect(event, handler);
  }, [cardConfig, setCardConfig]);

  const enableCheckoutLink = useCallback((e) => {
    // Dont wait for focusOut/Blur of CVV field for validations,
    // We need to enable checkout link as soon as user has 3 characters in CVV.
    cvvValidations(e);
  }, [cardConfig, setCardConfig]);

  const handleCheckoutResponse = useCallback(async (data) => {
    // Do not process when data has type error.
    if (data.error_type) {
      setCompletePurchaseLoading(false);
      if (data.error_codes.includes("cvv_invalid")) {
        window.dispatchEvent(new CustomEvent(
          'react:datalayerEvent',
          {
            detail: {
              type: 'paymentErrors',
              payload: {
                eventLabel: placeholders.transactionFailedText,
              }
            }
          }
        ));
        window.scrollTo({
          top: 0,
          behavior: 'smooth',
        });
        window.dispatchEvent(new CustomEvent('react:showPageErrorMessage', {
          detail: {
            message: placeholders.transactionFailedText,
          },
        }));
        if (hasValue(data.error_codes)) {
          console.error(
            `payment-error | Decline Reason: ${JSON.stringify(data.error_codes)}`,
            { ...data, is_system_error: false },
            GTM_CONSTANTS.PAYMENT_ERRORS,
          );
        }
      }
      return;
    }

    let saveCard = 0;
    // Set udf3 again here to send it for api request.
    saveCard = (selectedCard === 'new' && isLoggedIn && document?.getElementById('payment-card-save')?.checked)
      ? 1
      : 0;
    const paymentData = {
      payment: {
        method: AppConstants.PAYMENT_METHOD_CODE_CC,
        additional_data: { ...data, save_card: saveCard, card_type: selectedCard },
      },
    };

    await finalisePayment(paymentData);
  }, [finalisePayment, isLoggedIn, selectedCard, setCompletePurchaseLoading]);

  const scrollToView = () => {
    setTimeout(() => {
      document.getElementById('spc-payment-methods').scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
    }, 500);
  };

  // eslint-disable-next-line consistent-return
  const validateBeforePlaceOrder = useCallback(async () => {
    const {
      number,
      expiry,
      cvv,
      numberValid,
      expiryValid,
      cvvValid,
    } = cardConfig;
    let isValid = true;
    try {
      if (selectedCard === 'new' && !(numberValid && expiryValid && cvvValid)) {
        scrollToView();
        throw new Error('New card details not added');
      }

      if (selectedCard === 'existing' && !cvvValid) {
        scrollToView();
        throw new Error('Existing card details not added');
      }
      if (selectedCard === 'existing') {
        await handleCheckoutResponse({ cvv, id: tokenizedCard });
      } else {
        const ccInfo = {
          type: 'card',
          number,
          expiry_month: expiry.split('/')[0],
          expiry_year: expiry.split('/')[1],
          cvv,
        };

        const { api_url: apiUrl, public_key: publicKey } = checkoutComUpiConfig;
        const tokenUrl = `${apiUrl}tokens`;

        const headers = {
          'Content-Type': 'application/json',
          Authorization: publicKey,
        };

        const options = {
          method: 'POST',
          headers,
          body: JSON.stringify(ccInfo),
        };
        const responseData = await fetch(tokenUrl, options);
        await responseData.json().then(async (tokenResult) => {
          await handleCheckoutResponse(tokenResult);
        }).catch((error) => {
          setCompletePurchaseLoading(false);
          console.error('Checkout.com UPAPI Token', error.message, GTM_CONSTANTS.PAYMENT_ERRORS);
        });
      }
    } catch (error) {
      console.error(error);
    }

    if (!number) {
      handleValidationMessage(
        'spc-cc-number-error',
        number,
        false,
        placeholders?.requiredCardNumberText
      );
      isValid = false;
    }
  
    if (!expiry) {
      handleValidationMessage(
        'spc-cc-expiry-error',
        expiry,
        false,
        placeholders?.requiredExpiryText
      );
      isValid = false;
    }
  
    if (!cvv) {
      handleValidationMessage(
        'spc-cc-cvv-error',
        cvv,
        false,
        placeholders?.invalidCvvText
      );
      isValid = false;
    }
  
    return isValid;
  }, [cardConfig, checkoutComUpiConfig, handleCheckoutResponse, placeholders.transactionFailedText, selectedCard, setCompletePurchaseLoading, tokenizedCard]);

  useImperativeHandle(ref, () => ({
    completePurchase: async () => {
      await validateBeforePlaceOrder();
    },
  }));

  const onExistingCardSelect = (cardHash) => {
    setSelectedCard('existing');
    setTokenizedCard(cardHash);
  };

  const changeCurrentCard = (type) => {
    setSelectedCard(type);
  };
  const onClickNewCard = () => {
    setDialogOpen(false);
    changeCurrentCard('new');
  };

  const onSelectCard = (cardInfo) => {
    onExistingCardSelect(cardInfo.public_hash);
    setActiveCard(cardInfo);
    setDialogOpen(false);
  };
  return (
    <>
      {isLoggedIn && savedCards.length > 0 && !isTopupFlag ? (
        <div className="spc-payment-checkout_com">
          <div className="spc-checkout-card-option">
            <div className={`${selectedCard === 'existing' ? 'icon-selected' : ''} check-icon existing-card-icon`} />
            <SelectedCard cardInfo={activeCard} onExistingCardSelect={onExistingCardSelect} handleCardCvvChange={handleCardCvvChange} selectedCard={selectedCard} setDialogOpen={setDialogOpen} />
          </div>
          <div className="spc-checkout-card-option">
            <div className={`${selectedCard === 'new' ? 'icon-selected' : ''} check-icon`} />
            <div>
              <span className="spc-checkout-card-new-card-label" onClick={onClickNewCard} role="button" tabIndex={0} onKeyDown={onClickNewCard}>New Card</span>
              {selectedCard === 'new' && (
                <NewCard
                  labelEffect={labelEffect}
                  enableCheckoutLink={enableCheckoutLink}
                  handleCardCvvChange={handleCardCvvChange}
                  paymentLogoList={paymentLogoList}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <NewCard
          labelEffect={labelEffect}
          enableCheckoutLink={enableCheckoutLink}
          handleCardCvvChange={handleCardCvvChange}
          paymentLogoList={paymentLogoList}
        />
      )}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setDialogOpen(false)}
        headerClassName="dialog__header-checkout"
        containerClassName="dialog__checkout-container"
      >
        <CardSelectionDialog savedCards={savedCards} onAddNewCard={onClickNewCard} activeCard={activeCard} onSelectCard={onSelectCard} paymentLogoList={paymentLogoList} />
      </Dialog>
    </>
  );
});

export default CheckoutComUpapi;
