import React from 'react';
import './delivery-method.css';
import { getRandomNumber } from '../../../../utils/base-utils';

function DeliveryMethods({ data }) {
  return (
    <div className="delivery__proposition-wrapper slide-up-animation">
      {data && Array.from(data).map((item) => (
        <div className="proposition-item" key={`delivery-method-${getRandomNumber()}`}>
          <span dangerouslySetInnerHTML={{ __html: item.innerHTML }} />
        </div>
      ))}
    </div>
  );
}

export default DeliveryMethods;
