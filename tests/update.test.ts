import { describe, expect, it, vi } from 'vitest';
import { checkForUpdate, isNewerVersion } from '../src/update';

describe('app updates', () => {
  it('compares semantic versions instead of comparing them as text', () => {
    expect(isNewerVersion('1.0.6', '1.0.5')).toBe(true);
    expect(isNewerVersion('1.10.0', '1.9.9')).toBe(true);
    expect(isNewerVersion('v2.0.0', '1.99.99')).toBe(true);
    expect(isNewerVersion('1.0.5', '1.0.5')).toBe(false);
    expect(isNewerVersion('1.0.4', '1.0.5')).toBe(false);
  });

  it('accepts only a newer release with a secure download URL', async () => {
    const fetcher = vi.fn(async () =>
      new Response(
        JSON.stringify({
          version: '1.0.6',
          downloadUrl: 'https://example.com/IVI.apk',
          notes: 'A tested update.',
        }),
      ),
    );
    await expect(checkForUpdate(fetcher as typeof fetch)).resolves.toMatchObject({
      version: '1.0.6',
      downloadUrl: 'https://example.com/IVI.apk',
    });
  });

  it('does not offer the installed release or an unsafe link', async () => {
    const installed = vi.fn(async () =>
      new Response(JSON.stringify({ version: '1.0.5', downloadUrl: 'https://example.com/app.apk' })),
    );
    const unsafe = vi.fn(async () =>
      new Response(JSON.stringify({ version: '9.0.0', downloadUrl: 'javascript:alert(1)' })),
    );
    await expect(checkForUpdate(installed as typeof fetch)).resolves.toBeNull();
    await expect(checkForUpdate(unsafe as typeof fetch)).resolves.toBeNull();
  });
});
