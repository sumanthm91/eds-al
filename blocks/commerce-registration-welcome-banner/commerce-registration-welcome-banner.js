import { fetchPlaceholdersForLocale } from '../../scripts/scripts.js';
import { showPageSuccessMessage } from '../../scripts/forms.js';

export default async function decorate() {
  const placeholders = await fetchPlaceholdersForLocale();
  const userId = new URLSearchParams(window.location.search).get('user');
  const userEmail = new URLSearchParams(window.location.search).get('email');
  const url = new URL(window.location.href);
  const params = url.searchParams;
  params.delete('user');
  params.delete('email');
  const userIdSs = sessionStorage.getItem('userId');
  if (userId && userIdSs === userId) {
    const successMessage = placeholders.registrationSuccessWelcomeMessage || 'A welcome message with further instructions has been sent to your email address.';
    showPageSuccessMessage(successMessage);
    if (userEmail) {
      document.querySelectorAll('.commerce-registration-welcome-banner-container p')?.forEach((emailPlaceholder) => {
        emailPlaceholder.innerHTML = emailPlaceholder.innerHTML.replace('{{userEmail}}', `<a href="mailto:${userEmail}">${userEmail}</a>`);
      });
    }
  } else {
    window.location.href = '/';
  }
  window.history.replaceState({}, '', url);
  sessionStorage.removeItem('userId');
  document.querySelector('.commerce-registration-welcome-banner-wrapper')?.remove();
}
