import React, { useContext } from 'react';
import Dialog from '../../../../shared/dialog/dialog';
import CheckoutHomeDeliveryModal from '../checkout-home-delivery-modal';
import CollectionStore from '../collection-store/collection-store';
import CartContext from '../../../../context/cart-context';

function CheckoutModal({ selectedMethod }) {
  const { deliveryInformation, setDeliveryInformation, setIsMapDetailsView } = useContext(CartContext);
  const handleCloseDialog = () => setDeliveryInformation(prev => ({ ...prev, isDialogOpen: false, changeAddress: '' }));
  const mapCloseHandler = () => {
    setIsMapDetailsView(false);
    handleCloseDialog();
  };
  return (
    <Dialog
      isOpen={deliveryInformation.isDialogOpen}
      onClose={selectedMethod === 'click_and_collect' ? mapCloseHandler : handleCloseDialog}
      headerClassName="dialog__header-checkout"
      containerClassName={`dialog__checkout-container ${deliveryInformation.changeAddress === 'mapAddress' ? 'click-and-collect' : 'home-delivery'}`}
    >
      {(selectedMethod === 'home_delivery' || deliveryInformation.changeAddress === 'billing') && <CheckoutHomeDeliveryModal isVisible={deliveryInformation.isModalVisible} onClose={handleCloseDialog} />}
      {selectedMethod === 'click_and_collect' && deliveryInformation.changeAddress !== 'billing' && <CollectionStore onClose={mapCloseHandler} />}
    </Dialog>
  );
}

export default CheckoutModal;
