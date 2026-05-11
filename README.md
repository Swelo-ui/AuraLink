# AuraLink

**Real-time messaging and collaboration platform for students.**

Chat, Connect, Closer — AuraLink combines instant messaging, AI assistance, collaborative notes, file storage, and task management into a single PWA optimized for both Android and desktop.

## Features

- **Real-time Chat** — Instant messaging with presence indicators, typing detection, and mood-aware avatars
- **AuraBot AI** — Built-in AI assistant powered by LLMs for study help, note refinement, and task management
- **SyncNotes** — Collaborative rich-text editor with real-time sync between connected users
- **SmartVault** — File storage with folder organization, preview, and Telegram-backed cloud storage
- **Shared Timetable** — Task/study session management with progress tracking
- **ActionMoji Avatars** — Expressive animated avatars that reflect user mood and activity
- **Push Notifications** — Background notifications via Web Push API
- **PWA** — Installable on Android/iOS/Desktop with offline support

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 6 |
| Styling | Tailwind CSS 4, Motion (Framer Motion) |
| State | Zustand |
| Backend | Supabase (Auth, Database, Realtime, Edge Functions) |
| File Storage | Telegram Bot API |
| Rich Text | TipTap |
| PWA | vite-plugin-pwa, Workbox |

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project
- A Telegram Bot (for file storage)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Fill in your credentials in `.env.local`
5. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `VITE_TG_BOT_TOKEN` | Telegram Bot token for file uploads |
| `VITE_TG_CHAT_ID` | Telegram chat ID for file storage |
| `VITE_VAPID_PUBLIC_KEY` | VAPID public key for push notifications |

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── ActionMojiAvatar.tsx    # Animated mood avatars
│   ├── ErrorBoundary.tsx       # Error handling
│   ├── GlobalNotificationListener.tsx
│   ├── LoadingScreen.tsx       # Loading states
│   ├── PullToRefresh.tsx       # Mobile gesture
│   ├── SharedTimetable.tsx     # Task management
│   ├── Sidebar.tsx             # Navigation
│   ├── SmartVault.tsx          # File manager
│   ├── SocketProvider.tsx      # Realtime presence
│   ├── SyncNotes.tsx           # Rich text editor
│   └── Toast.tsx               # Notification toasts
├── hooks/            # Custom React hooks
├── lib/              # Utilities and services
├── pages/            # Route-level components
├── store/            # Zustand state management
└── types/            # TypeScript type definitions
```

## Security

- Row Level Security (RLS) enabled on all tables
- Supabase Auth with session management
- Client-side input validation
- API keys kept server-side via Edge Functions
- VAPID-based push notification authentication

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run tests |

## License

Private — All rights reserved.
