import { loadCSS, loadScript } from '../../scripts/aem.js';

export default async function decorate(main) {
  await Promise.all([loadCSS('/styles/forms.css'), loadCSS('/blocks/account-address-book/account-address-book.css'), loadScript('/scripts/react-bridge.js', { type: 'module' })]);
  setTimeout(() => main, 1000);
}
