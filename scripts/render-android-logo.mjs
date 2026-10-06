import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const svg = fs.readFileSync(path.join(root, 'public', 'assets', 'ivi-logo.svg'), 'utf8');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await page.setContent(
    `<style>*{box-sizing:border-box}html,body{margin:0;width:512px;height:512px;background:transparent}img{display:block;width:512px;height:512px;object-fit:contain}</style><img alt="" src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}">`,
  );
  await page.locator('img').screenshot({
    path: path.join(root, 'android', 'res', 'drawable-nodpi', 'brand_logo.png'),
    omitBackground: true,
  });
} finally {
  await browser.close();
}
