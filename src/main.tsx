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
import { applyAppearance, readAppearance } from './AppearanceSettings';
import { applyPlayerDisplay, readPlayerDisplay } from './PlayerDisplaySettings';
import './obsidian.css';

if (isAndroidApp) document.documentElement.classList.add('native-app');
applyAppearance(readAppearance());
applyCardSkin(readCardSkin());
applyPlayerDisplay(readPlayerDisplay());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
