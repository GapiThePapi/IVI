import { useEffect, useState } from 'react';
import { PlayingCard } from './Card';

export const CARD_SKINS = [
  { id: 'obsidian', name: 'IVI Essential', description: 'Confident & signature' },
  { id: 'classic', name: 'Classic Casino', description: 'Familiar & timeless' },
  { id: 'noir', name: 'Noir Neon', description: 'Dark & electric' },
  { id: 'deco', name: 'Art Deco', description: 'Navy & gold' },
  { id: 'nordic', name: 'Nordic Minimal', description: 'Calm & spacious' },
  { id: 'atelier', name: 'Botanical', description: 'Warm & organic' },
  { id: 'pop', name: 'Bauhaus Pop', description: 'Bold & playful' },
  { id: 'arcade', name: 'Retro Arcade', description: 'Pixel & vivid' },
  { id: 'cosmic', name: 'Cosmic', description: 'Luminous & stellar' },
  { id: 'accessible', name: 'High Contrast', description: 'Clear & legible' },
] as const;

export type CardSkin = (typeof CARD_SKINS)[number]['id'];

export function readCardSkin(): CardSkin {
  try {
    const saved = localStorage.getItem('ivi-card-skin');
    return CARD_SKINS.some((skin) => skin.id === saved) ? (saved as CardSkin) : 'obsidian';
  } catch {
    return 'obsidian';
  }
}

export function applyCardSkin(skin: CardSkin) {
  document.documentElement.dataset.cardSkin = skin;
  try {
    localStorage.setItem('ivi-card-skin', skin);
  } catch {
    /* Local storage is optional. */
  }
  window.dispatchEvent(new CustomEvent<CardSkin>('ivi-card-skin-change', { detail: skin }));
}

export function CardSkinSettings({ onExplore }: { onExplore: () => void }) {
  const [skin, setSkin] = useState(readCardSkin);

  useEffect(() => {
    const syncSkin = (event: Event) => setSkin((event as CustomEvent<CardSkin>).detail);
    window.addEventListener('ivi-card-skin-change', syncSkin);
    return () => window.removeEventListener('ivi-card-skin-change', syncSkin);
  }, []);

  return (
    <section className="card-skin-settings" aria-labelledby="card-skin-title">
      <div className="settings-section-heading">
        <div>
          <h3 id="card-skin-title">Card style</h3>
          <p>Choose how every card looks on your device.</p>
        </div>
        <span>PERSONAL</span>
      </div>
      <button type="button" className="design-gallery-entry" onClick={onExplore}>
        <span>
          <strong>Explore 10 card designs</strong>
          <small>Compare complete card families, then apply your favorite</small>
        </span>
        <span aria-hidden="true">→</span>
      </button>
      <span className="available-now-label">AVAILABLE NOW</span>
      <div className="card-skin-options">
        {CARD_SKINS.map((option, index) => (
          <button
            type="button"
            key={option.id}
            className={`card-skin-option ${skin === option.id ? 'active' : ''}`}
            aria-pressed={skin === option.id}
            onClick={() => {
              setSkin(option.id);
              applyCardSkin(option.id);
            }}
          >
            <span className="card-skin-preview" data-preview-skin={option.id} aria-hidden="true">
              <PlayingCard card={{ id: `skin-${option.id}`, level: (index % 4) + 1, number: 7 }} />
            </span>
            <span className="card-skin-copy">
              <strong>{option.name}</strong>
              <small>{option.description}</small>
            </span>
            <span className="card-skin-check" aria-hidden="true">
              ✓
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
