/* Browser smoke test.  Usage:  node tests/browser.js
 *
 * Drives the real page in headless Chrome over file:// — deliberately the
 * strictest environment, since it proves the app needs no server and no module
 * loader. Optional: skips cleanly when puppeteer is not installed, so the
 * project itself stays dependency-free.
 *
 * Override the browser binary with CHROME_PATH if auto-detection misses it.
 * Screenshots land in tests/screenshots/ when SHOTS=1. */
const path = require('path');
const fs = require('fs');

let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (e) {
  console.log('puppeteer is not installed — skipping the browser test.');
  console.log('Install it with:  npm i -D puppeteer');
  process.exit(0);
}

const APP = 'file://' + path.join(__dirname, '..', 'index.html');
const SHOTS = path.join(__dirname, 'screenshots');
const TAKE_SHOTS = process.env.SHOTS === '1';

if (TAKE_SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

/* Puppeteer's bundled Chrome is not always usable (missing shared libraries in
 * slim containers), so fall back to any other Chromium on the machine. */
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
  return found || undefined;   // undefined => let puppeteer use its own download
}

async function shot(page, name) {
  if (TAKE_SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') });
}

const problems = [];
let checks = 0;

function check(name, cond, detail) {
  checks++;
  if (cond) console.log('  ok   ' + name);
  else {
    console.log('  FAIL ' + name + (detail ? ' — ' + detail : ''));
    problems.push(name + (detail ? ' — ' + detail : ''));
  }
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  page.on('requestfailed', r => consoleErrors.push('requestfailed: ' + r.url()));

  await page.goto(APP, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#words .word', { timeout: 5000 });

  console.log('\n— boot —');
  check('no console errors on load', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('words rendered', (await page.$$('#words .word')).length > 10);
  check('keyboard rendered', (await page.$$('.kb-key')).length > 40);

  // Read the actual target words so assertions are deterministic.
  const targets = await page.$$eval('#words .word', els =>
    els.slice(0, 4).map(e => e.textContent));

  console.log('\n— typing —');
  await page.click('#typing-area');
  await page.keyboard.type(targets[0], { delay: 12 });

  let letters = await page.$$eval('#words .word:first-child .letter',
    els => els.map(e => e.className));
  check('first word all correct',
    letters.every(c => c.includes('is-correct')), JSON.stringify(letters));

  const caret = await page.$eval('#caret', e => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return { left: parseFloat(e.style.left), w: r.width, h: r.height, display: cs.display };
  });
  check('caret advanced', caret.left > 0, JSON.stringify(caret));
  check('caret is actually visible',
    caret.w > 0 && caret.h > 4 && caret.display !== 'none', JSON.stringify(caret));

  // The on-screen keyboard is the main learning aid; it must not fade out
  // exactly when a beginner needs it.
  const kbVisible = await page.$eval('#keyboard-host',
    e => parseFloat(getComputedStyle(e).opacity));
  check('keyboard stays visible while typing', kbVisible > 0.9, 'opacity ' + kbVisible);

  console.log('\n— ctrl+backspace —');
  await page.keyboard.down('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.up('Control');

  letters = await page.$$eval('#words .word:first-child .letter',
    els => els.map(e => e.className));
  check('ctrl+backspace cleared the whole word',
    letters.every(c => !c.includes('is-correct') && !c.includes('is-wrong')),
    JSON.stringify(letters));

  // Retype, commit, then walk backwards over a wrong word.
  await page.keyboard.type(targets[0] + ' ', { delay: 12 });
  await page.keyboard.type('zzz', { delay: 12 });          // deliberately wrong word 2
  await page.keyboard.press('Space');
  await page.keyboard.type(targets[2].slice(0, 2), { delay: 12 });

  await page.keyboard.down('Control');
  await page.keyboard.press('Backspace');                   // clears the partial word 3
  await page.keyboard.press('Backspace');                   // steps back, clears wrong word 2
  await page.keyboard.up('Control');

  const word2 = await page.$$eval('#words .word:nth-child(2) .letter',
    els => els.map(e => e.className));
  check('ctrl+backspace walked back into the wrong word',
    word2.every(c => !c.includes('is-correct') && !c.includes('is-wrong')),
    JSON.stringify(word2));

  console.log('\n— live stats —');
  await new Promise(r => setTimeout(r, 1600));
  const live = await page.$eval('#live-wpm', e => e.textContent);
  const counter = await page.$eval('#live-counter', e => e.textContent);
  check('countdown is ticking', Number(counter) < 30 && Number(counter) > 25,
    'counter reads ' + counter);
  check('live wpm is showing', /\d+ wpm/.test(live), JSON.stringify(live));

  await shot(page, 'test');

  console.log('\n— finishing a test —');
  // Switch to a short words test and complete it to reach the results screen.
  await page.evaluate(() => {
    window.TT.settings.set('mode', 'words');
    window.TT.settings.set('wordsValue', 10);
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#words .word');
  await page.click('#typing-area');

  const all = await page.$$eval('#words .word', els => els.map(e => e.textContent));
  // Slow enough to clear the "too short to score" guard, which discards any run
  // under a second as an accident rather than a result.
  await page.keyboard.type(all.join(' '), { delay: 28 });
  await page.waitForSelector('#view-results.is-active', { timeout: 5000 });

  const wpm = await page.$eval('#res-wpm', e => e.textContent);
  const acc = await page.$eval('#res-acc', e => e.textContent);
  check('results screen shows a wpm', Number(wpm) > 0, 'got ' + wpm);
  check('perfect run scores 100%', acc === '100%', 'got ' + acc);
  const chartPainted = await page.$eval('#res-chart', c => {
    const ctx = c.getContext('2d');
    return ctx.getImageData(0, 0, c.width, c.height).data.some(v => v !== 0);
  });
  check('results chart painted', chartPainted);
  await shot(page, 'results');

  console.log('\n— views —');
  for (const view of ['lessons', 'stats', 'settings']) {
    await page.evaluate(v => { window.location.hash = '#/' + v; }, view);
    await page.waitForSelector('#view-' + view + '.is-active');
    await new Promise(r => setTimeout(r, 250));
    const visible = await page.$eval('#view-' + view,
      e => e.getBoundingClientRect().height > 100);
    check(view + ' view renders', visible);
    await shot(page, view);
  }

  const stacked = await page.$eval('#lesson-list .lesson', el => {
    const t = el.querySelector('.lesson-title').getBoundingClientRect();
    const d = el.querySelector('.lesson-desc').getBoundingClientRect();
    return d.top >= t.bottom - 1;
  });
  check('lesson title and description are on separate lines', stacked);

  const lessonCount = await page.$$eval('#lesson-list .lesson', e => e.length);
  check('lessons listed', lessonCount >= 15, 'got ' + lessonCount);
  const unlocked = await page.$$eval('#lesson-list .lesson:not([disabled])', e => e.length);
  check('only the first lesson is unlocked initially', unlocked === 1, 'got ' + unlocked);

  console.log('\n— spanish —');
  await page.evaluate(() => { window.location.hash = '#/test'; });
  await page.click('#lang-toggle');
  await new Promise(r => setTimeout(r, 300));
  const esWords = await page.$$eval('#words .word', els => els.map(e => e.textContent).join(' '));
  check('spanish words loaded', /[a-z]/.test(esWords) && esWords.length > 20);
  const layoutHasEnye = await page.$$eval('.kb-key .kb-main',
    els => els.some(e => e.textContent === 'ñ'));
  check('keyboard switched to the Latin American layout', layoutHasEnye);
  await shot(page, 'spanish');

  console.log('\n— accented characters —');
  // A long Spanish quote is guaranteed to contain accents and ñ. sendCharacter
  // delivers the already-composed character through an input event, which is
  // exactly what a dead-key sequence (´ then a) produces on a real keyboard.
  await page.evaluate(() => {
    window.TT.settings.set('mode', 'quote');
    window.TT.settings.set('quoteLength', 'long');
    window.location.hash = '#/test';
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#words .word');
  await page.click('#typing-area');

  const esTargets = await page.$$eval('#words .word', els => els.map(e => e.textContent));
  const accentIdx = esTargets.findIndex(w => /[áéíóúñ¿¡]/.test(w));
  check('spanish quote contains accented characters', accentIdx !== -1,
    esTargets.slice(0, 8).join(' '));

  if (accentIdx !== -1) {
    const upTo = esTargets.slice(0, accentIdx + 1).join(' ');
    for (const ch of upTo) await page.keyboard.sendCharacter(ch);

    const accWord = await page.$$eval(
      `#words .word:nth-child(${accentIdx + 1}) .letter`,
      els => els.map(e => e.className));
    check('accented word typed correctly',
      accWord.every(c => c.includes('is-correct')),
      esTargets[accentIdx] + ' -> ' + JSON.stringify(accWord));
  }

  console.log('\n— lesson run —');
  await page.evaluate(() => { window.location.hash = '#/lessons'; });
  await page.waitForSelector('#view-lessons.is-active');
  await page.click('#lesson-list .lesson:not([disabled])');
  await page.waitForSelector('#view-test.is-active');
  await new Promise(r => setTimeout(r, 200));

  const lessonWords = await page.$$eval('#words .word', els => els.map(e => e.textContent));
  check('lesson generated drill text', lessonWords.length > 5, 'got ' + lessonWords.length);
  const lessonLabel = await page.$eval('#quote-source', e => e.textContent);
  check('lesson name is shown', lessonLabel.length > 3, JSON.stringify(lessonLabel));

  await page.click('#typing-area');
  await page.keyboard.type(lessonWords.join(' '), { delay: 22 });
  await page.waitForSelector('#view-results.is-active', { timeout: 8000 });
  const lessonNote = await page.$eval('#res-note', e => e.textContent);
  check('lesson result reports pass/fail', /Lesson passed|Not passed/.test(lessonNote),
    JSON.stringify(lessonNote));

  await page.evaluate(() => { window.location.hash = '#/lessons'; });
  await page.waitForSelector('#view-lessons.is-active');
  await new Promise(r => setTimeout(r, 200));
  const unlockedNow = await page.$$eval('#lesson-list .lesson:not([disabled])', e => e.length);
  check('passing a lesson unlocks the next one', unlockedNow >= 2, 'got ' + unlockedNow);
  await shot(page, 'lessons-progress');

  console.log('\n— themes —');
  const before = await page.$eval('html', e => e.getAttribute('data-theme'));
  await page.click('#theme-cycle');
  const after = await page.$eval('html', e => e.getAttribute('data-theme'));
  check('theme cycles', before !== after, before + ' -> ' + after);

  console.log('\n— persistence —');
  // Reloading on a non-test route must still boot cleanly and restore settings.
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#view-lessons.is-active');
  check('reloading on a deep link restores that view', true);

  await page.evaluate(() => { window.location.hash = '#/test'; });
  await page.waitForSelector('#words .word', { timeout: 5000 });
  check('navigating back to the test starts a fresh one', true);

  const langAfterReload = await page.$eval('#lang-label', e => e.textContent);
  check('language survived a reload', langAfterReload === 'ES', 'got ' + langAfterReload);

  await page.evaluate(() => { window.location.hash = '#/stats'; });
  await page.waitForSelector('#view-stats.is-active');
  await new Promise(r => setTimeout(r, 250));
  const historyRows = await page.$$eval('#history-body tr td:not(.dim)', e => e.length);
  check('the earlier result survived the reload', historyRows >= 1, 'got ' + historyRows);
  const tilesText = await page.$eval('#stat-tiles', e => e.textContent);
  check('stat tiles show a test count', /tests taken/.test(tilesText));

  console.log('\n— final console check —');
  check('no console errors across the whole run', consoleErrors.length === 0,
    consoleErrors.slice(0, 5).join(' | '));

  await browser.close();

  console.log('\n' + (problems.length ? problems.length + ' of ' + checks + ' checks FAILED'
                                      : 'all ' + checks + ' checks passed'));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error('smoke test crashed:', e); process.exit(2); });
