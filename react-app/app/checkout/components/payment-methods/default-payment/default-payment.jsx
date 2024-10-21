import React, { forwardRef, useImperativeHandle } from 'react';

const DefaultPayment = forwardRef(({ code, finalisePayment }, ref) => {
  useImperativeHandle(ref, () => ({
    completePurchase: async () => {
      const payload = {
        payment: {
          method: code,
        },
      };
      if (finalisePayment) await finalisePayment(payload);
    },
  }));

  return null;
});

export default DefaultPayment;
