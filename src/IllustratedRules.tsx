import { useRef, useState } from 'react';
import { ArrowUp, ArrowRight, Heart, EyeOff, Check, Trophy } from 'lucide-react';
import { PlayingCard } from './Card';
const card = (level: number, number: number) => ({ id: `${level}-${number}`, level, number });
export function IllustratedRules() {
  const [step, setStep] = useState(0);
  const touchStart = useRef<number | null>(null);
  const titles = [
    'Call your wins',
    'Throw a card',
    'Level first. Number second.',
    'Match your call',
    'The blind round',
    'The special card',
  ];
  const captions = [
    'Choose how many fights you will win. The last caller cannot make the total equal the number of fights.',
    'On your turn, swipe any card upward. The winner leads the next fight.',
    'A higher level always wins. Within the same level, the higher Roman number wins.',
    'Lose 1 HP for each win above or below your call. Exact calls cost nothing.',
    'See everyone’s card except your own. Call Win or Lose in order; all calls are public. A wrong call costs 1 HP.',
    'After everyone plays, its owner chooses Win or Lose. Lose awards the fight to the strongest normal card.',
  ];
  return (
    <div className="illustrated-rules">
      <div
        className="lesson-art"
        aria-hidden="true"
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStart.current === null) return;
          const dx = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(dx) > 45) setStep((s) => Math.max(0, Math.min(5, s + (dx < 0 ? 1 : -1))));
          touchStart.current = null;
        }}
      >
        {step === 0 && (
          <>
            <div className="demo-call">
              2<small>YOUR CALL</small>
            </div>
            <ArrowRight />
            <div className="demo-fights">
              <Trophy />
              <Trophy />
            </div>
          </>
        )}
        {step === 1 && (
          <div className="demo-throw">
            <ArrowUp />
            <PlayingCard card={card(3, 7)} small />
          </div>
        )}
        {step === 2 && (
          <>
            <PlayingCard card={card(4, 1)} small />
            <b>›</b>
            <PlayingCard card={card(3, 10)} small />
          </>
        )}
        {step === 3 && (
          <>
            <div className="demo-call">
              2 / 2
              <small>
                <Check size={16} /> EXACT
              </small>
            </div>
            <div className="demo-call">
              1 / 2
              <small>
                <Heart size={16} /> −1 HP
              </small>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <PlayingCard back small />
            <EyeOff />
            <PlayingCard card={card(2, 8)} small />
          </>
        )}
        {step === 5 && (
          <>
            <PlayingCard card={{ kind: 'special', id: 'special', level: 0, number: 0 }} small />
            <div className="demo-choices">
              <span>Win ↑</span>
              <span>Lose ↓</span>
            </div>
          </>
        )}
      </div>
      <span className="lesson-number">
        {step + 1} / {titles.length}
      </span>
      <h3>{titles[step]}</h3>
      <p>{captions[step]}</p>
      <div className="lesson-nav">
        <button
          className="button secondary"
          disabled={step === 0}
          onClick={() => setStep(step - 1)}
        >
          Back
        </button>
        <button className="button primary" onClick={() => setStep((step + 1) % titles.length)}>
          {step === 5 ? 'Start again' : 'Next'}
          <ArrowRight size={16} />
        </button>
      </div>
      <details>
        <summary>All rules</summary>
        <p>
          4–8 players. The deck grows with the table: 41 cards for 4–5 players, 45 for 6, 49 for
          7, and 53 for 8, including the special card. The host chooses 3–20 starting lives. Play
          rounds with 5, 4, 3, 2, then 1 card, and repeat with a fresh shuffle.
        </p>
        <p>
          The first caller rotates each round. Play any card; there is no suit-following rule. A
          fight winner leads the next fight. Normal scoring still applies when the special card is
          used, including after the blind cards are revealed.
        </p>
        <p>
          At 0 HP you spectate. The last player standing wins. If everyone is eliminated together,
          those players return with 1 HP for sudden death.
        </p>
        <p>
          No turn timers. The host can remove absent players. Hosting passes to a connected player
          if the host disconnects.
        </p>
      </details>
    </div>
  );
}
