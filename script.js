const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const modal=$("#projectModal"), modalContent=$("#modalContent"), grid=$("#projectGrid");
let runtimeTimer=null, architectureTimer=null;

function miniRuntime(p){
  const pts=(p.cardFlow||p.runtime.map(x=>x[0]).slice(0,5));
  return `<div class="mini-runtime"><div class="mini-runtime-head"><span>LIVE FLOW</span><span>BEFORE → AFTER CASE STUDY</span></div><div class="mini-runtime-flow">${pts.map((x,i)=>`${i?'<i class="mini-arrow"></i>':''}<div class="mini-node" data-mini="${i}">${esc(x)}</div>`).join("")}</div></div>`;
}
function projectCard(p){return `<article class="project-card reveal ${p.featured?'featured':''} ${p.spotlight?'spotlight':''}" data-id="${p.id}" data-cat="${esc([p.category,...(p.categories||[])].filter(Boolean).join(' '))}">
  <div class="project-top"><div><div class="project-kicker">${esc(p.kicker)}</div><div class="project-company">${esc(p.company)}</div></div><div class="project-metric"><b>${esc(p.metric)}</b><span>${esc(p.metricLabel)}</span></div></div>
  <h3>${esc(p.title)}</h3><p>${esc(p.subtitle)}</p>${miniRuntime(p)}
  <div class="project-focus"><span>${esc(p.tags[0])}</span><span>${esc(p.tags[1])}</span><span>${esc(p.tags[2])}</span></div>
  <div class="project-bottom"><small>${esc(p.scale||'Process · architecture · controls · outcome')}</small><button class="project-open">Explore case study →</button></div>
</article>`}

grid.innerHTML=window.PROJECTS.sort((a,b)=>a.order-b.order).map(projectCard).join("");

$$('.project-card').forEach(card=>{
  let idx=0,timer; const nodes=$$('.mini-node',card);
  const animate=()=>{nodes.forEach((n,i)=>n.classList.toggle('active',i===idx));idx=(idx+1)%nodes.length};
  card.addEventListener('mouseenter',()=>{idx=0;animate();timer=setInterval(animate,650)});
  card.addEventListener('mouseleave',()=>{clearInterval(timer);nodes.forEach(n=>n.classList.remove('active'))});
});

$$('#projectFilters button').forEach(btn=>btn.addEventListener('click',()=>{
  $$('#projectFilters button').forEach(b=>b.classList.remove('active'));btn.classList.add('active');
  const f=btn.dataset.filter;
  $$('.project-card').forEach(c=>c.classList.toggle('hidden',f!=='all'&&!c.dataset.cat.split(' ').includes(f)));
}));

function runtimeHTML(p){return `<div class="runtime-shell">
  <div class="runtime-toolbar"><span>LIVE TARGET-STATE PROCESS · ${p.runtime.length} STAGES</span><div class="runtime-controls"><button data-runtime="play">▶ Play</button><button data-runtime="pause">Ⅱ Pause</button><button data-runtime="reset">↺ Reset</button></div></div>
  <div class="runtime-track" style="--runtime-count:${p.runtime.length}"><div class="runtime-line"><i id="runtimeProgress"></i><em id="runtimePacket"></em></div>${p.runtime.map((s,i)=>`<div class="runtime-node ${i===0?'active':''}" data-runtime-node="${i}"><div class="dot"></div><b>${esc(s[0])}</b><small>${esc(s[1])}</small></div>`).join("")}</div>
  <div class="runtime-detail"><span id="runtimeStep">STEP 01</span><div><b id="runtimeTitle">${esc(p.runtime[0][0])} · ${esc(p.runtime[0][1])}</b><p id="runtimeText">${esc(p.runtime[0][2])}</p></div></div>
</div>`}

function architectureHTML(p){return `<div class="architecture-shell">
  <div class="architecture-head"><span>TARGET-STATE SYSTEM ARCHITECTURE</span><div><i></i> ACTIVE FLOW</div></div>
  <div class="architecture-flow" style="--arch-count:${p.architecture.length}">${p.architecture.map((a,i)=>`${i?'<div class="arch-link"><i></i><i></i></div>':''}<button class="arch-layer ${i===0?'active':''}" data-arch-node="${i}"><small>${esc(a[0])}</small><b>${esc(a[1])}</b><span>${esc(a[2])}</span></button>`).join('')}</div>
  <div class="architecture-detail"><span id="archStep">LAYER 01</span><div><b id="archTitle">${esc(p.architecture[0][0])} · ${esc(p.architecture[0][1])}</b><p id="archText">${esc(p.architecture[0][2])}</p></div></div>
</div>`}

function smallArch(title,items,kind){return `<div class="state-arch ${kind}"><div class="state-arch-head"><span>${esc(title)}</span><b>${kind==='before'?'CURRENT':'TARGET'}</b></div><div class="state-arch-flow">${items.map((x,i)=>`${i?'<i class="state-arrow">→</i>':''}<span>${esc(x)}</span>`).join('')}</div></div>`}
function transformationHTML(p){return `<div class="transformation-shell">
  <div class="state-compare">
    <div class="state-panel before"><small>BEFORE</small><h3>Current-state operating pattern</h3><ul>${p.before.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${smallArch('Current-state architecture',p.beforeArchitecture,'before')}</div>
    <div class="change-bridge"><span>REDESIGN</span><i></i><b>→</b></div>
    <div class="state-panel after"><small>AFTER</small><h3>Target-state operating model</h3><ul>${p.after.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${smallArch('Target-state architecture',p.afterArchitecture,'after')}</div>
  </div>
  <div class="architecture-change"><span>WHAT CHANGED IN THE ARCHITECTURE</span><div>${p.architectureChange.map((x,i)=>`<article><b>${String(i+1).padStart(2,'0')}</b><p>${esc(x)}</p></article>`).join('')}</div></div>
</div>`}

function toolingHTML(p){return `<div class="tooling-layout">
  <div><div class="modal-section-title">TOOLS & TECHNOLOGIES</div><div class="tool-group-grid">${p.toolGroups.map(g=>`<article><small>${esc(g[0])}</small><div>${g[1].map(t=>`<span>${esc(t)}</span>`).join('')}</div></article>`).join('')}</div></div>
  <div><div class="modal-section-title">DELIVERY ARTIFACTS</div><div class="artifact-grid">${p.artifacts.map((a,i)=>`<span><b>${String(i+1).padStart(2,'0')}</b>${esc(a)}</span>`).join('')}</div></div>
  <div><div class="modal-section-title">KEY DESIGN / DELIVERY DECISIONS</div><div class="decision-list">${p.decisions.map(d=>`<div><i>✓</i><p>${esc(d)}</p></div>`).join('')}</div></div>
</div>`}

function overviewHTML(p){return `<div class="executive-grid">
  <article><small>BUSINESS CHALLENGE</small><p>${esc(p.problem)}</p></article>
  <article><small>MY RESPONSIBILITY</small><p>${esc(p.roleSummary)}</p></article>
  <article><small>SCALE / CONTEXT</small><p>${esc(p.scale)}</p></article>
</div>
<div class="overview-outcome"><small>OUTCOME</small><b>${esc(p.metric)} · ${esc(p.metricLabel)}</b><p>${esc(p.impact)}</p></div>`}

function openProject(id){
  clearInterval(runtimeTimer); clearInterval(architectureTimer); runtimeTimer=null; architectureTimer=null;
  const p=window.PROJECTS.find(x=>x.id===id); if(!p)return;
  modalContent.innerHTML=`<div class="modal-hero"><div class="modal-kicker">${esc(p.kicker)} · ${esc(p.company)}</div><h2 id="modalTitle">${esc(p.title)}</h2><p>${esc(p.subtitle)}</p><div class="modal-scope"><span>${esc(p.metric)} · ${esc(p.metricLabel)}</span><span>${esc(p.scale)}</span></div><div class="modal-meta">${p.tags.map(t=>`<span>${esc(t)}</span>`).join('')}</div></div>
  <div class="modal-body"><div class="modal-tabs"><button class="active" data-tab="overview">Overview</button><button data-tab="transform">Before → After</button><button data-tab="runtime">Live process</button><button data-tab="architecture">Architecture</button><button data-tab="contribution">My role</button><button data-tab="tooling">Tools & artifacts</button><button data-tab="impact">Business impact</button></div>
  <div class="tab-panel active" data-panel="overview"><div class="modal-section-title">EXECUTIVE CASE STUDY</div>${overviewHTML(p)}</div>
  <div class="tab-panel" data-panel="transform"><div class="modal-section-title">TRANSFORMATION — PROCESS + ARCHITECTURE</div>${transformationHTML(p)}</div>
  <div class="tab-panel" data-panel="runtime"><div class="modal-section-title">HOW THE TARGET PROCESS OPERATES</div>${runtimeHTML(p)}<div class="modal-section-title">CONTROL POINTS</div><div class="control-grid">${p.controls.map(c=>`<span>${esc(c)}</span>`).join('')}</div></div>
  <div class="tab-panel" data-panel="architecture"><div class="modal-section-title">DETAILED APPLICATION / SYSTEM VIEW</div>${architectureHTML(p)}</div>
  <div class="tab-panel" data-panel="contribution"><div class="modal-section-title">MY ROLE & CONTRIBUTION</div><div class="contribution-list">${p.contribution.map((c,i)=>`<div><b>${String(i+1).padStart(2,'0')}</b><p>${esc(c)}</p></div>`).join('')}</div></div>
  <div class="tab-panel" data-panel="tooling">${toolingHTML(p)}</div>
  <div class="tab-panel" data-panel="impact"><div class="modal-section-title">MEASURABLE OUTCOME</div><div class="impact-panel advanced"><div class="impact-big"><b>${esc(p.metric)}</b><span>${esc(p.metricLabel)}</span></div><p>${esc(p.impact)}</p><div class="impact-scope"><small>SCALE / CONTEXT</small><span>${esc(p.scale)}</span></div></div></div></div>`;
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
  setupTabs(p); setupRuntime(p); setupArchitecture(p);
}
function setupTabs(p){
  $$('.modal-tabs button',modalContent).forEach(b=>b.onclick=()=>{
    $$('.modal-tabs button',modalContent).forEach(x=>x.classList.remove('active'));b.classList.add('active');
    $$('.tab-panel',modalContent).forEach(panel=>panel.classList.toggle('active',panel.dataset.panel===b.dataset.tab));
    clearInterval(runtimeTimer);clearInterval(architectureTimer);runtimeTimer=null;architectureTimer=null;
    if(b.dataset.tab==='runtime') startRuntime(p);
    if(b.dataset.tab==='architecture') startArchitecture(p);
  });
}
function setupRuntime(p){
  const show=i=>{
    const nodes=$$('[data-runtime-node]',modalContent); nodes.forEach((n,k)=>{n.classList.toggle('active',k===i);n.classList.toggle('done',k<i)});
    const s=p.runtime[i]; $('#runtimeStep',modalContent).textContent=`STEP ${String(i+1).padStart(2,'0')}`; $('#runtimeTitle',modalContent).textContent=`${s[0]} · ${s[1]}`; $('#runtimeText',modalContent).textContent=s[2];
    const progress=p.runtime.length===1?100:(i/(p.runtime.length-1))*100; $('#runtimeProgress',modalContent).style.width=`${progress}%`; const packet=$('#runtimePacket',modalContent); if(packet)packet.style.left=`${progress}%`; modalContent.dataset.runtimeIndex=i;
  };
  $$('[data-runtime-node]',modalContent).forEach(n=>n.onclick=()=>{clearInterval(runtimeTimer);runtimeTimer=null;show(+n.dataset.runtimeNode)});
  $$('[data-runtime]',modalContent).forEach(btn=>btn.onclick=()=>{const a=btn.dataset.runtime;if(a==='play')startRuntime(p);if(a==='pause'){clearInterval(runtimeTimer);runtimeTimer=null}if(a==='reset'){clearInterval(runtimeTimer);runtimeTimer=null;show(0)}});
  modalContent._showRuntime=show;
}
function startRuntime(p){clearInterval(runtimeTimer);let i=+(modalContent.dataset.runtimeIndex||0);modalContent._showRuntime(i);runtimeTimer=setInterval(()=>{i=(i+1)%p.runtime.length;modalContent._showRuntime(i)},1550)}

function setupArchitecture(p){
  const show=i=>{
    const nodes=$$('[data-arch-node]',modalContent);nodes.forEach((n,k)=>{n.classList.toggle('active',k===i);n.classList.toggle('passed',k<i)});
    const a=p.architecture[i]; $('#archStep',modalContent).textContent=`LAYER ${String(i+1).padStart(2,'0')}`;$('#archTitle',modalContent).textContent=`${a[0]} · ${a[1]}`;$('#archText',modalContent).textContent=a[2];modalContent.dataset.archIndex=i;
  };
  $$('[data-arch-node]',modalContent).forEach(n=>n.onclick=()=>{clearInterval(architectureTimer);architectureTimer=null;show(+n.dataset.archNode)});modalContent._showArchitecture=show;
}
function startArchitecture(p){clearInterval(architectureTimer);let i=+(modalContent.dataset.archIndex||0);modalContent._showArchitecture(i);architectureTimer=setInterval(()=>{i=(i+1)%p.architecture.length;modalContent._showArchitecture(i)},1700)}

grid.addEventListener('click',e=>{const card=e.target.closest('.project-card'); if(card)openProject(card.dataset.id)});
$$('[data-close-modal]').forEach(el=>el.onclick=()=>{clearInterval(runtimeTimer);clearInterval(architectureTimer);runtimeTimer=null;architectureTimer=null;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))$('[data-close-modal]').click()});

const revealIO=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');revealIO.unobserve(e.target)}}),{threshold:.11});
$$('.reveal').forEach(el=>revealIO.observe(el));

const heroNodes=$$('.sys-node'),heroTitle=$('#heroSystemTitle'),heroText=$('#heroSystemText');
const heroCopy=[
  ['Start with the decision','Frame the business question, action owner and success measure before choosing data or algorithms.'],
  ['Engineer trustworthy data','Build repeatable ingestion, transformation and analytical models so every downstream consumer starts from the same foundation.'],
  ['Govern the evidence','Make quality, lineage, ownership and access explicit before dashboards or models consume the data.'],
  ['Model the signal','Use statistics or machine learning only where it adds predictive, prioritisation or automation value.'],
  ['Explain the action','Translate analytical output into drivers, thresholds, recommendations and an accountable business decision.'],
  ['Monitor what happens next','Track freshness, model behaviour and realised business outcomes so production evidence drives the next iteration.']
];
let heroIdx=0;function showHero(i){heroNodes.forEach((n,k)=>n.classList.toggle('active',k===i));heroTitle.textContent=heroCopy[i][0];heroText.textContent=heroCopy[i][1];heroIdx=i}heroNodes.forEach(n=>n.onclick=()=>showHero(+n.dataset.node));setInterval(()=>showHero((heroIdx+1)%heroNodes.length),2800);

const stages=$$('.process-stage');let stageIdx=0;function stageShow(i){stages.forEach((s,k)=>s.classList.toggle('active',k===i));stageIdx=i}stages.forEach(s=>s.onclick=()=>stageShow(+s.dataset.stage));setInterval(()=>stageShow((stageIdx+1)%stages.length),3200);

let counted=false;const heroProof=$('.hero-proof');const metricIO=new IntersectionObserver(es=>{if(es[0].isIntersecting&&!counted){counted=true;$$('[data-count]').forEach(el=>{const target=parseFloat(el.dataset.count),prefix=el.dataset.prefix||'',suffix=el.dataset.suffix||'',dec=String(target).includes('.')?1:0,start=performance.now(),dur=1100;function tick(now){const p=Math.min(1,(now-start)/dur),v=target*(1-Math.pow(1-p,3));el.textContent=prefix+v.toFixed(dec)+suffix;if(p<1)requestAnimationFrame(tick)}requestAnimationFrame(tick)});metricIO.disconnect()}},{threshold:.3});metricIO.observe(heroProof);
window.addEventListener('scroll',()=>{const d=document.documentElement;$('#scrollProgress').style.width=((d.scrollTop/(d.scrollHeight-d.clientHeight))*100)+'%';$('#topbar').classList.toggle('scrolled',scrollY>30)});
window.addEventListener('pointermove',e=>{const g=$('.cursor-glow');g.style.left=e.clientX+'px';g.style.top=e.clientY+'px'});
$('#year').textContent=new Date().getFullYear();

// v30 — enterprise data & AI decision-intelligence command center
const commerceJourneyData = [
  {name:'Source', scope:'connected', question:'What data is required to answer the business question?', capability:'Identify authoritative internal and external sources, their granularity, ownership and refresh behaviour before building analytical logic.', data:'Transactions · operations · finance · documents · external APIs · source owner', value:'Prevents analysis from starting with convenient data instead of decision-relevant data.'},
  {name:'Ingest', scope:'direct', question:'How do we move source data repeatably and observably?', capability:'Build batch, API and Dataflow-based ingestion patterns with metadata, retries and predictable landing behaviour.', data:'Cloud Dataflow · REST / batch · run metadata · timestamps · failure path', value:'Makes data acquisition reproducible and supportable rather than dependent on manual extracts.'},
  {name:'Validate', scope:'direct', question:'Can downstream users trust what arrived?', capability:'Profile and validate schema, completeness, freshness, ranges and reconciliation before data is promoted.', data:'Schema · nulls · duplicates · ranges · totals · freshness SLA', value:'Stops bad data upstream before it contaminates dashboards, features or model decisions.'},
  {name:'Transform', scope:'direct', question:'How do raw records become reusable business meaning?', capability:'Standardise identifiers, dates, currencies, dimensions, business rules and KPI logic into curated BigQuery / PySpark models.', data:'SQL · BigQuery · PySpark · canonical dimensions · business rules', value:'Creates one analytical foundation instead of repeated local transformation logic.'},
  {name:'Govern', scope:'direct', question:'Can we explain ownership, lineage and access?', capability:'Document dataset meaning, owners, lineage, criticality and RBAC expectations through governance practices such as DataHub.', data:'Owner · lineage · metadata · sensitivity · access · audit evidence', value:'Improves defensibility, onboarding and control as the platform scales.'},
  {name:'Analyze', scope:'direct', question:'What pattern, driver or relationship explains the business outcome?', capability:'Use SQL, Python and statistical analysis to move from descriptive KPI to root cause, segmentation and hypothesis testing.', data:'KPI trends · cohorts · distributions · correlations · root-cause slices', value:'Turns data into an explanation that leaders can challenge and act on.'},
  {name:'Model', scope:'direct', sim:'risk', question:'Can a model predict, rank or detect what matters next?', capability:'Apply propensity, anomaly detection, forecasting, classification or NLP where predictive signal can improve a decision.', data:'Features · target · baseline · validation · score · confidence', value:'Prioritises large volumes of cases and surfaces weak patterns that static reporting can miss.'},
  {name:'Explain', scope:'direct', sim:'propensity', question:'Why should a stakeholder trust and use the signal?', capability:'Pair scores with drivers, thresholds, reason codes, uncertainty and limitations so users know how the analytical result should be interpreted.', data:'Feature drivers · score bands · confidence · reason codes · model limits', value:'Turns a black-box output into a reviewable business recommendation.'},
  {name:'Decide', scope:'connected', question:'What controlled action follows from the insight?', capability:'Connect the analytical signal to a business owner, threshold, intervention, human review or strategy recommendation.', data:'Decision policy · owner · priority · intervention · expected value', value:'Prevents analytics from ending as a dashboard with no operational consequence.'},
  {name:'Monitor', scope:'direct', sim:'forecast', question:'Is the system still healthy and creating value in production?', capability:'Monitor pipeline freshness, data quality, model drift, forecast error, false positives and realised business outcomes.', data:'Freshness · DQ · precision / recall · drift · bias · outcome KPI', value:'Separates engineering failure, model degradation and business underperformance — and creates the feedback loop.'}
];

const commerceTabs = $$('#commerceTabs button');
const commercePanels = $$('[data-commerce-panel]');
let commerceViewIndex = 0;
function showCommerceView(name){
  commerceTabs.forEach((b,i)=>{const on=b.dataset.commerceView===name;b.classList.toggle('active',on);if(on) commerceViewIndex=i});
  commercePanels.forEach(p=>p.classList.toggle('active',p.dataset.commercePanel===name));
}
commerceTabs.forEach(b=>b.addEventListener('click',()=>showCommerceView(b.dataset.commerceView)));

const journeyHost = $('#commerceJourney');
const journeyLaunch = $('#journeyLaunch');
let journeyIndex = 0, journeyTimer = null;
if(journeyHost){
  journeyHost.innerHTML = commerceJourneyData.map((x,i)=>`<button class="journey-node ${x.scope} ${i===0?'active':''}" data-journey="${i}"><span>${String(i+1).padStart(2,'0')}</span><b>${esc(x.name)}</b><small>${x.scope==='direct'?'MY SCOPE':'CONNECTED'}</small></button>`).join('');
  const showJourney = i=>{
    journeyIndex=i; const x=commerceJourneyData[i];
    $$('.journey-node',journeyHost).forEach((n,k)=>{n.classList.toggle('active',k===i);n.classList.toggle('passed',k<i)});
    $('#journeyNo').textContent=String(i+1).padStart(2,'0');
    $('#journeyScope').textContent=x.scope==='direct'?'DIRECT DELIVERY SCOPE':'CONNECTED BUSINESS CAPABILITY';
    $('#journeyTitle').textContent=x.name;
    $('#journeyQuestion').textContent=x.question;
    $('#journeyCapability').textContent=x.capability;
    $('#journeyData').textContent=x.data;
    $('#journeyValue').textContent=x.value;
    if(journeyLaunch){journeyLaunch.hidden=!x.sim;journeyLaunch.dataset.target=x.sim||'';if(x.sim)journeyLaunch.textContent=`Open ${x.sim} simulation`;}
    const pct=commerceJourneyData.length===1?100:(i/(commerceJourneyData.length-1))*100;
    const prog=$('#journeyProgress'),packet=$('#journeyPacket'); if(prog)prog.style.width=pct+'%';if(packet)packet.style.left=pct+'%';
  };
  $$('.journey-node',journeyHost).forEach(n=>n.addEventListener('click',()=>{clearInterval(journeyTimer);journeyTimer=null;showJourney(+n.dataset.journey)}));
  if(journeyLaunch)journeyLaunch.addEventListener('click',()=>{showCommerceView('simulation');openSimulation(journeyLaunch.dataset.target||'risk')});
  showJourney(0);
  const journeyIO=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&!journeyTimer){journeyTimer=setInterval(()=>showJourney((journeyIndex+1)%commerceJourneyData.length),2300)}else if(!entries[0].isIntersecting&&journeyTimer){clearInterval(journeyTimer);journeyTimer=null}},{threshold:.2});
  journeyIO.observe(journeyHost);
}

const commerceSimulation = {
  risk:{
    label:'Risk & anomaly simulation', subtitle:'From high-volume transactional data to a controlled investigation or mitigation decision.',
    problem:'Large datasets contain unusual behaviour that static KPI reporting may not surface quickly enough.',
    change:'Governed features, anomaly / risk scoring, thresholds and human review create a prioritised decision path.',
    value:'Analysts focus on the cases most likely to matter while keeping false positives, explanation and outcome feedback visible.',
    kpis:[['Signal precision','broad manual search','higher-quality prioritisation'],['False-positive burden','uncontrolled alerts','threshold + review discipline'],['Time to insight','retrospective analysis','faster investigation path']],
    modes:[
      {id:'standard',label:'Standard risk flow',badge:'PRIMARY JOURNEY',before:['Manual slicing across large transactional datasets.','Unusual patterns can hide inside aggregate KPIs.','Analysts spend time deciding where to investigate first.'],after:['Governed features feed an anomaly / risk model.','Scores are paired with drivers and decision thresholds.','Material cases move into human review and measured action.'],architecture:['Transactional Sources','Quality Gate','Feature Layer','Risk / Anomaly Model','Reason Codes','Decision Threshold','Human Review','Outcome Monitor'],archCaption:'Trusted transactions → risk signal → explanation → controlled review → measured outcome',steps:[
        {name:'Business question',short:'Define the risk decision',business:'Start by defining what unusual behaviour matters and what action a high-risk signal would trigger.',data:'Risk definition · outcome label · decision owner',systems:['Decision brief','Analytics workspace'],control:'Do not build a model without a clear intervention or review path.',outcome:'The analytical target is tied to a real business decision.',archActive:['Transactional Sources']},
        {name:'Quality gate',short:'Protect model inputs',business:'Risk models amplify upstream data defects, so critical fields and reconciliations must pass first.',data:'Schema · completeness · duplicates · freshness · totals',systems:['Data quality service','BigQuery'],control:'Failed critical checks quarantine the batch before scoring.',outcome:'Only trusted records enter feature engineering.',archActive:['Transactional Sources','Quality Gate']},
        {name:'Feature layer',short:'Create behavioural signals',business:'Convert raw transactions into interpretable variables such as frequency, recency, velocity, change and peer deviation.',data:'Aggregations · trends · ratios · temporal windows',systems:['BigQuery SQL','Python feature pipeline'],control:'Feature definitions are versioned and reproducible.',outcome:'The model receives stable, business-readable signals.',archActive:['Feature Layer']},
        {name:'Score',short:'Detect unusual behaviour',business:'Use anomaly or supervised risk logic to prioritise cases by likelihood or severity.',data:'Feature vector · model version · score',systems:['Risk model','Model registry'],control:'Benchmark against a simple baseline and validate error patterns.',outcome:'Each case receives a comparable risk / anomaly signal.',archActive:['Risk / Anomaly Model']},
        {name:'Explain',short:'Show why the signal fired',business:'A stakeholder needs drivers, not only a number, before taking consequential action.',data:'Top drivers · peer comparison · reason code',systems:['Explanation layer','Analyst dashboard'],control:'No opaque escalation for material cases.',outcome:'Analysts can understand and challenge the signal.',archActive:['Reason Codes','Risk / Anomaly Model']},
        {name:'Threshold',short:'Apply decision policy',business:'Model scores and business appetite are separate. A threshold defines which cases require review.',data:'Score band · materiality · policy rule',systems:['Decision rules','Alert routing'],control:'Threshold changes are governed and auditable.',outcome:'Only decision-relevant cases become alerts.',archActive:['Decision Threshold','Reason Codes']},
        {name:'Review & act',short:'Human-controlled intervention',business:'The reviewer combines the signal with domain context before investigation or mitigation.',data:'Case evidence · analyst decision · action',systems:['Case review','Business workflow'],control:'Reviewer outcome and override reason are captured.',outcome:'The model supports rather than replaces accountable judgement.',archActive:['Human Review','Decision Threshold']},
        {name:'Monitor',short:'Learn from outcomes',business:'Production evaluation must include confirmed outcomes, false positives and business impact.',data:'Outcome · precision · drift · cycle time',systems:['Model monitor','Outcome dashboard'],control:'Degradation or drift triggers review before silent performance loss.',outcome:'Real outcomes improve the next model and decision policy.',archActive:['Outcome Monitor','Human Review']}
      ]},
      {id:'quality',label:'Data-quality exception',badge:'CONTROL SCENARIO',before:['A source change can silently distort model features.','Bad data may look like new risk behaviour.'],after:['Critical DQ checks stop the scoring path.','The issue is routed to the data owner before business alerts are created.'],architecture:['Transactional Sources','Quality Gate','Feature Layer','Risk / Anomaly Model','Data Owner','Incident Runbook','Outcome Monitor'],archCaption:'A data defect is handled as an engineering incident — not misinterpreted as business risk',steps:[
        {name:'Source arrives',short:'Unexpected schema shift',business:'A source field changes shape or population before the scoring cycle.',data:'Changed type · null spike · record-count variance',systems:['Source ingestion','Quality profiler'],control:'Compare against schema and statistical quality expectations.',outcome:'The anomaly is identified before feature generation.',archActive:['Transactional Sources','Quality Gate']},
        {name:'Gate fails',short:'Quarantine the batch',business:'The platform should prefer a delayed score to an incorrect business alert.',data:'Failed rule · affected records · run ID',systems:['Quality Gate'],control:'Critical failure blocks downstream promotion.',outcome:'The scoring path stops safely.',archActive:['Quality Gate']},
        {name:'Notify owner',short:'Route with evidence',business:'The responsible data owner receives the exact failure context rather than a generic pipeline error.',data:'Rule · sample values · lineage · source owner',systems:['Data Owner','Alerting'],control:'Ownership is defined before incidents happen.',outcome:'Diagnosis begins with enough evidence to act quickly.',archActive:['Data Owner','Quality Gate']},
        {name:'Recover',short:'Fix / backfill',business:'Correct the source mapping or transformation and backfill the affected run.',data:'Corrected mapping · validated rerun',systems:['Incident Runbook','Feature Layer'],control:'Rerun must pass the same quality gates.',outcome:'Trusted features are restored.',archActive:['Incident Runbook','Feature Layer']},
        {name:'Resume scoring',short:'Controlled restart',business:'Only after validation does the risk pipeline continue.',data:'Approved run · model version',systems:['Risk / Anomaly Model'],control:'Audit links the incident to the resumed run.',outcome:'Business alerts are based on corrected data.',archActive:['Risk / Anomaly Model','Outcome Monitor']}
      ]}
    ]
  },
  propensity:{
    label:'Propensity & opportunity simulation', subtitle:'Rank opportunities by likelihood, explain the drivers and measure whether prioritisation improves outcomes.',
    problem:'Commercial teams cannot treat every account or opportunity with the same intensity.',
    change:'A propensity score prioritises cases using governed behavioural features while keeping score bands and business policy explicit.',
    value:'Resources are directed toward higher-value opportunities and the model is measured by lift and realised outcome rather than accuracy alone.',
    kpis:[['Prioritisation','uniform treatment','ranked opportunity queue'],['Lift','no model baseline','measured improvement vs baseline'],['Explainability','opaque score','drivers + score band']],
    modes:[
      {id:'standard',label:'Opportunity prioritisation',badge:'PRIMARY JOURNEY',before:['Account prioritisation depends heavily on manual judgement.','Signals are spread across transactions and behaviours.'],after:['Features create a repeatable propensity signal.','Score bands support differentiated business action.','Outcome lift is measured against baseline.'],architecture:['Customer / Account Data','Feature Layer','Propensity Model','Score Bands','Driver Explanation','Business Queue','Outcome Monitor'],archCaption:'Behavioural data → propensity → score band → prioritised action → lift measurement',steps:[
        {name:'Define outcome',short:'What behaviour matters?',business:'Propensity modelling begins with a precise outcome and time window, not a generic “high value” label.',data:'Target event · observation window · action horizon',systems:['Decision brief'],control:'Avoid target leakage by separating observation and outcome windows.',outcome:'The target is measurable and aligned with a real action.',archActive:['Customer / Account Data']},
        {name:'Build features',short:'Represent behaviour',business:'Create recency, frequency, value, trend and interaction features using governed source data.',data:'Transaction aggregates · account attributes · trend variables',systems:['Feature Layer','BigQuery SQL'],control:'Features must exist at scoring time and remain stable.',outcome:'Each account has a reproducible analytical profile.',archActive:['Feature Layer','Customer / Account Data']},
        {name:'Train & validate',short:'Estimate likelihood',business:'Train a model and compare it with simple prioritisation baselines.',data:'Features · target · train / validation split',systems:['Propensity Model'],control:'Use lift / calibration / ranking metrics relevant to prioritisation.',outcome:'The model demonstrates whether it adds decision value.',archActive:['Propensity Model']},
        {name:'Score bands',short:'Convert score to policy',business:'Rather than exposing raw probabilities only, create usable bands tied to sales or business actions.',data:'Score · percentile · segment',systems:['Score Bands','Decision rules'],control:'Bands are reviewed for volume, capacity and expected value.',outcome:'The model output maps to an operational priority.',archActive:['Score Bands','Propensity Model']},
        {name:'Explain',short:'Why this account?',business:'Show the dominant features so teams understand why the account is prioritised.',data:'Driver contribution · recent behaviour',systems:['Driver Explanation'],control:'Explanation should support review, not imply causality where none is proven.',outcome:'Users can trust and challenge prioritisation.',archActive:['Driver Explanation','Score Bands']},
        {name:'Prioritise',short:'Create business queue',business:'Combine score, expected value and business constraints into a ranked action queue.',data:'Score band · account value · capacity · constraints',systems:['Business Queue'],control:'Business rules remain explicit and auditable.',outcome:'Resources focus on the most relevant opportunities.',archActive:['Business Queue','Driver Explanation']},
        {name:'Measure lift',short:'Did it improve outcomes?',business:'Compare conversion or target outcome across score bands and against the previous baseline.',data:'Outcome · score band · intervention',systems:['Outcome Monitor'],control:'Monitor performance by segment to detect drift or unfair concentration.',outcome:'The model is retained only if prioritisation creates measurable lift.',archActive:['Outcome Monitor','Business Queue']}
      ]},
      {id:'drift',label:'Behaviour drift',badge:'MONITORING SCENARIO',before:['A model can remain technically available while business behaviour changes.','Old score thresholds may stop representing real opportunity.'],after:['Feature and outcome drift are monitored.','Performance loss triggers recalibration or retraining before business trust erodes.'],architecture:['Feature Layer','Propensity Model','Drift Monitor','Outcome Monitor','Model Review','Score Bands'],archCaption:'Production behaviour changes → drift evidence → controlled model review → refreshed scoring policy',steps:[
        {name:'Monitor features',short:'Population changes',business:'Track whether important features shift materially from the training population.',data:'Feature distributions · PSI / drift metrics',systems:['Drift Monitor','Feature Layer'],control:'Use alert thresholds and segment views, not one global aggregate.',outcome:'A material behaviour shift is detected.',archActive:['Feature Layer','Drift Monitor']},
        {name:'Check outcomes',short:'Lift deteriorates',business:'Drift matters only if decision quality also changes, so compare realised outcomes by score band.',data:'Conversion / target rate · score band',systems:['Outcome Monitor'],control:'Separate seasonality from persistent degradation.',outcome:'The team confirms whether model utility is falling.',archActive:['Outcome Monitor','Drift Monitor']},
        {name:'Review model',short:'Diagnose degradation',business:'Analyse feature changes, calibration and error patterns before retraining automatically.',data:'Validation slice · calibration · errors',systems:['Model Review','Propensity Model'],control:'Retraining is a governed decision, not an automatic reaction to every alert.',outcome:'The cause of degradation is understood.',archActive:['Model Review','Propensity Model']},
        {name:'Refresh policy',short:'Recalibrate / retrain',business:'Update the model or score bands and validate against the latest representative data.',data:'New model / thresholds · back-test',systems:['Propensity Model','Score Bands'],control:'Promote only after validation and stakeholder sign-off.',outcome:'Prioritisation regains measurable lift.',archActive:['Propensity Model','Score Bands']}
      ]}
    ]
  },
  forecast:{
    label:'Forecasting & planning simulation', subtitle:'Translate historical demand and operational context into a planning signal with back-testing, bias control and human override.',
    problem:'Planning needs a forward-looking estimate, but forecast error is different across products, segments and changing conditions.',
    change:'Segment demand, engineer time-based features, back-test the forecast and combine model output with explicit business adjustments.',
    value:'The planning team receives a measurable forecast with uncertainty, error diagnostics and a feedback path to actual demand.',
    kpis:[['Forecast error','unmeasured judgement','segment-level error tracking'],['Bias','hidden systematic error','visible over / under forecast'],['Planning loop','one-off model','actuals feed next cycle']],
    modes:[
      {id:'standard',label:'Planning cycle',badge:'PRIMARY JOURNEY',before:['Historical demand is reviewed manually.','One method may be applied across different demand patterns.'],after:['Demand is segmented before model selection.','Forecasts are back-tested and bias is measured.','Planner adjustments remain explicit and learnable.'],architecture:['Demand History','Segmentation','Feature Pipeline','Forecast Model','Back-test','Planner Review','Planning Output','Actuals Feedback'],archCaption:'History → segment → forecast → back-test → planner decision → actual outcome',steps:[
        {name:'Baseline',short:'Profile demand',business:'Understand history, intermittency, seasonality, outliers and data gaps before fitting a model.',data:'Demand history · calendar · stock / operational context',systems:['Demand History','Analytics workspace'],control:'Treat missing demand differently from true zero demand.',outcome:'The series is classified and fit for modelling.',archActive:['Demand History']},
        {name:'Segment',short:'Choose behaviour group',business:'Different demand patterns need different modelling and evaluation strategies.',data:'Variability · intermittency · seasonality · volume',systems:['Segmentation'],control:'Segments are stable enough to support repeatable model policy.',outcome:'Each series enters an appropriate modelling path.',archActive:['Segmentation','Demand History']},
        {name:'Engineer',short:'Create time features',business:'Build lag, rolling, calendar and contextual features without leaking future information.',data:'Lags · rolling stats · calendar · context',systems:['Feature Pipeline'],control:'Feature generation respects the forecast cut-off.',outcome:'The model receives reproducible historical information.',archActive:['Feature Pipeline','Segmentation']},
        {name:'Forecast',short:'Generate future estimate',business:'Fit the selected time-series or ML model for the planning horizon.',data:'Features · horizon · model configuration',systems:['Forecast Model'],control:'Compare against naïve / seasonal baselines.',outcome:'A forward demand estimate is produced.',archActive:['Forecast Model']},
        {name:'Back-test',short:'Measure error & bias',business:'Evaluate the model on past windows that resemble the real planning process.',data:'Actual vs predicted · WAPE / MAE / bias',systems:['Back-test'],control:'Review performance by segment, not only global average.',outcome:'Weak segments or systematic bias become visible.',archActive:['Back-test','Forecast Model']},
        {name:'Planner review',short:'Apply business context',business:'Allow planners to adjust where they have documented information not represented in the model.',data:'Forecast · exception · override reason',systems:['Planner Review'],control:'Override reasons are captured for later learning.',outcome:'The final plan combines analytical signal and accountable judgement.',archActive:['Planner Review','Back-test']},
        {name:'Publish plan',short:'Decision output',business:'Feed the approved forecast into inventory, resource or procurement planning.',data:'Final forecast · confidence · assumptions',systems:['Planning Output'],control:'Version the plan and its assumptions.',outcome:'The forecast becomes a controlled planning input.',archActive:['Planning Output','Planner Review']},
        {name:'Learn',short:'Actuals close the loop',business:'Compare the plan with realised demand and analyse recurring override or error patterns.',data:'Actual demand · error · override success',systems:['Actuals Feedback'],control:'Persistent errors trigger model / process improvement.',outcome:'The next cycle starts with production evidence.',archActive:['Actuals Feedback','Planning Output']}
      ]},
      {id:'shock',label:'Demand-shock exception',badge:'EXCEPTION SCENARIO',before:['Historical patterns break during abrupt market or operational change.','A stable model can become confidently wrong.'],after:['Anomaly / change detection flags the regime shift.','Planner review and scenario adjustment are explicitly triggered.'],architecture:['Demand History','Forecast Model','Change Detector','Planner Review','Scenario Adjustment','Actuals Feedback'],archCaption:'Regime change detected → forecast confidence reduced → scenario review → controlled adjustment',steps:[
        {name:'Forecast run',short:'Normal model output',business:'The standard forecasting model produces the expected planning signal.',data:'Historical pattern · model forecast',systems:['Forecast Model'],control:'Store confidence and baseline comparison.',outcome:'A normal forecast is available.',archActive:['Demand History','Forecast Model']},
        {name:'Change detected',short:'Recent data breaks pattern',business:'New actuals deviate materially from the historical regime.',data:'Recent demand · residuals · change metric',systems:['Change Detector'],control:'Use a materiality rule to avoid reacting to normal noise.',outcome:'The system reduces confidence in the default forecast.',archActive:['Change Detector','Forecast Model']},
        {name:'Human review',short:'Investigate cause',business:'A planner checks whether the shift reflects a real event, source issue or temporary anomaly.',data:'External context · operational events · data quality',systems:['Planner Review'],control:'Data quality is checked before changing the plan.',outcome:'The regime shift is confirmed or rejected.',archActive:['Planner Review','Change Detector']},
        {name:'Scenario adjust',short:'Update planning assumption',business:'Where change is real, create an explicit scenario or temporary adjustment rather than hiding it in the model.',data:'Scenario factor · time window · rationale',systems:['Scenario Adjustment'],control:'Adjustment is versioned and time-bounded.',outcome:'The plan responds to new conditions transparently.',archActive:['Scenario Adjustment','Planner Review']},
        {name:'Measure recovery',short:'Actuals validate response',business:'Track whether the scenario improved planning until the data stabilises.',data:'Actuals · scenario error · baseline error',systems:['Actuals Feedback'],control:'Return to standard model policy once evidence supports it.',outcome:'The system handles shocks without pretending historical stability still applies.',archActive:['Actuals Feedback','Scenario Adjustment']}
      ]}
    ]
  },
  document:{
    label:'Document intelligence simulation', subtitle:'Convert unstructured enterprise documents into structured, traceable and reviewable decision context.',
    problem:'Contracts, transport documents and policies contain high-value information that is difficult to query or route through structured systems.',
    change:'Parse, extract, embed and retrieve approved content, then keep source evidence and human review in the output path.',
    value:'Teams get faster access to relevant information without losing provenance, validation or accountability.',
    kpis:[['Search effort','manual document search','semantic evidence retrieval'],['Traceability','answer without source','source-linked context'],['Exception control','silent uncertainty','confidence + human review']],
    modes:[
      {id:'standard',label:'Grounded knowledge flow',badge:'PRIMARY JOURNEY',before:['Users search documents manually.','Key fields are repeatedly copied into structured tools.','Keyword search misses semantically related content.'],after:['Documents are parsed and indexed once.','Structured extraction and semantic retrieval serve multiple use cases.','Generated output preserves evidence and review controls.'],architecture:['Document Store','Parser','Entity Extraction','Embedding Index','Retriever','Grounded AI','Human Review','Business Workflow'],archCaption:'Approved document → structured / semantic representation → evidence retrieval → grounded output → controlled action',steps:[
        {name:'Ingest',short:'Preserve source context',business:'Document intelligence begins by keeping source, version and access metadata attached to the file.',data:'Document · source · version · permissions',systems:['Document Store'],control:'Only approved content enters the knowledge pipeline.',outcome:'The content remains traceable to its original source.',archActive:['Document Store']},
        {name:'Parse',short:'Convert to machine-readable content',business:'Extract text, structure and page / section context while preserving layout signals where useful.',data:'Text · headings · tables · page metadata',systems:['Parser'],control:'Parsing quality is checked on representative documents.',outcome:'The source becomes machine-readable without losing location context.',archActive:['Parser','Document Store']},
        {name:'Extract',short:'Create structured fields',business:'Use deterministic rules or NLP to pull high-value entities and fields needed by downstream workflows.',data:'Entities · dates · parties · references · categories',systems:['Entity Extraction'],control:'Critical extracted fields use validation or human confirmation.',outcome:'Unstructured content can now feed structured analytics and workflows.',archActive:['Entity Extraction','Parser']},
        {name:'Embed',short:'Build semantic representation',business:'Chunk approved text and create embeddings with source metadata for semantic retrieval.',data:'Chunks · embeddings · source IDs',systems:['Embedding Index'],control:'Chunk provenance and access permissions remain attached.',outcome:'The knowledge base can be searched by meaning, not only exact words.',archActive:['Embedding Index']},
        {name:'Retrieve',short:'Select evidence',business:'Rank the most relevant authorised chunks for a user question or task.',data:'Query · top evidence · relevance score',systems:['Retriever','Embedding Index'],control:'Retrieval quality is evaluated separately from generation.',outcome:'Only the most relevant source context reaches the AI layer.',archActive:['Retriever','Embedding Index']},
        {name:'Generate',short:'Produce grounded output',business:'Generate a response or recommendation constrained by retrieved enterprise evidence.',data:'Question · evidence · prompt / model version',systems:['Grounded AI'],control:'The response keeps citations / source references and does not invent unsupported evidence.',outcome:'The user receives a faster, evidence-backed answer.',archActive:['Grounded AI','Retriever']},
        {name:'Review',short:'Handle uncertainty',business:'Low-confidence or consequential outputs are reviewed by a human before business action.',data:'Confidence · evidence · reviewer decision',systems:['Human Review'],control:'Human escalation is designed, not improvised.',outcome:'Ambiguity does not silently become automated action.',archActive:['Human Review','Grounded AI']},
        {name:'Execute',short:'Connect to workflow',business:'Approved structured output can update a case, report, operational tool or downstream process.',data:'Approved fields · action · audit record',systems:['Business Workflow'],control:'Every action is traceable to source evidence and reviewer / system decision.',outcome:'Document intelligence creates operational value rather than only chat output.',archActive:['Business Workflow','Human Review']}
      ]},
      {id:'lowconfidence',label:'Low-confidence extraction',badge:'CONTROL SCENARIO',before:['Uncertain extraction can silently corrupt downstream data.','Users may not know which fields were inferred weakly.'],after:['Confidence and validation gates isolate uncertain fields.','A reviewer corrects only the exception instead of reprocessing the whole document.'],architecture:['Document Store','Parser','Entity Extraction','Validation Gate','Human Review','Business Workflow'],archCaption:'Uncertain extraction → validation failure → focused human correction → auditable release',steps:[
        {name:'Extract',short:'Field confidence is low',business:'An important field is detected but the model confidence is below the release threshold.',data:'Candidate value · confidence · source location',systems:['Entity Extraction'],control:'Critical-field thresholds are defined by business impact.',outcome:'The field is not released automatically.',archActive:['Entity Extraction']},
        {name:'Validate',short:'Gate blocks release',business:'Cross-field or source rules confirm that the candidate cannot be trusted safely.',data:'Validation rule · conflicting evidence',systems:['Validation Gate'],control:'The workflow fails closed for critical ambiguity.',outcome:'The exception is isolated without stopping unrelated fields.',archActive:['Validation Gate','Entity Extraction']},
        {name:'Review',short:'Human verifies source',business:'A reviewer sees the exact document location and candidate value instead of searching manually.',data:'Source snippet · candidate · rule failure',systems:['Human Review','Document Store'],control:'Correction and reviewer identity are logged.',outcome:'The correct value is confirmed efficiently.',archActive:['Human Review','Document Store']},
        {name:'Release',short:'Approved structured output',business:'The corrected field joins the validated document output and continues downstream.',data:'Approved field · audit metadata',systems:['Business Workflow'],control:'The audit trail preserves both the original confidence and final correction.',outcome:'Quality is protected without abandoning automation.',archActive:['Business Workflow','Human Review']}
      ]}
    ]
  }
};

const simEls={title:$('#simTitle'),subtitle:$('#simSubtitle'),modeList:$('#simModeList'),timeline:$('#simTimeline'),stepNo:$('#simStepNo'),stepName:$('#simStepName'),stepBusiness:$('#simStepBusiness'),data:$('#simData'),systems:$('#simSystems'),control:$('#simControl'),outcome:$('#simOutcome'),arch:$('#simArchitecture'),archCaption:$('#simArchCaption'),before:$('#simBeforeList'),after:$('#simAfterList'),kpis:$('#simKpiList'),summaryProblem:$('#simSummaryProblem'),summaryChange:$('#simSummaryChange'),summaryValue:$('#simSummaryValue'),progress:$('#simProgress'),packet:$('#simPacket')};
let simScenario='risk',simMode='standard',simStepIndex=0,simTimer=null;
function getSimMode(){return commerceSimulation[simScenario].modes.find(m=>m.id===simMode)||commerceSimulation[simScenario].modes[0]}
function renderSimulation(){if(!simEls.title)return;const scenario=commerceSimulation[simScenario],mode=getSimMode();simEls.title.textContent=scenario.label;simEls.subtitle.textContent=scenario.subtitle;simEls.summaryProblem.textContent=scenario.problem;simEls.summaryChange.textContent=scenario.change;simEls.summaryValue.textContent=scenario.value;$$('#simScenarioSwitch [data-sim-scenario]').forEach(btn=>btn.classList.toggle('active',btn.dataset.simScenario===simScenario));simEls.modeList.innerHTML=scenario.modes.map(m=>`<button class="sim-mode ${m.id===mode.id?'active':''}" data-sim-mode="${m.id}"><small>${esc(m.badge)}</small><b>${esc(m.label)}</b></button>`).join('');simEls.timeline.innerHTML=mode.steps.map((st,i)=>`<button class="sim-step ${i===0?'active':''}" data-sim-step="${i}"><span>${String(i+1).padStart(2,'0')}</span><b>${esc(st.name)}</b><small>${esc(st.short)}</small></button>`).join('');simEls.arch.innerHTML=mode.architecture.map(label=>`<div class="sim-arch-node" data-sim-arch="${esc(label)}">${esc(label)}</div>`).join('');simEls.before.innerHTML=mode.before.map(x=>`<li>${esc(x)}</li>`).join('');simEls.after.innerHTML=mode.after.map(x=>`<li>${esc(x)}</li>`).join('');simEls.kpis.innerHTML=scenario.kpis.map(k=>`<article><small>${esc(k[0])}</small><div><span>${esc(k[1])}</span><i>→</i><b>${esc(k[2])}</b></div></article>`).join('');simEls.archCaption.textContent=mode.archCaption;$$('[data-sim-mode]',simEls.modeList).forEach(btn=>btn.addEventListener('click',()=>{simMode=btn.dataset.simMode;simStepIndex=0;clearInterval(simTimer);simTimer=null;renderSimulation()}));$$('[data-sim-step]',simEls.timeline).forEach(btn=>btn.addEventListener('click',()=>{clearInterval(simTimer);simTimer=null;updateSimStep(+btn.dataset.simStep)}));updateSimStep(0)}
function updateSimStep(i){const mode=getSimMode(),step=mode.steps[i];if(!step)return;simStepIndex=i;$$('[data-sim-step]',simEls.timeline).forEach((node,k)=>{node.classList.toggle('active',k===i);node.classList.toggle('done',k<i)});simEls.stepNo.textContent=`STEP ${String(i+1).padStart(2,'0')}`;simEls.stepName.textContent=`${step.name} · ${step.short}`;simEls.stepBusiness.textContent=step.business;simEls.data.textContent=step.data;simEls.systems.innerHTML=step.systems.map(x=>`<span>${esc(x)}</span>`).join('');simEls.control.textContent=step.control;simEls.outcome.textContent=step.outcome;const pct=mode.steps.length===1?100:(i/(mode.steps.length-1))*100;if(simEls.progress)simEls.progress.style.width=pct+'%';if(simEls.packet)simEls.packet.style.left=pct+'%';$$('[data-sim-arch]',simEls.arch).forEach(node=>{const on=step.archActive.includes(node.textContent);node.classList.toggle('active',on);node.classList.toggle('muted',!on)})}
function playSimulation(){clearInterval(simTimer);simTimer=setInterval(()=>{const mode=getSimMode();updateSimStep((simStepIndex+1)%mode.steps.length)},1800)}
function openSimulation(target='risk'){simScenario=commerceSimulation[target]?target:'risk';simMode=commerceSimulation[simScenario].modes[0].id;simStepIndex=0;renderSimulation()}
$$('#simScenarioSwitch [data-sim-scenario]').forEach(btn=>btn.addEventListener('click',()=>{simScenario=btn.dataset.simScenario;simMode=commerceSimulation[simScenario].modes[0].id;simStepIndex=0;clearInterval(simTimer);simTimer=null;renderSimulation()}));
$$('[data-sim-control]').forEach(btn=>btn.addEventListener('click',()=>{const action=btn.dataset.simControl,mode=getSimMode();if(action==='play')playSimulation();if(action==='pause'){clearInterval(simTimer);simTimer=null}if(action==='next'){clearInterval(simTimer);simTimer=null;updateSimStep((simStepIndex+1)%mode.steps.length)}if(action==='reset'){clearInterval(simTimer);simTimer=null;updateSimStep(0)}}));
$$('[data-sim-compare]').forEach(btn=>btn.addEventListener('click',()=>{$$('[data-sim-compare]').forEach(x=>x.classList.toggle('active',x===btn));$$('[data-sim-compare-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.simComparePanel===btn.dataset.simCompare))}));
if(simEls.title)openSimulation('risk');


// Volvo deep-dive tabs
$$('[data-volvo-tab]').forEach(btn=>btn.addEventListener('click',()=>{
  $$('[data-volvo-tab]').forEach(x=>x.classList.toggle('active',x===btn));
  $$('[data-volvo-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.volvoPanel===btn.dataset.volvoTab));
}));
const commerceDashboard=$('#ecommerce-dashboard');
const commercePresent=$('#commercePresent');
if(commercePresent&&commerceDashboard){
  commercePresent.addEventListener('click',async()=>{
    try{await commerceDashboard.requestFullscreen(); commerceDashboard.classList.add('is-presenting'); commercePresent.textContent='Exit presentation ×';}
    catch(e){commerceDashboard.classList.toggle('is-presenting')}
  });
  document.addEventListener('fullscreenchange',()=>{const on=document.fullscreenElement===commerceDashboard;commerceDashboard.classList.toggle('is-presenting',on);commercePresent.textContent=on?'Exit presentation ×':'Presentation mode ↗'});
  commercePresent.addEventListener('dblclick',()=>{if(document.fullscreenElement)document.exitFullscreen()});
}

document.addEventListener('keydown',e=>{
  if(document.fullscreenElement===commerceDashboard){
    if(e.key==='ArrowRight'){commerceViewIndex=(commerceViewIndex+1)%commerceTabs.length;showCommerceView(commerceTabs[commerceViewIndex].dataset.commerceView)}
    if(e.key==='ArrowLeft'){commerceViewIndex=(commerceViewIndex-1+commerceTabs.length)%commerceTabs.length;showCommerceView(commerceTabs[commerceViewIndex].dataset.commerceView)}
  }
});
