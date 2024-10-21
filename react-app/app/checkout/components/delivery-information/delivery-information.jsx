import React, { useContext, useEffect, useState, useMemo } from 'react';
import './delivery-information.css';
import CheckoutMethodOption from '../checkout-method-option/checkout-method-option';
import CartContext from '../../../../context/cart-context';
import { formatPrice } from '../../../../utils/base-utils';
import estimateShippingMethods from '../../../../api/estimateShippingMethods';
import Loader from '../../../../shared/loader/loader';
import { getConfigValue } from '../../../../../scripts/configs';
import DeliveryInformationHeader from './delivery-information-header';
import getSubCartGraphql from '../../../../api/getSubCartGraphql';
import ApiConstants from '../../../../api/api.constants';
import updateCart from '../../../../api/updateCart';

function DeliveryInformation() {
  const {
    cart, setCart, cartId, isLoggedIn, placeholders, deliveryInformation, setDeliveryInformation, setEditAddress, userAddressList,
    setDeliveryFeeLoader,
  } = useContext(CartContext);
  const [selectedMethod, setSelectedMethod] = useState();
  const [shippingMethods, setShippingMethods] = useState([]);
  const [currency, setCurrency] = useState('');
  const availableShippingMethods = deliveryInformation.shippingMethods;
  const shipping = useMemo(() => { return cart?.data?.extension_attributes?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping }, [cart]);
  const shippingAddress = useMemo(() => { return shipping?.address; }, [shipping, cart]);

  const getFormattedPrice = async (amount) => {
    let price = placeholders.shippingMethodFreeLabel;
    if (amount) {
      price = await formatPrice(currency, amount);
    }
    return price;
  };

  useEffect(() => {
    const fetchShippingMethods = async () => {
      if (availableShippingMethods) {
        const methods = await Promise.all(
          availableShippingMethods
            .filter((method) => method.method_code !== 'click_and_collect')
            .map(async (method, index) => ({
              id: index + 1,
              title: method.method_title,
              subTitle: method.carrier_title,
              value: `${method.carrier_code}_${method.method_code}`,
              subTitleRight: await getFormattedPrice(method.amount),
              info: method.error_message,
              methodCode: method.method_code,
              carrierCode: method.carrier_code,
              isDisabled: !method.available,
            })),
        );
        setShippingMethods(methods);
      }
    };

    fetchShippingMethods();
  }, [availableShippingMethods]);

  useEffect(() => {
    const fetchCurrency = async () => {
      const configValue = await getConfigValue('currency');
      setCurrency(configValue);
    };
    fetchCurrency();
  }, []);

  const getShippingMethods = async () => {
    if (shippingAddress?.firstname) {
      setDeliveryInformation({ ...deliveryInformation, isLoadingShippingMethods: true });
      const shippingBody = {
        address: {
          city: shippingAddress?.city,
          country_id: shippingAddress?.country_id,
          custom_attributes: shippingAddress?.custom_attributes,
          email: shippingAddress?.email,
          firstname: shippingAddress?.firstname,
          lastname: shippingAddress?.lastname,
          lastname: shippingAddress?.lastname,
          street: shippingAddress?.street,
          telephone: shippingAddress?.telephone
        }
      };
      const allShippingMethods = await estimateShippingMethods(shippingBody, cartId, isLoggedIn);
      setDeliveryInformation({ ...deliveryInformation, shippingMethods: (allShippingMethods ?? []), isLoadingShippingMethods: false });
      window.dispatchEvent(new CustomEvent(
        'react:datalayerEvent',
        {
          detail: {
            type: 'add_shipping_info',
            payload: {
              value: cart?.data?.prices?.grand_total?.value || 0,
              currency: cart?.data?.prices?.grand_total?.currency || "",
              coupon: cart?.data?.extension_attributes?.totals?.coupon_code ?? '',
              discount: cart?.data?.prices?.discount?.amount?.value || 0,
              shippingTier: cart?.data?.extension_attributes?.cart?.extension_attributes?.shipping_assignments?.[0]?.shipping?.extension_attributes?.click_and_collect_type,
              productData: cart?.data?.items?.map((item) => {
                const gtmAttributes = item?.product?.gtm_attributes;
                return {
                  gtm: {
                    'gtm-main-sku': gtmAttributes?.id || '',
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
    }
  };
  useEffect(() => {
    if (shipping?.extension_attributes?.click_and_collect_type === 'home_delivery') {
      getShippingMethods();
    }
  }, [shipping?.extension_attributes?.click_and_collect_type]);

  useEffect(() => {
    if (!shipping?.method && deliveryInformation?.shippingMethods && deliveryInformation.shippingMethods.length > 0 && shippingAddress?.firstname) {
      const selectedShipping = deliveryInformation?.shippingMethods?.find((item) => item?.available)
      const concatedShippingCode = `${selectedShipping?.carrier_code}_${selectedShipping?.method_code}`
      setSelectedMethod(concatedShippingCode)
      const payload = {
        shipping: {
          shipping_address: shippingAddress,
          shipping_carrier_code: selectedShipping?.carrier_code,
          shipping_method_code: selectedShipping?.method_code,
        },
        extension: {
          action: 'update shipping',
        },
      };
      const updateData = async () => {
        const updatedCartData = await updateCart(payload, cartId, isLoggedIn);
        setCart({
          ...cart,
          data: {
            ...cart?.data,
            prices: {
              ...cart?.data?.prices,
              grand_total: {
                ...cart?.data?.prices?.grand_total,
                value: updatedCartData?.totals?.grand_total,
              },
            },
            extension_attributes: {
              ...cart.data.extension_attributes,
              totals: {
                ...cart.data.extension_attributes.totals,
                shipping_incl_tax: updatedCartData?.totals?.shipping_incl_tax,
              },
              cart: {
                ...cart.data.extension_attributes.cart,
                extension_attributes: {
                  ...cart.data.extension_attributes.cart.extension_attributes,
                  shipping_assignments: updatedCartData.cart.extension_attributes.shipping_assignments,
                  surcharge: updatedCartData.cart.extension_attributes.surcharge,
                }
              }
            },
          },
        });
      }
      updateData();
    }
    else setSelectedMethod(shipping?.method);
  }, [shipping?.method, deliveryInformation?.shippingMethods, shippingAddress]);

  const getUpdatedPaymentMethods = async (updatedCartData) => {
    const availablePaymentMethods = await getSubCartGraphql(isLoggedIn, cartId, [ApiConstants.CART_QUERY__PAYMENTS_METHODS]);
    if (availablePaymentMethods) {
      setDeliveryFeeLoader(false);
      setCart({
        ...cart,
        data: {
          ...cart?.data,
          ...availablePaymentMethods,
          prices: {
            ...cart?.data?.prices,
            grand_total: {
              ...cart?.data?.prices?.grand_total,
              value: updatedCartData?.totals?.grand_total,
            },
          },
          extension_attributes: {
            ...cart.data.extension_attributes,
            totals: {
              ...cart.data.extension_attributes.totals,
              shipping_incl_tax: updatedCartData?.totals?.shipping_incl_tax,
              total_segments: updatedCartData?.totals?.total_segments
            },
            cart: {
              ...cart.data.extension_attributes.cart,
              extension_attributes: {
                ...cart.data.extension_attributes.cart.extension_attributes,
                surcharge: updatedCartData?.cart?.extension_attributes?.surcharge,
              }
            }
          },
        },
      });
    }
  };

  const handleDeliveryMethodChange = async (event, method) => {
    setDeliveryFeeLoader(true);
    const selectedValue = event.target.value;
    setSelectedMethod(selectedValue);
    const clonedShippingAddress = {...shippingAddress};
    delete clonedShippingAddress.extension_attributes;
    const payload = {
      shipping: {
        shipping_address: clonedShippingAddress,
        shipping_carrier_code: method.carrierCode,
        shipping_method_code: method.methodCode,
      },
      extension: {
        action: 'update shipping',
      },
    };
    const cartResponse = await updateCart(payload, cartId, isLoggedIn);
    getUpdatedPaymentMethods(cartResponse);
  };

  const renderShippingMethods = () => {
    const filteredShippingMethods = shippingMethods?.filter((method) => !method.isHidden) ?? [];
    return filteredShippingMethods.map((method, index) => (
      <React.Fragment key={`shipping-method-${method.id}`}>
        <CheckoutMethodOption
          className="checkout__shipping-method-option"
          name="shipping-method"
          selectedMethod={selectedMethod}
          handleDeliveryMethodChange={(event) => handleDeliveryMethodChange(event, method)}
          // eslint-disable-next-line react/jsx-props-no-spreading
          {...method}
        />
        {index < filteredShippingMethods.length - 1 && <div className="divider" />}
      </React.Fragment>
    ));
  };

  const handleChangeClick = (address) => {
    setEditAddress(address);
    setDeliveryInformation({
      ...deliveryInformation, isDialogOpen: true, isModalVisible: true, changeAddress: 'shipping',
    });
  };

  const defaultDeliveryUIRender = () => {
    if (shipping?.extension_attributes?.click_and_collect_type === 'home_delivery' && availableShippingMethods?.length) {
      return (
        <div className="checkout__delivery-information__wrapper">
          {
            shippingAddress?.firstname
              ? (
                <DeliveryInformationHeader
                  shippingAddress={shippingAddress}
                  placeholders={placeholders}
                  handleChangeClick={() => handleChangeClick(shippingAddress)}
                />
              )
              : null
          }
          {
            deliveryInformation.isLoadingShippingMethods
              ? <Loader />
              : availableShippingMethods?.length > 0 && (
                <>
                  <div className="divider" />
                  {renderShippingMethods()}
                </>
              )
          }
        </div>
      );
    }
    return null;
  };
  return (
    !deliveryInformation?.isLoadingShippingMethods
      ? (defaultDeliveryUIRender()) : (<Loader />)
  );
}

export default DeliveryInformation;
