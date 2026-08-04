# Dashboard Rekap dan Evaluasi Harga

Dashboard web statis untuk menampilkan data dari tiga sheet Google Sheets:

- `Mingguan`
- `Dwi Mingguan`
- `bulanan`

Dashboard memuat data langsung dari spreadsheet berikut:

`https://docs.google.com/spreadsheets/d/1To6WfnCyCn8ms7o1KQ5M_UOtvmk2yO1uH50g1rjA8Eg/edit`

## Fitur

- Filter periode, wilayah, komoditas, jenis pasar, dan pencarian.
- KPI jumlah observasi, harga naik, turun, tetap, dan perubahan ekstrem.
- Grafik komposisi perubahan, komoditas teratas, perubahan per jenis pasar, dan kualitas data.
- Evaluasi otomatis serta rekomendasi tindak lanjut.
- Tabel perubahan terbesar dan unduh CSV.
- Tampilan responsif untuk komputer dan ponsel.

## Syarat Google Sheets

Spreadsheet harus dapat dibaca publik:

1. Buka Google Sheets.
2. Klik **Bagikan**.
3. Pada Akses umum, pilih **Siapa saja yang memiliki link**.
4. Pilih peran **Pelihat**.

Nama sheet harus tetap sama persis. Data utama harus dimulai pada baris 2 karena baris 1 merupakan header kelompok `PREV` dan `CURRENT`.

## Cara memasang di GitHub Pages

1. Buat repository GitHub baru, misalnya `dashboard-rekap-harga`.
2. Unggah `index.html`, `style.css`, dan `script.js` ke bagian utama repository.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/ (root)`, lalu klik **Save**.
6. Buka alamat GitHub Pages yang ditampilkan GitHub.

## Mengganti sumber spreadsheet

Buka `script.js`, lalu ubah nilai:

```javascript
spreadsheetId: 'ID_SPREADSHEET_ANDA'
```

## Catatan struktur kolom

Dashboard membaca kolom inti berikut:

- `Kab` atau `KAB`
- `Komoditas`
- `Kualitas`
- `Jenis Pasar`
- `Pasar`
- `Nama Responden`
- `AVR PREV` dan `AVR CURRENT` untuk Mingguan/Dwi Mingguan
- `PREV` dan `CURRENT` untuk Bulanan
- `RH`
- `FLAG`

Nilai perubahan dihitung sebagai `RH - 100`. Apabila RH kosong, dashboard menghitung perubahan dari harga sebelumnya dan harga saat ini.
