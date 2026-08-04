# Dashboard Rekap Harga

Dashboard GitHub Pages yang membaca data langsung dari Google Sheets.

## Fitur utama
- Login: `harga1900` / `harga1900`
- Pilihan Mingguan, Dwi Mingguan, dan Bulanan
- Mingguan menggunakan kolom **AVR PREV** dan **AVR CURRENT**
- Dwi Mingguan menggunakan kolom **AVR PREV** dan **AVR CURRENT**
- Bulanan menggunakan kolom **PREV** dan **CURRENT**
- Ringkasan rata-rata harga sebelumnya, harga saat ini, dan perubahan
- Grafik, evaluasi otomatis, tabel, filter, dan ekspor CSV
- Tombol langsung menuju Google Spreadsheet

## Cara memperbarui GitHub
1. Ekstrak ZIP.
2. Di repository GitHub, buka **Add file > Upload files**.
3. Unggah dan timpa `index.html`, `style.css`, `script.js`, dan `README.md`.
4. Klik **Commit changes**.
5. GitHub Pages akan memperbarui situs secara otomatis.

## Catatan keamanan
Login ini berjalan di sisi browser (JavaScript), sehingga hanya berfungsi sebagai pembatas tampilan sederhana, bukan keamanan tingkat server. Username dan password dapat ditemukan oleh pengguna yang memeriksa source code. Untuk data rahasia, gunakan autentikasi server atau platform seperti Firebase Authentication/Cloudflare Access.

Google Sheets harus dapat diakses oleh pengunjung dashboard, minimal **Anyone with the link – Viewer**.
