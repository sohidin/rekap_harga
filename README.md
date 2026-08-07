# Sistem Monitoring Harga — GitHub Pages

## Pemetaan kolom yang digunakan

| Sheet | Nama responden | Prev | Current | Keterangan |
|---|---|---|---|---|
| Mingguan | K | V | W | Y |
| Dwi Mingguan | K | P | Q | S |
| bulanan | K | L | M | O |

Perubahan dihitung oleh dashboard dengan rumus `(Current - Prev) / Prev × 100%`.

## Fitur revisi

- Menu Mingguan, Dwi Mingguan, dan Bulanan digabung menjadi **Evaluasi Bulanan**.
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


## Menu Evaluasi Mingguan
- Mingguan membandingkan M1–M5 Previous (L:P) dengan M1–M5 Current (Q:U).
- Dwi Mingguan membandingkan M1 dan M3 Previous (L:M) dengan M1 dan M3 Current (N:O).
- Bulanan membandingkan Previous (L) dengan Current (M).
- Nilai 0 dan kosong tidak dihitung.
- Keterangan tetap menggunakan Y (Mingguan), S (Dwi Mingguan), dan O (bulanan).
- Gunakan tombol Sinkronkan Spreadsheet atau Muat ulang untuk menarik perubahan Keterangan yang dibuat langsung di Google Sheets.


## Logika evaluasi deret harga

- Mingguan: Prev M1 → Prev M2 → Prev M3 → Prev M4 → Prev M5 → Current M1 → Current M2 → Current M3 → Current M4 → Current M5.
- Dwi Mingguan: Prev M1 → Prev M3 → Current M1 → Current M3.
- Bulanan: Previous → Current.
- Nilai 0 dan sel kosong dilewati. Perubahan dihitung dari titik valid terakhir ke titik valid berikutnya.

## Pembaruan tampilan evaluasi
- Semua data ditampilkan secara bawaan; filter ±20% tetap tersedia sebagai opsi.
- Evaluasi Bulanan dan Mingguan memiliki pilihan 50, 100, 250, 500 baris, atau Semua.
- Harga dasar pertama pada timeline berwarna putih.
- Persentase di atas panah dihapus; persentase hanya ditampilkan di dalam kotak harga.
- Gradasi sembilan kelompok perubahan diperjelas untuk kenaikan dan penurunan.

## Pembaruan filter dan urutan data

- Evaluasi Bulanan memiliki filter **Kelompok perubahan** untuk sembilan kategori warna.
- Evaluasi Bulanan dan Evaluasi Mingguan memiliki tombol **Urutan Raw Data**.
- Tombol tersebut mengurutkan kembali data menurut urutan sheet sumber dan nomor baris asli pada spreadsheet.
- Saat periode `Tampilkan Semua` dipilih, urutan sheet adalah Mingguan, Dwi Mingguan, lalu Bulanan; di dalam setiap sheet urutan mengikuti nomor baris asli.


## Ringkasan Evaluasi Bulanan
Evaluasi Bulanan menampilkan sembilan kartu distribusi kelompok perubahan (tetap, empat tingkat kenaikan, dan empat tingkat penurunan). Angka kartu mengikuti filter utama yang aktif, sedangkan filter Kelompok Perubahan tetap digunakan untuk menyaring tabel.


## Pembaruan analisis Komoditas × Kualitas dan ekspor

- Evaluasi Bulanan dan Evaluasi Mingguan menampilkan **Kode Komoditas**.
- Kolom **Keterangan** pada Evaluasi Mingguan dapat di-sort seperti Evaluasi Bulanan.
- Kedua evaluasi mempunyai ekspor **Excel, CSV, PDF, dan PNG**. Excel/CSV mengekspor seluruh data sesuai filter dan sort aktif; PDF/PNG menangkap halaman evaluasi yang sedang tampil.
- Menu Komoditas sekarang menggunakan dua tingkat pemilihan: **Komoditas → Kualitas**. Harga antar-kualitas tidak dicampur pada KPI utama.
- Ringkasan Komoditas menampilkan rata-rata Prev/Current gabungan seluruh kabupaten/kota, ringkasan semua kualitas, rata-rata harga per kabupaten/kota, serta minimum–maksimum Current per kabupaten/kota.

## Revisi antarmuka terbaru
- Evaluasi Mingguan: kolom Pasar/Responden dipadatkan dan judul **Perjalanan Harga** menjadi **Harga**.
- Evaluasi Bulanan: judul Previous, Current, dan Perubahan diratakan ke tengah.
- Filter Komoditas dan Kualitas menggunakan kotak pencarian dengan saran (datalist), sehingga dapat diketik untuk mencari.
- Menu Komoditas menggunakan filter: Periode, Wilayah, Komoditas, Kualitas, Jenis Pasar, dan Pencarian.
- Ringkasan Seluruh Kualitas memiliki **Jumlah Wilayah** dan daftar wilayah tempat kualitas ditemukan.
- Menu **Matriks Komoditas** menggantikan Rekap Data dan merangkum seluruh Komoditas × Kualitas × Kabupaten/Kota. Tabel dapat di-sort dan di-download Excel, CSV, PDF, atau PNG.


## Filter besar perubahan (multi-select)
Evaluasi Bulanan dan Evaluasi Mingguan memiliki filter besar perubahan yang dapat dipilih lebih dari satu: Tidak ada perubahan harga, >0–19,99%, ±20–49,99%, ±50–99,99%, dan ±100% atau lebih. Jika tidak ada pilihan, semua data ditampilkan. Pada Evaluasi Mingguan, sebuah baris lolos jika minimal satu perubahan berurutan masuk ke kelompok yang dipilih.


## Koreksi tampilan filter 5 kategori
Versi ini memastikan lima pilihan filter tampil di Evaluasi Bulanan dan Evaluasi Mingguan: Tidak ada perubahan harga; >0–19,99%; ±20–49,99%; ±50–99,99%; dan ±100% atau lebih. `index.html` juga menggunakan cache-busting pada CSS/JS agar GitHub Pages/browser tidak mempertahankan tampilan versi lama. Setelah upload, lakukan hard refresh (Ctrl+F5).


## Modul RH (baru)
Dashboard kini membaca sheet **RH web** dengan pemetaan: A=Kabupaten/Kota, B=Kode Komoditas, C=Komoditas, D=Kualitas, E=Previous, F=Current, G=RH, H=Keterangan. Tabulasi RH mempivot kode komoditas ke kolom wilayah 1902/1903/1906/1971. Nilai >100 dan <100 diberi warna berbeda; bila hanya satu wilayah bergerak berlawanan arah terhadap mayoritas, sel tersebut diberi highlight ungu.

Karena Keterangan RH ditulis ke kolom H, **Code.gs berubah**. Tempel Code.gs terbaru ke Apps Script lalu lakukan **Deploy > Manage deployments > Edit > New version > Deploy**. URL /exec tetap dapat digunakan jika deployment yang sama diperbarui.


## Koreksi modul RH
- RH web: Wilayah=A, Kode Komoditas=C, Nama Komoditas=D, Previous=E, Current=F, RH=G, Keterangan=H.
- Tidak ada kolom Kualitas pada modul RH.
- Tabulasi RH dan Harga RH memiliki filter klasifikasi perubahan RH yang dapat dipilih lebih dari satu.
- Jumlah baris memiliki opsi 10/25/50/100/250/500/Semua dan informasi jumlah baris yang benar-benar tampil.

## Perbaikan ekspor Evaluasi Bulanan dan Mingguan
- Nama file download sekarang menyertakan tanggal dan waktu sampai menit, contoh: `evaluasi-bulanan-mingguan-2026-08-07_14-51.xlsx`.
- Kolom Keterangan pada Excel/CSV mengambil nilai terbaru yang sedang tampil/ditulis di web. Jika Keterangan sudah disimpan ke spreadsheet, nilai pada state juga ikut diperbarui.
- Tombol Simpan sekarang mengambil textarea pada baris yang sama sehingga aman meskipun baris yang sama tampil pada lebih dari satu menu.


## Sinkronisasi dua arah Keterangan RH

- Sheet `RH web` kolom **H** menjadi sumber Keterangan untuk **Tabulasi RH** dan **Harga RH**.
- Jika kolom H diubah langsung di Google Sheets, web mengecek ulang data RH otomatis setiap **10 detik** saat salah satu menu RH sedang dibuka. Tombol **Muat ulang** tetap dapat digunakan untuk sinkronisasi manual seluruh dashboard.
- Jika Keterangan diubah dari web lalu tombol **Simpan** ditekan, Apps Script menulis ke baris yang sama pada kolom H dan web membaca kembali data RH sesudah penyimpanan.
- Pada Tabulasi RH, setiap kabupaten/kota mempunyai textarea dan tombol Simpan sendiri. Tombol sekarang selalu membaca textarea pada kotak kabupaten/kota yang sama, sehingga catatan 1902/1903/1906/1971 tidak tertukar.
- Saat pengguna sedang mengetik di textarea RH, sinkronisasi otomatis tidak akan merender ulang tabel agar teks yang sedang diketik tidak hilang.


## Sinkronisasi RH cepat (versi terbaru)

Versi ini mengubah sinkronisasi Keterangan pada sheet **RH web** agar terasa seperti Evaluasi Bulanan/Mingguan. Simpan dari web dikirim melalui form POST langsung ke Apps Script dan state Tabulasi RH + Harga RH diperbarui saat itu juga. Perubahan yang diketik langsung di spreadsheet dibaca melalui endpoint Apps Script ringan setiap sekitar **2 detik**, sehingga tidak menunggu refresh CSV seluruh sheet.

Karena `Code.gs` berubah, lakukan **Deploy > Manage deployments > Edit > New version > Deploy**. Pertahankan URL `/exec` deployment yang sama, lalu masukkan URL itu kembali ke `CONFIG.appsScriptUrl` pada `script.js`.
