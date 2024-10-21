import React, { useRef, useContext } from 'react';
import AuraFormFieldItem from '../aura-form-field/aura-form-field.jsx';
import CartContext from '../../../../../context/cart-context.jsx';

function AuraFormFieldOptions({ selectedOption, selectOptionCallback }) {
  const optionsRef = useRef(null);
  const {
    placeholders,
  } = useContext(CartContext);

  const {
    auraMobileLabel = '',
    auraAccountNumberLabel = '',
    auraEmailLabel = '',
  } = placeholders;

  return (
    <div ref={optionsRef} className="aura-form-items-link-card-options">
      <AuraFormFieldItem
        selectedOption={selectedOption}
        selectOptionCallback={selectOptionCallback}
        fieldKey="mobile"
        fieldValue="mobile"
        fieldText={auraMobileLabel}
      />
      <AuraFormFieldItem
        selectedOption={selectedOption}
        selectOptionCallback={selectOptionCallback}
        fieldKey="card"
        fieldValue="cardNumber"
        fieldText={auraAccountNumberLabel}
      />
      <AuraFormFieldItem
        selectedOption={selectedOption}
        selectOptionCallback={selectOptionCallback}
        fieldKey="email"
        fieldValue="email"
        fieldText={auraEmailLabel}
      />
    </div>
  );
}

export default AuraFormFieldOptions;
