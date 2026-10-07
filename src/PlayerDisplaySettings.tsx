import { Heart } from 'lucide-react';
import { useState } from 'react';
import { AvatarArt } from './Profile';

export type PlayerDisplay =
  'rail' | 'satellite' | 'split' | 'tokens' | 'stems' | 'baseline' | 'stack';

const STORAGE_KEY = 'ivi-player-display';

const DISPLAYS: Array<{
  id: PlayerDisplay;
  name: string;
  description: string;
}> = [
  { id: 'rail', name: 'Edge rail', description: 'Compact and easy to scan' },
  { id: 'satellite', name: 'Satellites', description: 'Avatars around the table' },
  {
    id: 'split',
    name: 'Split badge',
    description: 'Avatar and details separated',
  },
  {
    id: 'tokens',
    name: 'Dual tokens',
    description: 'Avatar plus score token',
  },
  {
    id: 'stems',
    name: 'Score stems',
    description: 'Radial table markers',
  },
  { id: 'baseline', name: 'Baseline', description: 'Minimal type and markers' },
  { id: 'stack', name: 'Offset stack', description: 'Structured square tiles' },
];

function PlayerDisplayPreview({ display }: { display: PlayerDisplay }) {
  return (
    <span className="player-display-preview" data-preview-display={display} aria-hidden="true">
      <span className="preview-avatar">
        <AvatarArt avatar="preset:2" />
      </span>
      <span className="preview-player-copy">
        <b>Alex</b>
        <small>
          <Heart size={9} fill="currentColor" /> 8 HP
        </small>
      </span>
      <span className="preview-player-call">
        <strong>2</strong>
        <small>/ 1</small>
      </span>
    </span>
  );
}

const isPlayerDisplay = (value: string | null): value is PlayerDisplay =>
  DISPLAYS.some((display) => display.id === value);

export function readPlayerDisplay(): PlayerDisplay {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isPlayerDisplay(saved) ? saved : 'rail';
  } catch {
    return 'rail';
  }
}

export function applyPlayerDisplay(display: PlayerDisplay) {
  document.documentElement.dataset.playerDisplay = display;
  try {
    localStorage.setItem(STORAGE_KEY, display);
  } catch {
    /* Local storage is optional. */
  }
}

export function PlayerDisplaySettings() {
  const [display, setDisplay] = useState(readPlayerDisplay);

  return (
    <section className="player-display-settings" aria-labelledby="player-display-title">
      <div className="settings-section-heading">
        <div>
          <h3 id="player-display-title">Player display</h3>
          <p>Choose how players appear around your table.</p>
        </div>
        <span>DEVICE</span>
      </div>
      <div className="player-display-options" role="group" aria-label="Player display style">
        {DISPLAYS.map(({ id, name, description }) => {
          const active = display === id;
          return (
            <button
              type="button"
              key={id}
              className={active ? 'active' : ''}
              aria-pressed={active}
              onClick={() => {
                setDisplay(id);
                applyPlayerDisplay(id);
              }}
            >
              <PlayerDisplayPreview display={id} />
              <span className="player-display-copy">
                <strong>{name}</strong>
                <small>{description}</small>
              </span>
              <span className="player-display-check" aria-hidden="true">
                ✓
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
