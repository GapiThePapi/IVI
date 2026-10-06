import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './native.css';
import './decki.css';
import { isAndroidApp } from './platform';

if (isAndroidApp) document.documentElement.classList.add('native-app');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
import './refresh.css';
