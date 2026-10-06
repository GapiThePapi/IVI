import { Club, Diamond, Flame, Moon, RectangleVertical } from 'lucide-react';
import type { Card } from '../shared/types';
import { strength } from '../shared/engine';

export const SETS = [
  { name: 'Tide', label: '', color: '#57828d' },
  { name: 'Grove', label: 'X', color: '#62836c' },
  { name: 'Dusk', label: 'XX', color: '#9380ab' },
  { name: 'Ember', label: 'XXX', color: '#cc7556' },
];
const ROMAN_VALUES = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
  'XII',
  'XIII',
];
export function SetMark({ level, className = '' }: { level: number; className?: string }) {
  const Icon = [Diamond, Club, Moon, Flame][level - 1] ?? Diamond;
  return (
    <Icon
      className={`set-mark ${className}`}
      fill="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    />
  );
}
export function LevelBars({ level }: { level: number }) {
  return (
    <span className="level-bars" role="img" aria-label={`Level ${level} of 4`}>
      {[1, 2, 3, 4].map((bar) => (
        <RectangleVertical
          viewBox="5 2 14 20"
          key={bar}
          className={bar <= level ? 'filled' : ''}
          fill={bar <= level ? 'currentColor' : 'none'}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}
export function PlayingCard({
  card,
  back = false,
  small = false,
}: {
  card?: Card;
  back?: boolean;
  small?: boolean;
}) {
  if (back || !card)
    return (
      <div
        className={`playing-card card-back ${small ? 'small-card' : ''}`}
        aria-label="Hidden card"
      >
        <img className="card-back-logo" src="/assets/ivi-logo.svg" alt="" />
      </div>
    );
  if (card.kind === 'special')
    return (
      <div
        className={`playing-card special-card ${small ? 'small-card' : ''}`}
        aria-label="Special card: choose win or lose"
      >
        <span className="special-choice special-yes">YES</span>
        <img className="special-logo" src="/assets/ivi-logo.svg" alt="" />
        <span className="special-choice special-no">NO</span>
      </div>
    );
  const set = SETS[card.level - 1];
  return (
    <div
      className={`playing-card level-${card.level} ${small ? 'small-card' : ''}`}
      title={`Level ${card.level} · ${set.name} · ${card.number} · Strength ${strength(card)}`}
      aria-label={`Level ${card.level}, number ${card.number}`}
    >
      <span className="card-corner corner-top" aria-hidden="true">
        {set.label}
      </span>
      <span className="card-value">
        {ROMAN_VALUES[card.number - 1]}
      </span>
      <span className="card-corner corner-bottom" aria-hidden="true">
        {set.label}
      </span>
    </div>
  );
}
