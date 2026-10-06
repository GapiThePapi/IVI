import { useState } from 'react';
import { ArrowLeft, Users, Plus, Gamepad2 } from 'lucide-react';
import { DifficultySelect } from './SoloSetup';
import { ProfileEditor, AvatarArt, readProfile, saveProfile, type Profile } from './Profile';
import type { Difficulty, Command } from '../shared/types';
import { isAndroidApp, openConnection } from './platform';
export default function NativeHome({
  send,
  disabled,
  restoring,
  connected,
  startPractice,
  retry,
  connectionFailed,
}: {
  retry: () => void;
  connectionFailed: boolean;
  send: (c: Command) => Promise<boolean>;
  disabled: boolean;
  restoring: boolean;
  connected: boolean;
  startPractice: (n: string, d: Difficulty) => void;
}) {
  const invite = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';
  const [screen, setScreen] = useState<'home' | 'solo' | 'create' | 'join'>(
    invite ? 'join' : 'home',
  );
  const [profile, setProfile] = useState(readProfile),
    [editing, setEditing] = useState(false),
    [code, setCode] = useState(invite),
    [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const choose = (next: typeof screen) => {
    setScreen(next);
    if (!profile.name) setEditing(true);
  };
  return (
    <main className="entry-home">
      <button className="home-profile" onClick={() => setEditing(true)} aria-label="Edit profile">
        <span className="avatar">
          <AvatarArt avatar={profile.avatar} />
        </span>
        <span>{profile.name || 'Add your profile'}</span>
      </button>
      {editing ? (
        <section className="entry-panel">
          <h1>Your profile</h1>
          <ProfileEditor
            initial={profile}
            onSave={async (p) => {
              saveProfile(p);
              setProfile(p);
              setEditing(false);
            }}
          />
          <button className="text-button" onClick={() => setEditing(false)}>
            Back
          </button>
        </section>
      ) : screen === 'home' ? (
        <div className="home-actions">
          <button onClick={() => choose('solo')}>
            <Gamepad2 />
            <span>Play solo</span>
          </button>
          <button onClick={() => choose('create')}>
            <Plus />
            <span>Create a lobby</span>
          </button>
          <button onClick={() => choose('join')}>
            <Users />
            <span>Join a lobby</span>
          </button>
        </div>
      ) : (
        <section className="entry-panel">
          <button className="text-button" onClick={() => setScreen('home')}>
            <ArrowLeft size={18} /> Back
          </button>
          <h1>
            {screen === 'solo'
              ? 'Play solo'
              : screen === 'create'
                ? 'Create a lobby'
                : 'Join a lobby'}
          </h1>
          {screen === 'solo' ? (
            <>
              <DifficultySelect value={difficulty} onChange={setDifficulty} />
              {!connected && (
                <button type="button" className="button secondary" onClick={retry}>
                  Retry connection
                </button>
              )}
              <button
                className="button primary full"
                disabled={!profile.name}
                onClick={() => startPractice(profile.name, difficulty)}
              >
                Play
              </button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(
                  screen === 'create'
                    ? { type: 'create', ...profile }
                    : { type: 'join', ...profile, code },
                );
              }}
            >
              {screen === 'join' && (
                <>
                  <label htmlFor="lobby-code">Lobby code</label>
                  <input
                    id="lobby-code"
                    value={code}
                    onChange={(e) =>
                      setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))
                    }
                    maxLength={6}
                    minLength={6}
                    required
                    placeholder="ABC234"
                    autoCapitalize="characters"
                    autoComplete="off"
                  />
                </>
              )}
              {!connected && (
                <p role="status">
                  {connectionFailed
                    ? 'Could not connect to the lobby server. Check your internet connection and server address, then retry.'
                    : restoring
                      ? 'Reconnecting…'
                      : 'Connecting to online lobbies…'}
                </p>
              )}
              {!connected && (
                <button type="button" className="button secondary" onClick={retry}>
                  Retry connection
                </button>
              )}
              {!connected && isAndroidApp && (
                <button type="button" className="button secondary" onClick={openConnection}>
                  Connection settings
                </button>
              )}
              <button
                className="button primary full"
                disabled={disabled || !profile.name || (screen === 'join' && code.length !== 6)}
              >
                {screen === 'create' ? 'Create lobby' : 'Join lobby'}
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
