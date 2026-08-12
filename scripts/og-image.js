/* Regenerates og.png — the social preview card — from the real app.
 *
 * Usage:  node scripts/og-image.js
 *
 * The card is the app's own finger-coloured keyboard rendered under the brand
 * and tagline, screenshot at 1200x630 CSS pixels (2x device scale). Like the
 * browser smoke test this needs a Chromium; it reuses the same discovery:
 * puppeteer if installed, else CHROME_PATH, else any Chromium on the machine. */
'use strict';

const path = require('path');
const fs = require('fs');

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  try {
    puppeteer = require('puppeteer-core');
  } catch (e2) {
    console.log('puppeteer is not installed — run:  npm i -D puppeteer');
    process.exit(1);
  }
}

const APP = 'file://' + path.join(__dirname, '..', 'type', 'index.html');
const OUT = path.join(__dirname, '..', 'og.png');

function findBrowser() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const home = process.env.HOME || '';
  const candidates = [];
  const pw = path.join(home, '.cache', 'ms-playwright');
  if (fs.existsSync(pw)) {
    fs.readdirSync(pw)
      .filter(d => d.startsWith('chromium-'))
      .sort().reverse()
      .forEach(d => candidates.push(path.join(pw, d, 'chrome-linux', 'chrome')));
  }
  candidates.push('/usr/bin/chromium', '/usr/bin/google-chrome');
  const found = candidates.find(p => { try { return fs.existsSync(p); } catch (e) { return false; } });
  return found || undefined;
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  await page.goto(APP, { waitUntil: 'networkidle0' });
  await page.waitForSelector('.kb-key');

  await page.addStyleTag({ content: `
    body > *:not(main), main > *:not(.og-stage) { display: none !important; }
    body { overflow: hidden; }
    .og-head { text-align: center; font-family: var(--mono); margin: 1.7rem 0 0; }
    .og-head .brand-line { font-size: 3rem; color: var(--sub); letter-spacing: -0.02em; }
    .og-head .brand-line b { color: var(--text); }
    .og-head .kbd-ico { margin-right: 1rem; }
    .og-tagline {
      font-family: var(--mono); color: var(--sub); font-size: 1.26rem;
      text-align: center; margin: 0.8rem 0 1.5rem;
    }
    .og-tagline .dot { color: var(--main); margin: 0 0.55rem; }
    .kb { max-width: 1080px !important; gap: 0.4rem !important; }
    .kb-row { gap: 0.4rem !important; }
    .kb-key { min-height: 3.3rem !important; font-size: 1.1rem !important;
              border-radius: 9px !important; }
    .kb-shift, .kb-special { font-size: 0.78rem !important; }
  `});

  await page.evaluate(() => {
    // A clean stage of our own: brand, tagline, and the app's live keyboard
    // moved in — everything else on the page is hidden by the stylesheet.
    const stage = document.createElement('div');
    stage.className = 'og-stage';
    stage.innerHTML =
      '<div class="og-head"><div class="brand-line">' +
      '<span class="kbd-ico">⌨️</span>typing<b>trainer</b></div></div>' +
      '<div class="og-tagline">learn to type properly<span class="dot">·</span>' +
      'lessons, tests, stats<span class="dot">·</span>english + español' +
      '<span class="dot">·</span>free &amp; offline</div>';
    const host = document.getElementById('keyboard-host');
    stage.appendChild(host);
    document.querySelector('main').appendChild(stage);

    // Only the F key glows, the way the app hints the next key while typing.
    document.querySelectorAll('.kb-key.is-next').forEach(k => k.classList.remove('is-next'));
    const f = [...document.querySelectorAll('.kb-key')]
      .find(k => k.querySelector('.kb-main') && k.querySelector('.kb-main').textContent === 'f');
    if (f) f.classList.add('is-next');
  });

  await new Promise(r => setTimeout(r, 300));
  await page.screenshot({ path: OUT });
  await browser.close();
  console.log('wrote ' + OUT + ' (' + Math.round(fs.statSync(OUT).size / 1024) + ' KB)');
})().catch(e => { console.error('og image failed:', e); process.exit(2); });
