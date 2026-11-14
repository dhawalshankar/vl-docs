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
        'architecture/system-design',
      ],
    },
    {
      type: 'category',
      label: 'For developers',
      items: [
        'development/onboarding',
        'development/local-setup',
        'development/repository-main-web',
        'development/repository-main-api',
        'development/repository-learning-web',
        'development/repository-learning-api',
        'development/data-and-state',
        'development/api-reference',
        'development/operations',
        'development/contributing',
      ],
    },
  ],
};

export default sidebars;
