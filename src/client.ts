import { ViteSSG } from 'vite-ssg'
import routes from "~pages";
import Client from './client.vue'

export const createApp = ViteSSG(
    Client,
    { routes },
    // ({ app, router, routes, isClient, initialState }) => {
    // }
)