const API_URI_MEMBER_BONUS_VOUCHERS = 'hello-member/carts/mine/bonusVouchers';
const API_URI_MEMBER_OFFERS = 'hello-member/carts/mine/memberOffers';
const API_URI_GUESTS_ESTIMATE_SHIPPING_METHODS = 'guest-carts/{{CART_ID}}/estimate-shipping-methods';
const API_URI_LOGGED_IN_ESTIMATE_SHIPPING_METHODS = 'carts/mine/estimate-shipping-methods';
const API_URI_GET_TOKEN_LIST = 'checkoutcomupapi/getTokenList';
const API_URI_GUESTS_GET_CART = 'guest-carts/{{CART_ID}}/getCart';
const API_URI_LOGGED_IN_GET_CART = 'carts/mine/getCart';
const API_URI_ADDRESS_LOCATIONS_SEARCH = 'deliverymatrix/address-locations/search';
const API_URI_CUSTOMER_COUPONS = 'hello-member/customers/coupons';
const API_URI_ASSOCIATE_CARTS = 'carts/mine/associate-cart';

const CART_QUERY__SHIPPING_ADDRESSES = `
    shipping_addresses {
        firstname
        lastname
        available_shipping_methods {
        amount {
            currency
            value
        }
        available
        carrier_code
        carrier_title
        method_code
        method_title
        error_message
        price_excl_tax {
            value
            currency
        }
        price_incl_tax {
            value
            currency
        }
        }
        selected_shipping_method {
        amount {
            value
            currency
        }
        carrier_code
        carrier_title
        method_code
        method_title
        }
    }
`;
const CART_QUERY__EXTENSION_ATTRIBUTE = `
    extension_attributes {
            delivery_matrix {
            product_sku
                applicable_shipping_methods {
                    available
                    carrier_code
                    carrier_title
                    cart_page_title
                    error_message
                    method_code
                    method_title
                }
            }
            delivery_matrix_address{
                items{
                    label
                    location_id
                }
            }
            cart {
                id
                applied_rule_ids
                billing_address {
                    firstname
                    lastname
                    email
                    telephone
                    street
                    city
                    region
                    postcode
                    region_id
                    region_code
                    country_id
                    customer_address_id
                    custom_attributes {
                        attribute_code
                        value
                        name
                    }
                }
                items {
                    item_id
                    sku
                    qty
                    name
                    price
                    product_type
                    quote_id
                    extension_attributes {
                        item_name_en
                        parent_product_sku
                        error_message
                        style_code
                        color
                        size
                        season_code
                        is_aura_free_item
                        is_free_gift
                        brand_full_name
                        original_price
                        egift_options {
                            hps_giftcard_amount
                            hps_giftcard_sender_name
                            hps_giftcard_recipient_name
                            hps_giftcard_sender_email
                            hps_giftcard_recipient_email
                            hps_giftcard_message
                        }
                        hps_style_msg
                        image_url
                        is_egift
                        is_topup
                        topup_card_name_en
                        topup_card_number
                        product_media {
                            id
                            media_type
                            label
                            position
                            disabled
                            types
                            file
                        }
                    }
                }
                extension_attributes {
                    mobile_number_verified
                    free_shipping_text
                    attempted_payment
                    applied_rule_ids
                    applied_rule_ids_with_discount
                    is_locked
                    is_multi_brand_cart
                    applied_hm_offer_code
                    hm_voucher_discount
                    applied_hm_voucher_codes
                    loyalty_type
                    loyalty_card
                    surcharge {
                        is_applied
                        amount
                    }
                    member_price_discount
                    aura_promotion_discount
                    has_exclusive_coupon
                    shipping_assignments {
                        shipping {
                            address {
                                firstname
                                lastname
                                email
                                telephone
                                street
                                city
                                region
                                postcode
                                region_id
                                region_code
                                country_id
                                customer_address_id
                                custom_attributes {
                                    attribute_code
                                    value
                                    name
                                }
                            }
                            method
                            extension_attributes {
                                click_and_collect_type
                                collector_email
                                collector_mobile
                                collector_name
                                store_code
                            }
                        }
                    }
                }
            }
            totals {
                base_grand_total
                total_segments{
                    code
                    title
                    value
                }
                shipping_incl_tax
                coupon_code
                extension_attributes {
                    coupon_label
                    reward_points_balance
                    reward_currency_amount
                    base_reward_currency_amount
                    is_hm_applied_voucher_removed
                    is_all_items_excluded_for_adv_card
                    hps_redeemed_amount
                    hps_current_balance
                    hps_redemption_type
                }
                items {
                    extension_attributes {
                        adv_card_applicable
                    }
                }
            }
        }
`;
const CART_QUERY__ITEMS = `
    items {
        id
        uid
        quantity
        product {
            promotions {
                context
                url
                label
                type
            }
            reserve_and_collect
            ship_to_store
            ... on commerce_SimpleProduct {
                sku
                dynamicAttributes(fields:["color","size"])
                stock_data {
                    qty
                    max_sale_qty
                    max_sale_qty_parent
                }
                stock_status
            }
            url_key
            assets_cart
            name
            brand_full_name
            sku
            gtm_attributes{
                id
                name
                variant
                price
                brand
                category
                dimension2
                dimension3
                dimension4
            }
        }
        ... on commerce_ConfigurableCartItem {
            configured_variant {
                dynamicAttributes(fields:["color","size"])
                reserve_and_collect
                ship_to_store
                name
                sku
                brand
                price_range {
                    maximum_price {
                        regular_price {
                            value
                            currency
                        }
                        final_price {
                            value
                            currency
                        }
                        discount {
                            percent_off
                        }
                    }
                }
                stock_data {
                    qty
                    max_sale_qty
                    max_sale_qty_parent
                }
                stock_status
                color_label
                size
            }
            configurable_options {
                option_label
                value_id
                value_label
            }
        }
        prices {
            row_total_including_tax {
                value
                currency
            }
        }
    }
`;
const CART_QUERY__PRICES = `
    prices {
        grand_total {
            value
            currency
        }
        subtotal_excluding_tax {
            value
            currency
        }
        subtotal_including_tax {
            value
            currency
        }
        applied_taxes {
            amount {
                value
                currency
            }
        }
        discount {
            amount {
                value
                currency
            }
            label
        }
    }
`;

const CART_QUERY__PAYMENTS_METHODS = `
    available_payment_methods {
        code
        title
    }
    selected_payment_method {
        code
    }
`;
const CART_QUERY__MOBILE_NUMBER_VERIFIED = `
    extension_attributes {
        cart {
            extension_attributes {
                mobile_number_verified
            }
        }
    }`;
const CART_QUERY = `
    {
        id
        total_quantity
        ${CART_QUERY__EXTENSION_ATTRIBUTE}
        ${CART_QUERY__ITEMS}
        ${CART_QUERY__PRICES}
        ${CART_QUERY__PAYMENTS_METHODS}
    }
`;
const CUSTOMER_ORDER_QUERY = `
    {
  items {
    base_currency_code
    customer_email
    customer_is_guest
    increment_id
    shipping_description
    total_qty_ordered
    subtotal_incl_tax
    discount_amount
    shipping_incl_tax
    grand_total
    coupon_code
    base_grand_total
    items{
        sku
        price_incl_tax
        is_virtual
        extension_attributes {
            product_options
            product_media {
                file
            }
        }
       }
    billing_address {
      city
      country_id
      firstname
      lastname
      postcode
      street
      telephone
      extension_attributes {
        address_building_segment
        area
        address_city_segment
      }
    }
  payment {
    additional_information
    method
  }
  extension_attributes {
  alshaya_order_type{
  additional_data
  }
  topup_card_number
  topup_recipientemail
  surcharge_incl_tax
  apc_accrued_points
  apc_redeemed_points
  aura_payment_value
  applied_hm_voucher_codes
  hm_voucher_discount
  hps_redeemed_amount
  applied_hm_offer_code
  hm_accrued_points
    shipping_assignments {
      shipping {
        address {
          city
          country_id
          firstname
          lastname
          postcode
          street
          telephone
          extension_attributes {
            address_building_segment
            area
            address_city_segment
          }
        }
        method
        extension_attributes {
          store_code
          click_and_collect_type
          carrier_code
        }
      }
    }
    payment_additional_info {
      key
      value
    }
    applied_taxes
  }
}
  total_count
}
`;

const GET_PRODUCTS = `
    {
        items {
          sku
          name
          url_key
          gtm_attributes {
            id
            name
            variant
            price
            brand
            category
            dimension2
            dimension3
            dimension4
          }
            ... on commerce_SimpleProduct {
          assets_cart
            }
          ... on commerce_ConfigurableProduct {
          assets_cart
            variants {
              product {
                sku
                dynamicAttributes(fields:["color","size"])
              }
            }
          }
        }
    }
`;

const CHECKOUTCOM_CONFIG_QUERY = `
    {
        public_key
        environment
        allowed_card_types
        mada_bin_numbers
        display_card_number_type
        apple_pay_merchant_id
        apple_pay_merchant_capabilities
        apple_pay_supported_networks
        vault_enabled
        cvv_check
        api_url
        fawry_expiry_time
        benefit_pay_expiry_time
    }
`;
const DIGITAL_QUERY__EXTENSION_ATTRIBUTE = `
    extension_attributes {
            delivery_matrix_address{
                items{
                    label
                    location_id
                }
            }
            cart {
                id
                applied_rule_ids
                billing_address {
                    firstname
                    lastname
                    email
                    telephone
                    street
                    city
                    region
                    postcode
                    region_id
                    region_code
                    country_id
                    customer_address_id
                    custom_attributes {
                        attribute_code
                        value
                        name
                    }
                }
                items {
                    item_id
                    sku
                    qty
                    name
                    price
                    product_type
                    quote_id
                    extension_attributes {
                        error_message
                        is_aura_free_item
                        is_free_gift
                        brand_full_name
                        original_price
                        egift_options {
                            hps_giftcard_amount
                            hps_giftcard_sender_name
                            hps_giftcard_recipient_name
                            hps_giftcard_sender_email
                            hps_giftcard_recipient_email
                            hps_giftcard_message
                        }
                        hps_style_msg
                        image_url
                        is_egift
                        is_topup
                        topup_card_name_en
                        topup_card_number
                        product_media {
                            id
                            media_type
                            label
                            position
                            disabled
                            types
                            file
                        }
                    }
                }
                extension_attributes {
                    free_shipping_text
                    attempted_payment
                    applied_rule_ids
                    applied_rule_ids_with_discount
                    is_locked
                    is_multi_brand_cart
                    applied_hm_offer_code
                    hm_voucher_discount
                    applied_hm_voucher_codes
                    surcharge {
                        is_applied
                        amount
                    }
                    has_exclusive_coupon
                }
            }
            totals {
            base_grand_total
            total_segments{
                    code
                    title
                    value
                }
               shipping_incl_tax
                coupon_code
                extension_attributes {
                    coupon_label
                    reward_points_balance
                    reward_currency_amount
                    base_reward_currency_amount
                    is_hm_applied_voucher_removed
                    is_all_items_excluded_for_adv_card
                    hps_redeemed_amount
                    hps_current_balance
                    hps_redemption_type
                }
                items {
                    extension_attributes {
                        adv_card_applicable
                    }
                }
            }
        }
`;
const DIGITAL_CART_QUERY = `
    {
        id
        total_quantity
        ${DIGITAL_QUERY__EXTENSION_ATTRIBUTE}
        ${CART_QUERY__PAYMENTS_METHODS}
    }
`;


const ApiConstants = {
    API_URI_MEMBER_BONUS_VOUCHERS,
    API_URI_MEMBER_OFFERS,
    API_URI_GUESTS_ESTIMATE_SHIPPING_METHODS,
    API_URI_LOGGED_IN_ESTIMATE_SHIPPING_METHODS,
    API_URI_GET_TOKEN_LIST,
    API_URI_GUESTS_GET_CART,
    API_URI_LOGGED_IN_GET_CART,
    API_URI_ADDRESS_LOCATIONS_SEARCH,
    API_URI_CUSTOMER_COUPONS,
    API_URI_ASSOCIATE_CARTS,

    CART_QUERY__SHIPPING_ADDRESSES,
    CART_QUERY__EXTENSION_ATTRIBUTE,
    CART_QUERY__ITEMS,
    CART_QUERY__PRICES,
    CART_QUERY__PAYMENTS_METHODS,
    CART_QUERY__MOBILE_NUMBER_VERIFIED,
    CART_QUERY,
    CHECKOUTCOM_CONFIG_QUERY,
    CUSTOMER_ORDER_QUERY,
    GET_PRODUCTS,
    DIGITAL_CART_QUERY,
    DIGITAL_QUERY__EXTENSION_ATTRIBUTE
};

export default ApiConstants;
