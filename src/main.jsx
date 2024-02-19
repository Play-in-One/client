import Header  from './components/header.jsx'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import React from 'react'
import '../styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Header />
    <App />
  </React.StrictMode>,
)
