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

/* Defaults to the local files. Point APP_URL at a deployed site to verify a
 * release — a script path that only breaks over HTTP is invisible on file://. */
const APP = process.env.APP_URL || 'file://' + path.join(__dirname, '..', 'index.html');
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

  const fingerColours = await page.evaluate(() => {
    const colour = f => getComputedStyle(
      document.querySelector(".kb-key[data-finger='" + f + "']")).borderBottomColor;
    return { lp: colour('lp'), rp: colour('rp'), li: colour('li'), ri: colour('ri') };
  });
  check('finger colours are on by default and mirrored across hands',
    fingerColours.lp === fingerColours.rp &&
    fingerColours.li === fingerColours.ri &&
    fingerColours.lp !== fingerColours.li,
    JSON.stringify(fingerColours));

  // The layout setting overrides the language's default distribution.
  const spanishIso = await page.evaluate(() => {
    window.TT.settings.set('keyboardLayout', 'es');
    const keys = [...document.querySelectorAll('.kb-key .kb-main')].map(e => e.textContent);
    window.TT.settings.set('keyboardLayout', 'auto');
    return { hasEnye: keys.includes('ñ'), hasCedilla: keys.includes('ç') };
  });
  check('an explicit keyboard layout overrides the language default',
    spanishIso.hasEnye && spanishIso.hasCedilla, JSON.stringify(spanishIso));

  // Read the actual target words so assertions are deterministic.
  const targets = await page.$$eval('#words .word', els =>
    els.slice(0, 8).map(e => e.textContent));

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

  /* Where the caret *is* matters as much as that it moved. Checking only that
   * it advanced hid a double-counted offset that grew the further right the
   * caret went, so this walks across a whole line and compares the caret
   * against the character it should be sitting on. */
  async function caretDrift() {
    return page.evaluate(() => {
      const wordsEl = document.getElementById('words');
      const caretEl = document.getElementById('caret');
      // Rebuild the engine's idea of the caret: first word with untyped letters.
      let target = null;
      for (const word of wordsEl.children) {
        const untyped = [...word.children].find(
          l => !l.classList.contains('is-correct') && !l.classList.contains('is-wrong'));
        if (untyped) { target = untyped; break; }
      }
      if (!target) return null;
      const t = target.getBoundingClientRect();
      const c = caretEl.getBoundingClientRect();
      return {
        ch: target.textContent,
        dx: Math.round(c.left - t.left),
        // The caret is deliberately inset vertically to centre it in the line
        // box, so the meaningful question is whether it stays inside that box.
        insideLine: c.top >= t.top - 2 && c.bottom <= t.bottom + 2
      };
    });
  }

  // Disable the caret's easing so measurements are not caught mid-transition.
  await page.addStyleTag({ content: '.caret { transition: none !important; }' });

  // Each word is committed with a trailing space, so the caret is always parked
  // on the next word's first letter — which is what caretDrift() looks for.
  let worstDx = 0;
  let alwaysInLine = true;
  for (let i = 1; i < 5; i++) {
    await page.keyboard.type(' ' + targets[i] + ' ', { delay: 12 });
    await new Promise(r => setTimeout(r, 60));
    const d = await caretDrift();
    if (!d) continue;
    worstDx = Math.max(worstDx, Math.abs(d.dx));
    alwaysInLine = alwaysInLine && d.insideLine;
  }
  check('caret sits on the character it points at across a line',
    worstDx <= 2, 'worst horizontal drift ' + worstDx + 'px');
  check('caret stays within the line box', alwaysInLine);

  // The on-screen keyboard is the main learning aid; it must not fade out
  // exactly when a beginner needs it.
  const kbVisible = await page.$eval('#keyboard-host',
    e => parseFloat(getComputedStyle(e).opacity));
  check('keyboard stays visible while typing', kbVisible > 0.9, 'opacity ' + kbVisible);

  console.log('\n— caps lock —');
  /* Puppeteer's key map has no Caps Lock modifier, so drive the handler with a
   * synthetic event carrying the modifier state a real keypress would report. */
  const capsOn = await page.evaluate(() => {
    const e = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    Object.defineProperty(e, 'getModifierState', { value: k => k === 'CapsLock' });
    document.dispatchEvent(e);
    const el = document.getElementById('caps-alert');
    return { hidden: el.hidden, text: document.getElementById('caps-alert-text').textContent };
  });
  check('caps lock warning appears', capsOn.hidden === false, JSON.stringify(capsOn));
  check('caps lock warning is in English', capsOn.text === 'caps lock is on', capsOn.text);

  await new Promise(r => setTimeout(r, 260));   // let the entry animation settle
  const capsAligned = await page.evaluate(() => {
    const a = document.getElementById('caps-alert').getBoundingClientRect();
    const w = document.getElementById('words').getBoundingClientRect();
    return Math.round(a.left - w.left);
  });
  check('caps lock warning aligns with the text column',
    Math.abs(capsAligned) <= 2, 'offset ' + capsAligned + 'px');

  const capsOff = await page.evaluate(() => {
    const e = new KeyboardEvent('keyup', { key: 'a', bubbles: true });
    Object.defineProperty(e, 'getModifierState', { value: () => false });
    document.dispatchEvent(e);
    return document.getElementById('caps-alert').hidden;
  });
  check('caps lock warning clears again', capsOff === true);

  console.log('\n— ctrl+backspace —');
  // Restart so these checks run against a clean test rather than whatever the
  // caret-tracking loop above left behind.
  await page.keyboard.press('Tab');
  await new Promise(r => setTimeout(r, 150));
  const fresh = await page.$$eval('#words .word', els =>
    els.slice(0, 4).map(e => e.textContent));

  await page.keyboard.type(fresh[0], { delay: 12 });
  await page.keyboard.down('Control');
  await page.keyboard.press('Backspace');
  await page.keyboard.up('Control');

  letters = await page.$$eval('#words .word:first-child .letter',
    els => els.map(e => e.className));
  check('ctrl+backspace cleared the whole word',
    letters.every(c => !c.includes('is-correct') && !c.includes('is-wrong')),
    JSON.stringify(letters));

  // Retype, commit, then walk backwards over a wrong word.
  await page.keyboard.type(fresh[0] + ' ', { delay: 12 });
  await page.keyboard.type('zzz', { delay: 12 });          // deliberately wrong word 2
  await page.keyboard.press('Space');
  await page.keyboard.type(fresh[2].slice(0, 2), { delay: 12 });

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

  console.log('\n— endless modes —');
  // Time and zen tests must never run out of words. The buffer starts at 60 and
  // tops up once fewer than 25 remain, so typing ~40 words has to grow it.
  await page.evaluate(() => {
    window.TT.settings.set('mode', 'time');
    window.TT.settings.set('timeValue', 120);
    window.location.hash = '#/test';
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#words .word');

  const initialCount = await page.$$eval('#words .word', e => e.length);
  await page.click('#typing-area');
  const first40 = await page.$$eval('#words .word',
    els => els.slice(0, 40).map(e => e.textContent));
  await page.keyboard.type(first40.join(' ') + ' ', { delay: 3 });

  const grownCount = await page.$$eval('#words .word', e => e.length);
  check('time mode tops up its word buffer',
    grownCount > initialCount, initialCount + ' -> ' + grownCount);
  const stillRunning = await page.$eval('#view-test',
    e => e.classList.contains('is-active'));
  check('time mode does not self-complete', stillRunning);

  console.log('\n— chart canvas stability —');
  /* The results chart used to be drawn while its view was hidden; the sizing
   * fallback then re-multiplied the backing store by devicePixelRatio on every
   * test, growing the canvas exponentially until the browser killed it — a
   * white sad-face box instead of a chart, but only on high-DPI screens and
   * only after enough tests in a row. Simulate exactly that. */
  const chartGrowth = await page.evaluate(() => {
    const c = document.getElementById('res-chart');   // hidden: the test view is active
    Object.defineProperty(window, 'devicePixelRatio', { value: 2, configurable: true });
    const series = [
      { second: 1, wpm: 50, raw: 55, errors: 0 },
      { second: 2, wpm: 60, raw: 62, errors: 1 }
    ];
    window.TT.chart.results(c, series);
    const first = c.width;
    for (let i = 0; i < 10; i++) window.TT.chart.results(c, series);
    const after = c.width;
    Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
    return { first, after };
  });
  check('redrawing a hidden chart never grows the canvas',
    chartGrowth.after === chartGrowth.first && chartGrowth.after <= 8192,
    JSON.stringify(chartGrowth));

  console.log('\n— hardest-words drill —');
  // Seed a word history directly: typing enough real tests to rank 20 words
  // would take minutes, and the recording path is covered by the unit tests.
  // Only dictionary words may rank, so the seeds come from the real word list.
  const seedSets = await page.evaluate(() => {
    const dict = window.TT.data.words.en;
    const fast = dict.slice(0, 15);
    const slow = dict.slice(15, 30);
    const map = {};
    // Per keystroke: ~150ms for the fast set, ~900ms for the slow set.
    fast.forEach(w => {
      const u = 4 * (w.length + 1);
      map[w] = { n: 4, ms: u * 150, u: u, best: 150 * (w.length + 1), err: 0 };
    });
    slow.forEach(w => {
      const u = 4 * (w.length + 1);
      map[w] = { n: 4, ms: u * 900, u: u, best: 900 * (w.length + 1), err: 0 };
    });
    // Letter-chunk debris, as an old finger drill would have recorded it: the
    // slowest entry of all, but not a word — it must never surface.
    map['fjjf'] = { n: 6, ms: 6 * 5 * 1800, u: 6 * 5, best: 5 * 1800, err: 0 };
    window.TT.storage.write('wordstats', { en: map });
    window.TT.settings.set('lang', 'en');
    window.TT.settings.set('drillSize', 10);
    window.TT.settings.set('mode', 'hardest');
    window.location.hash = '#/test';
    return { fast, slow };
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#words .word');

  const drillPanelShown = await page.$eval('#drill-panel', e => !e.hidden);
  check('drill panel is shown', drillPanelShown);

  const chosen = await page.$$eval('#drill-words .drill-word b', e => e.map(x => x.textContent));
  check('drill picks the configured number of words', chosen.length === 10, 'got ' + chosen.length);
  check('drill picks the slowest words',
    chosen.every(w => seedSets.slow.indexOf(w) !== -1), chosen.join(' '));
  check('letter chunks never surface as drill words',
    chosen.indexOf('fjjf') === -1, chosen.join(' '));

  const drillWords = await page.$$eval('#words .word', e => e.map(x => x.textContent));
  check('the test text is drawn from the drill set',
    drillWords.every(w => chosen.indexOf(w) !== -1), drillWords.slice(0, 6).join(' '));
  check('drill repeats the set rather than listing it once',
    drillWords.length > chosen.length, drillWords.length + ' vs ' + chosen.length);

  /* The whole point: getting faster must not silently swap words out of the
   * set mid-session, or you could never finish practising anything. */
  await page.evaluate(slowWords => {
    const store = window.TT.storage.read('wordstats', {});
    slowWords.forEach(w => {
      const u = 40 * (w.length + 1);
      // Now faster than the "fast" set's 150ms per keystroke.
      store.en[w] = { n: 40, ms: u * 100, u: u, best: 100 * (w.length + 1), err: 0 };
    });
    window.TT.storage.write('wordstats', store);
  }, seedSets.slow);
  await page.click('#restart-btn');
  await new Promise(r => setTimeout(r, 200));
  const afterImproving = await page.$$eval('#drill-words .drill-word b',
    e => e.map(x => x.textContent));
  check('the drill set stays frozen even after those words get faster',
    JSON.stringify(afterImproving) === JSON.stringify(chosen),
    'was ' + chosen.join(',') + ' now ' + afterImproving.join(','));
  check('improved words are marked',
    (await page.$$('#drill-words .drill-word.is-improved')).length > 0);

  // But an explicit re-pick must react to the new rankings.
  await page.click('#drill-repick');
  await new Promise(r => setTimeout(r, 200));
  const afterRepick = await page.$$eval('#drill-words .drill-word b',
    e => e.map(x => x.textContent));
  check('picking a new set does react to the new rankings',
    afterRepick.some(w => seedSets.fast.indexOf(w) !== -1), afterRepick.join(' '));

  await shot(page, 'drill');

  // With no history at all the mode must explain itself, not break.
  await page.evaluate(() => {
    window.TT.storage.remove('wordstats');
    window.location.hash = '#/test';
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#words .word');
  const emptyShown = await page.$eval('#drill-empty', e => !e.hidden && e.textContent.length > 30);
  check('with no history the drill explains what to do', emptyShown);
  const stillTypeable = await page.$$eval('#words .word', e => e.length);
  check('and still gives you something to type', stillTypeable > 5, 'got ' + stillTypeable);

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

  // The stats tables live in clickable cards; opening one must reveal content.
  await page.evaluate(() => { window.location.hash = '#/stats'; });
  await page.waitForSelector('#view-stats.is-active');
  await new Promise(r => setTimeout(r, 250));
  const statCards = await page.evaluate(() => {
    const out = {};
    for (const id of ['card-slow-words', 'card-slow-patterns', 'card-slow-lessons', 'card-history']) {
      const d = document.getElementById(id);
      d.querySelector('summary').click();
      out[id] = d.open && d.querySelectorAll('tbody tr').length > 0;
    }
    return out;
  });
  check('all four stat cards open with content',
    Object.values(statCards).every(Boolean), JSON.stringify(statCards));

  // The cards double as launch pads for practice.
  await page.click('#practice-slow-words');
  await page.waitForSelector('#view-test.is-active');
  const cardDrillMode = await page.evaluate(() => window.TT.settings.get('mode'));
  check('slowest-words card launches the hardest-words drill', cardDrillMode === 'hardest',
    'mode is ' + cardDrillMode);

  await page.evaluate(() => { window.location.hash = '#/stats'; });
  await page.waitForSelector('#view-stats.is-active');
  await page.click('#practice-slow-patterns');
  await page.waitForSelector('#view-test.is-active');
  await new Promise(r => setTimeout(r, 200));
  const cardLesson = await page.$eval('#quote-source', e => e.textContent);
  check('slowest-patterns card launches the slowest-combinations lesson',
    /slowest combinations/i.test(cardLesson), 'running "' + cardLesson + '"');

  await page.evaluate(() => { window.location.hash = '#/lessons'; });
  await page.waitForSelector('#view-lessons.is-active');
  await new Promise(r => setTimeout(r, 200));

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

  // Fixed content (lessons, quotes) compares against earlier runs of itself.
  const prevLine = await page.$eval('#res-prev', e => ({ hidden: e.hidden, text: e.textContent }));
  check('fixed content shows a previous-runs line',
    !prevLine.hidden && /Best \d+ wpm · runs:/.test(prevLine.text), JSON.stringify(prevLine));

  // A passed lesson's "next" must advance the track, not replay the lesson.
  const expectNext = await page.evaluate(() =>
    window.TT.data.lessons[window.TT.settings.get('lang')][1].title);
  const againLabel = await page.$eval('#res-again-label', e => e.textContent);
  check('the next button is relabelled for the next lesson',
    againLabel === 'next lesson', 'label reads "' + againLabel + '"');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#view-test.is-active');
  await new Promise(r => setTimeout(r, 200));
  const nowRunning = await page.$eval('#quote-source', e => e.textContent);
  check('enter on a passed lesson starts the next lesson',
    nowRunning === expectNext, 'running "' + nowRunning + '", expected "' + expectNext + '"');

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
  // Refreshing mid-test must bring back the same text, not a fresh draw.
  await page.evaluate(() => { window.location.hash = '#/test'; });
  await page.waitForSelector('#view-test.is-active');
  await new Promise(r => setTimeout(r, 300));
  const textBefore = await page.$$eval('#words .word', els => els.map(e => e.textContent).join(' '));
  await page.reload({ waitUntil: 'networkidle0' });
  await page.waitForSelector('#words .word');
  const textAfter = await page.$$eval('#words .word', els => els.map(e => e.textContent).join(' '));
  check('refreshing brings back the same test text', textAfter === textBefore,
    'before "' + textBefore.slice(0, 40) + '…", after "' + textAfter.slice(0, 40) + '…"');

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

  console.log('\n— offline (service worker) —');
  if (!APP.startsWith('http')) {
    console.log('  (skipped over file:// — service workers need http; run with APP_URL=http://…)');
  } else {
    await page.evaluate(() => { window.location.hash = '#/test'; });
    await page.waitForSelector('#words .word');
    // ready resolves once the worker is active, and activation only follows a
    // completed install, so the precache is guaranteed to be populated.
    await page.evaluate(() => navigator.serviceWorker.ready);

    const errsBefore = consoleErrors.length;
    await page.setOfflineMode(true);
    await page.reload({ waitUntil: 'load' });
    let offlineWords = 0;
    try {
      await page.waitForSelector('#words .word', { timeout: 5000 });
      offlineWords = (await page.$$('#words .word')).length;
    } catch (e) { /* fall through to the check below */ }
    check('the app loads and renders with no network', offlineWords > 5,
      'got ' + offlineWords + ' words offline');
    await page.setOfflineMode(false);

    // The worker's background revalidation is expected to fail while offline;
    // drop those entries so the final console check stays meaningful.
    for (let i = consoleErrors.length - 1; i >= errsBefore; i--) {
      if (consoleErrors[i].startsWith('requestfailed:')) consoleErrors.splice(i, 1);
    }
  }

  console.log('\n— final console check —');
  check('no console errors across the whole run', consoleErrors.length === 0,
    consoleErrors.slice(0, 5).join(' | '));

  await browser.close();

  console.log('\n' + (problems.length ? problems.length + ' of ' + checks + ' checks FAILED'
                                      : 'all ' + checks + ' checks passed'));
  process.exit(problems.length ? 1 : 0);
})().catch(e => { console.error('smoke test crashed:', e); process.exit(2); });
