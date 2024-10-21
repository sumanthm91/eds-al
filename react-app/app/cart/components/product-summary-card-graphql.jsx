import React, {
  useCallback, useContext, useEffect, useState,
} from 'react';
import CartContext from '../../../context/cart-context.jsx';
import QuantityUpdate from './quantity-update.jsx';
import { updateWishlist } from '../../../../scripts/wishlist/api.js';
import removeCartGraphql from '../../../api/removeCartGraphql.js';
import DeletePopup from './delete-item-popup/delete-item-popup.jsx';
import Loader from '../../../shared/loader/loader.jsx';
import CartShippingMethods from './cart-shipping-methods/cart-shipping-methods.jsx';
import { getLanguageAttr } from '../../../../scripts/configs.js';
import useCurrencyFormatter from '../../../utils/hooks/useCurrencyFormatter.jsx';

function ProductSummaryCardGql({ product, currency, checkoutHideSection }) {
  const [isQtyAvailable, setIsQtyAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const {
    cart, setCart, placeholders, priceDecimals, promotion, isTopupFlag
  } = useContext(CartContext);
  const productAsset = JSON.parse(product?.product?.assets_cart ?? '[]')[0];
  const productImageUrl = productAsset?.styles?.cart_thumbnail ?? '';
  const topupPrice = useCurrencyFormatter({ price: product?.price, priceDecimals, currency })
  const getextensionattributes = () => cart?.data?.extension_attributes?.cart?.items?.find((item) => Number(product.id) === item?.item_id);

  const extensionAttributes = getextensionattributes();

  const ecartEstention = extensionAttributes?.extension_attributes;
  const isEgift = ecartEstention?.is_egift === '1';
  const isFreeGift = ecartEstention?.is_free_gift;
  const giftCardMessage = ecartEstention?.egift_options?.hps_giftcard_message;

  const actionAfterFav = (favNotification, results, deleteSuccess) => {
    window.dispatchEvent(new CustomEvent('updateMiniCart'));
    setCart({ ...cart, data: results });

    const resultsLength = results?.items?.length;
    if (resultsLength && favNotification) {
      window.dispatchEvent(new CustomEvent('react:showPageSuccessMessage', { detail: { message: deleteSuccess } }));
      const successNotification = document.querySelector('.page-success-message.visible');
      successNotification.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.dispatchEvent(new CustomEvent('react:resetPageMessage'));
    }
  };

  const moveToFavorite = async (productItem) => {
    setIsLoading(true);
    const { uid } = productItem;
    await updateWishlist(productItem?.configured_variant, false);
    const deleteSuccess = placeholders?.deleteSuccess ?? '';
    const cartId = cart?.data?.id;
    const results = await removeCartGraphql(uid, cartId, deleteSuccess);

    if (product) {
      const gtmAttributes = product?.product?.gtm_attributes;
      window.dispatchEvent(new CustomEvent(
        'react:datalayerRemoveFromCartEvent',
        {
          detail: {
            quantity: product.quantity, // calculating quantity removed from cart
            productData: {
              gtm: {
                id: gtmAttributes?.id || '',
                name: gtmAttributes?.name || '',
                brand: gtmAttributes?.brand || '',
                category: gtmAttributes?.category || '',
                variant: gtmAttributes?.variant || '',

                price: gtmAttributes?.price || '',
              },
              inStock: product?.configured_variant?.stock_status === 'IN_STOCK',
              // TODO: Should be enabled once is_returnable flag available
              // attributes: [{
              //   name: 'is_returnable',
              //   value: '1',
              // }],
            },
          },
        },
      ));
    }
    // triggering custom events on product removal from cart
    window.addEventListener('favourites-widget-removed', (evt) => {
      actionAfterFav(evt.detail, results, deleteSuccess);
    });
  };

  const deleteItemfromCart = async (productItem) => {
    setIsLoading(true);
    const { uid } = productItem;
    const deleteSuccess = placeholders?.deleteSuccess ?? '';
    const cartId = cart?.data?.id;
    const results = await removeCartGraphql(uid, cartId, deleteSuccess);
    results.items = results?.items?.map((item) => {
      if (Number(item?.quantity) <= Number(item?.configured_variant?.stock_data?.qty)
      ) {
        return {
          ...item,
          isQuantityNotAvailable: false,
          extensionAttributes: results?.extension_attributes?.cart?.items?.find(
            (element) => Number(item?.id) === Number(element?.item_id),
          ),
        };
      }
      return {
        ...item,
        isQuantityNotAvailable: true,
        extensionAttributes: results?.extension_attributes?.cart?.items?.find(
          (element) => Number(item?.id) === Number(element?.item_id),
        ),
      };
    });
    if (product) {
      const gtmAttributes = product?.product?.gtm_attributes;
      window.dispatchEvent(new CustomEvent(
        'react:datalayerRemoveFromCartEvent',
        {
          detail: {
            quantity: product.quantity, // calculating quantity removed from cart
            productData: {
              gtm: {
                id: gtmAttributes?.id || '',
                name: gtmAttributes?.name || '',
                brand: gtmAttributes?.brand || '',
                category: gtmAttributes?.category || '',
                variant: gtmAttributes?.variant || '',

                price: gtmAttributes?.price || '',
              },
              inStock: product?.configured_variant?.stock_status === 'IN_STOCK',
              // TODO: Should be enabled once is_returnable flag available
              // attributes: [{
              //   name: 'is_returnable',
              //   value: '1',
              // }],
            },
          },
        },
      ));
    }
    setCart({ ...cart, data: results });
    setIsLoading(false);
    const resultsLength = results?.items?.length;
    if (resultsLength) {
      window.dispatchEvent(
        new CustomEvent('react:showPageSuccessMessage', {
          detail: { message: deleteSuccess },
        }),
      );
      const successNotification = document.querySelector(
        '.page-success-message.visible',
      );
      successNotification.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.dispatchEvent(new CustomEvent('react:resetPageMessage'));
    }
  };

  const size = product?.configured_variant?.size ?? '';
  const configurableOptions = product?.configurable_options ?? '';
  let sizeLabel = '';
  if (size && configurableOptions) {
    sizeLabel = configurableOptions.find((option) => option.value_id === size)?.value_label ?? '';
  }

  const handleQtyNotAvailable = useCallback((flag = false) => {
    setIsQtyAvailable(flag);
  }, []);

  useEffect(() => {
    if (!isQtyAvailable) {
      window.dispatchEvent(
        new CustomEvent('react:dataLayerCartErrorsEvent', {
          detail: {
            eventLabel: 'quantity-not-available',
            eventAction: placeholders?.quantityNotAvailableLabel || 'The requested quantity is not available',
            eventPlace: `Error occured on ${window.location.href}`,
          },
        }),
      );
    }
  }, [isQtyAvailable]);

  const regularPrice = isEgift ? extensionAttributes?.price : product?.configured_variant?.price_range?.maximum_price?.regular_price?.value ?? 0;
  const finalPrice = isEgift ? extensionAttributes?.price : product?.configured_variant?.price_range?.maximum_price?.final_price?.value ?? 0;
  const discountPercent = product?.configured_variant?.price_range?.maximum_price?.discount?.percent_off ?? 0;

  const regularPriceFormatted = useCurrencyFormatter({ price: regularPrice, priceDecimals, currency });
  const finalPriceFormatted = useCurrencyFormatter({ price: finalPrice, priceDecimals, currency });

  const getProductSKU = () => (isFreeGift ? product?.product?.sku : product?.configured_variant?.sku) ?? '';

  const renderPrice = () => (
    <span id="price">
      {regularPrice !== finalPrice && (
        <span style={{ textDecoration: 'line-through' }}>
          {regularPriceFormatted}
        </span>
      )}
      {' '}
      <span className={regularPrice !== finalPrice ? 'price__discounted' : ''}>
        {finalPriceFormatted}
      </span>
    </span>
  );

  const renderProductBrand = () => {
    const brand = product?.product?.brand_full_name ?? '';
    return brand ? <span id="product-brand">{brand}</span> : null;
  };

  const renderSavePercentage = () => {
    const savePercentage = `(${placeholders.productPriceSaveLabel} ${Math.round(discountPercent)}%)`;
    return regularPrice !== finalPrice ? <span id="save-percentage">{savePercentage}</span> : null;
  };

  const renderProductOffers = () => {
    const promotions = product?.product?.promotions ?? [];

    return promotions?.length ? (
      <div className="product-offer-wrapper">
        {
          promotions.map((promo) => (checkoutHideSection ? <span key={`${product?.product?.name ?? ''}-${promo?.label ?? ''}`} className="product-offer">{promo?.label ?? ''}</span> : <a key={`${product?.product?.name ?? ''}-${promo?.label ?? ''}`} href={`/${getLanguageAttr()}/${promo?.url ?? ''}`} className="product-offer">{promo?.label ?? ''}</a>))
        }
      </div>
    ) : null;
  };

  const renderTitle = () => (isEgift ? <span id="product-title">{placeholders.egiftcardtext}</span> : <a id="product-title" href={`/${getLanguageAttr()}/${product?.product?.url_key ?? ''}`}>{product?.product?.name ?? ''}</a>);

  const renderImage = () => (!isTopupFlag ? (isEgift ? ecartEstention?.product_media?.[0]?.file : productImageUrl) : (""));
  const renderProductLabels = () => {
    const allProductLabels = promotion?.data?.promoDynamicLabelCart?.products_labels ?? [];
    const sku = getProductSKU();
    const productLabels = allProductLabels.find((label) => label.sku === sku)?.labels ?? [];
    return productLabels.map((productLabel) => (
      <div className="product-label__container" key={`product-label-${sku}-${productLabel}`}>
        <span className="product-label">
          {productLabel.label}
        </span>
      </div>
    ));
  };

  useEffect(() => {
    if (product.configured_variant?.stock_data?.qty && (product.configured_variant.stock_data.qty < product.quantity)) {
      setIsQtyAvailable(false);
    }
  }, [product]);

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

  const getDynamicAttributes = () => {
    const serializedDynamicAttributes = isFreeGift ? product?.product?.dynamicAttributes : product?.configured_variant?.dynamicAttributes;
    return JSON.parse(serializedDynamicAttributes);
  };

  useEffect(() => {
    if (ecartEstention?.error_message) {
      showOutOfStockToast();
    }
  }, [ecartEstention?.error_message]);

  return (
    <div className="product-summary__card">
      <div className={`product-summary__container ${isLoading ? 'loader' : ''}`}>
        <div className="product-summary">
          {!isTopupFlag ?
            <div className={`product-image ${isEgift ? 'egift-class' : ''}`}>

              <img src={renderImage()} alt={product?.product?.name ?? ''} />
            </div>

            : <div className={`product-image-topup ${isEgift ? 'egift-class' : ''}`}>
              <img src={product?.extension_attributes?.product_media[0]?.file} alt={product?.extension_attributes?.product_media[0]?.file ?? ''} />
            </div>
          }
          {!isTopupFlag ? <div className={`product-info ${isEgift ? 'egift-spaces' : ''}`}>
            <div className="product-info-title-wrapper">
              {!isEgift && renderProductBrand()}
              {renderTitle()}
              <div className="product-info__price__discount">
                {renderPrice()}
                {!isEgift && renderSavePercentage()}
              </div>
            </div>
            {isEgift ? (
              <div className="product-info__sub eGift-info">
                <span>
                  {placeholders.styleText}
                  :
                  {' '}
                  {ecartEstention?.hps_style_msg}
                </span>
                <span>
                  {placeholders.sendToText}
                  :
                  {' '}
                  {ecartEstention?.egift_options?.hps_giftcard_recipient_email}
                </span>
                {giftCardMessage && (
                  <span>
                    {placeholders.customMessageEgift}
                    :
                    {' '}
                    {giftCardMessage}
                  </span>
                )}
              </div>
            ) : (
              <div className="product-info__sub">
                {!checkoutHideSection && <span>
                  {placeholders?.productArtNo ?? ''}
                  :
                  {' '}
                  {getProductSKU()}
                </span>}
                <span>
                  {placeholders?.productColorLabel ?? ''}
                  :
                  {' '}
                  {getDynamicAttributes()?.color_label ?? ''}
                </span>
                <span>
                  {placeholders?.productSize ?? ''}
                  :
                  {' '}
                  {isFreeGift ? getDynamicAttributes()?.size_label : (sizeLabel ?? size)}
                </span>
              </div>
            )}
            {!isEgift && !isFreeGift && !checkoutHideSection && <button type="button" id="move-to-fav" onClick={() => moveToFavorite(product)}>{placeholders?.moveToFav ?? ''}</button>}
          </div> :
            <div>
              <div className={`product-info ${isEgift ? 'egift-spaces' : ''}`}>
                <div className="product-info-title-wrapper">
                  {placeholders?.egiftCardTopupLabel}
                  <div className="topup_price">
                    {topupPrice}
                  </div>
                </div>

              </div>
              <div className="cardNumber">
                {placeholders?.cardNumber}: {product?.extension_attributes?.topup_card_number}
              </div>
            </div>
          }
        </div>

        {!checkoutHideSection && !isTopupFlag && (
          <div className="product-summary__actions">
            {
              isLoading
                ? <Loader />
                : <DeletePopup productImageUrl={productImageUrl} onMoveToFav={() => moveToFavorite(product)} onRemove={() => deleteItemfromCart(product)} productSku={product?.configured_variant?.sku ?? ''} isEgift={isEgift} isFreeGift={isFreeGift} disabled={ecartEstention?.error_message || product?.isQuantityNotAvailable || isFreeGift} />
            }
            {((!isEgift && !isTopupFlag && product.configured_variant?.stock_data?.qty) || isFreeGift) && (
              <div className={!ecartEstention?.error_message ? 'product-qty-update' : 'product-qty-update-disable'}>

                <QuantityUpdate
                  isDisabled={isFreeGift}
                  totalQtyAvailable={product.configured_variant?.stock_data?.qty}
                  orderedQty={product.quantity}
                  qtyNotAvailable={handleQtyNotAvailable}
                  isQtyAvailable={isQtyAvailable}
                  bagUpdatedSuccessLabel={placeholders?.bagUpdatedSuccessLabel || 'Your bag has been updated successfuly.'}
                  product={product}
                />
              </div>
            )}
          </div>
        )}
      </div>
      {!isEgift && !isTopupFlag && (
        <div className="product-summary__footer">
          {renderProductOffers()}
          {!checkoutHideSection && <CartShippingMethods product={product} cart={cart} />}
        </div>
      )}
      {isFreeGift && !isTopupFlag && (
        <div className="free_gift_container">
          <span className="free_gift_label">
            {placeholders?.freeGiftLabel}
          </span>
        </div>
      )}
      {!isEgift && !isTopupFlag && ecartEstention?.error_message && (
        <div className="product-label__container">
          <span className="product-label">
            {ecartEstention?.error_message}
          </span>
        </div>
      )}
      {renderProductLabels()}
    </div>
  );
}

export default ProductSummaryCardGql;
