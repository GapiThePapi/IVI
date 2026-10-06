import { useState } from 'react';
import { isAndroidApp, openConnection } from './platform';
export type Layout = 'portrait' | 'landscape';
export function readLayout(): Layout {
  try {
    return (localStorage.getItem('ivi-layout') ?? localStorage.getItem('decki-layout')) === 'landscape'
      ? 'landscape'
      : 'portrait';
  } catch {
    return 'portrait';
  }
}
export function applyLayout(layout: Layout) {
  document.documentElement.dataset.layout = layout;
  try {
    localStorage.setItem('ivi-layout', layout);
  } catch {
    /*optional*/
  }
  if (isAndroidApp) location.href = `deki://layout?mode=${layout}`;
}
export function LayoutSettings() {
  const [layout, setLayout] = useState(readLayout);
  return (
    <div className="layout-settings">
      <h3>Layout</h3>
      <div className="difficulty-options">
        {(['portrait', 'landscape'] as const).map((l) => (
          <button
            key={l}
            aria-pressed={layout === l}
            className={layout === l ? 'active' : ''}
            onClick={() => {
              setLayout(l);
              applyLayout(l);
            }}
          >
            {l === 'portrait' ? 'Portrait' : 'Landscape'}
          </button>
        ))}
      </div>
      {!isAndroidApp && layout === 'landscape' && <p>Rotate your phone for the wide table.</p>}
      {isAndroidApp && (
        <button className="button secondary full" onClick={openConnection}>
          Connection settings
        </button>
      )}
    </div>
  );
}
