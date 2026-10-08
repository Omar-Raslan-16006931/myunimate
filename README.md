<div align="center">

<img src=".github/assets/banner.svg" width="100%" alt="UniMate"/>

<img src="https://img.shields.io/github/languages/top/Omar-Raslan-16006931/myunimate?style=for-the-badge&color=0ea5e9" alt="Top language"/>

<br/><br/>

<img src="https://skillicons.dev/icons?i=react,ts,vite,tailwind,supabase,githubactions,apple&theme=dark" alt="Tech stack"/>

</div>

---

An all-in-one app for university students: schedule, courses, grades, to-dos, study materials, an AI assistant and a gym tracker. It also syncs with the GIU student portal.

## ✨ Features

- **Schedule:** weekly timetable with custom periods and event types, calendar sync, and smart import from an image or PDF
- **Student portal sync:** a Supabase Edge Function logs into the university portal (NTLM auth) every 10 minutes and pulls grades, attendance and exam seats
- **Push alerts** for new grades, attendance changes and exam seats (via ntfy), even when the app is closed
- **Courses and grades:** a universal grade calculator for each course
- **AI assistant** (Gemini) that runs server-side through a Supabase Edge Function
- **Materials:** in-app PDF viewer
- **To-do list** and reminders with local notifications
- **Gym tracker:** workouts, nutrition logging, body logs and progress analysis
- **iOS app** via Capacitor, built as an IPA by GitHub Actions; also installable as a PWA

## 🛠️ Tech stack

React, TypeScript, Vite, Tailwind, Framer Motion, Supabase (Postgres, Auth, Edge Functions, cron), Google Gemini, Capacitor (iOS), GitHub Actions

## 🚀 Getting started

```bash
npm install
cp .env.example .env    # Supabase URL + publishable key
npm run dev
```

Edge Functions live in `supabase/functions/` (`portal-sync`, `ai-handler`). Deploy them with the Supabase CLI and set their secrets there; no API key is shipped to the browser.

---

<div align="center">

**Made with ❤️ by [Omar Raslan](https://github.com/Omar-Raslan-16006931)**

<img src=".github/assets/footer.svg" width="100%"/>

</div>
