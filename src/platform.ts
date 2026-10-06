export const isAndroidApp = navigator.userAgent.includes('DekiAndroid/');
export const openConnection = () => {
  window.location.href = 'deki://connection';
};
export function rememberedName(): string {
  try {
    return localStorage.getItem('deki-nickname') ?? '';
  } catch {
    return '';
  }
}
