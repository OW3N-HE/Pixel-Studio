'use strict';
// Real, uniquely named test pipes with fixed fake temperatures. No services,
// installed sensors, driver access, controller access or application changes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const net=require('node:net'),{spawn}=require('node:child_process');
if(process.platform!=='win32'){
  console.log('SKIP Windows-only response delivery fixture; no sensor tests.');
  process.exit(0);
}
const source=fs.readFileSync(path.join(__dirname,'..','temperature','TemperatureWindowsService.cs'),'utf8');
const begin=source.indexOf('    private static async Task SendSnapshotAsync(');
const end=source.indexOf('    private async Task<string> ReadSnapshot(',begin);
assert(begin>=0&&end>begin,'The production response delivery method must be present');
assert.match(source,/finally\s*\{\s*pipe\.Disconnect\(\);\s*\}/,'Reset even a client-closed pipe before the next connection');
const delivery=source.slice(begin,end);
const cs=[
  'using System; using System.IO; using System.IO.Pipes; using System.Text; using System.Threading; using System.Threading.Tasks;',
  'public static class TemperatureDeliveryFixture {',
  delivery,
  'public static async Task Run(string name) {',
  'using(var pipe=new NamedPipeServerStream(name,PipeDirection.InOut,1,PipeTransmissionMode.Byte,PipeOptions.Asynchronous,256,65536)) {',
  'Console.WriteLine("READY|"+Environment.Version);',
  'for(int i=0;i<22;i++) { await pipe.WaitForConnectionAsync(); try {',
  'await Task.Delay(5); await SendSnapshotAsync(pipe,"{\\"cpu\\":61,\\"gpu\\":42}",CancellationToken.None);',
  '} catch(IOException) {} catch(OperationCanceledException) { Console.WriteLine("DELIVERY_TIMEOUT"); }',
  'finally { pipe.Disconnect(); } } } } }'
].join('\n');
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(){
  const name='PixelStudio.ResponseTest.'+crypto.randomUUID(),sockets=new Set();
  const script="Add-Type -TypeDefinition @'\n"+cs+"\n'@\n[TemperatureDeliveryFixture]::Run('"+name+"').GetAwaiter().GetResult()";
  const child=spawn(process.env.PIXEL_STUDIO_TEST_PWSH||'pwsh.exe',
    ['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],
    {windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output='',errors='',exitCode=null,readyResolve,readyReject;
  const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
  const exited=new Promise(resolve=>child.once('exit',code=>{
    exitCode=code;
    if(!output.includes('READY|'))readyReject(new Error(errors||'Isolated pipe helper exited before ready'));
    resolve(code);
  }));
  child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
  child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('READY|'))readyResolve();});
  child.stderr.on('data',chunk=>{errors+=chunk;});
  child.once('error',readyReject);
  const guard=setTimeout(()=>{readyReject(new Error('Isolated pipe helper timed out'));child.kill();},25000);
  function read(delay=0,keepOpen=false){
    return new Promise(resolve=>{
      const socket=net.createConnection('\\\\.\\pipe\\'+name);sockets.add(socket);
      let connected=false,done=false,data='',resume;
      if(delay)socket.pause();
      const timer=setTimeout(()=>finish(false,'client response timeout'),3000);
      function finish(ok,error){
        if(done)return;done=true;clearTimeout(timer);clearTimeout(resume);
        if(!keepOpen||!ok)socket.destroy();
        resolve({ok,error,connected,socket});
      }
      socket.setEncoding('utf8');
      socket.once('connect',()=>{connected=true;if(delay)resume=setTimeout(()=>socket.resume(),delay);});
      socket.on('data',chunk=>{
        data+=chunk;const end=data.indexOf('\n');if(end<0)return;
        try{const value=JSON.parse(data.slice(0,end));finish(value.cpu===61&&value.gpu===42,'invalid fake temperatures');}
        catch(error){finish(false,error.message);}
      });
      socket.on('error',error=>finish(false,error.code||error.message));
      socket.on('end',()=>finish(false,'pipe ended without a complete response'));
      socket.on('close',()=>{sockets.delete(socket);finish(false,'pipe closed without a complete response');});
    });
  }
  async function request(delay=0,keepOpen=false){
    for(let retry=0;retry<20;retry++){
      const result=await read(delay,keepOpen);
      if(result.connected)return result;
      await sleep(10);
    }
    throw new Error('Isolated pipe could not reconnect');
  }
  try{
    await ready;
    for(const delay of [0,25])for(let i=0;i<10;i++){
      const result=await request(delay);assert(result.ok,result.error);
      await sleep(5);
    }
    const retained=await request(0,true);assert(retained.ok,retained.error);
    await sleep(2300);
    assert(output.includes('DELIVERY_TIMEOUT'),'A client that never closes must hit the two-second delivery bound');
    const next=await request();assert(next.ok,'A timed-out client must not block subsequent responses: '+next.error);
    assert.equal(await exited,0,errors);
    console.log('PASS production C# delivery method: 20 normal/delayed responses, bounded abandoned client and pipe reuse. Fixture runtime '+output.match(/READY\|([^\r\n]+)/)[1]+'. Fake temperatures only; not the installed service or a sensor test.');
  }finally{
    clearTimeout(guard);
    for(const socket of sockets)socket.destroy();
    if(exitCode===null&&child.pid)child.kill();
  }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
