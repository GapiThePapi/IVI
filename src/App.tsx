import { IllustratedRules } from './IllustratedRules';
import { AvatarArt, ProfileEditor, readProfile, saveProfile } from './Profile';
import { lobbyName } from '../shared/names';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  Crown,
  DoorOpen,
  Eye,
  EyeOff,
  Flag,
  Heart,
  Layers3,
  Link2,
  LockKeyhole,
  Menu,
  Plus,
  RotateCcw,
  ShieldCheck,
  Settings2,
  Trophy,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import { SoloSetup, DifficultySelect, DIFFICULTY_HELP } from './SoloSetup';
import { LayoutSettings, applyLayout, readLayout } from './LayoutSettings';
import { CardSkinSettings } from './CardSkinSettings';
import { CardDesignGallery } from './CardDesignGallery';
import { AppearanceSettings } from './AppearanceSettings';
import { PlayerDisplaySettings } from './PlayerDisplaySettings';
import type { Difficulty, Card, Command, GameView, PlayerView } from '../shared/types';
import { PlayingCard, SetMark, SETS } from './Card';
import { useGame } from './useGame';
import NativeHome from './NativeHome';
import { ThrowCard } from './ThrowCard';
import { callStatus, fightOrder, tableSeats } from './tablePresentation';
import { isAndroidApp, openConnection } from './platform';
import { checkForUpdate, type UpdateManifest } from './update';

type Send = (command: Command) => Promise<boolean>;
const sampleCards = [
  { id: '1-7', level: 1, number: 7 },
  { id: '2-4', level: 2, number: 4 },
  { id: '3-9', level: 3, number: 9 },
  { id: '4-1', level: 4, number: 1 },
];
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-label={title}
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-button" onClick={close} aria-label="Close dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function Rules({ close }: { close: () => void }) {
  return (
    <Modal title="How to play" close={close}>
      <IllustratedRules />
    </Modal>
  );
}
function Header({
  game,
  connected,
  onSettings,
  onLeave,
}: {
  game: GameView | null;
  connected: boolean;
  onSettings: () => void;
  onLeave: () => void;
}) {
  return (
    <header className="site-header">
      <nav>
        <button className="icon-button" aria-label="Settings" onClick={onSettings}>
          <Settings2 size={19} />
        </button>
        <span className={`connection-status ${connected ? '' : 'offline'}`}>
          <span />
          {game?.code === 'SOLO'
            ? 'Offline practice'
            : connected
              ? 'Live & together'
              : 'Connecting…'}
        </span>
        {game && (
          <button className="icon-button leave-button" aria-label="Leave table" onClick={onLeave}>
            <DoorOpen size={18} />
          </button>
        )}
      </nav>
    </header>
  );
}
function Landing({
  send,
  disabled,
  restoring,
  onRules,
}: {
  send: Send;
  disabled: boolean;
  restoring: boolean;
  onRules: () => void;
}) {
  const invite = new URLSearchParams(window.location.search).get('room')?.toUpperCase() ?? '';
  const [mode, setMode] = useState<'create' | 'join'>(invite ? 'join' : 'create');
  const [name, setName] = useState('');
  const [code, setCode] = useState(invite);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void send(
      mode === 'create'
        ? { type: 'create', name: name.trim() }
        : { type: 'join', name: name.trim(), code: code.trim().toUpperCase() },
    );
  };
  return (
    <main className="landing">
      <section className="hero">
        <div className="hero-grain" />
        <div className="hero-copy">
          <div className="eyebrow light">
            <span className="tiny-star">✳</span> YOUR PEOPLE. YOUR TABLE.
          </div>
          <h1>
            Read the table.
            <br />
            Trust your <em>gut.</em>
          </h1>
          <p>
            A card game where winning isn’t everything.
            <br className="desktop-break" /> Knowing when you’ll win? That’s the game.
          </p>
          <button className="hero-link" onClick={onRules}>
            Get to know IVI <ArrowUpRight size={18} />
          </button>
          <div className="hero-meta">
            <span>
              <Users size={16} />
              4–8 players
            </span>
            <span>
              <Heart size={16} />
              3–20 starting lives
            </span>
            <span>
              <Layers3 size={16} />
              Endless rematches
            </span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-1" />
          <div className="orbit orbit-2" />
          <div className="art-label">A LITTLE LUCK. A LOT OF INSTINCT.</div>
          <div className="card-fan">
            {sampleCards.map((card, i) => (
              <div className={`fan-card fan-${i}`} key={card.id}>
                <PlayingCard card={card} />
              </div>
            ))}
          </div>
          <div className="art-bottom">
            <span className="art-line" /> FOUR SETS. FORTY POSSIBILITIES.{' '}
            <span className="art-line" />
          </div>
        </div>
      </section>
      <section className="start-section">
        <div className="start-intro">
          <span className="eyebrow">MAKE ROOM FOR A GOOD TIME</span>
          <h2>
            Your next game night,
            <br />
            <em>one table away.</em>
          </h2>
          <p>
            Bring your friends. We’ll deal the cards.
            <br />
            No accounts, no downloads. Just play.
          </p>
          <div className="privacy-note">
            <LockKeyhole size={15} />
            <span>Private tables. Only your invited people.</span>
          </div>
        </div>
        <div className="entry-panel">
          <div className="segmented" aria-label="Room action">
            <button className={mode === 'create' ? 'active' : ''} onClick={() => setMode('create')}>
              Create a table
            </button>
            <button className={mode === 'join' ? 'active' : ''} onClick={() => setMode('join')}>
              Join friends
            </button>
          </div>
          <form onSubmit={submit}>
            <label htmlFor="nickname">What should we call you?</label>
            <input
              id="nickname"
              placeholder="Your name at the table"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoComplete="nickname"
              required
            />
            <div className="form-bottom">
              {mode === 'join' && (
                <div className="code-field">
                  <label htmlFor="room-code">Table code</label>
                  <input
                    id="room-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ABC234"
                    minLength={6}
                    maxLength={6}
                    required
                    autoComplete="off"
                  />
                </div>
              )}
              <button
                className="button primary full"
                disabled={disabled || !name.trim() || (mode === 'join' && code.trim().length !== 6)}
              >
                {restoring
                  ? 'Finding your seat…'
                  : mode === 'create'
                    ? 'Create a table'
                    : 'Take a seat'}
                <ArrowRight size={19} />
              </button>
            </div>
          </form>
          <p className="entry-caption">
            {mode === 'create'
              ? 'Your table. Your rules of banter.'
              : 'A good game is better with your people.'}
          </p>
        </div>
      </section>
      <section className="how-strip">
        <div>
          <span className="step-number">01</span>
          <p>
            <b>Make your call</b>
            <span>Predict how many fights you’ll win.</span>
          </p>
        </div>
        <div>
          <span className="step-number">02</span>
          <p>
            <b>Play your hand</b>
            <span>Higher set. Higher number. Your fight.</span>
          </p>
        </div>
        <div>
          <span className="step-number">03</span>
          <p>
            <b>Stay in the game</b>
            <span>Every missed prediction costs HP.</span>
          </p>
        </div>
      </section>
      <footer className="site-footer">
        <span>A little prediction. A little nerve.</span>
        <span>
          Made for the people around your table. <span className="footer-star">✳</span>
        </span>
      </footer>
    </main>
  );
}
function Avatar({ player, small = false }: { player: PlayerView; small?: boolean }) {
  return (
    <span className={`avatar avatar-${player.seat % 8} ${small ? 'avatar-small' : ''}`}>
      <AvatarArt avatar={player.avatar} />
    </span>
  );
}
function CopyInvite({ game }: { game: GameView }) {
  const [copied, setCopied] = useState(false),
    [failed, setFailed] = useState(false);
  return (
    <div className="lobby-code">
      <button
        className="code-copy"
        aria-label={`Copy lobby code ${game.code}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(game.code);
            setCopied(true);
            setFailed(false);
            window.setTimeout(() => setCopied(false), 1800);
          } catch {
            setFailed(true);
          }
        }}
      >
        {game.code}
        <Copy size={17} />
      </button>
      <span role="status">
        {copied ? 'Copied!' : failed ? 'Select and copy the code' : 'Tap to copy'}
      </span>
    </div>
  );
}
function Lobby({
  game,
  send,
  disabled,
  onKick,
}: {
  game: GameView;
  send: Send;
  disabled: boolean;
  onKick: (p: PlayerView) => void;
}) {
  const me = game.players.find((p) => p.id === game.youId)!;
  const [botDifficulty, setBotDifficulty] = useState<Difficulty>('medium');
  const isHost = game.hostId === me.id;
  const ready = game.players.filter((p) => p.ready && p.connected).length;
  const canStart = game.players.length >= 4 && ready === game.players.length;
  return (
    <main className="lobby page-wrap">
      <div className="lobby-title">
        <h1>{lobbyName(game.code)}</h1>
        <span className="lobby-count">
          <Users size={18} />
          {game.players.length}/8
        </span>
        <CopyInvite game={game} />
      </div>
      {game.notice && <div className="notice">{game.notice}</div>}
      <div className="lobby-layout">
        <section className="lobby-roster">
          <div className="section-heading">
            <h2>Around the table</h2>
            <span>{ready} ready</span>
          </div>
          <div className="roster-list">
            {game.players.map((p) => (
              <div className="roster-row" key={p.id}>
                <Avatar player={p} />
                <div className="roster-name">
                  <b>
                    {p.name}
                    {p.id === me.id && <span className="you-tag">you</span>}
                  </b>
                  <span>
                    {p.isBot
                      ? 'Practice bot'
                      : p.id === game.hostId
                        ? 'Table host'
                        : `Seat ${game.players.indexOf(p) + 1}`}
                    {!p.connected && ' · Reconnecting'}
                  </span>
                </div>
                {p.id === game.hostId && <Crown size={16} className="host-crown" />}
                <span className={`ready-status ${p.ready && p.connected ? 'is-ready' : ''}`}>
                  {p.ready && p.connected ? (
                    <>
                      <Check size={15} /> Ready
                    </>
                  ) : !p.connected ? (
                    <>
                      <WifiOff size={14} /> Away
                    </>
                  ) : (
                    'Not ready'
                  )}
                </span>
                {isHost && p.id !== me.id && (
                  <button
                    className="icon-button kick-button"
                    aria-label={`Remove ${p.name}`}
                    disabled={disabled}
                    onClick={() => onKick(p)}
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            {Array.from({ length: Math.max(0, 4 - game.players.length) }, (_, i) => (
              <div className="roster-row empty-seat" key={`empty-${i}`}>
                <span className="avatar">
                  <Plus size={20} />
                </span>
                <span>Waiting for a friend</span>
                <span className="seat-label">OPEN SEAT</span>
              </div>
            ))}
          </div>
          <div className="lobby-actions">
            {isHost && (
              <>
                <div className="lives-setting">
                  <label htmlFor="starting-lives">Starting lives</label>
                  <select
                    id="starting-lives"
                    value={game.startingHp}
                    disabled={disabled}
                    onChange={(event) =>
                      void send({
                        type: 'set-lives',
                        lives: Number(event.target.value) as 3 | 5 | 10 | 15 | 20,
                      })
                    }
                  >
                    {[3, 5, 10, 15, 20].map((lives) => (
                      <option key={lives} value={lives}>
                        {lives}
                      </option>
                    ))}
                  </select>
                </div>
                <DifficultySelect value={botDifficulty} onChange={setBotDifficulty} />
                <p className="difficulty-description">{DIFFICULTY_HELP[botDifficulty]}</p>
                <button
                  className="button secondary"
                  disabled={disabled || game.players.length >= 8}
                  onClick={() => void send({ type: 'add-bot', difficulty: botDifficulty })}
                >
                  <Plus size={18} /> Add bot
                </button>
              </>
            )}
            {!isHost && <span className="lives-summary">Starting lives: {game.startingHp}</span>}
            <button
              className={`button ${me.ready ? 'secondary' : 'primary'}`}
              disabled={disabled}
              onClick={() => void send({ type: 'ready', ready: !me.ready })}
            >
              {me.ready ? (
                <>
                  <Check size={18} /> You’re ready
                </>
              ) : (
                'I’m ready'
              )}
              {!me.ready && <ArrowRight size={18} />}
            </button>
            {isHost && (
              <button
                className="button dark"
                disabled={disabled || !canStart}
                onClick={() => void send({ type: 'start' })}
              >
                Deal the cards <Layers3 size={18} />
              </button>
            )}
          </div>
          <p className="fine-print">
            {game.players.length < 4
              ? `${4 - game.players.length} more players to start`
              : !canStart
                ? 'Waiting for everyone to be ready'
                : 'Ready to play'}
          </p>
        </section>
      </div>
    </main>
  );
}
function CallCount({ player }: { player: PlayerView }) {
  const call = player.bid ?? '?';
  return (
    <span
      className={`call-count call-${callStatus(player.wins, player.bid)}`}
      aria-label={
        player.bid === null
          ? `Call not declared, ${player.wins} won`
          : `${player.bid} called, ${player.wins} won`
      }
    >
      <strong>
        {callStatus(player.wins, player.bid) === 'exact' && (
          <Check className="exact-check" size={16} />
        )}
        {call}
        <span> / </span>
        {player.wins}
      </strong>
    </span>
  );
}
function PlayerSeat({
  player,
  game,
  onKick,
}: {
  player: PlayerView;
  game: GameView;
  onKick: (p: PlayerView) => void;
}) {
  const current = game.turnId === player.id;
  return (
    <div
      className={`player-seat ${current ? 'current-seat' : ''} ${player.eliminated ? 'eliminated-seat' : ''}`}
    >
      <div className="seat-top">
        <Avatar player={player} small />
        <div className="seat-name">
          <b title={player.name}>{player.name}</b>
          <small>
            {player.eliminated
              ? 'Spectating'
              : !player.connected
                ? 'Away · waiting'
                : current
                  ? 'Their turn'
                  : game.phase === 'blind'
                    ? player.predictionLocked
                      ? 'Call locked'
                      : 'Thinking…'
                    : game.phase === 'results' || game.phase === 'finished'
                      ? 'Round complete'
                      : `${player.handCount} ${player.handCount === 1 ? 'card' : 'cards'} left`}
          </small>
        </div>
        {player.id === game.hostId && <Crown size={13} className="seat-crown" />}
      </div>
      <div className="seat-stats">
        <span className="hp" aria-label={`${player.hp} health points`}>
          <Heart size={12} fill="currentColor" />
          {player.hp}
        </span>
        <span className="seat-call">
          {game.phase === 'blind' ? (
            <>
              {player.predictionLocked ? <LockKeyhole size={13} /> : <EyeOff size={13} />}
              <span>
                {player.blindPrediction === null ? '–' : player.blindPrediction ? 'Win' : 'Lose'}
              </span>
            </>
          ) : game.count === 1 && player.blindPrediction !== null ? (
            <span>Called {player.blindPrediction ? 'a win' : 'a loss'}</span>
          ) : (
            <CallCount player={player} />
          )}
        </span>
        {game.hostId === game.youId && player.id !== game.youId && (
          <button
            className="seat-remove"
            aria-label={`Remove ${player.name}`}
            onClick={() => onKick(player)}
          >
            <X size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
function RoundRail({ game }: { game: GameView }) {
  return (
    <div className="round-rail">
      <span className="rail-label">THE CYCLE</span>
      {[5, 4, 3, 2, 1].map((n) => (
        <span key={n} className={`round-step ${game.count === n ? 'active' : ''}`}>
          <b>{n === 1 ? <EyeOff size={15} /> : n}</b>
          <span>{n === 1 ? 'Blind' : `${n} cards`}</span>
        </span>
      ))}
      <RotateCcw size={15} className="cycle-icon" />
    </div>
  );
}
function ResultPanel({ game, send, disabled }: { game: GameView; send: Send; disabled: boolean }) {
  const winner = game.players.find((p) => p.id === game.winnerId);
  const finished = game.phase === 'finished';
  return (
    <section className="results-panel">
      <div className="result-title">
        <span className="result-icon">
          {finished ? (
            <Trophy size={30} />
          ) : game.suddenDeath ? (
            <Heart size={30} />
          ) : (
            <Flag size={27} />
          )}
        </span>
        <div>
          <span className="eyebrow">
            {finished
              ? 'LAST ONE STANDING'
              : game.suddenDeath
                ? 'SUDDEN DEATH'
                : `ROUND ${game.round} COMPLETE`}
          </span>
          <h2>
            {finished
              ? winner
                ? `${winner.name} takes the table.`
                : 'The table is closed.'
              : game.suddenDeath
                ? 'One more chance. One HP.'
                : 'The cards are on the table.'}
          </h2>
          <p>
            {finished
              ? 'Good calls. Close calls. Another round?'
              : game.suddenDeath
                ? 'Everyone fell together. Remaining players return at 1 HP.'
                : 'Every prediction counts. Here’s how yours landed.'}
          </p>
        </div>
      </div>
      {game.revealed.length > 0 && (
        <div className="reveal-row">
          {game.revealed.map((play) => (
            <div key={play.playerId}>
              <PlayingCard card={play.card} small />
              <b>{play.name}</b>
              <span>
                {game.results.find((r) => r.playerId === play.playerId)?.prediction
                  ? 'Called a win'
                  : 'Called a loss'}
              </span>
              {game.fights[0]?.winnerId === play.playerId && (
                <span className="reveal-winner">
                  <Crown size={12} /> Winner
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {game.results.length > 0 && (
        <div className="score-table-wrap">
          <table className="score-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Called</th>
                <th>Won</th>
                <th>HP lost</th>
                <th>HP left</th>
              </tr>
            </thead>
            <tbody>
              {game.results.map((r) => (
                <tr key={r.playerId} className={r.playerId === game.youId ? 'your-result' : ''}>
                  <td>
                    {r.name}
                    {r.playerId === game.youId && <span className="you-tag">you</span>}
                  </td>
                  <td>
                    {typeof r.prediction === 'boolean'
                      ? r.prediction
                        ? 'Win'
                        : 'Lose'
                      : r.prediction}
                  </td>
                  <td>{r.wins}</td>
                  <td className={r.loss > 0 ? 'loss-text' : 'success-text'}>
                    {r.loss > 0 ? `−${r.loss}` : 'Perfect'}
                  </td>
                  <td>
                    {game.suddenDeath ? (
                      <span title="Restored for sudden death">1 ↺</span>
                    ) : r.hp === 0 ? (
                      'Out'
                    ) : (
                      r.hp
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="result-actions">
        {game.hostId === game.youId ? (
          <button
            className="button primary"
            disabled={disabled}
            onClick={() => void send({ type: finished ? 'rematch' : 'next' })}
          >
            {finished
              ? 'Play again'
              : `Next round · ${game.count === 1 ? 5 : game.count - 1} cards`}
            <ArrowRight size={18} />
          </button>
        ) : (
          <p className="muted">
            Waiting for the host to {finished ? 'start a rematch' : 'deal the next round'}.
          </p>
        )}
      </div>
    </section>
  );
}
function GameTable({
  game,
  send,
  disabled,
  onKick,
  onEnd,
  onSettings,
  onRules,
  onLeave,
}: {
  game: GameView;
  send: Send;
  disabled: boolean;
  onKick: (p: PlayerView) => void;
  onEnd: () => void;
  onSettings: () => void;
  onRules: () => void;
  onLeave: () => void;
}) {
  const me = game.players.find((p) => p.id === game.youId)!;
  const current = game.players.find((p) => p.id === game.turnId);
  const [bid, setBid] = useState<number | null>(null);
  const [prediction, setPrediction] = useState<boolean | null>(null);
  const [history, setHistory] = useState(false);
  const [manage, setManage] = useState(false);
  useEffect(() => {
    setBid(null);
    setPrediction(null);
  }, [game.round, game.phase, game.turnId]);
  const isTurn = game.turnId === me.id;
  const results = game.phase === 'results' || game.phase === 'finished';
  const livePlayers = game.players.filter((p) => !p.eliminated);
  const blind = game.phase === 'blind';
  const special = game.phase === 'special';
  const lastFight = game.fights.at(-1);
  const playCard = (card: Card) => send({ type: 'play', cardId: card.id });
  return (
    <main className={`game-page phase-${game.phase}`}>
      <div className="game-topline">
        <div className="table-identity">
          <span className="eyebrow">TABLE {game.code}</span>
          <h1>
            {blind
              ? 'Trust what you can’t see.'
              : results
                ? 'A moment of truth.'
                : 'Play your prediction.'}
          </h1>
        </div>
        <div className="game-top-actions">
          <span className="pill">
            <Heart size={14} />
            {livePlayers.length} still standing
          </span>
          <button className="icon-button" aria-label="Table menu" onClick={() => setManage(true)}>
            <Menu size={22} />
          </button>
        </div>
      </div>
      <RoundRail game={game} />
      {game.notice && (
        <div className="notice" role="status">
          {game.notice}
        </div>
      )}
      <div className="game-layout">
        <section className="game-main">
          <div className="table-surface">
            <div className="table-meta">
              <span>
                <span className="live-dot" />
                ROUND {game.round} <span className="meta-divider">/</span> CYCLE{' '}
                {Math.ceil(game.round / 5)}
              </span>
              <span>
                {special
                  ? 'SPECIAL CARD'
                  : blind
                    ? 'THE BLIND ROUND'
                    : results
                      ? 'ROUND COMPLETE'
                      : game.phase === 'bidding'
                        ? 'MAKE YOUR CALL'
                        : `FIGHT ${game.fights.length + 1} OF ${game.count}`}
              </span>
            </div>
            {results ? (
              <ResultPanel game={game} send={send} disabled={disabled} />
            ) : (
              <div
                className={`poker-table ${game.players.length > 6 ? 'poker-table-dense' : ''}`}
                aria-label="Players seated clockwise around the table"
              >
                <div className="poker-felt" aria-hidden="true" />
                {game.phase === 'bidding' && (
                  <div className="prediction-sum" role="status" aria-live="polite">
                    <span>Prediction total</span>
                    <strong>{game.bidTotal}</strong>
                    <small>of {game.count} fights</small>
                  </div>
                )}
                <div
                  className={`trick-grid trick-grid-${livePlayers.length}`}
                  aria-label={blind ? 'Blind cards' : 'Cards on the table'}
                >
                  {fightOrder(game).map((player) => {
                    const play = game.trick.find((item) => item.playerId === player.id);
                    if (!blind && !play) return null;
                    return (
                      <div className="trick-slot" key={player.id}>
                        <PlayingCard
                          card={play?.card ?? player.cards[0]}
                          back={blind && !player.cards[0]}
                          small
                        />
                        <span>{player.name}</span>
                      </div>
                    );
                  })}
                </div>
                {tableSeats(game).map(({ player, x, y }) => {
                  const play = game.trick.find((t) => t.playerId === player.id);
                  const leader = fightOrder(game)[0]?.id === player.id;
                  const active = player.id === game.turnId;
                  const horizontalPosition =
                    x < 40 ? 'seat-left' : x > 60 ? 'seat-right' : 'seat-center';
                  const verticalPosition =
                    y < 40 ? 'seat-top-edge' : y > 60 ? 'seat-bottom-edge' : 'seat-middle';
                  return (
                    <div key={player.id} className="poker-position">
                      <div
                        className={`poker-seat ${horizontalPosition} ${verticalPosition} ${active ? 'poker-seat-active' : ''}`}
                        style={{ left: `${x}%`, top: `${y}%` }}
                        aria-current={active ? 'true' : undefined}
                      >
                        <div className="poker-seat-label">
                          {player.eliminated
                            ? 'Out'
                            : active
                              ? player.id === me.id
                                ? 'Your turn'
                                : 'Turn'
                              : leader
                                ? 'Leads'
                                : play
                                  ? 'Played'
                                  : '\u00a0'}
                          {leader && active && <span> · leads</span>}
                        </div>
                        <PlayerSeat player={player} game={game} onKick={onKick} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {!results && lastFight && (
              <button className="last-fight" onClick={() => setHistory(true)}>
                <Trophy size={14} />
                <span>
                  <b>{lastFight.winnerName}</b> won fight {lastFight.number}
                </span>
                <span>
                  See cards <ChevronRight size={14} />
                </span>
              </button>
            )}
          </div>
          {!results && (
            <section className="hand-panel">
              <div className="hand-heading">
                <div>
                  <span className="eyebrow">
                    {me.eliminated
                      ? 'FROM THE SIDELINES'
                      : blind
                        ? 'ONE CARD. ONE CALL.'
                        : 'YOUR HAND'}
                  </span>
                  <h3>
                    {me.eliminated
                      ? 'You’re still part of the table.'
                      : blind
                        ? 'Go with your gut.'
                        : game.phase === 'bidding'
                          ? 'Make it a good guess.'
                          : isTurn
                            ? 'Your turn'
                            : `${current?.name ?? 'Someone'}’s turn`}
                  </h3>
                </div>
                <div className="your-hp">
                  <Avatar player={me} small />
                  <b>You</b>
                  <span>·</span>
                  <span>{me.hp} HP</span>
                  {!blind && (
                    <>
                      <span>·</span>
                      <CallCount player={me} />
                    </>
                  )}
                </div>
              </div>
              {me.eliminated ? (
                <p className="spectator-note">
                  You’re out of this match. Follow the public table and cheer on your friends.
                </p>
              ) : special ? (
                <div className="special-controls" role="status">
                  <h3>{isTurn ? 'Win or lose this fight?' : `${current?.name} decides`}</h3>
                  {isTurn && (
                    <div className="difficulty-options">
                      <button
                        disabled={disabled}
                        onClick={() => void send({ type: 'choose-special', win: true })}
                      >
                        Win
                      </button>
                      <button
                        disabled={disabled}
                        onClick={() => void send({ type: 'choose-special', win: false })}
                      >
                        Lose
                      </button>
                    </div>
                  )}
                </div>
              ) : blind ? (
                <div className="blind-controls">
                  {me.predictionLocked ? (
                    <div className="locked-call">
                      <LockKeyhole size={20} />
                      <span>
                        You called <b>{me.blindPrediction ? '“I win”' : '“I lose”'}</b>. Waiting for
                        the table.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="prediction-options">
                        <button
                          className={`prediction-button ${prediction === true ? 'chosen' : ''}`}
                          aria-pressed={prediction === true}
                          disabled={disabled || !isTurn}
                          onClick={() => setPrediction(true)}
                        >
                          <Crown size={22} />
                          <b>I win</b>
                          <span>My card is the strongest.</span>
                        </button>
                        <button
                          className={`prediction-button ${prediction === false ? 'chosen' : ''}`}
                          aria-pressed={prediction === false}
                          disabled={disabled || !isTurn}
                          onClick={() => setPrediction(false)}
                        >
                          <Eye size={22} />
                          <b>I lose</b>
                          <span>Someone has me beat.</span>
                        </button>
                      </div>
                      <button
                        className="button primary"
                        disabled={disabled || !isTurn || prediction === null}
                        onClick={() =>
                          prediction !== null && void send({ type: 'predict', win: prediction })
                        }
                      >
                        Lock call
                        <LockKeyhole size={17} />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="hand-content">
                  <div className="hand-cards">
                    {me.cards.map((card) => (
                      <ThrowCard
                        key={card.id}
                        card={card}
                        disabled={disabled || game.phase !== 'playing' || !isTurn}
                        onPlay={playCard}
                      />
                    ))}
                  </div>
                  <div className="hand-action">
                    {game.phase === 'bidding' ? (
                      isTurn ? (
                        <>
                          <label>Your predicted wins</label>
                          <div className="bid-options">
                            {Array.from({ length: game.count + 1 }, (_, n) => (
                              <button
                                key={n}
                                disabled={disabled || n === game.forbiddenBid}
                                className={bid === n ? 'chosen' : ''}
                                aria-label={`Predict ${n} wins`}
                                aria-pressed={bid === n}
                                title={
                                  n === game.forbiddenBid
                                    ? `Would make the total equal ${game.count}`
                                    : undefined
                                }
                                onClick={() => setBid(n)}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                          {game.forbiddenBid !== null && (
                            <p className="forbidden-note">
                              {game.forbiddenBid} is unavailable: the total would be {game.count}.
                            </p>
                          )}
                          <button
                            className="button primary full"
                            disabled={disabled || bid === null || bid === game.forbiddenBid}
                            onClick={() => bid !== null && void send({ type: 'bid', value: bid })}
                          >
                            Lock prediction
                            <ArrowRight size={17} />
                          </button>
                        </>
                      ) : (
                        <div className="waiting-action">
                          <span className="soft-icon">
                            <Eye size={21} />
                          </span>
                          <b>
                            {me.bid !== null
                              ? `You called ${me.bid} ${me.bid === 1 ? 'win' : 'wins'}.`
                              : 'Your call is coming.'}
                          </b>
                          <span>Waiting for {current?.name}.</span>
                        </div>
                      )
                    ) : isTurn ? (
                      <>
                        <div id="throw-help" className="throw-help">
                          <ArrowUpRight size={18} /> Swipe a card up to play
                        </div>
                      </>
                    ) : (
                      <div className="waiting-action">
                        <span className="soft-icon">
                          <Layers3 size={21} />
                        </span>
                        <b>Watch the table.</b>
                        <span>{current?.name} plays next.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          )}
        </section>
        <aside className="game-sidebar">
          <div className="sidebar-card">
            <span className="eyebrow">THE WAY UP</span>
            <h3>Know your strength.</h3>
            <p>Set first. Number second.</p>
            <div className="strength-ladder">
              {[...SETS].reverse().map((set, i) => (
                <div key={set.name}>
                  <span className={`level-chip level-color-${4 - i}`}>
                    <SetMark level={4 - i} />
                  </span>
                  <div>
                    <b>
                      {set.label || 'No mark'} · {set.name}
                    </b>
                    <small>I–XIII</small>
                  </div>
                  {i === 0 && <Crown size={13} />}
                </div>
              ))}
            </div>
            <p className="fine-print">Any card in a higher level beats every card below it.</p>
          </div>
          <div className="sidebar-card gentle-card">
            <span className="eyebrow">A FRIENDLY REMINDER</span>
            <p>Winning more isn’t always winning better.</p>
            <span>
              Match your prediction.
              <br />
              Keep your HP.
            </span>
            <span className="sidebar-star">✳</span>
          </div>
        </aside>
      </div>
      {manage && (
        <Modal title="Table menu" close={() => setManage(false)}>
          <div className="table-menu-actions">
            <button
              className="button secondary"
              onClick={() => {
                setManage(false);
                onSettings();
              }}
            >
              <Settings2 size={18} /> Settings
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setManage(false);
                onRules();
              }}
            >
              <CircleHelp size={18} /> How to play
            </button>
            <button
              className="button secondary"
              onClick={() => {
                setManage(false);
                onLeave();
              }}
            >
              <DoorOpen size={18} /> Leave table
            </button>
          </div>
          {game.hostId === me.id && (
            <>
              <h3 className="menu-section-title">Host controls</h3>
              <div className="native-manage-list">
                {game.players.map((p) => (
                  <div key={p.id}>
                    <Avatar player={p} small />
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {p.eliminated
                          ? 'Spectating'
                          : p.connected
                            ? `${p.hp} HP · Connected`
                            : 'Away · Seat waiting'}
                      </small>
                    </span>
                    {p.id !== game.youId && (
                      <button
                        className="button secondary"
                        aria-label={`Remove ${p.name}`}
                        disabled={disabled}
                        onClick={() => {
                          setManage(false);
                          onKick(p);
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                className="button danger full"
                onClick={() => {
                  setManage(false);
                  onEnd();
                }}
              >
                End match
              </button>
            </>
          )}
        </Modal>
      )}
      {history && (
        <Modal title="The last fight" close={() => setHistory(false)}>
          <div className="history-cards">
            {lastFight?.plays.map((play) => (
              <div key={play.playerId}>
                <PlayingCard card={play.card} small />
                <b>{play.name}</b>
                {play.playerId === lastFight.winnerId && (
                  <span className="success-text">Winner</span>
                )}
              </div>
            ))}
          </div>
        </Modal>
      )}
    </main>
  );
}
export default function App() {
  const {
    game,
    connected,
    busy,
    restoring,
    error,
    setError,
    send,
    practice,
    startPractice,
    connectionFailed,
    retry,
  } = useGame();
  const [profileRevision, setProfileRevision] = useState(0);
  const [splash, setSplash] = useState(true);
  const [update, setUpdate] = useState<UpdateManifest | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 900);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
    if (!isAndroidApp) return;
    const controller = new AbortController();
    checkForUpdate((input, init) => fetch(input, { ...init, signal: controller.signal }))
      .then(setUpdate)
      .catch(() => undefined);
    return () => controller.abort();
  }, []);
  const [rules, setRules] = useState(false);
  const [settings, setSettings] = useState(false);
  const [designGallery, setDesignGallery] = useState(false);
  useEffect(() => applyLayout(readLayout()), []);
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    command: Command;
    label: string;
  } | null>(null);
  const disabled = busy || (!connected && !practice) || restoring;
  const kick = (player: PlayerView) =>
    setConfirm({
      title: `Remove ${player.name}?`,
      body:
        game?.phase === 'lobby'
          ? 'Their seat will open up for another friend.'
          : 'Their remaining cards and unresolved play will be removed. Existing predictions and completed fights still count.',
      command: { type: 'kick', playerId: player.id },
      label: 'Remove player',
    });
  return (
    <>
      {splash && (
        <div className="app-splash" role="status" aria-label="Welcome to IVI">
          <img className="splash-art" src="/assets/ivi-logo.svg" alt="IVI" />
        </div>
      )}
      <Header
        game={game}
        connected={connected}
        onSettings={() => setSettings(true)}
        onLeave={() =>
          setConfirm({
            title: 'Leave this table?',
            body: practice
              ? 'This offline match will end. You can start a new bot game any time.'
              : 'Leaving releases your seat. You cannot rejoin a match already in progress. Closing this tab instead keeps your seat waiting.',
            command: { type: 'leave' },
            label: 'Leave table',
          })
        }
      />
      {!connected && !practice && game && (
        <div className="connection-banner" role="status">
          <WifiOff size={17} />
          {connectionFailed
            ? 'Online tables are unavailable. You can still play vs bots.'
            : game
              ? 'Connection lost. Reconnecting to your seat… Your table will wait.'
              : 'Connecting to the table server…'}
          {connectionFailed && (
            <button className="text-button" onClick={retry}>
              Retry connection
            </button>
          )}
        </div>
      )}
      {error && (
        <div className="toast" role="alert">
          <span>{error}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setError('')}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {!game ? (
        <NativeHome
          key={profileRevision}
          retry={retry}
          connectionFailed={connectionFailed}
          send={send}
          disabled={disabled}
          restoring={restoring}
          connected={connected}
          startPractice={startPractice}
          onRules={() => setRules(true)}
        />
      ) : game.phase === 'lobby' ? (
        <Lobby game={game} send={send} disabled={disabled} onKick={kick} />
      ) : (
        <GameTable
          game={game}
          send={send}
          disabled={disabled}
          onKick={kick}
          onSettings={() => setSettings(true)}
          onRules={() => setRules(true)}
          onLeave={() =>
            setConfirm({
              title: 'Leave this table?',
              body: practice
                ? 'This offline match will end. You can start a new bot game any time.'
                : 'Leaving releases your seat. You cannot rejoin a match already in progress. Closing this tab instead keeps your seat waiting.',
              command: { type: 'leave' },
              label: 'Leave table',
            })
          }
          onEnd={() =>
            setConfirm({
              title: 'End this match?',
              body: 'Everyone will return to the lobby. No winner will be declared, and HP will reset for the next match.',
              command: { type: 'end' },
              label: 'End match',
            })
          }
        />
      )}
      {rules && <Rules close={() => setRules(false)} />}
      {settings && (
        <Modal title="Settings" close={() => setSettings(false)}>
          <AppearanceSettings />
          <PlayerDisplaySettings />
          <ProfileEditor
            initial={readProfile()}
            onSave={async (profile) => {
              if (game && !(await send({ type: 'profile', ...profile })))
                throw new Error(
                  'Could not update your table profile. Check your connection or choose another name.',
                );
              saveProfile(profile);
              setProfileRevision((v) => v + 1);
              setSettings(false);
            }}
          />
          <CardSkinSettings
            onExplore={() => {
              setSettings(false);
              setDesignGallery(true);
            }}
          />
          <LayoutSettings />
        </Modal>
      )}
      {designGallery && <CardDesignGallery close={() => setDesignGallery(false)} />}
      {update && (
        <Modal title="IVI update available" close={() => setUpdate(null)}>
          <div className="update-copy">
            <img src="/assets/ivi-logo.svg" alt="" />
            <div>
              <p className="update-version">Version {update.version} is ready</p>
              <p>{update.notes || 'A newer version of IVI is available.'}</p>
            </div>
          </div>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setUpdate(null)}>
              Later
            </button>
            <a
              className="button primary"
              href={update.downloadUrl}
              target="_blank"
              rel="noreferrer"
            >
              Download update
            </a>
          </div>
        </Modal>
      )}
      {confirm && (
        <Modal title={confirm.title} close={() => setConfirm(null)}>
          <p className="confirm-body">{confirm.body}</p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setConfirm(null)}>
              Stay here
            </button>
            <button
              className="button danger"
              disabled={disabled}
              onClick={async () => {
                if (await send(confirm.command)) setConfirm(null);
              }}
            >
              {confirm.label}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
