import React, { useState, useEffect, useContext, forwardRef, useImperativeHandle } from 'react';
import CartContext from '../../../../context/cart-context.jsx';
import { decorateIcons } from '../../../../../scripts/aem.js';
import Icon from '../../../../library/icon/icon.jsx';
import transact from '../../../../api/transact.js';
import useCurrencyFormatter from '../../../../utils/hooks/useCurrencyFormatter.jsx';
import Loader from '../../../../shared/loader/loader.jsx';
import RedeemEgiftCardModal from './redeem-egift-modal.jsx';
import './redeem-egift-card.css';
import AppConstants from '../../../../utils/app.constants.js';
import ApiConstants from '../../../../api/api.constants.js';
import removeRedeemCardRedemption from '../../../../api/removeRedeemCardRedemption';
import updateRedeemEgiftAmount from '../../../../api/updateRedeemEgiftAmount.js';
import getSubCartGraphql from '../../../../api/getSubCartGraphql.js';

const RedeemEgiftCard = forwardRef(({ redeemegifthead, redeemegifttitle, redeemegiftsubtitle, finalisePayment }, ref) => {
    const { placeholders, cart, cartId, priceDecimals, isLoggedIn, setCart, setFullPaymentByEgift, isTopupFlag } = useContext(CartContext);

    const isCashOnDeliverySelected = cart?.data?.selected_payment_method.code === AppConstants.PAYMENT_METHOD_CODE_COD || false;

    const egiftRedeemedAmount = cart?.data?.extension_attributes?.totals?.extension_attributes?.hps_redeemed_amount;
    const egiftCurrentBalance = cart?.data?.extension_attributes?.totals?.extension_attributes?.hps_current_balance;

    const balancePayment = cart?.data?.extension_attributes?.totals?.total_segments?.find((item) => item?.code === 'balance_payable');
    const auraPayment = cart?.data?.extension_attributes?.totals?.total_segments?.find((item) => item?.code === 'aura_payment');
    const baseGrandTotal = cart?.data?.extension_attributes?.totals?.base_grand_total ?? 0;

    const [isAccordionOpen, setIsAccordionOpen] = useState(true);
    const [isOtpFormVisible, setIsOtpFormVisible] = useState(false);
    const [isCardSectionVisible, setIsCardSectionVisible] = useState(true);
    const [isOtpVerified, setIsOtpVerified] = useState(false);
    const [otp, setOtp] = useState('');
    const [showGetCode, setShowGetCode] = useState(true);
    const [cardNumber, setCardNumber] = useState('');
    const [email, setEmail] = useState('');
    const [errorMessageEmptyNumber, setErrorMessageEmptyNumber] = useState();
    const [emptyOtp, setEmptyOtp] = useState(false);
    const [currencyCode, setCurrencyCode] = useState('')
    const [showErrorMessageCard, setShowErrorMessageCard] = useState(false);
    const [showErrorMessageOtp, setShowErrorMessageOtp] = useState(false);
    const [showErrorMessageGiftCardSelfTopup, setShowErrorMessageGiftCardSelfTopup] = useState(false);
    const [isRedeemConfirmation, setIsRedeemConfirmation] = useState(false);
    const [cardOriginalValue, setCardOriginalValue] = useState(egiftRedeemedAmount);
    const [cardBalanceAmount, setCardBalanceAmount] = useState();
    const [isLoading, setIsLoading] = useState(false);

    const [inputRedeemAmountError, setInputRedeemAmountError] = useState(false);
    const [isDisableSection, setIsDisableSection] = useState(false);

    const appliedCardValue = useCurrencyFormatter({ price: egiftRedeemedAmount, priceDecimals, currency: currencyCode });
    const totalCardBalance = useCurrencyFormatter({ price: egiftCurrentBalance, priceDecimals, currency: currencyCode });
    const [inputAmountRedeeme, setInputAmountRedeeme] = useState(appliedCardValue);

    const cart_Id = cart?.data?.extension_attributes?.cart?.id;
    const grandTotal = cart?.data?.extension_attributes?.totals?.total_segments.find(d=>d.code==='grand_total')?.value ?? 0;

    const formattedPaybleAmount = useCurrencyFormatter({ price: balancePayment?.value })

    const amountToPayAboveRedeem = placeholders?.amountToPayAfterRedeem?.replace('{{BALANCEPAY}}', formattedPaybleAmount);

    const topupCarNumber = cart?.data?.extension_attributes?.cart?.items?.filter((item) => Number(item?.extension_attributes?.is_topup) === 1)[0]?.extension_attributes?.topup_card_number;

    const redeemPayload = {
        redeem_points: {
            action: 'send_otp',
            quote_id: cart_Id,
            card_number: cardNumber,
        }
    };

    const handleRedeemHeader = () => {
        setIsAccordionOpen(!isAccordionOpen);
    };

    const handleGetCode = async (e) => {
        e.preventDefault();
        if (isDisableSection) {
            return;
        }
        
        setShowErrorMessageCard(false);
        setShowErrorMessageGiftCardSelfTopup(false);

        if (!cardNumber) {
            console.error('Error sending OTP, enter card');
            setShowErrorMessageCard(false);
            setErrorMessageEmptyNumber(true);
            return;
        }

        if (isTopupFlag && cardNumber === topupCarNumber) {
            setShowErrorMessageGiftCardSelfTopup(true);
            return;
        }

        setIsLoading(true);
        try {
            const response = await transact(redeemPayload);
            if (response?.response_type) {
                setIsOtpFormVisible(true);
                setShowGetCode(false);
                setShowErrorMessageCard(false);
                setErrorMessageEmptyNumber(false);
                setEmptyOtp(false);
                setOtp('');
                setEmail(response?.email);

            } else {
                console.error('Error sending OTP, incorrect card number');
                setShowErrorMessageCard(true);
                setErrorMessageEmptyNumber(false);
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            setShowGetCode(true);
            setShowErrorMessageCard(true);
            setErrorMessageEmptyNumber(false);
        }
        finally {
            setIsLoading(false);
        }
    };

    const verifyPayload = {
        redeem_points: {
            action: 'set_points',
            quote_id: cart_Id,
            amount: grandTotal,
            card_number: cardNumber,
            payment_method: 'hps_payment',
            card_type: 'guest',
            otp,
            email
        }
    };

    const handleOTP = async (e) => {
        e.preventDefault();
        if (!otp) {
            console.error('Error verifying OTP, Enter OTP');
            setIsOtpVerified(false);
            setIsOtpFormVisible(true);
            setIsCardSectionVisible(true);
            setShowErrorMessageOtp(false);
            setEmptyOtp(true);
        }
        setIsLoading(true);
        try {
            const response = await transact(verifyPayload);

            if (response.response_type) {
                setIsOtpVerified(true);
                setIsOtpFormVisible(false);
                setIsCardSectionVisible(false);

                setCart((prevCart) => ({
                    ...prevCart,
                    data: {
                        ...prevCart.data,
                        extension_attributes: {
                            ...prevCart.data.extension_attributes,
                            totals: response.totals
                        }
                    }
                }));

                setFullPaymentByEgift(response.totals.extension_attributes.hps_redeemed_amount === response.totals.grand_total);

            } else {
                console.error('Error verifying OTP');
                setEmptyOtp(false);
                setIsOtpVerified(false);
                setIsOtpFormVisible(true);
                setIsCardSectionVisible(true);
                setShowErrorMessageOtp(true);
            }
            setCurrencyCode(response?.totals?.base_currency_code ?? '')

        } catch (error) {
            setShowErrorMessageOtp(true);
            console.error('Error verifying OTP:', error);
        }

        finally {
            setIsLoading(false);
        }
    };

    const handleEgiftRemove = async (e) => {
        e.preventDefault();

        try {

            const payload = isLoggedIn ? {
                redemptionRequest: {
                    quote_id: cart?.data?.extension_attributes?.cart?.id,
                }
            } : {
                redemptionRequest: {
                    mask_quote_id: cart?.data?.id,
                }
            };
            setIsLoading(true);
            const response = await removeRedeemCardRedemption(payload, isLoggedIn);
            if (response.response_type) {

                const availableRedeemData = await getSubCartGraphql(isLoggedIn, cartId, [ApiConstants.CART_QUERY__EXTENSION_ATTRIBUTE]);

                setCart((prevCart) => ({
                    ...prevCart,
                    data: {
                        ...prevCart.data,
                        extension_attributes: {
                            ...prevCart.data.extension_attributes,
                            totals: availableRedeemData.extension_attributes.totals
                        }
                    }
                }));

                setFullPaymentByEgift(false);

                setCardNumber('');
                setEmptyOtp(false);
                setIsOtpFormVisible(false);
                setIsCardSectionVisible(true);
                setShowGetCode(true);
                setIsOtpVerified(false);
                setShowErrorMessageOtp(false);
            }
        } catch (error) {
            console.error('Error removing egift card:', error);
        }
        finally {
            setIsLoading(false);
        }
    }

    const handleRedeemEdit = () => {
        setIsRedeemConfirmation(true);
    };

    const handleCloseModal = () => {
        setIsRedeemConfirmation(false);
    };

    const handleChangeCard = () => {

        setIsOtpFormVisible(false);
        setShowGetCode(true);
        setShowErrorMessageCard(false);
        setErrorMessageEmptyNumber(false);
        setEmptyOtp(false);
        setOtp('');

    }

    const handleEditApplyAmount = async () => {


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
        if (errorMessage) {
            return;
        }
        try {
            const newAmount = parseFloat(inputAmountRedeeme);
            const payload = isLoggedIn ? {
                redemptionRequest: {
                    amount: newAmount,
                }
            } : {
                redemptionRequest: {
                    amount: newAmount,
                    mask_quote_id: cartId,
                }
            };

            setIsLoading(true);
            const response = await updateRedeemEgiftAmount(payload, isLoggedIn);
            if (response.response_type) {
                setCart((prevCart) => ({
                    ...prevCart,
                    data: {
                        ...prevCart.data,
                        extension_attributes: {
                            ...prevCart.data.extension_attributes,
                            totals: response.totals
                        }
                    }
                }));

                setFullPaymentByEgift(response.totals.extension_attributes.hps_redeemed_amount === response.totals.grand_total);
                setIsRedeemConfirmation(false);
            }
        } catch (error) {
            console.error('Error redeem egift amount:', error);
        }
        finally {
            setIsLoading(false);
        }

    }

    useEffect(() => {
        const section = document.querySelector("#redeem_egift_card_section");
        if (section) {
            decorateIcons(section);
        }
    }, []);

    useEffect(() => {
        const hps_redemption_type = cart?.data?.extension_attributes?.totals?.extension_attributes?.hps_redemption_type;
        if (hps_redemption_type === AppConstants.PAYMENT_EGIFT_CARD_linked || isCashOnDeliverySelected) {
            setIsDisableSection(true);
        }
        else {
            if (egiftRedeemedAmount > 0) {
                setIsOtpVerified(true);
                setIsOtpFormVisible(false);
                setIsCardSectionVisible(false);
                setIsAccordionOpen(true)
            }
            setIsDisableSection(false);
        }

        const totals = cart?.data?.extension_attributes?.totals;
        setFullPaymentByEgift(totals?.extension_attributes?.hps_redeemed_amount > 0 && totals?.extension_attributes?.hps_redeemed_amount === cart?.data?.prices?.grand_total?.value);

    }, [cart]);

    useEffect(() => {
        setInputAmountRedeeme(egiftRedeemedAmount);
    }, [cart]);

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

    return (
        <div className={`redeem_container ${isDisableSection ? 'in-active' : ''}`}>
            {isLoading && (
                <div className="loader_overlay">
                    <Loader />
                </div>
            )}
            <div className='redeem_egift_card' id='redeem_egift_card_section'>
                <div className='redeem_egift_card_header_container' onClick={handleRedeemHeader}>
                    <span className="icon icon-egift-redeem"></span>
                    <div className='redeem_egift_card_label'>{redeemegifthead}</div>
                    <span className='accordion_icon'>
                        <span className="icon icon-chevron-down"></span>
                    </span>
                </div>

                {!isDisableSection && isAccordionOpen && (
                    <div className='redeem_egift_card_content'>
                        {!isOtpVerified && <div className='egift_header_wrapper'>
                            <div className='egift_header_title'>{redeemegifttitle}</div>
                            {!isOtpFormVisible && <div className='egift_header_subtitle'>{redeemegiftsubtitle}</div>}
                        </div>}

                        <div className='egift_form_wrapper'>
                            {isCardSectionVisible && !isOtpVerified && (
                                <form className='egift_redeem_get_code_form' onSubmit={handleGetCode}>
                                    <div className='egift_card_number_input'>
                                        <input
                                            className={`card_number ${errorMessageEmptyNumber ? 'error' : ''}`}
                                            id="egift_card_number"
                                            type="number"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                            disabled={isOtpFormVisible}
                                            placeholder={placeholders.egiftCardInputTitle}
                                        />
                                        {showErrorMessageGiftCardSelfTopup && <p className="error_message">{placeholders.giftCardTopupSelfErrorMessage}</p>}
                                        {errorMessageEmptyNumber && <p className="error_message">{placeholders.redeemEmptyCardNumberError}</p>}
                                        {showErrorMessageCard &&

                                            <p className="error_message">{placeholders.redeeEgiftInvalidCard}</p>
                                        }

                                    </div>
                                    <div className='egift_getcode_submit_button'>
                                        {showGetCode && (<input
                                            className='code_submit'
                                            id='egift_button'
                                            type='submit'
                                            value={placeholders.egiftGetcode}
                                        />)}
                                    </div>
                                </form>
                            )}

                            {isOtpFormVisible && !isOtpVerified && (
                                <form className='egift_otp_form' onSubmit={handleOTP}>
                                    <div>
                                        <div className='egift_otp_input'>
                                            <input
                                                className={`card_number_otp ${emptyOtp ? 'error' : ''}`}
                                                id="egift_otp"
                                                type="text"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                placeholder={placeholders.egiftCardInputPlaceholder}
                                                disabled={isDisableSection}
                                            />
                                            {emptyOtp && <p className="error_message">{placeholders.redeemeOtpEmptyError}</p>}

                                            {showErrorMessageOtp && <p className="error_message">
                                                {placeholders.redeemOtpErrorText}
                                            </p>}
                                        </div>

                                        {<div className='verify_otp'>
                                            <div>{placeholders.egictCardNoOtpText} <a onClick={handleGetCode}>{placeholders.egiftCardResendOtp}</a></div>
                                            <div><a onClick={handleChangeCard}>{placeholders.egiftCardChangeCard}</a></div>
                                        </div>}
                                    </div>
                                    <div className='egift_otp_verify_button'>
                                        <input
                                            className='otp_submit'
                                            id='otp_button'
                                            type='submit'
                                            value={placeholders.egiftCardVerify}
                                        />
                                    </div>
                                </form>
                            )}

                            {isOtpVerified && (
                                <div className='egift_card_overview'>
                                    <div className='egift_otp_input_3rd'>
                                        <div className='egift_header_title'>{placeholders.egiftCardAmountText} {appliedCardValue}</div>
                                        <div className='egift_header_subtitle'>{placeholders.egiftCardBalanceText} {totalCardBalance}</div>
                                        <div className='edit_link_text' onClick={handleRedeemEdit}>
                                            {placeholders.egiftCardEditAmount}
                                        </div>

                                        {balancePayment?.value > 0 && (
                                            <div className='egift_payment_difference'>
                                                <Icon className='icon_blue' name="info-blue" /> {amountToPayAboveRedeem}
                                            </div>
                                        )}
                                    </div>
                                    <div className='egift_remove_button'>
                                        <input
                                            className='egift_remove'
                                            id='remove_button'
                                            type='submit'
                                            value={placeholders.egiftCardRemove}
                                            onClick={handleEgiftRemove}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {isRedeemConfirmation && (
                    <RedeemEgiftCardModal
                        placeholders={placeholders}
                        handleCloseModal={handleCloseModal}
                        appliedCardValue={appliedCardValue}
                        totalCardBalance={totalCardBalance}
                        inputAmountRedeeme={inputAmountRedeeme}
                        setInputAmountRedeeme={setInputAmountRedeeme}
                        handleEditApplyAmount={handleEditApplyAmount}
                        inputRedeemAmountError={inputRedeemAmountError}
                        showModal={isRedeemConfirmation}
                    />
                )}
            </div>
        </div>
    );
});

export default RedeemEgiftCard;
