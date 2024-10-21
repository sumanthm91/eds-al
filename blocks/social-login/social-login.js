import { decorateIcons, loadScript } from '../../scripts/aem.js';
import { fetchPlaceholdersForLocale } from '../../scripts/scripts.js';
import { getConfigValue } from '../../scripts/configs.js';
import { setCookie } from '../../scripts/commerce.js';
import { showPageErrorMessage } from '../../scripts/forms.js';
import { datalayerLogin } from '../../scripts/analytics/google-data-layer.js';

async function socialLogin(loginData) {
  const { loginType } = loginData.data;
  document.querySelector(`.login-${loginType}`).classList.add('loader');
  const cookieExpiryDays = await getConfigValue('commerce-login-cookie-expiry-days') || 100;
  const placeholders = await fetchPlaceholdersForLocale();
  const apiDomain = await getConfigValue('commerce-cdn-domain');
  const apiEndPoint = await getConfigValue('sociallogin-endpoint');
  const apiUrl = `${apiDomain}${apiEndPoint}`;
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });
    const responseToken = await response.json();
    if (!response.ok) {
      document.querySelector(`.login-${loginType}`).classList.remove('loader');
      const socialloginErrorMessage = responseToken.error || 'Error with login data';
      showPageErrorMessage(socialloginErrorMessage);
      return;
    }
    if (responseToken.token.length > 0) {
      setCookie('auth_user_token', responseToken.token, cookieExpiryDays);
      datalayerLogin('Login Success', loginType);
      if (window.location.href.indexOf('/cart') > -1) {
        window.location.href = `/${document.documentElement.lang || 'en'}/cart`;
      } else {
        window.location.href = `/${document.documentElement.lang || 'en'}/user/account`;
      }
    }
  } catch (error) {
    console.error('Error logging in', error);
    const genericErrorMessage = placeholders.genericErrorMessage || 'An error occurred while logging in. Please try again.';
    showPageErrorMessage(genericErrorMessage);
  }
}

async function signInWithGoogle() {
  /* eslint-disable no-undef */
  datalayerLogin('Login Attempt', 'Google');
  const storeCode = await getConfigValue('commerce-store-view-code');
  const auth2 = gapi.auth2.getAuthInstance();
  auth2.signIn().then((googleUser) => {
    const profile = googleUser.getBasicProfile();
    const fullName = profile.getName().trim().split(/\s+/);
    const loginData = {
      data: {
        loginType: 'google',
        token: googleUser.getAuthResponse().id_token,
        storeViewCode: storeCode,
        email: profile.getEmail(),
        firstName: fullName[0],
        lastName: fullName.slice(1).join(' '),
      },
    };
    socialLogin(loginData);
  }).catch((error) => {
    console.error('Sign-in error:', error);
  });
}

async function initGoogleSignIn() {
  try {
    await loadScript('https://apis.google.com/js/platform.js', { async: true });
    const GoogleclientID = await getConfigValue('social-Google-clientID');

    gapi.load('auth2', () => {
      gapi.auth2.init({
        client_id: GoogleclientID,
      }).then(() => {
        document.querySelector('.login-google').addEventListener('click', (e) => {
          e.preventDefault();
          signInWithGoogle();
        });
      }).catch((error) => {
        console.error('Error initializing Google Sign-In:', error);
      });
    });
  } catch (error) {
    console.error('Error loading script:', error);
  }
}

export default async function decorate(block) {
  const lang = document.documentElement.lang || 'en';
  const placeholders = await fetchPlaceholdersForLocale();
  const {
    socialloginFacebook, signuphere, noAccount, registerOrLabel, alreadyAccountRegister,
    signinHere, socialloginGoogle,
  } = placeholders;

  const isSignUp = document.querySelector('.signup-container');

  block.innerHTML = `
    <span class="mobile-onlytext">${registerOrLabel}</span>
    <a href="#" class="login-facebook socialauth-button">
      <span class="icon icon-facebook-login"></span>
      <span>${socialloginFacebook}</span>
    </a>
    <a href="#" class="login-google socialauth-button">
      <span class="icon icon-login-google"></span>
      <span>${socialloginGoogle}</span>
    </a>
    <span class="account-text">
      ${isSignUp ? alreadyAccountRegister : noAccount}
    </span>
    <a href="${isSignUp ? `/${lang}/user/login` : `/${lang}/user/register`}" class="sign-up socialauth-button secondary button">
      <span class="icon icon-user"></span>
      <span class="icon icon-user-hover hidden"></span>
      <span>${isSignUp ? signinHere : signuphere}</span>
    </a>
  `;

  decorateIcons(block);
  const storeCode = await getConfigValue('commerce-store-view-code');
  const FBappID = await getConfigValue('social-FB-appID');
  await loadScript('https://connect.facebook.net/en_US/sdk.js', { async: true });

  /* eslint-disable no-undef */
  block.querySelector('.login-facebook').addEventListener('click', async (e) => {
    e.preventDefault();
    datalayerLogin('Login Attempt', 'Facebook');
    FB.init({
      appId: FBappID,
      xfbml: true,
      version: 'v20.0',
    });
    FB.login((response) => {
      if (response.authResponse) {
        const loginData = {
          data: {
            loginType: 'facebook',
            token: response.authResponse.accessToken,
            storeViewCode: storeCode,
          },
        };
        socialLogin(loginData);
      }
    }, { scope: 'email' });
  });
  initGoogleSignIn();
}
