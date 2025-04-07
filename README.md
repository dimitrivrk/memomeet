# 🧠 Memomeet

**Memomeet** is your personal AI meeting assistant — it listens, transcribes, summarizes, and generates actionable to-do lists from your meetings.  
Powered by OpenAI’s Whisper & GPT APIs, Memomeet turns your unstructured audio chaos into clean, organized follow-ups.

Built with ❤️ by [Dimitri VRK](https://github.com/dimitrivrk) — dev, builder, slightly caffeinated human.

---

## 🚀 Features

- 🎙️ Upload any meeting audio (`.mp3`, `.wav`, etc.)
- ✍️ Whisper-powered **speech-to-text transcription**
- 🧠 GPT-generated **summaries** and **action items**
- 📋 Interactive **to-do list** (add/edit/delete tasks)
- 📜 Full **meeting history**, editable by the user
- 🪙 Built-in **credit system**: 3 free credits per user, then Stripe-powered upgrades
- 🔐 Google Login with **NextAuth**
- 📊 Dashboard for all your past meetings and tasks

---

## 🛠 Tech Stack

| Frontend        | Backend           | AI Services         | Other               |
|-----------------|-------------------|----------------------|----------------------|
| Next.js (App Router) | API Routes via Next.js | OpenAI Whisper API   | TailwindCSS          |
| TypeScript       | Prisma + PostgreSQL | OpenAI GPT-4 API     | Stripe (payments)    |
| NextAuth (Google) | Zod (validation) |                     | Vercel (deployment)  |

---

## ⚙️ Installation

```bash
git clone https://github.com/dimitrivrk/memomeet.git
cd memomeet
npm install
