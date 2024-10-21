/* TODO: WIP and Eslints will be fixed with story completion */
/* eslint-disable */
import React, { useContext, useEffect, useState } from 'react';
import CartContext from '../../../context/cart-context.jsx';
import Loader from '../../../shared/loader/loader.jsx';
import estimateShippingMethods from '../../../api/estimateShippingMethods.js';
import { getConfigValue } from '../../../../scripts/configs.js';
import updateCart from '../../../api/updateCart.js';
import DeliveryInformationHeader from './delivery-information/delivery-information-header.jsx';
import Icon from '../../../library/icon/icon.jsx';
import getSubCartGraphql from '../../../api/getSubCartGraphql.js';
import ApiConstants from '../../../api/api.constants.js';
import { getTopupEgiftCardId } from '../../../utils/base-utils.js';

const CheckoutHomeDeliveryModal = ({ isVisible, onClose }) => {
  const { placeholders, cartId, isLoggedIn, cart, setCart, setCheckoutOOSDisable, deliveryInformation, setDeliveryInformation, userAddressList, setUserAddressList, editAddress, setEditAddress } = useContext(CartContext);
  const [loading, setLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState(true);
  const cartAddress = cart?.data?.extension_attributes?.cart;
  const shipAddress = cartAddress?.extension_attributes?.shipping_assignments?.[0]?.shipping?.address;
  const billAddress = cartAddress?.billing_address;
  const {
    deliveryInformationModalTitle = '',
    billingInformationModalTitle = '',
    changeAddressModalTitle = '',
    addNewAddress = '',
  } = placeholders;

  useEffect(() => {
    setShowAddressForm(!userAddressList?.length);
  }, [userAddressList]);

  useEffect(() => {
    if (showAddressForm) {
      const isNewForm = !editAddress;
      triggerLoadFormEvent(isNewForm);
    }
    else {
      setLoading(false);
    }
  }, [loading]);

  const loadAddressForm = (isNewForm, address = {}) => {
    setNewAddressForm(isNewForm);
    setEditAddress(address);
    setShowAddressForm(true);
    setLoading(true);
  };

  const triggerLoadFormEvent = async (newAddressForm = true) => {
    const checkoutHomeDelivery = document.getElementById('checkout-home-delivery');
    const endpoint = await getConfigValue('apimesh-endpoint');
    const config = {
      endpoint
    };

    const langCode = document.documentElement.lang;
    const addressPlaceHolders = window.placeholders[langCode ? `/${langCode}` : 'default'];
    window.dispatchEvent(new CustomEvent('react:loadAddressForm',
      {
        detail: {
          targetSelector: checkoutHomeDelivery,
          placeholder: addressPlaceHolders ? addressPlaceHolders : placeholders,
          newCustomer: true,
          isCheckoutPage: true,
          address: newAddressForm ? {} : editAddress,
          isLoggedIn,
          config,
          updateOnlyTelephone: deliveryInformation.updateOnlyTelephone,
          infoMessage: deliveryInformation.infoMessage
        }
      }
    ));
  };

  useEffect(() => {
    const handleAddressFormLoading = () => {
      setDeliveryInformation({ ...deliveryInformation, updateOnlyTelephone: false, infoMessage: '' });
    }

    const handleAddressFormLoaded = () => {
        setLoading(false);
    };

    const handleAddressFormSubmitted = async (event) => {
      const { isUpdate, address } = event?.detail;
      if (isLoggedIn) {
        if (!isUpdate) {
          setUserAddressList((prevAddressList) => [...prevAddressList, {...address}]);
          address['customer_address_id'] = address?.id;
          delete address?.id;
        }
        else {
          setUserAddressList(prevAddressList => 
            prevAddressList.map(item => 
              item.id === address.id ? { ...item, ...address } : item
            )
          );
          address['customer_address_id'] = address?.id;
          delete address?.id;
        }
      }
     
      if (deliveryInformation.changeAddress === 'billing') {
        const addressPayload = createAddressPayload(event.detail);
        await invokeUpdateCart(null, addressPayload, deliveryInformation.changeAddress);
        if (onClose) onClose();
        return;
      }
      invokeUpdateShippingAddress(event.detail);
    };

    window.addEventListener('react:addressFormLoading', handleAddressFormLoading);
    window.addEventListener('react:addressFormLoaded', handleAddressFormLoaded);
    window.addEventListener('react:addressFormSubmitted', handleAddressFormSubmitted);

    return () => {
      window.addEventListener('react:addressFormLoading', handleAddressFormLoading);
      window.removeEventListener('react:addressFormLoaded', handleAddressFormLoaded);
      window.removeEventListener('react:addressFormSubmitted', handleAddressFormSubmitted);
    };
  }, [deliveryInformation, setDeliveryInformation]);

  const selectAddress = async (event, arg1) => {

    const addressListDiv = document.querySelector('.delivery-information__address-list');
    const buttons = addressListDiv.querySelectorAll('button');
    buttons.forEach(button => button.setAttribute('disabled', 'true'));
    event.target.classList.add('loader');

    const { region, street, id, ...rest } = arg1;
    const addr = {
      address: {
        ...rest,
        street,
        customer_address_id: id
      }
    };

    if (deliveryInformation.changeAddress === 'billing') {
      addr.address.customer_address_id = id;
      await invokeUpdateCart(null, addr, deliveryInformation.changeAddress);
      if (onClose) onClose();

      return;
    }

    await invokeUpdateShippingAddress(addr);
  };

  const createAddressPayload = (arg1) => {
    const isAddrAttribute = arg1?.address?.custom_attributes?.find(
      (attribute) => attribute.attribute_code === 'address'
    );

    let customAttributes = arg1?.address?.custom_attributes || [];

    if (!isAddrAttribute) {
      customAttributes = [...arg1?.address?.custom_attributes, {
        attribute_code: 'address',
        name: 'address',
        value: arg1?.address?.address
      }];
    }

    const { country_code, id, customer_id, street, ...addressWithoutCountryCode } = arg1.address;

    const addressPayload = {
      address: {
        ...addressWithoutCountryCode,
        country_id: country_code || addressWithoutCountryCode.country_id,
        street: Array.isArray(street) ? street : [street],
        custom_attributes: customAttributes
      }
    };

    return addressPayload;
  };

  const showFormError = (message) => {
    const errorElement = document.createElement('div');
    errorElement.className = 'dialog-form-error';
    errorElement.innerHTML = message;

    const checkoutHomeDelivery = document.getElementById('checkout-home-delivery');
    if (checkoutHomeDelivery) {
      const form = checkoutHomeDelivery.querySelector('form');
      if (form) {
        checkoutHomeDelivery.insertBefore(errorElement, form);
        document.querySelector('.dialog__container.dialog__checkout-container').scrollTop = 0;
        document.querySelector('.address-form-button').classList.remove('loader')
      }
    }
  };

  const invokeUpdateShippingAddress = async (arg1) => {
    setDeliveryInformation({ ...deliveryInformation, isLoadingShippingMethods: true });

    const addressPayload = createAddressPayload(arg1);
    const availableShippingMethods = await estimateShippingMethods(addressPayload, cartId, isLoggedIn);
    setDeliveryInformation({ ...deliveryInformation, shippingMethods: (availableShippingMethods ?? []) });
    const firstShippingMethod = availableShippingMethods.find((method) => method.available) ?? null;

    if (!availableShippingMethods?.length) {
      window.dispatchEvent(
        new CustomEvent('react:showPageErrorMessage', {
          detail: { message: placeholders?.shippingMethodsNotAvailable },
        }),
      );
      window.dispatchEvent(
        new CustomEvent('react:dataLayerCartErrorsEvent', {
          detail: {
            eventLabel: 'shippingMethodsNotAvailable',
            eventAction: placeholders?.shippingMethodsNotAvailable,
            eventPlace: `Error occured on ${window.location.href}`,
          },
        }),
      );
      const errorNotification = document.querySelector(
        '.page-error-message.visible',
      );
      errorNotification.scrollIntoView({ behavior: 'smooth' });
      if (onClose) onClose();

      return;
    }

    const shipData = await invokeUpdateCart(firstShippingMethod, addressPayload, 'shipping');
    if (shipData === 'error') return;

    if (deliveryInformation.changeAddress !== 'shipping' || shipData === 'setbilling') {
      await invokeUpdateCart(null, addressPayload, 'billing');
    }

    if (onClose) onClose();
  };

  const invokeUpdateCart = async (firstShippingMethod, addressPayload, addressType) => {
    const createAddressBody = (type, action, additionalFields = {}) => ({
      [type]: {
        ...(type !== 'shipping' && addressPayload.address),
        ...additionalFields,
      },
      extension: {
        action,
      },
    });
    let customerCartId, customerLoggedIn;
    let addressBody;
    if (addressType === 'billing') {
      addressBody = createAddressBody('billing', 'update billing');
      customerCartId = getTopupEgiftCardId() ?? cartId
      customerLoggedIn = getTopupEgiftCardId() ? false : isLoggedIn
    } else {
      addressBody = createAddressBody('shipping', 'update shipping', {
        ...(firstShippingMethod && {
          shipping_carrier_code: firstShippingMethod.carrier_code,
          shipping_method_code: firstShippingMethod.method_code,
        }),
        shipping_address: {
          ...addressPayload.address,
        },
      });
      customerCartId = cartId
      customerLoggedIn = isLoggedIn
    }

    const response = await updateCart(addressBody, customerCartId, customerLoggedIn);


    if (response?.response_message?.[1] === 'success') {
      const shipping = cart?.data?.extension_attributes?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping;
      const shippingAddress = shipping?.address;
      window.dispatchEvent(new CustomEvent(
        'react:datalayerEvent',
        {
          detail: {
            type: 'saveAddressOnCheckoutPage',
            payload: {
              category: shippingAddress?.firstname ? 'update' : 'add',
              isValid: response?.response_message?.[1] === 'success' ? 1 : 0,
              addressType: deliveryInformation.changeAddress !== 'shipping' ? 'billing information' : 'delivery information'
            },
          },
        },
      ));
      window.dispatchEvent(new CustomEvent(
        'react:datalayerEvent',
        {
          detail: {
            type: 'add_shipping_info',
            payload: {
              value: response?.totals?.grand_total || 0,
              currency: response?.totals?.base_currency_code || "",
              coupon: cart?.data?.extension_attributes?.totals?.coupon_code ?? '',
              discount: cart?.data?.prices?.discount?.amount?.value || 0,
              shippingTier: response?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping?.extension_attributes?.click_and_collect_type,
              productData: cart?.data?.items?.filter((element) =>
                response?.cart?.items?.find((responseItem) => element?.extensionAttributes?.sku === responseItem?.sku)
              ).map((item) => {
                const gtmAttributes = item?.product?.gtm_attributes;
                return {
                  gtm: {
                    'gtm-magento-product-id': gtmAttributes?.id || '',
                    'gtm-name': gtmAttributes?.name || '',
                    'gtm-brand': gtmAttributes?.brand || '',
                    'gtm-category': gtmAttributes?.category || '',
                    'gtm-variant': gtmAttributes?.variant || '',
                    'gtm-stock': item?.configured_variant?.stock_status === 'IN_STOCK' ? 'in stock' : '',
                    'gtm-price': gtmAttributes?.price || '',
                  },
                  quantity: item.quantity,
                };
              }),
            },
          },
        },
      ));
      if (addressType !== 'billing') {
        const result = await getSubCartGraphql(isLoggedIn, cartId, [ApiConstants.CART_QUERY__PAYMENTS_METHODS, ApiConstants.CART_QUERY__MOBILE_NUMBER_VERIFIED]);
        if (result) {
          setCart((prevCart) => ({
            ...prevCart,
            data: {
              ...prevCart.data,
              available_payment_methods: result.available_payment_methods,
              prices: {
                ...cart?.data?.prices,
                grand_total: {
                  ...cart?.data?.prices?.grand_total,
                  value: response?.totals?.grand_total,
                },
              },
              extension_attributes: {
                ...prevCart.data.extension_attributes,
                totals: {
                  ...cart.data.extension_attributes.totals,
                  shipping_incl_tax: response?.totals?.shipping_incl_tax,
                },
                cart: {
                  ...prevCart.data.extension_attributes.cart,
                  extension_attributes: {
                    ...prevCart.data.extension_attributes.cart.extension_attributes,
                    mobile_number_verified: result?.extension_attributes?.cart?.extension_attributes?.mobile_number_verified,
                    shipping_assignments: response.cart?.extension_attributes?.shipping_assignments,
                  },
                },
              },
            },
          }));
        }

        if(!response.cart.billing_address.firstname){
          return 'setbilling';
        }
      } else {
        setCart((prevCart) => ({
          ...prevCart,
          data: {
            ...prevCart.data,
            prices: {
              ...cart?.data?.prices,
              grand_total: {
                ...cart?.data?.prices?.grand_total,
                value: response?.totals?.grand_total,
              },
            },
            extension_attributes: {
              ...prevCart.data.extension_attributes,
              totals: {
                ...cart.data.extension_attributes.totals,
                shipping_incl_tax: response?.totals?.shipping_incl_tax,
              },
              cart: {
                ...prevCart.data.extension_attributes.cart,
                billing_address: response.cart?.billing_address,
                extension_attributes: {
                  ...prevCart.data.extension_attributes.cart.extension_attributes,
                  shipping_assignments: response.cart?.extension_attributes?.shipping_assignments,
                },
              },
            },
          },
        }));
      }
    } else if (
      response?.response_message?.[1] !== 'success' && response?.response_message?.[0]?.includes('out of stock')
    ) {
      setDeliveryInformation(prev => ({ ...prev, isModalVisible: false }));
      showOutOfStockToast();
      setCheckoutOOSDisable(true);
      window.dispatchEvent(new CustomEvent(
        'react:datalayerEvent',
        {
          detail: {
            type: 'checkoutErrors',
            payload: {
              action: placeholders?.outOfStockToast,
              label: 'Cart contains some items which are not in stock'
            }
          },
        },
      ));
    } else if (response?.response_message?.[1] === 'error') {
      showFormError(response?.response_message?.[0]);
      return response?.response_message?.[1];
    }
  };

  const showOutOfStockToast = () => {
    window.dispatchEvent(
      new CustomEvent('react:showPageErrorMessage', {
        detail: { message: placeholders?.outOfStockToast },
      }),
    );
    window.dispatchEvent(
      new CustomEvent('react:dataLayerCartErrorsEvent', {
        detail: {
          eventLabel: 'out-of-stock',
          eventAction: placeholders?.outOfStockToast,
          eventPlace: `Error occured on ${window.location.href}`,
        },
      }),
    );
    const errorNotification = document.querySelector(
      '.page-error-message.visible',
    );
    errorNotification.scrollIntoView({ behavior: 'smooth' });
  };

  const renderLoader = () => (
    <div className="dialog-loader">
      <Loader />
    </div>
  );

  const modalTitle = deliveryInformation.changeAddress === 'billing' ? billingInformationModalTitle
    : deliveryInformationModalTitle;

  const addressFromCart = deliveryInformation.changeAddress === 'billing' ? billAddress : shipAddress;

  const renderAddressList = () => (
    <div className='delivery-information__address-container'>
      <button className='secondary delivery-information__new-address' onClick={() => loadAddressForm(true)}>{addNewAddress}</button>
      <div className="delivery-information__address-list">
        {
          userAddressList.length ? (
            userAddressList.map((address) => (
              <DeliveryInformationHeader
                key={address.id}
                shippingAddress={address}
                placeholders={placeholders}
                addressSelected={address.id === addressFromCart?.customer_address_id}
                handleSelectClick={(event) => selectAddress(event, address)}
                {...(deliveryInformation.changeAddress !== 'billing' && { handleEditClick: () => loadAddressForm(false, address) })}
              />
            ))
          ) : null
        }
      </div>
    </div>
  );

  if (!isVisible) return null;

  const isAddressList = userAddressList && !showAddressForm;

  const backToAddressList = () => {
    setShowAddressForm(false);
  };

  const shouldShowBackButton = !isAddressList && isLoggedIn;

  return (
    <>
      <div className="dialog-heading">
        <h2>
          {shouldShowBackButton && (
            <Icon
              name="arrow-left"
              className="dialog-back-icon"
              onIconClick={backToAddressList}
            />
          )}
          {isAddressList ? changeAddressModalTitle : modalTitle}
        </h2>
      </div>

      {loading && renderLoader()}

      {
        isAddressList
          ? renderAddressList()
          : (
            <div className='dialog-form__containter'>
              <div id="checkout-home-delivery" className='dialog-form'>
              </div>
            </div>
          )
      }
    </>
  );
}

export default CheckoutHomeDeliveryModal;