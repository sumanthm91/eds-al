import React, {
  useEffect, useState, useMemo, useContext,
} from 'react';
import CartContext from '../../../context/cart-context.jsx';
import getProducts from '../../../api/getProducts.js';
import PurchasedProduct from './product.jsx';
import useCurrencyFormatter from '../../../utils/hooks/useCurrencyFormatter.jsx';
import Tooltip from '../../../library/tooltip/tooltip.jsx';
import Icon from '../../../library/icon/icon.jsx';
import AppConstants from '../../../utils/app.constants.js';

function OrderConfirmationItemBillSummary({ orderInfo, content }) {
  const [productsData, setProductsData] = useState([]);
  const { placeholders, isLoggedIn } = useContext(CartContext);
  const [isLoading, setisLoading] = useState(true);
  const [isEgiftPay, setIsEgiftPay] = useState(false);
  const [amountPaid, setAmountPaid] = useState(0);
  const customerOrderData = orderInfo;
  const completeProductData = customerOrderData?.items?.[0]
  const allProductsSkuId = customerOrderData?.items?.[0]?.items || [];
  const totalQuantity = customerOrderData?.items?.[0]?.total_qty_ordered;
  const orderSummaryCountTitle = content?.checkoutOrderSummaryTitle?.replace(
    '{{COUNT}}',
    totalQuantity,
  );
  const isTopupItem = productsData?.filter(item => item?.sku === AppConstants.GIFT_CARD_TOPUP)

  const checkMethod = customerOrderData?.items?.[0]?.extension_attributes?.shipping_assignments?.[0]?.shipping?.method;
  const findDeliveryType = typeof checkMethod === 'string'
    && checkMethod.includes('click_and_collect_click_and_collect');

  const methodsArray = content?.paymentMethods;
  const paymentMethodTitle = customerOrderData?.items?.[0]?.payment?.method;
  const methodsActualArray = methodsArray?.find(
    (item) => item.querySelectorAll('tr > td')?.[0]?.innerText === paymentMethodTitle,
  );
  const setPayMentTitle = methodsActualArray?.querySelectorAll('tr > td')[1].innerText;

  const isAllEgift = customerOrderData?.items?.[0]?.items?.every(d=>d?.extension_attributes?.product_options?.[0]?.indexOf('hps_giftcard_recipient_email') != -1)

  const subtotal = useCurrencyFormatter({
    price: customerOrderData?.items?.[0]?.subtotal_incl_tax,
  });
  const formatDiscount = useCurrencyFormatter({
    price: customerOrderData?.items?.[0]?.discount_amount,
  });
  const discount = customerOrderData?.items?.[0]?.discount_amount;
  const grandTotal = customerOrderData?.items?.[0]?.grand_total;
  const orderTotal = useCurrencyFormatter({ price: grandTotal });
  const payWithEGiftCard = customerOrderData?.items?.[0]?.extension_attributes?.hps_redeemed_amount;
  const amountEGiftWithCurrency = useCurrencyFormatter({ price: payWithEGiftCard });
  const formatShippingAmount = useCurrencyFormatter({
    price: customerOrderData?.items?.[0]?.shipping_incl_tax,
  });
  const shippingAmount = customerOrderData?.items?.[0]?.shipping_incl_tax;
  const formatSurchargeIncTax = useCurrencyFormatter({
    price:
      customerOrderData?.items?.[0]?.extension_attributes?.surcharge_incl_tax,
  });
  const surchargeIncTax = customerOrderData?.items?.[0]?.extension_attributes?.surcharge_incl_tax;
  const method = customerOrderData?.items?.[0]?.extension_attributes
    ?.shipping_assignments?.[0]?.shipping?.method;
  const findClickAndCollect = typeof method === 'string'
    && method.includes('click_and_collect_click_and_collect');
  const appliedTaxes = customerOrderData?.items?.[0]?.extension_attributes?.applied_taxes ?? [];
  const taxesTotal = appliedTaxes.reduce(
    (acc, tax) => acc + (tax.amount.value ?? 0),
    0,
  );
  const paidByAuraPoints = customerOrderData?.items?.[0]?.extension_attributes?.aura_payment_value;
  const formatPaidByAuraPoints = useCurrencyFormatter({
    price: paidByAuraPoints,
  });
  const frmattedAmountPaid = useCurrencyFormatter({
    price: amountPaid,
  });
  const baseGrandTotal = customerOrderData?.items?.[0]?.base_grand_total;
  const balancePayable = Math.max(baseGrandTotal - paidByAuraPoints, 0);
  const formatBalancePayable = useCurrencyFormatter({ price: balancePayable });
  const codeServiceCharge = placeholders?.cashondeliveryServicechargeTooltiptext;
  const updatecodeServiceCharge = codeServiceCharge?.replace(
    '{{codcharge}}',
    formatSurchargeIncTax,
  );
  const voucherDiscount = customerOrderData?.items?.[0]?.extension_attributes?.hm_voucher_discount;
  const formatvoucherDiscount = useCurrencyFormatter({
    price: voucherDiscount,
  });
  const voucherCodes = customerOrderData?.items?.[0]?.extension_attributes
    ?.applied_hm_voucher_codes;
  const voucherCodeCount = voucherCodes?.split(',')?.length;
  const aplliedVoucherText = placeholders?.bounsVoucherCountTitle?.replace(
    '{{count}}',
    voucherCodeCount,
  );

  const discountToolTipContent = useMemo(() => {
    const extensionAttributes = customerOrderData?.items?.[0]?.extension_attributes;
    // const hasExclusiveCoupon = !!extensionAttributes?.has_exclusive_coupon;
    const hasHMOfferCode = !!extensionAttributes?.applied_hm_offer_code;
    // const couponCode = customerOrderData?.items?.[0]?.coupon_code ?? "";
    const hasAdvantageCard = customerOrderData?.items?.[0]?.coupon_code === 'advantage_card';
    let tooltipData = `<div className="applied-discounts-title">${placeholders.discountTooltipMessageApplied}</div>`;

    // if (hasExclusiveCoupon) {
    //   tooltipData += `<div className="applied-exclusive-couponcode">${couponCode}</div>`;
    //   return tooltipData;
    // }

    if (hasHMOfferCode) {
      tooltipData = `<div className="applied-hm-discounts-title">${placeholders.discountTooltipMessageMemberDiscount}</div>`;
    }

    if (hasAdvantageCard) {
      tooltipData += `<div class="promotion-label"><strong>${placeholders.discountTooltipMessageAdvantageCardDiscount}</strong></div>`;
    }

    return tooltipData;
  }, [customerOrderData]);

  const uniqueProducts = useMemo(() => {
    const uniqueItems = [];
    const seenSkuIds = new Set();
    allProductsSkuId.forEach((item) => {
      if (!seenSkuIds.has(item.sku) || (item?.is_virtual == 1)) {
        seenSkuIds.add(item.sku);
        uniqueItems.push(item);
      }
    });

    return uniqueItems;
  }, [allProductsSkuId]);

  async function getItems(skuId) {
    try {
      const product = await getProducts(skuId);
      const data = product?.response?.data?.commerce_products?.items?.[0];

      if (data) {
        if (data?.assets_cart) {
          data.assets_cart = JSON.parse(data.assets_cart);
        }

        const matchingVariant = data?.variants?.find((item) => item?.product?.sku?.includes(skuId));

        if (matchingVariant) {
          if (matchingVariant?.product?.dynamicAttributes) {
            matchingVariant.product.dynamicAttributes = JSON.parse(
              matchingVariant.product.dynamicAttributes,
            );
          }

          data.variants = matchingVariant;
        }
      }
      return data;
    } catch (error) {
      console.error(`Error fetching product details for SKU ${skuId}:`, error);
      return null;
    }
  }

  useEffect(() => {
    const extAttr = customerOrderData?.items?.[0]?.extension_attributes;
    if (extAttr?.hps_redeemed_amount > 0) {
      setIsEgiftPay(true);
      setAmountPaid(grandTotal - extAttr.hps_redeemed_amount);
    } else {
      setIsEgiftPay(false);
      setAmountPaid(0);
    }

  }, [customerOrderData?.items?.[0]?.extension_attributes]);

  useEffect(() => {
    async function fetchAllProducts() {
      const allProductData = await Promise.all(
        uniqueProducts.map((product) => getItems(product.sku)),
      );
      setProductsData(allProductData);
      window.dispatchEvent(
        new CustomEvent('react:datalayerEvent', {
          detail: {
            type: 'PurchaseView',
            payload: {
              discountAmount: customerOrderData?.items?.[0]?.discount_amount,
              currency: customerOrderData?.items?.[0]?.base_currency_code,
              transaction_id: customerOrderData?.items?.[0]?.extension_attributes?.payment_additional_info?.find(
                (item) => item.key === 'confirmation_id',
              )?.value,
              value: customerOrderData?.items?.[0]?.base_grand_total,
              tax: taxesTotal,
              shipping: shippingAmount,
              shipping_tier: findDeliveryType ? 'Click & Collect' : 'Home Delivery',
              login_method: isLoggedIn ? 'Logged In' : 'Guest Login',
              coupon: customerOrderData?.items?.[0]?.coupon_code,
              payment_type: setPayMentTitle,
              delivery_option: findDeliveryType ? 'Click & Collect' : 'Home Delivery',
              items: allProductData.map((item, index) => {
                const itemCategories = item?.gtm_attributes?.category?.split('/') || [];
                return {
                  item_id: item?.gtm_attributes?.id,
                  item_name: item?.gtm_attributes?.name,
                  affiliation: 'Online Store',
                  index,
                  item_list_id: item?.sku,
                  item_list_name: item?.name,
                  item_brand: item?.gtm_attributes?.brand,
                  item_category: item?.gtm_attributes?.category,
                  item_category2: itemCategories[0] || null,
                  item_category3: itemCategories[1] || null,
                  item_category4: itemCategories[2] || null,
                  item_category5: itemCategories[3] || null,
                  item_variant: item?.gtm_attributes?.variant,
                  price: item?.gtm_attributes?.price,
                  item_color: item?.variants?.product?.dynamicAttributes?.color_label,
                  item_size: item?.variants?.product?.dynamicAttributes?.size_label,
                };
              }),
            },
          },
        }),
      );
      setisLoading(false);
    }

    fetchAllProducts();
  }, [uniqueProducts]);

  return (
    <div>
      <span className="orderSummaryCountTitle">{orderSummaryCountTitle}</span>
      <div
        className={`confirmed-order-items-list ${isLoading ? 'ordersectionheight' : ''}`}
      >
        {productsData.map((product, index) => (
          <PurchasedProduct
            key={`item-${product.sku}-${index}`}
            product={product}
            index={index}
            uniqueProducts={uniqueProducts}
            completeOrderData={completeProductData}
          />
        ))}
      </div>
      <div className="confirmed-order-summary">
        {subtotal && (
          <div className="complete-bill-line">
            <span>{placeholders?.subTotalLabel}</span>
            <span>{subtotal}</span>
          </div>
        )}
        {discount !== 0 && (
          <div className="complete-bill-line discount-color">
            <span>
              {placeholders?.discountsLabel}
              <Tooltip content={discountToolTipContent}>
                <Icon name="info-blue" className="discount-icon" />
              </Tooltip>
            </span>
            <span>{formatDiscount}</span>
          </div>
        )}
        {voucherCodeCount > 0 && (
          <div className="complete-bill-line">
            <span>{aplliedVoucherText}</span>
            <span>{formatvoucherDiscount}</span>
          </div>
        )}
        {!findClickAndCollect && !isTopupItem?.length && !isAllEgift && (
          <div className="complete-bill-line">
            <span>{placeholders?.deliveryLabel}</span>
            <span>
              {shippingAmount > 0
                ? formatShippingAmount
                : placeholders?.shippingMethodFreeLabel}
            </span>
          </div>
        )}
        {surchargeIncTax !== 0 && (
          <div className="complete-bill-line">
            <span>
              {placeholders?.cashOnDeliveryLabel}
              <Tooltip content={updatecodeServiceCharge}>
                <Icon name="info-blue" className="discount-icon" />
              </Tooltip>
            </span>
            <span>{formatSurchargeIncTax}</span>
          </div>
        )}
        {orderTotal && (
          <div className="complete-bill-line order-total">
            <span>{placeholders?.orderTotalLabel}</span>
            <span>{orderTotal}</span>
          </div>
        )}

        {isEgiftPay && (
          <>
            <div className="complete-bill-line egift-redeem">
              <span className="egift-redeem__label">{placeholders.redeemPayOrderSummary}</span>
              <span> {amountEGiftWithCurrency} </span>
            </div>

            <div className="complete-bill-line total-amount-paid">
              <span className="egift-redeem__label">{placeholders.amountpaid}</span>
              <span> {frmattedAmountPaid} </span>
            </div>
          </>
        )}

        <div className="complete-bill-line deliveryandvats">
          {!checkMethod && <span className="">{placeholders.excludingDelivery}</span>}
          {taxesTotal > 0 && <span>{placeholders.inclusiveVat}</span>}
        </div>
        {paidByAuraPoints > 0 && (
          <div className="complete-bill-line">
            <span>{placeholders?.paidWithAuraLabel}</span>
            <span>{formatPaidByAuraPoints}</span>
          </div>
        )}
        {paidByAuraPoints > 0 && (
          <>
            <div className="complete-bill-line balancepayable">
              <span>{placeholders?.amountpaid}</span>
              <span>{formatBalancePayable}</span>
            </div>
            <div className="complete-bill-line deliveryandvats aurapointsvat">
              {!checkMethod && <span className="">{placeholders.excludingDelivery}</span>}
              {taxesTotal > 0 && <span>{placeholders.inclusiveVat}</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default OrderConfirmationItemBillSummary;
