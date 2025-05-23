import { html } from '../../../scripts/vendor/htm-preact.js';
import {
  useContext, useState, useRef, useEffect,
} from '../../../scripts/vendor/preact-hooks.js';
import { MultiStepFormContext } from './multi-step-form.js';

const Dropdown = ({ inputValue, onSelectCity }) => {
  const [cityList, setCityList] = useState([]);
  const [open, setOpen] = useState(false);
  const [filteredCities, setFilteredCities] = useState([]);
  const dropdownRef = useRef(null);
  const { placeholders } = useContext(MultiStepFormContext);

  const handleInputChange = (e) => {
    const { value } = e.target;
    if (value.length > 2) {
      const filtered = cityList.filter((city) => city.toLowerCase().includes(value.toLowerCase()));
      setFilteredCities(filtered);
    } else {
      setFilteredCities(cityList);
    }
  };

  useEffect(() => {
  const handleDocumentClick = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setFilteredCities(cityList);
    }
  };

  document.addEventListener('mousedown', handleDocumentClick);

  const getCities = async () => {
    try {
      const response = await fetch(`${placeholders.apiDomain}/app-service/api/v1/city/all`);
      const data = await response.json();

      if (data.status === 'success') {
        const cities = data.city_list.map((cityItem) => cityItem.city);
        setCityList(cities);
        setFilteredCities(cities);
      }
    } catch (error) {
      // do nothing
    }
  };

    if (open) {
  getCities();
    }

  return () => {
    document.removeEventListener('mousedown', handleDocumentClick);
  };
  }, [open]);
  useEffect(() => {
    if (open && dropdownRef.current) {
    const allItems = dropdownRef.current.querySelectorAll('li');
    allItems.forEach((item) => {
      const itemText = item.textContent.toLowerCase();
      if (itemText !== inputValue.toLowerCase()) {
        item.classList.remove('highlight');
      }
    });

    const highlightedItem = dropdownRef.current.querySelector('.highlight');
    if (!highlightedItem) {
      const firstLi = dropdownRef.current.querySelector('li');
      if (firstLi) {
        firstLi.classList.add('highlight');
      }
    }
    }
  }, [filteredCities, open]);

  const handleOptionClick = (cityName) => {
    const firstLi = dropdownRef.current.querySelector('li');
    if (firstLi) {
      firstLi.classList.remove('highlight');
    }
    onSelectCity(cityName);
  };

  return html`
    <span class="select-dropdown" dir="ltr" onClick=${() => setOpen(true)}>
      <span class="select-search select-search--dropdown">
        <input
                class="select-search__field"
                type="search"
                placeholder="Search City*"
                onInput=${handleInputChange}
        />
      </span>
      <span class="select-results">
        <ul ref=${dropdownRef} role="tree" aria-expanded="true" aria-hidden="false">
          ${filteredCities.length > 0
    ? filteredCities.map((city) => html`
              <li
                class=${`${city.toLowerCase() === inputValue.toLowerCase() ? 'highlight' : ''}`}
                role="treeitem"
                aria-selected="false"
                onclick=${() => handleOptionClick(city)}
              >
                ${city}
              </li>
            `)
            : html`<li>No results found</li>`}
        </ul>
      </span>
    </span>
    `;
};

export default Dropdown;