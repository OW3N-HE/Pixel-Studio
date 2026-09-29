'use strict';

// A private, on-demand stdio child. Each Desktop instance owns its service;
// the Web/OpenRGB bridge owns a different instance. Neither owns PawnIO.
const path = require('node:path');
const fs = require('node:fs');
const { spawn, execFile } = require('node:child_process');
const net = require('node:net');

module.exports = function createTemperatureService(options = {}) {
  const executable = options.executable || path.join(__dirname, 'temperature', 'PixelStudio.Sensors.exe');
  const launch = options.spawn || spawn;
  const exists = options.exists || fs.existsSync;
  const now = options.now || Date.now;
  const idleMs = options.idleMs ?? 30000;
  const requestMs = options.requestMs ?? 15000;
  let child = null, pending = null, cached = null, closed = false;
  let idleTimer = null, killTimer = null, retryAt = 0;
  const channel = process.env.PIXEL_STUDIO_SENSOR_CHANNEL === 'Desktop' ? 'Desktop' : 'Shared';
  const pipeName = '\\\\.\\pipe\\PixelStudio.Sensors.v1.' + channel;
  let brokerPending = null, brokerRetryAt = 0, brokerSocket = null;
  let brokerState = 'starting';
  let lastBrokerSample = null;
  const brokerEnabled = process.platform === 'win32' && !options.spawn && !options.executable;
  const unavailable = status => ({ status, sampledAt: 0, cpu: null, gpu: null, cpuSensors: [], gpuSensors: [] });

  function settle(value) {
    if (!pending) return;
    clearTimeout(pending.timer);
    const resolve = pending.resolve;
    pending = null;
    resolve(value);
  }

  function retire(status = 'unavailable') {
    clearTimeout(idleTimer);
    idleTimer = null;
    cached = null;
    settle(unavailable(status));
    const owned = child;
    child = null;
    if (!owned) return;
    // Close only this child's private input. Never use process-name termination.
    try { owned.stdin.end('quit\n'); } catch { }
    const timer = setTimeout(() => { try { owned.kill(); } catch { } }, 2000);
    timer.unref?.();
    killTimer = timer;
    owned.once('exit', () => { clearTimeout(timer); if (killTimer === timer) killTimer = null; });
  }

  function normalizeReading(value) {
    if (!value || typeof value.id !== 'string' || value.id.length > 512 ||
        typeof value.temperature !== 'number' || !Number.isFinite(value.temperature) ||
        value.temperature < -50 || value.temperature > 150) return null;
    return {
      id: value.id,
      name: String(value.name || '').slice(0, 256),
      sensor: String(value.sensor || '').slice(0, 256),
      brand: ['amd', 'intel', 'nvidia'].includes(value.brand) ? value.brand : 'unknown',
      temperature: value.temperature
    };
  }

  function normalize(value) {
    if (!value || !['ready', 'partial', 'unavailable'].includes(value.status) ||
        !Number.isFinite(value.sampledAt) || value.sampledAt > now() + 1000 || now() - value.sampledAt > 5000)
      return unavailable('unavailable');
    const cpuSensors = Array.isArray(value.cpuSensors) ? value.cpuSensors.slice(0, 256).map(normalizeReading).filter(Boolean) : [];
    const gpuSensors = Array.isArray(value.gpuSensors) ? value.gpuSensors.slice(0, 256).map(normalizeReading).filter(Boolean) : [];
    const cpu = normalizeReading(value.cpu), gpu = normalizeReading(value.gpu);
    const diagnostics = { elevated: typeof value.diagnostics?.elevated === 'boolean' ? value.diagnostics.elevated : null };
    return { status: cpu && gpu ? 'ready' : cpu || gpu ? 'partial' : 'unavailable', sampledAt: value.sampledAt, cpu, gpu, cpuSensors, gpuSensors, diagnostics };
  }

  function readBroker(timeoutMs = requestMs) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(pipeName);
      brokerSocket = socket;
      let data = '', finished = false, deadlineTimer = null;
      const finish = (error, value) => {
        if (finished) return;
        finished = true;
        clearTimeout(deadlineTimer);
        if (brokerSocket === socket) brokerSocket = null;
        socket.destroy();
        error ? reject(error) : resolve(value);
      };
      socket.setEncoding('utf8');
      deadlineTimer = setTimeout(() => finish(new Error('Sensor service timed out')), Math.max(1, timeoutMs));
      socket.on('error', error => finish(error));
      socket.on('end', () => finish(new Error('Sensor service disconnected')));
      socket.on('data', chunk => {
        data += chunk;
        if (Buffer.byteLength(data, 'utf8') > 262144) return finish(new Error('Sensor response too large'));
        const end = data.indexOf('\n');
        if (end < 0) return;
        try { finish(null, normalize(JSON.parse(data.slice(0, end)))); }
        catch (error) { finish(error); }
      });
    });
  }

  async function sampleBroker() {
    // Bound the entire startup attempt, not each individual pipe connection.
    const deadline = now() + Math.min(requestMs, 12000);
    try { return await readBroker(Math.min(requestMs, 1500)); } catch { }
    if (closed) throw new Error('Closed');
    // Only start this fixed service. No executable path or command comes from IPC.
    const sc = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'sc.exe');
    const startCode = await new Promise(resolve => execFile(sc, ['start', 'PixelStudioSensors' + channel],
      {windowsHide:true, timeout:Math.max(1, Math.min(5000, deadline - now()))}, error => resolve(error ? error.code : 0)));
    if (startCode !== 0 && startCode !== 1056) {
      const error = new Error('Sensor service could not start');
      error.serviceCode = startCode;
      throw error;
    }
    for (let attempt = 0; attempt < 20 && !closed && now() < deadline; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 250));
      if (closed || now() >= deadline) break;
      try { return await readBroker(Math.max(1, deadline - now())); } catch { }
    }
    throw new Error('Sensor service is unavailable');
  }

  function start() {
    if (child) return true;
    if (!exists(executable)) return false;
    const owned = launch(executable, [], { cwd: path.dirname(executable), windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'pipe'] });
    child = owned;
    let buffer = '';
    owned.stdout.setEncoding('utf8');
    owned.stdout.on('data', chunk => {
      if (child !== owned) return;
      buffer += chunk;
      if (Buffer.byteLength(buffer, 'utf8') > 262144) { retryAt = now() + 5000; retire(); return; }
      let end;
      while ((end = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, end).trim(); buffer = buffer.slice(end + 1);
        if (!line || !pending) continue;
        try { cached = normalize(JSON.parse(line)); } catch { cached = unavailable('unavailable'); }
        settle(cached);
      }
    });
    // Drain stderr without logging potentially private device identifiers.
    owned.stderr.on('data', () => {});
    const failed = () => {
      if (child !== owned) return;
      retryAt = now() + 5000;
      retire();
    };
    owned.once('error', failed);
    owned.once('exit', failed);
    owned.stdin.on('error', failed);
    return true;
  }

  function touch() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => retire('idle'), idleMs);
    idleTimer.unref?.();
  }

  function sampleLocal() {
    if (closed) return Promise.resolve(unavailable('closed'));
    touch();
    if (cached && now() - cached.sampledAt >= 0 && now() - cached.sampledAt < 500) return Promise.resolve(cached);
    if (pending) return pending.promise;
    if (now() < retryAt) return Promise.resolve(unavailable('unavailable'));
    try { if (!start()) return Promise.resolve(unavailable('missing')); }
    catch { retryAt = now() + 5000; return Promise.resolve(unavailable('unavailable')); }
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    const timer = setTimeout(() => { retryAt = now() + 5000; retire('timeout'); }, requestMs);
    pending = { promise, resolve, timer };
    try { child.stdin.write('sample\n'); } catch { retryAt = now() + 5000; retire(); }
    return promise;
  }

  function withBrokerState(value) {
    return {...value, diagnostics:{...value.diagnostics, serviceState:brokerState}};
  }

  function sampleFallback() {
    return sampleLocal().then(withBrokerState);
  }

  function serviceStarting() {
    // Never relabel an old reading as fresh. A brief interruption may reuse
    // the original sample only within the same five-second freshness limit.
    if (lastBrokerSample && now() >= lastBrokerSample.sampledAt && now() - lastBrokerSample.sampledAt <= 5000)
      return withBrokerState(lastBrokerSample);
    return withBrokerState(unavailable('loading'));
  }

  function sample() {
    if (!brokerEnabled || closed) return sampleLocal();
    if (cached && now() - cached.sampledAt >= 0 && now() - cached.sampledAt < 500) return Promise.resolve(withBrokerState(cached));
    if (brokerPending) return brokerPending;
    if (now() < brokerRetryAt) return brokerState === 'starting'
      ? Promise.resolve(serviceStarting()) : sampleFallback();
    brokerPending = sampleBroker().then(value => {
      retire(); // Retire only our unprivileged fallback, never the shared service.
      cached = value;
      brokerState = 'ready';
      brokerRetryAt = 0;
      if (value.cpu) lastBrokerSample = value;
      return withBrokerState(value);
    }).catch(error => {
      brokerState = error.serviceCode === 5 ? 'denied'
        : error.serviceCode === 1060 ? 'missing'
        : error.serviceCode === 1058 ? 'disabled' : 'starting';
      // Cold starts and upgrade races should not pin the unprivileged fallback
      // for thirty seconds. Missing/disabled/denied services retain a backoff.
      brokerRetryAt = now() + (brokerState === 'starting' ? 2000 : 30000);
      // A service that is starting/reconnecting must not be replaced with an
      // unprivileged sampler: that turns a startup delay into a false hint
      // that the user's existing service authorization has been lost.
      return brokerState === 'starting' ? serviceStarting() : sampleFallback();
    }).finally(() => { brokerPending = null; });
    return brokerPending;
  }

  return Object.freeze({
    sample,
    get active() { return child !== null; },
    stop() { closed = true; brokerSocket?.destroy(new Error('Closed')); retire('closed'); }
  });
};
