const SPREADSHEET_ID = '1To6WfnCyCn8ms7o1KQ5M_UOtvmk2yO1uH50g1rjA8Eg';
const WRITE_TOKEN = 'harga1900';
const ALLOWED_SHEETS = {
  'Mingguan': 'Y',
  'Dwi Mingguan': 'S',
  'bulanan': 'O'
};

function doGet() {
  return jsonOutput({ok: true, message: 'Web App Monitoring Harga aktif'});
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents || '{}');
    if (data.token !== WRITE_TOKEN) throw new Error('Token tidak valid.');
    if (data.action !== 'updateNote') throw new Error('Aksi tidak dikenali.');
    const sheetName = String(data.sheet || '');
    const row = Number(data.row);
    const note = String(data.note || '');
    const column = ALLOWED_SHEETS[sheetName];
    if (!column) throw new Error('Sheet tidak diizinkan.');
    if (!Number.isInteger(row) || row < 3) throw new Error('Nomor baris tidak valid.');

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error('Sheet tidak ditemukan.');
    sheet.getRange(column + row).setValue(note);
    SpreadsheetApp.flush();
    return jsonOutput({ok: true, sheet: sheetName, row: row, column: column, note: note});
  } catch (err) {
    return jsonOutput({ok: false, message: err.message});
  }
}

function jsonOutput(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
