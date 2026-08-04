const CONFIG = {
  spreadsheetId: '1To6WfnCyCn8ms7o1KQ5M_UOtvmk2yO1uH50g1rjA8Eg',
  sheets: ['Mingguan', 'Dwi Mingguan', 'bulanan'],
  pageSize: 20
};

const state = { raw: [], filtered: [], page: 1, charts: {} };
const $ = id => document.getElementById(id);
const norm = v => String(v ?? '').trim();
const key = v => norm(v).toLowerCase().replace(/[^a-z0-9]/g, '');
const num = v => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = norm(v).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(s); return Number.isFinite(n) ? n : null;
};
const fmtInt = v => new Intl.NumberFormat('id-ID', {maximumFractionDigits:0}).format(v || 0);
const fmtMoney = v => v == null ? '–' : new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(v);
const fmtPct = v => v == null ? '–' : `${v >= 0 ? '+' : ''}${v.toFixed(2).replace('.',',')}%`;

function pick(row, aliases) {
  const entries = Object.entries(row);
  for (const alias of aliases) {
    const found = entries.find(([k]) => key(k) === key(alias));
    if (found) return found[1];
  }
  return '';
}

function normalizeRow(row) {
  const prev = num(pick(row, ['AVR PREV','PREV']));
  const current = num(pick(row, ['AVR CURRENT','CURRENT']));
  const rhRaw = num(pick(row, ['RH']));
  const changePct = rhRaw != null ? rhRaw - 100 : (prev && current != null ? ((current / prev) - 1) * 100 : null);
  return {
    kab: norm(pick(row, ['Kab','KAB'])),
    commodity: norm(pick(row, ['Komoditas'])),
    quality: norm(pick(row, ['Kualitas'])),
    marketType: norm(pick(row, ['Jenis Pasar'])),
    market: norm(pick(row, ['Pasar'])),
    respondent: norm(pick(row, ['Nama Responden'])),
    prev, current, changePct,
    flag: norm(pick(row, ['FLAG'])),
    note: norm(pick(row, ['KET']))
  };
}

function sheetUrl(sheet) {
  return `https://docs.google.com/spreadsheets/d/${CONFIG.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}&range=A2:AZ`;
}

async function loadData() {
  const sheet = $('periodFilter').value;
  setLoading(true); showStatus(`Memuat sheet ${sheet}…`, 'info');
  try {
    const response = await fetch(sheetUrl(sheet), {cache:'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csv = await response.text();
    const parsed = Papa.parse(csv, {header:true, skipEmptyLines:'greedy'});
    if (parsed.errors.length && !parsed.data.length) throw new Error(parsed.errors[0].message);
    state.raw = parsed.data.map(normalizeRow).filter(r => r.commodity || r.quality || r.respondent);
    state.page = 1;
    populateFilters(); applyFilters();
    $('lastUpdate').textContent = `Sheet ${sheet} • ${fmtInt(state.raw.length)} observasi • dimuat ${new Date().toLocaleString('id-ID')}`;
    hideStatus();
  } catch (err) {
    state.raw = []; state.filtered = []; renderAll();
    showStatus('Data tidak dapat dimuat. Pastikan Google Sheets disetel “Siapa saja yang memiliki link dapat melihat”, lalu muat ulang halaman. Detail: ' + err.message, 'error');
    $('lastUpdate').textContent = 'Gagal terhubung ke Google Sheets';
  } finally { setLoading(false); }
}

function setLoading(on){ $('refreshBtn').disabled=on; $('refreshBtn').textContent=on?'Memuat…':'↻ Muat ulang'; }
function showStatus(text,type){ const el=$('status'); el.textContent=text; el.className=`status ${type}`; }
function hideStatus(){ $('status').className='status hidden'; }
function uniq(field){ return [...new Set(state.raw.map(r=>r[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id')); }
function refill(id, values, label){ const el=$(id), current=el.value; el.innerHTML=`<option value="">${label}</option>`+values.map(v=>`<option>${escapeHtml(v)}</option>`).join(''); if(values.includes(current))el.value=current; }
function populateFilters(){ refill('kabFilter',uniq('kab'),'Semua wilayah'); refill('commodityFilter',uniq('commodity'),'Semua komoditas'); refill('marketFilter',uniq('marketType'),'Semua jenis pasar'); }

function applyFilters(){
  const kab=$('kabFilter').value, com=$('commodityFilter').value, mt=$('marketFilter').value, q=key($('searchFilter').value);
  state.filtered=state.raw.filter(r=>(!kab||r.kab===kab)&&(!com||r.commodity===com)&&(!mt||r.marketType===mt)&&(!q||key([r.quality,r.market,r.respondent,r.commodity].join(' ')).includes(q)));
  state.page=1; renderAll();
}

function stats(){
  const valid=state.filtered.filter(r=>r.changePct!=null);
  const up=valid.filter(r=>r.changePct>0.005).length, down=valid.filter(r=>r.changePct< -0.005).length;
  const stable=valid.length-up-down, extreme=valid.filter(r=>Math.abs(r.changePct)>=20).length;
  const missing=state.filtered.filter(r=>r.current==null||r.current===0).length;
  return {total:state.filtered.length,valid:valid.length,up,down,stable,extreme,missing};
}
function share(n,d){return d?`${(n/d*100).toFixed(1).replace('.',',')}% dari data valid`:'Tidak ada data valid'}

function renderKpis(s){ $('kpiTotal').textContent=fmtInt(s.total); $('kpiUp').textContent=fmtInt(s.up); $('kpiDown').textContent=fmtInt(s.down); $('kpiStable').textContent=fmtInt(s.stable); $('kpiExtreme').textContent=fmtInt(s.extreme); $('kpiUpShare').textContent=share(s.up,s.valid); $('kpiDownShare').textContent=share(s.down,s.valid); $('kpiStableShare').textContent=share(s.stable,s.valid); }
function groupedAverage(field){ const m={}; state.filtered.forEach(r=>{if(r[field]&&r.changePct!=null){(m[r[field]]??=[]).push(r.changePct)}}); return Object.entries(m).map(([label,v])=>({label,value:v.reduce((a,b)=>a+b,0)/v.length,count:v.length})); }
function makeChart(id,type,data,options){ if(state.charts[id])state.charts[id].destroy(); state.charts[id]=new Chart($(id),{type,data,options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,usePointStyle:true,font:{size:10}}},tooltip:{callbacks:{label:c=>`${c.dataset.label||c.label}: ${typeof c.raw==='number'?c.raw.toFixed(2).replace('.',','):c.raw}${c.dataset.unit||''}`}}},scales: type==='doughnut'?{}:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{grid:{color:'#edf1f6'},ticks:{font:{size:10}}}},...options}}); }

function renderCharts(s){
  makeChart('compositionChart','doughnut',{labels:['Naik','Turun','Tetap'],datasets:[{data:[s.up,s.down,s.stable],backgroundColor:['#16855b','#d64545','#94a3b8'],borderWidth:0}]},{cutout:'66%'});
  const top=groupedAverage('commodity').sort((a,b)=>b.value-a.value).slice(0,10).reverse();
  makeChart('topCommodityChart','bar',{labels:top.map(x=>x.label),datasets:[{label:'Rata-rata perubahan',data:top.map(x=>+x.value.toFixed(2)),backgroundColor:'#1f6feb',borderRadius:5,unit:'%'}]},{indexAxis:'y',plugins:{legend:{display:false}}});
  const markets=groupedAverage('marketType').sort((a,b)=>b.value-a.value);
  makeChart('marketChart','bar',{labels:markets.map(x=>x.label),datasets:[{label:'Rata-rata perubahan',data:markets.map(x=>+x.value.toFixed(2)),backgroundColor:'#0ea5a4',borderRadius:6,unit:'%'}]},{plugins:{legend:{display:false}}});
  makeChart('qualityChart','doughnut',{labels:['Harga tersedia','Harga kosong/0'],datasets:[{data:[Math.max(0,s.total-s.missing),s.missing],backgroundColor:['#1f6feb','#f0a13a'],borderWidth:0}]},{cutout:'66%'});
}

function renderEvaluation(s){
  const valid=state.filtered.filter(r=>r.changePct!=null);
  const avg=valid.length?valid.reduce((a,b)=>a+b.changePct,0)/valid.length:0;
  const topUp=[...valid].sort((a,b)=>b.changePct-a.changePct)[0];
  const topDown=[...valid].sort((a,b)=>a.changePct-b.changePct)[0];
  const extremeShare=s.valid?s.extreme/s.valid*100:0;
  const level=extremeShare>=10?'high':extremeShare>=3?'medium':'low';
  const label={low:'Risiko rendah',medium:'Perlu perhatian',high:'Prioritas evaluasi'}[level];
  const badge=$('riskBadge'); badge.className=`badge ${level}`; badge.textContent=label;
  const trend=avg>0.05?'cenderung meningkat':avg<-.05?'cenderung menurun':'relatif stabil';
  $('evaluationText').innerHTML=`
    <div class="eval-item"><strong>Gambaran umum</strong><p>Dari ${fmtInt(s.valid)} observasi dengan nilai perubahan valid, harga ${trend}, dengan rata-rata perubahan ${fmtPct(avg)}. Sebanyak ${fmtInt(s.extreme)} observasi mengalami perubahan minimal 20%.</p></div>
    <div class="eval-item"><strong>Kenaikan utama</strong><p>${topUp&&topUp.changePct>0?`${escapeHtml(topUp.commodity)} – ${escapeHtml(topUp.quality)} mencatat kenaikan tertinggi ${fmtPct(topUp.changePct)} pada ${escapeHtml(topUp.respondent||topUp.market)}.`:'Tidak terdapat kenaikan harga pada filter aktif.'}</p></div>
    <div class="eval-item"><strong>Tindak lanjut</strong><p>${s.extreme?`Verifikasi ${fmtInt(s.extreme)} perubahan ekstrem, terutama konsistensi satuan, kualitas, dan harga responden. `:''}${s.missing?`Lengkapi ${fmtInt(s.missing)} harga saat ini yang kosong atau bernilai nol. `:''}${topDown&&topDown.changePct<0?`Cermati pula penurunan terbesar pada ${escapeHtml(topDown.commodity)} (${fmtPct(topDown.changePct)}).`: 'Pertahankan pemeriksaan rutin antarperiode.'}</p></div>`;
}

function statusOf(r){ if(r.changePct==null)return['Tidak valid','stable']; if(r.changePct>.005)return['Naik',`up${Math.abs(r.changePct)>=20?' extreme':''}`]; if(r.changePct<-.005)return['Turun',`down${Math.abs(r.changePct)>=20?' extreme':''}`]; return['Tetap','stable']; }
function renderTable(){
  const sorted=[...state.filtered].sort((a,b)=>(Math.abs(b.changePct??-1)-Math.abs(a.changePct??-1)));
  const pages=Math.max(1,Math.ceil(sorted.length/CONFIG.pageSize)); state.page=Math.min(state.page,pages);
  const rows=sorted.slice((state.page-1)*CONFIG.pageSize,state.page*CONFIG.pageSize);
  $('dataBody').innerHTML=rows.length?rows.map(r=>{const st=statusOf(r);return`<tr><td>${escapeHtml(r.kab||'–')}</td><td><strong>${escapeHtml(r.commodity||'–')}</strong></td><td>${escapeHtml(r.quality||'–')}</td><td>${escapeHtml(r.marketType||'–')}</td><td>${escapeHtml(r.respondent||'–')}</td><td class="num">${fmtMoney(r.prev)}</td><td class="num">${fmtMoney(r.current)}</td><td class="num"><strong>${fmtPct(r.changePct)}</strong></td><td><span class="pill ${st[1]}">${st[0]}</span></td></tr>`}).join(''):'<tr><td colspan="9" class="empty">Tidak ada data sesuai filter.</td></tr>';
  $('pageInfo').textContent=`Halaman ${state.page} dari ${pages}`; $('prevPage').disabled=state.page<=1; $('nextPage').disabled=state.page>=pages;
}
function renderAll(){const s=stats();renderKpis(s);renderCharts(s);renderEvaluation(s);renderTable()}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function csvCell(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function downloadCsv(){const head=['Wilayah','Komoditas','Kualitas','Jenis Pasar','Pasar','Responden','Harga Sebelumnya','Harga Saat Ini','Perubahan Persen'];const rows=state.filtered.map(r=>[r.kab,r.commodity,r.quality,r.marketType,r.market,r.respondent,r.prev,r.current,r.changePct]);const blob=new Blob(['\ufeff'+[head,...rows].map(x=>x.map(csvCell).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`rekap-${$('periodFilter').value.toLowerCase().replace(/\s/g,'-')}.csv`;a.click();URL.revokeObjectURL(a.href)}

$('periodFilter').addEventListener('change',loadData); ['kabFilter','commodityFilter','marketFilter'].forEach(id=>$(id).addEventListener('change',applyFilters)); $('searchFilter').addEventListener('input',applyFilters); $('refreshBtn').addEventListener('click',loadData); $('downloadBtn').addEventListener('click',downloadCsv); $('prevPage').addEventListener('click',()=>{state.page--;renderTable()}); $('nextPage').addEventListener('click',()=>{state.page++;renderTable()});
loadData();
