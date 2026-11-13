/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting started',
      items: ['getting-started/account-and-profile'],
    },
    {
      type: 'category',
      label: 'Using VartaLang',
      items: [
        'platform/language-exchange',
        'platform/jobs',
        'platform/learning-resources',
        'platform/courses',
        'platform/safety-and-trust',
      ],
    },
    {
      type: 'category',
      label: 'Platform architecture',
      items: [
        'architecture/overview',
        'architecture/main-platform',
        'architecture/learning-platform',
        'architecture/services',
      ],
    },
    {
      type: 'category',
      label: 'For developers',
      items: [
        'development/local-setup',
        'development/api-reference',
        'development/contributing',
      ],
    },
  ],
};

export default sidebars;
