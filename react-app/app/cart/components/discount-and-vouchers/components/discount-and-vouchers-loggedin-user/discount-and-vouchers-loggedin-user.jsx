import React, { useState, useEffect, useContext } from 'react';
import './discount-and-vouchers-loggedin-user.css';
import CartContext from '../../../../../../context/cart-context.jsx';
import getHelloMemberOffers from '../../../../../../api/getHelloMemberOffers';
import getHelloMemberCoupons from '../../../../../../api/getHelloMemberCoupons.js';
import applyMemberOffers from '../../../../../../api/applyMemberOffers.js';
import applyBonusVouchers from '../../../../../../api/applyBonusVouchers.js';
import Loader from '../../../../../../shared/loader/loader.jsx';
import { decorateIcons } from '../../../../../../../scripts/aem.js';
import getSubCartGraphql from '../../../../../../api/getSubCartGraphql.js';
import ApiConstants from '../../../../../../api/api.constants.js';
import { hasValue } from '../../../../../../utils/base-utils.js';

const voucher = 'voucher';
const offer = 'offer';

function DiscountAndVouchersLoggedinUser() {
  const {
    isLoggedIn, cartId, cart, setCart, placeholders,
  } = useContext(CartContext);
  const [activeTab, setActiveTab] = useState('voucher');
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [selectedVouchers, setSelectedVouchers] = useState([]);
  const [allVouchers, setAllVouchers] = useState([]);
  const [allOffers, setAllOffers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [offerError, setOfferError] = useState(null);
  const [voucherError, setVoucherError] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const appliedOffer = cart?.data?.extension_attributes?.cart?.extension_attributes?.applied_hm_offer_code;
  const appliedVoucherCodes = cart?.data?.extension_attributes?.cart?.extension_attributes?.applied_hm_voucher_codes;
  const appliedVouchers = appliedVoucherCodes?.split(',') ?? [];
  const appliedVouchersCount = appliedVouchers.length;

  useEffect(() => {
    setSelectedOffer(appliedOffer);
  }, [appliedOffer]);

  useEffect(() => {
    setSelectedVouchers(appliedVouchers);
  }, [appliedVoucherCodes]);

  useEffect(() => {
    if (document.querySelector('#discounts-vouchers-header')) {
      decorateIcons(document.querySelector('#discounts-vouchers-header'));
    }
    
    // Fetch offers and coupons
    const fetchOffersAndCoupons = async () => {
      try {
        const [couponsResponse, offersResponse] = await Promise.all([
          getHelloMemberCoupons(),
          getHelloMemberOffers(),
        ]);

        const coupons = couponsResponse?.response?.coupons ?? [];
        const offers = offersResponse?.response?.offers ?? [];
        let vouchers = [], nonVoucherCoupons = [];

        if (couponsResponse?.response?.error) {
          setVoucherError(couponsResponse?.response?.message ?? '');
        }
        else {
          coupons.forEach((coupon) => {
            if (coupon?.promotion_type === 'voucher') {
              vouchers.push(coupon);
            }
            else {
              nonVoucherCoupons.push(coupon);
            }
          });
  
          if (vouchers.length) {
            setAllVouchers(vouchers);
          }
        }

        if (offersResponse?.response?.error) {
          setOfferError(offersResponse?.response?.message ?? '');
        }
        else {
          if (offers.length || nonVoucherCoupons.length) {
            const allOffers = [...nonVoucherCoupons, ...offers];
            const filteredOffers = allOffers.filter((offer) => (!hasValue(offer.tag) || offer?.tag === 'O' || offer?.tag === 'E'));
            setAllOffers(filteredOffers);
          }
        }
      } catch (error) {
        console.error("Error fetching offers or coupons:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOffersAndCoupons();
  }, []);

  const handleRadioChange = (id) => {
    setSelectedOffer(id);
  };

  const handleCheckboxChange = (id) => {
    setSelectedVouchers((prevState) => (prevState.includes(id)
      ? prevState.filter((item) => item !== id)
      : [...prevState, id]));
  };

  const modifyDate = (dateToModify) => {
    const date = new Date(dateToModify);
    const options = { day: '2-digit', month: 'long', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
  };

  const isOfferSelected = selectedOffer !== null;
  const isVoucherSelected = selectedVouchers.length > 0;

  const applyButtonClass = ((activeTab === offer && isOfferSelected)
    || (activeTab === voucher && isVoucherSelected)
    || (activeTab === offer
      && isOfferSelected
      && activeTab === voucher
      && isVoucherSelected)) && !isRemoving && !isLoading
    ? 'apply-button active'
    : 'apply-button';

  const isClearAllDisabled = isApplying || isLoading;

  const updateButtonLoaderState = (state, shouldUpdateRemoveState) => {
    if (shouldUpdateRemoveState) setIsRemoving(state);
    else setIsApplying(state);
  };

  const getUpdatedCart = async () => {
    const result = await getSubCartGraphql(isLoggedIn, cartId, [ApiConstants.CART_QUERY__EXTENSION_ATTRIBUTE, ApiConstants.CART_QUERY__PRICES]);
    if (result) setCart({ ...cart, data: { ...cart?.data, ...result } });
  };

  const applyRemoveOffers = async (shouldRemove = false) => {
    setOfferError('');
    if (selectedOffer) {
      const selectedOfferItem = allOffers.find(
        (item) => item.code === selectedOffer,
      );

      if (selectedOfferItem) {
        try {
          const payload = !shouldRemove ? {
            offerCode: selectedOfferItem.code,
            offerType: '',
          } : null;
          updateButtonLoaderState(true, shouldRemove);
          const response = await applyMemberOffers(payload);

          if (response.response === true) {
            await getUpdatedCart();
          } else {
            setOfferError(response?.response?.message);
          }
        } catch (error) {
          console.error('Error applying offer', error);
          setOfferError('Failed to apply offer. Please try again.');
        } finally {
          updateButtonLoaderState(false, shouldRemove);
        }
      }
    }
  };

  const applyRemoveVouchers = async (shouldRemove = false) => {
    setVoucherError('');
    const selectedVoucherCodes = selectedVouchers
      ?.map((code) => {
        const selectedVoucher = allVouchers.find((item) => item.code === code);
        return selectedVoucher ? selectedVoucher.code : null;
      })
      .filter((code) => code !== null);

    try {
      const payload = !shouldRemove ? {
        voucherCodes: selectedVoucherCodes,
      } : null;
      updateButtonLoaderState(true, shouldRemove);
      const response = await applyBonusVouchers(payload);
      if (response.response === true) {
        await getUpdatedCart();
      } else {
        setVoucherError(response?.response?.message);
      }
    } catch (error) {
      console.error('Error applying voucher', error);
      setVoucherError('Failed to apply voucher. Please try again.');
    } finally {
      updateButtonLoaderState(false, shouldRemove);
    }
  };

  return (
    <>
      <div className="popup-header">
        <span className="popup-heading">{placeholders.discountLabel}</span>
      </div>
      <div className="discounts-vouchers-body">
        <div className="title-label">
          {appliedOffer ? (
            <p>
              {placeholders.memberOffersApplied}
              {' '}
              (1)
            </p>
          ) : null}
          {appliedVouchersCount ? (
            <p>
              {placeholders.bonusVouchersApplied}
              {' '}
              (
              {appliedVouchersCount}
              )
            </p>
          ) : null}
        </div>
        <div className="tabs">
          <button
            type="button"
            disabled={isLoading}
            className={`tab-button ${activeTab === voucher && !isLoading ? 'active' : ''}`}
            onClick={() => setActiveTab(voucher)}
          >
            {placeholders.bonusVouchers}
          </button>
          <button
            type="button"
            disabled={isLoading}
            className={`tab-button ${activeTab === offer && !isLoading ? 'active' : ''}`}
            onClick={() => setActiveTab(offer)}
          >
            {placeholders.memberOffers}
          </button>
        </div>
        <div className="tab-content">
          {
            isLoading
              ? <Loader />
              : (
                <>
                  {
                    activeTab === offer
                      ? offerError && <span className="error-messages">{offerError}</span>
                      : voucherError && (
                        <span className="error-messages">{voucherError}</span>
                      )
                  }
                  {
                    activeTab === offer
                      ? allOffers?.map((item) => (
                        <div key={`offer-${item?.code}`} id={`offer-${item?.code}`} onClick={() => handleRadioChange(item.code)} className="item discounts-vouchers-items">
                          <div>
                            <input
                              type="radio"
                              name="offer-selection"
                              checked={selectedOffer === item.code}
                              onChange={() => handleRadioChange(item.code)}
                              onClick={(e) => e.stopPropagation()}
                              className="radio-input round-radio"
                            />
                          </div>
                          <div>
                            <span className="desc-text">{item?.description}</span>
                            <span className="expiry_date">
                              {placeholders.bonusVouchersExpiresOn}
                              {' '}
                              {modifyDate(item?.end_date || item?.expiry_date)}
                            </span>
                          </div>
                        </div>
                      ))
                      : allVouchers?.map((item) => (
                        <div key={`voucher-${item?.id}`} id={`voucher-${item?.id}`} onClick={() => handleCheckboxChange(item.code)} className="item discounts-vouchers-items">
                          <div>
                            <input
                              type="checkbox"
                              name="voucher-selection"
                              checked={selectedVouchers.includes(item.code)}
                              onChange={() => handleCheckboxChange(item.code)}
                              onClick={(e) => e.stopPropagation()}
                              className="checkbox-input square-checkbox"
                            />
                          </div>
                          <div>
                            <span className="desc-text">{item?.description}</span>
                            <span className="expiry_date">
                              {placeholders.bonusVouchersExpiresOn}
                              {' '}
                              {modifyDate(item?.expiry_date)}
                            </span>
                          </div>
                        </div>
                      ))
                  }
                </>
              )
          }
        </div>
        <div className="popup-footer">
          <button
            type="button"
            onClick={() => (activeTab === offer ? applyRemoveOffers(false) : applyRemoveVouchers(false))}
            className={`${applyButtonClass} ${isApplying ? 'loader' : ''}`}
          >
            {!isApplying && (activeTab === offer ? placeholders.applyOffersText : placeholders.applyVouchersText)}
          </button>
          <button type="button" className={`clear-button ${isClearAllDisabled ? 'clear-button-disabled' : ''} ${isRemoving ? 'loader' : ''}`} onClick={() => 
            {
              if(activeTab === offer){
                 applyRemoveOffers(true);
                 setSelectedOffer(null);
                 }
                 else{
                  applyRemoveVouchers(true);
                  setSelectedVouchers([]);
                 }
            }}>
            {isRemoving ? '' : placeholders.clearAllText}
          </button>
        </div>
      </div>
    </>
  );
}

export default DiscountAndVouchersLoggedinUser;
