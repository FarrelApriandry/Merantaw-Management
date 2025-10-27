# Meragement

Meragement adalah aplikasi manajemen proyek yang dibangun untuk membantu tim mengelola tugas, proyek, dan kolaborasi secara efisien. Dibangun dengan Astro, React, dan Firebase.

## ✨ Fitur Utama

* **Autentikasi Pengguna**: Login aman menggunakan Firebase Authentication.
* **Dashboard**: Tampilan ringkasan statistik proyek, anggota aktif, dan tugas.
* **Manajemen Proyek**: Menambah dan mengelola proyek, termasuk deskripsi, prioritas, dan tim yang ditugaskan.
* **Manajemen Tim**: Membuat tim, menambahkan anggota, dan menentukan peran.
* **Manajemen Pengguna**: Menambah pengguna baru dengan peran tertentu (Admin/Member).
* **Navigasi Sidebar**: Sidebar dinamis dan dapat diciutkan untuk navigasi mudah antar modul seperti Home, Inbox, Teams, Forms, Calendar, Milestone, Discussion, dan Spaces proyek.
* **Spaces Proyek**: Organisasi proyek berdasarkan kategori (NPB, AR, MOLE, DND) dengan sub-menu Dashboard Project, Task, dan Discussion.
* **UI Modern**: Antarmuka pengguna yang menarik dan responsif menggunakan Tailwind CSS, Shadcn UI, dan Framer Motion.
* **Notifikasi Toast**: Umpan balik instan untuk aksi pengguna menggunakan Sonner.
* **Perlindungan Rute**: Rute dashboard dilindungi dan memerlukan login. Rute Form hanya dapat diakses oleh admin.

## 💻 Tumpukan Teknologi

* **Framework**: [Astro](https://astro.build/)
* **UI Library**: [React](https://react.dev/) (dengan integrasi Astro)
* **Backend & Database**: [Firebase](https://firebase.google.com/) (Authentication, Firestore)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Komponen UI**: [Shadcn UI](https://ui.shadcn.com/)
* **Animasi**: [Framer Motion](https://www.framer.com/motion/)
* **Notifikasi**: [Sonner](https://sonner.emilkowal.ski/)
* **Ikon**: [Lucide React](https://lucide.dev/)

## 🚀 Memulai

1.  **Clone repositori:**
    ```bash
    git clone [https://github.com/farrelapriandry/merantaw-management.git](https://github.com/farrelapriandry/merantaw-management.git)
    cd merantaw-management/meragement
    ```

2.  **Instal dependensi:**
    ```bash
    npm install
    # atau
    yarn install
    # atau
    pnpm install
    ```
    *Perintah ini terdapat pada README.md bawaan Astro.*

3.  **Konfigurasi Firebase:**
    * Buat proyek Firebase di [https://console.firebase.google.com/](https://console.firebase.google.com/).
    * Aktifkan **Authentication** (Metode Email/Password).
    * Aktifkan **Firestore Database**.
    * Buat file `.env` di direktori `meragement/` dan salin variabel dari `src/lib/firebaseConfig.js`, lalu isi dengan kredensial Firebase Anda:
        ```env
        PUBLIC_FIREBASE_API_KEY=xxx
        PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
        PUBLIC_FIREBASE_PROJECT_ID=xxx
        PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
        PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
        PUBLIC_FIREBASE_APP_ID=xxx
        PUBLIC_FIREBASE_MEASUREMENT_ID=xxx
        ```
    * Pastikan file `.env` ada dalam `.gitignore` Anda.

4.  **Jalankan server pengembangan:**
    ```bash
    npm run dev
    ```
    *Server akan berjalan di `http://localhost:4321`.*

5.  **Buka aplikasi:**
    Buka `http://localhost:4321` di browser Anda. Anda akan diarahkan ke halaman login.

## 🛠️ Perintah Lainnya

* **Build**: `npm run build` (Membangun situs produksi ke `./dist/`)
* **Preview**: `npm run preview` (Pratinjau build produksi secara lokal)
* **Astro CLI**: `npm run astro -- --help` (Bantuan untuk perintah Astro CLI)

## 📁 Struktur Proyek (Ringkasan)
meragement/ 
├── public/ # Aset statis (misal: LogoMTW.svg) 
├── src/ 
│ ├── components/ # Komponen React (.jsx, .tsx) 
│ │ ├── auth/ # Komponen terkait autentikasi (LoginForm, AuthProtector, dll.) 
│ │ ├── dashboard/ # Komponen spesifik dashboard (StatCard, ProjectCard, TaskCard) 
│ │ ├── forms/ # Komponen form (AddUserForm, AddTeamForm, AddProjectForm) 
│ │ ├── layout/ # Komponen tata letak (Sidebar, Navbar, DashboardContent, dll.) 
│ │ └── ui/ # Komponen UI (Button, Card, Input, Select, dll.) - Shadcn UI 
│ ├── layouts/ # Tata letak Astro (.astro) (DashboardLayout, AuthLayout) 
│ ├── lib/ # Utilitas dan konfigurasi 
│ │ ├── api/ # Fungsi API Firestore (users, teams, projects) 
│ │ ├── firebaseConfig.js # Konfigurasi Firebase 
│ │ └── utils.ts # Fungsi utilitas (misal: cn) 
│ ├── pages/ # Halaman/Rute Astro (.astro) 
│ │ ├── auth/ # Halaman autentikasi (login.astro) 
│ │ ├── dashboard/ # Halaman dashboard (index.astro, forms.astro) 
│ │ └── index.astro # Halaman utama (redirect ke login) 
│ └── styles/ # Styling global (global.css) 
├── astro.config.mjs # Konfigurasi Astro 
├── package.json # Dependensi dan skrip proyek 
├── tailwind.config.mjs # (Implied) Konfigurasi Tailwind CSS 
└── tsconfig.json # Konfigurasi TypeScript
