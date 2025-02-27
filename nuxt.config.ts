import content from '@originjs/vite-plugin-content'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    devServer: {
        host: '127.0.0.1',
        port: 3000,
    },
    nitro: {
        static: true,
        compressPublicAssets: true,
        prerender: {
            crawlLinks: true,
        },
    },
    vite: {
        plugins: [content()],
    },
    features: {
        inlineStyles: true,
    },
    // build: {
    //   analyze: true,
    // },
    app: {
        head: {
            viewport: 'width=device-width,initial-scale=1',
            link: [{ rel: 'icon', href: '/logo.webp', sizes: 'any' }],
        },
        pageTransition: {
            name: 'page', // 过渡名称
            mode: 'in-out', // 过渡模式
        },
    },
    compatibilityDate: '2024-11-01',
    devtools: { enabled: true },
    modules: ['@bg-dev/nuxt-naiveui'],
})
