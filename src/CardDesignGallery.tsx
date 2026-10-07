import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { applyCardSkin, readCardSkin, type CardSkin } from './CardSkinSettings';

export const CARD_DESIGNS = [
  {
    id: 'obsidian',
    name: 'IVI Essential',
    note: 'Confident brand color with crisp, modern information.',
  },
  {
    id: 'classic',
    name: 'Classic Casino',
    note: 'Traditional card craft with familiar, high-contrast indices.',
  },
  {
    id: 'noir',
    name: 'Noir Neon',
    note: 'Electric table presence for players who prefer a dark theme.',
  },
  {
    id: 'deco',
    name: 'Art Deco',
    note: 'A collector-deck feel built from symmetry, navy, and gold.',
  },
  {
    id: 'nordic',
    name: 'Nordic Minimal',
    note: 'Calm, spacious, and deliberately free of visual noise.',
  },
  {
    id: 'atelier',
    name: 'Botanical',
    note: 'Natural paper, organic linework, and bookish typography.',
  },
  {
    id: 'pop',
    name: 'Bauhaus Pop',
    note: 'Playful primary shapes with an unmistakable graphic voice.',
  },
  {
    id: 'arcade',
    name: 'Retro Arcade',
    note: 'Pixel energy, vivid edges, and a playful screen-era rhythm.',
  },
  {
    id: 'cosmic',
    name: 'Cosmic Holographic',
    note: 'Deep-space color, luminous gradients, and stellar details.',
  },
  {
    id: 'accessible',
    name: 'High-Contrast',
    note: 'Maximum legibility with pattern, shape, text, and color cues.',
  },
] as const;

export const CARD_DESIGN_SAMPLES = [
  { kind: 'normal', value: 'I', level: 1 },
  { kind: 'normal', value: 'VIII', level: 2 },
  { kind: 'normal', value: 'XIII', level: 4 },
  { kind: 'special' },
  { kind: 'back' },
] as const;

type DesignSample = (typeof CARD_DESIGN_SAMPLES)[number];

function ConceptCard({ sample }: { sample: DesignSample }) {
  if (sample.kind === 'special')
    return (
      <div className="concept-card concept-special" aria-label="Special card">
        <span className="concept-special-label">SPECIAL</span>
        <strong>YES</strong>
        <img src="/assets/ivi-logo.svg" alt="" />
        <strong>NO</strong>
      </div>
    );

  if (sample.kind === 'back')
    return (
      <div className="concept-card concept-back" aria-label="Card back">
        <span className="back-frame" />
        <img src="/assets/ivi-logo.svg" alt="" />
        <span className="concept-back-word">IVI</span>
      </div>
    );

  const glyph = ['◆', '●', '◐', '✦'][sample.level - 1];
  return (
    <div
      className={`concept-card concept-front concept-level-${sample.level}`}
      aria-label={`Card ${sample.value}, level ${sample.level}`}
    >
      <span className="concept-index concept-index-top">
        <b>{sample.value}</b>
        {sample.level !== 4 && <small>L{sample.level}</small>}
      </span>
      <span className="concept-center">
        <span className="concept-glyph">{glyph}</span>
        <strong className="concept-value">{sample.value}</strong>
        {sample.level !== 4 && <span className="concept-level-label">LEVEL {sample.level}</span>}
      </span>
      <span className="concept-index concept-index-bottom">
        <b>{sample.value}</b>
        {sample.level !== 4 && <small>L{sample.level}</small>}
      </span>
    </div>
  );
}

export function CardDesignGallery({ close }: { close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pointerStart = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<CardSkin>(readCardSkin);
  const design = CARD_DESIGNS[index];

  useEffect(() => {
    dialog.current?.showModal();
    return () => dialog.current?.close();
  }, []);

  const previous = () => setIndex((value) => Math.max(0, value - 1));
  const next = () => setIndex((value) => Math.min(CARD_DESIGNS.length - 1, value + 1));

  return (
    <dialog
      ref={dialog}
      className="design-gallery-dialog"
      aria-label="Card design gallery"
      onCancel={close}
    >
      <header className="design-gallery-header">
        <div>
          <span className="gallery-eyebrow">CARD DESIGN STUDY</span>
          <h2>Choose the feeling of the table.</h2>
        </div>
        <button className="icon-button" onClick={close} aria-label="Close card design gallery">
          <X size={22} />
        </button>
      </header>

      <main
        className="design-gallery-stage"
        data-design={design.id}
        onPointerDown={(event) => {
          if (event.isPrimary) pointerStart.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (pointerStart.current === null) return;
          const distance = event.clientX - pointerStart.current;
          pointerStart.current = null;
          if (distance > 55) previous();
          if (distance < -55) next();
        }}
        onPointerCancel={() => {
          pointerStart.current = null;
        }}
      >
        <section className="design-gallery-intro" aria-live="polite">
          <div>
            <span className="design-number">{String(index + 1).padStart(2, '0')}</span>
            <h3>{design.name}</h3>
          </div>
          <p>{design.note}</p>
        </section>

        <section className="concept-card-grid" aria-label={`${design.name} card samples`}>
          {CARD_DESIGN_SAMPLES.map((sample, sampleIndex) => (
            <ConceptCard key={`${design.id}-${sampleIndex}`} sample={sample} />
          ))}
        </section>
      </main>

      <footer className="design-gallery-navigation">
        <button onClick={previous} disabled={index === 0} aria-label="Previous card design">
          <ChevronLeft size={20} />
          <span>Previous</span>
        </button>
        <div
          className="gallery-progress"
          aria-label={`Design ${index + 1} of ${CARD_DESIGNS.length}`}
        >
          <strong>
            {index + 1} of {CARD_DESIGNS.length}
          </strong>
          <span className="gallery-dots">
            {CARD_DESIGNS.map((item, itemIndex) => (
              <button
                key={item.id}
                className={itemIndex === index ? 'active' : ''}
                onClick={() => setIndex(itemIndex)}
                aria-label={`Show ${item.name}`}
                aria-current={itemIndex === index ? 'true' : undefined}
              />
            ))}
          </span>
          <button
            type="button"
            className={`gallery-apply ${selected === design.id ? 'selected' : ''}`}
            onClick={() => {
              const skin = design.id as CardSkin;
              applyCardSkin(skin);
              setSelected(skin);
            }}
            aria-pressed={selected === design.id}
          >
            {selected === design.id ? 'Selected' : 'Use this design'}
          </button>
        </div>
        <button
          onClick={next}
          disabled={index === CARD_DESIGNS.length - 1}
          aria-label="Next card design"
        >
          <span>Next</span>
          <ChevronRight size={20} />
        </button>
      </footer>
    </dialog>
  );
}
