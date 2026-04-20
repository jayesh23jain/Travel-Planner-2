# 🌍 JourneyOS — Stress-Free Travel Optimizer

A production-level React application with Firebase backend, Three.js 3D globe,
Framer Motion animations, and drag-and-drop itinerary builder.

---

## ⚡ Quick Start (3 steps)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure Firebase
Open `.env.local` and replace the placeholder values:
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```
Get these from: https://firebase.google.com → Your Project → Project Settings

### 3. Create Firebase collections
Go to your Firebase Console → Firestore Database and create these collections:
- `users` — User profiles
- `trips` — User trips
- `itinerary` — Daily itinerary items
- `checklist_items` — Packing checklist items
- `expenses` — Budget expenses
- `transport_options` — Transport options
- `documents` — Document storage metadata

### 4. Start the dev server
```bash
npm run dev
```

Open http://localhost:5173 → Sign up → Start planning!

---

## 📦 Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| UI Framework | React 18 (Functional + Hooks)       |
| Routing      | React Router DOM v6                 |
| State        | Context API + useReducer            |
| Styling      | Tailwind CSS v3                     |
| Animation    | Framer Motion v11                   |
| 3D Globe     | React Three Fiber + Three.js        |
| Drag & Drop  | dnd-kit                             |
| Charts       | Recharts                            |
| Backend      | Firebase (Auth + Firestore + Storage)      |
| Build Tool   | Vite                                |

---

## 🗂️ Folder Structure

```
src/
├── app/          # App.jsx — router + Suspense
├── pages/        # All page components
├── components/   # Reusable UI, layout, globe
├── context/      # AuthContext, TripContext
├── hooks/        # Custom hooks
├── lib/          # Firebase client
└── index.jsx     # Entry point
```

---

## 🎯 Features

- **Multi-Modal Transport Engine** — Flight/Train/Bus comparison
- **Drag-and-Drop Itinerary** — dnd-kit daily timeline
- **Smart Checklist** — Weather-aware + document vault with useRef
- **Burn Rate Tracker** — Recharts with useMemo optimisation
- **In-Trip Radar** — Geolocation-based essentials finder
- **3D Interactive Globe** — React Three Fiber (lazy-loaded)
- **Glassmorphic UI** — Framer Motion + animated gradient backgrounds
- **Firebase Auth** — Sign up / Sign in / Firestore protected data
