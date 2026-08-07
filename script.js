const CONFIG={
  spreadsheetId:'1To6WfnCyCn8ms7o1KQ5M_UOtvmk2yO1uH50g1rjA8Eg',
  appsScriptUrl:'https://script.google.com/macros/s/AKfycbwe2FvCpkYpEiXhWyMW2BXuqNB9TcJaNq9MqigpNk_UjKda8CA5VyGPnpnPmD0nBcrtWg/exec',
  credentials:{username:'harga1900',password:'harga1900'},
  pageSize:25
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
const state={all:[],filtered:[],view:'dashboard',page:1,periodPage:1,trendPage:1,periodPageSize:50,trendPageSize:50,sortKey:'change',sortDir:'desc',periodSortKey:'rawOrder',periodSortDir:'asc',trendSortKey:'rawOrder',trendSortDir:'asc',charts:{}};
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
function csvUrl(sheet,cfg){return `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&range=A2:${cfg.lastColumn}`}
async function fetchSheet(sheet,cfg){const res=await fetch(csvUrl(sheet,cfg),{cache:'no-store'});if(!res.ok)throw new Error(`Gagal membaca sheet ${sheet}`);const text=await res.text();const parsed=Papa.parse(text,{skipEmptyLines:true}).data;if(parsed.length<2)return[];return parsed.slice(1).map((r,i)=>{
  const prev=priceNum(r[cfg.prevIndex]),current=priceNum(r[cfg.currentIndex]);
  const change=prev&&current!=null?((current-prev)/prev)*100:null;
  const timeline=buildTimeline(r,cfg),series=timeline.series,validSeries=series.filter(s=>s.valid),largest=validSeries.slice().sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))[0]||null;return{sheet,period:periodLabel(sheet),rowNumber:i+3,rawOrder:(SHEET_ORDER[sheet]||0)*1000000+(i+3),kab:norm(r[0]),commodityCode:norm(r[1]).replace(/\.0$/,''),commodity:norm(r[2]),quality:norm(r[5]),marketType:norm(r[7]),market:norm(r[9]),respondent:norm(r[cfg.respondentIndex]),prev,current,change,note:norm(r[cfg.noteIndex]),noteColumn:cfg.noteColumn,timelinePoints:timeline.points,series,maxAbsChange:largest?Math.abs(largest.change):null,dominantCategory:largest?.category?.label||'Tidak dapat dihitung',dominantCategoryId:largest?.category?.id||''};
  }).filter(x=>x.commodity||x.respondent||x.prev!=null||x.current!=null);
}
async function loadAll(){showStatus('Memuat data dari tiga sheet...');try{const entries=Object.entries(SHEETS);const groups=await Promise.all(entries.map(([s,c])=>fetchSheet(s,c)));state.all=groups.flat();state.page=1;state.periodPage=1;state.trendPage=1;populateFilters();applyFilters();$('lastUpdate').textContent=`Diperbarui ${new Date().toLocaleString('id-ID')}`;showStatus(`${fmtInt(state.all.length)} observasi berhasil dimuat.`)}catch(e){showStatus(`${e.message}. Pastikan spreadsheet dapat diakses oleh siapa saja yang memiliki link.`,'error')}}
function populateSelect(id,items,placeholder){const el=$(id),old=el.value;el.innerHTML=`<option value="">${placeholder}</option>`+items.map(v=>`<option value="${esc(v)}">${esc(v)}</option>`).join('');if(items.includes(old))el.value=old}
function populateCommodityFocus(){const el=$('commodityFocus'),old=el.value,map=new Map();state.all.forEach(x=>{if(x.commodity&&!map.has(x.commodity))map.set(x.commodity,x.commodityCode||'')});const items=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'id'));el.innerHTML=items.map(([name,code])=>`<option value="${esc(name)}">${esc(code?code+' — '+name:name)}</option>`).join('');if(items.some(([name])=>name===old))el.value=old;else if($('commodityFilter')?.value&&items.some(([name])=>name===$('commodityFilter').value))el.value=$('commodityFilter').value}
function populateFilters(){populateSelect('kabFilter',unique(state.all,'kab'),'Semua wilayah');populateSelect('commodityFilter',unique(state.all,'commodity'),'Semua komoditas');populateSelect('marketTypeFilter',unique(state.all,'marketType'),'Semua jenis pasar');populateCommodityFocus()}
function applyFilters(){const p=currentPeriod(),kab=$('kabFilter').value,kom=$('commodityFilter').value,mt=$('marketTypeFilter').value,q=norm($('searchFilter').value).toLowerCase(),extreme=$('extremeOnly').checked;state.filtered=state.all.filter(x=>(p==='Semua'||x.sheet===p)&&(!kab||x.kab===kab)&&(!kom||x.commodity===kom)&&(!mt||x.marketType===mt)&&(!q||[x.kab,x.commodityCode,x.commodity,x.quality,x.market,x.respondent,x.note,x.period].join(' ').toLowerCase().includes(q))&&(!extreme||(Number.isFinite(x.change)&&Math.abs(x.change)>=20)));state.page=1;state.periodPage=1;state.trendPage=1;renderAll()}
function statusOf(c){if(!Number.isFinite(c)||Math.abs(c)<0.005)return 'Tetap';return c>0?'Naik':'Turun'}
function sortedData(){const arr=[...state.filtered],k=state.sortKey,d=state.sortDir==='asc'?1:-1;return arr.sort((a,b)=>{let av=a[k],bv=b[k];if(typeof av==='number'||typeof bv==='number'){av=Number.isFinite(av)?av:-Infinity;bv=Number.isFinite(bv)?bv:-Infinity;return(av-bv)*d}return String(av??'').localeCompare(String(bv??''),'id')*d})}
function renderAll(){renderHeader();renderDashboard();renderPeriod();renderCommodity();renderMarket();renderTrend();renderEvaluation();renderRecap();updateSortMarks()}
function renderHeader(){$('heroPeriod').textContent=currentPeriod()==='Semua'?'Semua Periode':periodLabel(currentPeriod());$('periodBadge').textContent=$('heroPeriod').textContent}
function destroyChart(id){if(state.charts[id])state.charts[id].destroy()}
function chart(id,type,labels,data,label){destroyChart(id);state.charts[id]=new Chart($(id),{type,data:{labels,datasets:[{label,data}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:type==='doughnut'}},scales:type==='doughnut'?{}:{y:{beginAtZero:true}}}})}
function groupAvg(data,key,value='change'){const m={};data.forEach(x=>{if(!x[key]||!Number.isFinite(x[value]))return;(m[x[key]]??=[]).push(x[value])});return Object.entries(m).map(([name,v])=>({name,value:avg(v)}))}
function renderDashboard(){const d=state.filtered,up=d.filter(x=>x.change>0),down=d.filter(x=>x.change<0),stable=d.filter(x=>Number.isFinite(x.change)&&Math.abs(x.change)<.005),ext=d.filter(x=>Number.isFinite(x.change)&&Math.abs(x.change)>=20);$('kpiTotal').textContent=fmtInt(d.length);$('kpiUp').textContent=fmtInt(up.length);$('kpiDown').textContent=fmtInt(down.length);$('kpiStable').textContent=fmtInt(stable.length);$('kpiExtreme').textContent=fmtInt(ext.length);$('conditionScore').textContent=fmtInt(ext.length);const ap=avg(d.map(x=>x.prev)),ac=avg(d.map(x=>x.current));$('avgPrev').textContent=fmtMoney(ap);$('avgCurrent').textContent=fmtMoney(ac);$('avgChange').textContent=ap?fmtPct(((ac-ap)/ap)*100):'–';$('heroNarrative').textContent=`Menampilkan ${fmtInt(d.length)} observasi sesuai filter aktif; ${fmtInt(ext.length)} di antaranya berubah minimal 20 persen.`;chart('compositionChart','doughnut',['Naik','Turun','Tetap'],[up.length,down.length,stable.length],'Observasi');const top=groupAvg(d,'commodity').sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,10);chart('topIncreaseChart','bar',top.map(x=>x.name),top.map(x=>x.value),'Perubahan (%)')}
function noteCell(x){return `<textarea class="editable-note" id="note-${x.sheet.replace(/\s/g,'_')}-${x.rowNumber}">${esc(x.note)}</textarea>`}
function saveButton(x){return `<button class="btn primary save-note" data-sheet="${esc(x.sheet)}" data-row="${x.rowNumber}" data-note-id="note-${x.sheet.replace(/\s/g,'_')}-${x.rowNumber}">Simpan</button>`}
function categoryOfRow(x){return classifyChange(x.change)||CHANGE_CATEGORIES[0]}
function periodLegendHtml(){return CHANGE_CATEGORIES.map(c=>`<span class="legend-chip ${c.className}"><i class="legend-dot" style="background:var(--cat-color)"></i>${esc(c.label)}</span>`).join('')}
function rowHtml(x,recap=false){
  const cat=categoryOfRow(x), movement=movementClass(x.change);
  return `<tr class="period-row ${cat.className} ${Math.abs(x.change||0)>=20?'extreme-row':''}"><td>${esc(x.period)}</td><td>${esc(x.kab)}</td>${recap?'':`<td><span class="commodity-code">${esc(x.commodityCode)}</span></td>`}<td><strong class="primary-cell-text">${esc(x.commodity)}</strong></td><td><span class="quality-text">${esc(x.quality)}</span></td>${recap?`<td>${esc(x.marketType)}</td>`:''}<td>${esc(x.market)}</td><td><span class="respondent-text">${esc(x.respondent)}</span></td><td class="num"><div class="period-price-card base-price"><span>Harga dasar</span><strong>${fmtMoney(x.prev)}</strong></div></td><td class="num"><div class="period-price-card current-price ${cat.className}"><span>Harga saat ini</span><strong>${fmtMoney(x.current)}</strong></div></td><td class="num"><span class="change-badge ${cat.className}"><b>${movement==='up'?'▲':movement==='down'?'▼':'—'}</b>${fmtPct(x.change)}<small>${esc(cat.label)}</small></span></td><td>${noteCell(x)}</td><td>${saveButton(x)}</td></tr>`
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
function renderRecap(){const d=sortedData(),p=paginate(d,state.page);state.page=p.page;$('recapBody').innerHTML=p.rows.map(x=>rowHtml(x,true)).join('')||'<tr><td colspan="12">Tidak ada data sesuai filter.</td></tr>';$('pageInfo').textContent=`Halaman ${p.page} dari ${p.pages} • ${fmtInt(d.length)} data`;bindSaveButtons()}
async function saveNote(btn){
  const url=String(CONFIG.appsScriptUrl||'').trim();
  if(!url||url.includes('PASTE_URL')||!url.endsWith('/exec')){
    showStatus('URL Web App belum benar. Isi CONFIG.appsScriptUrl dengan URL deployment yang berakhiran /exec.','error');
    return;
  }

  const sheet=btn.dataset.sheet;
  const row=Number(btn.dataset.row);
  const noteEl=$(btn.dataset.noteId);
  const note=noteEl ? noteEl.value : '';

  btn.disabled=true;
  btn.classList.add('saving');
  btn.textContent='Menyimpan...';

  try{
    // Form URL encoded adalah "simple request", sehingga lebih kompatibel
    // antara GitHub Pages dan Google Apps Script Web App.
    const body=new URLSearchParams({
      action:'updateNote',
      sheet:String(sheet),
      row:String(row),
      note:String(note),
      token:'harga1900',
      ts:String(Date.now())
    });

    await fetch(url,{
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:body.toString(),
      cache:'no-store'
    });

    const item=state.all.find(x=>x.sheet===sheet&&x.rowNumber===row);
    if(item)item.note=note;
    noteEl.dataset.savedValue=note;
    showStatus(`Keterangan dikirim ke ${sheet}, baris ${row}. Periksa kolom ${item?.noteColumn||''} pada spreadsheet.`,'success');
  }catch(e){
    showStatus(`Gagal mengirim keterangan: ${e.message}`,'error');
  }finally{
    btn.disabled=false;
    btn.classList.remove('saving');
    btn.textContent='Simpan';
  }
}
function bindSaveButtons(){document.querySelectorAll('.save-note').forEach(b=>{b.onclick=()=>saveNote(b)})}
function positiveValues(arr){return arr.filter(v=>Number.isFinite(v)&&v>0)}
function commodityAnalysisBase(commodity){const p=currentPeriod(),mt=$('marketTypeFilter').value,q=norm($('searchFilter').value).toLowerCase();return state.all.filter(x=>x.commodity===commodity&&(p==='Semua'||x.sheet===p)&&(!mt||x.marketType===mt)&&(!q||[x.kab,x.commodityCode,x.commodity,x.quality,x.market,x.respondent,x.note,x.period].join(' ').toLowerCase().includes(q)))}
function groupedPriceStats(data,key){const m=new Map();data.forEach(x=>{const name=x[key]||'–';if(!m.has(name))m.set(name,[]);m.get(name).push(x)});return [...m.entries()].map(([name,rows])=>{const pv=positiveValues(rows.map(x=>x.prev)),cv=positiveValues(rows.map(x=>x.current)),ap=avg(pv),ac=avg(cv);return{name,rows,avgPrev:ap,avgCurrent:ac,change:ap&&ac?((ac-ap)/ap)*100:null,minCurrent:cv.length?Math.min(...cv):null,maxCurrent:cv.length?Math.max(...cv):null,obs:rows.length}}).sort((a,b)=>String(a.name).localeCompare(String(b.name),'id'))}
function renderGroupedPriceChart(id,stats){destroyChart(id);state.charts[id]=new Chart($(id),{type:'bar',data:{labels:stats.map(x=>x.name),datasets:[{label:'Rata-rata Prev',data:stats.map(x=>x.avgPrev),backgroundColor:'rgba(113,128,150,.65)'},{label:'Rata-rata Current',data:stats.map(x=>x.avgCurrent),backgroundColor:'rgba(23,105,224,.72)'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:false,ticks:{callback:v=>'Rp '+new Intl.NumberFormat('id-ID',{notation:'compact',maximumFractionDigits:1}).format(v)}}}}})}
function renderRangeChart(id,stats){destroyChart(id);state.charts[id]=new Chart($(id),{data:{labels:stats.map(x=>x.name),datasets:[{type:'bar',label:'Min–Max Current',data:stats.map(x=>Number.isFinite(x.minCurrent)&&Number.isFinite(x.maxCurrent)?[x.minCurrent,x.maxCurrent]:null),backgroundColor:'rgba(32,170,101,.28)',borderColor:'rgba(32,170,101,.85)',borderWidth:1,borderRadius:5},{type:'line',label:'Rata-rata Current',data:stats.map(x=>x.avgCurrent),borderColor:'#1769e0',backgroundColor:'#1769e0',pointRadius:4,pointHoverRadius:6,tension:.18}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:false,ticks:{callback:v=>'Rp '+new Intl.NumberFormat('id-ID',{notation:'compact',maximumFractionDigits:1}).format(v)}}}}})}
function renderCommodity(){
  const focusEl=$('commodityFocus');if(!focusEl)return;
  let focus=focusEl.value||state.filtered[0]?.commodity||state.all[0]?.commodity||'';
  if(focus&&!focusEl.value)focusEl.value=focus;
  const base=commodityAnalysisBase(focus),qualityEl=$('qualityFocus');
  const qualities=[...new Set(base.map(x=>x.quality).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'));
  const oldQ=qualityEl.value;
  qualityEl.innerHTML=qualities.map(q=>`<option value="${esc(q)}">${esc(q)}</option>`).join('');
  if(qualities.includes(oldQ))qualityEl.value=oldQ;else if(qualities.length)qualityEl.value=qualities[0];
  const quality=qualityEl.value||'',d=base.filter(x=>x.quality===quality),pv=positiveValues(d.map(x=>x.prev)),cv=positiveValues(d.map(x=>x.current)),ap=avg(pv),ac=avg(cv),code=d[0]?.commodityCode||base[0]?.commodityCode||'';
  $('commoditySelectionInfo').innerHTML=focus?`<strong>${esc(code)}</strong> • ${esc(focus)} <span>×</span> <strong>${esc(quality||'Belum ada kualitas')}</strong> <small>• ${fmtInt(new Set(d.map(x=>x.kab).filter(Boolean)).size)} wilayah • seluruh kabupaten/kota digabung pada KPI</small>`:'Tidak ada data sesuai filter.';
  $('commodityPrev').textContent=fmtMoney(ap);$('commodityCurrent').textContent=fmtMoney(ac);$('commodityChange').textContent=ap&&ac?fmtPct(((ac-ap)/ap)*100):'–';$('commodityObs').textContent=fmtInt(d.length);$('commodityRegionCount').textContent=`${fmtInt(new Set(d.map(x=>x.kab).filter(Boolean)).size)} wilayah`;
  const regionStats=groupedPriceStats(d,'kab');renderGroupedPriceChart('commodityRegionChart',regionStats);renderRangeChart('commodityRangeChart',regionStats);
  $('commodityRegionBody').innerHTML=regionStats.map(x=>`<tr><td><strong>${esc(x.name)}</strong></td><td class="num">${fmtMoney(x.avgPrev)}</td><td class="num">${fmtMoney(x.avgCurrent)}</td><td class="num">${fmtMoney(x.minCurrent)}</td><td class="num">${fmtMoney(x.maxCurrent)}</td><td class="num">${fmtInt(x.obs)}</td></tr>`).join('')||'<tr><td colspan="6">Tidak ada data.</td></tr>';
  const qualityStats=groupedPriceStats(base,'quality');
  $('commodityQualityBody').innerHTML=qualityStats.map(x=>{const first=x.rows[0]||{};return`<tr class="${x.name===quality?'selected-quality-row':''}"><td><span class="commodity-code">${esc(first.commodityCode||code)}</span></td><td><strong>${esc(x.name)}</strong></td><td class="num">${fmtMoney(x.avgPrev)}</td><td class="num">${fmtMoney(x.avgCurrent)}</td><td class="num"><span class="pill ${movementClass(x.change)}">${fmtPct(x.change)}</span></td><td class="num">${fmtMoney(x.minCurrent)}</td><td class="num">${fmtMoney(x.maxCurrent)}</td><td class="num">${fmtInt(x.obs)}</td></tr>`}).join('')||'<tr><td colspan="8">Tidak ada data.</td></tr>';
}
function renderMarket(){const g=groupAvg(state.filtered,'market').sort((a,b)=>Math.abs(b.value)-Math.abs(a.value)).slice(0,15);chart('marketRankingChart','bar',g.map(x=>x.name),g.map(x=>x.value),'Perubahan (%)')}

function trendBaseData(){
  const p=currentPeriod(),kab=$('kabFilter').value,kom=$('commodityFilter').value,mt=$('marketTypeFilter').value,q=norm($('searchFilter').value).toLowerCase(),cat=$('trendCategoryFilter')?.value||'';
  return state.all.filter(x=>(p==='Semua'||x.sheet===p)&&(!kab||x.kab===kab)&&(!kom||x.commodity===kom)&&(!mt||x.marketType===mt)&&(!q||[x.kab,x.commodityCode,x.commodity,x.quality,x.market,x.respondent,x.note,x.period].join(' ').toLowerCase().includes(q))&&x.series.some(s=>s.valid)&&(!cat||x.series.some(s=>s.valid&&s.category?.id===cat)));
}
function sortedTrendData(){const arr=trendBaseData(),k=state.trendSortKey,d=state.trendSortDir==='asc'?1:-1;return arr.sort((a,b)=>{let av=a[k],bv=b[k];if(typeof av==='number'||typeof bv==='number'){av=Number.isFinite(av)?av:-Infinity;bv=Number.isFinite(bv)?bv:-Infinity;return(av-bv)*d}return String(av??'').localeCompare(String(bv??''),'id')*d})}
function compactMoney(v){
  if(!Number.isFinite(v))return '–';
  return new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(v);
}
function sparklineSvg(points){
  if(!points||points.length<2)return '<div class="spark-empty">Data belum cukup untuk grafik</div>';
  const values=points.map(p=>p.value),min=Math.min(...values),max=Math.max(...values),range=max-min||1;
  const w=520,h=66,padX=10,padY=9;
  const xy=values.map((v,i)=>({x:padX+i*((w-padX*2)/(values.length-1)),y:padY+(max-v)/range*(h-padY*2)}));
  const line=xy.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area=`${line} L ${xy[xy.length-1].x.toFixed(1)} ${h-padY} L ${xy[0].x.toFixed(1)} ${h-padY} Z`;
  const dots=xy.map((p,i)=>`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.2"><title>${esc(points[i].label)}: ${fmtMoney(points[i].value)}</title></circle>`).join('');
  return `<svg class="price-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Grafik tren harga"><path class="spark-area" d="${area}"></path><path class="spark-line" d="${line}"></path>${dots}</svg>`;
}
function movementClass(c){return !Number.isFinite(c)||Math.abs(c)<.005?'stable':c>0?'up':'down'}
function priceTimelineHtml(x){
  const points=x.timelinePoints||[],trans=x.series||[];
  if(!points.length)return '<div class="timeline-empty">Tidak ada harga valid.</div>';
  let html=`<div class="price-visual"><div class="spark-wrap">${sparklineSvg(points)}</div><div class="price-timeline points-${points.length}">`;
  points.forEach((p,i)=>{
    const t=i?trans[i-1]:null,cls=t?movementClass(t.change):'start',cat=t?.category?.className||'';
    if(i){html+=`<div class="price-connector ${cls}"><i>→</i></div>`}
    html+=`<div class="price-node ${cls} ${cat}"><span class="point-label">${esc(p.label)}</span><strong>Rp ${compactMoney(p.value)}</strong>${t?`<small>${Math.abs(t.change)<.005?'— 0,00%':`${t.change>0?'▲':'▼'} ${fmtPct(t.change)}`}</small>`:'<small class="base-label">Harga dasar</small>'}</div>`;
  });
  return html+'</div></div>';
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
  return `<tr class="trend-row ${cat.className}"><td>${esc(x.period)}</td><td>${esc(x.kab)}</td><td><span class="commodity-code">${esc(x.commodityCode)}</span></td><td><strong>${esc(x.commodity)}</strong><small class="cell-sub">${esc(x.quality)}</small></td><td>${esc(x.market)}<small class="cell-sub">${esc(x.respondent)}</small></td><td>${priceTimelineHtml(x)}</td><td>${trendStatsHtml(x)}</td><td>${noteCell(x)}</td><td>${saveButton(x)}</td></tr>`;
}
function renderTrendLegend(){if(!$('trendLegend'))return;$('trendLegend').innerHTML=CHANGE_CATEGORIES.map(c=>`<span class="legend-chip ${c.className}"><i class="legend-dot" style="background:var(--cat-color)"></i>${esc(c.label)}</span>`).join('');const sel=$('trendCategoryFilter');if(sel&&sel.options.length===1)sel.innerHTML='<option value="">Semua kelompok</option>'+CHANGE_CATEGORIES.map(c=>`<option value="${c.id}">${esc(c.label)}</option>`).join('');const psel=$('periodCategoryFilter');if(psel&&psel.options.length===1)psel.innerHTML='<option value="">Semua kelompok</option>'+CHANGE_CATEGORIES.map(c=>`<option value="${c.id}">${esc(c.label)}</option>`).join('')}
function renderTrend(){if(!$('trendTableBody'))return;renderTrendLegend();const d=sortedTrendData(),counts=Object.fromEntries(CHANGE_CATEGORIES.map(c=>[c.id,0]));d.forEach(x=>x.series.forEach(s=>{if(s.valid&&s.category)counts[s.category.id]++}));$('trendSummary').innerHTML=CHANGE_CATEGORIES.map(c=>`<article class="trend-summary-card ${c.className}"><span>${esc(c.label)}</span><strong>${fmtInt(counts[c.id])}</strong></article>`).join('');const p=paginate(d,state.trendPage,state.trendPageSize);state.trendPage=p.page;$('trendTableBody').innerHTML=p.rows.map(trendRowHtml).join('')||'<tr><td colspan="9">Tidak ada deret harga valid. Nilai 0 dan kosong dilewati.</td></tr>';$('trendPageInfo').textContent=state.trendPageSize==='all'?`Menampilkan semua • ${fmtInt(d.length)} baris • ${fmtInt(d.reduce((n,x)=>n+x.series.filter(s=>s.valid).length,0))} perubahan berurutan`:`Halaman ${p.page} dari ${p.pages} • ${fmtInt(d.length)} baris • ${fmtInt(d.reduce((n,x)=>n+x.series.filter(s=>s.valid).length,0))} perubahan berurutan`;bindSaveButtons();updateTrendSortMarks()}
function updateTrendSortMarks(){document.querySelectorAll('th[data-trend-sort]').forEach(th=>{th.querySelector('.sort-mark')?.remove();if(th.dataset.trendSort===state.trendSortKey)th.insertAdjacentHTML('beforeend',`<span class="sort-mark">${state.trendSortDir==='asc'?'▲':'▼'}</span>`)})}
function bindTrendSort(){document.querySelectorAll('th[data-trend-sort]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.trendSort;if(state.trendSortKey===k)state.trendSortDir=state.trendSortDir==='asc'?'desc':'asc';else{state.trendSortKey=k;state.trendSortDir=k==='maxAbsChange'?'desc':'asc'}state.trendPage=1;renderTrend()}))}

function updatePeriodSortMarks(){document.querySelectorAll('th[data-period-sort]').forEach(th=>{th.querySelector('.sort-mark')?.remove();if(th.dataset.periodSort===state.periodSortKey)th.insertAdjacentHTML('beforeend',`<span class="sort-mark">${state.periodSortDir==='asc'?'▲':'▼'}</span>`)})}
function bindPeriodSort(){document.querySelectorAll('th[data-period-sort]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.periodSort;if(state.periodSortKey===k)state.periodSortDir=state.periodSortDir==='asc'?'desc':'asc';else{state.periodSortKey=k;state.periodSortDir=k==='change'?'desc':'asc'}state.periodPage=1;renderPeriod()}))}
function resetPeriodRawOrder(){state.periodSortKey='rawOrder';state.periodSortDir='asc';state.periodPage=1;renderPeriod();showStatus('Evaluasi Bulanan dikembalikan ke urutan raw data.','success')}
function resetTrendRawOrder(){state.trendSortKey='rawOrder';state.trendSortDir='asc';state.trendPage=1;renderTrend();showStatus('Evaluasi Mingguan dikembalikan ke urutan raw data.','success')}

function safeFilename(text){return String(text||'data').toLowerCase().replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,80)||'data'}
function saveBlob(blob,filename){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function periodExportRows(){return sortedPeriodData()}
function periodExportMatrix(){const rows=periodExportRows(),headers=['Periode','Wilayah','Kode Komoditas','Komoditas','Kualitas','Jenis Pasar','Pasar','Nama Responden','Prev','Current','Perubahan (%)','Kelompok Perubahan','Keterangan','Sheet','Baris Raw'];return[headers,...rows.map(x=>[x.period,x.kab,x.commodityCode,x.commodity,x.quality,x.marketType,x.market,x.respondent,x.prev,x.current,x.change,categoryOfRow(x).label,x.note,x.sheet,x.rowNumber])]}
function trendExportMatrix(){const rows=sortedTrendData(),pointLabels=[...new Set(rows.flatMap(x=>(x.timelinePoints||[]).map(p=>p.label)))];const headers=['Periode','Wilayah','Kode Komoditas','Komoditas','Kualitas','Jenis Pasar','Pasar','Nama Responden',...pointLabels,'Awal → Terakhir (%)','Perubahan Terbesar (%)','Rangkaian Perubahan','Keterangan','Sheet','Baris Raw'];return[headers,...rows.map(x=>{const map=Object.fromEntries((x.timelinePoints||[]).map(p=>[p.label,p.value])),pts=x.timelinePoints||[],first=pts[0]?.value,last=pts[pts.length-1]?.value,total=first&&last?((last-first)/first)*100:null,largest=(x.series||[]).filter(s=>s.valid).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change))[0];return[x.period,x.kab,x.commodityCode,x.commodity,x.quality,x.marketType,x.market,x.respondent,...pointLabels.map(l=>map[l]??''),total,largest?.change??'',(x.series||[]).filter(s=>s.valid).map(s=>`${s.fromLabel} → ${s.toLabel}: ${fmtPct(s.change)}`).join(' | '),x.note,x.sheet,x.rowNumber]})]}
function exportMatrixCsv(matrix,filename){const csv=Papa.unparse(matrix);saveBlob(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),filename+'.csv')}
function exportMatrixXlsx(matrix,filename){if(typeof XLSX==='undefined'){showStatus('Library Excel belum termuat. Muat ulang halaman lalu coba lagi.','error');return}const ws=XLSX.utils.aoa_to_sheet(matrix);ws['!freeze']={xSplit:0,ySplit:1};const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Evaluasi');XLSX.writeFile(wb,filename+'.xlsx')}
async function captureEvaluation(areaId,filename,format){const el=$(areaId);if(!el)return;const btn=format==='pdf'?$('periodExportBtn'):null;el.classList.add('exporting');showStatus('Menyiapkan '+format.toUpperCase()+' dari tampilan saat ini...');try{const canvas=await html2canvas(el,{scale:1.35,backgroundColor:'#ffffff',useCORS:true,logging:false,width:el.scrollWidth,height:el.scrollHeight,windowWidth:el.scrollWidth,windowHeight:el.scrollHeight});if(format==='png'){canvas.toBlob(blob=>blob&&saveBlob(blob,filename+'.png'),'image/png');return}const {jsPDF}=window.jspdf||{};if(!jsPDF)throw new Error('Library PDF belum termuat');const pdf=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight(),margin=7,imgW=pageW-margin*2,imgH=canvas.height*imgW/canvas.width;const img=canvas.toDataURL('image/jpeg',.92);let y=margin,remaining=imgH;pdf.addImage(img,'JPEG',margin,y,imgW,imgH);remaining-=pageH-margin*2;while(remaining>0){pdf.addPage();y=margin-(imgH-remaining);pdf.addImage(img,'JPEG',margin,y,imgW,imgH);remaining-=pageH-margin*2}pdf.save(filename+'.pdf')}catch(e){showStatus('Gagal membuat file: '+e.message,'error')}finally{el.classList.remove('exporting')}}
async function exportEvaluation(kind){const isPeriod=kind==='period',format=$(isPeriod?'periodExportFormat':'trendExportFormat').value,matrix=isPeriod?periodExportMatrix():trendExportMatrix(),filename=`${isPeriod?'evaluasi-bulanan':'evaluasi-mingguan'}-${safeFilename(currentPeriod())}`;if(format==='csv')return exportMatrixCsv(matrix,filename);if(format==='xlsx')return exportMatrixXlsx(matrix,filename);return captureEvaluation(isPeriod?'periodExportArea':'trendExportArea',filename,format)}
function renderEvaluation(){const d=state.filtered,ext=d.filter(x=>Math.abs(x.change||0)>=20),missing=d.filter(x=>x.prev==null||x.current==null),up=ext.filter(x=>x.change>0),down=ext.filter(x=>x.change<0);$('riskBadge').textContent=ext.length>50?'Perlu perhatian tinggi':ext.length?'Perlu verifikasi':'Relatif stabil';$('evaluationCards').innerHTML=`<article class="evaluation-card"><strong>Kenaikan ekstrem</strong><div class="metric">${fmtInt(up.length)}</div><p>Observasi naik minimal 20%.</p></article><article class="evaluation-card"><strong>Penurunan ekstrem</strong><div class="metric">${fmtInt(down.length)}</div><p>Observasi turun minimal 20%.</p></article><article class="evaluation-card"><strong>Data kosong</strong><div class="metric">${fmtInt(missing.length)}</div><p>Prev atau current belum terisi.</p></article>`;const priorities=[...ext].sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,20);$('priorityList').innerHTML=priorities.map(x=>`<div class="priority-item"><div class="priority-icon">!</div><div><strong>${esc(x.commodity)} — ${esc(x.respondent)}</strong><p>${esc(x.period)} • ${esc(x.market)} • ${esc(x.kab)}</p></div><div class="priority-value">${fmtPct(x.change)}</div></div>`).join('')||'<p class="muted">Tidak ada perubahan ekstrem sesuai filter.</p>'}
function updateSortMarks(){document.querySelectorAll('th[data-sort]').forEach(th=>{th.querySelector('.sort-mark')?.remove();if(th.dataset.sort===state.sortKey)th.insertAdjacentHTML('beforeend',`<span class="sort-mark">${state.sortDir==='asc'?'▲':'▼'}</span>`)})}
function bindSort(){document.querySelectorAll('th[data-sort]').forEach(th=>th.addEventListener('click',()=>{const k=th.dataset.sort;if(state.sortKey===k)state.sortDir=state.sortDir==='asc'?'desc':'asc';else{state.sortKey=k;state.sortDir=k==='change'?'desc':'asc'}renderPeriod();renderRecap();updateSortMarks()}))}
function downloadCsv(){const rows=sortedData(),headers=['Periode','Wilayah','Komoditas','Kualitas','Jenis Pasar','Pasar','Nama Responden','Prev','Current','Perubahan (%)','Keterangan'];const csv=Papa.unparse([headers,...rows.map(x=>[x.period,x.kab,x.commodity,x.quality,x.marketType,x.market,x.respondent,x.prev,x.current,x.change,x.note])]);const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='rekap-monitoring-harga.csv';a.click();URL.revokeObjectURL(a.href)}
function switchView(view){state.view=view;document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));$(`view-${view}`).classList.add('active-view');document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('active',n.dataset.view===view));const titles={dashboard:['Dashboard','Ringkasan perkembangan harga.'],period:['Evaluasi Bulanan','Mingguan, Dwi Mingguan, Bulanan, atau seluruh periode.'],commodity:['Analisis Komoditas','Perbandingan komoditas terpilih.'],market:['Analisis Pasar','Peringkat pasar berdasarkan perubahan.'],trend:['Evaluasi Mingguan','Deret perubahan harga mingguan secara berurutan dari periode previous menuju current.'],evaluation:['Evaluasi Ringkas','Prioritas verifikasi perubahan harga.'],recap:['Rekap Data','Tabel data yang dapat diurutkan dan diedit.']};$('pageTitle').textContent=titles[view][0];$('pageSubtitle').textContent=titles[view][1];$('sidebar').classList.remove('open')}
function init(){const logged=sessionStorage.getItem('hargaLogin')==='1';$('loginScreen').classList.toggle('hidden',logged);$('app').classList.toggle('hidden',!logged);$('loginForm').addEventListener('submit',e=>{e.preventDefault();if($('username').value===CONFIG.credentials.username&&$('password').value===CONFIG.credentials.password){sessionStorage.setItem('hargaLogin','1');$('loginScreen').classList.add('hidden');$('app').classList.remove('hidden');loadAll()}else{$('loginError').textContent='Username atau password salah.';$('loginError').classList.remove('hidden')}});$('logoutBtn').onclick=()=>{sessionStorage.removeItem('hargaLogin');location.reload()};$('refreshBtn').onclick=loadAll;$('menuBtn').onclick=()=>$('sidebar').classList.toggle('open');document.querySelectorAll('.nav-item').forEach(n=>n.onclick=()=>switchView(n.dataset.view));['periodFilter','kabFilter','commodityFilter','marketTypeFilter','extremeOnly'].forEach(id=>$(id).addEventListener('change',applyFilters));$('searchFilter').addEventListener('input',applyFilters);$('commodityFocus').addEventListener('change',renderCommodity);$('qualityFocus').addEventListener('change',renderCommodity);$('prevPage').onclick=()=>{if(state.page>1){state.page--;renderRecap()}};$('nextPage').onclick=()=>{state.page++;renderRecap()};$('periodPrevPage').onclick=()=>{if(state.periodPage>1){state.periodPage--;renderPeriod()}};$('periodNextPage').onclick=()=>{state.periodPage++;renderPeriod()};$('periodCategoryFilter').addEventListener('change',()=>{state.periodPage=1;renderPeriod()});$('periodPageSize').addEventListener('change',e=>{state.periodPageSize=e.target.value==='all'?'all':Number(e.target.value);state.periodPage=1;renderPeriod()});$('periodRawOrderBtn').onclick=resetPeriodRawOrder;$('periodExportBtn').onclick=()=>exportEvaluation('period');$('downloadBtn').onclick=downloadCsv;$('trendPrevPage').onclick=()=>{if(state.trendPage>1){state.trendPage--;renderTrend()}};$('trendNextPage').onclick=()=>{state.trendPage++;renderTrend()};$('trendCategoryFilter').addEventListener('change',()=>{state.trendPage=1;renderTrend()});$('trendPageSize').addEventListener('change',e=>{state.trendPageSize=e.target.value==='all'?'all':Number(e.target.value);state.trendPage=1;renderTrend()});$('trendRawOrderBtn').onclick=resetTrendRawOrder;$('trendExportBtn').onclick=()=>exportEvaluation('trend');$('trendRefreshBtn').onclick=loadAll;bindSort();bindPeriodSort();bindTrendSort();if(logged)loadAll()}
document.addEventListener('DOMContentLoaded',init);
