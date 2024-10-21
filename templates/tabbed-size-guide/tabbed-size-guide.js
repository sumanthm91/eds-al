import { registerTabChangeEvents } from '../../blocks/size-guide/size-guide-utility.js';

function decorateTemplate(main) {
  registerTabChangeEvents(main);
}

export default async function decorate(main) {
  window.addEventListener('delayed-loaded', () => {
    decorateTemplate(main);
  });
}

if (!window.location.href.includes('fragments/pdp/size-guide/sizes')) {
  decorateTemplate(document.querySelector('main'));
}
