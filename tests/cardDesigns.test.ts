import { describe, expect, it } from 'vitest';
import { CARD_DESIGNS, CARD_DESIGN_SAMPLES } from '../src/CardDesignGallery';

describe('card design gallery', () => {
  it('offers ten uniquely named design directions', () => {
    expect(CARD_DESIGNS).toHaveLength(10);
    expect(new Set(CARD_DESIGNS.map((design) => design.id)).size).toBe(10);
    expect(new Set(CARD_DESIGNS.map((design) => design.name)).size).toBe(10);
  });

  it('uses the agreed five-card comparison set', () => {
    expect(CARD_DESIGN_SAMPLES).toEqual([
      { kind: 'normal', value: 'I', level: 1 },
      { kind: 'normal', value: 'VIII', level: 2 },
      { kind: 'normal', value: 'XIII', level: 4 },
      { kind: 'special' },
      { kind: 'back' },
    ]);
  });
});
