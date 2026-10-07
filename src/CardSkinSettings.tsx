import { useState } from 'react';
import { PlayingCard } from './Card';

export const CARD_SKINS = [
  { id: 'classic', name: 'Classic', description: 'Clean & timeless' },
  { id: 'noir', name: 'Noir', description: 'Dark & electric' },
  { id: 'pop', name: 'Pop', description: 'Bold & playful' },
  { id: 'atelier', name: 'Atelier', description: 'Warm & editorial' },
] as const;

export type CardSkin = (typeof CARD_SKINS)[number]['id'];

export function readCardSkin(): CardSkin {
  try {
    const saved = localStorage.getItem('ivi-card-skin');
    return CARD_SKINS.some((skin) => skin.id === saved) ? (saved as CardSkin) : 'classic';
  } catch {
    return 'classic';
  }
}

export function applyCardSkin(skin: CardSkin) {
  document.documentElement.dataset.cardSkin = skin;
  try {
    localStorage.setItem('ivi-card-skin', skin);
  } catch {
    /* Local storage is optional. */
  }
}

export function CardSkinSettings({ onExplore }: { onExplore: () => void }) {
  const [skin, setSkin] = useState(readCardSkin);

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
          <small>Compare five complete card views in every direction</small>
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
              <PlayingCard card={{ id: `skin-${option.id}`, level: index + 1, number: 7 }} />
            </span>
            <span className="card-skin-copy">
              <strong>{option.name}</strong>
              <small>{option.description}</small>
            </span>
            <span className="card-skin-check" aria-hidden="true">✓</span>
          </button>
        ))}
      </div>
    </section>
  );
}
