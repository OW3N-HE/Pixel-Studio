'use strict';

// Local stdio adapter. The existing web app remains the animation source.
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const { spawn, execFile } = require('node:child_process');
const { Worker } = require('node:worker_threads');
const { performance } = require('node:perf_hooks');

const projectArg = process.argv.indexOf('--project');
const root = path.resolve(projectArg >= 0 ? process.argv[projectArg + 1] : path.join(__dirname, '..'));
const origin = 'http://127.0.0.1:8766';
let renderer;
let modes;
let mappings;
let linearMapping;
let config;
let token = '';
let sessionId = null;
let usbWorker = null;
let startAbort = null;
let exiting = false;
let lastPing = Date.now();
const parentPid = process.ppid;
let previewTimer;
let statsTimer;
let watchdog;
let statsBusy = false;
let outputBlocked = false;
const pendingOutput = new Map();
let queue = Promise.resolve();
let revision = 0;
const epoch = performance.now();

function output(message, disposable = false) {
    if (process.stdout.destroyed) return;
    if (outputBlocked || process.stdout.writableLength > 1024 * 1024) {
        // UI backpressure must never stop the LED playback worker. Frames and
        // statistics are replaceable; retain the latest control state instead.
        if (disposable) return;
        const key = message.type + ':' + (message.op || '');
        pendingOutput.set(key, message);
        if (pendingOutput.size > 128) pendingOutput.delete(pendingOutput.keys().next().value);
        return;
    }
    const line = JSON.stringify(message) + '\n';
    if (!process.stdout.write(line)) outputBlocked = true;
}
process.stdout.on('drain', () => {
    outputBlocked = false;
    for (const [key, message] of pendingOutput) {
        pendingOutput.delete(key);
        output(message);
        if (outputBlocked) break;
    }
});
process.stdout.on('error', () => { void shutdown('OpenRGB output pipe closed'); });

function decode(text) {
    return text.replace(/<[^>]*>/g, '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
function options(html, id) {
    const select = html.match(new RegExp('<select\\b[^>]*\\bid=["\\x27]' + id + '["\\x27][^>]*>([\\s\\S]*?)<\\/select>', 'i'));
    if (!select) throw new Error('Missing shared animation control: ' + id);
    return [...select[1].matchAll(/<option\b[^>]*\bvalue=["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi)]
        .map(match => ({ value: decode(match[1]), title: decode(match[2]) }));
}
function number(value, min, max, integer = false) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
        throw new Error('Invalid numeric configuration.');
    }
    return n;
}
function configuration(data) {
    const c = { ...config, ...data };
    c.w = number(c.w, 1, 128, true);
    c.h = number(c.h, 1, 128, true);
    if (c.w * c.h > 4096) throw new Error('The screen must not exceed 4096 pixels.');
    if (!modes.some(mode => mode.id === c.mode)) throw new Error('Unknown animation.');
    if (!mappings.some(mapping => mapping.value === c.mapping)) throw new Error('Unknown pixel mapping.');
    if (!['rounded', 'classic', 'segment'].includes(c.clockFont)) throw new Error('Unknown clock font.');
    if (!['original', 'mint', 'amber', 'ice', 'rose', 'violet'].includes(c.clockPalette) && !/^custom:(#[0-9a-f]{6}):(#[0-9a-f]{6}):(#[0-9a-f]{6})$/i.test(c.clockPalette)) throw new Error('Unknown animation palette.');
    c.fps = number(c.fps, 1, 60, true);
    c.speed = number(c.speed, 0.05, 8);
    c.brightness = number(c.brightness, 0, 255, true);
    c.transport = c.transport === 'usb' ? 'usb' : 'ddp';
    c.serialPort = String(c.serialPort || 'COM5').trim().toUpperCase();
    if (c.transport === 'usb' && !/^COM\d+$/.test(c.serialPort)) {
        throw new Error('Enter a Windows serial port such as COM5.');
    }
    c.host = String(c.host || '').trim();
    if (c.transport === 'ddp') {
        const parts = c.host.split('.');
        if (parts.length !== 4 || parts.some(v => !/^\d{1,3}$/.test(v) || Number(v) > 255)) {
            throw new Error('Enter the WLED IPv4 address without http:// or a port.');
        }
        const [a, b] = parts.map(Number);
        if (!(a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31))) {
            throw new Error('Only private LAN WLED addresses are supported.');
        }
    }
    c.match = c.match !== false;
    c.gamma = number(c.gamma ?? 2.8, 1, 4);
    if (c.transport === 'usb') {
        const gain = Math.pow(c.brightness / 255, 2.2);
        const exponent = c.match ? 1 / c.gamma : 1;
        c.lut = Array.from({ length: 256 }, (_, value) => Math.round(255 * Math.pow(value / 255, exponent) * gain));
    } else delete c.lut;
    return c;
}
function describeError(error) {
    if (error && error.name === 'AbortError') return 'Operation cancelled.';
    return error && error.message ? error.message : String(error);
}
async function request(route, { method = 'GET', data, timeout = 6500, signal, raw = false } = {}) {
    const timeoutSignal = AbortSignal.timeout(timeout);
    const response = await fetch(origin + route, {
        method,
        redirect: 'error',
        headers: {
            Origin: origin,
            ...(raw ? {} : { 'X-Pixel-Token': token }),
            ...(data === undefined ? {} : { 'Content-Type': 'application/json' })
        },
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal
    });
    // All responses come from the existing loopback bridge, never from a remote URL.
    const body = await response.text();
    if (body.length > 4 * 1024 * 1024) throw new Error('Unexpectedly large local bridge response.');
    if (raw) {
        if (!response.ok) throw new Error('Local bridge HTTP ' + response.status);
        return body;
    }
    let result;
    try { result = JSON.parse(body); } catch { throw new Error('The local bridge returned a non-JSON response.'); }
    if (!response.ok || result.ok === false || result.error) {
        const error = new Error(result.error || result.message || ('Local bridge HTTP ' + response.status));
        error.status = response.status;
        throw error;
    }
    return result;
}
async function discoverBridge(signal) {
    const html = await request('/', { raw: true, timeout: 1800, signal });
    const tag = (html.match(/<meta\b[^>]*\bname=["']pixel-bridge-token["'][^>]*>/i) || [])[0];
    const found = tag && tag.match(/\bcontent=["']([^"']+)["']/i);
    if (!found) throw new Error('Port 8766 is not serving the expected Pixel Studio bridge.');
    token = found[1];
}
async function ensureBridge(signal) {
    try {
        await discoverBridge(signal);
        return;
    } catch (error) {
        if (signal && signal.aborted) throw error;
        // Do not start a second service when another application owns the port.
        const code = error.cause && error.cause.code;
        if (code !== 'ECONNREFUSED') throw error;
    }
    const child = spawn(process.execPath, [path.join(root, 'pixel-ddp-bridge.cjs')], {
        cwd: root, detached: true, windowsHide: true, stdio: 'ignore'
    });
    let spawnError = null;
    child.on('error', error => { spawnError = error; });
    child.unref();
    for (let attempt = 0; attempt < 24; attempt++) {
        if (signal && signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        if (spawnError) throw spawnError;
        await new Promise(resolve => setTimeout(resolve, 200));
        try { await discoverBridge(signal); return; } catch (error) {
            if (attempt === 23) throw error;
        }
    }
}
function state() {
    output({ type: 'state', streaming: Boolean(sessionId || usbWorker), transport: usbWorker ? 'usb' : 'ddp' });
}
async function stopOwnSession() {
    if (usbWorker) {
        const worker = usbWorker;
        usbWorker = null;
        const exited = new Promise(resolve => worker.once('exit', resolve));
        worker.postMessage({ type: 'stop' });
        await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 1200))]);
        await worker.terminate().catch(() => {});
        state();
    }
    if (!sessionId) { state(); return; }
    const id = sessionId;
    try {
        await request('/api/stop', { method: 'POST', data: { id }, timeout: 6500 });
    } catch (error) {
        if (![404, 410].includes(error.status)) throw error;
    }
    if (sessionId === id) sessionId = null;
    state();
}
async function startUsb(next) {
    const worker = new Worker(path.join(root, 'pixel-stream-worker.cjs'), {
        workerData: { ...next, transport: 'usb' }
    });
    usbWorker = worker;
    await new Promise((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => finish(new Error('USB playback worker did not start in time.')), 12000);
        function finish(error) {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            if (error) reject(error); else resolve();
        }
        worker.on('message', message => {
            if (message.type === 'ready') finish();
            else if (message.type === 'stats') output({ type: 'stats', stats: message.stats }, true);
            else if (message.type === 'outputFrame') output(message, true);
            else if (message.type === 'error') finish(new Error(message.message || 'USB playback failed.'));
        });
        worker.once('error', finish);
        worker.once('exit', code => {
            if (!settled) finish(new Error('USB playback worker exited with code ' + code + '.'));
            if (usbWorker === worker) {
                usbWorker = null;
                state();
                if (!exiting && code) output({ type: 'warning', message: 'USB playback stopped unexpectedly.' });
            }
        });
    });
    state();
}
async function start(data) {
    const next = configuration(data);
    if (next.transport === 'usb') next.fps = Math.min(next.fps, 60);
    const abort = new AbortController();
    startAbort = abort;
    try {
        const sameGeometry = config && next.w === config.w && next.h === config.h;
        if (usbWorker && next.transport === 'usb' && config.transport === 'usb' && sameGeometry
            && next.serialPort === config.serialPort) {
            usbWorker.postMessage({ type: 'update', config: next });
            config = next;
            revision++;
            state();
            return;
        }
        if (sessionId && next.transport === 'ddp' && config.transport === 'ddp' && sameGeometry
            && next.host === config.host && next.match === config.match && next.gamma === config.gamma) {
            await request('/api/update', { method: 'POST', data: { id: sessionId, ...next }, timeout: 6500, signal: abort.signal });
            config = next;
            revision++;
            state();
            return;
        }
        await stopOwnSession();
        if (exiting || abort.signal.aborted) return;
        if (next.transport === 'usb') {
            // Adalight is a linear stream. Its frame dimensions must match the
            // matrix configured in WLED or every following row shifts sideways.
            // Auto-sync when the configured WLED remains reachable, while still
            // allowing genuinely offline USB-only use when it is not.
            try {
                await ensureBridge(abort.signal);
                const result = await request('/api/device?host=' + encodeURIComponent(next.host) + '&path=/json/info', {
                    timeout: 5000, signal: abort.signal
                });
                const info = result.info || (result.data && result.data.info) || result;
                const matrix = info.leds && info.leds.matrix;
                const w = Number(matrix && matrix.w);
                const h = Number(matrix && matrix.h);
                if (Number.isInteger(w) && Number.isInteger(h) && w > 0 && h > 0 && w * h <= 4096
                    && (w !== next.w || h !== next.h)) {
                    next.w = w;
                    next.h = h;
                    output({ type: 'device', w, h, count: info.leds.count, automatic: true });
                    output({ type: 'warning', message: 'USB frame size was matched to the WLED matrix: ' + w + ' x ' + h + '.' });
                }
            } catch (error) {
                if (abort.signal.aborted) throw error;
                output({ type: 'warning', message: 'Could not read WLED matrix size; USB will use the dimensions entered in the panel.' });
            }
            await startUsb(next);
            config = next;
            revision++;
            return;
        }
        await ensureBridge(abort.signal);
        if (exiting || abort.signal.aborted) return;
        const result = await request('/api/start', {
            method: 'POST', data: next, timeout: 25000, signal: abort.signal
        });
        if (!result.id) throw new Error('The bridge did not return a playback session.');
        sessionId = result.id;
        if (exiting || abort.signal.aborted) {
            await stopOwnSession();
            return;
        }
        config = next;
        revision++;
        // A successful stats read confirms ownership for the existing bridge.
        const stats = await request('/api/stats?id=' + encodeURIComponent(sessionId));
        state();
        output({ type: 'stats', ...stats });
    } catch (error) {
        if (usbWorker) {
            try { await stopOwnSession(); } catch { /* Worker termination is best-effort after a failed open. */ }
        }
        if (sessionId) {
            try { await stopOwnSession(); } catch { /* Retain the id so Stop can retry. */ }
        }
        state();
        throw error;
    } finally {
        if (startAbort === abort) startAbort = null;
    }
}
async function pollStats() {
    if (!sessionId || statsBusy || exiting) return;
    const id = sessionId;
    statsBusy = true;
    try {
        const stats = await request('/api/stats?id=' + encodeURIComponent(id), { timeout: 5000 });
        if (sessionId === id) output({ type: 'stats', ...stats }, true);
    } catch (error) {
        if (sessionId !== id || exiting) return;
        if ([404, 410].includes(error.status)) {
            sessionId = null;
            state();
        }
        output({ type: 'warning', message: 'Playback status: ' + describeError(error) }, true);
    } finally { statsBusy = false; }
}
function preview() {
    if (exiting || outputBlocked || !renderer) return;
    try {
        const rgb = renderer.render(config.mode, config.w, config.h,
            (performance.now() - epoch) / 1000 * config.speed, linearMapping, config.clockFont, config.clockPalette);
        output({ type: 'frame', w: config.w, h: config.h, rgb: Buffer.from(rgb).toString('base64'), revision }, true);
        if (sessionId) {
            const sent = renderer.render(config.mode, config.w, config.h,
                (performance.now() - epoch) / 1000 * config.speed, config.mapping, config.clockFont, config.clockPalette);
            output({ type: 'outputFrame', w: config.w, h: config.h, rgb: Buffer.from(sent).toString('base64'), transport: 'ddp' }, true);
        }
    } catch (error) {
        clearInterval(previewTimer);
        output({ type: 'error', op: 'preview', message: describeError(error) });
    }
}
async function thumbnails() {
    for (const mode of modes) {
        if (exiting) return;
        if (outputBlocked) await new Promise(resolve => setTimeout(resolve, 120));
        try {
            const isClock = /clock/i.test(mode.id);
            const rgb = renderer.render(mode.id, 15, 27, 1.8, linearMapping,
                isClock ? 'segment' : 'rounded', isClock ? 'ice' : 'mint');
            output({ type: 'thumbnail', mode: mode.id, w: 15, h: 27, rgb: Buffer.from(rgb).toString('base64') }, true);
        } catch { /* An individual thumbnail must not prevent library loading. */ }
        await new Promise(resolve => setImmediate(resolve));
    }
}
async function handle(message) {
    if (exiting) return;
    const { id, op, data = {} } = message;
    try {
        switch (op) {
        case 'configure':
            config = configuration(data);
            revision = Number.isInteger(id) ? id : revision + 1;
            preview();
            break;
        case 'start':
            await start(data);
            break;
        case 'stop':
            await stopOwnSession();
            break;
        case 'ports': {
            const script = "Get-CimInstance Win32_SerialPort -ErrorAction SilentlyContinue | ForEach-Object { $($_.DeviceID) + '|' + $($_.Name) }";
            const stdout = await new Promise((resolve, reject) => execFile('powershell.exe',
                ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true, timeout: 5000 },
                (error, value) => error ? reject(error) : resolve(String(value))));
            const ports = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean).map(line => {
                const separator = line.indexOf('|');
                return { id: (separator < 0 ? line : line.slice(0, separator)).trim().toUpperCase(),
                    name: (separator < 0 ? line : line.slice(separator + 1)).trim() };
            }).filter(port => /^COM\d+$/.test(port.id));
            output({ type: 'ports', ports });
            break;
        }
        case 'device': {
            const next = configuration({ ...config, transport: 'ddp', host: data.host });
            await ensureBridge();
            const result = await request('/api/device?host=' + encodeURIComponent(next.host) + '&path=/json/si');
            const info = result.info || (result.data && result.data.info) || result;
            const matrix = info.leds && info.leds.matrix;
            const w = Number(matrix && matrix.w);
            const h = Number(matrix && matrix.h);
            if (!Number.isInteger(w) || !Number.isInteger(h) || w < 1 || h < 1) {
                throw new Error('WLED did not report a 2D matrix. Enter the physical dimensions manually.');
            }
            if (w > 128 || h > 128 || w * h > 4096) throw new Error('Reported dimensions exceed this panel limit.');
            output({ type: 'device', w, h, count: info.leds.count });
            break;
        }
        case 'shutdown':
            await shutdown();
            return;
        default:
            throw new Error('Unknown local command.');
        }
        output({ type: 'result', id, op });
    } catch (error) {
        output({ type: 'error', id, op, message: describeError(error) });
    }
}
async function shutdown(reason = 'Shutdown requested') {
    if (exiting) return;
    exiting = true;
    process.stderr.write('[Pixel Studio] ' + reason + '\n');
    clearInterval(previewTimer);
    clearInterval(statsTimer);
    clearInterval(watchdog);
    if (startAbort) startAbort.abort();
    const deadline = setTimeout(() => process.exit(1), 7500);
    try {
        await queue.catch(() => {});
        await stopOwnSession();
    } catch (error) {
        output({ type: 'warning', message: 'Could not confirm playback stopped: ' + describeError(error) });
    } finally {
        clearTimeout(deadline);
        process.exit(0);
    }
}
try {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    renderer = require(path.join(root, 'pixel-headless-renderer.cjs'))();
    const titles = new Map(options(html, 'animationMode').map(option => [option.value, option.title]));
    modes = renderer.modes.filter(id => id !== 'file').map(id => ({ id, title: titles.get(id) || id }));
    mappings = options(html, 'mapping');
    if (!modes.length || !mappings.length) throw new Error('The shared library is empty.');
    linearMapping = (mappings.find(m => /row|行/i.test(m.value + m.title) && !/serp|snake|蛇/i.test(m.value + m.title))
        || mappings.find(m => !/serp|snake|蛇/i.test(m.value + m.title)) || mappings[0]).value;
    config = {
        mode: modes.some(m => m.id === 'portrait_fireflies') ? 'portrait_fireflies' : modes[0].id,
        w: 15, h: 27, brightness: 128, fps: 60, speed: 1, mapping: linearMapping,
        clockFont: 'rounded', clockPalette: 'mint', host: '192.168.1.100', match: true
    };
    output({ type: 'ready', modes, mappings, config });
    previewTimer = setInterval(preview, 1000 / 12);
    statsTimer = setInterval(() => { void pollStats(); }, 1000);
    watchdog = setInterval(() => {
        if (Date.now() - lastPing <= 12000 || exiting) return;
        // Windows' interactive move/resize loop can pause the Qt GUI timer.
        // A delayed GUI heartbeat is not evidence that OpenRGB has exited.
        // stdin EOF still handles normal closure; this check handles an orphan
        // without interrupting the independently running playback worker.
        try {
            process.kill(parentPid, 0);
        } catch (error) {
            if (error.code === 'ESRCH') void shutdown('OpenRGB parent process no longer exists');
            // EPERM means the parent exists but access is restricted.
        }
    }, 2500);
    const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
    input.on('line', line => {
        if (line.length > 16384) { output({ type: 'error', message: 'Local command is too large.' }); return; }
        let message;
        try { message = JSON.parse(line); } catch { output({ type: 'error', message: 'Invalid local command.' }); return; }
        if (!message || typeof message !== 'object') return;
        if (message.op === 'ping') { lastPing = Date.now(); return; }
        if (message.op === 'stop' || message.op === 'shutdown') {
            if (startAbort) startAbort.abort();
        }
        // Shutdown must not wait on a promise that contains itself.
        if (message.op === 'shutdown') { void shutdown(); return; }
        queue = queue.then(() => handle(message)).catch(error => {
            output({ type: 'error', message: describeError(error) });
        });
    });
    input.on('close', () => { void shutdown('OpenRGB input pipe closed'); });
    process.on('SIGINT', () => { void shutdown('SIGINT received'); });
    process.on('SIGTERM', () => { void shutdown('SIGTERM received'); });
    preview();
    void thumbnails();
} catch (error) {
    output({ type: 'fatal', message: describeError(error) });
    process.exitCode = 1;
}
