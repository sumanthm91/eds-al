import { loadScript } from '../../../scripts/aem.js';
import { getConfigValue } from '../../../scripts/configs.js';
import { toggleExpand } from './info-content.js';

// eslint-disable-next-line import/prefer-default-export
export async function decorateBnpl(ctx, bnplContainer, placeholders) {
  const lang = document.documentElement.lang || 'en';
  const country = await getConfigValue('country-code');
  const currency = await getConfigValue('currency');
  const finalPrice = ctx.data.prices.final.amount;
  let bnplOptionsConfig = await getConfigValue('bnpl-options');
  const bnplExpandedConfig = await getConfigValue('bnpl-expanded');
  if (!bnplOptionsConfig && bnplOptionsConfig !== '') {
    bnplOptionsConfig = 'tabby,tamara';
  }
  if (bnplOptionsConfig) {
    const bnplOptions = bnplOptionsConfig.split(',').map((option) => option.trim());
    const bnplHeader = document.createElement('div');
    bnplHeader.classList.add('bnpl-header');
    const bnplHeaderTitle = document.createElement('h3');
    bnplHeaderTitle.innerHTML = placeholders.bnplTitle || 'Pay in interest-free installments';
    bnplHeader.appendChild(bnplHeaderTitle);
    const bnplContent = document.createElement('div');
    bnplContent.classList.add('bnpl-content');
    bnplOptions.forEach((option) => {
      const optionContainer = document.createElement('div');
      optionContainer.classList.add('bnpl-option');
      if (option === 'tabby') {
        optionContainer.innerHTML = `
          <div id="tabby-view"></div>
        `;
      } else if (option === 'tamara') {
        optionContainer.innerHTML = `
          <tamara-widget type="tamara-summary" 
            class="tamara-product-widget"
            id="tamara-widget-pdp"
            inline-type="5"
            country="${country}"
            lang="${lang}"
            amount="${finalPrice}">
          </tamara-widget>
        `;
      } else {
        return;
      }
      bnplContent.appendChild(optionContainer);
    });
    bnplContainer.appendChild(bnplHeader);
    bnplContainer.appendChild(bnplContent);

    window.addEventListener('delayed-loaded', async () => {
      if (bnplOptions.includes('tabby')) {
        await loadScript('https://checkout.tabby.ai/integration.js');
        await loadScript('https://checkout.tabby.ai/tabby-promo-al-shaya.js');
        const tabbyApiKey = await getConfigValue('bnpl-tabby-api-key');
        // eslint-disable-next-line no-undef
        TabbyProductPageSnippetAlShaya({
          selector: '#tabby-view',
          currency,
          price: finalPrice,
          lang,
          source: 'product',
          api_key: tabbyApiKey,
        });
      }

      if (bnplOptions.includes('tamara')) {
        const tamaraScriptUrl = await getConfigValue('bnpl-tamara-url');
        await loadScript(tamaraScriptUrl);
        const tamaraApiKey = await getConfigValue('bnpl-tamara-api-key');
        window.tamaraWidgetConfig = {
          lang,
          country,
          publicKey: tamaraApiKey,
        };
        window.TamaraWidgetV2?.refresh();
      }

      bnplHeaderTitle.addEventListener('click', () => toggleExpand(bnplHeaderTitle, bnplContent, bnplOptions));
      setTimeout(() => {
        if (bnplExpandedConfig === 'true') {
          toggleExpand(bnplHeaderTitle, bnplContent, bnplOptions);
        }
      }, 1000);
    });
  }
}
