import React, { useContext } from 'react';
import './billing-information.css';
import CartContext from '../../../../context/cart-context';
import DeliveryInformationHeader from '../delivery-information/delivery-information-header.jsx';
import AppConstants from '../../../../utils/app.constants.js';

function BillingInformation({ selectedMethod }) {
  const {
    cart,
    placeholders,
    deliveryInformation,
    setDeliveryInformation,
    setEditAddress,
    isHideSectionInCheckout,
    methods,
    isTopupFlag
  } = useContext(CartContext);

  const {
    billingAddressTitle = 'Billing Address',
    deliveryInformationBtnText = '',
  } = placeholders;

  const billingAddress = cart?.data?.extension_attributes?.cart?.billing_address;
  const handleChangeClick = (address) => {
    setEditAddress(address);
    setDeliveryInformation({
      ...deliveryInformation, isDialogOpen: true, isModalVisible: true, changeAddress: 'billing',
    });
  };

  const isCashOnDeliverySelected = methods?.find((method) => method.code === AppConstants.PAYMENT_METHOD_CODE_COD)?.isSelected || false;
  const handleButtonClick = () => {
    setDeliveryInformation({
      ...deliveryInformation, isDialogOpen: true, isModalVisible: true, changeAddress: 'billing',
    });
  };
  if ((isHideSectionInCheckout && !billingAddress?.firstname) || (isTopupFlag && !billingAddress?.firstname) || (selectedMethod !== 'home_delivery' && !billingAddress?.firstname)) {
    return (
      <>
        <div className="checkout__billing-information-title checkout__sub-container-title">
          {billingAddressTitle}
        </div>
        <button type="button" className="checkout__delivery-information-btn" onClick={handleButtonClick}>
          {deliveryInformationBtnText}
        </button>
      </>
    );
  }

  const defaultRenderUI = ((!isCashOnDeliverySelected && billingAddress?.firstname && !isHideSectionInCheckout) || (isTopupFlag && billingAddress?.firstname) || (isHideSectionInCheckout && billingAddress?.firstname));
  console.log(defaultRenderUI, "defaultRenderUI", billingAddress)
  return (
    defaultRenderUI ? (
      <div className="checkout__billing-information">
        <div className="checkout__billing-information-title checkout__sub-container-title">
          {billingAddressTitle}
        </div>
        <div className="checkout__billing-information-wrapper">
          <div className="checkout__billing-information__header">
            <DeliveryInformationHeader
              shippingAddress={billingAddress}
              placeholders={placeholders}
              handleChangeClick={() => handleChangeClick(billingAddress)}
            />
          </div>
        </div>
      </div>
    ) : null
  );
}

export default BillingInformation;
