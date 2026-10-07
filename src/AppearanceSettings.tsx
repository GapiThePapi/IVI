import { Moon, Sun } from 'lucide-react';
import { useState } from 'react';

export type Appearance = 'dark' | 'light';

const STORAGE_KEY = 'ivi-appearance';

export function readAppearance(): Appearance {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyAppearance(appearance: Appearance) {
  document.documentElement.dataset.theme = appearance;
  document.documentElement.style.colorScheme = appearance;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', appearance === 'dark' ? '#0b0b0b' : '#f7f7f5');
  try {
    localStorage.setItem(STORAGE_KEY, appearance);
  } catch {
    /* Local storage is optional. */
  }
}

export function AppearanceSettings() {
  const [appearance, setAppearance] = useState(readAppearance);

  return (
    <section className="appearance-settings" aria-labelledby="appearance-title">
      <div className="settings-section-heading">
        <div>
          <h3 id="appearance-title">Appearance</h3>
          <p>Use the same minimal IVI design in dark or light mode.</p>
        </div>
        <span>DEVICE</span>
      </div>
      <div className="appearance-options" role="group" aria-label="Color mode">
        {(['dark', 'light'] as const).map((option) => {
          const Icon = option === 'dark' ? Moon : Sun;
          const active = appearance === option;
          return (
            <button
              type="button"
              key={option}
              className={active ? 'active' : ''}
              aria-pressed={active}
              onClick={() => {
                setAppearance(option);
                applyAppearance(option);
              }}
            >
              <Icon size={19} />
              <span>{option === 'dark' ? 'Dark' : 'Light'}</span>
              <small>{option === 'dark' ? 'Obsidian' : 'Warm white'}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
