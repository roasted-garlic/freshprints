import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './renderer/src/styles/globals.css'
import { FirebaseDebugWindow } from './renderer/src/features/firebase-debug/components/FirebaseDebugWindow.tsx'

const isFirebaseDebugWindow = new URLSearchParams(window.location.search).get('firebaseDebugWindow') === '1'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isFirebaseDebugWindow ? <FirebaseDebugWindow /> : <App />}
  </React.StrictMode>,
)
