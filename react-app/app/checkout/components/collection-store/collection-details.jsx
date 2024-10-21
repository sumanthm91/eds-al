import React, {
  useContext, useEffect, useRef, useState,
} from 'react';
import StoreDetails from './components/store-details';
import CartContext from '../../../../context/cart-context';
import { getConfigValue } from '../../../../../scripts/configs';
import { getCountryIso } from '../../../../../scripts/helpers/country-list';

function CollectionDetails({
  item, hours, contactInfoUpdated, contactInfoErrors, cAndCInfo,
}) {
  const { placeholders, isLoggedIn } = useContext(CartContext);
  const [fullname, setFullname] = useState(cAndCInfo?.fullname || '');
  const [email, setEmail] = useState(cAndCInfo?.email || '');
  const [mobile, setMobile] = useState(cAndCInfo?.mobile || '');
  const [configData, setConfigData] = useState({});
  const formRef = useRef();

  const checkIfAllDetails = (dName, dEmail, dMobile) => {
    if (isLoggedIn) {
      if (dName && dMobile) {
        return true;
      }
      return false;
    }
    if (dName && dMobile && dEmail) {
      return true;
    }
    return false;
  };

  const nameChangeHandler = (eve) => {
    const val = eve.target.value;
    setFullname(val);
  };

  const emailChangeHandler = (eve) => {
    const val = eve.target.value;
    setEmail(val);
  };

  const mobileChangeHandler = (eve) => {
    const val = eve.target.value;
    if (val && val.length > 8) {
      return;
    }
    setMobile(val);
  };

  const loadConfigData = async () => {
    const countryCode = await getConfigValue('country-code');
    const countryPrefix = `+${await getCountryIso(countryCode)}`;
    setConfigData({ countryCode, countryPrefix });
  };

  useEffect(() => {
    loadConfigData();
  }, []);

  useEffect(() => {
    if (checkIfAllDetails(fullname, email, mobile)) {
      contactInfoUpdated(true, {
        formRef: formRef.current, mobile, fullname, email,
      });
    } else {
      contactInfoUpdated(false, {
        formRef: formRef.current, mobile, fullname, email,
      });
    }
  }, [fullname, email, mobile, formRef]);

  return (
    <div className="collection-details-main">
      <div className="collection-details-sec-title">{placeholders.mapSelectedStore}</div>
      <div>
        <div className="collection-details-details">
          <div className="collection-details-name-line">
            <span className="collection-details-store-name">{item.store_name}</span>
            <span>
              {item.distance?.toFixed(2)}
              {' '}
              {placeholders.mapMiles}
            </span>
          </div>
          <StoreDetails item={item} hours={hours} />
        </div>
        <div className="collection-details-contact-info">
          <div className="collection-details-sec-title">{placeholders.mapContactInfo}</div>
          <div className="collection-details-info">{placeholders.mapInTouchText}</div>
        </div>
        <div ref={formRef} className="collection-details-form">
          <div className="collection-info-form-input">
            <input id="collectedby-info-fullname-input" type="text" className={fullname ? 'focus' : ''} onChange={nameChangeHandler} value={fullname} />
            <label htmlFor="collectedby-info-fullname-input">{placeholders.mapFullName}</label>
            {contactInfoErrors?.fullname && <span className="collection-details-form-error">{placeholders.mapEnterFullname}</span>}
          </div>
          {!isLoggedIn && (
            <div className="collection-info-form-input">
              <input id="collectedby-info-email-input" type="email" className={email ? 'focus' : ''} onChange={emailChangeHandler} value={email} />
              <label htmlFor="collectedby-info-email-input">{placeholders.mapEmail}</label>
              {contactInfoErrors?.email && <span className="collection-details-form-error">{placeholders.mapEmailError}</span>}
            </div>
          )}
          <div className="collection-info-form-input collection-info-form-mobile">
            <label htmlFor="collectedby-info-mobile-input">{placeholders.mapMobileNumber}</label>
            <div dir="ltr">
              <input id="collectedby-info-mobile-input" className="focus" value={mobile} type="text" onChange={mobileChangeHandler} />
              <span className="collection-info-mobile-prefix">{configData.countryPrefix}</span>
            </div>
            {contactInfoErrors?.mobile && <span className="collection-details-form-error">{placeholders.mapValidNumber}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CollectionDetails;
