import { useState } from 'react';
import { UserRound, VenetianMask, Crown, Ghost, Fish, Flame, Upload } from 'lucide-react';
export interface Profile {
  name: string;
  avatar: string;
}
const PROFILE_KEY = 'ivi-profile';
const LEGACY_PROFILE_KEY = 'decki-profile';
export function readProfile(): Profile {
  try {
    const p = JSON.parse(
      localStorage.getItem(PROFILE_KEY) ?? localStorage.getItem(LEGACY_PROFILE_KEY) ?? 'null',
    );
    const profile = {
      name: p?.name ?? localStorage.getItem('deki-nickname') ?? '',
      avatar: p?.avatar ?? 'preset:0',
    };
    if (profile.name) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return profile;
  } catch {
    return { name: '', avatar: 'preset:0' };
  }
}
export function saveProfile(p: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  localStorage.setItem(LEGACY_PROFILE_KEY, JSON.stringify(p));
  localStorage.setItem('deki-nickname', p.name);
}
const icons = [UserRound, VenetianMask, Crown, Ghost, Fish, Flame];
export function AvatarArt({ avatar }: { avatar?: string }) {
  if (avatar?.startsWith('data:image/jpeg;base64,')) return <img src={avatar} alt="" />;
  const Icon = icons[Number(avatar?.split(':')[1]) % icons.length] ?? UserRound;
  return <Icon aria-hidden="true" />;
}
export function ProfileEditor({
  initial,
  onSave,
}: {
  initial: Profile;
  onSave: (p: Profile) => Promise<void>;
}) {
  const [name, setName] = useState(initial.name),
    [avatar, setAvatar] = useState(initial.avatar),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  const photo = async (file?: File) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      if (!file.type.startsWith('image/') || file.size > 15 * 1024 * 1024)
        throw new Error('Choose an image smaller than 15 MB.');
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 160;
      const ctx = canvas.getContext('2d')!;
      const side = Math.min(bitmap.width, bitmap.height);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, 160, 160);
      ctx.drawImage(
        bitmap,
        (bitmap.width - side) / 2,
        (bitmap.height - side) / 2,
        side,
        side,
        0,
        0,
        160,
        160,
      );
      bitmap.close();
      const data = canvas.toDataURL('image/jpeg', 0.78);
      if (data.length > 48000) throw new Error('Try a simpler or smaller photo.');
      setAvatar(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open that photo.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="profile-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSave({ name: name.trim(), avatar });
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Could not save profile.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <span className="profile-preview">
        <AvatarArt avatar={avatar} />
      </span>
      <label htmlFor="profile-name">Your name</label>
      <input
        id="profile-name"
        value={name}
        maxLength={20}
        required
        pattern="[^\p{Cc}\p{Cf}]+"
        onChange={(e) => setName(e.target.value)}
        autoComplete="nickname"
        placeholder="What should we call you?"
      />
      <div className="avatar-options" role="group" aria-label="Choose an avatar">
        {icons.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Avatar ${i + 1}`}
            aria-pressed={avatar === `preset:${i}`}
            onClick={() => setAvatar(`preset:${i}`)}
          >
            <AvatarArt avatar={`preset:${i}`} />
          </button>
        ))}
      </div>
      <label className="photo-picker">
        <Upload size={18} /> Add yours
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            void photo(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      <p className="fine-print">Your avatar is visible to players in your lobby.</p>
      {error && <p role="alert">{error}</p>}
      <button className="button primary full" disabled={busy || !name.trim()}>
        {busy ? 'Saving…' : 'Save profile'}
      </button>
    </form>
  );
}
