'use strict';

// A private background sampling loop. Each Desktop instance owns its service;
// the Web/OpenRGB bridge owns a different instance. Neither owns PawnIO.
const path = require('node:path');
const fs = require('node:fs');
const { spawn, execFile } = require('node:child_process');
const net = require('node:net');
const { performance } = require('node:perf_hooks');

module.exports = function createTemperatureService(options = {}) {
  const executable = options.executable || path.join(__dirname, 'temperature', 'PixelStudio.Sensors.exe');
  const launch = options.spawn || spawn;
  const exists = options.exists || fs.existsSync;
  const now = options.now || Date.now;
  // Only interval preferences have leases; sampling follows the owning process.
  const clientLeaseMs = options.idleMs ?? 30000;
  const requestMs = options.requestMs ?? 15000;
  let child = null, pending = null, cached = null, closed = false;
  let killTimer = null, retryAt = 0;
  const channel = process.env.PIXEL_STUDIO_SENSOR_CHANNEL === 'Desktop' ? 'Desktop' : 'Shared';
  const pipeName = '\\\\.\\pipe\\PixelStudio.Sensors.v1.' + channel;
  let brokerPending = null, brokerRetryAt = 0, brokerSocket = null;
  let brokerState = 'starting', brokerFailure = null, brokerDelay = null;
  const retryablePipeCodes = new Set(['PIPE_DISCONNECTED', 'EMPTY_RESPONSE', 'INCOMPLETE_RESPONSE', 'PIPE_BUSY', 'PIPE_MISSING']);
  const pipeMessages = {
    CONNECT_TIMEOUT:'Temperature service connection timed out.',
    READ_TIMEOUT:'Temperature service response timed out.',
    PIPE_DISCONNECTED:'Temperature service disconnected before a complete response.',
    EMPTY_RESPONSE:'Temperature service returned no response.',
    INCOMPLETE_RESPONSE:'Temperature service response was incomplete.',
    INVALID_RESPONSE:'Temperature service returned invalid JSON.',
    RESPONSE_TOO_LARGE:'Temperature service response was too large.',
    PIPE_BUSY:'Temperature service pipe is busy.',
    PIPE_MISSING:'Temperature service pipe is unavailable.',
    PIPE_ERROR:'Temperature service pipe failed.',
    SERVICE_START_FAILED:'Temperature service could not start.',
    CLOSED:'Temperature backend is closed.'
  };
  const brokerEnabled = process.platform === 'win32' && !options.spawn && !options.executable;
  const unavailable = status => ({ status, sampledAt: 0, cpu: null, gpu: null, cpuSensors: [], gpuSensors: [] });
  const samplingClients = new Map();
  let collecting = false, samplingBusy = false, samplingTimer = null, samplingGeneration = 0;
  let nextSampleAt = 0, sampleIntervalMs = 1000, published = null, lastAttemptAt = 0, lastReadDurationMs = 0;
  const validTimestamp = at => Number.isFinite(at) && at >= 0 && at <= now() + 1000;

  function settle(value) {
    if (!pending) return;
    clearTimeout(pending.timer);
    const resolve = pending.resolve;
    pending = null;
    resolve(value);
  }

  function retire(status = 'unavailable') {
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

  function normalizeReading(value, fallbackAt) {
    if (!value || typeof value.id !== 'string' || value.id.length > 512 ||
        typeof value.temperature !== 'number' || !Number.isFinite(value.temperature) ||
        value.temperature < -50 || value.temperature > 150) return null;
    const sampledAt = value.sampledAt === undefined ? fallbackAt : value.sampledAt;
    if (!validTimestamp(sampledAt)) return null;
    return {
      id: value.id,
      name: String(value.name || '').slice(0, 256),
      sensor: String(value.sensor || '').slice(0, 256),
      brand: ['amd', 'intel', 'nvidia'].includes(value.brand) ? value.brand : 'unknown',
      temperature: value.temperature,
      sampledAt
    };
  }

  function normalize(value) {
    if (!value || !['ready', 'partial', 'unavailable'].includes(value.status))
      return unavailable('unavailable');
    const cpuSensors = Array.isArray(value.cpuSensors) ? value.cpuSensors.slice(0, 256).map(r => normalizeReading(r, value.sampledAt)).filter(Boolean) : [];
    const gpuSensors = Array.isArray(value.gpuSensors) ? value.gpuSensors.slice(0, 256).map(r => normalizeReading(r, value.sampledAt)).filter(Boolean) : [];
    const cpu = normalizeReading(value.cpu, value.sampledAt), gpu = normalizeReading(value.gpu, value.sampledAt);
    const diagnostics = { elevated: typeof value.diagnostics?.elevated === 'boolean' ? value.diagnostics.elevated : null };
    for (const key of ['cpuUpdated', 'gpuUpdated']) if (typeof value.diagnostics?.[key] === 'boolean') diagnostics[key] = value.diagnostics[key];
    for (const key of ['attemptedAt', 'readDurationMs']) if (Number.isFinite(value.diagnostics?.[key])) diagnostics[key] = value.diagnostics[key];
    if (Array.isArray(value.diagnostics?.samplingErrors)) diagnostics.samplingErrors = value.diagnostics.samplingErrors.slice(0, 16).map(error => String(error).slice(0, 128));
    return { status: cpu && gpu ? 'ready' : cpu || gpu ? 'partial' : 'unavailable', sampledAt: Math.max(cpu?.sampledAt || 0, gpu?.sampledAt || 0), cpu, gpu, cpuSensors, gpuSensors, diagnostics };
  }

  function pipeFailure(code, transportCode) {
    const error = new Error(pipeMessages[code] || pipeMessages.PIPE_ERROR);
    error.brokerCode = code;
    if (typeof transportCode === 'string' && /^[A-Z0-9_]{1,32}$/.test(transportCode)) error.code = transportCode;
    return error;
  }

  function waitBroker(ms) {
    if (closed) return Promise.resolve(false);
    return new Promise(resolve => {
      const waiter = {timer:null, resolve};
      waiter.timer = setTimeout(() => {
        if (brokerDelay === waiter) brokerDelay = null;
        resolve(!closed);
      }, ms);
      brokerDelay = waiter;
    });
  }

  function cancelBrokerDelay() {
    const waiter = brokerDelay;
    brokerDelay = null;
    if (waiter) { clearTimeout(waiter.timer); waiter.resolve(false); }
  }

  function readBroker(timeoutMs = requestMs) {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection(pipeName);
      brokerSocket = socket;
      const deadline = now() + timeoutMs;
      let data = '', finished = false, connected = false, deadlineTimer = null;
      const finish = (error, value) => {
        if (finished) return;
        finished = true;
        clearTimeout(deadlineTimer);
        if (brokerSocket === socket) brokerSocket = null;
        if (error) error.brokerConnected = connected;
        socket.destroy();
        error ? reject(error) : resolve(value);
      };
      socket.setEncoding('utf8');
      deadlineTimer = setTimeout(() => finish(pipeFailure('CONNECT_TIMEOUT')), Math.max(1, Math.min(750, timeoutMs)));
      socket.once('connect', () => {
        connected = true;
        clearTimeout(deadlineTimer);
        deadlineTimer = setTimeout(() => finish(pipeFailure('READ_TIMEOUT')), Math.max(1, deadline - now()));
      });
      socket.on('error', error => {
        const code = ['EPIPE', 'ECONNRESET', 'ECONNABORTED'].includes(error.code) ? 'PIPE_DISCONNECTED'
          : error.code === 'EBUSY' ? 'PIPE_BUSY' : error.code === 'ENOENT' ? 'PIPE_MISSING' : 'PIPE_ERROR';
        finish(pipeFailure(code, error.code));
      });
      const disconnected = () => finish(pipeFailure(data.length ? 'INCOMPLETE_RESPONSE' : 'EMPTY_RESPONSE'));
      socket.on('end', disconnected);
      socket.on('close', disconnected);
      socket.on('data', chunk => {
        data += chunk;
        if (Buffer.byteLength(data, 'utf8') > 262144) return finish(pipeFailure('RESPONSE_TOO_LARGE'));
        const end = data.indexOf('\n');
        if (end < 0) return;
        try {
          const value = JSON.parse(data.slice(0, end).trim());
          if (!value || !['ready', 'partial', 'unavailable'].includes(value.status)) throw new Error('Invalid response');
          finish(null, normalize(value));
        } catch { finish(pipeFailure('INVALID_RESPONSE')); }
      });
    });
  }

  async function readBrokerResponse(timeoutMs) {
    const deadline = now() + timeoutMs;
    let connected = false;
    for (let attempt = 0; ; attempt++) {
      try { return await readBroker(Math.max(1, deadline - now())); }
      catch (error) {
        connected ||= !!error.brokerConnected;
        // A reconnect race must not turn a previously connected service into
        // a cold start or an unprivileged fallback.
        if (connected) error.brokerConnected = true;
        const delay = 50 * (attempt + 1);
        if (!connected || !retryablePipeCodes.has(error.brokerCode) || attempt >= 2 || deadline - now() <= delay) throw error;
        if (!(await waitBroker(delay))) throw pipeFailure('CLOSED');
      }
    }
  }

  async function sampleBroker() {
    // One deadline includes startup and the two bounded response retries.
    const deadline = now() + requestMs;
    try { return await readBrokerResponse(Math.max(1, deadline - now())); }
    catch (error) { if (error.brokerConnected) throw error; }
    if (closed) throw pipeFailure('CLOSED');
    const sc = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'sc.exe');
    const startCode = await new Promise(resolve => execFile(sc, ['start', 'PixelStudioSensors' + channel],
      {windowsHide:true, timeout:Math.max(1, Math.min(5000, deadline - now()))}, error => resolve(Number(error?.code || 0))));
    if (startCode !== 0 && startCode !== 1056) {
      const error = pipeFailure('SERVICE_START_FAILED');
      error.serviceCode = startCode;
      throw error;
    }
    for (let attempt = 0; attempt < 20 && !closed && now() < deadline; attempt++) {
      if (!(await waitBroker(250)) || now() >= deadline) break;
      try { return await readBrokerResponse(Math.max(1, deadline - now())); }
      catch (error) { if (error.brokerConnected) throw error; }
    }
    throw pipeFailure(closed ? 'CLOSED' : 'PIPE_MISSING');
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

  function sampleLocal() {
    if (closed) return Promise.resolve(unavailable('closed'));
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
    const diagnostics = {...value.diagnostics, serviceState:brokerState};
    if (brokerFailure) {
      diagnostics.serviceErrorCode = brokerFailure.code;
      if (brokerFailure.transportCode) diagnostics.serviceTransportCode = brokerFailure.transportCode;
      if (Number.isFinite(brokerFailure.serviceCode)) diagnostics.serviceStartCode = brokerFailure.serviceCode;
      const suffix = brokerFailure.transportCode ? ' (' + brokerFailure.transportCode + ')'
        : Number.isFinite(brokerFailure.serviceCode) ? ' (SC ' + brokerFailure.serviceCode + ')' : '';
      diagnostics.samplingErrors = [...(diagnostics.samplingErrors || []),
        pipeMessages[brokerFailure.code] + ' [' + brokerFailure.code + ']' + suffix].slice(0, 16);
    }
    return {...value, diagnostics};
  }

  function sampleFallback() {
    return sampleLocal().then(withBrokerState);
  }

  function readTemperature() {
    if (!brokerEnabled || closed) return sampleLocal();
    if (brokerPending) return brokerPending;
    if (now() < brokerRetryAt) return ['starting', 'unavailable'].includes(brokerState)
      ? Promise.resolve(withBrokerState(unavailable('unavailable'))) : sampleFallback();
    brokerPending = sampleBroker().then(value => {
      retire(); // Retire only our unprivileged fallback, never the shared service.
      cached = value;
      brokerState = 'ready';
      brokerFailure = null;
      brokerRetryAt = 0;
      return withBrokerState(value);
    }).catch(error => {
      if (closed || !collecting) return unavailable('closed');
      brokerState = error.serviceCode === 5 ? 'denied'
        : error.serviceCode === 1060 ? 'missing'
        : error.serviceCode === 1058 ? 'disabled' : error.brokerConnected ? 'unavailable' : 'starting';
      brokerFailure = {
        code: Object.hasOwn(pipeMessages, error.brokerCode) ? error.brokerCode : 'PIPE_ERROR',
        transportCode: typeof error.code === 'string' && /^[A-Z0-9_]{1,32}$/.test(error.code) ? error.code : null,
        serviceCode: Number.isFinite(error.serviceCode) ? error.serviceCode : null
      };
      // An established service retries on the next normal sampling tick,
      // not after a separate two-second outage. Cold starts retain a backoff.
      brokerRetryAt = now() + (brokerState === 'starting' ? 2000 : brokerState === 'unavailable' ? 0 : 30000);
      // A service that is starting/reconnecting must not be replaced with an
      // unprivileged sampler: that turns a startup delay into a false hint
      // that the user's existing service authorization has been lost.
      return ['starting', 'unavailable'].includes(brokerState)
        ? withBrokerState(unavailable('unavailable')) : sampleFallback();
    }).finally(() => { brokerPending = null; });
    return brokerPending;
  }

  function reading(value) { return value && validTimestamp(value.sampledAt) ? value : null; }
  function publish(value) {
    // Waiting for the next read leaves this snapshot intact. A completed result,
    // including explicit nulls or a transport fault, replaces it atomically.
    published = value;
  }
  function snapshot() {
    if (closed) return unavailable('closed');
    const value = published || unavailable('loading');
    const cpu = reading(value.cpu), gpu = reading(value.gpu);
    const status = cpu && gpu ? 'ready' : cpu || gpu ? 'partial' : value.status === 'missing' ? 'missing' :
      !published || value.status === 'loading' ? 'loading' : 'unavailable';
    return {
      ...value, status, cpu, gpu, sampledAt: Math.max(cpu?.sampledAt || 0, gpu?.sampledAt || 0),
      cpuSensors: (value.cpuSensors || []).filter(reading), gpuSensors: (value.gpuSensors || []).filter(reading),
      diagnostics: {...value.diagnostics, collecting, busy:samplingBusy, intervalMs:sampleIntervalMs, lastAttemptAt, lastReadDurationMs}
    };
  }
  function requestedInterval() {
    let interval = Infinity;
    for (const [id, client] of samplingClients) {
      if (client.expires <= now()) samplingClients.delete(id);
      else interval = Math.min(interval, client.intervalMs);
    }
    return interval === Infinity ? sampleIntervalMs : interval;
  }
  function scheduleSampling(token) {
    if (closed || !collecting || token !== samplingGeneration) return;
    sampleIntervalMs = requestedInterval();
    nextSampleAt += sampleIntervalMs;
    const time = performance.now();
    // Absolute cadence: skip busy ticks, never queue overlapping or catch-up reads.
    if (nextSampleAt <= time) nextSampleAt += (Math.floor((time - nextSampleAt) / sampleIntervalMs) + 1) * sampleIntervalMs;
    samplingTimer = setTimeout(() => { samplingTimer = null; void updateTemperature(token); }, Math.max(0, nextSampleAt - time));
    samplingTimer.unref?.();
  }
  async function updateTemperature(token) {
    if (closed || !collecting || token !== samplingGeneration || samplingBusy) return;
    samplingBusy = true; lastAttemptAt = now();
    const started = performance.now();
    try {
      const value = await readTemperature();
      if (!closed && collecting && token === samplingGeneration) publish(value);
    } catch {
      if (!closed && collecting && token === samplingGeneration) publish(unavailable('unavailable'));
    } finally {
      samplingBusy = false; lastReadDurationMs = Math.round(performance.now() - started);
      scheduleSampling(token);
    }
  }
  function halt(status) {
    collecting = false; samplingGeneration++;
    clearTimeout(samplingTimer); samplingTimer = null;
    samplingClients.clear(); published = null;
    cancelBrokerDelay();
    brokerSocket?.destroy(new Error(status)); retire(status);
  }
  function beginSampling() {
    if (closed || collecting) return;
    collecting = true; sampleIntervalMs = requestedInterval(); nextSampleAt = performance.now();
    const token = ++samplingGeneration;
    queueMicrotask(() => { void updateTemperature(token); });
  }
  function sample(input = {}) {
    if (closed) return Promise.resolve(unavailable('closed'));
    const selected = Number(input?.intervalMs);
    const intervalMs = Number.isFinite(selected) && selected > 0 ? Math.max(500, Math.min(3000, Math.round(selected / 500) * 500)) : 1000;
    const clientId = typeof input?.clientId === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(input.clientId) ? input.clientId : 'default';
    if (samplingClients.size >= 128 && !samplingClients.has(clientId)) samplingClients.delete(samplingClients.keys().next().value);
    samplingClients.set(clientId, { intervalMs, expires:now() + clientLeaseMs });
    const interval = requestedInterval();
    if (!collecting) {
      beginSampling();
    } else if (!samplingBusy && samplingTimer && interval !== sampleIntervalMs) {
      clearTimeout(samplingTimer);
      nextSampleAt = Math.max(performance.now(), nextSampleAt - sampleIntervalMs + interval);
      sampleIntervalMs = interval;
      const token = samplingGeneration;
      samplingTimer = setTimeout(() => { samplingTimer = null; void updateTemperature(token); }, Math.max(0, nextSampleAt - performance.now()));
      samplingTimer.unref?.();
    }
    if (!samplingBusy && !samplingTimer) sampleIntervalMs = interval;
    // Only return a snapshot. Hardware work belongs exclusively to the backend loop.
    return Promise.resolve(snapshot());
  }
  // Start with the backend, not with a page poll or a playback action.
  beginSampling();
  return Object.freeze({
    sample,
    get active() { return collecting || child !== null; },
    stop() { if (closed) return; closed = true; halt('closed'); }
  });
};
