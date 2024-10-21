import { useEffect } from 'react';

const useMutationObserver = ({ container, selector, onIntersect }) => {
  useEffect(() => {
    const containerEl = document.querySelector(container);
    const observer = new MutationObserver((mutationsList) => {
      /* TODO: eslint should be enabled */
      // eslint-disable-next-line no-restricted-syntax
      for (const mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const elements = containerEl?.querySelectorAll(selector);
          elements?.forEach((element) => onIntersect(element));
        }
      }
    });

    if (containerEl) observer.observe(containerEl, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, [selector, onIntersect]);

  return null;
};

export default useMutationObserver;
