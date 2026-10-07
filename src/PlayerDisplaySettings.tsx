import {
  CircleUserRound,
  Dot,
  GripHorizontal,
  Orbit,
  Rows3,
  SplitSquareHorizontal,
  StretchHorizontal,
} from 'lucide-react';
import { useState, type ComponentType } from 'react';

export type PlayerDisplay =
  'rail' | 'satellite' | 'split' | 'tokens' | 'stems' | 'baseline' | 'stack';

const STORAGE_KEY = 'ivi-player-display';

const DISPLAYS: Array<{
  id: PlayerDisplay;
  name: string;
  description: string;
  icon: ComponentType<{ size?: number }>;
}> = [
  { id: 'rail', name: 'Edge rail', description: 'Compact and easy to scan', icon: GripHorizontal },
  { id: 'satellite', name: 'Satellites', description: 'Avatars around the table', icon: Orbit },
  {
    id: 'split',
    name: 'Split badge',
    description: 'Avatar and details separated',
    icon: SplitSquareHorizontal,
  },
  {
    id: 'tokens',
    name: 'Dual tokens',
    description: 'Avatar plus score token',
    icon: CircleUserRound,
  },
  {
    id: 'stems',
    name: 'Score stems',
    description: 'Radial table markers',
    icon: StretchHorizontal,
  },
  { id: 'baseline', name: 'Baseline', description: 'Minimal type and markers', icon: Dot },
  { id: 'stack', name: 'Offset stack', description: 'Structured square tiles', icon: Rows3 },
];

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
        {DISPLAYS.map(({ id, name, description, icon: Icon }) => {
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
              <Icon size={18} />
              <span>{name}</span>
              <small>{description}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
