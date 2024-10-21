import {
  fetchPlaceholders,
  decorateIcons,
} from '../../scripts/aem.js';
import { createModalFromContent, openModal } from '../../scripts/scripts.js';
import { getConfigValue } from '../../scripts/configs.js';
import { getStores } from '../../scripts/stores/api.js';
import { datalayerSearchStoreFinder } from '../../scripts/analytics/google-data-layer.js';

let storeData = [];
const placeholders = await fetchPlaceholders(`/${document.documentElement.lang}`);
const locationMap = {};
let defaultZoom;
let defaultSelectionZoom;
let defaultCenterLat;
let defaultCenterLng;
let map;
let mapOptions;
const allMarkers = {};
let google;
let googleMapKey;
let googleMapRegional;
let AdvancedMarkerElement;
let PinElement;
let Autocomplete;
const storeInfo = 'store-info';
let currentStoreInfoWindow = null;
let storeInfoContent = null;
let infoWindow = null;
const storeInfoModalId = 'store-info';
let currentLat = null;
let currentLng = null;
let navigationInitialised = false;

function initLocationMap() {
  storeData.forEach((store) => {
    const {
      latitude, longitude, store_name: name, store_code: code,
    } = store;
    locationMap[code] = {
      lat: latitude,
      lng: longitude,
      name,
    };
  });
}

/**
 *
 * @param {string} type HTML element type
 * @param {string} classList list of classes to be added to the element
 * @param {HTMLElement} parent parent element to which the new element will be appended
 * @param {string} innerText text content of the new element
 * @returns {HTMLElement} the newly created element
 */
function createMarkupAndAppendToParent(type = 'div', classList = [], parent = null, innerText = '', dataValue = undefined) {
  const element = document.createElement(type);
  classList.forEach((className) => element.classList.add(className));
  element.innerText = innerText;
  if (dataValue) element.setAttribute('data-value', dataValue);
  if (parent !== null) parent.appendChild(element);
  return element;
}

async function calculateDistanceFromStore(store, startPosition = {}) {
  let randomStartPosition = false;
  let from = new google.maps.LatLng(storeData[0].latitude, storeData[0].longitude);

  // if startPosition is set then take that in account for distance calculation
  if (startPosition && startPosition.lat && startPosition.lng) {
    from = new google.maps.LatLng(startPosition.lat, startPosition.lng);
    randomStartPosition = true;
  } else if (currentLat && currentLng) {
    from = new google.maps.LatLng(currentLat, currentLng);
  } else {
    store.storeDistance = null;
    return null;
  }

  const to = new google.maps.LatLng(store.latitude, store.longitude);
  const service = new google.maps.DistanceMatrixService();

  try {
    const resp = await new Promise((resolve, reject) => {
      service.getDistanceMatrix({
        origins: [from],
        destinations: [to],
        travelMode: google.maps.TravelMode.DRIVING,
        unitSystem: google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false,
      }, (response, status) => {
        if (status === 'OK') {
          resolve(response);
        } else {
          reject(new Error(`Distance matrix request failed with status: ${status}`));
        }
      });
    });

    if (!resp.rows[0].elements[0].distance) {
      if (randomStartPosition) {
        store.searchDistance = null;
      } else {
        store.storeDistance = null;
      }
      return null;
    }
    const distanceMeters = resp.rows[0].elements[0].distance.value;
    const distanceKm = distanceMeters / 1000;
    try {
      if (randomStartPosition) {
        storeData.find((storeL) => storeL.store_code === store.code).searchDistance = distanceKm;
      } else {
        storeData.find((storeL) => storeL.store_code === store.code).storeDistance = distanceKm;
      }
    } catch {
      if (randomStartPosition) {
        store.searchDistance = distanceKm;
      } else {
        store.storeDistance = distanceKm;
      }
    }
    return distanceKm;
  } catch (error) {
    console.error(error);
    return null;
  }
}

function getCompressedOperatingHours(hours) {
  let startDay = null;
  let endDay = null;
  let startHours = null;
  let storeOpening = '';
  hours.forEach((hour) => {
    if (startDay === null) {
      startDay = hour.querySelector('.operating-hours-label').innerText.trim();
      startHours = hour.querySelector('.operating-hours-value').innerText.trim();
    } else if (hour.querySelector('.operating-hours-value').innerText.trim() === startHours) {
      endDay = hour.querySelector('.operating-hours-label').innerText.trim();
    } else {
      if (!endDay) {
        storeOpening += `${startDay} (${startHours})<br>`;
      } else {
        storeOpening += `${startDay} - ${endDay} (${startHours})<br>`;
      }
      startDay = hour.querySelector('.operating-hours-label').innerText.trim();
      startHours = hour.querySelector('.operating-hours-value').innerText.trim();
      endDay = null;
    }
  });
  if (startDay !== null) {
    if (endDay !== null) {
      storeOpening += `${startDay} - ${endDay} (${startHours})<br>`;
    } else {
      storeOpening += `${startDay} (${startHours})<br>`;
    }
  }

  return storeOpening;
}

function updateStoreInfoContent(ele) {
  if (!ele.querySelector(`.${storeInfo}-header`)) {
    createMarkupAndAppendToParent('div', [`${storeInfo}-header`], ele);
  }
  if (!ele.querySelector('.name')) {
    createMarkupAndAppendToParent('div', ['name'], ele.querySelector(`.${storeInfo}-header`), '{{storeName}}', '{{storeName}}');
  }
  if (!ele.querySelector('.distance')) {
    createMarkupAndAppendToParent('div', ['distance'], ele.querySelector(`.${storeInfo}-header`), '{{storeDistance}}', '{{storeDistance}}');
  }
  ele.querySelector('.name').innerText = ele.querySelector('.name').getAttribute('data-value')
    .replace('{{storeName}}', document.querySelector('.sf-content-left-detail .sd-name').innerText);
  ele.querySelector('.distance').innerText = ele.querySelector('.distance').getAttribute('data-value')
    .replace('{{storeDistance}}', document.querySelector('.sf-content-left-detail .sd-distance').innerText);
  ele.querySelector('.address').innerText = ele.querySelector('.address').getAttribute('data-value').replace('{{storeAddress}}', document.querySelector('.sf-content-left-detail .sd-address').innerText);
  ele.querySelector('.availability').innerText = ele.querySelector('.availability').getAttribute('data-value')
    .replace('{{storeAvailability}}', document.querySelector('.sf-content-left-detail .sd-delivery').innerText);
  ele.querySelector('.hours').innerHTML = getCompressedOperatingHours(document.querySelectorAll('.sf-content-left-detail .sd-hours .operating-hours'));
  ele.querySelector('.navigation').setAttribute('data-coordinates', `${document.querySelector('.sf-content-left-detail .sd-lat').innerText},${document.querySelector('.sf-content-left-detail .sd-lng').innerText}`);
}

async function initGoogleMapsMarker() {
  let i = 1;
  Object.keys(locationMap).forEach((key) => {
    const { lat, lng, name } = locationMap[key];
    const marker = new AdvancedMarkerElement({
      position: { lat: parseFloat(lat), lng: parseFloat(lng) },
      content: new PinElement({
        background: '#FFFFFF',
        borderColor: '#FF0000',
        glyph: i.toString(),
        glyphColor: 'white',
      }).element,
      title: name,
    });
    const imageUrl = '/icons/logo.svg';
    const imageElement = document.createElement('img');
    imageElement.classList.add('store-marker-img');
    imageElement.src = imageUrl;
    marker.content.appendChild(imageElement);
    marker.addListener('click', () => {
      document.querySelector(`.sf-store-block[data-store-code='${key}']`).click();

      // Close the currently open InfoWindow if it exists
      if (currentStoreInfoWindow) {
        currentStoreInfoWindow.close();
      }

      if (window.matchMedia('(max-width: 768px)').matches) {
        updateStoreInfoContent(document.querySelector('.store-info-modal .store-info'));
        const navigationBtn = document.querySelector('.store-info-modal .navigation');
        navigationBtn.setAttribute('data-coordinates', `${document.querySelector('.sf-content-left-detail .sd-lat').innerText},${document.querySelector('.sf-content-left-detail .sd-lng').innerText}`);
        openModal(`${storeInfoModalId}-dialog`);
      } else {
        updateStoreInfoContent(storeInfoContent);
        infoWindow = new google.maps.InfoWindow({
          content: storeInfoContent,
        });
        // Open the new InfoWindow and set it as the current one
        infoWindow.open(marker.map, marker);
        currentStoreInfoWindow = infoWindow;
        google.maps.event.addListener(infoWindow, 'domready', () => {
          const headerBtn = document.querySelector('.gm-ui-hover-effect').parentElement;
          headerBtn.querySelector('div').appendChild(document.querySelector('.store-info-header'));
        });
      }
    });
    allMarkers[key] = marker;
    i += 1;
  });
}

async function initData() {
  await getStores()
    .then((data) => {
      // extract store data
      storeData = data.items;

      // initialise location map coordinates for each store
      initLocationMap();

      // create markers for each store
      initGoogleMapsMarker();
    });
}

function decorateSFTitle(block) {
  const title = createMarkupAndAppendToParent('div', ['sf-title'], block);
  const arrowDir = (document.querySelector('html').getAttribute('dir') === 'rtl') ? 'right' : 'left';
  const headBackNav = createMarkupAndAppendToParent('span', ['icon', `icon-arrow-${arrowDir}`, 'head-back-nav'], title);
  createMarkupAndAppendToParent('h5', ['sf-heading'], title, placeholders.sfTitle);
  decorateIcons(title);

  headBackNav.addEventListener('click', () => {
    map.setZoom(Number(defaultZoom));
    map.panTo({
      lat: Number(defaultCenterLat),
      lng: Number(defaultCenterLng),
    });
    if (allMarkers.search) allMarkers.search.setMap(null);
  });
}

function normaliseStoreDetail(store) {
  const storeItem = {};
  storeItem.name = store.store_name;
  storeItem.latitude = store.latitude;
  storeItem.longitude = store.longitude;
  storeItem.address = store.address.reduce((acc, { code, value }) => {
    acc[code] = value;
    return acc;
  }, {});
  storeItem.id = store.store_id;
  storeItem.code = store.store_code;
  storeItem.email = store.store_email;
  storeItem.phone = store.store_phone;
  storeItem.hours = store.store_hours.reduce((acc, { label, value }) => {
    acc[label] = value;
    return acc;
  }, {});
  storeItem.deliveryTimeLabel = store.sts_delivery_time_label;
  return storeItem;
}

function decorateDistanceFromStore(block, store) {
  const storeX = storeData.find((storeL) => storeL.store_code === store.code);
  if (!storeX.storeDistance && storeX.storeDistance !== 0) {
    calculateDistanceFromStore(store);
  }
  let displayDistance = storeX.storeDistance ? `${storeX.storeDistance.toFixed(1)} KM` : '';
  if (displayDistance === '' && storeX.storeDistance === 0) {
    displayDistance = '0.0 KM';
  }
  if (storeX.searchDistance !== 0 && document.querySelector('.sf-search-input')?.value) {
    displayDistance = storeX.searchDistance ? `${storeX.searchDistance.toFixed(1)} KM` : '';
  }
  const storeDistance = createMarkupAndAppendToParent('div', ['store-distance'], block, displayDistance);
  createMarkupAndAppendToParent('span', ['icon', 'icon-distance'], storeDistance);
}

function initStoreDetailData(store) {
  // add the store detail page
  map.panTo(allMarkers[store.code].position);
  document.querySelector('.sd-name').innerText = store.name;
  document.querySelector('.sd-address').innerText = store.address.street;
  document.querySelector('.sd-delivery').innerText = store.deliveryTimeLabel;
  document.querySelector('.sd-distance').innerText = store.storeDistance;
  document.querySelector('.sd-lng').innerText = store.longitude;
  document.querySelector('.sd-lat').innerText = store.latitude;
  const phoneContact = document.querySelector('.sd-phone');
  phoneContact.innerHTML = '';
  store.phone.split('/').forEach((phone) => {
    createMarkupAndAppendToParent('span', ['contact'], phoneContact, phone);
  });
  const openingHours = document.querySelector('.sd-hours');
  openingHours.innerHTML = '';
  Object.keys(store.hours).map((key) => {
    const opsHours = createMarkupAndAppendToParent('div', ['operating-hours'], openingHours);
    createMarkupAndAppendToParent('span', ['operating-hours-label'], opsHours, key);
    createMarkupAndAppendToParent('span', ['operating-hours-value'], opsHours, store.hours[key]);
    return opsHours;
  });
  if (!navigationInitialised) {
    document.querySelector('.sd-navigation').addEventListener('click', () => {
      window.open(`https://www.google.com/maps/dir/Current+Location/${document.querySelector('.sf-content-left-detail .sd-lng').innerText.trim()},${document.querySelector('.sf-content-left-detail .sd-lat').innerText.trim()}`, '_blank');
    });
    navigationInitialised = true;
  }
}

async function decorateStoreItem(block, store) {
  const storeX = normaliseStoreDetail(store);
  const storeBlock = createMarkupAndAppendToParent('div', ['sf-store-block'], block);
  storeBlock.setAttribute('data-store-code', storeX.code);
  const storeItem = createMarkupAndAppendToParent('div', ['sf-store-block-item'], storeBlock);
  const storeItemEntry = createMarkupAndAppendToParent('div', ['sf-store-block-item-entry'], storeItem);
  const storeItemDist = createMarkupAndAppendToParent('div', ['sf-store-block-item-dist'], storeItem);
  createMarkupAndAppendToParent('a', ['sf-store-name'], storeItemEntry, storeX.name);
  createMarkupAndAppendToParent('div', ['sf-store-address'], storeItemEntry, storeX.address.street);
  createMarkupAndAppendToParent('div', ['sf-store-phone'], storeItemEntry, storeX.phone.replaceAll('/', ', ').trim());
  createMarkupAndAppendToParent('hr', [], storeBlock);

  // check distance between current location and store
  Promise.all([
    decorateDistanceFromStore(storeItemDist, storeX),
  ]).then(() => {
    // Code to execute after all function calls are completed
  }).catch((error) => {
    console.error(error);
  });

  // add event listener to store block on click to show store detail
  storeBlock.addEventListener('click', (event) => {
    let ele = event.target;
    if (!ele.classList.contains('sf-store-block')) {
      ele = event.target.closest('.sf-store-block');
    }
    storeX.storeDistance = ele.querySelector('.store-distance').innerText;
    map.setZoom(Number(defaultSelectionZoom));
    initStoreDetailData(storeX);
    const title = document.querySelector('.sf-content-left-detail .sd-name').innerText;
    const targetMarker = Object.entries(allMarkers)
      .filter(([key]) => allMarkers[key].targetElement.title === title)
      .map(([key]) => allMarkers[key]);
    if (targetMarker && targetMarker.length > 0) {
      google.maps.event.trigger(targetMarker[0], 'click');
    }
  });
}

function decorateStoreList(block) {
  document.querySelector('.sf-content-left-list .sf-store-list-container')?.remove();
  const storeList = createMarkupAndAppendToParent('div', ['sf-store-list-container'], block);
  storeData.forEach((store) => {
    Promise.all([
      decorateStoreItem(storeList, store),
    ]).then(() => {
      // Code to execute after all function calls are completed
    }).catch((error) => {
      console.error(error);
    });
  });
  return storeList;
}

function decorateSortedStoreList(sortBy = 'storeName') {
  if (sortBy === 'userDistance' && currentLat && currentLng) {
    storeData.sort((a, b) => {
      if (a.storeDistance === null) {
        return 1;
      }
      if (b.storeDistance === null) {
        return -1;
      }
      return a.storeDistance - b.storeDistance;
    });
  } else if (sortBy === 'searchDistance') {
    storeData.sort((a, b) => {
      if (a.searchDistance === null) {
        return 1;
      }
      if (b.searchDistance === null) {
        return -1;
      }
      return a.searchDistance - b.searchDistance;
    });
  } else {
    storeData.sort((a, b) => a.store_name.localeCompare(b.store_name));
  }
  decorateStoreList(document.querySelector('.sf-content-left-list'));
}

function initSearchInput(inputBlock) {
  if (!storeData[0]) {
    return;
  }

  // Create a bounding box with sides ~10km away from the center point
  const center = { lat: storeData[0].latitude, lng: storeData[0].longitude };
  const defaultBounds = {
    north: parseFloat(center.lat) + 0.1,
    south: parseFloat(center.lat) - 0.1,
    east: parseFloat(center.lng) + 0.1,
    west: parseFloat(center.lng) - 0.1,
  };
  const countryRegional = googleMapRegional || placeholders.sfGoogleMapsRegional;
  const options = {
    bounds: defaultBounds,
    componentRestrictions: { country: countryRegional },
    fields: ['address_components', 'geometry', 'icon', 'name'],
    strictBounds: false,
  };
  const autocomplete = new Autocomplete(inputBlock, options);
  autocomplete.setFields(['place_id', 'geometry', 'name']);
  autocomplete.addListener('place_changed', async () => {
    document.querySelector('.store-info-header')?.parentElement?.parentElement?.querySelector('button[aria-label=Close]')?.click();
    const place = autocomplete.getPlace();
    if (!place.geometry) {
      return;
    }
    const { lat, lng } = place.geometry.location;
    const marker = new AdvancedMarkerElement({
      position: { lat: lat(), lng: lng() },
      title: place.name,
      content: new PinElement({
        background: '#FFFFFF',
        borderColor: '#FF0000',
        glyphColor: 'white',
      }).element,
    });
    marker.setMap(null);
    const imageUrl = '/icons/logo.svg';
    const imageElement = document.createElement('img');
    imageElement.classList.add('store-marker-img');
    imageElement.src = imageUrl;
    marker.content.appendChild(imageElement);
    allMarkers.search = marker;
    map.setZoom(Number(defaultSelectionZoom));
    map.panTo(marker.position);
    await Promise.all(
      storeData.map((store) => calculateDistanceFromStore(store, { lat: lat(), lng: lng() })),
    );
    decorateSortedStoreList('searchDistance');
    const searchedTerm = document.querySelector('.sf-search-input').value;
    datalayerSearchStoreFinder(searchedTerm);
  });
}

function decorateSearchInput(block) {
  const searchInputContainer = createMarkupAndAppendToParent('div', ['sf-search-input-container'], block);
  createMarkupAndAppendToParent('span', ['icon', 'search-icon'], searchInputContainer);
  const searchInput = createMarkupAndAppendToParent('input', ['sf-search-input'], searchInputContainer);
  searchInput.setAttribute('placeholder', placeholders.sfSearchPlaceholder);
  initSearchInput(searchInput);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.value === '') {
      allMarkers.search.setMap(null);
      map.setZoom(Number(defaultZoom));
      map.panTo({
        lat: Number(defaultCenterLat),
        lng: Number(defaultCenterLng),
      });
      decorateSortedStoreList('userDistance');
    }
  });
  return searchInputContainer;
}

function decorateLocateMe(block) {
  const locateMeContainer = createMarkupAndAppendToParent('div', ['locate-me-container'], block);
  createMarkupAndAppendToParent('span', ['icon', 'sf-locate'], locateMeContainer);
  createMarkupAndAppendToParent('a', ['near-me'], locateMeContainer, placeholders.sfNearMe);

  // add event listener to locate me button on click
  locateMeContainer.addEventListener('click', () => {
    if (currentLat && currentLng) {
      const marker = new AdvancedMarkerElement({
        position: { lat: parseFloat(currentLat), lng: parseFloat(currentLng) },
      });
      map.panTo(marker.position);
      storeData.forEach((store) => { store.searchDistance = 0; });
      decorateSortedStoreList('userDistance');
    } else {
      console.error('Geolocation is either not supported or blocked by this browser.');
    }
  });

  return locateMeContainer;
}

function decorateStoreContentNavigation(block) {
  const leftNav = createMarkupAndAppendToParent('div', ['sf-content-left-list'], block);
  decorateSearchInput(leftNav);
  decorateLocateMe(leftNav);
  // decorateStoreList(leftNav);
  decorateSortedStoreList('storeName');
}

function decorateStoreDetail(block) {
  const leftNav = createMarkupAndAppendToParent('div', ['sf-content-left-detail'], block);
  const backNavigation = createMarkupAndAppendToParent('span', ['icon', 'icon-arrow-left', 'details-back-nav'], leftNav);
  createMarkupAndAppendToParent('a', ['sf-back'], backNavigation, placeholders.sfBack);
  createMarkupAndAppendToParent('h5', ['sd-name'], leftNav);
  createMarkupAndAppendToParent('div', ['sd-address'], leftNav);
  createMarkupAndAppendToParent('div', ['sd-phone'], leftNav);
  createMarkupAndAppendToParent('div', ['sd-opening-hours'], leftNav, placeholders.sfOpeningHours);
  createMarkupAndAppendToParent('div', ['sd-hours'], leftNav);
  createMarkupAndAppendToParent('div', ['sd-delivery'], leftNav);
  createMarkupAndAppendToParent('div', ['sd-distance'], leftNav);
  createMarkupAndAppendToParent('div', ['sd-lng'], leftNav);
  createMarkupAndAppendToParent('div', ['sd-lat'], leftNav);

  const getDir = createMarkupAndAppendToParent('div', ['sd-navigation'], leftNav);
  createMarkupAndAppendToParent('a', ['sd-navigation-text'], getDir, placeholders.sfGetDirections);
  createMarkupAndAppendToParent('span', ['icon', 'icon-get-directions'], getDir);

  // add event listener to back navigation on click
  backNavigation.addEventListener('click', () => {
    map.setZoom(Number(defaultZoom));
    map.panTo({
      lat: Number(defaultCenterLat),
      lng: Number(defaultCenterLng),
    });
    if (allMarkers.search) allMarkers.search.setMap(null);
  });

  // decorate icons
  decorateIcons(leftNav);
}

async function initiateGoogleMap(block) {
  const mapBlock = document.createElement('div');
  mapBlock.classList.add('sf-content-map-view');
  block.appendChild(mapBlock);

  if (!google) {
    return;
  }

  // set the map default options
  mapOptions = {
    zoom: Number(defaultZoom),
    center: new google.maps.LatLng(Number(defaultCenterLat), Number(defaultCenterLng)),
    mapId: 'ALSHAYA_MAP_ID',
  };
  map = new google.maps.Map(mapBlock, mapOptions);
  Object.values(allMarkers).forEach((marker) => marker.setMap(map));
}

function decorateStoreContentMaps(block) {
  const rightNav = createMarkupAndAppendToParent('div', ['sf-content-right'], block);
  initiateGoogleMap(createMarkupAndAppendToParent('div', ['sf-content-map-container'], rightNav));
}

function decorateSFContent(block) {
  createMarkupAndAppendToParent('hr', [], block);
  const content = createMarkupAndAppendToParent('div', ['sf-content'], block);
  decorateStoreContentNavigation(content);
  decorateStoreDetail(content);
  decorateStoreContentMaps(content);
  return content;
}

function decorateStoreFinder(block) {
  decorateSFTitle(block);
  decorateSFContent(block);
}

async function loadConfigs() {
  defaultCenterLat = '' || await getConfigValue('sf-maps-center-lat');
  defaultCenterLng = '' || await getConfigValue('sf-maps-center-lng');
  defaultZoom = '' || await getConfigValue('sf-maps-default-zoom-preference');
  defaultSelectionZoom = '' || await getConfigValue('sf-maps-selection-zoom-preference');
  googleMapKey = '' || await getConfigValue('sf-google-maps-key');
  googleMapRegional = '' || await getConfigValue('sf-maps-regional-preference');
  googleMapRegional = '' || await getConfigValue('sf-maps-regional-preference');
  await import(`https://maps.googleapis.com/maps/api/js?key=${googleMapKey}&async=true`);
  google = await window.google;
  const markerLibrary = await google.maps.importLibrary('marker');
  AdvancedMarkerElement = markerLibrary.AdvancedMarkerElement;
  PinElement = markerLibrary.PinElement;
  const placesLibrary = await google.maps.importLibrary('places');
  Autocomplete = placesLibrary.Autocomplete;
  storeInfoContent = createMarkupAndAppendToParent('div', [storeInfo]);
  const collectPrompt = placeholders.sfCollectPrompt || 'Collect in store within';
  const storeInfoHeaderParent = createMarkupAndAppendToParent('div', ['store-info-header-parent'], storeInfoContent);
  const storeInfoHeader = createMarkupAndAppendToParent('div', ['store-info-header'], storeInfoHeaderParent);
  createMarkupAndAppendToParent('div', ['name'], storeInfoHeader, '{{storeName}}', '{{storeName}}');
  createMarkupAndAppendToParent('div', ['distance'], storeInfoHeader, '{{storeDistance}}', '{{storeDistance}}');
  createMarkupAndAppendToParent('div', ['address'], storeInfoContent, '{{storeAddress}}', '{{storeAddress}}');
  createMarkupAndAppendToParent('div', ['availability'], storeInfoContent, '{{storeAvailability}}', `${collectPrompt} {{storeAvailability}}`);
  createMarkupAndAppendToParent('div', ['hours'], storeInfoContent, '{{storeHours}}', '{{storeHours}}');
  const navigationDiv = createMarkupAndAppendToParent('div', ['navigation'], storeInfoContent, '', '{{storeNavigation}}');
  createMarkupAndAppendToParent('a', ['navigation-text'], navigationDiv, placeholders.sfGetDirections);
  createMarkupAndAppendToParent('span', ['icon', 'icon-get-directions'], navigationDiv);
  decorateIcons(navigationDiv);
  navigationDiv.addEventListener('click', () => {
    const coordinates = navigationDiv.getAttribute('data-coordinates').split(',');
    window.open(`https://www.google.com/maps/dir/Current+Location/${coordinates[0].trim()},${coordinates[1].trim()}`, '_blank');
  });
  await initData();
  await Promise.all(storeData.map(calculateDistanceFromStore));
  await createModalFromContent(`${storeInfoModalId}-dialog`, '', storeInfoContent.outerHTML, [`${storeInfo}-modal`]);
  const modalClose = document.querySelector(`.${storeInfo}-modal .modal-header > button`);
  document.querySelector(`.${storeInfo}-modal .store-info-header-parent`).appendChild(modalClose);
  document.querySelector('.store-info-modal .navigation').addEventListener('click', (e) => {
    const coordinates = e.target.closest('.navigation').getAttribute('data-coordinates').split(',');
    window.open(`https://www.google.com/maps/dir/Current+Location/${coordinates[0].trim()},${coordinates[1].trim()}`, '_blank');
  });
}

function decorateBlockSkeleton(block) {
  decorateStoreFinder(block);
  const listContainer = block.querySelector('.sf-store-list-container');
  const mapContainer = block.querySelector('.sf-content-map-view');
  for (let i = 0; i < 10; i += 1) {
    const storeItem = createMarkupAndAppendToParent('div', ['sf-store-block', 'item-skeleton'], listContainer);
    createMarkupAndAppendToParent('div', ['sf-store-block-item'], storeItem);
    createMarkupAndAppendToParent('div', ['sf-store-block-item'], storeItem);
    createMarkupAndAppendToParent('hr', [], storeItem);
  }
  createMarkupAndAppendToParent('div', ['sf-store-map-item', 'map-skeleton'], mapContainer);
}

export default async function decorate(block) {
  block.parentElement.parentElement.classList.add('full-width');

  while (block.firstChild) block.removeChild(block.firstChild);
  decorateBlockSkeleton(block);

  navigator.geolocation?.getCurrentPosition((position) => {
    const { latitude, longitude } = position.coords;
    currentLat = latitude;
    currentLng = longitude;
  });

  window.addEventListener('delayed-loaded', () => {
    loadConfigs().then(() => {
      while (block.firstChild) block.removeChild(block.firstChild);
      decorateStoreFinder(block);
      decorateSortedStoreList('userDistance');
    });
  });
}
