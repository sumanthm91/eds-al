import { getCustomer } from '../../scripts/customer/api.js';
import {
  isLoggedInUser, loadFragment, fetchPlaceholdersForLocale, logout,
} from '../../scripts/scripts.js';

function addLogoutEvent(lang) {
  const aside = document.querySelector('aside');
  const logoutLink = aside.querySelector('li:last-child a');
  if (logoutLink?.href.endsWith('/user/logout')) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logout(`/${lang}/user/login`);
    });
  }
}

function highlightCurrentPage() {
  const aside = document.querySelector('aside');
  const links = aside.querySelectorAll('li a');
  links.forEach((link) => {
    if (link.href === window.location.href) {
      link.classList.add('active');
    }
  });
}

export async function getWelcomeMessage(welcometext, loggedinUsername) {
  const customer = await getCustomer(true);

  const welcomeMessage = document.createElement('div');
  welcomeMessage.classList.add('welcome-message');

  const welcomeMessageTitle = document.createElement('h4');
  const message = welcometext || 'Hi {{name}}';
  const customerName = loggedinUsername === 'fullname' ? `${customer?.firstname} ${customer?.lastname}` : customer?.firstname;
  welcomeMessageTitle.textContent = message.replace('{{name}}', customerName);
  welcomeMessage.appendChild(welcomeMessageTitle);

  return welcomeMessage;
}

function decorateTitleForSubpages(main) {
  if (document.querySelector('body').classList.contains('sub-page')) {
    const lang = document.documentElement.lang || 'en';
    const redirectUrl = `/${lang}/user/account`;
    const title = main.querySelector('div.section:first-child h2, div.section:first-child h3, div.section:first-child h4, div.section:first-child h5');
    if (title) {
      const titleClone = title.cloneNode(true);
      const titleLink = document.createElement('a');
      titleLink.href = redirectUrl;
      titleLink.appendChild(titleClone);
      titleLink.classList.add('section-title');
      main.prepend(titleLink);
    }
  }
}

export default async function decorate(main) {
  const lang = document.documentElement.lang || 'en';
  const redirectUrl = `/${lang}/user/login`;
  if (!isLoggedInUser()) {
    window.location = redirectUrl;
  }
  const placeholders = await fetchPlaceholdersForLocale();
  main.classList.add('sidebar-main');

  decorateTitleForSubpages(main);

  await loadFragment(`/${lang}/fragments/user/sidenav`);
  const helloMemberFragment = await loadFragment(`/${lang}/fragments/user/hello-member`);

  const aside = document.querySelector('aside');
  const helloMember = helloMemberFragment?.querySelector('.hello-member-wrapper');
  if (helloMember) {
    aside.prepend(helloMember);
  }

  const welcomeMessage = await getWelcomeMessage(placeholders.welcomeMember, 'firstname');
  aside.prepend(welcomeMessage);
  highlightCurrentPage();
  addLogoutEvent(lang);

  return main;
}
