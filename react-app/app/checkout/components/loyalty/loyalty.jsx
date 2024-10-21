import React, { useState, useEffect, useContext } from 'react';
import './loyalty.css';
import CartContext from '../../../../context/cart-context.jsx';
import AuraDetailsForm from './aura-details/aura-details.jsx';
import Icon from '../../../../library/icon/icon.jsx';
import Dialog from '../../../../shared/dialog/dialog.jsx';
import { simulateSales } from '../../../../api/auraDetails.js';
import { getConfigValue } from '../../../../../scripts/configs.js';
import AppConstants from '../../../../utils/app.constants.js';
import Loader from '../../../../shared/loader/loader.jsx';
import { getAPCCustomerData } from '../../../../../scripts/hellomember/api.js';
import { hasValue } from '../../../../utils/loyalty/conditions-util.js';

const LOYALTY_OPTIONS = {
  HELLO_MEMBER: 'hello-member',
  AURA: 'aura',
};

/**
 * LoyaltyTooltip component that displays a tooltip with configurable content and position.
 *
 * @param {Object} props - The properties object.
 * @param {React.ReactNode} props.children - The content that triggers the tooltip (e.g., icon or text).
 * @param {string} props.content - The content to display inside the tooltip.
 * @param {string} [props.position='top'] - The position of the tooltip relative to the trigger content. Default is 'top'.
 *
 * @returns {JSX.Element} The rendered tooltip component.
 */
function LoyaltyTooltip({ children, content, position = 'top' }) {
  return (
    <div className={`tooltip tooltip--${position}`}>
      {children}
      <div className="tooltip-box">
        {content}
      </div>
    </div>
  );
}

/**
 * LoyaltyOption component renders individual loyalty options with radio buttons and tooltips.
 *
 * @param {Object} props - Component properties.
 * @param {Object} props.option - The loyalty option data, including id, label, and tooltip.
 * @param {string} props.selectedOption - The currently selected loyalty option ID.
 * @param {function} props.handleOptionChange - Function to handle changes when a new loyalty option is selected.
 * @param {function} props.handleOptionClick - Function to handle click events on the loyalty option.
 *
 * @returns {JSX.Element} Loyalty option component.
 */
function LoyaltyOption({
  option, selectedOption, handleOptionChange, handleOptionClick,
}) {
  return (
    <div className="loyalty__option" key={option.id}>
      <input
        type="radio"
        name="loyalty"
        id={`loyalty-${option.id}`}
        value={option.id}
        checked={selectedOption === option.id}
        className="radio-checked"
        onChange={handleOptionChange}
        onClick={handleOptionClick}
      />
      <div className="loyalty__option-content">
        {/* Render a hidden label if option.label is not available */}
        <label htmlFor={`loyalty-${option.id}`} className="loyalty__label">
          {option.label ? (
            <span dangerouslySetInnerHTML={{ __html: option.label }} />
          ) : (
            <span className="visually-hidden">
              Option
              {option.id}
            </span>
          )}
        </label>
        {option.tooltip && (
          <LoyaltyTooltip content={option.tooltip}>
            <Icon name="info" className="icon" />
          </LoyaltyTooltip>
        )}
      </div>
    </div>
  );
}

/**
 * LoyaltyDialog component shows a modal dialog and buttons to confirm or cancel.
 *
 * @param {Object} props - Component properties.
 * @param {Object} props.placeholders - Placeholders object.
 * @param {string} props.optedOption - The currently selected loyalty option ID.
 * @param {function} props.switchLoyalty - Function to switch between loyalty options.
 * @param {function} props.onClose - Function to close the dialog.
 *
 * @returns {JSX.Element} Loyalty dialog component.
 */
function LoyaltyDialog({
  placeholders, optedOption, switchLoyalty, onClose,
}) {
  return (
    <Dialog isOpen onClose={onClose}>
      <div className="loyalty-dialog">
        <h2 className="loyalty-dialog__title">
          {optedOption === LOYALTY_OPTIONS.HELLO_MEMBER ? placeholders.loyaltyHelloMemberDialogTitle : placeholders.loyaltyAuraDialogTitle}
        </h2>
        <div className="loyalty-dialog__content">
          {optedOption === LOYALTY_OPTIONS.HELLO_MEMBER ? placeholders.loyaltyHelloMemberDialogContent : placeholders.loyaltyAuraDialogContent}
        </div>
        <div className="loyalty-dialog__action-container">
          <div className="loyalty-dialog__action">
            <button type="button" onClick={switchLoyalty}>
              {optedOption === LOYALTY_OPTIONS.HELLO_MEMBER ? placeholders.loyaltyHelloMemberDialogPrimaryBtnText : placeholders.loyaltyAuraDialogPrimaryBtnText}
            </button>
            <button type="button" className="secondary" onClick={onClose}>
              {optedOption === LOYALTY_OPTIONS.HELLO_MEMBER ? placeholders.loyaltyHelloMemberDialogSecondaryBtnText : placeholders.loyaltyAuraDialogSecondaryBtnText}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

/**
 * Loyalty component manages the loyalty options and dialog display.
 *
 * @param {Object} props - Component properties.
 * @param {Object} props.content - The content containing loyalty title and options.
 *
 * @returns {JSX.Element} Loyalty component displaying loyalty options and handling user interaction.
 */
function Loyalty({ content }) {
  const { placeholders, cart, isLoggedIn, setSalesPoints } = useContext(CartContext);
  const { title, options } = content;
  const { loyaltyHelloMemberTooltipText } = placeholders;

  const [loyaltyOptions, setLoyaltyOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [optedOption, setOptedOption] = useState(null);
  const [toggleForm, setToggleForm] = useState(false);
  const [defaultLoyalType, setDefaultLoyalType] = useState(null);
  const [defaultLoyalCard, setDefaultLoyalCard] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let apcPoint;
        let defaultOption;
        const { loyalty_card, loyalty_type } = cart?.data?.extension_attributes?.cart?.extension_attributes || {};
        setDefaultLoyalType(loyalty_type);
        setDefaultLoyalCard(loyalty_card);
  
        defaultOption = await getConfigValue('loyalty-default-option');
  
        let identifierNo = '';
        if (loyalty_type === AppConstants.LOYALTY_HM_TYPE) {
          identifierNo = loyalty_card;
        } else {
          const response = await getAPCCustomerData();

          if (hasValue(response) && !hasValue(response.error)) {
            identifierNo = response?.apc_identifier_number;
          } else if (hasValue(response.error)) {
            console.error('Error while trying to get hello member customer data. Data: @data.', {
              '@data': JSON.stringify(response),
            });
          }
        }
  
        const response = await invokeSalesPoints(AppConstants.LOYALTY_HM_TYPE, identifierNo);
        const invokeHmSales = response?.data;
        if (response.status !== 200) {
          console.error('Error invoking sales points - Loyalty section would be hidden.');
          return;
        }
  
        if (invokeHmSales) {
          apcPoint = invokeHmSales.hm_points;
  
          const labels = Array.from(options).map((li) => li.innerHTML);
          const modifiedLabel = labels[0].replace('{{POINTS}}', apcPoint || 0);
    
          const loyaltyList = [
            { id: LOYALTY_OPTIONS.HELLO_MEMBER, label: modifiedLabel, tooltip: loyaltyHelloMemberTooltipText },
            { id: LOYALTY_OPTIONS.AURA, label: labels[1] },
          ];
          setSelectedOption(defaultOption || LOYALTY_OPTIONS.HELLO_MEMBER);
          setLoyaltyOptions(loyaltyList);
        }
      } catch (error) {
        console.error('An error occurred while fetching loyalty options:', error);
      }
    };
  
    fetchData();
  }, []);

  const invokeSalesPoints = async (paramData, urlData) => {
      const simulateSaleAura = await getConfigValue('simulate-sale-aura');
      const { id } = cart?.data?.extension_attributes?.cart || {};
      const simulateSaleAuraEndPoint = simulateSaleAura?.replace('{{identifierNo}}', urlData);
      const response = await simulateSales(simulateSaleAuraEndPoint, isLoggedIn, id, paramData);
      return response;
  }

  const handleOptionChange = (event) => {
    const { value } = event.target;
    if (value) {
      setOptedOption(value);
      setShowDialog(true);
    }
  };

  const handleOptionClick = (event) => {
    if (selectedOption === LOYALTY_OPTIONS.AURA && event.target.value === LOYALTY_OPTIONS.AURA) {
      setToggleForm(!toggleForm);
    }
  };

  const onClose = () => {
    setShowDialog(false);
  };

  const switchLoyalty = async () => {
    if (optedOption === LOYALTY_OPTIONS.AURA) {
      setIsLoading(true);
      const apcUrlData = defaultLoyalType === AppConstants.LOYALTY_AURA ? defaultLoyalCard : 'guest';
      const response = await invokeSalesPoints(null, apcUrlData);
      const salesData = response?.data;
      setIsLoading(false);
      if (salesData && salesData?.apc_points) {
        setSalesPoints(salesData.apc_points);
      }
    }
    setShowDialog(false);
    setSelectedOption(optedOption);

    window.dispatchEvent(new CustomEvent('react:datalayerEvent', {
      detail: {
        type: 'loyaltySwitch',
        payload: {
          eventLabel: optedOption
        }
      }
    }));

    if (optedOption === LOYALTY_OPTIONS.HELLO_MEMBER) {
      const lang = document.documentElement.lang || 'en';
      const cartLink = `/${lang}/cart`;
      window.location.href = cartLink;
    } else if (optedOption === LOYALTY_OPTIONS.AURA) {
      setToggleForm(true);
    }
  };

  return (
    <>
      { loyaltyOptions.length > 0 && (
        <div className="loyalty">
          {isLoading && (
            <div className="loader_overlay">
              <Loader />
            </div>
          )}
          <h2 className="loyalty__title checkout__sub-container-title">{title}</h2>
          <div className="loyalty__options">
            {loyaltyOptions.map((option) => (
              <LoyaltyOption
                key={option.id}
                option={option}
                selectedOption={selectedOption}
                handleOptionChange={handleOptionChange}
                handleOptionClick={handleOptionClick}
              />
            ))}
          </div>
          {selectedOption === 'aura' && toggleForm && <AuraDetailsForm />}
          {showDialog && <LoyaltyDialog placeholders={placeholders} optedOption={optedOption} switchLoyalty={switchLoyalty} onClose={onClose} />}
        </div>
      )}
    </>
  );
}

export default Loyalty;
