import React, {
  useContext, useEffect, useRef, useState,
} from 'react';
import './collection-store.css';
import Icon from '../../../../library/icon/icon';
import { getConfigValue } from '../../../../../scripts/configs';
import getCollectionStoresGraphQl from '../../../../api/getCollectionStores';
import CollectionDetails from './collection-details';
import StoreDetails from './components/store-details';
import CartContext from '../../../../context/cart-context';
import { findValueFromAddress, getUserLocation } from './map-utils';
import Loader from '../../../../shared/loader/loader';
import updateCart from '../../../../api/updateCart';
import getSubCartGraphql from '../../../../api/getSubCartGraphql';
import ApiConstants from '../../../../api/api.constants';
import removeRedemption from '../../../../api/removeRedemption';
import FullScreenSVG from './components/full-screen';
import LocateSvg from './components/locate';

export const generateStoreHours = (storeHours) => {
  let time;
  let days = [];
  const resArr = [];
  storeHours.forEach((hours, index) => {
    if (!days.length) {
      days.push(hours.label);
      time = hours.value;
    }
    if (time === hours.value) {
      days.splice(1, 1, hours.label);
    } else {
      resArr.push({ label: days.join(' - '), value: time });
      days = [];
      days.push(hours.label);
      time = hours.value;
    }
    if (index === storeHours.length - 1) {
      resArr.push({ label: days.join(' - '), value: time });
    }
  });
  return resArr;
};

function CollectionStore({ onClose }) {
  const deskMap = useRef();
  const mobileMap = useRef();
  const autocompleteService = useRef();
  const {
    cart, setCart, cartId, isLoggedIn, selectedCollectionStore, setSelectedCollectionStore, setSelectedCollectionStoreForCheckout, setCAndCInfo, cAndCInfo, placeholders, isMapDetailsView,
  } = useContext(CartContext);
  const [activeView, setActiveView] = useState('list_view');
  const [detailsView, setDetailsView] = useState(false);
  const [openedAdd, setOpenedAdd] = useState(null);
  const [selectedAdd, setSelectedAdd] = useState(selectedCollectionStore?.id || null);
  const [respSelectedAdd, setRespSelectedAdd] = useState(null);
  const [isResponsive, setIsResponsive] = useState(null);
  const [currentLocation, setCurrentLocation] = useState();
  const [storesAPIData, setStoresAPIData] = useState();
  const [allStoreHours, setAllStoreHours] = useState();
  const [allMarkers, setAllMarkers] = useState();
  const [showOutsideCountryError, setShowOutsideCountryError] = useState('unset');
  const [showLocationAccessDenied, setShowLocationAccessDenied] = useState(false);
  const [dismissWarning, setDismissWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [locateMeClicked, setLocateMeClicked] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const mapRefMobile = useRef(null);
  const mapRefDesktop = useRef(null);
  const infoWindowRef = useRef(null);
  const searchInputRef = useRef(null);
  const [isContactInfo, setIsContactInfo] = useState(false);
  const [contactInfoRef, setContactInfoRef] = useState();
  const [contactInfoErrors, setContactInfoErrors] = useState({ fullname: false, mobile: false, email: false });
  const [isContinueDirty, setIsContinueDirty] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isUpdatingStore, setIsUpdatingStore] = useState(false);
  const markerLibrary = useRef(null);
  const activeMarker = useRef(null);

  const storeInfoRenderer = (item, isMarkerClick = false) => {
    let t = '';
    const itemHours = isMarkerClick ? generateStoreHours(item.store_hours) : allStoreHours[item.id];
    itemHours.forEach((hours) => {
      t += `<div><span>${hours.label}</span><span> (${hours.value})</span></div>`;
    });

    return `<div class="collection-map-infowindow">
            <div class="collection-map-infowindow-title"><span class="collection-map-infowindow-name">${item.store_name}</span><span> ${item.distance?.toFixed(2)} ${placeholders.mapMiles}</span></div>
            <div>${findValueFromAddress(item.address, 'street')}</div>
            <div class="collection-map-infowindow-time"><span>Collect in store from</span><span> ${item.sts_delivery_time_label}</span></div>
            <div>${t}</div>
        </div>`;
  };

  const viewClickHandler = (view) => {
    setActiveView(view);
  };

  const addDropdownClick = (add) => {
    if (add === openedAdd) {
      setOpenedAdd(null);
    } else {
      setOpenedAdd(add);
    }
  };

  const selectAddClick = async (item, isMarkerClick = false, isMarker = false) => {
    if (isResponsive && activeView === 'map_view') {
      setRespSelectedAdd(item.id);
      if (!isFullScreen) {
        setIsFullScreen(true);
      }
    } else {
      setSelectedAdd(item.id);
      setSelectedCollectionStore(item);
    }
    if (deskMap.current) {
      deskMap.current.setCenter({ lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) });
    }
    if (mobileMap.current) {
      mobileMap.current.setCenter({ lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) });
    }
    if (deskMap.current) {
      deskMap.current.setZoom(12);
    }
    if (mobileMap.current) {
      mobileMap.current.setZoom(12);
    }

    infoWindowRef.current.setContent(storeInfoRenderer(item, isMarkerClick));

    if (activeMarker.current) {
      const pinEle = activeMarker.current.pinElement;
      pinEle.background = '#ffffff';
      pinEle.glyphColor = '#ffffff';

      const imgEle = activeMarker.current.imageElement;
      imgEle.src = '/icons/logo.svg';

      imgEle.classList.remove('selected')
    }

    const marker = isMarker ? isMarker.marker : allMarkers[item.id]?.marker;
    if (deskMap.current && !isResponsive) {
      infoWindowRef.current.open(deskMap.current, marker);
    }
    const pinEle = isMarker ? isMarker.pinElement : allMarkers[item.id].pinElement;
    pinEle.background = '#cd2026';
    pinEle.glyphColor = '#cd2026';

    const imgEle = isMarker ? isMarker.imageElement : allMarkers[item.id].imageElement;
    imgEle.src = '/icons/logo-white.svg';
    imgEle.classList.add('selected')
    activeMarker.current = { marker, pinElement: pinEle, imageElement: imgEle };
  };

  const highlightMarker = async (item, isMarker, highlight) => {
    const imgEle = isMarker ? isMarker.imageElement : allMarkers[item.id].imageElement;
    if(!imgEle.classList.contains('selected')){
      const pinEle = isMarker ? isMarker.pinElement : allMarkers[item.id].pinElement;
      pinEle.background = highlight ? '#cd2026': '#ffffff';
      pinEle.glyphColor = highlight ? '#cd2026': '#ffffff';
     
      imgEle.src = highlight ? '/icons/logo-white.svg' : '/icons/logo.svg';
      if(highlight) {
        imgEle.classList.add('highlighted')
      } else {
        imgEle.classList.remove('highlighted')
      }
    }
  };

  const loadMapScript = async () => {
    const googleMapKey = '' || await getConfigValue('sf-google-maps-key');
    const scripts = [`https://maps.googleapis.com/maps/api/js?key=${googleMapKey}&async=true&libraries=places&language=${document.documentElement.lang}`];
    // add script dependencies to the page and wait for them to load
    await Promise.all(scripts.map((script) => new Promise((resolve) => {
      const scriptElement = document.createElement('script');
      scriptElement.id = 'checkout-google-map';
      scriptElement.src = script;
      scriptElement.async = true;
      scriptElement.defer = true;
      scriptElement.onload = () => {
        setIsGoogleLoaded(true);
        resolve();
      };
      scriptElement.type = 'module';
      document.head.appendChild(scriptElement);
    })));
  };

  async function initiateGoogleMap() {
    if (!isLoading) {
      setIsLoading(true);
    }
    const google = await window.google;
    markerLibrary.current = await google.maps.importLibrary('marker');

    if (!google) {
      return;
    }
    let defaultCenterLat = '' || await getConfigValue('sf-maps-center-lat');
    let defaultCenterLng = '' || await getConfigValue('sf-maps-center-lng');
    const defaultZoom = '' || await getConfigValue('sf-maps-default-zoom-preference');
    defaultCenterLat = 25.283943; defaultCenterLng = 51.3719108;
    const mapOptions = {
      zoom: Number(defaultZoom),
      center: new google.maps.LatLng(Number(defaultCenterLat), Number(defaultCenterLng)),
      mapId: 'ALSHAYA_MAP_ID',
      disableDefaultUI: true,
      zoomControl: true,
    };

    if (mapRefMobile?.current) {
      mobileMap.current = new google.maps.Map(mapRefMobile.current, mapOptions);
    }

    if (mapRefDesktop?.current) {
      deskMap.current = new google.maps.Map(mapRefDesktop.current, mapOptions);
    }

    const markers = {};
    const storeHours = {};
    const apiData = storesAPIData;
    if (!apiData?.items || !apiData.items.length) {
      deskMap.current.setZoom(7);
    }
    apiData?.items?.forEach((item, i) => {
      storeHours[item.id] = generateStoreHours(item.store_hours);
      const pinElement = new markerLibrary.current.PinElement({
        background: '#FFFFFF',
        borderColor: '#FF0000',
        glyph: i.toString(),
        glyphColor: 'white',
        scale: 1.3,
      });
      const marker = new markerLibrary.current.AdvancedMarkerElement({
        position: { lat: parseFloat(item.latitude), lng: parseFloat(item.longitude) },
        content: pinElement.element,
        title: item.store_name,
      });
      const imageUrl = '/icons/logo.svg';
      const imageElement = document.createElement('img');
      imageElement.classList.add('store-marker-img');
      imageElement.src = imageUrl;
      marker.content.appendChild(imageElement);
      marker.addListener('click', () => {
        selectAddClick(item, true, { marker, pinElement, imageElement });
      });
      marker.content.addEventListener('mouseover', () => {
        highlightMarker(item, { marker, pinElement, imageElement }, true);
      });
      marker.content.addEventListener('mouseout', () => {
        highlightMarker(item, { marker, pinElement, imageElement }, false);
      });
      markers[item.id] = { marker, imageElement, pinElement };
    });

    setAllStoreHours(storeHours);
    setAllMarkers(markers);
    Object.values(markers).forEach((marker) => marker.marker.setMap(deskMap.current));
    if (mobileMap.current) {
      Object.values(markers).forEach((marker) => marker.marker.setMap(mobileMap.current));
    }
    // Object.values(allMarkers).forEach((marker) => marker.setMap(map));
    infoWindowRef.current = await new google.maps.InfoWindow();
    setIsLoading(false);
  }

  const checkUserCountry = async (loc = currentLocation) => {
    const userCoords = {
      lat: loc.currentLat,
      lng: loc.currentLng,
    };
    const [userCountrySame] = await getUserLocation(userCoords);
    if (!userCountrySame) {
      setShowOutsideCountryError('true');
    } else {
      setShowOutsideCountryError('false');
    }
  };

  const getCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition((position) => {
      const { latitude, longitude } = position.coords;
      setCurrentLocation({
        currentLat: latitude,
        currentLng: longitude,
      });
      checkUserCountry({
        currentLat: latitude,
        currentLng: longitude,
      });
    }, (error) => {
      if (error.code === error.PERMISSION_DENIED) {
        setShowLocationAccessDenied(true);
      }
    });
  };

  useEffect(() => {
    if (activeView === 'map_view') {
      initiateGoogleMap();
    }
  }, [activeView]);

  const checkMatchMedia = (threshold) => {
    if (window.matchMedia(`(max-width: ${threshold})`).matches) {
      return true;
    }
    return false;
  };

  useEffect(() => {
    if (!storesAPIData) {
      return;
    }
    initiateGoogleMap();
  }, [storesAPIData]);

  const getCollectionsStores = async (cords = null) => {
    let lat;
    let lng;
    if (showLocationAccessDenied || showOutsideCountryError === 'true') {
      lat = '' || await getConfigValue('sf-maps-center-lat');
      lng = '' || await getConfigValue('sf-maps-center-lng');
    } else if (currentLocation) {
      lat = currentLocation.currentLat;
      lng = currentLocation.currentLng;
    }
    lat = 25.283943;
    lng = 51.3719108;
    if (cords) {
      lat = cords.lat;
      lng = cords.lng;
    }
    getCollectionStoresGraphQl(cartId, +lat, +lng, isLoggedIn).then((data) => {
      setStoresAPIData(data);
      const shippingAssign = cart.data.extension_attributes.cart.extension_attributes.shipping_assignments.find((assign) => assign.shipping.method === 'click_and_collect_click_and_collect');
      if (shippingAssign) {
        const storeCode = shippingAssign.shipping.extension_attributes.store_code;
        if (storeCode) {
          const dataAddress = shippingAssign.shipping.address;
          const contactInfo = { fullname: `${dataAddress.firstname} ${dataAddress.lastname}`, mobile: dataAddress.telephone, email: dataAddress?.email };
          setCAndCInfo(contactInfo);
        }
      }
    });
  };

  useEffect(() => {
    if (showLocationAccessDenied) {
      getCollectionsStores();
    } else if (showOutsideCountryError !== 'unset') {
      getCollectionsStores();
    }
  }, [showOutsideCountryError, showLocationAccessDenied]);

  useEffect(() => {
    if (!document.getElementById('checkout-google-map')) {
      loadMapScript();
    } else {
      setIsGoogleLoaded(true);
    }
    // getCurrentLocation();
    setIsResponsive(checkMatchMedia('767.5px'));

    window.addEventListener('resize', () => {
      setIsResponsive(checkMatchMedia('767.5px'));
    });

    window.addEventListener('react:validateMobileNumberResult', async (event) => {
      setContactInfoErrors({ ...contactInfoErrors, mobile: event.detail.mobile });
      if (!event.detail.mobile) {
        setIsContinueDirty(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!isGoogleLoaded) {
      return;
    }
    getCurrentLocation();
  }, [isGoogleLoaded]);

  const selectStoreClick = () => {
    if (!selectedAdd) {
      return;
    }
    setDetailsView(true);
  };

  const backClickHandler = async () => {
    if (isResponsive) {
      initiateGoogleMap();
    }
    setDetailsView(false);
  };

  const dismissWarningHandler = () => {
    setDismissWarning(true);
    // setLocateMeClicked(false);
  };

  const renderWarningMsgs = () => {
    let title = null;
    if (showLocationAccessDenied) {
      title = placeholders.mapLocationAccessDenied;
    } else if (showOutsideCountryError === 'true') {
      title = placeholders.mapOutsideCountryErrorTitle;
    }

    const subText = showOutsideCountryError === 'true' ? placeholders.mapOutsideCountryErrorSubtext : null;

    return (
      <>
        <div className="collection-store-warning-title">
          {title}
          .
        </div>
        {subText && (
          <div className="collection-store-warning-desc">
            {subText}
            .
          </div>
        )}
        <button onClick={dismissWarningHandler} className="collection-store-warning-action" type="button">{placeholders.mapDismissBtn}</button>
      </>
    );
  };

  const placesAutocompleteHandler = () => {
    const place = autocompleteService.current.getPlace();
    if (typeof place !== 'undefined' && typeof place.geometry !== 'undefined') {
      const lat = place.geometry.location.lat(); // 25.0640226
      const lng = place.geometry.location.lng(); // 50.82429419999999
      getCollectionsStores({ lat, lng });
    }
  };

  const searchInputHandler = async (eve) => {
    const searchInput = eve.target.value;
    if (searchInput.length > 2) {
      const countryCode = await getConfigValue('country-code');

      if (!autocompleteService.current) {
        const curAutocomplete = new window.google.maps.places.Autocomplete(
          searchInputRef.current,
          {
            types: ['geocode'],
            fields: ['address_components', 'geometry', 'icon', 'name'],
            componentRestrictions: { country: countryCode?.toLowerCase() },
          },
        );

        curAutocomplete.setFields(['place_id', 'geometry', 'name']);

        curAutocomplete.addListener('place_changed', placesAutocompleteHandler);

        autocompleteService.current = curAutocomplete;
      }
    } else if (autocompleteService.current) {
      window.google.maps.event.clearInstanceListeners(autocompleteService.current);
      autocompleteService.current = null;
    }
  };

  const locateMeClickHandler = () => {
    if (!locateMeClicked) {
      setLocateMeClicked(true);
    }
    if ((showLocationAccessDenied || showOutsideCountryError === 'true') && dismissWarning) {
      setDismissWarning(false);
    }
  };

  useEffect(() => {
    if (!isLoading && selectedCollectionStore) {
      selectAddClick(selectedCollectionStore);
    }
  }, [isLoading]);

  const contactInfoUpdated = (flag, formData) => {
    if (isContinueDirty) {
      setIsContinueDirty(false);
    }
    setIsContactInfo(flag);
    setContactInfoRef(formData);
    setCAndCInfo({ fullname: formData.fullname, mobile: formData.mobile, email: formData.email });
  };

  function validateEmail(email) {
    if (!email) {
      return false;
    }
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    return regex.test(email);
  }

  const continueClickHandler = () => {
    const { fullname, email } = contactInfoRef;
    let isValidFullName = false;
    if (fullname && fullname.split(' ').length > 1) {
      isValidFullName = true;
    }
    let isValidEmail = true;
    if (!isLoggedIn) {
      isValidEmail = validateEmail(email);
    }
    if (isValidFullName && isValidEmail) {
      setContactInfoErrors({ ...contactInfoErrors, fullname: false, email: false });
      window.dispatchEvent(new CustomEvent('react:validateMobileNumber', { detail: { ...contactInfoRef } }));
    } else {
      setContactInfoErrors({ ...contactInfoErrors, fullname: !isValidFullName, email: !isValidEmail });
    }
  };

  const createAddressBody = (additionalFields = {}) => ({
    shipping: {
      ...additionalFields,
    },
    extension: {
      action: 'update shipping',
    },
  });

  const continueAndUpdateCart = async () => {
    setIsUpdatingStore(true);
    const countryCode = await getConfigValue('country-code');
    const { fullname, mobile, email } = contactInfoRef;
    const addressBody = createAddressBody({
      shipping_carrier_code: 'click_and_collect',
      shipping_method_code: 'click_and_collect',
      extension_attributes: {
        click_and_collect_type: 'ship_to_store',
        store_code: selectedCollectionStore.store_code,
      },
      shipping_address: {
        city: findValueFromAddress(selectedCollectionStore.address, 'address_city_segment'),
        country_id: countryCode,
        custom_attributes: [
          {
            attribute_code: 'area',
            value: findValueFromAddress(selectedCollectionStore.address, 'area'),
          },
          {
            attribute_code: 'address_city_segment',
            value: findValueFromAddress(selectedCollectionStore.address, 'address_city_segment'),
          },
        ],
        firstname: fullname.split(' ')[0],
        lastname: fullname.split(' ').slice(1, fullname.length - 1).join(' '),
        street: [findValueFromAddress(selectedCollectionStore.address, 'street')],
        telephone: mobile,
        email: email
      },
    });
    const response = await updateCart(addressBody, cartId, isLoggedIn);
    if (response?.response_message?.[1] === 'success') {
      setSelectedCollectionStoreForCheckout(selectedCollectionStore);
      const availablePaymentMethods = await getSubCartGraphql(isLoggedIn, cartId, [ApiConstants.CART_QUERY__PAYMENTS_METHODS]);
      if (availablePaymentMethods) {
        setCart({
          ...cart,
          data: {
            ...cart?.data,
            ...availablePaymentMethods,
            extension_attributes: {
              ...cart.data.extension_attributes,
              cart: {
                ...cart.data.extension_attributes.cart,
                extension_attributes: {
                  ...cart.data.extension_attributes.cart.extension_attributes,
                  shipping_assignments: response?.cart?.extension_attributes?.shipping_assignments,
                },
              },
            },

          },
        });
      }
      if (isLoggedIn) {
        removeRedemption({
          redemptionRequest: {
            quote_id: cart?.data?.extension_attributes?.cart.id,
          },
        }, true);
      }
      onClose();
    } else if (response?.response_message?.[1] === 'error') {
      const errorMessage = response?.response_message?.[0];
      if (errorMessage) {
        window.dispatchEvent(
          new CustomEvent('react:showPageErrorMessage', {
            detail: { message: errorMessage },
          }),
        );
      }
    }
    setIsUpdatingStore(false);
  };

  useEffect(() => {
    if (!isContinueDirty) {
      return;
    }
    continueAndUpdateCart();
  }, [isContinueDirty]);

  useEffect(() => {
    if (storesAPIData && allStoreHours && isMapDetailsView) {
      setDetailsView(true);
    }
  }, [storesAPIData, allStoreHours]);

  const fullScreenClickHandler = async () => {
    if (isFullScreen) {
      const defaultZoom = '' || await getConfigValue('sf-maps-default-zoom-preference');
      setRespSelectedAdd(null);
      mobileMap.current.setCenter({ lat: parseFloat(25.283943), lng: parseFloat(51.3719108) });
      mobileMap.current.setZoom(Number(defaultZoom));
      if (activeMarker.current) {
        const pinEle = activeMarker.current.pinElement;
        pinEle.background = '#ffffff';
        pinEle.glyphColor = '#ffffff';

        const imgEle = activeMarker.current.imageElement;
        imgEle.src = '/icons/logo.svg';
      }
    }
    setIsFullScreen(!isFullScreen);
  };

  const confirmStoreSelect = async () => {
    const item = storesAPIData.items?.find((i) => i.id === respSelectedAdd);
    setSelectedAdd(respSelectedAdd);
    setSelectedCollectionStore(item);
    setDetailsView(true);
  };

  const renderFullscreenDetails = () => {
    if (!respSelectedAdd) {
      return null;
    }
    const item = storesAPIData.items?.find((i) => i.id === respSelectedAdd);
    if (!item) {
      return null;
    }
    const storeHours = generateStoreHours(item.store_hours);
    return (
      <div className="map-fullscreen-details">
        <div className="collection-details-details">
          <Icon className="collection-details-close" name="close" onIconClick={fullScreenClickHandler} />
          <div className="collection-details-name-line">
            <span className="collection-details-store-name">{item.store_name}</span>
            <span>
              {item.distance?.toFixed(2)}
              {' '}
              {placeholders.mapMiles}
            </span>
          </div>
          <StoreDetails item={item} hours={storeHours} />
          <button type="button" onClick={confirmStoreSelect}>{placeholders.mapSelectStoreBtn}</button>
        </div>
      </div>
    );
  };

  const checkBtnDisabled = () => {
    if (detailsView) {
      return !isContactInfo;
    }
    if (isResponsive && activeView === 'map_view') {
      return !respSelectedAdd;
    }
    return !selectedAdd;
  };

  const cStoreWrapperRef = useRef(null);
  const cStoreTitleRef = useRef(null);
  const cStoreContentRef = useRef(null);
  const cStoreSubmitRef = useRef(null);
  const cStoreAddRef = useRef(null);

  useEffect(() => {
    const fullHeight = cStoreWrapperRef.current?.offsetHeight || 0;
    const contentHeight = cStoreContentRef.current?.offsetHeight || 0;
    const addConHeight = cStoreAddRef.current?.offsetHeight || 0;
    const storeTitleHeight = cStoreTitleRef.current?.offsetHeight || 0;
    const storeSubmitHeight = cStoreSubmitRef.current?.offsetHeight || 0;
    const heightToDeduct = contentHeight + storeTitleHeight + storeSubmitHeight - addConHeight;
    const finalHeight = fullHeight - heightToDeduct - 10;

    if (cStoreAddRef.current) {
      cStoreAddRef.current.style.height = `${finalHeight}px`;
    }
  });

  return (
    <div className={`collection-store-main${detailsView ? ' collection-store-details-view' : ''}`}>
      {isLoading && (
        <div className="collection-store-loader">
          <Loader />
        </div>
      )}
      <div ref={mapRefDesktop} className="collection-store-map-wrapper" />
      <div ref={cStoreWrapperRef} className="collection-store-wrapper">
        {detailsView && (
          <div className="collection-store-back">
            <Icon onIconClick={backClickHandler} name="chevron-left" />
          </div>
        )}
        <div ref={cStoreTitleRef} className="collection-store-title">{detailsView ? placeholders.mapCollectionDetails : placeholders.mapCollectionStore}</div>
        {detailsView
          ? (
            <div ref={cStoreContentRef} className="collection-store-content">
              <CollectionDetails item={storesAPIData.items?.find((i) => i.id === selectedAdd)} hours={allStoreHours[selectedAdd]} contactInfoUpdated={contactInfoUpdated} contactInfoErrors={contactInfoErrors} cAndCInfo={cAndCInfo} />
            </div>
          )
          : (
            <div ref={cStoreContentRef} className="collection-store-content">
              {(showOutsideCountryError === 'true' || showLocationAccessDenied) && !dismissWarning && (
                <div className="collection-store-warning">
                  <div className="collection-store-warning-icon">
                    <Icon name="error-message-black" />
                  </div>
                  <div className="collection-store-warning-content">{renderWarningMsgs()}</div>
                </div>
              )}
              <div className="collection-store-find-label">{placeholders.mapFindNearestStore}</div>
              <div className="collection-store-input-container">
                <div className="collection-store-input-div">
                  <div className="collection-store-input-wrapper">
                    <div className="collection-store-input-icon"><Icon name="search-blue" /></div>
                    <input onChange={searchInputHandler} ref={searchInputRef} className="collection-store-input" type="text" placeholder={placeholders.mapExampleDoha} />
                  </div>
                </div>
                <button disabled={!dismissWarning && locateMeClicked} onClick={locateMeClickHandler} className={`collection-store-location-icon${locateMeClicked ? ' clicked' : ''}`} type="button" aria-label="Locate">
                  <LocateSvg hover={locateMeClicked} />
                </button>
              </div>
              <div className="collection-store-btn-container">
                <div className="collection-store-btn-wrapper">
                  <button type="button" className={activeView === 'list_view' ? '' : 'secondary'} onClick={() => viewClickHandler('list_view')}>{placeholders.mapListView}</button>
                  <button type="button" className={activeView === 'map_view' ? '' : 'secondary'} onClick={() => viewClickHandler('map_view')}>{placeholders.mapMapView}</button>
                </div>
              </div>
              {activeView === 'list_view' && storesAPIData && (
                <div ref={cStoreAddRef} className="collection-store-add-container">
                  {(!storesAPIData?.items || !storesAPIData.items.length) && <div className="collection-store-no-location">{placeholders.mapNoLocation}</div>}
                  <ul>
                    {storesAPIData.items?.map((item) => (
                      <li>
                        <button type="button" onClick={() => selectAddClick(item)} className="collection-store-add-line">
                          <div className="collection-list-btn-wrapper">
                            <div className="collection-store-name-holder">
                              <div className="collection-store-name-radio">
                                <input type="radio" readOnly checked={selectedAdd === item.id} />
                              </div>
                              <div className="collection-store-name">{item.store_name}</div>
                            </div>
                            <div className="collection-store-distance">
                              <div>
                                {item.distance?.toFixed(2)}
                                {' '}
                                {placeholders.mapMiles}
                              </div>
                              {isResponsive && (
                                <button type="button" aria-label="Information" onClick={() => addDropdownClick(item.id)}>
                                  <Icon className={item.id === openedAdd ? 'caret-icon-div show' : 'caret-icon-div'} name="caret-up-fill" />
                                  <Icon className={item.id !== openedAdd ? 'caret-icon-div show' : 'caret-icon-div'} name="caret-down-fill" />
                                </button>
                              )}
                            </div>
                          </div>
                        </button>
                        {isResponsive && item.id === openedAdd && (
                          <StoreDetails item={item} hours={allStoreHours[item.id]} />
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activeView === 'map_view' && (
                <div className={`collection-store-mobile-map-wrapper${isFullScreen ? ' fullscreen' : ''}`}>
                  <div ref={mapRefMobile} className="collection-store-mobile-map" />
                  <button onClick={fullScreenClickHandler} type="button" aria-label="Map Fullscreen" className="collection-store-fullscreen-btn"><FullScreenSVG mapFullScreen /></button>
                  {isFullScreen && renderFullscreenDetails()}
                </div>
              )}
            </div>
          )}
        <div ref={cStoreSubmitRef} className="collection-store-submit">
          <button disabled={checkBtnDisabled()} type="button" className={isUpdatingStore ? 'loader' : ''} onClick={detailsView ? continueClickHandler : selectStoreClick}>{isUpdatingStore ? '' : detailsView ? placeholders.mapContinueBtn : placeholders.mapSelectStoreBtn}</button>
        </div>
      </div>
    </div>
  );
}

export default CollectionStore;
