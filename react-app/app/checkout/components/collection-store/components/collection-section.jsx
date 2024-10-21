import React, { useContext, useEffect, useState } from 'react';
import CartContext from '../../../../../context/cart-context';
import './collection-section.css';
import Loader from '../../../../../shared/loader/loader';
import getStoreLocator from '../../../../../api/getStoreLocation';

function CollectionSection() {
  const {
    cart, setDeliveryInformation, deliveryInformation, placeholders, setIsMapDetailsView, selectedCollectionStoreForCheckout, setSelectedCollectionStoreForCheckout, setSelectedCollectionStore
  } = useContext(CartContext);
  const shippingAssign = cart?.data?.extension_attributes?.cart?.extension_attributes?.shipping_assignments.find((assign) => assign?.shipping?.method === 'click_and_collect_click_and_collect');
  const storeCode = shippingAssign?.shipping?.extension_attributes?.store_code;
  const [sectionData, setSectionData] = useState();
  const [isLoading, setIsLoading] = useState(false);

  const getSelectedStoreDetails = async (storeCode) => {
    setIsLoading(true);
    const result = await getStoreLocator(storeCode);
    const stores = result?.response?.items;
    if (stores?.length) {
      const storeDetails = stores.find(store => store.store_code === storeCode);
      setSelectedCollectionStore(storeDetails);
      setSelectedCollectionStoreForCheckout(storeDetails);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    if (storeCode) {
      const dataAddress = shippingAssign?.shipping?.address;
      setSectionData({
        fullname: `${dataAddress.firstname} ${dataAddress.lastname}`,
        mobile: dataAddress.telephone,
      });
      getSelectedStoreDetails(storeCode);
    }
  }, [storeCode]);

  const changeClickHandler = () => {
    setDeliveryInformation({ ...deliveryInformation, isDialogOpen: true, changeAddress: 'mapAddress' });
  };

  const editClickHandler = () => {
    setDeliveryInformation({ ...deliveryInformation, isDialogOpen: true, changeAddress: 'mapAddress' });
    setIsMapDetailsView(true);
  };

  const getStoreAddress = () => selectedCollectionStoreForCheckout?.address?.find(address => address?.code === 'address')?.value ?? '';

  const getStoreStreet = () => selectedCollectionStoreForCheckout?.address?.find(address => address?.code === 'street')?.value ?? '';
  
  const renderSectionData = () => {
    if (!sectionData) return null;

    return (
      <div className="col-section-main">
        <div className="col-section-card col-setion-card1">
          <div>
            <div className="col-section-card-storename">{selectedCollectionStoreForCheckout?.store_name}</div>
            <div className="col-section-card-streetname">{getStoreAddress()}</div>
            <div className="col-section-card-streetname">{getStoreStreet()}</div>
          </div>
          <div className="col-section-card-btn">
            <button type="button" onClick={changeClickHandler}>{placeholders.mapChangeBtn}</button>
          </div>
        </div>
        <div className="col-section-card col-setion-card2">
          <div>
            <div className="col-section-card-storename">{placeholders.mapCollectionBy}</div>
            <div className="col-section-card-streetname">{sectionData.fullname}</div>
            <div className="col-section-card-streetname">{sectionData.mobile}</div>
          </div>
          <div className="col-section-card-btn">
            <button type="button" onClick={editClickHandler}>{placeholders.mapEditBtn}</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    isLoading
      ? <Loader />
      : renderSectionData()
  );
}

export default CollectionSection;
