const CONFIG={
  spreadsheetId:'1To6WfnCyCn8ms7o1KQ5M_UOtvmk2yO1uH50g1rjA8Eg',
  appsScriptUrl:'https://script.google.com/macros/s/AKfycbxNAxTywGANlRbh719_uuKhNfo57VBpLibY7hwhqI8MLxbxHD5uWxHptEO0S4M1_7LzIQ/exec',
  credentials:{username:'harga1900',password:'harga1900'},
  pageSize:25,
  rhSyncIntervalMs:2000,
  priceNoteSyncIntervalMs:2000
};
const SHEETS={
  'Mingguan':{
    lastColumn:'Z',prevIndex:21,currentIndex:22,noteIndex:24,respondentIndex:10,noteColumn:'Y',
    timeline:[
      {label:'Prev M1',index:11},{label:'Prev M2',index:12},{label:'Prev M3',index:13},{label:'Prev M4',index:14},{label:'Prev M5',index:15},
      {label:'Current M1',index:16},{label:'Current M2',index:17},{label:'Current M3',index:18},{label:'Current M4',index:19},{label:'Current M5',index:20}
    ]
  },
  'Dwi Mingguan':{
    lastColumn:'Y',prevIndex:15,currentIndex:16,noteIndex:18,respondentIndex:10,noteColumn:'S',
    timeline:[{label:'Prev M1',index:11},{label:'Prev M3',index:12},{label:'Current M1',index:13},{label:'Current M3',index:14}]
  },
  'bulanan':{
    lastColumn:'U',prevIndex:11,currentIndex:12,noteIndex:14,respondentIndex:10,noteColumn:'O',
    timeline:[{label:'Previous',index:11},{label:'Current',index:12}]
  }
};

const RH_SHEET={name:'RH web',lastColumn:'H',kabIndex:0,commodityCodeIndex:2,commodityIndex:3,prevIndex:4,currentIndex:5,rhIndex:6,noteIndex:7,noteColumn:'H'};
const RH_KABS=['1902','1903','1906','1971'];
const state={all:[],filtered:[],rhAll:[],rhSyncTimer:null,rhSyncBusy:false,priceNoteSyncTimer:null,priceNoteSyncBusy:false,view:'dashboard',periodPage:1,trendPage:1,rhPage:1,rhPricePage:1,periodPageSize:50,trendPageSize:50,rhPageSize:25,rhPricePageSize:25,periodSortKey:'rawOrder',periodSortDir:'asc',trendSortKey:'rawOrder',trendSortDir:'asc',matrixSortKey:'rawOrder',matrixSortDir:'asc',rhSortKey:'rawOrder',rhSortDir:'asc',rhPriceSortKey:'rawOrder',rhPriceSortDir:'asc',commodityDetailQuality:'',commodityDetailManual:false,commodityFocus:'',charts:{}};
const SHEET_ORDER={'Mingguan':0,'Dwi Mingguan':1,'bulanan':2};
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').trim();
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const priceNum=v=>{if(typeof v==='number')return Number.isFinite(v)?v:null;let s=norm(v).replace(/\s/g,'');if(!s)return null;if(s.includes(',')&&s.includes('.')){const decimal=s.lastIndexOf(',')>s.lastIndexOf('.')?',':'.',thousand=decimal===','?'.':',';s=s.split(thousand).join('').replace(decimal,'.')}else if(/^[-+]?\d{1,3}([.,]\d{3})+$/.test(s))s=s.replace(/[.,]/g,'');else s=s.replace(',','.');const n=Number(s);return Number.isFinite(n)?n:null};
const fmtMoney=v=>v==null?'–':new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
const fmtPct=v=>v==null?'–':`${v>=0?'+':''}${v.toFixed(2).replace('.',',')}%`;
const fmtInt=v=>new Intl.NumberFormat('id-ID').format(v||0);
const avg=arr=>{const a=arr.filter(Number.isFinite);return a.length?a.reduce((x,y)=>x+y,0)/a.length:null};
const unique=(arr,key)=>[...new Set(arr.map(x=>x[key]).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'id'));


/* ===== Periode Data lokal (tidak terhubung Spreadsheet / Apps Script) ===== */
const LOCAL_DATA_PERIOD_KEY='monitoringHarga.dataPeriod.v1';

function readLocalDataPeriod(){
  try{
    const raw=localStorage.getItem(LOCAL_DATA_PERIOD_KEY);
    if(!raw)return {date:'',time:''};
    const val=JSON.parse(raw);
    return {date:typeof val?.date==='string'?val.date:'',time:typeof val?.time==='string'?val.time:''};
  }catch(_){return {date:'',time:''}}
}
function formatLocalDataPeriod(date,time){
  if(!date)return 'Belum diatur';
  const m=String(date).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m)return date+(time?` • ${time} WIB`:'');
  const bulan=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const tanggal=`${Number(m[3])} ${bulan[Number(m[2])-1]} ${m[1]}`;
  return time?`${tanggal} • ${String(time).replace(':','.')} WIB`:tanggal;
}
function renderLocalDataPeriod(){
  const val=readLocalDataPeriod(),el=$('dataPeriodText');
  if(el)el.textContent=formatLocalDataPeriod(val.date,val.time);
  return val;
}
function updateLocalPeriodPreview(){
  const date=$('dataPeriodDate')?.value||'',time=$('dataPeriodTime')?.value||'';
  if($('dataPeriodPreview'))$('dataPeriodPreview').textContent=formatLocalDataPeriod(date,time);
}
function openLocalDataPeriodModal(){
  const modal=$('dataPeriodModal');if(!modal)return;
  const val=readLocalDataPeriod();
  $('dataPeriodDate').value=val.date;
  $('dataPeriodTime').value=val.time;
  updateLocalPeriodPreview();
  modal.classList.remove('hidden');
}
function closeLocalDataPeriodModal(){$('dataPeriodModal')?.classList.add('hidden')}
function saveLocalDataPeriod(){
  const date=$('dataPeriodDate')?.value||'',time=$('dataPeriodTime')?.value||'';
  if(!date){showStatus('Pilih tanggal periode data terlebih dahulu.','error');return}
  try{
    localStorage.setItem(LOCAL_DATA_PERIOD_KEY,JSON.stringify({date,time}));
    renderLocalDataPeriod();closeLocalDataPeriodModal();
    showStatus(`Periode data disimpan: ${formatLocalDataPeriod(date,time)}.`,'success');
  }catch(e){showStatus(`Gagal menyimpan periode data di browser: ${e.message}`,'error')}
}
function clearLocalDataPeriod(){
  try{localStorage.removeItem(LOCAL_DATA_PERIOD_KEY)}catch(_){}
  renderLocalDataPeriod();closeLocalDataPeriodModal();
  showStatus('Periode data dihapus.','info');
}
function initLocalDataPeriod(){
  renderLocalDataPeriod();
  if(!$('dataPeriodBtn'))return;
  $('dataPeriodBtn').onclick=openLocalDataPeriodModal;
  $('dataPeriodClose').onclick=closeLocalDataPeriodModal;
  $('dataPeriodCancel').onclick=closeLocalDataPeriodModal;
  $('dataPeriodSave').onclick=saveLocalDataPeriod;
  $('dataPeriodClear').onclick=clearLocalDataPeriod;
  $('dataPeriodDate').addEventListener('input',updateLocalPeriodPreview);
  $('dataPeriodTime').addEventListener('input',updateLocalPeriodPreview);
  $('dataPeriodModal').addEventListener('click',e=>{if(e.target===$('dataPeriodModal'))closeLocalDataPeriodModal()});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLocalDataPeriodModal()});
}

const CHANGE_CATEGORIES=[
  {id:'stable',label:'Tidak ada perubahan',className:'cat-stable'},
  {id:'up-0',label:'Bertambah 0–19,99%',className:'cat-up-0'},
  {id:'up-20',label:'Bertambah 20–49,99%',className:'cat-up-20'},
  {id:'up-50',label:'Bertambah 50–99,99%',className:'cat-up-50'},
  {id:'up-100',label:'Bertambah ≥100%',className:'cat-up-100'},
  {id:'down-0',label:'Berkurang 0–19,99%',className:'cat-down-0'},
  {id:'down-20',label:'Berkurang 20–49,99%',className:'cat-down-20'},
  {id:'down-50',label:'Berkurang 50–99,99%',className:'cat-down-50'},
  {id:'down-100',label:'Berkurang ≥100%',className:'cat-down-100'}
];
function classifyChange(c){
  if(!Number.isFinite(c))return null;
  const a=Math.abs(c);
  if(a<0.005)return CHANGE_CATEGORIES[0];
  if(c>0){if(a<20)return CHANGE_CATEGORIES[1];if(a<50)return CHANGE_CATEGORIES[2];if(a<100)return CHANGE_CATEGORIES[3];return CHANGE_CATEGORIES[4]}
  if(a<20)return CHANGE_CATEGORIES[5];if(a<50)return CHANGE_CATEGORIES[6];if(a<100)return CHANGE_CATEGORIES[7];return CHANGE_CATEGORIES[8];
}
function buildTimeline(row,cfg){
  // Deret waktu berkelanjutan. Nilai 0/kosong dilewati, sehingga perubahan
  // selalu dihitung dari harga valid terakhir ke harga valid berikutnya.
  const points=cfg.timeline.map(p=>({label:p.label,value:priceNum(row[p.index])}))
    .filter(p=>Number.isFinite(p.value)&&p.value>0);
  const series=points.slice(1).map((to,i)=>{
    const from=points[i];
    const change=((to.value-from.value)/from.value)*100;
    return{
      label:`${from.label} → ${to.label}`,
      fromLabel:from.label,toLabel:to.label,
      prev:from.value,current:to.value,change,valid:true,
      category:classifyChange(change)
    };
  });
  return {points,series};
}

function showStatus(msg,type='info'){const el=$('status');el.textContent=msg;el.className=`alert ${type}`;setTimeout(()=>el.classList.add('hidden'),5000)}
function currentPeriod(){return $('periodFilter').value}
function periodLabel(v){return v==='bulanan'?'Bulanan':v}
function csvUrl(sheet,cfg){return `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&range=A2:${cfg.lastColumn}&_=${Date.now()}`}
async function fetchSheet(sheet,cfg){const res=await fetch(csvUrl(sheet,cfg),{cache:'no-store'});if(!res.ok)throw new Error(`Gagal membaca sheet ${sheet}`);const text=await res.text();const parsed=Papa.parse(text,{skipEmptyLines:true}).data;if(parsed.length<2)return[];return parsed.slice(1).map((r,i)=>{
  const prev=priceNum(r[cfg.prevIndex]),current=priceNum(r[cfg.currentIndex]);
  const change=prev&&current!=null?((current-prev)/prev)*100:null;
  const timeline=buildTimeline(r,cfg),series=timeline.series,validSeries=series.filter(s=>s.valid),largest=validSeries.slice().sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))[0]||null;return{sheet,period:periodLabel(sheet),rowNumber:i+3,rawOrder:(SHEET_ORDER[sheet]||0)*1000000+(i+3),kab:norm(r[0]),commodityCode:norm(r[1]).replace(/\.0$/,''),commodity:norm(r[2]),quality:norm(r[5]),marketType:norm(r[7]),market:norm(r[9]),respondent:norm(r[cfg.respondentIndex]),prev,current,change,note:norm(r[cfg.noteIndex]),noteColumn:cfg.noteColumn,timelinePoints:timeline.points,series,maxAbsChange:largest?Math.abs(largest.change):null,dominantCategory:largest?.category?.label||'Tidak dapat dihitung',dominantCategoryId:largest?.category?.id||''};
  }).filter(x=>x.commodity||x.respondent||x.prev!=null||x.current!=null);
}
async function fetchRhSheet(){
  const cfg=RH_SHEET,res=await fetch(csvUrl(cfg.name,cfg),{cache:'no-store'});if(!res.ok)throw new Error('Gagal membaca sheet RH web');
  const text=await res.text(),parsed=Papa.parse(text,{skipEmptyLines:true}).data;if(parsed.length<2)return[];
  return parsed.slice(1).map((r,i)=>({sheet:cfg.name,rowNumber:i+3,rawOrder:i+3,kab:norm(r[cfg.kabIndex]),commodityCode:norm(r[cfg.commodityCodeIndex]).replace(/\.0$/,''),commodity:norm(r[cfg.commodityIndex]),prev:priceNum(r[cfg.prevIndex]),current:priceNum(r[cfg.currentIndex]),rh:priceNum(r[cfg.rhIndex]),note:norm(r[cfg.noteIndex]),noteColumn:cfg.noteColumn})).filter(x=>x.kab||x.commodityCode||x.commodity||Number.isFinite(x.rh));
}
async function loadAll(){showStatus('Memuat data harga dan RH...');try{const entries=Object.entries(SHEETS);const [groups,rhRows]=await Promise.all([Promise.all(entries.map(([s,c])=>fetchSheet(s,c))),fetchRhSheet()]);state.all=groups.flat();state.rhAll=rhRows;state.periodPage=1;state.trendPage=1;state.rhPage=1;state.rhPricePage=1;populateFilters();populateRhFilters();applyFilters();$('lastUpdate').textContent=`Diperbarui ${new Date().toLocaleString('id-ID')}`;showStatus(`${fmtInt(state.all.length)} observasi harga dan ${fmtInt(state.rhAll.length)} observasi RH berhasil dimuat.`)}catch(e){showStatus(`${e.message}. Pastikan spreadsheet dapat diakses oleh siapa saja yang memiliki link.`,'error')}}
function populateSelect(id,items,placeholder){const el=$(id);if(!el)return;const old=el.value;el.innerHTML=`<option value="">${placeholder}</option>`+items.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(items.includes(old))el.value=old}
const searchComboRegistry={};
function populateDatalist(inputId,listId,items){
  // Datalist tetap diisi sebagai fallback, tetapi browser native dinonaktifkan setelah
  // custom searchable dropdown dipasang agar pilihan tetap bisa dibuka walau input sudah berisi nilai.
  const input=$(inputId),list=$(listId);if(!input||!list)return;
  list.innerHTML=items.map(v=>`<option value="${esc(v)}"></option>`).join('');
  if(searchComboRegistry[inputId])refreshSearchCombo(inputId);
}
function comboItems(id){try{return (searchComboRegistry[id]?.getItems?.()||[]).filter(Boolean)}catch(_){return[]}}
function closeSearchCombos(except=''){Object.entries(searchComboRegistry).forEach(([id,c])=>{if(id!==except)c.menu.classList.remove('open')})}
function renderSearchCombo(id,showAll=false){
  const c=searchComboRegistry[id];if(!c)return;
  const input=c.input,query=showAll?'':norm(input.value).toLowerCase(),items=comboItems(id);
  const filtered=(query?items.filter(v=>String(v).toLowerCase().includes(query)):items).slice(0,300);
  c.menu.innerHTML=`<button type="button" class="combo-option combo-clear" data-value="">${esc(c.emptyLabel)}</button>`+
    (filtered.length?filtered.map(v=>`<button type="button" class="combo-option ${v===input.value?'selected':''}" data-value="${esc(v)}">${esc(v)}</button>`).join(''):'<div class="combo-empty">Tidak ada pilihan yang cocok.</div>');
  c.menu.classList.add('open');closeSearchCombos(id);
  c.menu.querySelectorAll('.combo-option').forEach(btn=>btn.addEventListener('mousedown',e=>{
    e.preventDefault();const value=btn.dataset.value||'';input.value=value;c.menu.classList.remove('open');
    input.dispatchEvent(new Event('change',{bubbles:true}));
    if(c.onSelect)c.onSelect(value);
  }));
}
function setupSearchCombo(inputId,getItems,emptyLabel,onSelect){
  const input=$(inputId);if(!input||searchComboRegistry[inputId])return;
  const wrap=input.closest('.searchable-combo')||input.parentElement;
  input.removeAttribute('list');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');
  const toggle=document.createElement('button');toggle.type='button';toggle.className='combo-toggle';toggle.setAttribute('aria-label','Buka daftar pilihan');toggle.textContent='⌄';
  const menu=document.createElement('div');menu.className='combo-menu';wrap.append(toggle,menu);
  searchComboRegistry[inputId]={input,menu,toggle,getItems,emptyLabel,onSelect};
  const openAll=()=>{renderSearchCombo(inputId,true);input.setAttribute('aria-expanded','true')};
  input.addEventListener('focus',openAll);
  input.addEventListener('click',openAll);
  input.addEventListener('input',()=>{renderSearchCombo(inputId,false);input.setAttribute('aria-expanded','true')});
  toggle.addEventListener('mousedown',e=>{e.preventDefault();input.focus();renderSearchCombo(inputId,true);input.setAttribute('aria-expanded','true')});
  input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();renderSearchCombo(inputId,true)}if(e.key==='Escape'){menu.classList.remove('open');input.setAttribute('aria-expanded','false')}});
}
function refreshSearchCombo(id){const c=searchComboRegistry[id];if(c&&c.menu.classList.contains('open'))renderSearchCombo(id,true)}
document.addEventListener('mousedown',e=>{Object.entries(searchComboRegistry).forEach(([id,c])=>{if(!c.input.closest('.searchable-combo')?.contains(e.target)){c.menu.classList.remove('open');c.input.setAttribute('aria-expanded','false')}})});
function exactCommodityRows(value){const v=norm(value).toLowerCase();if(!v)return [];return state.all.filter(x=>x.commodity.toLowerCase()===v||x.commodityCode.toLowerCase()===v)}
function commodityOptionsForPeriod(){const p=currentPeriod();const rows=p==='Semua'?state.all:state.all.filter(x=>x.sheet===p);return unique(rows,'commodity')}
function refreshCommodityForPeriod(resetInvalid=true){const input=$('commodityFilter');if(!input)return;const items=commodityOptionsForPeriod();populateDatalist('commodityFilter','commodityFilterList',items);if(resetInvalid&&input.value){const exact=items.some(v=>norm(v).toLowerCase()===norm(input.value).toLowerCase());if(!exact)input.value=''}refreshSearchCombo('commodityFilter')}
function syncPeriodFromCommodity(){const input=$('commodityFilter'),period=$('periodFilter');if(!input||!period)return;const rows=exactCommodityRows(input.value);if(!rows.length)return;const periods=[...new Set(rows.map(x=>x.sheet))];if(periods.length===1){period.value=periods[0];return}if(period.value!=='Semua'&&!periods.includes(period.value))period.value='Semua'}
function qualityOptionsForCommodity(){const kom=norm($('commodityFilter')?.value).toLowerCase(),p=currentPeriod();let rows=p==='Semua'?state.all:state.all.filter(x=>x.sheet===p);if(kom)rows=rows.filter(x=>x.commodity.toLowerCase().includes(kom)||x.commodityCode.toLowerCase().includes(kom));return unique(rows,'quality')}
function updateQualityDatalist(resetInvalid=false){const items=qualityOptionsForCommodity();populateDatalist('qualityFilter','qualityFilterList',items);const q=$('qualityFilter');if(resetInvalid&&q&&q.value&&!items.includes(q.value))q.value='';refreshSearchCombo('qualityFilter')}
function handlePeriodCommodityChange(source){if(source==='period')refreshCommodityForPeriod(true);else if(source==='commodity'){syncPeriodFromCommodity();refreshCommodityForPeriod(false)}updateQualityDatalist(true);applyFilters()}
function populateFilters(){populateSelect('kabFilter',unique(state.all,'kab'),'Semua wilayah');refreshCommodityForPeriod(false);updateQualityDatalist(false);populateSelect('marketTypeFilter',unique(state.all,'marketType'),'Semua jenis pasar');refreshSearchCombo('commodityFilter');refreshSearchCombo('qualityFilter')}
function selectedChangeBands(){return [...document.querySelectorAll('.change-band-check:checked')].map(el=>String(el.value))}
function changeMatchesBands(change,bands=selectedChangeBands()){
  if(!bands.length)return true;
  if(!Number.isFinite(change))return false;
  const a=Math.abs(change);
  const isStable=a<0.005;
  return bands.some(b=>
    b==='stable'?isStable:
    b==='small'?(a>=0.005&&a<20):
    b==='20'?(a>=20&&a<50):
    b==='50'?(a>=50&&a<100):
    b==='100'?a>=100:false
  );
}
function applyFilters(){const p=currentPeriod(),kab=$('kabFilter').value,kom=norm($('commodityFilter').value).toLowerCase(),qual=norm($('qualityFilter').value).toLowerCase(),mt=$('marketTypeFilter').value,q=norm($('searchFilter').value).toLowerCase(),bands=selectedChangeBands();state.filtered=state.all.filter(x=>(p==='Semua'||x.sheet===p)&&(!kab||x.kab===kab)&&(!kom||x.commodity.toLowerCase().includes(kom)||x.commodityCode.toLowerCase().includes(kom))&&(!qual||x.quality.toLowerCase().includes(qual))&&(!mt||x.marketType===mt)&&(!q||[x.kab,x.commodityCode,x.commodity,x.quality,x.market,x.respondent,x.note,x.period].join(' ').toLowerCase().includes(q))&&changeMatchesBands(x.change,bands));state.periodPage=1;state.trendPage=1;renderAll()}
function statusOf(c){if(!Number.isFinite(c)||Math.abs(c)<0.005)return 'Tetap';return c>0?'Naik':'Turun'}
function sortedData(){const arr=[...state.filtered],k=state.sortKey,d=state.sortDir==='asc'?1:-1;return arr.sort((a,b)=>{let av=a[k],bv=b[k];if(typeof av==='number'||typeof bv==='number'){av=Number.isFinite(av)?av:-Infinity;bv=Number.isFinite(bv)?bv:-Infinity;return(av-bv)*d}return String(av??'').localeCompare(String(bv??''),'id')*d})}
function renderAll(){renderHeader();renderDashboard();renderPeriod();renderCommodity();renderMarket();renderTrend();renderEvaluation();renderMatrix();renderRh();renderRhPrice()}
function renderHeader(){$('heroPeriod').textContent=currentPeriod()==='Semua'?'Semua Periode':periodLabel(currentPeriod());$('periodBadge').textContent=$('heroPeriod').textContent}
function destroyChart(id){if(state.charts[id])state.charts[id].destroy()}
function chart(id,type,labels,data,label){destroyChart(id);state.charts[id]=new Chart($(id),{type,data:{labels,datasets:[{label,data}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==='doughnut'}},scales:type==='doughnut'?{}:{y:{beginAtZero:true}}}})}
function groupAvg(data,key,value='change'){const m={};data.forEach(x=>{if(!x[key]||!Number.isFinite(x[value]))return;(m[x[key]]??=[]).push(x[value])});return Object.entries(m).map(([name,v])=>({name,value:avg(v)}))}
function renderDashboard(){const d=state.filtered,up=d.filter(x=>x.change>0),down=d.filter(x=>x.change<0),stable=d.filter(x=>Number.isFinite(x.change)&&Math.abs(x.change)<.005),ext=d.filter(x=>Number.isFinite(x.change)&&Math.abs(x.change)>=20);$('kpiTotal').textContent=fmtInt(d.length);$('kpiUp').textContent=fmtInt(up.length);$('kpiDown').textContent=fmtInt(down.length);$('kpiStable').textContent=fmtInt(stable.length);$('kpiExtreme').textContent=fmtInt(ext.length);$('conditionScore').textContent=fmtInt(ext.length);const ap=avg(d.map(x=>x.prev)),ac=avg(d.map(x=>x.current));$('avgPrev').textContent=fmtMoney(ap);$('avgCurrent').textContent=fmtMoney(ac);$('avgChange').textContent=ap?fmtPct(((ac-ap)/ap)*100):'–';$('heroNarrative').textContent=`Menampilkan ${fmtInt(d.length)} observasi sesuai filter aktif; ${fmtInt(ext.length)} di antaranya berubah minimal 20 persen.`;chart('compositionChart','doughnut',['Naik','Turun','Tetap'],[up.length,down.length,stable.length],'Observasi');const top=groupAvg(d,'commodity').sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,10);chart('topIncreaseChart','bar',top.map(x=>x.name),top.map(x=>x.value),'Perubahan (%)')}
function priceNoteId(x,scope='period'){return `note-${scope}-${x.sheet.replace(/\s/g,'_')}-${x.rowNumber}`}
function noteCell(x,scope='period'){return `<textarea class="editable-note price-note" id="${priceNoteId(x,scope)}" data-note-scope="${esc(scope)}" data-sheet="${esc(x.sheet)}" data-row="${x.rowNumber}" data-saved-value="${esc(x.note)}">${esc(x.note)}</textarea>`}
function saveButton(x,scope='period'){return `<button class="btn primary save-note" data-sheet="${esc(x.sheet)}" data-row="${x.rowNumber}" data-note-scope="${esc(scope)}" data-note-id="${priceNoteId(x,scope)}">Simpan</button>`}
function categoryOfRow(x){return classifyChange(x.change)||CHANGE_CATEGORIES[0]}
function periodLegendHtml(){return CHANGE_CATEGORIES.map(c=>`<span class="legend-chip ${c.className}"><i class="legend-dot" style="background:var(--cat-color)"></i>${esc(c.label)}</span>`).join('')}
function rowHtml(x,recap=false){
  const cat=categoryOfRow(x), movement=movementClass(x.change);
  return `<tr class="period-row ${cat.className} ${Math.abs(x.change||0)>=20?'extreme-row':''}"><td>${esc(x.period)}</td><td>${esc(x.kab)}</td>${recap?'':`<td><span class="commodity-code">${esc(x.commodityCode)}</span></td>`}<td><strong class="primary-cell-text">${esc(x.commodity)}</strong></td><td><span class="quality-text">${esc(x.quality)}</span></td>${recap?`<td>${esc(x.marketType)}</td>`:''}<td>${esc(x.market)}</td><td><span class="respondent-text">${esc(x.respondent)}</span></td><td class="num"><div class="period-price-card base-price"><span>Harga dasar</span><strong>${fmtMoney(x.prev)}</strong></div></td><td class="num"><div class="period-price-card current-price ${cat.className}"><span>Harga saat ini</span><strong>${fmtMoney(x.current)}</strong></div></td><td class="num"><span class="change-badge ${cat.className}"><b>${movement==='up'?'▲':movement==='down'?'▼':'—'}</b>${fmtPct(x.change)}<small>${esc(cat.label)}</small></span></td><td>${noteCell(x,'period')}</td><td>${saveButton(x,'period')}</td></tr>`
}
function paginate(data,page,size=CONFIG.pageSize){if(size==='all')return{rows:data,pages:1,page:1};const n=Number(size)||CONFIG.pageSize,pages=Math.max(1,Math.ceil(data.length/n));page=Math.min(page,pages);return{rows:data.slice((page-1)*n,page*n),pages,page}}
function periodBaseData(){
  const cat=$('periodCategoryFilter')?.value||'';
  return state.filtered.filter(x=>!cat||categoryOfRow(x).id===cat);
}
function sortedPeriodData(){
  const arr=[...periodBaseData()],k=state.periodSortKey,d=state.periodSortDir==='asc'?1:-1;
  return arr.sort((a,b)=>{let av=a[k],bv=b[k];if(typeof av==='number'||typeof bv==='number'){av=Number.isFinite(av)?av:-Infinity;bv=Number.isFinite(bv)?bv:-Infinity;return(av-bv)*d}return String(av??'').localeCompare(String(bv??''),'id')*d});
}
function renderPeriod(){
  const d=sortedPeriodData();
  $('periodCommodities').textContent=fmtInt(unique(d,'commodity').length);
  $('periodMarkets').textContent=fmtInt(unique(d,'market').length);
  $('periodRespondents').textContent=fmtInt(unique(d,'respondent').length);
  $('periodExtreme').textContent=fmtInt(d.filter(x=>Math.abs(x.change||0)>=20).length);
  if($('periodLegend'))$('periodLegend').innerHTML=periodLegendHtml();

  // Ringkasan distribusi dihitung dari seluruh data yang lolos filter utama,
  // sebelum filter kelompok diterapkan. Dengan begitu kartu tetap berguna
  // sebagai gambaran komposisi dan tidak berubah menjadi nol saat satu kelompok dipilih.
  const summaryBase=state.filtered.filter(x=>Number.isFinite(x.change));
  const counts=Object.fromEntries(CHANGE_CATEGORIES.map(c=>[c.id,0]));
  summaryBase.forEach(x=>{const c=categoryOfRow(x);counts[c.id]=(counts[c.id]||0)+1});
  const activeCategory=$('periodCategoryFilter')?.value||'';
  if($('periodSummary'))$('periodSummary').innerHTML=CHANGE_CATEGORIES.map(c=>`<article class="trend-summary-card period-summary-card ${c.className} ${activeCategory===c.id?'active-category':''}"><span>${esc(c.label)}</span><strong>${fmtInt(counts[c.id])}</strong><small>${summaryBase.length?fmtPct((counts[c.id]/summaryBase.length)*100):'0,00%' } dari data valid</small></article>`).join('');

  const p=paginate(d,state.periodPage,state.periodPageSize);
  state.periodPage=p.page;
  $('periodTableBody').innerHTML=p.rows.map(x=>rowHtml(x,false)).join('')||'<tr><td colspan="12">Tidak ada data sesuai filter.</td></tr>';
  $('periodPageInfo').textContent=state.periodPageSize==='all'?`Menampilkan semua • ${fmtInt(d.length)} data`:`Halaman ${p.page} dari ${p.pages} • ${fmtInt(d.length)} data`;
  bindSaveButtons();
  updatePeriodSortMarks();
}
async function saveNote(btn){
  const url=String(CONFIG.appsScriptUrl||'').trim();
  if(!url||url.includes('PASTE_URL')||!url.endsWith('/exec')){
    showStatus('URL Web App belum benar. Isi CONFIG.appsScriptUrl dengan URL deployment yang berakhiran /exec.','error');
    return;
  }

  const sheet=btn.dataset.sheet;
  const row=Number(btn.dataset.row);
  const rowEl=btn.closest('tr');
  const noteEl=$(btn.dataset.noteId)||(btn.closest('details')&&btn.closest('details').querySelector('textarea.editable-note'))||(rowEl&&rowEl.querySelector('textarea.editable-note'));
  const note=noteEl ? noteEl.value : '';

  btn.disabled=true;
  btn.classList.add('saving');
  btn.textContent='Menyimpan...';

  try{
    // Memakai JSONP GET agar GitHub Pages menerima respons sukses/gagal nyata
    // dari Apps Script. Pesan sukses hanya muncul setelah setValue + flush selesai.
    const rhItem=sheet==='RH web'
      ? (state.rhAll.find(x=>x.rowNumber===row)||{kab:btn.dataset.kab||'',commodityCode:btn.dataset.code||'',commodity:btn.dataset.commodity||''})
      : null;
    const priceItem=sheet!=='RH web'
      ? state.all.find(x=>x.sheet===sheet&&x.rowNumber===row)
      : null;

    const result=await gasJsonp({
      action:'updateNote',
      sheet:String(sheet),
      row:String(row),
      note:String(note),
      clear:note===''?'1':'0',

      // Identitas RH tetap seperti versi yang sudah berhasil.
      kab:rhItem?String(rhItem.kab||''):String(priceItem?.kab||''),
      commodityCode:rhItem?String(rhItem.commodityCode||''):String(priceItem?.commodityCode||''),
      commodity:rhItem?String(rhItem.commodity||''):String(priceItem?.commodity||''),

      // Identitas tambahan khusus Mingguan / Dwi Mingguan / bulanan.
      quality:priceItem?String(priceItem.quality||''):'',
      market:priceItem?String(priceItem.market||''):'',
      respondent:priceItem?String(priceItem.respondent||''):'',

      token:'harga1900',
      ts:String(Date.now())
    },15000);
    if(!result||result.ok!==true)throw new Error(result&&result.message?result.message:'Apps Script tidak mengonfirmasi penyimpanan.');

    const item=state.all.find(x=>x.sheet===sheet&&x.rowNumber===row)||state.rhAll.find(x=>x.sheet===sheet&&x.rowNumber===row);
    if(item)item.note=note;
    if(noteEl)noteEl.dataset.savedValue=note;

    if(sheet!=='RH web'){
      updateVisiblePriceNote(sheet,row,note);
      // Baca kembali catatan non-RH sesaat setelah simpan agar kedua menu
      // dan spreadsheet dipastikan memakai nilai yang sama.
      setTimeout(()=>syncPriceNotesFast(true),800);
    }

    if(sheet==='RH web'){
      const resolvedRow=Number(result.row||row);
      state.rhAll.filter(x=>x.rowNumber===row||x.rowNumber===resolvedRow).forEach(x=>{x.note=note;if(x.rowNumber===row&&resolvedRow!==row)x.rowNumber=resolvedRow});
      updateVisibleRhNote(row,note);
      if(resolvedRow!==row)updateVisibleRhNote(resolvedRow,note);
      // Verifikasi segera dari endpoint pembaca kolom H. Jika ada perubahan dari spreadsheet,
      // state lokal akan dikoreksi tanpa perlu reload seluruh halaman.
      setTimeout(()=>syncRhNotesFast(true),200);
    }
    showStatus(`Keterangan tersimpan dan terverifikasi di ${result.cell||sheet+' baris '+(result.row||row)}.`,'success');
  }catch(e){
    showStatus(`Gagal menyimpan keterangan: ${e.message}`,'error');
  }finally{
    btn.disabled=false;
    btn.classList.remove('saving');
    btn.textContent='Simpan';
  }
}
function gasJsonp(params,timeoutMs=10000){
  return new Promise((resolve,reject)=>{
    const base=String(CONFIG.appsScriptUrl||'').trim();
    const cb='__gas_cb_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    let timer;
    const cleanup=()=>{clearTimeout(timer);try{delete window[cb]}catch(_){window[cb]=undefined}script.remove()};
    window[cb]=(data)=>{cleanup();resolve(data)};
    const qs=new URLSearchParams({...params,callback:cb});
    script.src=base+'?'+qs.toString();
    script.async=true;
    script.onerror=()=>{cleanup();reject(new Error('Tidak dapat menghubungi Web App Apps Script.'))};
    timer=setTimeout(()=>{cleanup();reject(new Error('Apps Script tidak memberi respons dalam '+Math.round(timeoutMs/1000)+' detik.'))},timeoutMs);
    document.head.appendChild(script);
  });
}

function updateVisiblePriceNote(sheet,row,note){
  const safeSheet=String(sheet).replace(/\s/g,'_');
  [`note-period-${safeSheet}-${row}`,`note-trend-${safeSheet}-${row}`].forEach(id=>{
    const el=$(id);
    if(el&&document.activeElement!==el){
      el.value=String(note??'');
      el.dataset.savedValue=String(note??'');
    }
  });
}


function priceIdentityKey(x){
  return [
    norm(x.kab),
    norm(x.commodityCode).replace(/\.0$/,''),
    norm(x.commodity),
    norm(x.quality),
    norm(x.market),
    norm(x.respondent)
  ].join('¦');
}

async function syncPriceNotesFast(silent=false){
  const active=document.activeElement;
  // Jangan menimpa teks yang sedang diketik pada Evaluasi Bulanan/Mingguan.
  if(state.priceNoteSyncBusy||(active&&active.matches&&active.matches('textarea.price-note')))return;
  state.priceNoteSyncBusy=true;
  try{
    const result=await gasJsonp({action:'getPriceNotes',token:'harga1900',ts:String(Date.now())},8000);
    if(!result||result.ok===false)throw new Error(result?.message||'Respons sinkronisasi Keterangan tidak valid');

    const notesByRow=new Map();
    const notesByIdentity=new Map();
    (result.rows||[]).forEach(r=>{
      notesByRow.set(`${String(r.sheet)}|${Number(r.row)}`,String(r.note??''));
      if(r.identityKey)notesByIdentity.set(`${String(r.sheet)}|${String(r.identityKey)}`,String(r.note??''));
    });

    let changed=0;
    state.all.forEach(x=>{
      const rowKey=`${x.sheet}|${x.rowNumber}`;
      const identityKey=priceIdentityKey(x);
      let has=false,note='';
      if(notesByRow.has(rowKey)){
        has=true;note=notesByRow.get(rowKey);
      }else if(identityKey&&notesByIdentity.has(`${x.sheet}|${identityKey}`)){
        has=true;note=notesByIdentity.get(`${x.sheet}|${identityKey}`);
      }
      if(has){
        if(x.note!==note){x.note=note;changed++}
        updateVisiblePriceNote(x.sheet,x.rowNumber,note);
      }
    });

    if(changed){
      // state.filtered berisi referensi object yang sama dengan state.all,
      // sehingga kedua menu langsung konsisten tanpa reload data harga.
      if(!silent)showStatus(`Keterangan harga tersinkron (${fmtInt(changed)} perubahan).`,'success');
    }else if(!silent){
      showStatus('Keterangan Evaluasi Bulanan/Mingguan sudah sinkron dengan spreadsheet.','success');
    }
  }catch(e){
    if(!silent)showStatus(`Sinkronisasi Keterangan harga gagal: ${e.message}`,'error');
  }finally{
    state.priceNoteSyncBusy=false;
  }
}

function startPriceNoteAutoSync(){
  if(state.priceNoteSyncTimer)clearInterval(state.priceNoteSyncTimer);
  state.priceNoteSyncTimer=setInterval(()=>{
    // Cukup aktif saat salah satu menu evaluasi harga sedang dibuka.
    if(state.view==='period'||state.view==='trend')syncPriceNotesFast(true);
  },CONFIG.priceNoteSyncIntervalMs||2000);
}

function updateVisibleRhNote(row,note){
  const ids=[`note-RH_web-${row}`,`note-rhprice-RH_web-${row}`];
  ids.forEach(id=>{const el=$(id);if(el&&document.activeElement!==el){el.value=note;el.dataset.savedValue=note}});
}

function bindSaveButtons(){document.querySelectorAll('.save-note').forEach(b=>{b.onclick=()=>saveNote(b)})}
function positiveValues(arr){return arr.filter(v=>Number.isFinite(v)&&v>0)}
function commodityAnalysisBase(commodity){const p=currentPeriod(),kab=$('kabFilter').value,mt=$('marketTypeFilter').value,q=norm($('searchFilter').value).toLowerCase();return state.all.filter(x=>x.commodity===commodity&&(p==='Semua'||x.sheet===p)&&(!kab||x.kab===kab)&&(!mt||x.marketType===mt)&&(!q||[x.kab,x.commodityCode,x.commodity,x.quality,x.market,x.respondent,x.note,x.period].join(' ').toLowerCase().includes(q)))}
function groupedPriceStats(data,key){const m=new Map();data.forEach(x=>{const name=x[key]||'–';if(!m.has(name))m.set(name,[]);m.get(name).push(x)});return [...m.entries()].map(([name,rows])=>{const pv=positiveValues(rows.map(x=>x.prev)),cv=positiveValues(rows.map(x=>x.current)),ap=avg(pv),ac=avg(cv);return{name,rows,avgPrev:ap,avgCurrent:ac,change:ap&&ac?((ac-ap)/ap)*100:null,minCurrent:cv.length?Math.min(...cv):null,maxCurrent:cv.length?Math.max(...cv):null,obs:rows.length}}).sort((a,b)=>String(a.name).localeCompare(String(b.name),'id'))}
function renderGroupedPriceChart(id,stats){destroyChart(id);state.charts[id]=new Chart($(id),{type:'bar',data:{labels:stats.map(x=>x.name),datasets:[{label:'Rata-rata Prev',data:stats.map(x=>x.avgPrev),backgroundColor:'rgba(113,128,150,.65)'},{label:'Rata-rata Current',data:stats.map(x=>x.avgCurrent),backgroundColor:'rgba(23,105,224,.72)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:false,ticks:{callback:v=>'Rp '+new Intl.NumberFormat('id-ID',{notation:'compact',maximumFractionDigits:1}).format(v)}}}}})}
function renderRangeChart(id,stats){destroyChart(id);state.charts[id]=new Chart($(id),{data:{labels:stats.map(x=>x.name),datasets:[{type:'bar',label:'Min–Max Current',data:stats.map(x=>Number.isFinite(x.minCurrent)&&Number.isFinite(x.maxCurrent)?[x.minCurrent,x.maxCurrent]:null),backgroundColor:'rgba(32,170,101,.28)',borderColor:'rgba(32,170,101,.85)',borderWidth:1,borderRadius:5},{type:'line',label:'Rata-rata Current',data:stats.map(x=>x.avgCurrent),borderColor:'#1769e0',backgroundColor:'#1769e0',pointRadius:4,pointHoverRadius:6,tension:.18}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:false,ticks:{callback:v=>'Rp '+new Intl.NumberFormat('id-ID',{notation:'compact',maximumFractionDigits:1}).format(v)}}}}})}
function renderCommodity(){
  if(!$('commodityQualityBody'))return;
  const komQuery=norm($('commodityFilter').value).toLowerCase();
  const candidates=[...new Set(state.all.filter(x=>!komQuery||x.commodity.toLowerCase().includes(komQuery)||x.commodityCode.toLowerCase().includes(komQuery)).map(x=>x.commodity).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
  const focus=candidates[0]||'';
  if(state.commodityFocus!==focus){state.commodityFocus=focus;state.commodityDetailQuality='';state.commodityDetailManual=false}
  const base=commodityAnalysisBase(focus);
  const qualityQuery=norm($('qualityFilter').value).toLowerCase();
  const qualities=[...new Set(base.map(x=>x.quality).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
  const filterQuality=(qualityQuery?qualities.find(q=>q.toLowerCase().includes(qualityQuery)):'')||'';
  if(!state.commodityDetailManual)state.commodityDetailQuality=filterQuality||qualities[0]||'';
  if(state.commodityDetailQuality&&!qualities.includes(state.commodityDetailQuality)){state.commodityDetailQuality=filterQuality||qualities[0]||'';state.commodityDetailManual=false}
  const quality=state.commodityDetailQuality||qualities[0]||'';
  const d=base.filter(x=>x.quality===quality),pv=positiveValues(d.map(x=>x.prev)),cv=positiveValues(d.map(x=>x.current)),ap=avg(pv),ac=avg(cv),code=d[0]?.commodityCode||base[0]?.commodityCode||'';
  $('commoditySelectionInfo').innerHTML=focus?`<strong>${esc(code)}</strong> • ${esc(focus)} <span>×</span> <strong>${esc(quality||'Belum ada kualitas')}</strong> <small>• ${fmtInt(new Set(d.map(x=>x.kab).filter(Boolean)).size)} wilayah • klik baris kualitas di tabel kiri untuk mengganti detail</small>`:'Tidak ada data sesuai filter.';
  $('commodityPrev').textContent=fmtMoney(ap);$('commodityCurrent').textContent=fmtMoney(ac);$('commodityChange').textContent=ap&&ac?fmtPct(((ac-ap)/ap)*100):'–';$('commodityObs').textContent=fmtInt(d.length);$('commodityRegionCount').textContent=`${fmtInt(new Set(d.map(x=>x.kab).filter(Boolean)).size)} wilayah`;
  const regionStats=groupedPriceStats(d,'kab');renderGroupedPriceChart('commodityRegionChart',regionStats);renderRangeChart('commodityRangeChart',regionStats);
  if($('commodityRegionTitle'))$('commodityRegionTitle').textContent=quality?`Statistik wilayah • ${quality}`:'Statistik wilayah • kualitas terpilih';
  if($('commodityRegionSubtitle'))$('commodityRegionSubtitle').textContent=quality?`Rata-rata, minimum, dan maksimum harga ${quality} untuk setiap kabupaten/kota. Klik kualitas lain di tabel sebelah kiri untuk mengganti tampilan.`:'Klik salah satu baris pada Ringkasan seluruh kualitas untuk melihat statistik wilayahnya.';
  $('commodityRegionBody').innerHTML=regionStats.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td class="num">${fmtMoney(x.avgPrev)}</td><td class="num">${fmtMoney(x.avgCurrent)}</td><td class="num">${fmtMoney(x.minCurrent)}</td><td class="num">${fmtMoney(x.maxCurrent)}</td><td class="num">${fmtInt(x.obs)}</td></tr>`).join('')||'<tr><td colspan="6">Tidak ada data.</td></tr>';
  const qualityStats=groupedPriceStats(base,'quality');
  $('commodityQualityBody').innerHTML=qualityStats.map(x=>{const first=x.rows[0]||{},regions=[...new Set(x.rows.map(r=>r.kab).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));return`<tr class="quality-summary-row ${x.name===quality?'selected-quality-row':''}" data-quality="${encodeURIComponent(x.name)}" tabindex="0" role="button" aria-label="Tampilkan statistik wilayah untuk kualitas ${esc(x.name)}" title="Klik untuk melihat statistik wilayah kualitas ini"><td><span class="commodity-code">${esc(first.commodityCode||code)}</span></td><td><strong>${esc(x.name)}</strong><small class="row-click-hint">Klik untuk detail wilayah</small></td><td class="num"><strong>${fmtInt(regions.length)}</strong></td><td><span class="region-list">${esc(regions.join(', '))}</span></td><td class="num">${fmtMoney(x.avgPrev)}</td><td class="num">${fmtMoney(x.avgCurrent)}</td><td class="num"><span class="pill ${movementClass(x.change)}">${fmtPct(x.change)}</span></td><td class="num">${fmtMoney(x.minCurrent)}</td><td class="num">${fmtMoney(x.maxCurrent)}</td><td class="num">${fmtInt(x.obs)}</td></tr>`}).join('')||'<tr><td colspan="10">Tidak ada data.</td></tr>';
  document.querySelectorAll('#commodityQualityBody .quality-summary-row').forEach(row=>{
    const choose=()=>{state.commodityDetailQuality=decodeURIComponent(row.dataset.quality||'');state.commodityDetailManual=true;renderCommodity();const panel=$('commodityRegionTitle')?.closest('.panel');if(panel)panel.classList.add('detail-flash');setTimeout(()=>panel?.classList.remove('detail-flash'),550)};
    row.addEventListener('click',choose);
    row.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose()}});
  });
}
function renderMarket(){const g=groupAvg(state.filtered,'market').sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,15);chart('marketRankingChart','bar',g.map(x=>x.name),g.map(x=>x.value),'Perubahan (%)')}

function trendBaseData(){
  const p=currentPeriod(),kab=$('kabFilter').value,kom=norm($('commodityFilter').value).toLowerCase(),qual=norm($('qualityFilter').value).toLowerCase(),mt=$('marketTypeFilter').value,q=norm($('searchFilter').value).toLowerCase(),cat=$('trendCategoryFilter')?.value||'',bands=selectedChangeBands(),allStableOnly=!!$('trendAllStable')?.checked;
  return state.all.filter(x=>{
    const validSeries=x.series.filter(s=>s.valid);
    const allStable=validSeries.length>0&&validSeries.every(s=>Number.isFinite(s.change)&&Math.abs(s.change)<0.005);
    return (p==='Semua'||x.sheet===p)&&(!kab||x.kab===kab)&&(!kom||x.commodity.toLowerCase().includes(kom)||x.commodityCode.toLowerCase().includes(kom))&&(!qual||x.quality.toLowerCase().includes(qual))&&(!mt||x.marketType===mt)&&(!q||[x.kab,x.commodityCode,x.commodity,x.quality,x.market,x.respondent,x.note,x.period].join(' ').toLowerCase().includes(q))&&validSeries.length>0&&(!bands.length||validSeries.some(s=>changeMatchesBands(s.change,bands)))&&(!cat||validSeries.some(s=>s.category?.id===cat))&&(!allStableOnly||allStable);
  });
}
function sortedTrendData(){const arr=trendBaseData(),k=state.trendSortKey,d=state.trendSortDir==='asc'?1:-1;return arr.sort((a,b)=>{let av=a[k],bv=b[k];if(typeof av==='number'||typeof bv==='number'){av=Number.isFinite(av)?av:-Infinity;bv=Number.isFinite(bv)?bv:-Infinity;return(av-bv)*d}return String(av??'').localeCompare(String(bv??''),'id')*d})}
function compactMoney(v){
  if(!Number.isFinite(v))return '–';
  return new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(v);
}
function timelineSlot(label){
  const slots={
    'Prev M1':0,'Prev M2':1,'Prev M3':2,'Prev M4':3,'Prev M5':4,
    'Current M1':5,'Current M2':6,'Current M3':7,'Current M4':8,'Current M5':9,
    'Previous':0,'Current':9
  };
  return Object.prototype.hasOwnProperty.call(slots,label)?slots[label]:null;
}
function sparklineSvg(points,aligned=false){
  if(!points||points.length<2)return '<div class="spark-empty">Data belum cukup untuk grafik</div>';
  const values=points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const w=520,h=66,padX=10,padY=9;
  const xy=values.map((v,i)=>{
    let ratio;
    if(aligned){
      const slot=timelineSlot(points[i].label);
      ratio=slot==null?(points.length===1?0:i/(points.length-1)):slot/9;
    }else{
      ratio=points.length===1?0:i/(points.length-1);
    }
    return{x:padX+ratio*(w-padX*2),y:padY+(max-v)/range*(h-padY*2)};
  });
  const line=xy.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area=`${line} L ${xy[xy.length-1].x.toFixed(1)} ${h-padY} L ${xy[0].x.toFixed(1)} ${h-padY} Z`;
  const dots=xy.map((p,i)=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.2"><title>${esc(points[i].label)}: ${fmtMoney(points[i].value)}</title></circle>`).join('');
  return `<svg class="price-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Grafik tren harga"><path class="spark-area" d="${area}"></path><path class="spark-line" d="${line}"></path>${dots}</svg>`;
}
function movementClass(c){return !Number.isFinite(c)||Math.abs(c)<.005?'stable':c>0?'up':'down'}
function priceTimelineHtml(x){
  const points=x.timelinePoints||[],trans=x.series||[];
  if(!points.length)return '<div class="timeline-empty">Tidak ada harga valid.</div>';

  // Mingguan dan Dwi Mingguan memakai 10 slot waktu yang sama:
  // Prev M1–M5 = slot 0–4, Current M1–M5 = slot 5–9.
  // Dengan cara ini Dwi Mingguan (M1 dan M3) tetap berada tepat di bawah
  // posisi M1 dan M3 Mingguan, sedangkan slot yang tidak ada dibiarkan kosong.
  const aligned=x.sheet==='Mingguan'||x.sheet==='Dwi Mingguan';
  const periodClass=x.sheet==='Dwi Mingguan'?'timeline-dwi':x.sheet==='Mingguan'?'timeline-weekly':'timeline-regular';

  let html=`<div class="price-visual ${periodClass}"><div class="spark-wrap">${sparklineSvg(points,aligned)}</div>`;

  if(aligned){
    html+=`<div class="price-timeline timeline-slot-grid ${periodClass}">`;
    points.forEach((p,i)=>{
      const slot=timelineSlot(p.label);
      const t=i?trans[i-1]:null,cls=t?movementClass(t.change):'start',cat=t?.category?.className||'';
      const nodeCol=(slot==null?i:slot)*2+1;

      if(i){
        const prevSlot=timelineSlot(points[i-1].label);
        const prevCol=(prevSlot==null?i-1:prevSlot)*2+1;
        html+=`<div class="price-connector slot-connector ${cls}" style="grid-column:${prevCol+1}/${nodeCol};"><i>→</i></div>`;
      }

      html+=`<div class="price-node ${cls} ${cat}" style="grid-column:${nodeCol};"><span class="point-label">${esc(p.label)}</span><strong>Rp ${compactMoney(p.value)}</strong>${t?`<small>${Math.abs(t.change)<.005?'— 0,00%':`${t.change>0?'▲':'▼'} ${fmtPct(t.change)}`}</small>`:'<small class="base-label">Harga dasar</small>'}</div>`;
    });
    html+='</div>';
  }else{
    html+=`<div class="price-timeline points-${points.length}">`;
    points.forEach((p,i)=>{
      const t=i?trans[i-1]:null,cls=t?movementClass(t.change):'start',cat=t?.category?.className||'';
      if(i)html+=`<div class="price-connector ${cls}"><i>→</i></div>`;
      html+=`<div class="price-node ${cls} ${cat}"><span class="point-label">${esc(p.label)}</span><strong>Rp ${compactMoney(p.value)}</strong>${t?`<small>${Math.abs(t.change)<.005?'— 0,00%':`${t.change>0?'▲':'▼'} ${fmtPct(t.change)}`}</small>`:'<small class="base-label">Harga dasar</small>'}</div>`;
    });
    html+='</div>';
  }

  return html+'</div>';
}
function trendStatsHtml(x){
  const s=(x.series||[]).filter(v=>v.valid),p=x.timelinePoints||[];
  const up=s.filter(v=>v.change>.005).length,down=s.filter(v=>v.change<-.005).length,stable=s.length-up-down;
  const first=p[0]?.value,last=p[p.length-1]?.value,total=first&&last?((last-first)/first)*100:null;
  const largest=s.slice().sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))[0];
  return `<div class="trend-stats"><div class="trend-total ${movementClass(total)}"><span>Awal → terakhir</span><strong>${Number.isFinite(total)?fmtPct(total):'–'}</strong><small>${fmtMoney(first)} → ${fmtMoney(last)}</small></div><div class="movement-counts"><span class="up">▲ ${up} naik</span><span class="down">▼ ${down} turun</span><span class="stable">— ${stable} tetap</span></div>${largest?`<div class="largest-move"><span>Perubahan terbesar</span><strong class="${movementClass(largest.change)}">${fmtPct(largest.change)}</strong><small>${esc(largest.fromLabel)} → ${esc(largest.toLabel)}</small></div>`:''}</div>`;
}
function trendRowHtml(x){
  const largest=x.series.filter(s=>s.valid).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))[0],cat=largest?.category||CHANGE_CATEGORIES[0];
  return `<tr class="trend-row ${cat.className}"><td>${esc(x.period)}</td><td>${esc(x.kab)}</td><td><span class="commodity-code">${esc(x.commodityCode)}</span></td><td><strong>${esc(x.commodity)}</strong><small class="cell-sub">${esc(x.quality)}</small></td><td>${esc(x.market)}<small class="cell-sub">${esc(x.respondent)}</small></td><td>${priceTimelineHtml(x)}</td><td>${trendStatsHtml(x)}</td><td>${noteCell(x,'trend')}</td><td>${saveButton(x,'trend')}</td></tr>`;
}
function renderTrendLegend(){if(!$('trendLegend'))return;$('trendLegend').innerHTML=CHANGE_CATEGORIES.map(c=>`<span class="legend-chip ${c.className}"><i class="legend-dot" style="background:var(--cat-color)"></i>${esc(c.label)}</span>`).join('');const sel=$('trendCategoryFilter');if(sel&&sel.options.length===1)sel.innerHTML='<option value="">Semua kelompok</option>'+CHANGE_CATEGORIES.map(c=>`<option value="${c.id}">${esc(c.label)}</option>`).join('');const psel=$('periodCategoryFilter');if(psel&&psel.options.length===1)psel.innerHTML='<option value="">Semua kelompok</option>'+CHANGE_CATEGORIES.map(c=>`<option value="${c.id}">${esc(c.label)}</option>`).join('')}
function renderTrend(){if(!$('trendTableBody'))return;renderTrendLegend();const d=sortedTrendData(),counts=Object.fromEntries(CHANGE_CATEGORIES.map(c=>[c.id,0]));d.forEach(x=>x.series.forEach(s=>{if(s.valid&&s.category)counts[s.category.id]++}));$('trendSummary').innerHTML=CHANGE_CATEGORIES.map(c=>`<article class="trend-summary-card ${c.className}"><span>${esc(c.label)}</span><strong>${fmtInt(counts[c.id])}</strong></article>`).join('');const p=paginate(d,state.trendPage,state.trendPageSize);state.trendPage=p.page;$('trendTableBody').innerHTML=p.rows.map(trendRowHtml).join('')||'<tr><td colspan="9">Tidak ada deret harga valid. Nilai 0 dan kosong dilewati.</td></tr>';$('trendPageInfo').textContent=state.trendPageSize==='all'?`Menampilkan semua • ${fmtInt(d.length)} baris • ${fmtInt(d.reduce((n,x)=>n+x.series.filter(s=>s.valid).length,0))} perubahan berurutan`:`Halaman ${p.page} dari ${p.pages} • ${fmtInt(d.length)} baris • ${fmtInt(d.reduce((n,x)=>n+x.series.filter(s=>s.valid).length,0))} perubahan berurutan`;bindSaveButtons();updateTrendSortMarks()}
function updateTrendSortMarks(){document.querySelectorAll('th[data-trend-sort]').forEach(th=>{th.querySelector('.sort-mark')?.remove();if(th.dataset.trendSort===state.trendSortKey)th.insertAdjacentHTML('beforeend',`<span class="sort-mark">${state.trendSortDir==='asc'?'▲':'▼'}</span>`)})}
function bindTrendSort(){document.querySelectorAll('th[data-trend-sort]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.trendSort;if(state.trendSortKey===k)state.trendSortDir=state.trendSortDir==='asc'?'desc':'asc';else{state.trendSortKey=k;state.trendSortDir=k==='maxAbsChange'?'desc':'asc'}state.trendPage=1;renderTrend()}))}

function updatePeriodSortMarks(){document.querySelectorAll('th[data-period-sort]').forEach(th=>{th.querySelector('.sort-mark')?.remove();if(th.dataset.periodSort===state.periodSortKey)th.insertAdjacentHTML('beforeend',`<span class="sort-mark">${state.periodSortDir==='asc'?'▲':'▼'}</span>`)})}
function bindPeriodSort(){document.querySelectorAll('th[data-period-sort]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.periodSort;if(state.periodSortKey===k)state.periodSortDir=state.periodSortDir==='asc'?'desc':'asc';else{state.periodSortKey=k;state.periodSortDir=k==='change'?'desc':'asc'}state.periodPage=1;renderPeriod()}))}
function resetPeriodRawOrder(){state.periodSortKey='rawOrder';state.periodSortDir='asc';state.periodPage=1;renderPeriod();showStatus('Evaluasi Bulanan dikembalikan ke urutan raw data.','success')}
function resetTrendRawOrder(){state.trendSortKey='rawOrder';state.trendSortDir='asc';state.trendPage=1;renderTrend();showStatus('Evaluasi Mingguan dikembalikan ke urutan raw data.','success')}

function matrixData(){
  const groups=new Map();
  state.filtered.forEach(x=>{const key=[x.period,x.commodityCode,x.commodity,x.quality,x.kab].join('¦');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(x)});
  const rows=[...groups.values()].map(rs=>{const f=rs[0],pv=positiveValues(rs.map(x=>x.prev)),cv=positiveValues(rs.map(x=>x.current)),ap=avg(pv),ac=avg(cv);return{period:f.period,commodityCode:f.commodityCode,commodity:f.commodity,quality:f.quality,kab:f.kab,avgPrev:ap,avgCurrent:ac,change:ap&&ac?((ac-ap)/ap)*100:null,minCurrent:cv.length?Math.min(...cv):null,maxCurrent:cv.length?Math.max(...cv):null,markets:new Set(rs.map(x=>x.market).filter(Boolean)).size,obs:rs.length,rawOrder:[SHEET_ORDER[f.sheet]||0,f.commodityCode,f.commodity,f.quality,f.kab].join('|')}});
  const k=state.matrixSortKey,d=state.matrixSortDir==='asc'?1:-1;
  return rows.sort((a,b)=>{if(k==='rawOrder')return String(a.rawOrder).localeCompare(String(b.rawOrder),'id')*d;let av=a[k],bv=b[k];if(typeof av==='number'||typeof bv==='number'){av=Number.isFinite(av)?av:-Infinity;bv=Number.isFinite(bv)?bv:-Infinity;return(av-bv)*d}return String(av??'').localeCompare(String(bv??''),'id')*d});
}
function renderMatrix(){if(!$('matrixBody'))return;const rows=matrixData();$('matrixBody').innerHTML=rows.map(x=>`<tr><td>${esc(x.period)}</td><td><span class="commodity-code">${esc(x.commodityCode)}</span></td><td><strong>${esc(x.commodity)}</strong></td><td>${esc(x.quality)}</td><td><strong>${esc(x.kab)}</strong></td><td class="num">${fmtMoney(x.avgPrev)}</td><td class="num">${fmtMoney(x.avgCurrent)}</td><td class="num"><span class="pill ${movementClass(x.change)}">${fmtPct(x.change)}</span></td><td class="num">${fmtMoney(x.minCurrent)}</td><td class="num">${fmtMoney(x.maxCurrent)}</td><td class="num">${fmtInt(x.markets)}</td><td class="num">${fmtInt(x.obs)}</td></tr>`).join('')||'<tr><td colspan="12">Tidak ada data sesuai filter.</td></tr>';$('matrixInfo').textContent=`${fmtInt(rows.length)} kombinasi komoditas × kualitas × wilayah`;updateMatrixSortMarks()}
function bindMatrixSort(){document.querySelectorAll('th[data-matrix-sort]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.matrixSort;if(state.matrixSortKey===k)state.matrixSortDir=state.matrixSortDir==='asc'?'desc':'asc';else{state.matrixSortKey=k;state.matrixSortDir=['change','avgCurrent','maxCurrent','obs'].includes(k)?'desc':'asc'}renderMatrix()}))}
function updateMatrixSortMarks(){document.querySelectorAll('th[data-matrix-sort]').forEach(th=>{th.querySelector('.sort-mark')?.remove();if(th.dataset.matrixSort===state.matrixSortKey)th.insertAdjacentHTML('beforeend',`<span class="sort-mark">${state.matrixSortDir==='asc'?'▲':'▼'}</span>`)})}
function matrixExportMatrix(){const rows=matrixData();return[['Periode','Kode Komoditas','Komoditas','Kualitas','Wilayah','Avg Prev','Avg Current','Perubahan (%)','Min Current','Max Current','Jumlah Pasar','Observasi'],...rows.map(x=>[x.period,x.commodityCode,x.commodity,x.quality,x.kab,x.avgPrev,x.avgCurrent,x.change,x.minCurrent,x.maxCurrent,x.markets,x.obs])]}
async function exportMatrixView(){const format=$('matrixExportFormat').value,filename='matriks-harga-komoditas-kualitas-wilayah',matrix=matrixExportMatrix();if(format==='csv')return exportMatrixCsv(matrix,filename);if(format==='xlsx')return exportMatrixXlsx(matrix,filename);return captureEvaluation('matrixExportArea',filename,format)}
function resetMatrixOrder(){state.matrixSortKey='rawOrder';state.matrixSortDir='asc';renderMatrix();showStatus('Matriks dikembalikan ke urutan Komoditas → Kualitas → Wilayah.','success')}

function safeFilename(text){return String(text||'data').toLowerCase().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,80)||'data'}
function downloadTimestamp(){
  const d=new Date(),pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}
function latestNote(x,areaId){
  const scope=areaId?$(areaId):document;
  if(scope){
    const candidates=[...scope.querySelectorAll('textarea.editable-note')];
    const found=candidates.find(el=>String(el.dataset.sheet||'')===String(x.sheet)&&Number(el.dataset.row)===Number(x.rowNumber));
    if(found)return found.value;
  }
  return x.note||'';
}
function saveBlob(blob,filename){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function periodExportRows(){return sortedPeriodData()}
function periodExportMatrix(){const rows=periodExportRows(),headers=['Periode','Wilayah','Kode Komoditas','Komoditas','Kualitas','Jenis Pasar','Pasar','Nama Responden','Prev','Current','Perubahan (%)','Kelompok Perubahan','Keterangan','Sheet','Baris Raw'];return[headers,...rows.map(x=>[x.period,x.kab,x.commodityCode,x.commodity,x.quality,x.marketType,x.market,x.respondent,x.prev,x.current,x.change,categoryOfRow(x).label,latestNote(x,'periodExportArea'),x.sheet,x.rowNumber])]}
function trendExportMatrix(){const rows=sortedTrendData(),pointLabels=[...new Set(rows.flatMap(x=>(x.timelinePoints||[]).map(p=>p.label)))];const headers=['Periode','Wilayah','Kode Komoditas','Komoditas','Kualitas','Jenis Pasar','Pasar','Nama Responden',...pointLabels,'Awal → Terakhir (%)','Perubahan Terbesar (%)','Rangkaian Perubahan','Keterangan','Sheet','Baris Raw'];return[headers,...rows.map(x=>{const map=Object.fromEntries((x.timelinePoints||[]).map(p=>[p.label,p.value])),pts=x.timelinePoints||[],first=pts[0]?.value,last=pts[pts.length-1]?.value,total=first&&last?((last-first)/first)*100:null,largest=(x.series||[]).filter(s=>s.valid).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))[0];return[x.period,x.kab,x.commodityCode,x.commodity,x.quality,x.marketType,x.market,x.respondent,...pointLabels.map(l=>map[l]??''),total,largest?.change??'',(x.series||[]).filter(s=>s.valid).map(s=>`${s.fromLabel} → ${s.toLabel}: ${fmtPct(s.change)}`).join(' | '),latestNote(x,'trendExportArea'),x.sheet,x.rowNumber]})]}
function exportMatrixCsv(matrix,filename){const csv=Papa.unparse(matrix);saveBlob(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),filename+'.csv')}
function exportMatrixXlsx(matrix,filename){if(typeof XLSX==='undefined'){showStatus('Library Excel belum termuat. Muat ulang halaman lalu coba lagi.','error');return}const ws=XLSX.utils.aoa_to_sheet(matrix);ws['!freeze']={xSplit:0,ySplit:1};const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Evaluasi');XLSX.writeFile(wb,filename+'.xlsx')}
async function captureEvaluation(areaId,filename,format){const el=$(areaId);if(!el)return;const btn=format==='pdf'?$('periodExportBtn'):null;el.classList.add('exporting');showStatus('Menyiapkan '+format.toUpperCase()+' dari tampilan saat ini...');try{const canvas=await html2canvas(el,{scale:1.35,backgroundColor:'#ffffff',useCORS:true,logging:false,width:el.scrollWidth,height:el.scrollHeight,windowWidth:el.scrollWidth,windowHeight:el.scrollHeight});if(format==='png'){canvas.toBlob(blob=>blob&&saveBlob(blob,filename+'.png'),'image/png');return}const {jsPDF}=window.jspdf||{};if(!jsPDF)throw new Error('Library PDF belum termuat');const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=7,imgW=pageW-margin*2,imgH=canvas.height*imgW/canvas.width;const img=canvas.toDataURL('image/jpeg',.92);let y=margin,remaining=imgH;pdf.addImage(img,'JPEG',margin,y,imgW,imgH);remaining-=pageH-margin*2;while(remaining>0){pdf.addPage();y=margin-(imgH-remaining);pdf.addImage(img,'JPEG',margin,y,imgW,imgH);remaining-=pageH-margin*2}pdf.save(filename+'.pdf')}catch(e){showStatus('Gagal membuat file: '+e.message,'error')}finally{el.classList.remove('exporting')}}
async function exportEvaluation(kind){const isPeriod=kind==='period',format=$(isPeriod?'periodExportFormat':'trendExportFormat').value,matrix=isPeriod?periodExportMatrix():trendExportMatrix(),filename=`${isPeriod?'evaluasi-bulanan':'evaluasi-mingguan'}-${safeFilename(currentPeriod())}-${downloadTimestamp()}`;if(format==='csv')return exportMatrixCsv(matrix,filename);if(format==='xlsx')return exportMatrixXlsx(matrix,filename);return captureEvaluation(isPeriod?'periodExportArea':'trendExportArea',filename,format)}
function renderEvaluation(){const d=state.filtered,ext=d.filter(x=>Math.abs(x.change||0)>=20),missing=d.filter(x=>x.prev==null||x.current==null),up=ext.filter(x=>x.change>0),down=ext.filter(x=>x.change<0);$('riskBadge').textContent=ext.length>50?'Perlu perhatian tinggi':ext.length?'Perlu verifikasi':'Relatif stabil';$('evaluationCards').innerHTML=`<article class="evaluation-card"><strong>Kenaikan ekstrem</strong><div class="metric">${fmtInt(up.length)}</div><p>Observasi naik minimal 20%.</p></article><article class="evaluation-card"><strong>Penurunan ekstrem</strong><div class="metric">${fmtInt(down.length)}</div><p>Observasi turun minimal 20%.</p></article><article class="evaluation-card"><strong>Data kosong</strong><div class="metric">${fmtInt(missing.length)}</div><p>Prev atau current belum terisi.</p></article>`;const priorities=[...ext].sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,20);$('priorityList').innerHTML=priorities.map(x=>`<div class="priority-item"><div class="priority-icon">!</div><div><strong>${esc(x.commodity)} — ${esc(x.respondent)}</strong><p>${esc(x.period)} • ${esc(x.market)} • ${esc(x.kab)}</p></div><div class="priority-value">${fmtPct(x.change)}</div></div>`).join('')||'<p class="muted">Tidak ada perubahan ekstrem sesuai filter.</p>'}
function updateSortMarks(){document.querySelectorAll('th[data-sort]').forEach(th=>{th.querySelector('.sort-mark')?.remove();if(th.dataset.sort===state.sortKey)th.insertAdjacentHTML('beforeend',`<span class="sort-mark">${state.sortDir==='asc'?'▲':'▼'}</span>`)})}
function bindSort(){document.querySelectorAll('th[data-sort]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.sort;if(state.sortKey===k)state.sortDir=state.sortDir==='asc'?'desc':'asc';else{state.sortKey=k;state.sortDir=k==='change'?'desc':'asc'}renderPeriod();renderRecap();updateSortMarks()}))}
function downloadCsv(){const rows=sortedData(),headers=['Periode','Wilayah','Komoditas','Kualitas','Jenis Pasar','Pasar','Nama Responden','Prev','Current','Perubahan (%)','Keterangan'];const csv=Papa.unparse([headers,...rows.map(x=>[x.period,x.kab,x.commodity,x.quality,x.marketType,x.market,x.respondent,x.prev,x.current,x.change,x.note])]);const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rekap-monitoring-harga.csv';a.click();URL.revokeObjectURL(a.href)}

function populateRhFilters(){
  // Nama komoditas RH berasal dari kolom D sheet RH web.
  populateDatalist('rhCommodityFilter','rhCommodityFilterList',unique(state.rhAll,'commodity'));refreshSearchCombo('rhCommodityFilter');
}
const RH_VALUE_BANDS=[
  {id:'eq100',label:'RH = 100',test:v=>Math.abs(v-100)<0.005},
  {id:'up100_110',label:'RH >100–110',test:v=>v>100&&v<=110},
  {id:'up110_120',label:'RH >110–120',test:v=>v>110&&v<=120},
  {id:'up120_130',label:'RH >120–130',test:v=>v>120&&v<=130},
  {id:'up130_140',label:'RH >130–140',test:v=>v>130&&v<=140},
  {id:'up140',label:'RH >140',test:v=>v>140},
  {id:'down90_100',label:'RH 90–<100',test:v=>v>=90&&v<100},
  {id:'down80_90',label:'RH 80–<90',test:v=>v>=80&&v<90},
  {id:'down70_80',label:'RH 70–<80',test:v=>v>=70&&v<80},
  {id:'down60_70',label:'RH 60–<70',test:v=>v>=60&&v<70},
  {id:'down60',label:'RH <60',test:v=>v<60}
];
function selectedRhCategories(){return [...document.querySelectorAll('.rh-category-check:checked')].map(el=>String(el.value))}
function rhCategory(rh){return Number.isFinite(rh)?classifyChange(rh-100):null}
function rhValueBand(rh){if(!Number.isFinite(rh))return null;return RH_VALUE_BANDS.find(b=>b.test(rh))||null}
function rhMatchesCategories(rh,cats=selectedRhCategories()){
  if(!cats.length)return true;
  const band=rhValueBand(rh);
  return !!band&&cats.includes(band.id);
}
function rhFilterValues(){return{kab:$('rhKabFilter')?.value||'',kom:norm($('rhCommodityFilter')?.value).toLowerCase(),cond:$('rhConditionFilter')?.value||'',noteStatus:$('rhNoteFilter')?.value||'',q:norm($('rhSearchFilter')?.value).toLowerCase(),cats:selectedRhCategories()}}
function rhBaseRows(){const f=rhFilterValues();return state.rhAll.filter(x=>(!f.kab||x.kab===f.kab)&&(!f.kom||x.commodity.toLowerCase().includes(f.kom)||x.commodityCode.toLowerCase().includes(f.kom))&&(!f.q||[x.kab,x.commodityCode,x.commodity,x.note].join(' ').toLowerCase().includes(f.q))&&rhMatchesCategories(x.rh,f.cats))}
function rhPivotRows(){
  const f=rhFilterValues(),base=state.rhAll.filter(x=>(!f.kom||x.commodity.toLowerCase().includes(f.kom)||x.commodityCode.toLowerCase().includes(f.kom))&&(!f.q||[x.commodityCode,x.commodity,x.note].join(' ').toLowerCase().includes(f.q)));
  const map=new Map();base.forEach(x=>{const key=x.commodityCode||x.commodity;if(!key)return;if(!map.has(key))map.set(key,{rawOrder:x.rawOrder,commodityCode:x.commodityCode,commodity:x.commodity,byKab:{}});const p=map.get(key);p.rawOrder=Math.min(p.rawOrder,x.rawOrder);p.byKab[x.kab]=x});
  let rows=[...map.values()].map(r=>{
    const vals=RH_KABS.map(k=>r.byKab[k]?.rh).filter(Number.isFinite),
      up=vals.filter(v=>v>100).length,
      down=vals.filter(v=>v<100).length,
      eq=vals.filter(v=>Math.abs(v-100)<1e-9).length;
    let outlierKab='';
    const validKabValues=RH_KABS
      .map(k=>({kab:k,rh:r.byKab[k]?.rh}))
      .filter(x=>Number.isFinite(x.rh));

    /*
      LOGIKA FINAL "ARAH BERBEDA SENDIRI"
      ====================================
      Nilai 100 dianggap NETRAL dan TIDAK pernah menjadi outlier.

      Kondisi yang dianggap Arah Berbeda Sendiri:
      1. 3 wilayah = 100 dan 1 wilayah != 100
         -> wilayah yang !=100 menjadi outlier.

      2. Setelah nilai 100 diabaikan:
         - tepat 1 wilayah >100 dan minimal 2 wilayah <100
           -> wilayah >100 menjadi outlier.
         - tepat 1 wilayah <100 dan minimal 2 wilayah >100
           -> wilayah <100 menjadi outlier.

      Dengan demikian:
      99, 103, 100, 99       -> 103 ungu
      100.41,100.10,99,100   -> 99 ungu
      100,100,100,101        -> 101 ungu
      100,100,100,93         -> 93 ungu
      100,100,96,99.85       -> tidak ada ungu
      100,100,101,99         -> tidak ada ungu
      101,98,97,96           -> 101 ungu
      99,102,103,104         -> 99 ungu
    */
    if(validKabValues.length===4){
      const equal100=validKabValues.filter(x=>Math.abs(x.rh-100)<1e-9);
      const above100=validKabValues.filter(x=>x.rh>100);
      const below100=validKabValues.filter(x=>x.rh<100);

      if(equal100.length===3){
        const different=validKabValues.find(x=>Math.abs(x.rh-100)>=1e-9);
        outlierKab=different?.kab||'';
      }else if(above100.length===1 && below100.length>=2){
        outlierKab=above100[0].kab;
      }else if(below100.length===1 && above100.length>=2){
        outlierKab=below100[0].kab;
      }
    }
    const noteKabs=RH_KABS.filter(k=>norm(r.byKab[k]?.note)!=='');
    const availableKabs=RH_KABS.filter(k=>r.byKab[k]);
    return{...r,up,down,eq,outlierKab,mixed:up>0&&down>0,noteKabs,noteCount:noteKabs.length,availableKabCount:availableKabs.length};
  });
  if(f.kab)rows=rows.filter(r=>Number.isFinite(r.byKab[f.kab]?.rh));
  if(f.cond==='outlier')rows=rows.filter(r=>r.outlierKab);else if(f.cond==='mixed')rows=rows.filter(r=>r.mixed);else if(f.cond==='all-up')rows=rows.filter(r=>{const v=RH_KABS.map(k=>r.byKab[k]?.rh).filter(Number.isFinite);return v.length&&v.every(x=>x>100)});else if(f.cond==='all-down')rows=rows.filter(r=>{const v=RH_KABS.map(k=>r.byKab[k]?.rh).filter(Number.isFinite);return v.length&&v.every(x=>x<100)});else if(f.cond==='has-100')rows=rows.filter(r=>r.eq>0);
  if(f.noteStatus==='has-note')rows=rows.filter(r=>r.noteCount>0);
  else if(f.noteStatus==='no-note')rows=rows.filter(r=>r.noteCount===0);
  else if(f.noteStatus==='all-note')rows=rows.filter(r=>r.availableKabCount>0&&r.noteCount===r.availableKabCount);
  else if(String(f.noteStatus).startsWith('kab-')){const k=f.noteStatus.replace('kab-','');rows=rows.filter(r=>r.noteKabs.includes(k))}
  if(f.cats.length)rows=rows.filter(r=>RH_KABS.some(k=>rhMatchesCategories(r.byKab[k]?.rh,f.cats)));
  return rows;
}
function rhValueClass(v,isOutlier){if(isOutlier)return'rh-value-outlier';if(!Number.isFinite(v))return'rh-value-missing';const c=rhCategory(v);return c?`rh-value-${c.id}`:'rh-value-missing'}
function rhCellHtml(item,isOutlier){if(!item)return'<div class="rh-cell rh-value-missing"><strong>–</strong><small>Tidak ada data</small></div>';return`<div class="rh-cell ${rhValueClass(item.rh,isOutlier)}"><strong>${Number.isFinite(item.rh)?item.rh.toFixed(2).replace('.',','):'–'}</strong><small>${Number.isFinite(item.rh)?(item.rh>100?'▲ di atas 100':item.rh<100?'▼ di bawah 100':'— sama dengan 100'):'Tidak dapat dihitung'}</small>${isOutlier?'<span class="rh-outlier-tag">Arah berbeda</span>':''}<details class="rh-note-details"><summary>Keterangan</summary><textarea class="editable-note rh-note" id="note-RH_web-${item.rowNumber}">${esc(item.note)}</textarea><button class="btn primary save-note rh-save" data-sheet="RH web" data-row="${item.rowNumber}" data-note-id="note-RH_web-${item.rowNumber}">Simpan</button></details></div>`}
function rhNoteStatusHtml(r){
  const chips=RH_KABS.map(k=>{
    const item=r.byKab[k],has=item&&norm(item.note)!=='';
    if(!item)return `<span class="rh-note-chip missing" title="${k}: tidak ada data">${k} <b>–</b></span>`;
    return `<span class="rh-note-chip ${has?'has':'none'}" title="${k}: ${has?'ada catatan':'belum ada catatan'}">${k} <b>${has?'✓':'×'}</b></span>`;
  }).join('');
  const total=r.availableKabCount||0,count=r.noteCount||0;
  const label=count===0?'Belum ada catatan':`${count} dari ${total} wilayah`;
  return `<div class="rh-note-status"><div class="rh-note-chip-row">${chips}</div><small class="${count?'has-text':'none-text'}">${label}</small></div>`;
}
function sortedRhPivot(){const arr=rhPivotRows(),k=state.rhSortKey,d=state.rhSortDir==='asc'?1:-1;return arr.sort((a,b)=>{let av,bv;if(RH_KABS.includes(k)){av=a.byKab[k]?.rh;bv=b.byKab[k]?.rh}else{av=a[k];bv=b[k]}if(typeof av==='number'||typeof bv==='number'){av=Number.isFinite(av)?av:-Infinity;bv=Number.isFinite(bv)?bv:-Infinity;return(av-bv)*d}return String(av??'').localeCompare(String(bv??''),'id')*d})}
function renderRh(){if(!$('rhTableBody'))return;const d=sortedRhPivot(),allVals=d.flatMap(r=>RH_KABS.map(k=>r.byKab[k]?.rh).filter(Number.isFinite));$('rhKpiCommodity').textContent=fmtInt(d.length);$('rhKpiUp').textContent=fmtInt(allVals.filter(v=>v>100).length);$('rhKpiDown').textContent=fmtInt(allVals.filter(v=>v<100).length);$('rhKpiOutlier').textContent=fmtInt(d.filter(r=>r.outlierKab).length);const p=paginate(d,state.rhPage,state.rhPageSize);state.rhPage=p.page;const size=state.rhPageSize==='all'?d.length:Number(state.rhPageSize),start=d.length?((p.page-1)*size+1):0,end=Math.min(p.page*size,d.length);$('rhTableBody').innerHTML=p.rows.map((r,i)=>`<tr><td>${state.rhPageSize==='all'?i+1:(p.page-1)*Number(state.rhPageSize)+i+1}</td><td><span class="commodity-code">${esc(r.commodityCode)}</span></td><td><strong>${esc(r.commodity)}</strong></td><td>${rhNoteStatusHtml(r)}</td>${RH_KABS.map(k=>`<td class="num">${rhCellHtml(r.byKab[k],r.outlierKab===k)}</td>`).join('')}</tr>`).join('')||'<tr><td colspan="8">Tidak ada data RH sesuai filter.</td></tr>';$('rhPageInfo').textContent=state.rhPageSize==='all'?`Menampilkan semua ${fmtInt(d.length)} komoditas`:`Menampilkan ${fmtInt(start)}–${fmtInt(end)} dari ${fmtInt(d.length)} komoditas • ${fmtInt(p.rows.length)} baris pada halaman ini`;$('rhPrevPage').disabled=p.page<=1;$('rhNextPage').disabled=p.page>=p.pages;bindSaveButtons();updateRhSortMarks()} 

function rhPriceRows(){const f=rhFilterValues();return state.rhAll.filter(x=>(!f.kab||x.kab===f.kab)&&(!f.kom||x.commodity.toLowerCase().includes(f.kom)||x.commodityCode.toLowerCase().includes(f.kom))&&(!f.q||[x.kab,x.commodityCode,x.commodity,x.note].join(' ').toLowerCase().includes(f.q))&&rhMatchesCategories(x.rh,f.cats))}
function sortedRhPrice(){const arr=rhPriceRows(),k=state.rhPriceSortKey,d=state.rhPriceSortDir==='asc'?1:-1;return arr.sort((a,b)=>{let av=a[k],bv=b[k];if(typeof av==='number'||typeof bv==='number'){av=Number.isFinite(av)?av:-Infinity;bv=Number.isFinite(bv)?bv:-Infinity;return(av-bv)*d}return String(av??'').localeCompare(String(bv??''),'id')*d})}
function rhPriceRowHtml(x,n){const cls=rhValueClass(x.rh,false),chg=Number.isFinite(x.rh)?x.rh-100:null,cat=classifyChange(chg);return`<tr><td>${n}</td><td>${esc(x.kab)}</td><td><span class="commodity-code">${esc(x.commodityCode)}</span></td><td><strong>${esc(x.commodity)}</strong></td><td class="num"><div class="period-price-card base-price"><span>Previous</span><strong>${fmtMoney(x.prev)}</strong></div></td><td class="num"><div class="period-price-card current-price ${cat?.className||''}"><span>Current</span><strong>${fmtMoney(x.current)}</strong></div></td><td class="num"><span class="rh-price-badge ${cls}">${Number.isFinite(x.rh)?x.rh.toFixed(2).replace('.',','):'–'}<small>${Number.isFinite(chg)?fmtPct(chg):'–'}</small></span></td><td><textarea class="editable-note rh-note" id="note-rhprice-RH_web-${x.rowNumber}">${esc(x.note)}</textarea></td><td><button class="btn primary save-note" data-sheet="RH web" data-row="${x.rowNumber}" data-note-id="note-rhprice-RH_web-${x.rowNumber}" data-kab="${esc(x.kab)}" data-code="${esc(x.commodityCode)}" data-commodity="${esc(x.commodity)}">Simpan</button></td></tr>`}
function renderRhPrice(){if(!$('rhPriceTableBody'))return;const d=sortedRhPrice();$('rhPriceKpiObs').textContent=fmtInt(d.length);$('rhPriceKpiUp').textContent=fmtInt(d.filter(x=>x.rh>100).length);$('rhPriceKpiDown').textContent=fmtInt(d.filter(x=>x.rh<100).length);$('rhPriceKpiStable').textContent=fmtInt(d.filter(x=>Number.isFinite(x.rh)&&Math.abs(x.rh-100)<1e-9).length);const p=paginate(d,state.rhPricePage,state.rhPricePageSize);state.rhPricePage=p.page;const size=state.rhPricePageSize==='all'?d.length:Number(state.rhPricePageSize),start=d.length?((p.page-1)*size+1):0,end=Math.min(p.page*size,d.length);$('rhPriceTableBody').innerHTML=p.rows.map((x,i)=>rhPriceRowHtml(x,state.rhPricePageSize==='all'?i+1:(p.page-1)*Number(state.rhPricePageSize)+i+1)).join('')||'<tr><td colspan="9">Tidak ada data sesuai filter.</td></tr>';$('rhPricePageInfo').textContent=state.rhPricePageSize==='all'?`Menampilkan semua ${fmtInt(d.length)} observasi`:`Menampilkan ${fmtInt(start)}–${fmtInt(end)} dari ${fmtInt(d.length)} observasi • ${fmtInt(p.rows.length)} baris pada halaman ini`;$('rhPricePrevPage').disabled=p.page<=1;$('rhPriceNextPage').disabled=p.page>=p.pages;bindSaveButtons();updateRhPriceSortMarks()}
function updateRhSortMarks(){document.querySelectorAll('th[data-rh-sort]').forEach(th=>{th.classList.remove('sorted-asc','sorted-desc');if(th.dataset.rhSort===state.rhSortKey)th.classList.add(state.rhSortDir==='asc'?'sorted-asc':'sorted-desc')})}
function updateRhPriceSortMarks(){document.querySelectorAll('th[data-rhp-sort]').forEach(th=>{th.classList.remove('sorted-asc','sorted-desc');if(th.dataset.rhpSort===state.rhPriceSortKey)th.classList.add(state.rhPriceSortDir==='asc'?'sorted-asc':'sorted-desc')})}
function bindRhSort(){document.querySelectorAll('th[data-rh-sort]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.rhSort;if(state.rhSortKey===k)state.rhSortDir=state.rhSortDir==='asc'?'desc':'asc';else{state.rhSortKey=k;state.rhSortDir='asc'}state.rhPage=1;renderRh()}));document.querySelectorAll('th[data-rhp-sort]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.rhpSort;if(state.rhPriceSortKey===k)state.rhPriceSortDir=state.rhPriceSortDir==='asc'?'desc':'asc';else{state.rhPriceSortKey=k;state.rhPriceSortDir='asc'}state.rhPricePage=1;renderRhPrice()}))}
function resetRhOrder(){state.rhSortKey='rawOrder';state.rhSortDir='asc';state.rhPage=1;renderRh();showStatus('Tabulasi RH dikembalikan ke urutan raw data.','success')}
function resetRhPriceOrder(){state.rhPriceSortKey='rawOrder';state.rhPriceSortDir='asc';state.rhPricePage=1;renderRhPrice();showStatus('Harga RH dikembalikan ke urutan raw data.','success')}
function rhExportMatrix(){return[['No','Kode Komoditas','Komoditas','Jumlah Wilayah Ada Catatan','Wilayah Ada Catatan',...RH_KABS.flatMap(k=>[`RH ${k}`,`Keterangan ${k}`])],...sortedRhPivot().map((r,i)=>[i+1,r.commodityCode,r.commodity,r.noteCount,(r.noteKabs||[]).join(', '),...RH_KABS.flatMap(k=>[r.byKab[k]?.rh??'',r.byKab[k]?.note??''])])]}
function rhPriceExportMatrix(){return[['No','Wilayah','Kode Komoditas','Komoditas','Previous','Current','RH','Klasifikasi RH','Keterangan'],...sortedRhPrice().map((x,i)=>[i+1,x.kab,x.commodityCode,x.commodity,x.prev??'',x.current??'',x.rh??'',rhValueBand(x.rh)?.label||'',x.note])]}
async function exportRh(kind){const isPivot=kind==='rh',format=$(isPivot?'rhExportFormat':'rhPriceExportFormat').value,matrix=isPivot?rhExportMatrix():rhPriceExportMatrix(),filename=isPivot?'tabulasi-rh':'harga-rh';if(format==='csv')return exportMatrixCsv(matrix,filename);if(format==='xlsx')return exportMatrixXlsx(matrix,filename);return captureEvaluation(isPivot?'rhExportArea':'rhPriceExportArea',filename,format)}
function jsonpAppsScript(params,timeoutMs=5000){
  return new Promise((resolve,reject)=>{
    const base=String(CONFIG.appsScriptUrl||'').trim();
    if(!base||base.includes('PASTE_URL')||!base.endsWith('/exec'))return reject(new Error('URL Apps Script belum diatur'));
    const callback='__rhSync_'+Date.now()+'_'+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    let finished=false;
    const cleanup=()=>{try{delete window[callback]}catch(_){window[callback]=undefined}script.remove()};
    const timer=setTimeout(()=>{if(finished)return;finished=true;cleanup();reject(new Error('Timeout sinkronisasi RH'))},timeoutMs);
    window[callback]=data=>{if(finished)return;finished=true;clearTimeout(timer);cleanup();resolve(data)};
    const qs=new URLSearchParams({...params,callback,ts:String(Date.now())});
    script.src=base+'?'+qs.toString();
    script.onerror=()=>{if(finished)return;finished=true;clearTimeout(timer);cleanup();reject(new Error('Gagal membaca Keterangan RH'))};
    document.head.appendChild(script);
  });
}
async function syncRhNotesFast(silent=false){
  const active=document.activeElement;
  if(state.rhSyncBusy||(active&&active.matches&&active.matches('textarea.rh-note, #rhPriceTableBody textarea.editable-note')))return;
  state.rhSyncBusy=true;
  try{
    const result=await jsonpAppsScript({action:'getRhNotes',token:'harga1900'});
    if(!result||result.ok===false)throw new Error(result?.message||'Respons sinkronisasi tidak valid');
    const notes=new Map((result.rows||[]).map(x=>[Number(x.row),String(x.note??'')]));
    let changed=0;
    state.rhAll.forEach(x=>{
      if(notes.has(x.rowNumber)){
        const note=notes.get(x.rowNumber);
        if(x.note!==note){x.note=note;changed++}
        updateVisibleRhNote(x.rowNumber,note);
      }
    });
    $('lastUpdate').textContent=`Diperbarui ${new Date().toLocaleString('id-ID')}`;
    if(!silent)showStatus(`Keterangan RH tersinkron (${fmtInt(changed)} perubahan).`,'success');
  }catch(e){
    if(!silent)showStatus(`Sinkronisasi Keterangan RH gagal: ${e.message}`,'error');
  }finally{state.rhSyncBusy=false}
}
async function syncRhFromSheet(silent=false){
  // Sinkron penuh tetap tersedia untuk tombol Muat ulang / perubahan nilai RH.
  const active=document.activeElement;
  if(state.rhSyncBusy||(active&&active.matches&&active.matches('textarea.rh-note, #rhPriceTableBody textarea.editable-note')))return;
  state.rhSyncBusy=true;
  try{
    const fresh=await fetchRhSheet();
    state.rhAll=fresh;
    populateRhFilters();
    if(state.view==='rh')renderRh();
    if(state.view==='rhprice')renderRhPrice();
    $('lastUpdate').textContent=`Diperbarui ${new Date().toLocaleString('id-ID')}`;
    if(!silent)showStatus('Data RH dan Keterangan berhasil disinkronkan dari spreadsheet.','success');
  }catch(e){
    if(!silent)showStatus(`Sinkronisasi RH gagal: ${e.message}`,'error');
  }finally{state.rhSyncBusy=false}
}
function startRhAutoSync(){
  if(state.rhSyncTimer)clearInterval(state.rhSyncTimer);
  // Hanya tarik kolom Keterangan melalui Apps Script setiap 2 detik.
  // Ini lebih cepat daripada membaca ulang seluruh sheet via CSV/gviz.
  state.rhSyncTimer=setInterval(()=>{if(state.view==='rh'||state.view==='rhprice')syncRhNotesFast(true)},CONFIG.rhSyncIntervalMs);
}

function refreshRhViews(){state.rhPage=1;state.rhPricePage=1;renderRh();renderRhPrice()}

function switchView(view){state.view=view;document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));$(`view-${view}`).classList.add('active-view');document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));const isRh=view==='rh'||view==='rhprice';$('globalFilters').classList.toggle('hidden',isRh);$('rhFilters').classList.toggle('hidden',!isRh);const rhCondWrap=$('rhConditionFilterWrap');if(rhCondWrap)rhCondWrap.classList.toggle('hidden',view==='rhprice');const rhNoteWrap=$('rhNoteFilterWrap');if(rhNoteWrap)rhNoteWrap.classList.toggle('hidden',view==='rhprice');const allStableWrap=$('trendAllStableWrap');if(allStableWrap){const showAllStable=view==='trend';allStableWrap.classList.toggle('hidden',!showAllStable);allStableWrap.style.display=showAllStable?'':'none';}const stableLabel=$('changeBandStableLabel');if(stableLabel)stableLabel.textContent=view==='period'?'Tidak ada perubahan harga':'Minimal 1 Minggu Tetap';const titles={dashboard:['Dashboard','Ringkasan perkembangan harga.'],period:['Evaluasi Bulanan','Mingguan, Dwi Mingguan, Bulanan, atau seluruh periode.'],commodity:['Analisis Komoditas × Kualitas','Perbandingan harga menurut komoditas, kualitas, dan wilayah.'],market:['Analisis Pasar','Peringkat pasar berdasarkan perubahan.'],trend:['Evaluasi Mingguan','Deret perubahan harga mingguan secara berurutan dari periode previous menuju current.'],evaluation:['Evaluasi Ringkas','Prioritas verifikasi perubahan harga.'],matrix:['Matriks Komoditas','Seluruh komoditas × kualitas × kabupaten/kota dalam satu tabel analisis.'],rh:['Tabulasi RH','Perbandingan RH antar kabupaten/kota berdasarkan komoditas.'],rhprice:['Harga RH','Previous, Current, RH, dan Keterangan dari sheet RH web.']};$('pageTitle').textContent=titles[view][0];$('pageSubtitle').textContent=titles[view][1];$('sidebar').classList.remove('open')}
function init(){const logged=sessionStorage.getItem('hargaLogin')==='1';$('loginScreen').classList.toggle('hidden',logged);$('app').classList.toggle('hidden',!logged);$('loginForm').addEventListener('submit',e=>{e.preventDefault();if($('username').value===CONFIG.credentials.username&&$('password').value===CONFIG.credentials.password){sessionStorage.setItem('hargaLogin','1');$('loginScreen').classList.add('hidden');$('app').classList.remove('hidden');loadAll()}else{$('loginError').textContent='Username atau password salah.';$('loginError').classList.remove('hidden')}});$('logoutBtn').onclick=()=>{sessionStorage.removeItem('hargaLogin');location.reload()};$('refreshBtn').onclick=loadAll;$('menuBtn').onclick=()=>$('sidebar').classList.toggle('open');document.querySelectorAll('.nav-item').forEach(n=>n.onclick=()=>switchView(n.dataset.view));$('periodFilter').addEventListener('change',()=>handlePeriodCommodityChange('period'));['kabFilter','marketTypeFilter'].forEach(id=>$(id).addEventListener('change',applyFilters));document.querySelectorAll('.change-band-check').forEach(el=>el.addEventListener('change',applyFilters));let filterTimer;const liveFilter=()=>{clearTimeout(filterTimer);filterTimer=setTimeout(applyFilters,120)};$('commodityFilter').addEventListener('input',()=>{updateQualityDatalist(false);liveFilter()});$('commodityFilter').addEventListener('change',()=>handlePeriodCommodityChange('commodity'));$('qualityFilter').addEventListener('input',()=>{state.commodityDetailManual=false;liveFilter()});$('qualityFilter').addEventListener('change',()=>{state.commodityDetailManual=false;applyFilters()});$('searchFilter').addEventListener('input',liveFilter);setupSearchCombo('commodityFilter',()=>commodityOptionsForPeriod(),'Semua komoditas');setupSearchCombo('qualityFilter',()=>qualityOptionsForCommodity(),'Semua kualitas');$('periodPrevPage').onclick=()=>{if(state.periodPage>1){state.periodPage--;renderPeriod()}};$('periodNextPage').onclick=()=>{state.periodPage++;renderPeriod()};$('periodCategoryFilter').addEventListener('change',()=>{state.periodPage=1;renderPeriod()});$('periodPageSize').addEventListener('change',e=>{state.periodPageSize=e.target.value==='all'?'all':Number(e.target.value);state.periodPage=1;renderPeriod()});$('periodRawOrderBtn').onclick=resetPeriodRawOrder;$('periodExportBtn').onclick=()=>exportEvaluation('period');$('trendPrevPage').onclick=()=>{if(state.trendPage>1){state.trendPage--;renderTrend()}};$('trendNextPage').onclick=()=>{state.trendPage++;renderTrend()};$('trendAllStable')?.addEventListener('change',()=>{state.trendPage=1;renderTrend()});$('trendCategoryFilter').addEventListener('change',()=>{state.trendPage=1;renderTrend()});$('trendPageSize').addEventListener('change',e=>{state.trendPageSize=e.target.value==='all'?'all':Number(e.target.value);state.trendPage=1;renderTrend()});$('trendRawOrderBtn').onclick=resetTrendRawOrder;$('trendExportBtn').onclick=()=>exportEvaluation('trend');$('trendRefreshBtn').onclick=loadAll;$('matrixExportBtn').onclick=exportMatrixView;$('matrixRawOrderBtn').onclick=resetMatrixOrder;bindPeriodSort();bindTrendSort();bindMatrixSort();bindRhSort();['rhKabFilter','rhConditionFilter','rhNoteFilter'].forEach(id=>$(id).addEventListener('change',refreshRhViews));document.querySelectorAll('.rh-category-check').forEach(el=>el.addEventListener('change',refreshRhViews));let rhTimer;const rhLive=()=>{clearTimeout(rhTimer);rhTimer=setTimeout(refreshRhViews,120)};$('rhCommodityFilter').addEventListener('input',rhLive);$('rhCommodityFilter').addEventListener('change',refreshRhViews);setupSearchCombo('rhCommodityFilter',()=>unique(state.rhAll,'commodity'),'Semua komoditas');$('rhSearchFilter').addEventListener('input',rhLive);$('rhPageSize').addEventListener('change',e=>{state.rhPageSize=e.target.value==='all'?'all':Number(e.target.value);state.rhPage=1;renderRh()});$('rhPricePageSize').addEventListener('change',e=>{state.rhPricePageSize=e.target.value==='all'?'all':Number(e.target.value);state.rhPricePage=1;renderRhPrice()});$('rhPrevPage').onclick=()=>{if(state.rhPage>1){state.rhPage--;renderRh()}};$('rhNextPage').onclick=()=>{state.rhPage++;renderRh()};$('rhPricePrevPage').onclick=()=>{if(state.rhPricePage>1){state.rhPricePage--;renderRhPrice()}};$('rhPriceNextPage').onclick=()=>{state.rhPricePage++;renderRhPrice()};$('rhRawOrderBtn').onclick=resetRhOrder;$('rhPriceRawOrderBtn').onclick=resetRhPriceOrder;$('rhExportBtn').onclick=()=>exportRh('rh');$('rhPriceExportBtn').onclick=()=>exportRh('rhprice');startRhAutoSync();startPriceNoteAutoSync();if(logged)loadAll()}
document.addEventListener('DOMContentLoaded',init);

window.addEventListener('DOMContentLoaded',initLocalDataPeriod);
