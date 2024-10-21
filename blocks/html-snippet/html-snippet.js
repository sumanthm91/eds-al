import { decorateIcons } from '../../scripts/aem.js';

async function getFragmentFromFile(fragmentURL) {
  const fragment = await fetch(fragmentURL);
  if (fragment.ok) {
    const text = await fragment.text();
    return text;
  }
  return null;
}

function loadHtmlScript(parentElem, originalElem) {
  const script = document.createElement('script');
  const attributes = originalElem.getAttributeNames();

  for (let i = 0; i < attributes.length; i += 1) {
    const attribute = attributes[i];
    const value = originalElem.getAttribute(attribute);
    script.setAttribute(attribute, value);
  }

  script.setAttribute('type', 'text/javascript'); // force JS

  script.innerHTML = originalElem.innerHTML;

  document.body.appendChild(script);
}

function processScriptNodes(parent, node) {
  const isScriptNode = (node && node.tagName === 'SCRIPT');
  if (isScriptNode) {
    loadHtmlScript(parent, node);
  } else {
    const children = [...node.children];
    for (let i = 0; i < children.length; i += 1) {
      processScriptNodes(parent, children[i]);
    }
  }
  return node;
}

async function decorateSnippet(block, fragmentURL) {
  const fragment = await getFragmentFromFile(fragmentURL);
  block.innerHTML = fragment;
  processScriptNodes(block.parentElement, block);
  decorateIcons(block);
}

export default async function decorate(block) {
  const url = block.querySelector('a').href;
  if (new URL(url).origin !== window.location.origin) {
    block.innerHTML = '<p>Cannot use unsafe cross-origin reference for the HTML Snippets.<p>';
    return;
  }

  if (!url) {
    block.textContent = '';
    // eslint-disable-next-line no-console
    console.warn('no snippet found');
    return;
  }

  try {
    await decorateSnippet(block, url);
  } catch (e) {
    block.textContent = '';
    // eslint-disable-next-line no-console
    console.warn(`cannot load snippet at ${url}: ${e}`);
  }
}
