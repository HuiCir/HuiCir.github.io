(() => {
  'use strict';
  const data = window.PERSEUS_DATA;
  const copies = window.PERSEUS_COPY;
  const header = document.querySelector('.project-header');
  const langButton = document.querySelector('.lang-toggle');
  const menuButton = document.querySelector('.menu-toggle');
  let language = 'en', metric = 'ts', demoStep = 0, zoomOpener;
  // The project defaults to English independently of the academic homepage.
  const languageKey = 'perseus-project-language-v2';
  try { language = localStorage.getItem(languageKey) || 'en'; } catch {}
  if (!['en','zh'].includes(language)) language = 'en';
  const l = (en, zh) => language === 'zh' ? zh : en;
  const num = (value, digits = 2) => Number(value).toFixed(digits);
  const sd = (value, deviation, digits = 1) => num(value, digits) + (deviation === undefined ? '' : ' ±' + num(deviation, digits));
  const demo = [
    { title:['Launch','启动'], actor:0, s:[0,0,0], ledger:0, description:['At request t, one Actor continues native work while three constrained Speculators propose independent acquisitions. This view tracks just this wave.','请求 t 中，一个 Actor 继续原生工作，三个受约束 Speculator 提出独立采集。此视图只跟踪这一个波次。'] },
    { title:['First result ready','首个结果完成'], actor:1, s:[1,0,0], ledger:0, description:['A catalog inspection completes while the Actor is still working. Ready does not mean immediately admitted into the same originating request.','Actor 工作期间，一次目录检查完成。ready 不意味着立即接收到同一个来源请求中。'] },
    { title:['Boundary t+1','边界 t+1'], actor:2, s:[2,0,0], ledger:1, description:['At t+1, the ledger admits the older ready catalog observation with copy provenance. The policy inspection and diagnostic remain pending; the Actor starts without joining them.','在 t+1，ledger 接收更早已完成的目录观察与副本来源。政策检查和诊断仍未完成；Actor 无需等待它们即可开始。'] },
    { title:['More work completes','更多采集完成'], actor:3, s:[2,1,0], ledger:1, description:['A second acquisition completes between boundaries. Its result contains a known catalog entry and new policy information. The slow Future is still alive.','第二次采集在边界之间完成，其结果包含已知目录条目与新政策信息。较慢的 Future 仍然存活。'] },
    { title:['Boundary t+2','边界 t+2'], actor:4, s:[2,2,0], ledger:2, description:['At t+2, source-aware admission adds the new policy and suppresses the recognized catalog duplicate. The Actor can use that evidence for a different action; no speculative copy is merged.','在 t+2，来源感知接收追加新政策，并抑制已识别的目录重复。Actor 可将证据用于不同动作；投机副本没有被合并。'] },
    { title:['Actor completes','Actor 完成任务'], actor:5, s:[2,2,3], ledger:2, description:['The Actor owns completion. Remaining pending work is cancelled and cleanup is settled. New authoritative progress can create later waves, but evidence admission alone cannot.','由 Actor 决定任务完成。剩余未完成工作被取消并完成清理。新权威进展可形成后续波次，证据接收本身不能。'] }
  ];
  function node(tag, text, className) { const n=document.createElement(tag); if (text !== undefined) n.textContent=text; if(className)n.className=className; return n; }
  function table(id, headers, rows, caption) {
    const target=document.getElementById(id); if(!target)return;
    target.replaceChildren(node('caption',caption));
    const head=node('thead'),line=node('tr');headers.forEach(text=>{const cell=node('th',text);cell.scope='col';line.append(cell);});head.append(line);target.append(head);
    const body=node('tbody');rows.forEach(values=>{const tr=node('tr');if(String(values[0]).includes('PERSEUS'))tr.className='perseus-row';values.forEach((value,i)=>{const cell=node(i===0?'th':'td',String(value));if(i===0)cell.scope='row';tr.append(cell);});body.append(tr);});target.append(body);
  }
  function renderTables() {
    if(!data)return;
    const keys=['AutomationBench','tau2-Bench','Terminal-Bench','GAIA','Overall'];
    table('main-table',[l('Method','方法'),'Auto · 36','τ² · 60','Term · 31','GAIA · 56',l('Overall · 183','总体 · 183')],data.main.map(r=>[r.method,...keys.map(k=>metric==='ts'?sd(r.ts_percent[k],r.ts_sd_percent[k]):num(r.es_milli_per_second[k]))]),metric==='ts'?l('Table 1 · TS (%) · ± SD across three runs','表 1 · TS（%）· ± 三次运行标准差'):l('Table 1 · ES (×10⁻³ s⁻¹) · aggregate success / aggregate time','表 1 · ES（×10⁻³ s⁻¹）· 总成功数 / 总耗时'));
    table('ablation-table',[l('Configuration','配置'),'TS (%)','PCS','ES',l('Turns','轮次'),l('Time (s)','耗时（秒）'),'Tool (%)','Eq. tokens (M)'],data.ablation.map(r=>[r.configuration,sd(r.ts_percent,r.ts_sd_percent),num(r.pcs,3),num(r.es_milli_per_second),sd(r.actor_turns,r.actor_turns_sd,2),sd(r.time_seconds,r.time_sd_seconds),num(r.tool_success_percent,1),num(r.equivalent_tokens_millions)]),l('Table 2 · 85 cases · ± SD across three runs · ES ×10⁻³ s⁻¹','表 2 · 85 案例 · ± 三次运行标准差 · ES ×10⁻³ s⁻¹'));
    table('cap-table',[l('Concurrency cap','并发上限'),'PCS','ES (PCS / s)'],data.scaling.cap.map(r=>[r.cap,num(r.pcs,3),num(r.es_pcs_milli_per_second)]),l('Width sweep · ES ×10⁻³ s⁻¹','宽度扫描 · ES ×10⁻³ s⁻¹'));
    table('effort-table',[l('S effort','S 强度'),'PCS','ES (PCS / s)'],data.scaling.effort.map(r=>[r.speculator_effort,num(r.pcs,3),num(r.es_pcs_milli_per_second)]),l('Effort sweep · Actor high · ES ×10⁻³ s⁻¹','强度扫描 · Actor high · ES ×10⁻³ s⁻¹'));
    table('harness-table',[l('Model group / method','模型组 / 方法'),'TS (%)',l('Turns','轮次'),'Eq. tokens (K)','ES'],data.harness.map(r=>[r.model_group+' / '+r.method,num(r.ts_percent,1),num(r.response_turns,1),num(r.equivalent_tokens_thousands,1),num(r.es_milli_per_second)]),l('Figure 4 values · ES ×10⁻³ s⁻¹','图 4 数值 · ES ×10⁻³ s⁻¹'));
    table('cost-table',[l('Method','方法'),'TS (%)','ES',l('Normalized budget','归一化用量')],data.cost.map(r=>[r.method,num(r.ts_percent,1),num(r.es_milli_per_second),num(r.normalized_budget,3)+'×']),l('Figure 9 values · ES ×10⁻³ s⁻¹','图 9 数值 · ES ×10⁻³ s⁻¹'));
    table('bfcl-table',[l('Group / cases','类别 / 案例'),'PERSEUS','ReAct','CMAS','DMAS'],Object.entries(data.bfcl).map(([group,r])=>[group+' / '+r.cases,...['PERSEUS','ReAct','CMAS','DMAS'].map(method=>num(r[method].accuracy_percent)+' / '+num(r[method].mean_seconds))]),l('Table 5 · strict accuracy (%) / mean time (s)','表 5 · 严格准确率（%）/ 平均耗时（秒）'));
  }
  const waveFilm=document.getElementById('wave-film');
  const waveLanes=[...waveFilm.querySelectorAll('.wave-lane')];
  const waveRails=waveLanes.map(lane=>lane.querySelector('.wave-rail'));
  const waveReel=waveFilm.querySelector('.wave-reel'),waveIntake=waveFilm.querySelector('.wave-intake');
  const waveFlow=waveFilm.querySelector('.wave-flow');
  const waveReceipts=[1,2].map(i=>document.getElementById('wave-receipt-'+i));
  const waveTransfers=[1,2].map(i=>({
    incoming:document.getElementById('wave-incoming-'+i),outgoing:document.getElementById('wave-return-'+i),
    packet:document.getElementById('wave-packet-'+i),branch:waveFlow.querySelector('[data-flow="'+i+'"]')
  }));
  const duplicateRoute=document.getElementById('wave-incoming-duplicate'),duplicatePacket=document.getElementById('wave-packet-duplicate');
  let waveGeometryReady=false;
  const waveDuration=24000,phaseDuration=4000;
  let waveElapsed=0,waveFrameId,waveLastTime,waveVisible=false;
  const waveCaptions=[
    ['One Actor, three independent Futures.','一个 Actor，三条独立 Future。'],
    ['Ready, but not yet admitted.','结果已完成，但尚未被接收。'],
    ['At t+1, one observation enters the ledger.','在 t+1，一条观察进入证据账本。'],
    ['Another result arrives; the slow Future stays alive.','又一条结果完成；较慢的 Future 继续运行。'],
    ['At t+2, new evidence enters; a duplicate is suppressed.','在 t+2，新证据被接收，已识别的重复被抑制。'],
    ['The Actor finishes. Pending work is cancelled and cleaned up.','Actor 完成任务，剩余工作被取消并完成清理。']
  ];
  const waveRecords=[
    ['Catalog observation · copy S₁ · provenance retained','目录观察 · 副本 S₁ · 保留来源'],
    ['New policy observation · copy S₂ · retained in ledger','新政策观察 · 副本 S₂ · 保留在 ledger'],
    ['Same-source catalog duplicate · reviewed / suppressed','同来源的目录重复 · 已审阅 / 已抑制']
  ];
  function updateWavePaths(){
    const box=waveReel.getBoundingClientRect();if(box.width<1||box.height<1){waveGeometryReady=false;return;}
    waveFlow.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
    waveTransfers.forEach((transfer,i)=>{
      const rail=waveRails[i+1].getBoundingClientRect(),actor=waveRails[0].getBoundingClientRect();
      const port=waveReceipts[i].querySelector('.wave-receipt-port').getBoundingClientRect();
      const sx=rail.left-box.left+rail.width*.94,sy=rail.top-box.top+parseFloat(getComputedStyle(waveRails[i+1].querySelector('.wave-orb')).top);
      const tx=port.left-box.left+port.width/2,ty=port.top-box.top+port.height/2;
      const ax=actor.left-box.left+actor.width*[.406,.762][i],ay=actor.top-box.top+parseFloat(getComputedStyle(waveRails[0].querySelector('.wave-orb')).top);
      const edge=box.width-24;
      const band=ty-20-i*10;
      transfer.incoming.setAttribute('d',`M ${sx} ${sy} C ${edge} ${sy}, ${edge} ${band}, ${edge} ${band} L ${tx+20} ${band} Q ${tx} ${band}, ${tx} ${ty}`);
      transfer.outgoing.setAttribute('d',`M ${tx} ${ty} C ${tx} ${ty-26}, ${ax} ${ay+25}, ${ax} ${ay}`);
      transfer.inLength=transfer.incoming.getTotalLength();transfer.outLength=transfer.outgoing.getTotalLength();
      if(i===1){
        const receipt=waveReceipts[i].getBoundingClientRect(),dx=receipt.right-box.left-18,dy=receipt.bottom-box.top-13;
        duplicateRoute.setAttribute('d',`M ${sx} ${sy+10} C ${edge} ${sy+10}, ${edge} ${dy}, ${dx} ${dy}`);
      }
    });
    waveGeometryReady=true;
  }
  function traceWavePath(path,length,progress){path.style.strokeDasharray=String(length);path.style.strokeDashoffset=String(length*(1-progress));}
  function positionWavePacket(packet,path,length,progress,visible){
    packet.dataset.flying=String(visible);if(!visible)return;
    const point=path.getPointAtLength(length*progress);packet.setAttribute('transform',`translate(${point.x} ${point.y})`);
  }
  function setWaveText(target,value){if(target.textContent!==value)target.textContent=value;}
  function updateWaveMotion(){
    const time=reduced.matches?waveDuration:waveElapsed;
    const pct=(value)=>Math.max(0,Math.min(1,value));
    // The diagram expands ready-only boundary processing; pending Futures never gate it.
    const actorTravel=time<8000?5+35.6*pct(time/8000):time<10800?40.6:time<16000?40.6+35.6*pct((time-10800)/5200):time<18800?76.2:76.2+17.8*pct((time-18800)/1200);
    waveRails[0].style.setProperty('--travel',actorTravel+'%');
    waveRails[0].style.setProperty('--beam',actorTravel+'%');
    [4000,12000,23000].forEach((finish,i)=>{
      const progress=pct(Math.min(time,20000)/finish),travel=5+89*progress;
      waveRails[i+1].style.setProperty('--travel',travel+'%');
      waveRails[i+1].style.setProperty('--beam',travel+'%');
      waveRails[i+1].style.setProperty('--work',progress*100+'%');
    });
    if(!waveGeometryReady)updateWavePaths();
    // Complete observations wait on their rail. Only later boundaries open admission.
    waveTransfers.forEach((transfer,i)=>{
      const elapsed=time-[8000,16000][i],incoming=pct(elapsed/1400),outgoing=pct((elapsed-1400)/1400);
      const state=elapsed<0?'waiting':incoming<1?'receiving':outgoing<1?'returning':'admitted';
      transfer.branch.dataset.state=state;waveReceipts[i].dataset.state=state;
      setWaveText(waveReceipts[i].querySelector('.wave-receipt-name'),i===0?l('S₁ · catalog','S₁ · 目录'):l('S₂ · policy','S₂ · 政策'));
      const boundary=i===0?'t+1':'t+2';
      setWaveText(waveReceipts[i].querySelector('.wave-receipt-status'),state==='waiting'?l('Waiting for '+boundary,'等待 '+boundary):state==='receiving'?l('Evidence → ledger','证据 → ledger'):state==='returning'?l('Ledger → Actor','ledger → Actor'):l('In history · '+boundary,'已入历史 · '+boundary));
      if(elapsed>=0){waveLanes[i+1].dataset.state=incoming<1?'receiving':'admitted';setWaveText(waveLanes[i+1].querySelector('.wave-status'),incoming<1?l('Admission at '+boundary,'在 '+boundary+' 接收中'):l('Admitted / reviewed','已接收 / 已审阅'));}
      waveRails[0].querySelector(i===0?'.event-boundary-one':'.event-boundary-two').classList.toggle('is-receiving',elapsed>=1400&&elapsed<3300&&!reduced.matches);
      if(waveGeometryReady){
        traceWavePath(transfer.incoming,transfer.inLength,incoming);traceWavePath(transfer.outgoing,transfer.outLength,outgoing);
        const returning=incoming===1,path=returning?transfer.outgoing:transfer.incoming,length=returning?transfer.outLength:transfer.inLength;
        positionWavePacket(transfer.packet,path,length,returning?outgoing:incoming,!reduced.matches&&elapsed>=0&&elapsed<2800);
      }else transfer.packet.dataset.flying='false';
    });
    const duplicateElapsed=time-16150,duplicateProgress=pct(duplicateElapsed/1650);
    waveFlow.querySelector('.wave-flow-duplicate').dataset.state=duplicateElapsed<0?'waiting':duplicateProgress<1?'reviewing':'suppressed';
    if(waveGeometryReady){const length=duplicateRoute.getTotalLength();traceWavePath(duplicateRoute,length,duplicateProgress);positionWavePacket(duplicatePacket,duplicateRoute,length,duplicateProgress,!reduced.matches&&duplicateElapsed>=0&&duplicateElapsed<2450);}else duplicatePacket.dataset.flying='false';
    const catalogIn=time>=9400,policyIn=time>=17400,duplicateReviewed=time>=17800;
    document.getElementById('wave-empty').hidden=catalogIn;
    document.getElementById('wave-catalog').hidden=!catalogIn;
    document.getElementById('wave-policy').hidden=!policyIn;
    document.getElementById('wave-duplicate').hidden=!duplicateReviewed;
    const suppressed=document.getElementById('wave-suppressed');suppressed.hidden=!duplicateReviewed;setWaveText(suppressed,l('catalog × suppressed','目录重复 × 已抑制'));
    setWaveText(document.getElementById('wave-actor-status'),time>=20000?l('Task complete · authoritative Actor','任务完成 · 权威 Actor'):time>=8000&&time<10800?l('t+1 · admitting ready evidence','t+1 · 接收已完成证据'):time>=16000&&time<18800?l('t+2 · admitting ready evidence','t+2 · 接收已完成证据'):l('One continuing mainline','一条持续推进的主线'));
  }
  function renderDemo(){
    demoStep=reduced.matches?5:Math.min(5,Math.floor(waveElapsed/phaseDuration));
    const current=demo[demoStep];waveFilm.dataset.phase=String(demoStep);
    document.getElementById('demo-count').textContent=['I','II','III','IV','V','VI'][demoStep]+' / VI';
    document.getElementById('wave-title').textContent=l(...current.title);
    document.getElementById('demo-description').textContent=l(...waveCaptions[demoStep]);
    document.getElementById('wave-actor-status').textContent=demoStep===5?l('Task complete · authoritative Actor','任务完成 · 权威 Actor'):l('One continuing mainline','一条持续推进的主线');
    waveLanes[0].dataset.state=demoStep===5?'admitted':'pending';
    const names=[['Catalog inspection','目录检查'],['Policy inspection','政策检查'],['Slow diagnostic','慢速诊断']];
    current.s.forEach((state,i)=>{
      const lane=waveLanes[i+1];lane.dataset.state=['pending','ready','admitted','cancelled'][state];
      lane.querySelector('.wave-work').textContent=l(...names[i]);
      lane.querySelector('.wave-status').textContent=[l('Pending Future','未完成 Future'),l('Ready · retained','完成 · 待接收'),l('Admitted / reviewed','已接收 / 已审阅'),l('Cancelled · cleanup','已取消 · 清理')][state];
    });
    document.getElementById('wave-empty').textContent=l('No older ready observation admitted yet.','尚未接收早先已完成的观察。');
    ['wave-catalog','wave-policy','wave-duplicate'].forEach((id,i)=>{
      const entry=document.getElementById(id);entry.textContent=l(...waveRecords[i]);
    });
    const transcript=document.getElementById('wave-transcript-list');
    [...transcript.children].forEach((item,i)=>{item.querySelector('h4').textContent=l(...demo[i].title);item.querySelector('p').textContent=l(...demo[i].description);});
    updateWaveMotion();
  }
  function stopPlay(){
    if(waveFrameId!==undefined)cancelAnimationFrame(waveFrameId);
    waveFrameId=undefined;waveLastTime=undefined;waveFilm.dataset.running='false';
  }
  function resetWave(){stopPlay();waveElapsed=0;renderDemo();}
  function waveIsActive(){
    if(!chronicle.open||document.getElementById('demo').hidden||!waveVisible||document.hidden||reduced.matches||waveElapsed>=waveDuration)return false;
    const actor=waveRails[0].getBoundingClientRect(),head=chronicle.querySelector('.chronicle-head').getBoundingClientRect();
    return actor.top+parseFloat(getComputedStyle(waveRails[0].querySelector('.wave-orb')).top)>head.bottom+4;
  }
  function waveFrame(time){
    waveFrameId=undefined;
    if(!waveIsActive()){stopPlay();return;}
    if(waveLastTime!==undefined)waveElapsed=Math.min(waveDuration,waveElapsed+Math.max(0,Math.min(250,time-waveLastTime)));
    waveLastTime=time;
    const next=Math.min(5,Math.floor(waveElapsed/phaseDuration));
    if(next!==demoStep)renderDemo();else updateWaveMotion();
    if(waveElapsed>=waveDuration){stopPlay();renderDemo();return;}
    waveFrameId=requestAnimationFrame(waveFrame);
  }
  function syncWave(){
    if(!waveIsActive()){stopPlay();return;}
    if(waveFrameId!==undefined)return;
    waveFilm.dataset.running='true';waveLastTime=undefined;waveFrameId=requestAnimationFrame(waveFrame);
  }
  function applyLanguage(next,persist=true){
    language=next;document.documentElement.lang=language==='zh'?'zh-Hans':'en';document.body.dataset.language=language;
    document.querySelectorAll('[data-i18n]').forEach(el=>{const value=copies?.[language]?.[el.dataset.i18n];if(typeof value==='string')el.textContent=value;});
    langButton.textContent=language==='en'?'中文':'English';langButton.hidden=false;langButton.setAttribute('aria-label',language==='en'?'Switch to Chinese':'切换为英文');
    const mathLabels={domains:['Disjoint tool domain','互斥工具域'],complement:['Remaining legal domain','剩余合法参数域'],ledger:['Ready evidence admission','已完成证据接收']};
    document.querySelectorAll('.math-equation').forEach(row=>{const label=mathLabels[row.dataset.formula];if(label)row.querySelector('.math-expression').setAttribute('aria-label',l(...label));});
    if(persist)try{localStorage.setItem(languageKey,language);}catch{}
    renderTables();renderDemo();syncWave(); if (window.requestOdysseyFrame) window.requestOdysseyFrame();
  }
  const scenes=[
    {id:'summons',anchor:[.10,.579],camera:[.5,.5,.92]},
    {id:'horizon',anchor:[.252,.777],camera:[.26,.61,1.12]},
    {id:'frontier',anchor:[.362,.871],camera:[.43,.63,1.17]},
    {id:'aid',anchor:[.534,.772],camera:[.68,.66,1.16]},
    {id:'futures',anchor:[.674,.827],camera:[.62,.69,1.19]},
    {id:'reflection',anchor:[.822,.635],camera:[.80,.60,1.18]},
    {id:'trial',anchor:[.867,.466],camera:[.85,.46,1.20]},
    {id:'testimony',anchor:[.877,.306],camera:[.84,.35,1.12]}
  ];
  // The manuscript does not equate map distance with elapsed execution time.
  const beats=[...document.querySelectorAll('.story-beat')];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const plane=document.querySelector('.map-plane'),walker=document.querySelector('.walker');
  const route=document.getElementById('hero-route'),trail=document.querySelector('.route-progress');
  const routeLength=route.getTotalLength();trail.style.strokeDasharray=String(routeLength);
  const fractions=scenes.map(scene=>{
    let best=0,distance=Infinity;
    for(let i=0;i<=600;i++){const p=route.getPointAtLength(routeLength*i/600),d=(p.x/1672-scene.anchor[0])**2+(p.y/941-scene.anchor[1])**2;if(d<distance){distance=d;best=i/600;}}
    return best;
  });
  const textureImages=[...plane.querySelectorAll('img')];
  const textureByName=new Map(textureImages.map(img=>[new URL(img.src).pathname.split('/').pop(),img]));
  const textureRequests=new WeakMap(),textureQueue=[];
  const sceneTextureNames=[
    ['perseus-initial.png','polydectes.png'],
    ['perseus-initial.png','polydectes.png'],
    ['perseus-initial.png'],
    ['perseus-equipped.png','athena.png','hermes.png','nymph.png'],
    ['perseus-equipped.png','hades.png'],
    ['perseus-equipped.png','medusa-shadow.png'],
    ['perseus-equipped.png','medusa-shadow.png'],
    ['perseus-equipped.png']
  ];
  let textureJobs=0,worldReady=false,lastTextureScene=-1;
  const textureDelay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function waitForTexture(img,retry,original){
    return new Promise((resolve,reject)=>{
      let timeout,settled=false;
      function finish(error){if(settled)return;settled=true;clearTimeout(timeout);img.removeEventListener('load',loaded);img.removeEventListener('error',failed);error?reject(error):resolve();}
      const loaded=()=>img.decode().then(()=>finish(),failed),failed=()=>finish(new Error('Texture unavailable'));
      img.addEventListener('load',loaded);img.addEventListener('error',failed);
      timeout=setTimeout(()=>finish(new Error('Texture timed out')),12000);
      img.loading='eager';
      if(retry){const url=new URL(original,location.href);url.searchParams.set('retry',String(retry));img.src=url.href;}
      if(img.complete){if(img.naturalWidth>0)loaded();else if(!retry)failed();}
    });
  }
  async function decodeTexture(img){
    const original=img.getAttribute('src');img.dataset.textureRequested='true';img.closest('.cast')?.classList.add('texture-requested');
    for(let retry=0;retry<3;retry++){
      try{
        if(retry)await textureDelay(retry===1?400:1200);
        await waitForTexture(img,retry,original);
        img.dataset.textureReady='true';img.removeAttribute('data-texture-failed');return true;
      }catch{}
    }
    img.dataset.textureFailed='true';return false;
  }
  function drainTextureQueue(){
    while(textureJobs<2&&textureQueue.length){
      const job=textureQueue.shift();textureJobs++;
      decodeTexture(job.img).then(job.resolve).finally(()=>{textureJobs--;drainTextureQueue();});
    }
  }
  function requestTexture(img,priority=1){
    if(!img)return Promise.resolve(false);
    if(textureRequests.has(img)){
      const queued=textureQueue.find(job=>job.img===img);
      if(queued&&priority<queued.priority){queued.priority=priority;textureQueue.sort((a,b)=>a.priority-b.priority);}
      return textureRequests.get(img);
    }
    const promise=new Promise(resolve=>textureQueue.push({img,priority,resolve}));
    textureRequests.set(img,promise);textureQueue.sort((a,b)=>a.priority-b.priority);drainTextureQueue();return promise;
  }
  const mapImage=document.querySelector('.map-image');
  let mapTextureReady=requestTexture(mapImage,0);
  function requestSceneTextures(index){
    if(index!==lastTextureScene){
      lastTextureScene=index;
      if(mapImage.dataset.textureFailed){textureRequests.delete(mapImage);mapTextureReady=requestTexture(mapImage,0);}
      sceneTextureNames[index].forEach(name=>{const img=textureByName.get(name);if(img?.dataset.textureFailed)textureRequests.delete(img);});
    }
    const needed=sceneTextureNames[index].map(name=>requestTexture(textureByName.get(name),0));
    if(!worldReady)Promise.all([mapTextureReady,...needed]).then(results=>{
      // Text stays available if a connection fails; never reveal an undecoded map.
      if(results[0]&&!worldReady&&index===currentScene){worldReady=true;document.documentElement.classList.add('world-ready');requestFrame();}
    });
    else if(index<scenes.length-1)sceneTextureNames[index+1].forEach(name=>requestTexture(textureByName.get(name),2));
  }
  const imageRecoveries=new WeakMap();
  function resetImageRecovery(img,source){
    const old=imageRecoveries.get(img);if(old)clearTimeout(old.timer);
    imageRecoveries.set(img,{source,retries:0,timer:undefined});
  }
  // A reused lightbox image must not inherit another figure's delayed retry.
  document.querySelectorAll('img').forEach(img=>{
    if(textureImages.includes(img))return;
    resetImageRecovery(img,img.getAttribute('src'));
    const recover=()=>{
      const state=imageRecoveries.get(img);if(!state.source||state.retries>=2)return;state.retries++;
      state.timer=setTimeout(()=>{if(imageRecoveries.get(img)!==state)return;const url=new URL(state.source,location.href);url.searchParams.set('retry',String(state.retries));img.src=url.href;},state.retries*500);
    };
    img.addEventListener('error',recover);
    if(img.complete&&!img.naturalWidth&&img.getAttribute('src'))recover();
  });
  let framePending=false,currentScene=0;
  function renderWorld(){
    framePending=false;const y=window.scrollY;let lower=0;
    for(let i=0;i<beats.length;i++)if(beats[i].offsetTop<=y)lower=i;
    const span=lower<beats.length-1?beats[lower+1].offsetTop-beats[lower].offsetTop:beats[lower].offsetHeight;
    const t=lower===beats.length-1?0:Math.min(1,Math.max(0,(y-beats[lower].offsetTop)/span));
    const position=lower+t,index=Math.min(7,Math.round(position));currentScene=index;
    document.body.dataset.scene=String(index);
    requestSceneTextures(index);
    const cameraT=reduced.matches?0:t,first=scenes[reduced.matches?index:lower].camera,last=scenes[Math.min(7,lower+1)].camera;
    const camera=first.map((v,i)=>v+(last[i]-v)*cameraT);
    const w=innerWidth,h=innerHeight;const baseW=Math.max(w,h*1672/941),baseH=baseW*941/1672;
    const portrait=w<=850;
    const fit=Math.min(w/baseW,h/baseH);
    const zoom=portrait?.58:(reduced.matches&&index===0?fit:lower===0?fit+(scenes[1].camera[2]-fit)*t:camera[2]);
    // Framing deliberately follows the route; the complete atlas remains available.
    const progress=reduced.matches?fractions[index]:fractions[lower]+(fractions[Math.min(7,lower+1)]-fractions[lower])*t;
    const point=route.getPointAtLength(routeLength*progress);
    const focusX=portrait?point.x/1672:camera[0];
    const focusY=portrait?point.y/941:camera[1];
    const screenX=.5,screenY=portrait?.91:.56;
    plane.style.width=baseW+'px';plane.style.height=baseH+'px';
    const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
    const tx=portrait?w*screenX-focusX*baseW*zoom:baseW*zoom<w?(w-baseW*zoom)/2:clamp(w*screenX-focusX*baseW*zoom,w-baseW*zoom,0);
    const ty=portrait?h*screenY-focusY*baseH*zoom:baseH*zoom<h?(h-baseH*zoom)/2:clamp(h*screenY-focusY*baseH*zoom,h-baseH*zoom,0);
    plane.style.transform=`translate(${tx}px,${ty}px) scale(${zoom})`;
    walker.style.left=(point.x/1672*100)+'%';walker.style.top=(point.y/941*100)+'%';
    trail.style.strokeDashoffset=String(routeLength*(1-progress));
    document.documentElement.style.setProperty('--night',index===5?'.50':index===6?'.78':'0');
    document.querySelectorAll('.chapter-tick').forEach((a,i)=>{a.classList.toggle('active',i===index);if(i===index)a.setAttribute('aria-current','step');else a.removeAttribute('aria-current');});
    document.querySelector('.journey-current').textContent=['I','II','III','IV','V','VI','VII','VIII'][index]+' / VIII';
    beats.forEach((beat,i)=>beat.classList.toggle('is-current',i===index));
  }
  function requestFrame(){if(!framePending){framePending=true;requestAnimationFrame(renderWorld);}}
  window.requestOdysseyFrame=requestFrame;
  let settleTimer,arrivalTimer,arrivedScene=0,promptedScene=-1,navigationIntent=false,touching=false;
  const modalOpen=()=>!!document.querySelector('dialog[open]');
  function cancelArrival(){clearTimeout(arrivalTimer);clearTimeout(settleTimer);}
  function syncModalState(){
    const open=modalOpen();document.documentElement.classList.toggle('modal-open',open);
    document.body.classList.toggle('archive-open',open);if(open)cancelArrival();
  }
  function settleJourney(){
    if(modalOpen()||touching||document.hidden||header.classList.contains('menu-open'))return;
    const y=scrollY,index=beats.reduce((best,beat,i)=>Math.abs(beat.offsetTop-y)<Math.abs(beats[best].offsetTop-y)?i:best,0);
    const target=Math.min(beats[index].offsetTop,Math.max(0,document.documentElement.scrollHeight-innerHeight));
    // Native scroll snapping handles gesture direction; this also settles restored positions.
    if(Math.abs(target-y)>2){window.scrollTo({top:target,behavior:reduced.matches?'instant':'smooth'});return;}
    if(index!==arrivedScene){arrivedScene=index;promptedScene=-1;}
    if(navigationIntent&&location.hash!=='#scene-'+scenes[index].id)history.replaceState(null,'','#scene-'+scenes[index].id);
    requestFrame();
    if(!navigationIntent||index===0||promptedScene===index)return;
    arrivalTimer=setTimeout(()=>{
      if(modalOpen()||touching||document.hidden||header.classList.contains('menu-open')||Math.abs(scrollY-target)>2)return;
      const opener=beats[index].querySelector('[data-open-archive]');
      if(!opener)return;
      promptedScene=index;navigationIntent=false;
      openArchive(opener.dataset.openArchive,opener,opener.dataset.resultTab,false);
    },1800);
  }
  function scheduleSettle(){clearTimeout(settleTimer);settleTimer=setTimeout(settleJourney,220);}
  function recordIntent(){if(modalOpen())return;navigationIntent=true;cancelArrival();}
  window.addEventListener('wheel',recordIntent,{passive:true});
  window.addEventListener('touchstart',()=>{touching=true;recordIntent();},{passive:true});
  window.addEventListener('touchend',()=>{touching=false;scheduleSettle();},{passive:true});
  window.addEventListener('touchcancel',()=>{touching=false;scheduleSettle();},{passive:true});
  window.addEventListener('keydown',e=>{
    if(!['ArrowDown','ArrowUp','PageDown','PageUp','Home','End',' '].includes(e.key)||e.target.closest('button,input,select,textarea,[contenteditable]'))return;
    recordIntent();
  });
  document.querySelectorAll('a[href^="#scene-"]').forEach(a=>a.addEventListener('click',()=>{navigationIntent=true;cancelArrival();scheduleSettle();}));
  window.addEventListener('scroll',()=>{requestFrame();if(!modalOpen()){clearTimeout(arrivalTimer);scheduleSettle();}},{passive:true});
  window.addEventListener('scrollend',()=>{if(!modalOpen())scheduleSettle();},{passive:true});
  window.addEventListener('resize',()=>{cancelArrival();navigationIntent=false;requestFrame();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelArrival();navigationIntent=false;}});
  reduced.addEventListener?.('change',requestFrame);
  langButton.addEventListener('click',()=>{cancelArrival();navigationIntent=false;stopPlay();applyLanguage(language==='en'?'zh':'en');updateChronicleContext();requestFrame();});
  menuButton.addEventListener('click',()=>{cancelArrival();navigationIntent=false;const open=header.classList.toggle('menu-open');menuButton.setAttribute('aria-expanded',String(open));});
  document.querySelectorAll('.chapter-nav a').forEach(a=>a.addEventListener('click',()=>{header.classList.remove('menu-open');menuButton.setAttribute('aria-expanded','false');}));
  const tabs=[...document.querySelectorAll('[role="tab"]')];
  function activateTab(button,focus=false){tabs.forEach(tab=>{const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;});if(focus)button.focus();}
  tabs.forEach((button,index)=>{button.addEventListener('click',()=>activateTab(button));button.addEventListener('keydown',e=>{let target;if(e.key==='ArrowRight')target=(index+1)%tabs.length;else if(e.key==='ArrowLeft')target=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')target=0;else if(e.key==='End')target=tabs.length-1;else return;e.preventDefault();activateTab(tabs[target],true);});});
  document.querySelectorAll('[data-metric]').forEach(button=>button.addEventListener('click',()=>{metric=button.dataset.metric;document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderTables();}));
  document.addEventListener('visibilitychange',syncWave);
  const chronicle=document.getElementById('chronicle-dialog'),archiveBody=document.getElementById('chronicle-body'),source=document.getElementById('chronicle-source');
  const archiveSections=[...source.querySelectorAll(':scope > .section')];archiveSections.forEach(section=>archiveBody.append(section));
  const archiveIds=['method','demo','results','case','reference'];let archiveOpener,returnHash,selectedArchive='';
  function chooseArchive(id,tab){
    const restart=id==='demo'&&(selectedArchive!=='demo'||!chronicle.open);selectedArchive=id;
    archiveSections.forEach(section=>section.hidden=section.id!==id);
    document.querySelectorAll('[data-archive-target]').forEach(b=>b.setAttribute('aria-current',b.dataset.archiveTarget===id?'page':'false'));
    if(tab){const button=document.getElementById('tab-'+tab);if(button)activateTab(button);}
    chronicle.scrollTop=0;if(restart){resetWave();if(chronicle.open)requestAnimationFrame(frameWaveView);}else renderDemo();syncWave();
  }
  function frameWaveView(){
    if(!chronicle.open||document.getElementById('demo').hidden)return;
    const head=chronicle.querySelector('.chronicle-head').getBoundingClientRect(),caption=waveFilm.querySelector('.wave-caption').getBoundingClientRect();
    chronicle.scrollTop=Math.max(0,chronicle.scrollTop+caption.top-head.bottom-24);
    updateWavePaths();syncWave();
  }
  function updateChronicleContext(){const context=document.getElementById('chronicle-context');context.hidden=currentScene===0;context.textContent=['I','II','III','IV','V','VI','VII','VIII'][currentScene]+' · '+(copies?.[language]?.['sceneTitle'+currentScene]||'');}
  function openArchive(id,opener,tab,push=true){
    if(!archiveIds.includes(id))return;
    cancelArrival();navigationIntent=false;
    const origin=opener?.closest('.story-beat')?.dataset.sceneIndex;
    if(origin!==undefined)currentScene=Number(origin);
    arrivedScene=currentScene;promptedScene=currentScene;
    archiveOpener=opener||beats[currentScene].querySelector('[data-open-archive]')||beats[currentScene].querySelector('h1,h2');
    if(!chronicle.open)returnHash='#scene-'+scenes[currentScene].id;
    chooseArchive(id,tab);updateChronicleContext();if(!chronicle.open)chronicle.showModal();syncModalState();if(id==='demo')frameWaveView();syncWave();
    if(push)history.pushState({archive:id},'', '#'+id);
  }
  document.querySelectorAll('[data-open-archive]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();openArchive(a.dataset.openArchive,a,a.dataset.resultTab);}));
  document.querySelectorAll('[data-archive-target]').forEach(b=>b.addEventListener('click',()=>{chooseArchive(b.dataset.archiveTarget);history.replaceState({archive:b.dataset.archiveTarget},'', '#'+b.dataset.archiveTarget);}));
  chronicle.querySelector('.close-chronicle').addEventListener('click',()=>chronicle.close());
  chronicle.addEventListener('close',()=>{cancelArrival();navigationIntent=false;stopPlay();renderDemo();syncModalState();if(archiveIds.includes(location.hash.slice(1)))history.replaceState(null,'',returnHash||'#scene-'+scenes[currentScene].id);archiveOpener?.focus({preventScroll:true});});
  const atlas=document.getElementById('atlas-dialog');
  document.querySelector('.atlas-trigger').hidden=false;
  document.querySelector('.atlas-trigger').addEventListener('click',()=>{navigationIntent=false;atlas.showModal();syncModalState();});
  atlas.querySelector('.close-atlas').addEventListener('click',()=>atlas.close());atlas.addEventListener('close',syncModalState);
  atlas.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>atlas.close()));
  const dialog=document.getElementById('figure-dialog'),image=document.getElementById('enlarged-figure');
  document.querySelectorAll('.zoom-figure').forEach(link=>link.addEventListener('click',e=>{if(typeof dialog.showModal!=='function')return;e.preventDefault();zoomOpener=link;resetImageRecovery(image,link.href);image.src=link.href;image.alt=link.querySelector('img').alt;dialog.showModal();syncModalState();}));
  dialog.querySelector('.close-lightbox').addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{resetImageRecovery(image,null);syncModalState();zoomOpener?.focus({preventScroll:true});});
  function handleHash(){const id=location.hash.slice(1),legacy={myth:'summons',philosophy:'horizon',main:'summons'};if(archiveIds.includes(id)){openArchive(id,null,null,false);return;}if(chronicle.open)chronicle.close();if(legacy[id])document.getElementById('scene-'+legacy[id]).scrollIntoView({behavior:'instant'});requestFrame();}
  window.addEventListener('hashchange',handleHash);window.addEventListener('popstate',handleHash);
  const waveViewParts=new Map();
  const waveObserver=new IntersectionObserver(entries=>{entries.forEach(entry=>waveViewParts.set(entry.target,entry.isIntersecting&&entry.intersectionRatio>=.6));waveVisible=!!waveViewParts.get(waveIntake)&&!!waveViewParts.get(waveLanes[1]);updateWavePaths();syncWave();},{root:chronicle,threshold:[0,.6]});
  waveObserver.observe(waveIntake);waveObserver.observe(waveLanes[1]);chronicle.addEventListener('scroll',syncWave,{passive:true});
  const waveLayoutObserver=new ResizeObserver(()=>{updateWavePaths();updateWaveMotion();});waveLayoutObserver.observe(waveReel);
  const mathLayoutObserver=new ResizeObserver(entries=>entries.forEach(({target})=>{target.parentElement.querySelector('.math-scroll-note').hidden=target.scrollWidth<=target.clientWidth+1;}));
  document.querySelectorAll('.math-expression').forEach(expression=>mathLayoutObserver.observe(expression));
  reduced.addEventListener?.('change',()=>{stopPlay();waveElapsed=0;renderDemo();syncWave();});
  document.querySelector('.wave-transcript').open=false;
  document.documentElement.classList.remove('no-js');document.documentElement.classList.add('enhanced');
  applyLanguage(language,false);
  const initialScene=scenes.findIndex(scene=>'#scene-'+scene.id===location.hash);
  if(initialScene>=0)beats[initialScene].scrollIntoView({behavior:'instant'});
  renderWorld();handleHash();
  if(location.hash.startsWith('#scene-')){navigationIntent=true;scheduleSettle();}
})();
