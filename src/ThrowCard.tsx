import { useRef, useState } from 'react';
import type { Card } from '../shared/types';
import { PlayingCard } from './Card';
import { isThrow } from './tablePresentation';

export function ThrowCard({
  card,
  disabled,
  onPlay,
}: {
  card: Card;
  disabled: boolean;
  onPlay: (card: Card) => Promise<boolean>;
}) {
  const origin = useRef<{ x: number; y: number; id: number } | null>(null);
  const pending = useRef(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [throwing, setThrowing] = useState(false);
  const reset = () => {
    origin.current = null;
    setDragging(false);
    setOffset({ x: 0, y: 0 });
  };
  const play = async () => {
    if (disabled || pending.current) return;
    pending.current = true;
    setThrowing(true);
    await new Promise((resolve) => window.setTimeout(resolve, 140));
    try {
      await onPlay(card);
    } finally {
      pending.current = false;
      setThrowing(false);
      reset();
    }
  };
  return (
    <button
      className={`hand-card throw-card ${dragging ? 'dragging' : ''} ${throwing ? 'throwing' : ''}`}
      aria-label={
        card.kind === 'special'
          ? 'Throw special card'
          : `Throw level ${card.level} number ${card.number}`
      }
      aria-describedby={disabled ? undefined : 'throw-help'}
      disabled={disabled || throwing}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px) rotate(${offset.x / 12}deg)` }}
      onPointerDown={(e) => {
        if (disabled || pending.current || !e.isPrimary || e.button !== 0) return;
        origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }}
      onPointerMove={(e) => {
        const start = origin.current;
        if (!start || e.pointerId !== start.id) return;
        setOffset({ x: (e.clientX - start.x) * 0.6, y: Math.min(20, e.clientY - start.y) });
      }}
      onPointerUp={(e) => {
        const start = origin.current;
        if (!start || e.pointerId !== start.id) return;
        const commit = isThrow(e.clientX - start.x, e.clientY - start.y);
        reset();
        if (commit) void play();
      }}
      onPointerCancel={reset}
      onLostPointerCapture={reset}
      onClick={(e) => {
        if (e.detail === 0) void play();
      }}
    >
      <PlayingCard card={card} />
    </button>
  );
}
