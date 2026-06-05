import '../css/app.css'
import './lib/echo'

import axios from 'axios'
import { createRoot }        from 'react-dom/client'
import { createInertiaApp, Head }  from '@inertiajs/react'
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers'

axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest'
axios.defaults.withCredentials = true
axios.defaults.withXSRFToken = true
axios.defaults.baseURL = 'http://localhost:8000';
// const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content
// if (csrfToken) axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken

window.flockrConfig = {
  r2Url: document.querySelector('meta[name="r2-url"]')?.content ?? '',
}

createInertiaApp({
  title: (title) => title ? `${title} · Flockr — Shop What You Watch` : 'Flockr — Shop What You Watch',
  resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
  setup({ el, App, props }) { createRoot(el).render(<App {...props} />) },
  progress: { color: '#ff5c00', showSpinner: false },
})

// return (
//   <>
//       <Head title="Flockr - Shop What You Watch" />
//   </>
// )
