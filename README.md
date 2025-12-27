# KASIRKU.APP

> 🏪 Aplikasi Kasir & POS Modern untuk UMKM Indonesia

KASIRKU.APP adalah sistem Point of Sale (POS) berbasis web yang dirancang khusus untuk UMKM Indonesia. Aplikasi ini menggantikan buku kas, Excel, dan catatan manual dengan solusi digital yang simple, murah, dan mobile-first.

## ✨ Fitur Utama

### 💰 POS / Kasir
- Scan barcode menggunakan kamera HP
- Pencarian produk cepat
- Multi kuantitas & diskon per item
- Kalkulasi subtotal & kembalian otomatis
- Metode bayar: Cash, QRIS, Transfer
- Cetak/share struk via WhatsApp

### 📦 Produk & Stok
- CRUD produk lengkap
- Generate barcode otomatis
- Stok masuk/keluar
- Auto pengurangan stok saat penjualan
- Riwayat pergerakan stok
- Alert stok minimum via WhatsApp

### 👥 Customer CRM
- Database pelanggan
- Riwayat transaksi per customer
- Broadcast promo WhatsApp

### 📊 Laporan
- Penjualan harian/mingguan/bulanan
- Chart & grafik interaktif
- Produk terlaris
- Profit & loss
- Export PDF/Excel

### 💬 WhatsApp Automation
- Kirim struk otomatis
- Alert stok rendah
- Broadcast promo

### 🏢 Multi Outlet
- Kelola banyak toko
- Multi kasir dengan role
- Data terpisah per outlet

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Backend | Go Fiber |
| Database | Supabase (PostgreSQL) |
| Frontend | React + Vite + Tailwind |
| State | Zustand + React Query |
| Charts | Recharts |
| WA Gateway | Fonnte / Wablas |

## 📁 Struktur Proyek

```
gopos/
├── cmd/
│   └── server/
│       └── main.go           # Entry point
├── internal/
│   ├── config/               # Configuration
│   ├── database/             # Database connection
│   ├── handlers/             # API handlers
│   ├── middleware/           # Auth middleware
│   ├── models/               # Data models
│   └── services/             # Business logic
├── database/
│   └── schema.sql            # Database schema
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API services
│   │   └── store/            # Zustand stores
│   ├── package.json
│   └── vite.config.js
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL (atau Supabase account)

### 1. Clone & Setup

```bash
git clone https://github.com/your-repo/kasirku.git
cd kasirku
```

### 2. Backend Setup

```bash
# Copy environment file
cp .env.example .env

# Edit .env dengan kredensial Anda
nano .env

# Download dependencies
go mod tidy

# Run server
go run cmd/server/main.go
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev
```

### 4. Database Setup

1. Buat project baru di [Supabase](https://supabase.com)
2. Jalankan `database/schema.sql` di SQL Editor
3. Copy URL dan API keys ke `.env`

## 🌐 Deployment

### Backend (VPS/Docker)

```bash
# Build Docker image
docker build -t kasirku-api .

# Run container
docker run -d -p 8080:8080 --env-file .env kasirku-api
```

### Frontend (Vercel)

1. Connect repo ke Vercel
2. Set root directory: `frontend`
3. Add environment variables:
   - `VITE_API_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 💳 Paket Berlangganan

| Paket | Harga | Fitur |
|-------|-------|-------|
| **Free** | Gratis | 50 trx/bulan, 1 outlet |
| **Basic** | Rp 59.000/bln | Unlimited trx, WA automation |
| **Pro** | Rp 149.000/bln | 5 outlet, broadcast, 10 staff |
| **Agency** | Rp 299.000/bln | Unlimited outlet & staff |

## 📱 API Endpoints

### Auth
- `POST /api/auth/register` - Registrasi
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Profile

### Stores
- `GET /api/stores` - List toko
- `POST /api/stores` - Buat toko
- `PUT /api/stores/:id` - Update toko

### Products
- `GET /api/stores/:id/products` - List produk
- `POST /api/stores/:id/products` - Tambah produk
- `GET /api/stores/:id/products/barcode/:code` - Cari by barcode

### Transactions
- `GET /api/stores/:id/transactions` - List transaksi
- `POST /api/stores/:id/transactions` - Buat transaksi

### Reports
- `GET /api/stores/:id/reports/daily` - Laporan harian
- `GET /api/stores/:id/reports/products` - Produk terlaris

## 🔐 Security

- JWT Authentication
- Row Level Security (Supabase)
- Per-store data isolation
- Audit logging

## 📄 License

MIT License - Bebas digunakan untuk komersial dan personal.

---

Made with ❤️ for Indonesian UMKM
