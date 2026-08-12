const SPREADSHEET_ID = '1To6WfnCyCn8ms7o1KQ5M_UOtvmk2yO1uH50g1rjA8Eg';
const WRITE_TOKEN = 'harga1900';

const ALLOWED_SHEETS = {
  'Mingguan': 25,
  'Dwi Mingguan': 19,
  'bulanan': 15,
  'RH web': 8
};

function doGet(e) {
  const p = (e && e.parameter) || {};
  const action = String(p.action || '');


  if (action === 'getDataPeriod') {
    try {
      validateToken_(p.token);
      const props = PropertiesService.getScriptProperties();
      return jsonOrJsonp({
        ok:true,
        value:String(props.getProperty('DATA_PERIOD') || ''),
        serverTime:new Date().toISOString()
      }, p.callback);
    } catch (err) {
      return jsonOrJsonp({ok:false,message:errorText_(err)}, p.callback);
    }
  }

  if (action === 'updateDataPeriod') {
    try {
      validateToken_(p.token);
      const value = String(p.value || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        throw new Error('Format periode data tidak valid.');
      }
      PropertiesService.getScriptProperties().setProperty('DATA_PERIOD', value);
      return jsonOrJsonp({ok:true,value:value,serverTime:new Date().toISOString()}, p.callback);
    } catch (err) {
      return jsonOrJsonp({ok:false,message:errorText_(err)}, p.callback);
    }
  }

  if (action === 'updateNote') {
    try {
      return jsonOrJsonp(updateNote_(p), p.callback);
    } catch (err) {
      return jsonOrJsonp({ok:false,message:errorText_(err)}, p.callback);
    }
  }

  if (action === 'getRhNotes') {
    try {
      validateToken_(p.token);
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sh = ss.getSheetByName('RH web');
      if (!sh) throw new Error('Sheet RH web tidak ditemukan.');
      const lastRow = sh.getLastRow();
      const values = lastRow >= 3 ? sh.getRange(3, 8, lastRow - 2, 1).getDisplayValues() : [];
      return jsonOrJsonp({
        ok:true,
        rows:values.map((r,i)=>({row:i+3,note:String(r[0] == null ? '' : r[0])})),
        serverTime:new Date().toISOString()
      }, p.callback);
    } catch (err) {
      return jsonOrJsonp({ok:false,message:errorText_(err)}, p.callback);
    }
  }

  return jsonOrJsonp({ok:true,message:'Web App Monitoring Harga aktif',spreadsheetId:SPREADSHEET_ID}, p.callback);
}

function doPost(e) {
  try {
    let data = e && e.parameter ? e.parameter : {};
    if (e && e.postData && e.postData.contents && String(e.postData.type || '').toLowerCase().indexOf('application/json') >= 0) {
      data = JSON.parse(e.postData.contents || '{}');
    }

    const action = String(data.action || '');

    if (action === 'updateDataPeriod') {
      validateToken_(data.token);
      const value = String(data.value || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
        throw new Error('Format periode data tidak valid.');
      }
      PropertiesService.getScriptProperties().setProperty('DATA_PERIOD', value);
      return jsonOutput({
        ok:true,
        action:'updateDataPeriod',
        value:value,
        serverTime:new Date().toISOString()
      });
    }

    return jsonOutput(updateNote_(data));
  } catch (err) {
    return jsonOutput({ok:false,message:errorText_(err)});
  }
}

function updateNote_(data) {
  validateToken_(data.token);
  if (String(data.action || '') !== 'updateNote') throw new Error('Aksi tidak dikenali.');

  const sheetName = String(data.sheet || '');
  if (!Object.prototype.hasOwnProperty.call(ALLOWED_SHEETS, sheetName)) throw new Error('Sheet tidak diizinkan: ' + sheetName);

  // String kosong adalah update yang sah: digunakan untuk menghapus Keterangan.
  const note = String(data.note == null ? '' : data.note);
  const clearRequested = String(data.clear || '') === '1';
  const finalNote = clearRequested ? '' : note;
  let requestedRow = Number(data.row);

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sh = ss.getSheetByName(sheetName);
    if (!sh) throw new Error('Sheet tidak ditemukan: ' + sheetName);

    let targetRow = requestedRow;
    if (sheetName === 'RH web') {
      targetRow = resolveRhRow_(sh, requestedRow, data.kab, data.commodityCode, data.commodity);
    } else {
      if (!Number.isInteger(targetRow) || targetRow < 3 || targetRow > sh.getMaxRows()) {
        throw new Error('Nomor baris tidak valid: ' + requestedRow);
      }
    }

    const col = ALLOWED_SHEETS[sheetName];
    const cell = sh.getRange(targetRow, col);

    // Gunakan clearContent untuk penghapusan agar tidak ada nilai lama/formula tersisa.
    if (finalNote === '') cell.clearContent();
    else cell.setValue(finalNote);
    SpreadsheetApp.flush();

    // Verifikasi dari range baru, bukan object cell cache.
    const saved = String(sh.getRange(targetRow, col).getDisplayValue() == null ? '' : sh.getRange(targetRow, col).getDisplayValue());
    if (saved !== finalNote) {
      throw new Error('Verifikasi gagal. Nilai di ' + sh.getRange(targetRow,col).getA1Notation() + ' masih: "' + saved + '"');
    }

    return {
      ok:true,
      sheet:sheetName,
      requestedRow:requestedRow,
      row:targetRow,
      column:col,
      cell:sh.getRange(targetRow,col).getA1Notation(),
      note:saved,
      cleared:finalNote === '',
      serverTime:new Date().toISOString()
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// RH web dipetakan secara defensif. Web mengirim row hint + identitas baris.
// Jika row hint meleset (misalnya karena posisi header/range CSV), Apps Script
// mencari baris yang benar berdasarkan A=wilayah, C=kode komoditas, D=komoditas.
function resolveRhRow_(sh, rowHint, kab, commodityCode, commodity) {
  const k = norm_(kab);
  const code = norm_(commodityCode).replace(/\.0$/, '');
  const name = norm_(commodity);

  if (Number.isInteger(rowHint) && rowHint >= 1 && rowHint <= sh.getLastRow()) {
    const vals = sh.getRange(rowHint, 1, 1, 4).getDisplayValues()[0];
    if (rhIdentityMatches_(vals, k, code, name)) return rowHint;
  }

  const last = sh.getLastRow();
  if (last < 1) throw new Error('Sheet RH web kosong.');
  const start = 1;
  const vals = sh.getRange(start, 1, last - start + 1, 4).getDisplayValues();
  const matches = [];
  for (let i=0;i<vals.length;i++) {
    if (rhIdentityMatches_(vals[i], k, code, name)) matches.push(start+i);
  }
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    // Jika identitas duplikat, pilih yang paling dekat dengan row hint.
    if (Number.isFinite(rowHint)) return matches.sort((a,b)=>Math.abs(a-rowHint)-Math.abs(b-rowHint))[0];
    return matches[0];
  }
  throw new Error('Baris RH tidak ditemukan. Wilayah=' + k + ', kode=' + code + ', komoditas=' + name + ', row hint=' + rowHint);
}

function rhIdentityMatches_(vals, kab, code, name) {
  const vk = norm_(vals[0]);
  const vc = norm_(vals[2]).replace(/\.0$/, '');
  const vn = norm_(vals[3]);
  if (kab && vk !== kab) return false;
  if (code && vc !== code) return false;
  if (name && vn !== name) return false;
  return !!(kab || code || name);
}

function validateToken_(token) {
  if (String(token || '') !== WRITE_TOKEN) throw new Error('Token tidak valid.');
}
function norm_(v) { return String(v == null ? '' : v).trim(); }
function errorText_(err) { return String(err && err.message ? err.message : err); }
function jsonOrJsonp(obj, callback) {
  const cb = String(callback || '');
  if (cb && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(cb)) {
    return ContentService.createTextOutput(cb + '(' + JSON.stringify(obj) + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return jsonOutput(obj);
}
function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
