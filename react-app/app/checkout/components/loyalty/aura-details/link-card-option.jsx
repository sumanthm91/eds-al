import React from 'react';
import Cleave from 'cleave.js/react';

const LinkCardOptionCard = ({cardNumber, loyaltyCardPlaceholder}) => {

  return (
    <Cleave
      placeholder={loyaltyCardPlaceholder}
      id="spc-aura-link-card-input-card"
      name="spc-aura-link-card-input-card"
      className="spc-aura-link-card-input-card spc-aura-link-card-input"
      options={{ blocks: [4, 4, 4, 4] }}
      value={cardNumber}
      autoComplete="off"
    />
  );
};

export default LinkCardOptionCard;
