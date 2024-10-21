// import fs from 'fs';

export default function (plop) {
  // controller generator
  plop.setGenerator('controller', {
    description: 'Create a React Component',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'enter component name (should be same as `block` name)',
      },
    ],
    actions: data => {
      const ext = 'jsx';
      const action = [
        {
          type: 'add',
          path: `react-app/app/{{name}}/index.${ext}`,
          templateFile: `plop-templates/${ext}-template/index.${ext}.template`,
        },
        {
          type: 'add',
          path: 'react-app/app/{{name}}/index.css',
          templateFile: `plop-templates/${ext}-template/index.css.template`,
        },
        {
          type: 'add',
          path: `react-app/app/{{name}}/components/app.${ext}`,
          templateFile: `plop-templates/${ext}-template/components/app.${ext}.template`,
        },
      ];
      return action;
    },
  });
}
