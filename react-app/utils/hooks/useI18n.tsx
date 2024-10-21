import { useState } from 'react';
// import { getCall } from '../baseUtils';

// Define type for translations
type Translations = {
  [key: string]: string;
};
declare global {
  interface Window {
    i18n: {
      [key: string]: string;
    };
  }
}

const useI18n = (language: string = 'en') => {
  // // const [translations, setTranslations] = useState<Translations>({});

  // Add your Logic to get i18n data

  // useEffect(() => {
  //   setTranslations(window.i18n);
  //   Load translations dynamically based on selected language
  //   // window.addEventListener('i18nReady', (e: CustomEvent) => {
  //   //   console.log('effect of i18n ==> ', e.detail);
  //   //   setTranslations(e.detail)
  //   // });
  //   // getCall(`/content.json?sheet=${language}`)
  //   //   .then(resp => setTranslations(resp.data))
  //   //   .catch(error => console.error(`Failed to load translations: ${error}`));
  // }, [language]);

  const [translations] = useState<Translations>(window?.i18n || {});

  const t = (key: string): string => {
    // Function to access translations
    return translations[key] || key; // Fallback to key if translation not found
  };

  return { t };
};

export default useI18n;
