import { useState } from 'react';
import type { Difficulty } from '../shared/types';
export const DIFFICULTY_HELP: Record<Difficulty, string> = {
  easy: 'Makes imperfect calls and plays a random card.',
  medium: 'Calculates its call and plays toward that target.',
  hard: 'Simulates possible deals to minimize damage and disrupt rivals.',
};
export function DifficultySelect({
  value,
  onChange,
}: {
  value: Difficulty;
  onChange: (value: Difficulty) => void;
}) {
  return (
    <div className="difficulty-options" role="group" aria-label="Bot difficulty">
      {(['easy', 'medium', 'hard'] as const).map((d) => (
        <button
          key={d}
          className={value === d ? 'active' : ''}
          aria-pressed={value === d}
          title={DIFFICULTY_HELP[d]}
          onClick={() => onChange(d)}
        >
          {d[0].toUpperCase() + d.slice(1)}
        </button>
      ))}
    </div>
  );
}
export function SoloSetup({
  name = '',
  onStart,
}: {
  name?: string;
  onStart: (name: string, difficulty: Difficulty) => void;
}) {
  const [open, setOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    try {
      const d = localStorage.getItem('ivi-difficulty') ?? localStorage.getItem('decki-difficulty');
      return d === 'easy' || d === 'hard' ? d : 'medium';
    } catch {
      return 'medium';
    }
  });
  if (!open)
    return (
      <button className="button primary full" onClick={() => setOpen(true)}>
        Solo game
      </button>
    );
  return (
    <section className="solo-setup" aria-label="Solo game">
      <h2>Solo game</h2>
      <DifficultySelect
        value={difficulty}
        onChange={(d) => {
          setDifficulty(d);
          try {
            localStorage.setItem('ivi-difficulty', d);
          } catch {
            /*optional*/
          }
        }}
      />
      <p>
        {DIFFICULTY_HELP[difficulty]}
      </p>
      <button className="button primary full" onClick={() => onStart(name, difficulty)}>
        Play
      </button>
    </section>
  );
}
