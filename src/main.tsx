import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './native.css';
import './decki.css';
import './refresh.css';
import './card-gallery.css';
import './tokens.css';
import './responsive.css';
import { isAndroidApp } from './platform';
import { applyCardSkin, readCardSkin } from './CardSkinSettings';

if (isAndroidApp) document.documentElement.classList.add('native-app');
applyCardSkin(readCardSkin());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
