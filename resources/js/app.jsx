import '../css/app.css'
import './lib/echo'

import axios from 'axios'
import { createRoot } from 'react-dom/client'
import { createInertiaApp } from '@inertiajs/react'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'
import SplashScreen from '@/Components/SplashScreen'
import { useState } from 'react'

axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
axios.defaults.withCredentials = true
axios.defaults.withXSRFToken = true
axios.defaults.baseURL = import.meta.env.VITE_APP_URL ?? window.location.origin

window.flockrConfig = {
    r2Url: document.querySelector('meta[name="r2-url"]')?.content ?? '',
}

const SPLASH_KEY = 'flockr_splash_shown'
const splashAlreadyShown = !!sessionStorage.getItem(SPLASH_KEY)

createInertiaApp({
    title: (title) => title ? `${title} · Flockr — Shop What You Watch` : 'Flockr — Shop What You Watch',
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        // If splash already shown this session, render app directly — no wrapper
        if (splashAlreadyShown) {
            createRoot(el).render(<App {...props} />)
            return
        }

        // First visit — show splash then swap to app
        function Root() {
            const [done, setDone] = useState(false)

            if (done) return <App {...props} />

            return (
                <SplashScreen
                    onFinish={() => {
                        sessionStorage.setItem(SPLASH_KEY, '1')
                        setDone(true)
                    }}
                />
            )
        }

        createRoot(el).render(<Root />)
    },
    progress: { color: '#ff5c00', showSpinner: false },
})