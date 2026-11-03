# RESIK PURWOKERTO MANAGEMENT SYSTEM (RPMS)

Sistem Informasi Manajemen Operasional Jasa Kebersihan & Technical Service untuk **Resik Purwokerto** ([@resikpurwokerto](https://www.instagram.com/resikpurwokerto)).

Dibangun dengan arsitektur **Next.js 14 App Router**, **Prisma ORM**, **MySQL Database**, **Tailwind CSS**, dan tema visual **Horizon UI** (*Midnight Navy & Sunflower Gold*).

---

## 🌟 Fitur Utama Sistem

1. **Dashboard Operasional Horizon:**
   - 4 Kartu Metrik Utama: *Total Order Job, Jadwal Hari Ini, Dalam Proses, dan Total Omzet*.
   - **Multi-Column Agenda Card:** Tampilan antrean terstruktur yang memisahkan waktu, pelanggan, jenis layanan, nama teknisi, dan status pekerjaan.
   - **Filter Segmented Tab:** Filter cepat (*Semua, Perlu Dikerjakan, Hari Ini, Selesai*) dengan antarmuka geser horizontal di perangkat seluler (*mobile*).
   - **Grafik Tren Performa 6 Bulan:** Spline Area Chart interaktif menggunakan **Recharts** dengan mode switch (*Kombinasi, Omzet, Order*) dan tooltip mengambang.
   - **Kesiapan Armada & Tim Lapangan:** Monitoring status kesiapan 4 regu teknisi (*AC, Sofa & Kasur, Deep Cleaning, dan Kelistrikan*).

2. **Manajemen Pekerjaan (Job Order):**
   - Penomoran otomatis berstandar: `RP-YYYYMMDD-XXXX`.
   - Form input ramah jemmor (*Mobile-First*) dengan kalkulator otomatis biaya layanan, biaya tambahan, dan diskon.
   - Integrasi WhatsApp 1-Klik ke nomor pelanggan.
   - Cetak SPK / Nota pekerjaan siap print (*print-friendly*).

3. **Dokumentasi Foto Lapangan (Before & After):**
   - Unggah dan simpan foto kondisi sebelum (*Before*) dan sesudah (*After*) pengerjaan teknisi.
   - Tersimpan persisten di storage container / direktori `public/uploads`.

4. **CRM Pelanggan:**
   - Pencarian otomatis nama/telepon pelanggan untuk mencegah duplikasi data pelanggan lama.
   - Riwayat order dan total pengeluaran per pelanggan.

5. **Laporan & Ekspor Finansial:**
   - Rekap omzet dan volume order harian, mingguan, bulanan, dan tahunan.
   - **Ekspor Excel (.xlsx)** otomatis berformat resmi menggunakan ExcelJS.

6. **Role-Based Access Control (RBAC):**
   - **OWNER:** Akses penuh ke seluruh menu, omzet finansial, manajemen pengguna, dan audit trail.
   - **ADMIN:** Mengelola seluruh pekerjaan, CRM pelanggan, dan laporan operasional.
   - **STAFF INPUT:** Khusus input pekerjaan baru via HP di lapangan dan melihat riwayat pekerjaan pribadi.
   - **VIEWER:** Mode baca saja (*read-only*) untuk pemantauan data.

---

## 🛠️ Stack Teknologi

- **Framework Web:** Next.js 14 (App Router) + TypeScript + React 18
- **Database:** MySQL 8.0 (Relasional production-grade)
- **ORM:** Prisma ORM v5
- **Containerization:** Docker & Docker Compose (Multi-stage build)
- **Database GUI:** phpMyAdmin terintegrasi via Docker
- **Styling:** Tailwind CSS + Desain Sistem Horizon UI
- **Data Visualization:** Recharts (Interactive Spline Area Chart)
- **Ikon:** Lucide React
- **Ekspor Dokumen:** ExcelJS & Native Browser Print

---

## 🐳 Panduan 1: Menjalankan dengan Docker (Rekomendasi)

Dengan Docker Compose, seluruh komponen (Next.js App, MySQL Database, phpMyAdmin, auto-migration skema, dan database seeding) akan berjalan secara otomatis dalam 1 perintah.

### 1. Jalankan Container
Buka terminal di direktori proyek dan jalankan:
```bash
docker compose up -d --build
```

Container yang akan otomatis berjalan:
1. **`rpms-mysql`** (MySQL 8.0 di port `3306`)
2. **`rpms-app`** (Next.js Application di port `3000`)
   - Otomatis menjalankan migrasi skema tabel Prisma ke MySQL (`prisma db push`)
   - Otomatis menjalankan seeding master data layanan dan akun demo (`prisma/seed.js`)
3. **`rpms-phpmyadmin`** (Web Database GUI di port `8080`)

### 2. Buka Aplikasi di Browser
- **Aplikasi Web RPMS:** [http://localhost:3000](http://localhost:3000)
- **phpMyAdmin (Database GUI):** [http://localhost:8080](http://localhost:8080)
  - *Server:* `mysql`
  - *Username:* `resik_user` (atau `root`)
  - *Password:* `resik_password` (atau `rootpassword`)

### 3. Perintah Docker Lainnya
- **Melihat log aplikasi:**
  ```bash
  docker compose logs -f app
  ```
- **Menghentikan container:**
  ```bash
  docker compose down
  ```
- **Menghentikan dan menghapus volume database (reset total):**
  ```bash
  docker compose down -v
  ```

---

## 💻 Panduan 2: Menjalankan Lokal (Tanpa Docker / via XAMPP MySQL)

Jika ingin menjalankan aplikasi secara langsung di mesin lokal menggunakan MySQL lokal / XAMPP:

### 1. Prasyarat Sistem
- **Node.js** versi 18 atau 20 LTS
- **MySQL / MariaDB** (misal via XAMPP MySQL di port 3306)

### 2. Buat Database di MySQL
Buka phpMyAdmin XAMPP atau MySQL CLI, buat database baru:
```sql
CREATE DATABASE resik_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Konfigurasi File `.env`
Salin template `.env.example` ke `.env`:
```env
DATABASE_URL="mysql://root:@localhost:3306/resik_db"
JWT_SECRET="resik-purwokerto-secure-auth-secret-key-32chars"
NEXTAUTH_SECRET="resik-purwokerto-secure-auth-secret-key-32chars"
PORT=3000
```
*(Sesuaikan user/password jika MySQL Anda memiliki password).*

### 4. Install Dependensi & Sinkronkan Database
```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
```

### 5. Jalankan Server Aplikasi
- **Mode Development:**
  ```bash
  npm run dev
  ```
- **Mode Production:**
  ```bash
  npm run build
  npm run start
  ```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🔐 Akun Login Default

Semua akun awal menggunakan kata sandi default: **`password123`**

| Peran (Role) | Username | Password | Deskripsi Wewenang |
| :--- | :--- | :--- | :--- |
| **OWNER** | `owner` | `password123` | Akses penuh seluruh sistem, omzet finansial, manajemen pengguna & audit log |
| **ADMIN** | `admin` | `password123` | Manajemen order job, data pelanggan, update status, dan laporan |
| **STAFF** | `staf1` | `password123` | Input job lapangan lewat HP & pantau riwayat pekerjaan pribadi |
| **VIEWER** | `viewer` | `password123` | Monitoring & pantau laporan (hanya baca) |

*(Di halaman login juga tersedia tombol instan 1-klik untuk mencoba masing-masing akun tanpa mengetik sandi).*

---

## 📁 Struktur Direktori Proyek

```
resikApps/
├── docker-compose.yml         # Docker compose di root workspace
└── resik-purwokerto/
    ├── Dockerfile             # Multi-stage production Docker build
    ├── docker-compose.yml     # Docker compose konfigurasi layanan (App + MySQL + phpMyAdmin)
    ├── docker-entrypoint.sh   # Script inisialisasi auto-migration & seed sebelum app start
    ├── .dockerignore          # Daftar file yang diabaikan saat build image Docker
    ├── .env.example           # Template environment variable (MySQL)
    ├── .env                   # File konfigurasi environment
    ├── prisma/
    │   ├── schema.prisma      # Skema database MySQL (User, Customer, Job, Service, AuditLog)
    │   └── seed.js            # Script seeding master data layanan dan akun demo
    ├── src/
    │   ├── app/               # Next.js App Router (Halaman dashboard, jobs, customers, reports, API)
    │   ├── components/        # Komponen UI Horizon, AppLayout, StatusBadge
    │   ├── lib/               # Helper utilities (format rupiah, tanggal Indonesia, auth JWT, prisma client)
    │   └── types/             # Deklarasi tipe TypeScript
    ├── public/
    │   └── uploads/           # Direktori penyimpanan foto before/after (dipersistensi via Docker Volume)
    ├── package.json           # Dependensi proyek & scripts (db:push, db:seed, db:migrate, dll)
    └── tailwind.config.ts     # Konfigurasi token warna Horizon (Midnight Navy & Amber Gold)
```

---

## 📝 Lisensi
Hak Cipta & Hak Milik Operasional &copy; Resik Purwokerto Management System.
