# Sistem Monitoring Harga — GitHub Pages

Dashboard berbentuk **Single Page Application (SPA)**. Hanya ada satu halaman web, tetapi menu di sidebar menampilkan beberapa sub-analisis tanpa memuat ulang halaman.

## Menu

- Dashboard
- Mingguan
- Dwi Mingguan
- Bulanan
- Komoditas
- Pasar
- Evaluasi
- Rekap Data

## Sumber data

Dashboard membaca Google Sheets secara langsung:

`https://docs.google.com/spreadsheets/d/1To6WfnCyCn8ms7o1KQ5M_UOtvmk2yO1uH50g1rjA8Eg/edit`

Pastikan akses spreadsheet: **Siapa saja yang memiliki link → Pelihat**.

Nama sheet yang dibaca:

- `Mingguan`
- `Dwi Mingguan`
- `bulanan`

Kolom harga:

- Mingguan: `AVR PREV` dan `AVR CURRENT`
- Dwi Mingguan: `AVR PREV` dan `AVR CURRENT`
- Bulanan: `PREV` dan `CURRENT`

## Login

- Username: `harga1900`
- Password: `harga1900`

> GitHub Pages adalah hosting statis. Login dalam proyek ini dibuat dengan JavaScript dan hanya membatasi tampilan. Jangan gunakan untuk menyimpan data rahasia.

## Cara upload ke GitHub

1. Buat repository baru, misalnya `dashboard-harga`.
2. Ekstrak ZIP proyek.
3. Upload `index.html`, `style.css`, `script.js`, dan `README.md` ke root repository.
4. Buka **Settings → Pages**.
5. Pilih **Deploy from a branch**.
6. Pilih branch **main** dan folder **/(root)**.
7. Klik **Save**.
8. Buka alamat yang diberikan GitHub Pages.

## Memperbarui dashboard

Data tidak perlu diunggah kembali ke GitHub. Cukup perbarui Google Sheets, kemudian klik tombol **Muat ulang** pada dashboard.
