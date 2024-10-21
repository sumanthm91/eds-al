import React, { useContext, useEffect, useState } from 'react';
import CartContext from '../../../context/cart-context.jsx';
import { getConfigValue } from '../../../../scripts/configs.js';
import CheckoutMethodOption from './checkout-method-option/checkout-method-option.jsx';
import { getCustomer } from '../../../../scripts/customer/api.js';
import Icon from '../../../library/icon/icon.jsx';

function CheckoutDeliveryMethod({ onSelectedMethodChange }) {
  const {
    placeholders, cart, isLoggedIn, deliveryInformation, setDeliveryInformation, setUserAddressList, isCollectionDetails, selectedMethod, setSelectedMethod,
  } = useContext(CartContext);
  const [hideClickAndCollect, setHideClickAndCollect] = useState(false);
  const [isGlobalClickCollectDisabled, setIsGlobalClickCollectDisabled] = useState(false);

  const {
    deliveryMethodTitle = '',
    homeDelivery = '',
    clickCollect = '',
    homeDeliveryTitle = '',
    clickCollectTitle = '',
    clickCollectDisabled = '',
    deliveryInformationTitle = '',
    deliveryInformationBtnText = '',
    collectionStoreTitle = '',
    collectionStoreBtnText = '',
  } = placeholders;

  const items = cart?.data?.items;
  const isMultiBrandCart = cart?.data?.extension_attributes?.cart?.extension_attributes?.is_multi_brand_cart ?? false;
  // const isShippingAddressAvailable = !!cart?.data?.extension_attributes?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping?.address?.firstname;
  const isShippingAddressAvailable = cart?.data?.extension_attributes?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping?.extension_attributes?.click_and_collect_type === 'home_delivery';

  const fetchGlobalConfig = async () => {
    const isDisabled = await getConfigValue('global-click-collect-disabled');
    setIsGlobalClickCollectDisabled(isDisabled === 'true');
  };

  const determineHideClickAndCollect = () => {
    if (items && !isGlobalClickCollectDisabled) {
      const shouldHide = items.some((item) => item?.configured_variant?.reserve_and_collect === 2 && item?.configured_variant?.ship_to_store === 2);
      setHideClickAndCollect(shouldHide);
    }
  };

  useEffect(() => {
    fetchGlobalConfig();
    determineHideClickAndCollect();   
  }, [items]);

  useEffect(() => {
    const getSavedAddress = async () => {
      const customer = await getCustomer();
      if (customer?.addresses?.length) {
        setUserAddressList(customer.addresses);
      }
    };

    if (isLoggedIn) {
      getSavedAddress();
    }
  }, [isLoggedIn]);

  const handleDeliveryMethodChange = (event) => {
    const selectedValue = event.target.value;
    setSelectedMethod(selectedValue);
    onSelectedMethodChange(selectedValue);
    window.dispatchEvent(new CustomEvent(
      'react:datalayerEvent',
      {
        detail: {
          type: 'deliveryOption',
          payload: {
            deliverySelected: selectedValue === 'home_delivery' ? 'Home Delivery' : 'Click & Collect',
          },
        },
      },
    ));
  };

  const handleButtonClick = () => {
    if (selectedMethod === 'home_delivery') setDeliveryInformation({ ...deliveryInformation, isDialogOpen: true, isModalVisible: true, changeAddress: 'shipping' });
    else {
      // Add your collection store logic here
      setDeliveryInformation({ ...deliveryInformation, isDialogOpen: true, changeAddress: 'mapAddress' });
    }
  };

  const isClickAndCollectDisabled = isGlobalClickCollectDisabled || hideClickAndCollect || isMultiBrandCart;

  const deliveryMethods = [
    {
      id: 1,
      subTitle: homeDelivery,
      title: homeDeliveryTitle,
      icon: 'home-delivery',
      value: 'home_delivery',
    },
    {
      id: 2,
      subTitle: clickCollect,
      title: isClickAndCollectDisabled ? clickCollectDisabled : clickCollectTitle,
      icon: 'click-collect',
      value: 'click_and_collect',
      isDisabled: isClickAndCollectDisabled,
    },
  ];

  return (
    <>
      <div className="checkout__delivery-methods-container">
        <div className="checkout-title checkout__sub-container-title">
          {deliveryMethodTitle}
        </div>
        <div className="checkout__delivery-methods-wrapper">
          {deliveryMethods.map((method) => (
            // eslint-disable-next-line react/jsx-props-no-spreading
            <CheckoutMethodOption key={method.id} name="delivery-method" selectedMethod={selectedMethod} handleDeliveryMethodChange={handleDeliveryMethodChange} {...method} />
          ))}
        </div>
      </div>
      <div className="checkout__delivery-information">
        <div className="checkout__delivery_information_title checkout__sub-container-title">
          {selectedMethod === 'home_delivery' ? deliveryInformationTitle : collectionStoreTitle}
        </div>
        {selectedMethod === 'home_delivery' && !isShippingAddressAvailable && (
          <button type="button" className="checkout__delivery-information-btn" onClick={handleButtonClick}>
            <div>
              {deliveryInformationBtnText}
              <Icon name="arrow-right" className="checkout-btn-arrow" />
            </div>
          </button>
        )}
        {selectedMethod !== 'home_delivery' && !isCollectionDetails && (
          <button type="button" className="checkout__delivery-information-btn" onClick={handleButtonClick}>
            <div>
              {collectionStoreBtnText}
              <Icon name="arrow-right" className="checkout-btn-arrow" />
            </div>
          </button>
        )}
      </div>
    </>
  );
}

export default CheckoutDeliveryMethod;