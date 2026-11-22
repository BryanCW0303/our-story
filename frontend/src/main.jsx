import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts ship with the site (no outside font service): serif for headings, a brush-like kai for notes.
import '@fontsource/noto-serif-tc/500.css'
import '@fontsource/noto-serif-tc/700.css'
import '@fontsource/lxgw-wenkai-tc/400.css'
import App from './App.jsx'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
