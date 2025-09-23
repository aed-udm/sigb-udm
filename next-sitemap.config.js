/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://bibliotheque-cameroun.vercel.app',
  generateRobotsTxt: true,
  generateIndexSitemap: false,
  exclude: [
    '/api/*',
    '/auth/*',
    '/dashboard/*',
    '/books/new',
    '/users/new',
    '/theses/new',
    '/loans/new',
    '/analytics'
  ],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard/',
          '/*/new',
          '/analytics'
        ],
      },
    ],
    additionalSitemaps: [
      'https://bibliotheque-cameroun.vercel.app/sitemap.xml',
    ],
  },
  transform: async (config, path) => {
    // Configuration personnalisée pour chaque page
    const customConfig = {
      loc: path,
      changefreq: 'daily',
      priority: 0.7,
      lastmod: new Date().toISOString(),
    }

    // Pages importantes avec priorité élevée
    if (path === '/') {
      customConfig.priority = 1.0
      customConfig.changefreq = 'daily'
    }

    if (path.includes('/books') || path.includes('/theses')) {
      customConfig.priority = 0.8
      customConfig.changefreq = 'weekly'
    }

    return customConfig
  },
}
