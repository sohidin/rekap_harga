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

  // Tulis Keterangan melalui JSONP. Ini sengaja didukung lewat GET agar
  // GitHub Pages dapat menerima konfirmasi sukses tanpa masalah CORS.
  if (action === 'updateNote') {
    try {
      const out = updateNote_(p);
      return jsonOrJsonp(out, p.callback);
    } catch (err) {
      return jsonOrJsonp({ok:false,message:String(err && err.message ? err.message : err)}, p.callback);
    }
  }

  // Endpoint ringan khusus Keterangan RH untuk sinkron spreadsheet -> web.
  if (action === 'getRhNotes') {
    try {
      if (String(p.token || '') !== WRITE_TOKEN) throw new Error('Token tidak valid.');
      const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      const sh = ss.getSheetByName('RH web');
      if (!sh) throw new Error('Sheet RH web tidak ditemukan.');
      const lastRow = sh.getLastRow();
      const values = lastRow >= 3 ? sh.getRange(3, 8, lastRow - 2, 1).getDisplayValues() : [];
      const out = {ok:true, rows:values.map((r,i)=>({row:i+3,note:String(r[0] || '')})), serverTime:new Date().toISOString()};
      return jsonOrJsonp(out, p.callback);
    } catch (err) {
      return jsonOrJsonp({ok:false,message:String(err && err.message ? err.message : err)}, p.callback);
    }
  }

  return jsonOrJsonp({
    ok: true,
    message: 'Web App Monitoring Harga aktif',
    spreadsheetId: SPREADSHEET_ID
  }, p.callback);
}

function doPost(e) {
  try {
    let data = e && e.parameter ? e.parameter : {};
    if (e && e.postData && e.postData.contents &&
        String(e.postData.type || '').toLowerCase().includes('application/json')) {
      data = JSON.parse(e.postData.contents || '{}');
    }
    return jsonOutput(updateNote_(data));
  } catch (err) {
    return jsonOutput({ok:false,message:String(err && err.message ? err.message : err)});
  }
}

function updateNote_(data) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const token = String(data.token || '');
    const action = String(data.action || '');
    const sheetName = String(data.sheet || '');
    const row = Number(data.row);
    const note = String(data.note == null ? '' : data.note);

    if (token !== WRITE_TOKEN) throw new Error('Token tidak valid.');
    if (action !== 'updateNote') throw new Error('Aksi tidak dikenali.');
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_SHEETS, sheetName)) throw new Error('Sheet tidak diizinkan: ' + sheetName);
    if (!Number.isInteger(row) || row < 3) throw new Error('Nomor baris tidak valid: ' + row);

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet tidak ditemukan: ' + sheetName);
    if (row > sheet.getMaxRows()) throw new Error('Baris melebihi jumlah baris sheet.');

    const column = ALLOWED_SHEETS[sheetName];
    const cell = sheet.getRange(row, column);
    cell.setValue(note);
    SpreadsheetApp.flush();

    // Baca kembali sel yang sama sebagai verifikasi server-side.
    const saved = String(cell.getDisplayValue() || '');
    if (saved !== note) throw new Error('Verifikasi penyimpanan gagal pada ' + cell.getA1Notation() + '.');

    return {ok:true,sheet:sheetName,row:row,column:column,cell:cell.getA1Notation(),note:saved,serverTime:new Date().toISOString()};
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

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
