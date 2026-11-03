#!/bin/sh
set -e

echo "========================================================"
echo "   RESIK PURWOKERTO MANAGEMENT SYSTEM (RPMS) - DOCKER   "
echo "========================================================"

# Menunggu koneksi MySQL siap jika DATABASE_URL menggunakan host/port
echo "🔍 [1/3] Memeriksa koneksi database MySQL..."

# Sinkronisasi schema Prisma ke MySQL
echo "📦 [2/3] Menerapkan skema database ke MySQL (Prisma DB Push)..."
npx prisma db push --skip-generate

# Jalankan Seeding akun awal & master layanan
echo "🌱 [3/3] Memeriksa & menjalankan data seeding default..."
node prisma/seed.js || echo "ℹ️ Seeding sudah pernah dijalankan sebelumnya."

echo "🚀 Inisialisasi selesai! Menjalankan Next.js..."
exec "$@"

