import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir, mkdtemp, access, writeFile } from 'node:fs/promises';
import { join, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';

const root = fileURLToPath(new URL('../', import.meta.url));
const artifacts = join(root, '.artifacts');
await mkdir(artifacts, { recursive: true });
const candidates = [process.env.CHROME_PATH, '/usr/bin/google-chrome', '/usr/bin/chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'].filter(Boolean);
let executable;
for (const candidate of candidates) {
  try { await access(candidate); executable = candidate; break; } catch {}
}
assert.ok(executable, 'Chrome requis : renseigner CHROME_PATH');
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const relative = path.replace(/^\/timeline\//, '') || 'index.html';
  const file = resolve(root, 'public', relative);
  if (!path.startsWith('/timeline/') || !file.startsWith(resolve(root, 'public') + '/'.replace('/', process.platform === 'win32' ? '\\' : '/'))) {
    res.writeHead(404).end(); return;
  }
  try {
    const data = await readFile(file);
    res.setHeader('Content-Type', extname(file) === '.json' ? 'application/json' : 'text/html; charset=utf-8');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = await mkdtemp(join(artifacts, 'chrome-'));
const child = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run',
  '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'],
{ windowsHide: true, stdio: 'ignore' });
let childError;
child.on('error', error => { childError = error; });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (childError) throw childError;
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await pause(100); }
  }
  assert.ok(port, 'Chrome CDP indisponible');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await once(socket, 'open');
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails);
    const handler = pending.get(message.id);
    if (handler) { pending.delete(message.id); clearTimeout(handler.timer);
      message.error ? handler.reject(new Error(JSON.stringify(message.error))) : handler.resolve(message.result); }
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const requestId = ++id;
      const timer = setTimeout(() => { pending.delete(requestId); reject(new Error(`CDP timeout: ${method}`)); }, 10000);
      pending.set(requestId, { resolve, reject, timer });
      socket.send(JSON.stringify({ id: requestId, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return;
      await pause(50);
    }
    throw new Error(`Condition non remplie: ${expression}`);
  }
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Network.setBlockedURLs', { urls: ['https://*'] });
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const NativeDate = Date;
    window.Date = class extends NativeDate {
      constructor(...args) { super(...(args.length ? args : [2027, 0, 15, 12])); }
      static now() { return new NativeDate(2027, 0, 15, 12).getTime(); }
    };
  ` });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: `${origin}/timeline/` });
  await waitFor('!!document.getElementById("year2016")');
  await evaluate('document.getElementById("year2016").click()');
  await waitFor('document.querySelectorAll("#cards .card").length > 0');
  assert.equal(await evaluate('document.getElementById("timelineNow").textContent'), '15/01/2016');
  await evaluate('document.getElementById("monthSelect").value="11";document.getElementById("monthSelect").dispatchEvent(new Event("change"))');
  assert.ok(await evaluate('document.querySelector("#cards .card.hidden").getBoundingClientRect().height > 0'), 'Carte a reveler visible');
  await evaluate('document.querySelector("#cards .card.hidden").dispatchEvent(new KeyboardEvent("keydown",{key:"Enter"}))');
  assert.equal(await evaluate('localStorage.getItem("BZH2016_ENERGY_TOKENS")'), '4');
  assert.equal(await evaluate('document.getElementById("modalBackdrop").style.display'), 'flex');
  await evaluate('document.getElementById("modalClose").click()');
  await send('Page.reload');
  await waitFor('document.querySelectorAll("#cards .card").length > 0');
  assert.equal(await evaluate('document.getElementById("monthSelect").value'), '11');
  assert.equal(await evaluate('localStorage.getItem("BZH2016_ENERGY_TOKENS")'), '4');
  assert.equal(await evaluate('document.querySelectorAll("#cards .card[data-hidden=" + JSON.stringify("0") + "]").length'), 1);
  const desktop = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(artifacts, 'desktop.png'), Buffer.from(desktop.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  assert.ok(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Pas de debordement mobile');
  const mobile = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(join(artifacts, 'mobile.png'), Buffer.from(mobile.data, 'base64'));
  await evaluate('document.getElementById("resetBtn").click()');
  assert.equal(await evaluate('localStorage.getItem("BZH2016_ENERGY_TOKENS")'), '5');
  assert.deepEqual(exceptions, []);
  console.log('PASS: sous-chemin /timeline/, projection 2027, catalogue, revelation clavier, energie, persistance, reset, mobile, aucune exception JS.');
} finally {
  socket?.close();
  child.kill();
  server.closeAllConnections();
  server.close();
}
