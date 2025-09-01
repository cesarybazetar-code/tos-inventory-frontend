import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './ui/App'

// Grab the root div
const container = document.getElementById('root') as HTMLElement

// Create root and render App
ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)