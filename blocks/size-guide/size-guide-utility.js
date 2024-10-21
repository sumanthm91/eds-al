const defaults = [];

function handleTabChange(ele, buttonId) {
  const tabControl = ele.getAttribute('aria-controls');
  const customEvent = new CustomEvent('tab-change', { detail: { id: buttonId } });
  ele.closest('.tabs.block').querySelector(`#${tabControl} .size-guide.block select`)?.dispatchEvent(customEvent);
}

export function registerTabChangeEvents(main) {
  main.querySelectorAll('.tabs-list button').forEach((button) => {
    button.addEventListener('click', (event) => {
      handleTabChange(event.target, button.id);
    });
  });
}

export function applyFilter() {
  const sizesBtnVal = document.querySelector('.size-guide-selectedFilters.hide').getAttribute('data-sizes');
  document.querySelectorAll('.tabs-panel[aria-hidden=false] .size-guide-filter-selection button').forEach((button) => {
    button.classList.remove('selected');
    if (button.textContent.trim().toLowerCase() === sizesBtnVal.toLowerCase()) {
      button.classList.add('selected');
    }
  });

  document.querySelectorAll('main .tabs-panel[aria-hidden=false]  .section.dynamic-size').forEach((section) => {
    // hide all sections
    section.classList.add('size-guide-hide');
    // show only the target ones
    let filterMatch = true;
    document.querySelector('.size-guide-selectedFilters.hide').getAttributeNames().forEach((key) => {
      if (key.startsWith('data-')) {
        const filterKey = key.replace('data-', '');
        const filterValue = document.querySelector('.size-guide-selectedFilters.hide').getAttribute(key);
        const sectionFilterVal = section.getAttribute([`data-${filterKey}`]);
        if (sectionFilterVal) {
          const interimMatch = (sectionFilterVal.trim().toLowerCase() === filterValue.toLowerCase()
            || sectionFilterVal.trim().toLowerCase() === 'all');
          filterMatch = filterMatch && interimMatch;
        }
      }
    });
    if (filterMatch) {
      section.classList.remove('size-guide-hide');
    }
  });
}

export function setDefaultSizeGuideFilters(tab, category) {
  defaults.tab = tab;
  defaults.category = category;
}

function appendSizeGuideSelectorSkeleton() {
  // ToDo: update default value for app & mobile as per actuals
  if (!document.querySelector('.size-guide-selectedFilters')) {
    // extracting the target tab and category from the URL
    const url = new URL(window.location.href);
    let tabSelection = url.searchParams.get('tab')?.toLowerCase(); // L1 selection
    if (defaults.tab && !tabSelection) tabSelection = defaults.tab;
    let categorySelection = url.searchParams.get('category')?.toLowerCase(); // L2 selection
    if (defaults.category && !categorySelection) categorySelection = defaults.category;

    // create a div to store the selected filters
    const selectedFilters = document.createElement('div');
    selectedFilters.classList.add('size-guide-selectedFilters');
    selectedFilters.classList.add('hide');
    selectedFilters.setAttribute('data-pdp-tab', tabSelection);
    selectedFilters.setAttribute('data-pdp-category', categorySelection);
    document.querySelector('main').appendChild(selectedFilters);
  }
}

function updateCategorySelection(ele, category) {
  ele.value = category;
  if (!ele.value) {
    ele.querySelectorAll('option').forEach((option) => {
      if (option.value.toLowerCase().indexOf(category?.toLowerCase()) >= 0 && !ele.value) {
        ele.value = option.value;
      }
    });
    if (!ele.value) {
      ele.value = ele.querySelector('option').value;
    }
  }
}

// This function will auto select the filters based on the PDP content
function autoSelectFiltersBasedOnPDP() {
  // load the values from browser cookie
  const sizeGuideTab = document.querySelector('.size-guide-selectedFilters.hide').getAttribute('data-pdp-tab');
  if (sizeGuideTab) document.querySelector('.size-guide-selectedFilters.hide').setAttribute('data-tab', sizeGuideTab);
  let sizeGuideCategoryFilter = document.querySelector('.size-guide-selectedFilters.hide').getAttribute('data-pdp-category');
  if (sizeGuideCategoryFilter) document.querySelector('.size-guide-selectedFilters.hide').setAttribute('data-category', sizeGuideCategoryFilter);
  const sizeGuideSizeRangeFilter = document.querySelector('.size-guide-selectedFilters.hide').getAttribute('data-pdp-size-range');
  if (sizeGuideSizeRangeFilter) document.querySelector('.size-guide-selectedFilters.hide').setAttribute('data-size-range', sizeGuideSizeRangeFilter);
  const sizeGuideSizesFilter = document.querySelector('.size-guide-selectedFilters.hide').getAttribute('data-pdp-sizes');
  if (sizeGuideSizesFilter) document.querySelector('.size-guide-selectedFilters.hide').setAttribute('data-sizes', sizeGuideSizesFilter);

  if (sizeGuideTab) {
    const tab = document.querySelector(`.tabs-tab#tab-${sizeGuideTab.toLowerCase()}`) || document.querySelector('.tabs-tab');
    if (tab.getAttribute('id').indexOf(sizeGuideTab.toLowerCase()) < 0) sizeGuideCategoryFilter = undefined;
    if (tab) {
      tab.click();
      updateCategorySelection(document.querySelector('.tabs-panel[aria-hidden=false] .size-guide-filter select[data-key=category]'), sizeGuideCategoryFilter);
      const sizeRangeEle = document.querySelector('.tabs-panel[aria-hidden=false] .size-guide-filter select[data-key=size-range]');
      if (sizeRangeEle) {
        sizeRangeEle.value = sizeRangeEle.querySelector('option').value;
      }
      document.querySelectorAll('.tabs-panel[aria-hidden=false] .size-guide-filter-selection button[data-key=Sizes]').forEach((button) => {
        button.classList.remove('selected');
        if (button.textContent.trim().toLowerCase() === sizeGuideSizesFilter) {
          button.classList.add('selected');
        }
      });
      applyFilter();
    }
  }
}

export function loadDefaultFilterValues() {
  const targetTab = document.querySelector('main .tabs-panel[aria-hidden=false]');
  let refreshLoad = false;
  if (document.querySelector('.size-guide-selectedFilters.hide').classList.contains('loading')) {
    document.querySelector('.size-guide-selectedFilters.hide').classList.remove('loading');
    refreshLoad = true;
  }
  targetTab?.querySelectorAll('.size-guide-wrapper .size-guide-filter-select').forEach((select) => {
    let selectValue = select.value;
    if (refreshLoad) {
      selectValue = document.querySelector('.size-guide-selectedFilters.hide').getAttribute(`data-pdp-${select.dataset.key}`);
    }
    document.querySelector('.size-guide-selectedFilters.hide').setAttribute(`data-${select.dataset.key}`, selectValue);
  });
  const sizeButtonSelection = targetTab?.querySelector('.size-guide-wrapper .size-guide-filter-selection button.selected');
  if (!sizeButtonSelection) {
    targetTab?.querySelector('.size-guide-wrapper .size-guide-filter-selection button')?.classList.add('selected');
  }
  targetTab?.querySelectorAll('.size-guide-wrapper .size-guide-filter-selection button.selected').forEach((button) => {
    let value = button.textContent;
    if (refreshLoad) {
      value = document.querySelector('.size-guide-selectedFilters.hide').getAttribute(`data-pdp-${button.dataset.key}`);
    }
    document.querySelector('.size-guide-selectedFilters.hide').setAttribute(`data-${button.dataset.key}`, value);
  });
}

export function initSizeGuideDefaults() {
  if (document.querySelectorAll('.tabs-tab').length > 0) {
    appendSizeGuideSelectorSkeleton();
    document.querySelector('.size-guide-selectedFilters.hide').classList.add('loading');
    autoSelectFiltersBasedOnPDP();
    loadDefaultFilterValues();
    applyFilter();
  }
}
