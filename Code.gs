const SPREADSHEET_ID = '1To6WfnCyCn8ms7o1KQ5M_UOtvmk2yO1uH50g1rjA8Eg';
const WRITE_TOKEN = 'harga1900';

// Nama sheet harus sama persis dengan tab pada spreadsheet.
const ALLOWED_SHEETS = {
  'Mingguan': 25,      // Kolom Y
  'Dwi Mingguan': 19,  // Kolom S
  'bulanan': 15,       // Kolom O
  'RH web': 8           // Kolom H
};

function doGet(e) {
  return jsonOutput({
    ok: true,
    message: 'Web App Monitoring Harga aktif',
    spreadsheetId: SPREADSHEET_ID
  });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    // Mendukung POST form-urlencoded maupun JSON lama.
    let data = e && e.parameter ? e.parameter : {};
    if (e && e.postData && e.postData.contents &&
        String(e.postData.type || '').toLowerCase().includes('application/json')) {
      data = JSON.parse(e.postData.contents || '{}');
    }

    const token = String(data.token || '');
    const action = String(data.action || '');
    const sheetName = String(data.sheet || '');
    const row = Number(data.row);
    const note = String(data.note == null ? '' : data.note);

    if (token !== WRITE_TOKEN) throw new Error('Token tidak valid.');
    if (action !== 'updateNote') throw new Error('Aksi tidak dikenali.');
    if (!Object.prototype.hasOwnProperty.call(ALLOWED_SHEETS, sheetName)) {
      throw new Error('Sheet tidak diizinkan: ' + sheetName);
    }
    if (!Number.isInteger(row) || row < 3) {
      throw new Error('Nomor baris tidak valid: ' + row);
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet tidak ditemukan: ' + sheetName);
    if (row > sheet.getMaxRows()) throw new Error('Baris melebihi jumlah baris sheet.');

    const column = ALLOWED_SHEETS[sheetName];
    sheet.getRange(row, column).setValue(note);
    SpreadsheetApp.flush();

    return jsonOutput({
      ok: true,
      sheet: sheetName,
      row: row,
      column: column,
      cell: sheet.getRange(row, column).getA1Notation(),
      note: note
    });
  } catch (err) {
    return jsonOutput({ok: false, message: String(err && err.message ? err.message : err)});
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function jsonOutput(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
