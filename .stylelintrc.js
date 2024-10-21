const config = {
  extends : ['stylelint-config-standard'],
  rules : {
    'media-feature-range-notation': null,
    'selector-class-pattern': [
      '^[a-z][-a-z0-9]+(__[-a-z0-9]+)?(--[a-z0-9]+)?$',
      {
        message: (selector) =>
          `Selector class ${selector} violates BEM Convention`,
        resolveNestedSelectors: true,
        'severity': 'warning'
      },
    ],
    'selector-id-pattern': [
      '^[a-z][-a-z0-9]+(__[-a-z0-9]+)?(--[a-z0-9]+)?$',
      {
        message: (selector) =>
          `Selector class ${selector} violates BEM Convention`,
        resolveNestedSelectors: true,
        'severity': 'warning'
      },
    ]
  }
}

module.exports = config;
