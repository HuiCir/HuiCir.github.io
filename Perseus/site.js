(() => {
  'use strict';
  const data = window.PERSEUS_DATA;
  const copies = window.PERSEUS_COPY;
  const header = document.querySelector('.project-header');
  const langButton = document.querySelector('.lang-toggle');
  const menuButton = document.querySelector('.menu-toggle');
  let language = 'en', metric = 'ts', demoStep = 0, playTimer, zoomOpener;
  try { language = localStorage.getItem('perseus-site-language') || localStorage.getItem('academic-homepage-language') || 'en'; } catch {}
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
  function renderDemo() {
    const current=demo[demoStep];const stages=document.getElementById('demo-stages');stages.replaceChildren();
    demo.forEach((step,index)=>{const button=node('button',l(...step.title),'demo-stage'+(index===demoStep?' active':''));button.type='button';button.setAttribute('aria-pressed',String(index===demoStep));button.addEventListener('click',()=>{stopPlay();demoStep=index;renderDemo();});stages.append(button);});
    document.getElementById('demo-count').textContent=l('Step ','步骤 ')+(demoStep+1)+' / '+demo.length;
    const actor=document.getElementById('actor-track');actor.replaceChildren();
    ['A(t)',l('Native tools','原生工具'),'A(t+1)',l('Native tools','原生工具'),'A(t+2)',l('Complete','完成')].forEach((text,i)=>actor.append(node('div',text,'demo-step'+(i===current.actor?' active':'')+(i<current.actor?' ready':''))));
    current.s.forEach((state,index)=>{const target=document.getElementById('s'+(index+1)+'-track');target.replaceChildren();
      const task=[l('Catalog inspection','目录检查'),l('Policy inspection','政策检查'),l('Slow diagnostic','慢速诊断')][index];
      target.append(node('div',task,'demo-step'));
      target.append(node('div',[l('Pending Future','未完成 Future'),l('Ready','已完成'),l('Admitted / reviewed','已接收 / 已审阅'),l('Cancelled · cleanup','已取消 · 清理')][state],'demo-step '+(state===0?'pending':state===3?'cancelled':'ready')));
    });
    const ledger=document.getElementById('ledger-entries');ledger.replaceChildren();
    if(current.ledger===0)ledger.append(node('p',l('No older ready observation admitted yet.','尚未接收早先已完成的观察。'),'ledger-empty'));
    if(current.ledger>=1)ledger.append(node('div',l('Catalog record · source identity retained · independent copy S₁','目录记录 · 保留来源身份 · 独立副本 S₁'),'ledger-entry'));
    if(current.ledger>=2){ledger.append(node('div',l('Policy record · new evidence · independent copy S₂','政策记录 · 新证据 · 独立副本 S₂'),'ledger-entry'));ledger.append(node('div',l('Known catalog duplicate · reviewed, not appended twice','已知目录重复 · 已审阅，不重复追加'),'ledger-entry deduplicated'));}
    document.getElementById('demo-description').textContent=l(...current.description);
    document.getElementById('demo-play').textContent=playTimer?l('Pause Ⅱ','暂停 Ⅱ'):l('Play →','播放 →');
  }
  function stopPlay(){if(playTimer)clearInterval(playTimer);playTimer=undefined;}
  function applyLanguage(next,persist=true){
    language=next;document.documentElement.lang=language==='zh'?'zh-Hans':'en';document.body.dataset.language=language;
    document.querySelectorAll('[data-i18n]').forEach(el=>{const value=copies?.[language]?.[el.dataset.i18n];if(typeof value==='string')el.textContent=value;});
    langButton.textContent=language==='en'?'中文':'English';langButton.hidden=false;langButton.setAttribute('aria-label',language==='en'?'Switch to Chinese':'切换为英文');
    if(persist)try{localStorage.setItem('perseus-site-language',language);}catch{}
    renderTables();renderDemo();
  }
  langButton.addEventListener('click',()=>applyLanguage(language==='en'?'zh':'en'));
  menuButton.addEventListener('click',()=>{const open=header.classList.toggle('menu-open');menuButton.setAttribute('aria-expanded',String(open));});
  document.querySelectorAll('.project-header nav a').forEach(a=>a.addEventListener('click',()=>{header.classList.remove('menu-open');menuButton.setAttribute('aria-expanded','false');}));
  const tabs=[...document.querySelectorAll('[role="tab"]')];
  function activateTab(button,focus=false){tabs.forEach(tab=>{const selected=tab===button;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;document.getElementById(tab.getAttribute('aria-controls')).hidden=!selected;});if(focus)button.focus();}
  tabs.forEach((button,index)=>{button.addEventListener('click',()=>activateTab(button));button.addEventListener('keydown',e=>{let target;if(e.key==='ArrowRight')target=(index+1)%tabs.length;else if(e.key==='ArrowLeft')target=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')target=0;else if(e.key==='End')target=tabs.length-1;else return;e.preventDefault();activateTab(tabs[target],true);});});
  document.querySelectorAll('[data-metric]').forEach(button=>button.addEventListener('click',()=>{metric=button.dataset.metric;document.querySelectorAll('[data-metric]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));renderTables();}));
  document.getElementById('demo-play').addEventListener('click',()=>{if(playTimer){stopPlay();renderDemo();return;}if(demoStep===demo.length-1)demoStep=0;playTimer=setInterval(()=>{demoStep++;if(demoStep>=demo.length-1){demoStep=demo.length-1;stopPlay();}renderDemo();},1900);renderDemo();});
  document.getElementById('demo-reset').addEventListener('click',()=>{stopPlay();demoStep=0;renderDemo();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stopPlay();renderDemo();}});
  const dialog=document.getElementById('figure-dialog'),image=document.getElementById('enlarged-figure');
  document.querySelectorAll('.zoom-figure').forEach(link=>link.addEventListener('click',e=>{if(typeof dialog.showModal!=='function')return;e.preventDefault();zoomOpener=link;image.src=link.href;image.alt=link.querySelector('img').alt;dialog.showModal();}));
  dialog.querySelector('.close-lightbox').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
  dialog.addEventListener('close',()=>zoomOpener?.focus());
  applyLanguage(language,false);
})();
