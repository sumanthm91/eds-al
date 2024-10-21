import React, { useEffect, useRef, useState } from "react";
import { decorateIcons } from '../../../../../scripts/aem.js';
import { getConfigValue } from '../../../../../scripts/configs.js';

const RedeemEgiftCardModal = ({
    placeholders,
    handleCloseModal,
    appliedCardValue,
    totalCardBalance,
    inputAmountRedeeme,
    setInputAmountRedeeme,
    handleEditApplyAmount,
    inputRedeemAmountError,
    showModal
}) => {
    const closeIconRef = useRef(null);
    const [currency, setCurrency] = useState('');

    useEffect(() => {
        if (showModal && closeIconRef.current) {
            decorateIcons(closeIconRef.current);
        }

        const fetchCurrency = async () => {
            const configValue = await getConfigValue('currency');
            setCurrency(configValue);
        }

        fetchCurrency();
    }, [showModal]);

    return (
        <div className="redeem_popup_overlay">
            <div id="redeem-popup-modal" className="redeem_popup_main">
                <div className='redeem_popup_head'>
                    <p className='redeem_popup_title'>{placeholders.egiftCardEditAmount}
                        <a
                            onClick={handleCloseModal}
                            onKeyUp={handleCloseModal}
                            role="button"
                            tabIndex={0}
                            className="close_icon_redeem"
                            ref={closeIconRef}
                        >
                            <span className="icon icon-close"></span>
                        </a>
                    </p>
                </div>

                <div className='redeem_popup_body'>
                    <div className="popup_body_main">
                        <p className='redeem_info_text'>
                            <span>{placeholders.egiftCardAmountText} </span>
                            <span>{appliedCardValue}</span>
                        </p>
                        <p className='redeem_info_subtext'>
                            <span>{placeholders.egiftCardBalanceText} </span>
                            <span>{totalCardBalance}</span>
                        </p>
                    </div>

                    <div className="redeem_confirmation_container">
                        <input className='redeem_confirmation_input' type="number" onChange={(e) => setInputAmountRedeeme(e.target.value)} placeholder={placeholders.egiftAmountText} value={inputAmountRedeeme} />
                        <span className="open-amount-currency">{currency}</span>
                        {inputRedeemAmountError && <p className='error_message'>{inputRedeemAmountError}</p>}
                    </div>

                    <div className="popup_footer_redeem">
                        <button type="button" autoFocus onClick={handleEditApplyAmount} className="edit_ecard_amount_btn">
                            {placeholders.egiftCardPopupButton}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RedeemEgiftCardModal;