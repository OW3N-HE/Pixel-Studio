'use strict';
// Loopback-only pixel relay. No dependencies, no persistent WLED config writes.
const http = require('node:http');
const dgram = require('node:dgram');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Worker } = require('node:worker_threads');
const { performance } = require('node:perf_hooks');
const PORT = process.parentPort && process.env.PIXEL_STUDIO_BRIDGE_PORT === '0' ? 0 : 8766;
const HOST = '127.0.0.1';
let boundPort = PORT;
let ORIGIN = `http://${HOST}:${PORT}`;
const rootId = crypto.createHash('sha256').update(path.resolve(__dirname).toLowerCase()).digest('hex');
const TOKEN = crypto.randomBytes(32).toString('hex');
const sessions = new Map();
const temperatureService = require('./pixel-temperature-service.cjs')();
let temperaturePumpBusy = false;
const webAutoExit=process.argv.includes('--web-auto-exit')&&!process.parentPort;
const webClients=new Map();let webIdleAt=performance.now(),closing=false;
const validClient=id=>typeof id==='string'&&/^[a-zA-Z0-9-]{16,64}$/.test(id);

const udp = dgram.createSocket('udp4');
udp.on('error', error => console.error('UDP:', error.message));

function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function perceptualLut(brightness, inverseGamma) {
  const gain = Math.max(0, Math.min(255, brightness)) / 255;
  return Uint8Array.from({length:256}, (_, value) =>
    Math.round(255 * Math.pow(value / 255 * gain, inverseGamma)));
}
function deviceHost(value) {
  const url = new URL(/^http:\/\//i.test(value) ? value : 'http://' + value);
  const parts = url.hostname.split('.').map(Number);
  if (url.protocol !== 'http:' || url.username || url.password || (url.port && url.port !== '80') ||
      parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255) ||
      !(parts[0] === 10 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)) ||
      parts[3] === 0 || parts[3] === 255) fail('DDP requires a private LAN IPv4 address, e.g. 192.168.1.100');
  return url.hostname;
}
async function deviceJSON(host, route, payload) {
  const response = await fetch('http://' + host + route, {
    method: payload === undefined ? 'GET' : 'POST', redirect: 'error',
    ...(payload === undefined ? {} : { headers: {'Content-Type':'application/json'}, body:JSON.stringify(payload) }),
    signal: AbortSignal.timeout(4500)
  });
  if (!response.ok) fail('WLED HTTP ' + response.status, 502);
  const data = await response.json();
  if (data.error) fail('WLED error ' + data.error, 502);
  return data;
}
function body(req, maximum) {
  return new Promise((resolve, reject) => {
    const chunks = []; let length = 0;
    const timer = setTimeout(() => { reject(new Error('Request body timed out')); req.destroy(); }, 3000);
    req.on('data', chunk => {
      length += chunk.length;
      if (length > maximum) { clearTimeout(timer); reject(new Error('Request too large')); req.destroy(); }
      else chunks.push(chunk);
    });
    req.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
    req.on('error', error => { clearTimeout(timer); reject(error); });
    req.on('aborted', () => { clearTimeout(timer); reject(new Error('Request aborted')); });
  });
}
function json(res, value, status = 200) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(JSON.stringify(value));
}
async function release(session) {
  if (!session || !session.active) return;
  session.active = false;
  // Keep the reservation until the release command completes, avoiding a stop/start race.
  if (session.worker) {
    const worker = session.worker; session.worker = null;
    try { await worker.terminate(); } catch (_) {}
  }
  try { await deviceJSON(session.host, '/json/state', {live:false}); }
  catch (error) { console.error('Release:', error.message); }
  finally { if (sessions.get(session.id) === session) sessions.delete(session.id); }
}
async function sendPixels(session, frame) {
  const started = performance.now();
  for (let offset = 0; offset < frame.length; offset += 1440) {
    if (!session.active) fail('Playback stopped', 409);
    const count = Math.min(1440, frame.length - offset);
    const packet = Buffer.allocUnsafe(10 + count);
    packet[0] = 0x40 | (offset + count === frame.length ? 1 : 0);
    session.sequence = session.sequence % 15 + 1;
    packet[1] = session.sequence;
    packet[2] = 0x0b; // RGB24, 8 bits/channel
    packet[3] = 1; // Display destination
    packet.writeUInt32BE(offset, 4);
    packet.writeUInt16BE(count, 8);
    for (let i = 0; i < count; i++) packet[10 + i] = session.lut[frame[offset + i]];
    await new Promise((resolve, reject) => udp.send(packet, 4048, session.host, error => error ? reject(error) : resolve()));
  }
  return performance.now() - started; // Local UDP completion, NOT a device acknowledgement.
}

async function startAnimationWorker(session, input, w, h, fps, speed) {
  session.thermalInterval = Math.max(0.5,Math.min(3,Math.round((Number(input.thermal?.sampleSeconds)||1)*2)/2))*1000;
  session.thermalNextAt = 0;
  session.continuous = true;
  session.confirmed = false;
  session.stats = {targetFps:fps,fps:0,kbps:0,frameMs:0,frames:0,missed:0,uptime:0,mode:input.mode};
  const worker = new Worker(path.join(__dirname,'pixel-stream-worker.cjs'), {workerData:{
    host:session.host,w,h,fps,speed,mode:input.mode,thermal:input.thermal,mapping:String(input.mapping || ''),clockFont:['rounded','classic','segment'].includes(input.clockFont)?input.clockFont:'rounded',clockPalette:(['original','mint','amber','ice','rose','violet'].includes(input.clockPalette) || /^custom:(#[0-9a-f]{6}):(#[0-9a-f]{6}):(#[0-9a-f]{6})$/i.test(input.clockPalette))?input.clockPalette:'mint',lut:Array.from(session.lut)
  }});
  session.worker = worker;
  await new Promise((resolve,reject) => {
    let ready=false;
    const timer=setTimeout(()=>failed(new Error('Animation worker startup timed out')),6000);
    function failed(error) {
      clearTimeout(timer);
      session.workerError=error.message;session.continuous=false;
      if(!ready)reject(error);
      if(session.worker===worker){session.worker=null;void worker.terminate();}
    }
    worker.on('message',message=>{
      if(message.type==='ready'){ready=true;clearTimeout(timer);resolve();}
      else if(message.type==='stats')session.stats=message.stats;
      else if(message.type==='error')failed(new Error(message.message));
    });
    worker.on('error',failed);
    worker.on('exit',code=>{
      if(session.active && session.worker===worker)failed(new Error('Animation worker stopped ('+code+')'));
    });
  });
}

const server = http.createServer(async (req, res) => {
  const receivedAt = performance.now();
  try {
    if (req.headers.host !== HOST + ':' + boundPort) fail('Invalid Host', 403);
    const url = new URL(req.url, ORIGIN);
    if(req.method==='GET' && url.pathname==='/health'){json(res,{service:'PixelStudioDDP',rootId});return;}
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8')
        .replace('</head>', `<meta name="pixel-bridge-token" content="${TOKEN}"></head>`);
      res.writeHead(200, {'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store',
        'X-Frame-Options':'DENY','Content-Security-Policy':"frame-ancestors 'none'",'Referrer-Policy':'no-referrer'});
      res.end(html); return;
    }
    const webAssets = {
      '/pixel-studio-web-ui.css':'text/css',
      '/pixel-studio-web-ui.js':'text/javascript',
      '/pixel-studio-web-palettes.js':'text/javascript',
      '/pixel-studio-web-language.js':'text/javascript',
      '/pixel-circuit-palette.cjs':'text/javascript',
      '/pixel-temperature.cjs':'text/javascript',
      '/pixel-temperature-ui.js':'text/javascript'
    };
    if (req.method === 'GET' && Object.hasOwn(webAssets, url.pathname)) {
      res.writeHead(200, {'Content-Type':webAssets[url.pathname]+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
      res.end(fs.readFileSync(path.join(__dirname,url.pathname.slice(1)))); return;
    }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
    // No CORS, no unauthenticated commands, no general-purpose network proxy.
    if (req.headers['x-pixel-token'] !== TOKEN || (req.headers.origin && req.headers.origin !== ORIGIN)) fail('Open the local DDP page first', 403);
    if (url.pathname === '/api/temperature' && req.method === 'GET') {
      webIdleAt = performance.now();
      json(res, await temperatureService.sample()); return;
    }
    if (url.pathname === '/api/web-client' && req.method === 'POST') {
      const input=JSON.parse((await body(req,1024)).toString());
      if(!validClient(input.id))fail('Invalid client',400);
      webClients.set(input.id,{expires:performance.now()+(input.closed?30000:300000),closed:input.closed===true});
      webIdleAt=performance.now();res.writeHead(204);res.end();return;
    }
    if (url.pathname === '/api/device' && req.method === 'GET') {
      const route = url.searchParams.get('path');
      if (!['/json/si','/json/cfg','/json/info','/json/state'].includes(route)) fail('Unsupported device route');
      json(res, await deviceJSON(deviceHost(url.searchParams.get('host') || ''), route)); return;
    }
    if (url.pathname === '/api/start' && req.method === 'POST') {
      const input = JSON.parse((await body(req, 4096)).toString());
      const host = deviceHost(input.host);
      const w = Number(input.w), h = Number(input.h), brightness = Number(input.brightness);
      const fps = Number(input.fps ?? 60), speed = Number(input.speed ?? 1);
      if (!Number.isInteger(fps) || fps < 1 || fps > 60 || !Number.isFinite(speed) || speed < 0.05 || speed > 8)
        fail('FPS must be 1-60; animation speed must be 0.05-8');
      if (input.mode !== undefined && !/^[a-zA-Z0-9_-]{1,64}$/.test(input.mode)) fail('Invalid animation name');
      if (![w,h].every(n => Number.isInteger(n) && n >= 1 && n <= 512) || w * h > 4096 ||
          !Number.isInteger(brightness) || brightness < 0 || brightness > 255) fail('Invalid size or brightness; DDP supports up to 4096 pixels');
      if ([...sessions.values()].some(s => s.host === host)) fail('Another sender is active or stopping. Stop it first.', 409);
      const session = {id:crypto.randomBytes(16).toString('hex'),host,active:true,preparing:true,lastAt:performance.now(),sequence:0,busy:false,bytes:w*h*3};
      session.webClient=validClient(req.headers['x-pixel-client'])?req.headers['x-pixel-client']:null;
      sessions.set(session.id, session);
      res.on('close',()=>{if(!res.writableFinished)void release(session);});
      try {
        const si = await deviceJSON(host, '/json/si');
        const cfg = await deviceJSON(host, '/json/cfg');
        const live = cfg.if?.live;
        if (!live) fail('Unable to read WLED realtime configuration');
        const matrix = si.info?.leds?.matrix;
        if (matrix && (matrix.w !== w || matrix.h !== h)) fail(`Device is ${matrix.w}x${matrix.h}; use Read device size first`);
        if (w*h > Number(si.info?.leds?.count || 0)) fail('Frame exceeds the configured LED count');
        if (live.en === false) fail('Enable Receive UDP realtime in WLED Sync settings');
        if (matrix && live.rlm !== true) fail('Enable Respect LED maps in WLED Sync settings for this matrix');
        if (Number(live.offset || 0) !== 0 || Number(live.dmx?.addr || 0) > 2) fail('Set realtime LED offset to 0 and DMX start address to 1');
        if (live.mso) {
          const mainId = si.state?.mainseg || 0;
          const seg = si.state?.seg?.find(s => s.id === mainId);
          if (!seg || seg.start !== 0 || (seg.startY || 0) !== 0 || seg.stop !== (matrix ? w : w*h) ||
              (matrix && seg.stopY !== h) || (seg.grp || 1) !== 1 || seg.spc || seg.rev || seg.mi || seg.rY || seg.mY || seg.tp)
            fail('Main-segment-only realtime requires a full-size, untransformed main segment');
        }
        const gc = cfg.light?.gc;
        const enabledGamma = gc?.col !== false && gc?.col !== 0;
        const gamma = Math.max(1,Math.min(4,(typeof gc?.col === 'number' && gc.col > 0 ? gc.col : gc?.val) || Number(input.gamma) || 2.8));
        const inverseGamma = input.match !== false && !live['no-gc'] && enabledGamma ? 1/gamma : 1;
        session.colorGamma = gamma;
        session.colorGammaEnabled = !live['no-gc'] && enabledGamma;
        session.inverseGamma = inverseGamma;
        session.lut = perceptualLut(brightness, inverseGamma);
        await deviceJSON(host, '/json/state', {on:true,bri:255,tt:0,lor:0,live:false,seg:{id:si.state?.mainseg || 0,on:true,bri:255,frz:false}});
        if (!session.active) fail('Playback cancelled',409);
        if (input.mode && input.mode !== 'file') await startAnimationWorker(session,input,w,h,fps,speed);
        session.preparing = false;
        session.lastAt = performance.now();
        json(res,{id:session.id,packetCount:Math.ceil(session.bytes/1440),gammaCompensated:inverseGamma !== 1,autonomous:!!session.worker,targetFps:fps});
      } catch (error) { session.preparing=false;await release(session);throw error; }
      return;
    }
    if (url.pathname === '/api/update' && req.method === 'POST') {
      const input = JSON.parse((await body(req, 4096)).toString());
      const session = sessions.get(input.id);
      if (!session?.active || !session.worker) fail('Playback session is not available', 409);
      const brightness = Number(input.brightness), fps = Number(input.fps ?? 60), speed = Number(input.speed ?? 1);
      if (!/^[a-zA-Z0-9_-]{1,64}$/.test(input.mode || '') || !Number.isInteger(brightness)
          || brightness < 0 || brightness > 255 || !Number.isInteger(fps) || fps < 1 || fps > 60
          || !Number.isFinite(speed) || speed < 0.05 || speed > 8) fail('Invalid live update');
      session.inverseGamma = input.match !== false && session.colorGammaEnabled ? 1/session.colorGamma : 1;
      session.lut = perceptualLut(brightness, session.inverseGamma);
      session.thermalInterval = Math.max(0.5,Math.min(3,Math.round((Number(input.thermal?.sampleSeconds)||1)*2)/2))*1000;
      session.thermalNextAt = 0;
      session.worker.postMessage({type:'update',config:{...input,lut:Array.from(session.lut)}});
      session.stats.targetFps = fps;
      session.stats.mode = input.mode;
      json(res,{updated:true,id:session.id});return;
    }
    if (url.pathname === '/api/stats' && req.method === 'GET') {
      const session=sessions.get(url.searchParams.get('id'));
      if(!session?.active)fail('Stream stopped; start playback again',409);
      if(session.workerError)fail('Animation worker: '+session.workerError,502);
      session.confirmed=true;
      json(res,{autonomous:!!session.worker,...session.stats});return;
    }
    if (url.pathname === '/api/frame' && req.method === 'POST') {
      const session = sessions.get(url.searchParams.get('id'));
      if (!session?.active) fail('Stream expired; start playback again', 409);
      if (session.worker) fail('The background worker owns this stream',409);
      if (session.busy) { res.writeHead(204,{'X-Pixel-Dropped':'1'});res.end();req.resume();return; }
      session.busy = true;
      try {
        const frame = await body(req, session.bytes);
        if (frame.length !== session.bytes) fail('Incorrect RGB frame size');
        if (!session.active) fail('Playback stopped', 409);
        if (performance.now() - receivedAt > 250) { res.writeHead(204,{'X-Pixel-Dropped':'1'});res.end();return; }
        session.lastAt = performance.now();
        const elapsed = await sendPixels(session, frame);
        res.writeHead(204,{'Cache-Control':'no-store','X-Pixel-Send-Ms':elapsed.toFixed(2)});res.end();
      } finally { session.busy = false; }
      return;
    }
    if (url.pathname === '/api/stop' && req.method === 'POST') {
      const input = JSON.parse((await body(req, 1024)).toString());
      if (input.id) await release(sessions.get(input.id));
      else if (input.host) {
        const host=deviceHost(input.host);
        await Promise.allSettled([...sessions.values()].filter(session=>session.host===host).map(release));
      }
      json(res,{stopped:true});return;
    }
    fail('Not found',404);
  } catch (error) { if (!res.headersSent && !res.destroyed) json(res,{error:error.message},error.status || 502); }
});
server.requestTimeout = 8000;
server.headersTimeout = 5000;
server.on('connection', socket => socket.setNoDelay(true));
server.on('error', error => { console.error(error.code === 'EADDRINUSE' ? ORIGIN + ' is already running.' : error.message); process.exit(1); });
const reaper = setInterval(() => {
  const now=performance.now();
  for(const [id,client]of webClients)if(client.expires<now)webClients.delete(id);
  for(const session of sessions.values())if(session.webClient&&!webClients.has(session.webClient)&&!session.preparing)void release(session);
  if(webClients.size||sessions.size||temperatureService.active)webIdleAt=now;
  else if(webAutoExit&&!closing&&now-webIdleAt>45000){closing=true;void shutdown();}

  for (const session of sessions.values()) if (session.active && !session.preparing && !session.busy &&
    !(session.continuous && session.confirmed) && performance.now()-session.lastAt > 8000) void release(session);
},1000);
reaper.unref();
const temperaturePump = setInterval(async () => {
  if (closing || temperaturePumpBusy) return;
  const targets = [...sessions.values()].filter(session => session.active && session.worker && performance.now() >= (session.thermalNextAt || 0));
  if (!targets.length) return;
  temperaturePumpBusy = true;
  try {
    const sample = await temperatureService.sample();
    for (const session of targets) {
      if (session.active && session.worker) {
        session.thermalNextAt = performance.now() + (session.thermalInterval || 1000);
        session.worker.postMessage({type:'temperature', sample});
      }
    }
  } finally { temperaturePumpBusy = false; }
}, 250);
temperaturePump.unref();
server.listen(PORT,HOST,()=>{
  boundPort=server.address().port;ORIGIN=`http://${HOST}:${boundPort}`;
  console.log('Pixel Studio DDP: '+ORIGIN);
  process.parentPort?.postMessage({type:'pixel-ddp-ready',port:boundPort,token:TOKEN});
});
async function shutdown() {
  closing = true;
  clearInterval(temperaturePump);
  temperatureService.stop();
  clearInterval(reaper);
  await Promise.allSettled([...sessions.values()].map(release));
  server.close();udp.close();process.exit(0);
}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
process.parentPort?.on('message',event=>{if(event.data?.type==='pixel-ddp-stop')void shutdown();});
