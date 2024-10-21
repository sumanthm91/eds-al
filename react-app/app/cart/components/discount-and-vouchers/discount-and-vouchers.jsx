import React, { useContext, useState } from 'react';
import './discount-and-vouchers.css';
import CartContext from '../../../../context/cart-context';
import Dialog from '../../../../shared/dialog/dialog';
import DiscountAndVouchersGuestUser from './components/discount-and-vouchers-guest-user/discount-and-vouchers-guest-user';
import DiscountAndVouchersLoggedinUser from './components/discount-and-vouchers-loggedin-user/discount-and-vouchers-loggedin-user';

function DiscountAndVouchers({ className }) {
  const { placeholders, isLoggedIn, cart } = useContext(CartContext);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const headerClassName = isLoggedIn ? 'dialog__header-discount-and-voucher-loggedin-user' : 'dialog__header-discount-and-voucher-guest-user';
  const containerClassName = isLoggedIn ? 'dialog__container-discount-and-voucher-loggedin-user' : 'dialog__container-discount-and-voucher-guest-user';

  const appliedOffer = cart?.data?.extension_attributes?.cart?.extension_attributes?.applied_hm_offer_code;
  const appliedVouchers = cart?.data?.extension_attributes?.cart?.extension_attributes?.applied_hm_voucher_codes?.split(',') ?? [];
  const appliedOfferAndVouchersCount = (appliedOffer ? 1 : 0) + (appliedVouchers?.length ?? 0);

  const handleOpenDialog = () => setIsDialogOpen(true);
  const handleCloseDialog = () => setIsDialogOpen(false);

  return (
    <>
      <Dialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        headerClassName={headerClassName}
        containerClassName={containerClassName}
      >
        {isLoggedIn ? <DiscountAndVouchersLoggedinUser handleCloseDialog={handleCloseDialog} /> : <DiscountAndVouchersGuestUser />}
      </Dialog>
      <span onClick={handleOpenDialog} className={`${className} cart-discount-vouchers`} onKeyUp={(e) => e.key === 'Enter' && handleOpenDialog()} role="button" tabIndex={0}>
        {`${placeholders.promotionDiscountAndVouchersLabel}${appliedOfferAndVouchersCount ? ` : ${appliedOfferAndVouchersCount}` : ''}`}
        {' '}
        {appliedOfferAndVouchersCount ? null : <div className="promo-notification" />}
      </span>
    </>
  );
}

export default DiscountAndVouchers;
