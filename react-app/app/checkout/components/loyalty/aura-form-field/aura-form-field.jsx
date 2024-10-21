import React from 'react';

function AuraFormFieldItem({
  selectedOption,
  fieldKey,
  fieldValue,
  fieldText,
  selectOptionCallback,
}) {
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      selectOptionCallback(fieldValue);
    }
  };
  return (
    <div
      key={fieldKey}
      className="linking-option"
      onClick={() => selectOptionCallback(fieldValue)}
      onKeyPress={handleKeyPress}
      role="button"
      tabIndex={0}
    >
      <input
        type="radio"
        id={fieldKey}
        name="linking-options"
        value={fieldValue}
        className="linking-option-radio"
        defaultChecked={selectedOption === fieldValue}
      />
      <label
        className="radio-sim radio-label"
        htmlFor={fieldKey}
      >
        {fieldText}
      </label>
    </div>
  );
}

export default AuraFormFieldItem;
