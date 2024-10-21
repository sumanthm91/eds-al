import React from 'react';

const LinkCardOptionEmail = ({email, loyaltyEmailPlaceholder}) => {

  return (
    <input
      type="email"
      id="spc-aura-link-card-input-email"
      name="spc-aura-link-card-input-email"
      className="spc-aura-link-card-input-email spc-aura-link-card-input"
      placeholder={loyaltyEmailPlaceholder}
      defaultValue={email}
    />
  );
};

export default LinkCardOptionEmail;
