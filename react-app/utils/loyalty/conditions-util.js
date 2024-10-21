function hasValue(value) {
    if (value === undefined || value === null) {
        return false;
    }

    if (typeof value === 'object') {
        if (Array.isArray(value) && value.length === 0) {
        return false;
        }

        if (value.constructor === Object && Object.keys(value).length === 0) {
        return false;
        }
    }

    return Boolean(value);
};


/**
 * Utility function to show inline errors in form.
 */
function showError(elementId, msg) {
    const element = document.getElementById(elementId);
    if (element) {
      element.innerHTML = msg;
      element.classList.add('error');
    }
}
  
/**
 * Utility function to remove inline errors in form.
 */
function removeError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '';
        element.classList.remove('error');
    }
}


export {
    hasValue,
    showError,
    removeError
};