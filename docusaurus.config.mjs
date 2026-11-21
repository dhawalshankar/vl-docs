/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'VartaLang Docs',
  tagline: "India's language bridge for opportunity",
  favicon: 'img/favicon.svg',
  url: 'https://docs.vartalang.in',
  baseUrl: '/',
  customFields: {
    developerGate: {
      username: process.env.DEVELOPER_GATE_USERNAME || '',
      password: process.env.DEVELOPER_GATE_PASSWORD || '',
    },
    sarvamApiKey: process.env.SARVAM_API_KEY || '',
    sarvamModel: process.env.SARVAM_MODEL || 'sarvam-105b',
  },
  headTags: [
    {
      tagName: 'script',
      attributes: {},
      innerHTML: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
      `,
    },
    {
      tagName: 'script',
      attributes: {
        async: true,
        src: 'https://www.googletagmanager.com/gtm.js?id=GTM-5MRP5CBH',
      },
    },
  ],

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexPages: true,
        indexBlog: false,
        ignoreFiles: [/^docs\/development(?:\/|$)/],
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
        {
          title: 'Creator',
          items: [
            {label: 'Dhawal Shukla — portfolio', href: 'https://thewittyswan.space'},
            {
              label: 'Open to opportunities',
              href: 'https://docs.vartalang.in/#dhawal-shukla',
            },
            {label: 'Buy me an apple', href: 'https://rzp.io/rzp/U6FewHU'},
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} VartaLang. Language connects us. Built and operated by Dhawal Shukla.`,
    },
  },
};

export default config;
