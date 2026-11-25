# AZZATUL BOUQUET — Studio Buket Custom & Portal Operasional UMKM

Aplikasi web pemesanan buket custom 100% awet tanpa bunga segar beserta portal manajemen operasional internal untuk **Azzatul Bouquet** (**Klapa Nunggal, Cileungsi — Kab. Bogor**).

---

## Kategori Buket Custom

1. **Buket Snack & Jajan** — Rangkaian cokelat, wafer, biskuit, dan minuman favorit bertingkat dengan opsi pilih item snack satuan.
2. **Buket Uang (*Money Bouquet*)** — Rangka slot uang plastik rapi tanpa lem (uang dapat disiapkan dari toko atau dibawa sendiri).
3. **Buket Foto / Polaroid** — Cetak foto polaroid & photostrip berlaminasi anti pudar dengan aksen pita dan lampu LED warm.
4. **Rangkaian Bunga (*Artificial / Pita Satin*)** — Mawar satin, tulip satin, dan *sunflower artificial* buatan tangan yang awet selamanya.
5. **Buket Mix Custom** — Kombinasi bebas snack, foto polaroid, boneka wisuda, aksesoris kado, dan rangkaian bunga dalam satu buket.

---

## Struktur 4 Halaman Utama

### Alur Pelanggan
1. **[index.html](file:///c:/projects/Tugas%20Sekolah/buket_bunga/index.html) — Beranda (*Landing Page*)**
   - Etalase visual sinematik koleksi buket custom Azzatul Bouquet dengan navigasi cepat menuju katalog & studio perangkaian.
2. **[customize.html](file:///c:/projects/Tugas%20Sekolah/buket_bunga/customize.html) — Studio Buat Buket (4 Langkah Interaktif)**
   - **Langkah 1:** Pilih dari **8 Koleksi Katalog Siap Pakai**, **Rangkai Custom dari Nol**, atau **Unggah Foto Referensi Sendiri**.
   - **Langkah 2:** Pilih kategori buket, jumlah isian (5–20), pilih isi snack/item custom satuan, detail nominal slot uang, dan palet warna utama.
   - **Langkah 3:** Atur gaya *wrapping* (*Korean Multi-Layer*, *Round Dome*, *Classic Minimalist*), warna *cellophane*, warna pita, tambahan slot uang, serta *add-on* (foto polaroid, rangkaian bunga, boneka wisuda, lampu LED warm, *list gold*).
   - **Langkah 4:** Tulis **Kartu Ucapan A6 Gratis** (4 pilihan tema siap cetak) dan tinjau rincian spesifikasi serta estimasi waktu pengerjaan.
3. **[checkout.html](file:///c:/projects/Tugas%20Sekolah/buket_bunga/checkout.html) — Jadwal & Pembayaran QRIS 1-Pintu**
   - Pengisian data pemesan (tersimpan otomatis di browser), pilihan **Ambil di Tempat** (Klapa Nunggal, Cileungsi — Kab. Bogor) atau **Pengiriman Kurir Instan**, serta estimasi posisi antrean **FIFO**.
   - Dukungan kode promo aktif:
     - `WISUDA15` — Diskon 15% (maks. Rp 35.000, min. belanja Rp 100.000)
     - `AZZATUL20` — Potongan langsung Rp 20.000 (min. belanja Rp 120.000)
   - **Pembayaran 1-Pintu QRIS Nasional**:
     - **Mode Terhubung Midtrans (`npm run dev` + `.env`):** Membuat QRIS dinamis resmi melalui Midtrans Core API lengkap dengan pengecekan status otomatis (*auto-polling*) dan simulasi bayar Sandbox 1-klik.
     - **Mode Fallback QRIS Statis / Offline:** Jika dijalankan tanpa konfigurasi kunci Midtrans atau dibuka langsung secara lokal, halaman otomatis menampilkan QRIS resmi toko beserta fitur unggah bukti bayar dan konfirmasi instan ke WhatsApp Admin.

### Portal Internal UMKM
4. **[admin.html](file:///c:/projects/Tugas%20Sekolah/buket_bunga/admin.html) — Portal Operasional Admin (RBAC)**
   - Dilengkapi kontrol akses berbasis peran (*Role-Based Access Control*):
     - **Owner:** `owner` / `owner123` (**Owner Azzatul Bouquet** — akses penuh 5 modul: Antrean Pesanan, Workshop Bahan & Isi, Stok & Opname, Kelola Katalog, dan Laporan Keuangan + Ekspor CSV).
     - **Crafter:** `crafter` / `crafter123` (**Rina** — fokus produksi 3 modul: Antrean Pesanan FIFO/Kanban, Workshop Bahan & Isi, serta Stok & Opname).
   - Mendukung verifikasi bukti QRIS, pemotongan stok bahan baku otomatis (*Auto-BOM*), penyesuaian penawaran via WhatsApp, cetak Nota Pesanan, dan cetak Kartu Ucapan A6 siap gunting.

---

## Cara Menjalankan Proyek

### Opsi 1: Server Lokal + Proxy QRIS Midtrans (Direkomendasikan)
Pastikan **Node.js >= 18** sudah terpasang (tanpa perlu `npm install` karena menggunakan modul bawaan Node.js):

1. Salin file konfigurasi contoh bila ingin mengaktifkan Midtrans Core API:
   ```powershell
   Copy-Item .env.example .env
   ```
   Lalu isi `MIDTRANS_SERVER_KEY` di `.env` (perubahan `.env` langsung terbaca otomatis tanpa perlu me-restart server).
2. Jalankan server lokal:
   ```bash
   npm run dev
   ```
3. Buka browser di **`http://localhost:3000`**.

### Opsi 2: Buka Langsung (`index.html`) dengan Fallback QRIS Offline
Klik dua kali file [index.html](file:///c:/projects/Tugas%20Sekolah/buket_bunga/index.html) menggunakan browser modern (Chrome / Edge / Firefox). Seluruh data katalog, keranjang custom, antrean pesanan, inventori, dan keuangan tersimpan di `localStorage` beserta mode pembayaran fallback QRIS toko & konfirmasi WhatsApp.
