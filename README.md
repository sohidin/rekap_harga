# Sistem Monitoring Harga — GitHub Pages

## Pemetaan kolom yang digunakan

| Sheet | Nama responden | Prev | Current | Keterangan |
|---|---|---|---|---|
| Mingguan | K | V | W | Y |
| Dwi Mingguan | K | P | Q | S |
| bulanan | K | L | M | O |

Perubahan dihitung oleh dashboard dengan rumus `(Current - Prev) / Prev × 100%`.

## Fitur revisi

- Menu Mingguan, Dwi Mingguan, dan Bulanan digabung menjadi **Analisis Periode**.
- Pilihan periode: Mingguan, Dwi Mingguan, Bulanan, dan **Tampilkan Semua**.
- Kolom **Nama Responden** dari kolom K.
- Kolom **Keterangan** dapat diedit.
- Tabel dapat diurutkan dengan mengklik judul kolom.
- Filter awal hanya menampilkan perubahan `≤ -20%` atau `≥ +20%`. Hilangkan centang untuk melihat semua data.

## A. Pasang Google Apps Script agar Keterangan bisa disimpan

GitHub Pages hanya dapat membaca data. Agar perubahan Keterangan masuk ke spreadsheet, gunakan Apps Script sebagai penghubung.

1. Buka spreadsheet.
2. Pilih **Ekstensi → Apps Script**.
3. Hapus isi `Code.gs`, lalu salin seluruh isi file `Code.gs` dari paket ini.
4. Klik **Deploy → New deployment**.
5. Pilih jenis **Web app**.
6. Atur:
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Klik **Deploy** dan beri izin.
8. Salin URL Web App yang berakhiran `/exec`.
9. Buka file `script.js`, lalu ganti:

```javascript
appsScriptUrl:'PASTE_URL_WEB_APP_APPS_SCRIPT_DI_SINI'
```

menjadi, misalnya:

```javascript
appsScriptUrl:'https://script.google.com/macros/s/XXXXXXXX/exec'
```

10. Simpan file.

Setiap kali `Code.gs` diubah, buat deployment versi baru melalui **Deploy → Manage deployments → Edit → New version → Deploy**.

## B. Upload ke GitHub

Unggah file berikut ke repository GitHub Pages:

- `index.html`
- `style.css`
- `script.js`
- `README.md`

`Code.gs` tidak perlu diunggah ke GitHub; file itu ditempelkan ke editor Apps Script.

Aktifkan **Settings → Pages → Deploy from a branch → main → /(root)**.

## C. Akses spreadsheet

Agar data dapat dibaca dashboard, spreadsheet harus dapat dilihat oleh **Anyone with the link / Siapa saja yang memiliki link**. Hak edit spreadsheet tidak perlu dibuka untuk publik; penulisan dilakukan oleh Web App Apps Script milik pemilik spreadsheet.

## Login dashboard

- Username: `harga1900`
- Password: `harga1900`

Catatan: login GitHub Pages berbasis JavaScript dan bukan autentikasi server untuk data rahasia.


## Koreksi penyimpanan Keterangan

Agar tombol **Simpan** benar-benar menulis ke spreadsheet:

1. Tempel ulang isi `Code.gs` terbaru ke Apps Script.
2. Klik **Deploy > Manage deployments**.
3. Klik ikon pensil pada deployment Web App.
4. Pada **Version**, pilih **New version**.
5. Pastikan **Execute as: Me** dan **Who has access: Anyone**.
6. Klik **Deploy**.
7. Gunakan URL Web App yang berakhiran `/exec`, bukan `/dev`.
8. Tempel URL tersebut pada `CONFIG.appsScriptUrl` di `script.js`.
9. Upload ulang `script.js` ke GitHub dan tekan `Ctrl+F5` pada dashboard.

Pemetaan penulisan:
- Mingguan → kolom Y (25)
- Dwi Mingguan → kolom S (19)
- bulanan → kolom O (15)
