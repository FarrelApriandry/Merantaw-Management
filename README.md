# 🚀 Meragement - [Rel Interesting Project](https://github.com/FarrelApriandry)

**Meragement** is a high-performance project management powerhouse designed to help teams streamline tasks, projects, and collaboration with zero friction. Built with a modern, cutting-edge stack for speed, scalability, and a top-tier user experience.

<!--[Explore the Code](#tech-stack) • [Getting Started](https://www.google.com/search?q=%23-getting-started) • [Key Features](https://www.google.com/search?q=%23-key-features) -->

---

## ✨ Key Features

* **🔐 Robust Authentication**: Secure user access powered by **Firebase Authentication** (Email/Password).
* **📊 Insightful Dashboard**: A high-level overview of project stats, active members, and pending tasks at a glance.
* **📂 Project Powerhouse**: Effortlessly create and manage projects with priority levels, detailed descriptions, and team assignments.
* **👥 Team Orchestration**: Build your dream team, assign members, and define roles (Admin/Member) with ease.
* **⚡ Sleek Navigation**: A dynamic, collapsible sidebar for seamless transitions between Home, Inbox, Teams, Milestones, and more.
* **🌌 Project Spaces**: Stay organized with dedicated spaces. featuring specialized Dashboards, Task boards, and Discussion hubs.
* **🎨 Modern UX/UI**: A stunning, responsive interface crafted with **Tailwind CSS**, **Shadcn UI**, and fluid animations via **Framer Motion**.
* **🔔 Instant Feedback**: Real-time user feedback using **Sonner** toast notifications.
* **🛡️ Route Protection**: Secure architecture where dashboard access is restricted to authenticated users, and sensitive forms are Admin-only.

---

## 💻 Tech Stack

| Technology | Purpose |
| --- | --- |
| **[Astro](https://astro.build/)** | Modern Web Framework (Island Architecture) |
| **[React](https://react.dev/)** | Dynamic UI Components |
| **[Firebase](https://firebase.google.com/)** | Auth & Firestore NoSQL Database |
| **[Tailwind CSS](https://tailwindcss.com/)** | Utility-First Styling |
| **[Shadcn UI](https://ui.shadcn.com/)** | Reusable Component System |
| **[Framer Motion](https://www.framer.com/motion/)** | Smooth UI Animations |
| **[Lucide React](https://lucide.dev/)** | Beautifully Simple Icons |

---

## 🚀 Getting Started

Follow these steps:

### 1. Clone the Repository

```bash
git clone https://github.com/farrelapriandry/merantaw-management.git
cd merantaw-management/meragement

```

### 2. Install Dependencies

```bash
npm install
# or
pnpm install
# or
yarn install

```

### 3. Firebase Configuration

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Authentication** (Email/Password) and **Firestore Database**.
3. Create a `.env` file in the root directory and populate it with your credentials:

```env
PUBLIC_FIREBASE_API_KEY=your_api_key
PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
PUBLIC_FIREBASE_PROJECT_ID=your_project_id
PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
PUBLIC_FIREBASE_APP_ID=your_app_id
PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

```

> **Note:** Keep your secrets safe. Ensure `.env` is listed in your `.gitignore`.

### 4. Run Development Server

```bash
npm run dev

```

Your app will be live at `http://localhost:4321`.

---

## 🛠️ Scripts

* `npm run build` — Production-ready build in `./dist/`.
* `npm run preview` — Locally preview the production build.
* `npm run astro -- --help` — Get help with the Astro CLI.

---

## 📁 Project Structure

```text
meragement/
├── public/          # Static assets (Logos, Icons)
├── src/
│   ├── components/  # React Components (.jsx, .tsx)
│   │   ├── auth/    # Login & Auth Guards
│   │   ├── dashboard/# Cards & Statistics
│   │   ├── forms/   # Add User/Team/Project forms
│   │   ├── layout/  # Sidebar, Navbar, Content Wrappers
│   │   └── ui/      # Shadcn UI primitives
│   ├── layouts/     # Astro Layouts (Dashboard, Auth)
│   ├── lib/         # Logic & Config
│   │   ├── api/     # Firestore CRUD functions
│   │   └── firebaseConfig.js
│   ├── pages/       # File-based Routing
│   └── styles/      # Global CSS & Tailwind imports
└── astro.config.mjs # Astro Configuration

```

---

Developed by [Rel](https://github.com/farrelapriandry)
