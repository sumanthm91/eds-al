import { decorateIcons, getMetadata } from '../../scripts/aem.js';
import { fetchCategories } from '../../scripts/commerce.js';
import { getConfigValue } from '../../scripts/configs.js';
import { loadFragment, showToastNotification, fetchPlaceholdersForLocale } from '../../scripts/scripts.js';
import { sendAttributesToDataLayer, datalayerLanguageSwitchEvent, datalayerFooterNavigationEvent } from '../../scripts/analytics/google-data-layer.js';

function findList(headingElement) {
  let nextElement = headingElement.nextElementSibling;
  while (nextElement && !nextElement.classList.contains('footer-list-item')) {
    nextElement = nextElement.nextElementSibling;
  }
  return nextElement;
}

function toggleExpand(headingElement) {
  const isExpanded = headingElement.classList.contains('expand');
  const wrapper = headingElement.closest('.footer-list-wrapper');
  const columns = wrapper.querySelectorAll('.footer-list');

  const content = findList(headingElement);

  columns.forEach((column) => {
    const headingElements = column.querySelectorAll('.footer-primary h3');
    headingElements.forEach((heading) => {
      const columnContent = findList(heading);
      if (heading === headingElement && !isExpanded) {
        heading.classList.add('expand');
        content.style.maxHeight = `${content.scrollHeight}px`;
      } else if (heading === headingElement && isExpanded) {
        heading.classList.remove('expand');
        content.style.maxHeight = null;
      } else {
        heading.classList.remove('expand');
        columnContent.style.maxHeight = null;
      }
    });
  });
}

function hasCategories(categories) {
  return categories?.commerce_categories?.items?.[0]?.children?.length > 0 ?? false;
}

function setNavLinksDataLayer(footer) {
  const navLinks = footer.querySelectorAll('.footer-list-wrapper > .footer-list:not(:last-child)');
  navLinks.forEach((navLink) => {
    const navHeading = navLink.querySelector('h3')?.textContent || '';
    const navItems = navLink.querySelectorAll('li a');
    navItems.forEach((navItem) => {
      navItem.addEventListener('click', () => {
        const linkName = navItem.getAttribute('data-gtm-name') || navItem.textContent;
        datalayerFooterNavigationEvent(navItem, navHeading, linkName);
      });
    });
  });
}

async function decorateCategoryLinks(block) {
  const categoryHeading = block.querySelector('.footer-primary h3:first-of-type');

  if (!categoryHeading) {
    return;
  }

  let categoryList = categoryHeading.closest('div').querySelector('ul');
  const categories = await fetchCategories();

  if (hasCategories(categories)) {
    // if ul doesn't exist, create it
    if (!categoryList) {
      categoryList = document.createElement('ul');
      categoryList.classList.add('footer-list-item');
      categoryHeading.insertAdjacentElement('afterend', categoryList);
    }

    // iterate over categories and create list items
    categories.commerce_categories.items[0].children.forEach((category) => {
      // ignore if category is not to be included in menu
      if (category.include_in_menu === 0) {
        return;
      }

      const categoryUrl = `/${document.documentElement.lang}/${category.url_path}`;
      const { name, level, gtm_name: gtmName } = category;

      const categoryLink = document.createElement('a');
      categoryLink.href = categoryUrl;
      categoryLink.title = name;
      categoryLink.textContent = name;
      categoryLink.setAttribute('data-level', level);
      categoryLink.setAttribute('data-gtm-name', gtmName);

      const categoryListItem = document.createElement('li');
      categoryListItem.appendChild(categoryLink);
      categoryList.appendChild(categoryListItem);
    });
  }
  setNavLinksDataLayer(block);
}

function showErrorMessage(form, message) {
  form.querySelector('.error-message').innerText = message;
  form.classList.add('invalid');
}

function resetMessage(form) {
  form.querySelector('.error-message').innerText = '';
  form.classList.remove('invalid');
  form.classList.remove('success');
}

function validateEmail(form, input) {
  resetMessage(form);
  if (!input.checkValidity()) {
    let errorMessage = '';
    if (form.email.validity.valueMissing) {
      errorMessage = form.email.dataset.validationRequiredMessage;
    } else if (form.email.validity.typeMismatch) {
      errorMessage = form.email.dataset.validationTypeMismatchMessage;
    }
    showErrorMessage(form, errorMessage);
  }
}

function submitNewsletter(form) {
  const email = form.email.value;

  fetch(form.action, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then((data) => {
      if (data.is_subscribed) {
        showErrorMessage(form, form.dataset.alreadySubscribed);
      } else {
        form.reset();
        showToastNotification(form.dataset.success);
        sendAttributesToDataLayer({
          event: 'leads',
          leadType: 'footer',
          leadMessage: form.dataset.newsletterOfferMsg, // indicate the message shown to the user
        });
      }
    })
    .catch(() => {
      showErrorMessage(form, form.dataset.error);
    })
    .finally(() => {
      form.querySelector('button').classList.remove('loader');
    });
}

async function decorateNewsletter(footer) {
  const {
    emailRequiredMessage,
    emailValidMessage,
    emailAlreadySubscribed,
    genericErrorMessage,
    emailSubscribedSuccessMessage,
  } = await fetchPlaceholdersForLocale();

  const emailField = footer.querySelector('.footer-list-wrapper > div:nth-child(4) > p:first-of-type');
  const emailButton = footer.querySelector('.footer-list-wrapper > div:nth-child(4) > p:last-of-type > a');

  const emailFieldDiv = document.createElement('div');
  emailFieldDiv.className = 'email-field';

  const emailLabel = document.createElement('label');
  emailLabel.textContent = emailField.textContent;
  emailLabel.htmlFor = 'email';
  emailLabel.hidden = true;

  const inputField = document.createElement('input');
  inputField.type = 'email';
  inputField.placeholder = emailField.textContent;
  inputField.required = true;
  inputField.id = 'email';
  inputField.dataset.validationRequiredMessage = emailRequiredMessage || 'Please enter an email address';
  inputField.dataset.validationTypeMismatchMessage = emailValidMessage || 'Email address does not contain a valid email.';

  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message-container';

  const errorField = document.createElement('span');
  errorField.textContent = '';
  errorField.className = 'error-message';

  const icon = document.createElement('span');
  icon.classList.add('icon', 'icon-info-small-error');
  errorDiv.appendChild(icon);
  errorDiv.appendChild(errorField);

  const button = document.createElement('button');
  emailField.replaceWith(inputField);

  const buttonLabel = document.createElement('span');
  buttonLabel.className = 'button-label';
  buttonLabel.textContent = emailButton.textContent;
  button.prepend(buttonLabel);

  emailButton.parentElement.replaceWith(button);

  const emailContainer = document.createElement('div');
  emailContainer.className = 'email-container';

  const emailForm = document.createElement('form');
  emailForm.action = `${await getConfigValue('commerce-rest-endpoint')}/${await getConfigValue('commerce-store-view-code')}/V1/newsletter/subscription`;
  emailForm.method = 'POST';
  emailForm.noValidate = true;
  emailForm.dataset.alreadySubscribed = emailAlreadySubscribed || 'This email address is already subscribed.';
  emailForm.dataset.error = genericErrorMessage || 'An error occurred. Please try again later.';
  emailForm.dataset.success = emailSubscribedSuccessMessage || 'You have successfully subscribed to our newsletter.';
  const newsletterOfferMsg = footer.querySelector('.footer-list-wrapper > div:nth-child(4) > h3').textContent?.trim();
  emailForm.dataset.newsletterOfferMsg = newsletterOfferMsg || 'Enjoy 10% off your first order';

  const newsletter = footer.querySelector('.footer-list-wrapper > div:nth-child(4)');
  emailFieldDiv.appendChild(emailLabel);
  emailFieldDiv.appendChild(inputField);

  emailContainer.appendChild(emailFieldDiv);
  emailContainer.appendChild(button);
  emailForm.appendChild(emailContainer);
  emailForm.appendChild(errorDiv);
  newsletter.insertBefore(emailForm, newsletter.children[1]);

  decorateIcons(emailForm);

  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    // prevent multiple clicks
    if (emailForm.querySelector('button').classList.contains('loader')) {
      return;
    }
    const form = e.target.closest('form');
    if (form.checkValidity()) {
      emailForm.querySelector('button').classList.add('loader');
      form.querySelector('div.email-container').classList.remove('invalid');
      submitNewsletter(form);
    } else {
      validateEmail(form, form.email);
    }
  });

  inputField.addEventListener('input', (e) => {
    const form = e.target.closest('form');
    const input = e.target;
    validateEmail(form, input);
  });
}

function decorateCopyright(footer) {
  if (footer.querySelector('.footer-copyright p')) {
    const copyrightIcons = footer.querySelectorAll('.footer-copyright p:has(.icon)');
    const copyright = footer.querySelector('.footer-copyright .default-content-wrapper');

    const copyRightText = footer.querySelectorAll('.footer-copyright p:not(:has(.icon))');
    const copyrightContent = document.createElement('div');
    copyrightContent.className = 'footer-copyright-content';

    const iconContainer = document.createElement('div');
    iconContainer.className = 'icon-container';

    copyRightText.forEach((element) => {
      copyrightContent.appendChild(element);
      if (element.querySelector('img')) {
        copyright.classList.add('has-banner');
      }
    });

    copyrightIcons.forEach((element) => {
      iconContainer.appendChild(element);
    });

    copyright.innerHTML = '';
    copyright.appendChild(copyrightContent);
    copyright.appendChild(iconContainer);
  }
}

function setSocialMediaDataLayer(footer) {
  const socialMediaLinks = footer.querySelectorAll('.footer-list-wrapper > div:nth-child(4) li > a img');
  const userMsg = footer.querySelector('.footer-list-wrapper > div:nth-child(4) h4')?.textContent || 'follow us';
  socialMediaLinks.forEach((link) => {
    const platform = link.getAttribute('data-icon-name').split('-')[0];
    link.addEventListener('click', () => {
      const datalayerEvent = {
        event: 'socialmedia_event',
        eventCategory: 'socialmedia_event',
        eventAction: `footer : ${userMsg.toLowerCase()}`,
        eventLabel: platform, // 'twitter', 'instagram' etc.
      };
      sendAttributesToDataLayer(datalayerEvent);
    });
  });
}
/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  block.textContent = '';

  // load footer fragment
  const footerPath = footerMeta || `/${document.documentElement.lang}/footer`;
  const fragment = await loadFragment(footerPath);

  // decorate footer DOM
  const footer = document.createElement('div');
  while (fragment.firstElementChild) footer.append(fragment.firstElementChild);
  footer.querySelectorAll('a.button').forEach((link) => {
    link.classList.remove('button');
    link.closest('.button-container').classList.remove('button-container');
  });

  const columnsWrapper = footer.querySelector('.footer-primary');
  let mainLinkWrapper;

  if (columnsWrapper) {
    mainLinkWrapper = columnsWrapper.firstElementChild;
    mainLinkWrapper.querySelectorAll('.footer-primary h3').forEach((title) => {
      title.parentElement.classList.add('footer-list');
      title.parentElement.parentElement.classList.add('footer-list-wrapper');
      title.nextElementSibling?.classList.add('footer-list-item');

      /* eslint-disable no-use-before-define */
      title.addEventListener('click', (e) => toggleExpand(e.currentTarget));
      /* eslint-enable no-use-before-define */
    });
  }

  decorateCategoryLinks(footer);

  if (footer.querySelector('.footer-list-wrapper')) {
    await decorateNewsletter(footer);
    setSocialMediaDataLayer(footer);
  }

  decorateCopyright(footer);

  block.append(footer);
  if (getMetadata('no-footerdesc').toLowerCase() === 'true') {
    document.querySelector('.footer-vat')?.remove();
  }

  document.querySelectorAll('.section.footer-language ul li a')?.forEach((link) => {
    const selectedLanguage = new URL(link?.href).pathname.split('/')[1];
    if (selectedLanguage) {
      const url = new URL(window.location.href);
      url.pathname = url.pathname?.replace(/\/[^/]+/, `/${selectedLanguage}`);
      link.href = url.href;
    }

    link?.addEventListener('click', async () => {
      datalayerLanguageSwitchEvent('Footer', selectedLanguage);
    });
  });
}
