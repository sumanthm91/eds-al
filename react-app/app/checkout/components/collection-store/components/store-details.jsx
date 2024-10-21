import React, { useContext } from 'react';
import { findValueFromAddress } from '../map-utils';
import CartContext from '../../../../../context/cart-context';

function StoreDetails({ item, hours }) {
  const { placeholders } = useContext(CartContext);
  return (
    <div className="collection-store-li-add">
      <div>{findValueFromAddress(item.address, 'street')}</div>
      <div className="collection-store-time">
        <span>{placeholders.mapCollectFromStore}</span>
        <span>
          {' '}
          {item.sts_delivery_time_label}
        </span>
      </div>
      <div>
        {hours.map((hour) => (
          <div>
            <span>{hour.label}</span>
            <span>
              {' '}
              (
              {hour.value}
              )
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default StoreDetails;
