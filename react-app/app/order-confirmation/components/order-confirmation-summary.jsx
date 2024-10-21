import React, { useState, useContext, useEffect } from 'react';
import CartContext from '../../../context/cart-context.jsx';
import { getConfigValue } from '../../../../scripts/configs.js';
import getCityLocations from '../../../api/getCity.js';
import getStoreLocator from '../../../api/getStoreLocation.js';
import { generateStoreHours } from '../../checkout/components/collection-store/collection-store.jsx';
import Tooltip from '../../../library/tooltip/tooltip.jsx';

function Chevron({ isExpanded, onClick }) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label={isExpanded ? 'Collapse' : 'Expand'}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      style={{ cursor: 'pointer' }}
    >
      {isExpanded ? (
        <span className="accordian-chevron-up" />
      ) : (
        <span className="accordian-chevron-down" />
      )}
    </span>
  );
}

function SummaryItem({
  label,
  value,
  isAccordion = false,
  onClick,
  isExpanded,
}) {
  const summaryItemClass = isExpanded
    ? 'summary-item expanded-br'
    : 'summary-item';
  return (
    <div
      className={summaryItemClass}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>{label}</span>
      {isAccordion ? (
        <Chevron onClick={onClick} isExpanded={isExpanded} />
      ) : (
        <span>{value}</span>
      )}
    </div>
  );
}

function AccordionItem({ label, name, value }) {
  return (
    <div
      className="summary-item"
      style={{ display: 'flex', justifyContent: 'space-between' }}
    >
      <span>{label}</span>
      <span className="accordian-content">
        <span className="name">{name}</span>
        <span>{value}</span>
      </span>
    </div>
  );
}

function CollectStoredata({
  label,
  name,
  value,
  StorePhoneNumber,
  combineHours,
  latitude,
  longitude,
  getDirecttion,
}) {
  return (
    <div
      className="summary-item"
      style={{ display: 'flex', justifyContent: 'space-between' }}
    >
      <span>{label}</span>
      <span className="accordian-content">
        <span className="name">{name}</span>
        <span>{value}</span>
        <span>{StorePhoneNumber}</span>
        {combineHours && combineHours.length > 0 && (
          <span className="open-for-hours">
            {combineHours.map((hour) => (
              <span key={hour.label} className="day-hours">
                <span className="label">
                  {hour.label}
                  {' '}
                </span>
                <span className="value">
                  (
                  {hour.value}
                  )
                </span>
              </span>
            ))}
          </span>
        )}
        <span className="getDirection">
          <a
            href={`https://maps.google.com/?q=${latitude},${longitude}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {getDirecttion}
          </a>
        </span>
      </span>
    </div>
  );
}

function OrderConfirmationSummary({
  content,
  orderInfo,
  isOrderDetailExpanded,
  setIsOrderDetailExpanded,
  completeOrderData
}) {
  const { placeholders } = useContext(CartContext);
  const orderData = orderInfo;
  const [country, setCountry] = useState(null);
  const [cityLabel, setCitylabel] = useState(null);
  const [cityLoactionId, SetCityLocationId] = useState(null);
  const [storeLocation, setStoreLocation] = useState(null);
  const [openhours, setopenHours] = useState(null);
  const [areaCode, setAreaCode] = useState(null);
  const cashondelivery = 'cashondelivery';
  const [continueShoppingURL, setContinueShoppingURL] = useState(null);

  useEffect(() => {
    async function fetchCountry() {
      try {
        const countryName = await getConfigValue('country');
        const shoppingURL = await getConfigValue('cart-continue-to-shopping');
        setCountry(countryName);
        setContinueShoppingURL(shoppingURL);
      } catch (error) {
        console.error('Error:', error);
      }
    }
    fetchCountry();
  }, []);

  const data = orderData?.items?.[0];
  const emailId = data?.customer_email;
  const orderId = data?.increment_id;
  const customerMobileNumber = data?.billing_address?.telephone;
  const topupReceipientEmail = data?.extension_attributes?.topup_recipientemail;
  
  const getPaymentInfo = () => {
    let paymentMethodTitle = '';
    try {
     
      const methodsArray = content?.paymentMethods;
      const methodsActualArray = methodsArray?.find(
        (item) => item.querySelectorAll('tr > td')?.[0]?.innerText === data?.payment?.method,
      );

      paymentMethodTitle = methodsActualArray?.querySelectorAll('tr > td')[1].innerText;

      const hpsPayment = data?.payment?.additional_information?.find(d=>d.indexOf('payment_method') !== -1)
      const addditionalData = hpsPayment ? JSON.parse(hpsPayment) : null;
      if(addditionalData.payment_method !== data?.payment?.method && addditionalData.payment_method === 'hps_payment'){
        const hpsPaymentDetail = methodsArray?.find(
          (item) => item.querySelectorAll('tr > td')?.[0]?.innerText === 'hps_payment',
        );
        const hpsPaymentTitle =  hpsPaymentDetail?.querySelectorAll('tr > td')[1].innerText;
        if(hpsPaymentTitle){
          paymentMethodTitle += ` , ${hpsPaymentTitle}`;
        }
      }
    } catch (Err) {
      
    }
    return paymentMethodTitle;
  }

  const paymentTitle = getPaymentInfo();

  const totalCount = data?.total_qty_ordered;
  const shippingdescription = data?.shipping_description?.split(' - ');
  const expectedDeliveryTime = shippingdescription?.[1];
  const method = data?.extension_attributes?.shipping_assignments?.[0]?.shipping?.method;
  const findClickAndCollect = typeof method === 'string'
    && method.includes('click_and_collect_click_and_collect');
  const confirmationId = data?.extension_attributes?.payment_additional_info?.find(
    (item) => item.key === 'confirmation_id',
  );
  const payemtId = data?.extension_attributes?.payment_additional_info?.find(
    (item) => item.key === 'pun',
  );
  const resultCode = data?.extension_attributes?.payment_additional_info?.find(
    (item) => item.key === 'status_message',
  )
    ?? data?.extension_attributes?.payment_additional_info?.find(
      (item) => item.key === 'status',
    );
  const countryId = data?.extension_attributes?.shipping_assignments?.[0]?.shipping?.address
    ?.country_id;
  const storeCode = data?.extension_attributes?.shipping_assignments?.[0]?.shipping
    ?.extension_attributes?.store_code;
  const availableWithin = storeLocation?.sts_delivery_time_label;
  const earnedAuraPoint = data?.extension_attributes?.apc_accrued_points ?? 0;
  const redeemedAuraPoint = data?.extension_attributes?.apc_redeemed_points ?? 0;
  const memberEarn = data?.extension_attributes?.hm_accrued_points;

  const getEgiftInfo = () => {
    let egiftEmails = [];
    data.items?.forEach(d=>{
      if(d?.extension_attributes?.product_options?.[0]?.indexOf('hps_giftcard_recipient_email') != -1){
        const productOptions = JSON.parse(d.extension_attributes.product_options[0]);
        if(productOptions?.hps_giftcard_recipient_email){
          egiftEmails.push(productOptions?.hps_giftcard_recipient_email)
        }
      }
    })
    if(egiftEmails.length){
      return {
        label: placeholders.egiftCardTo ?? '',
        name: egiftEmails.join(', '),
        value: placeholders?.eGiftCardWillBeSentImmediately ?? ''
      }
    }
    return null;
  }

  const egiftInfo = getEgiftInfo();

  useEffect(() => {
    if (countryId) {
      const fetchCityLocations = async () => {
        try {
          const response = await getCityLocations(
            countryId,
            'address_city_segment',
          );
          setCitylabel(response?.response?.items?.[0]?.label);
          SetCityLocationId(response?.response?.items?.[0]?.location_id);
        } catch (error) {
          console.error('Error fetching city address locations:', error);
        }
      };
      fetchCityLocations();
    }
  }, [countryId]);

  useEffect(() => {
    if (storeCode) {
      const fetchStoreLocations = async () => {
        try {
          const response = await getStoreLocator(storeCode);
          const stores = response?.response?.items || [];
          const foundStore = stores.find(
            (item) => item.store_code === storeCode,
          );
          setStoreLocation(foundStore);
        } catch (error) {
          console.error('Error fetching store locations:', error);
        }
      };
      fetchStoreLocations();
    }
  }, [storeCode]);

  const shippingAddress = [];
  const shippingInfo = data?.extension_attributes?.shipping_assignments?.[0]?.shipping?.address;
  const shippingCustomerFirstName = shippingInfo?.firstname;
  const shippingCustomerLastName = shippingInfo?.lastname;
  const shippingCustomer = `${shippingCustomerFirstName} ${shippingCustomerLastName}`;
  if (shippingInfo) {
    if (shippingInfo?.country_id) {
      shippingAddress.push(country);
    }
    if (shippingInfo?.street) {
      shippingAddress.push(shippingInfo?.street?.[0]);
    }
    if (shippingInfo?.city) {
      shippingAddress.push(shippingInfo?.city);
    }
    if (shippingInfo?.extension_attributes?.address_building_segment) {
      shippingAddress.push(
        shippingInfo?.extension_attributes?.address_building_segment,
      );
    }
  }

  const billingAddress = [];
  const billingInfo = data?.billing_address;
  const billingCustomerFirstName = data?.billing_address?.firstname;
  const billingCustomerLastName = data?.billing_address?.lastname;
  const billingCustomer = `${billingCustomerFirstName} ${billingCustomerLastName}`;
  if (billingInfo) {
    if (data?.billing_address?.country_id) {
      billingAddress.push(country);
    }
    if (
      data?.billing_address?.extension_attributes?.address_city_segment
      === cityLoactionId
    ) {
      billingAddress.push(cityLabel);
    }
    if (data?.billing_address?.city) {
      billingAddress.push(data?.billing_address?.city);
    }
    if (data?.billing_address?.street) {
      billingAddress.push(data?.billing_address?.street?.[0]);
    }
    if (data?.billing_address?.extension_attributes?.address_building_segment) {
      billingAddress.push(
        data?.billing_address?.extension_attributes?.address_building_segment,
      );
    }
  }

  useEffect(() => {
    if (storeLocation) {
      const storehours = generateStoreHours(storeLocation?.store_hours);
      setopenHours(storehours);
    }
  }, [storeLocation]);

  const storeName = storeLocation?.store_name;
  const storeNumber = storeLocation?.store_phone;
  const getLatitude = storeLocation?.latitude;
  const getLongitude = storeLocation?.longitude;
  const codeArea = storeLocation?.address?.find(
    (item) => item.code === 'area',
  )?.value;

  useEffect(() => {
    if (countryId) {
      const fetchCityLocations = async () => {
        try {
          const response = await getCityLocations(countryId, 'area');
          const areanumber = response?.response?.items?.find(
            (item) => item.location_id === Number(codeArea),
          );
          setAreaCode(areanumber?.label);
        } catch (error) {
          console.error('Error fetching city address locations:', error);
        }
      };
      fetchCityLocations();
    }
  }, [countryId, codeArea]);

  const storeAddress = [];
  if (storeLocation) {
    if (storeLocation?.store_name) {
      storeAddress.push(storeName);
    }
    if (storeLocation?.address) {
      storeAddress.push(
        storeLocation?.address?.find((item) => item.code === 'street')?.value,
      );
    }
    if (storeLocation?.address) {
      storeAddress.push(
        storeLocation?.address?.find((item) => item.code === 'address')?.value,
      );
    }
    if (storeLocation?.address) {
      storeAddress.push(areaCode);
    }
    if (storeLocation?.address) {
      storeAddress.push(country);
    }
  }

  const orderdataValues = {
    email: emailId,
    orderNumber: orderId,
    transactionID: confirmationId?.value,
    paymentID: payemtId?.value,
    resultCode: resultCode?.value,
    shippingCustomerName: shippingCustomer,
    orderDetail: shippingAddress.join(', '),
    billingCustomerName: billingCustomer,
    billingAddress: billingAddress.join(', '),
    mobileNumber: customerMobileNumber,
    paymentMethod: paymentTitle,
    deliveryType: findClickAndCollect
      ? placeholders.clickCollect
      : placeholders.homeDelivery,
    expectedDelivery: expectedDeliveryTime,
    availableinstorewithin: `${expectedDeliveryTime} (${availableWithin})`,
    storeAddress: storeAddress.join(', '),
    storeName,
    storePhoneNumber: storeNumber,
    latitude: getLatitude,
    longitude: getLongitude,
    numberOfItems: totalCount,
    earnedPoints: earnedAuraPoint,
    redeemedPoint: redeemedAuraPoint,
    topupReceipientEmail: topupReceipientEmail
  };

  const toggleOrderDetailAccordion = () => {
    setIsOrderDetailExpanded(!isOrderDetailExpanded);
  };

  const handleContinueShooping = () => {
    window.location.href = `/${document.documentElement.lang}${continueShoppingURL}`;
  }
  return (
    <div className="order-confirmation-summary">
      <div className="order-confirmation-summary-main-title">
        <div className="circle" />
        <span>{placeholders.orderSuccessfullyReceived}</span>
      </div>
      <div className="order-confirmation-summary-main-content">
        <div className="heading">
          <span>{placeholders.orderSummaryTitle}</span>
        </div>
        <div className="summary">
          {emailId && (
            <SummaryItem
              label={placeholders.confirmationSentTo}
              value={orderdataValues.email}
            />
          )}
          {orderId && (
            <SummaryItem
              label={placeholders.orderNumber}
              value={orderdataValues.orderNumber}
            />
          )}
          {confirmationId && (
            <SummaryItem
              label={placeholders.transactionId}
              value={orderdataValues.transactionID}
            />
          )}
          {payemtId && (
            <SummaryItem
              label={placeholders.paymentId}
              value={orderdataValues.paymentID}
            />
          )}
          {payemtId && resultCode && (
            <SummaryItem
              label={placeholders.resultCode}
              value={orderdataValues.resultCode}
            />
          )}
          <SummaryItem
            label={placeholders.orderDetail}
            isAccordion
            onClick={toggleOrderDetailAccordion}
            isExpanded={isOrderDetailExpanded}
          />
          {isOrderDetailExpanded && (
            <>
              {findClickAndCollect ? (
                <CollectStoredata
                  label={placeholders.collectionStore}
                  name={orderdataValues.storeName}
                  value={orderdataValues.storeAddress}
                  StorePhoneNumber={orderdataValues.storePhoneNumber}
                  combineHours={openhours}
                  latitude={orderdataValues.latitude}
                  longitude={orderdataValues.longitude}
                  getDirecttion={placeholders.getdirections}
                />
              ) : (
                orderdataValues.orderDetail && (
                  <AccordionItem
                    label={placeholders.deliveryTo}
                    name={orderdataValues.shippingCustomerName}
                    value={orderdataValues.orderDetail}
                  />
                )
              )}
              {orderdataValues.paymentMethod !== cashondelivery
                && orderdataValues.billingAddress && (
                  <AccordionItem
                    label={placeholders.billingAddress}
                    name={orderdataValues.billingCustomerName}
                    value={orderdataValues.billingAddress}
                  />
                )}
              {egiftInfo && <AccordionItem
                label={egiftInfo.label}
                name={egiftInfo.name}
                value={egiftInfo.value}
              />}
              {orderdataValues?.topupReceipientEmail && <AccordionItem
                label={placeholders.reloadTo}
                name={orderdataValues?.topupReceipientEmail}
                value={placeholders?.giftCardTopupReloadAmountReflectLabel}
              />}
              {findClickAndCollect && (
                <SummaryItem
                  label={placeholders.collectionBy}
                  value={orderdataValues.shippingCustomerName}
                />
              )}
              {customerMobileNumber && (
                <SummaryItem
                  label={placeholders.mobileNumber}
                  value={orderdataValues.mobileNumber}
                />
              )}
              {orderdataValues.paymentMethod && (
                <SummaryItem
                  label={placeholders.paymentMethod}
                  value={orderdataValues.paymentMethod}
                />
              )}
              {method && (
                <SummaryItem
                  label={placeholders.deliveryType}
                  value={orderdataValues.deliveryType}
                />
              )}
              {!findClickAndCollect ? (
                orderdataValues.expectedDelivery && (
                  <SummaryItem
                    label={placeholders.expecteDeliveryWithin}
                    value={orderdataValues.expectedDelivery}
                  />
                )
              ) : (
                <SummaryItem
                  label={placeholders.availableinstorewithin}
                  value={orderdataValues.availableinstorewithin}
                />
              )}
              {memberEarn > 0
                && (
                  <div className="memberEarn">
                    <SummaryItem
                      label={placeholders?.memberEarn}
                      value={memberEarn}
                    />
                  </div>
                )}
              {orderdataValues.numberOfItems && (
                <SummaryItem
                  label={placeholders.numberOfItems}
                  value={orderdataValues.numberOfItems}
                />
              )}
            </>
          )}
        </div>
      </div>
      <div className="order-confirmation-summary-main-content aurapoints">
        {earnedAuraPoint > 0 && (
          <div className="summary earnedaurapoints">
            <SummaryItem
              label={placeholders.auraPointsEarned}
              value={orderdataValues.earnedPoints}
            />
            <Tooltip content={placeholders.earnedAurapointTooltipText}>
              <span className="auratooltipicon">?</span>
            </Tooltip>
          </div>
        )}
        {earnedAuraPoint > 0 && (
          <div className="download-text">
            <span dangerouslySetInnerHTML={{ __html: content.downloadText }} />
          </div>
        )}
        {(redeemedAuraPoint > 0 || redeemedAuraPoint < 0) && (
          <div className="summary redeemedaurapoints">
            <SummaryItem
              label={placeholders.auraPointsRedeemed}
              value={orderdataValues.redeemedPoint}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        className="continue-shooping"
        onClick={handleContinueShooping}
      >
        {content.continueShopping}
      </button>
    </div>
  );
}

export default OrderConfirmationSummary;
