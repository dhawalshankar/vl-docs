/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'VartaLang Docs',
  tagline: "India's language bridge for opportunity",
  favicon: 'img/favicon.svg',
  url: 'https://docs.vartalang.in',
  baseUrl: '/',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexPages: true,
        searchBarPosition: 'right',
      },
    ],
  ],

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          path: 'docs',
          sidebarPath: './sidebars.js',
        },
        blog: false,
        pages: {},
        theme: {
          customCss: './src/css/custom.css',
        },
      },
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'VartaLang',
      logo: {
        alt: 'VartaLang bridge logo',
        src: 'img/logo.png',
      },
      items: [
        {
          to: '/docs/intro',
          label: 'Documentation',
          position: 'left',
        },
        {
          href: 'https://vartalang.in',
          label: 'Open VartaLang',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {label: 'Introduction', to: '/docs/intro'},
            {label: 'Platform guides', to: '/docs/platform/language-exchange'},
            {label: 'Architecture', to: '/docs/architecture/overview'},
          ],
        },
        {
          title: 'VartaLang',
          items: [
            {label: 'Main platform', href: 'https://vartalang.in'},
            {label: 'Learning platform', href: 'https://learn.vartalang.in'},
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} VartaLang. Language connects us.`,
    },
  },
};

export default config;
