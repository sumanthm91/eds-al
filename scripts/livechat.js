import { getConfigValue } from './configs.js';
import { getCustomer } from './customer/api.js';
import { getCookie } from './commerce.js';

const storeCode = await getConfigValue('commerce-store-view-code');

function getUserHash(sprinklrHash) {
  const hash = Object.values(sprinklrHash).find((value) => value.startsWith(storeCode));
  return hash ? hash.split('-')[1] : null;
}

const lang = document.documentElement.lang || 'en';
const liveChatAppId = await getConfigValue(`live-chat-app-id-${lang}`);

function isLoggedInUser() {
  return !!getCookie('auth_user_token');
}
const isAuthenticated = await isLoggedInUser();

if (isAuthenticated) {
  const data = await getCustomer();
  const userData = (data.extension_attributes.sprinklr_user_data_fields);
  const sprinklrHash = (data.extension_attributes.sprinklr_hash);
  const userHash = getUserHash(sprinklrHash);
  const myAccountURL = `${window.location.origin}/${lang}/user/account`;
  window.sprChatSettings = {
    appId: liveChatAppId,
    skin: 'MODERN',
    user: {
      id: userData.id,
      firstName: userData.first_name,
      lastName: userData.last_name,
      profileImageUrl: userData.profile_image_url,
      phoneNo: userData.phone_no,
      email: userData.email,
      hash: userHash,
    },
    // isAuthenticated TRUE or FALSE
    clientContext: {
      _c_63bcf8d81e28737162edd703: ['True'],
      _c_665ec05f18a11d6104ea05f0: [myAccountURL],
    },
  };
} else {
  const loginURL = `${window.location.origin}/${lang}/user/login`;
  window.sprChatSettings = {
    appId: liveChatAppId,
    skin: 'MODERN',
    // loginURL
    userContext: { _c_63b6a6587e86835dfdcc0ed9: [loginURL] },
    // isAuthenticated TRUE or FALSE
    clientContext: { _c_63bcf8d81e28737162edd703: ['False'] },
  };
}
/* eslint-disable */
(function(){var t=window,e=t.sprChat,a=e&&!!e.loaded,n=document,r=function(){r.m(arguments)};r.q=[],r.m=function(t){r.q.push(t)},t.sprChat=a?e:r;var e2=t.sprTeamChat,r2=function(){r2.m(arguments)};r2.q=[],r2.m=function(t){r2.q.push(t)},t.sprTeamChat=e2?e2:r2;var o=function(){var e=n.createElement("script"); e.type="text/javascript",e.async=!0,e.src="https://prod2-live-chat.sprinklr.com/api/livechat/handshake/widget/"+t.sprChatSettings.appId; e.onerror=function(){t.sprChat.loaded=!1},e.onload=function(){t.sprChat.loaded=!0};var a=n.getElementsByTagName("script")[0];a.parentNode.insertBefore(e,a)};"function"==typeof e?a?e("update",t.sprChatSettings):o():"loading"!==n.readyState?o():n.addEventListener("DOMContentLoaded",o)})()
/* eslint-enable */
