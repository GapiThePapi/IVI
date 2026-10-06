export const CURRENT_APP_VERSION = '1.0.5';

export const UPDATE_MANIFEST_URL =
  'https://raw.githubusercontent.com/GapiThePapi/IVI/main/public/ivi-update.json';

export interface UpdateManifest {
  version: string;
  downloadUrl: string;
  notes?: string;
}

const versionParts = (value: string) =>
  value
    .trim()
    .replace(/^v/i, '')
    .split(/[.-]/)
    .slice(0, 3)
    .map((part) => Number.parseInt(part, 10) || 0);

export function isNewerVersion(latest: string, current = CURRENT_APP_VERSION): boolean {
  const next = versionParts(latest);
  const installed = versionParts(current);
  for (let index = 0; index < 3; index += 1) {
    if ((next[index] ?? 0) > (installed[index] ?? 0)) return true;
    if ((next[index] ?? 0) < (installed[index] ?? 0)) return false;
  }
  return false;
}

export async function checkForUpdate(
  fetcher: typeof fetch = fetch,
): Promise<UpdateManifest | null> {
  const response = await fetcher(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const candidate = (await response.json()) as Partial<UpdateManifest>;
  if (
    typeof candidate.version !== 'string' ||
    typeof candidate.downloadUrl !== 'string' ||
    !/^https:\/\//i.test(candidate.downloadUrl) ||
    !isNewerVersion(candidate.version)
  )
    return null;
  return {
    version: candidate.version,
    downloadUrl: candidate.downloadUrl,
    notes: typeof candidate.notes === 'string' ? candidate.notes : undefined,
  };
}
