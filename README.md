# 🔔 Reminder App

A browser-based reminder app that lets you create, manage, and get notified about tasks — including **hands-free voice input** powered by the Web Speech API.

## Features

- **🎙️ Voice-to-reminder input** — Click the mic button and speak naturally (e.g. *"remind me to call mom tomorrow at 5 pm"*). The app parses the spoken date, time, and task title automatically using the browser's built-in `SpeechRecognition` API.
- **⚠️ Conflict detection** — If a new reminder clashes with an existing one at the same date and time, the app prompts you to either overwrite or cancel instead of silently double-booking.
- **👤 Per-user storage** — Simple User ID login system that keeps each user's reminders separate, persisted locally via `localStorage`.
- **🔔 Live notifications** — Reminders trigger an on-screen popup and a notification sound when they're due, without needing a page refresh.
- **✏️ Full CRUD** — Add, edit, and delete reminders through a clean card-based UI.

## Tech Stack

- **HTML5 / CSS3** — structure and styling
- **Vanilla JavaScript** — all app logic, no frameworks
- **Web Speech API** (`SpeechRecognition` / `webkitSpeechRecognition`) — voice capture and transcription
- **localStorage** — client-side persistence per user
- **Font Awesome** — icons

## How Voice Input Works

1. Click the microphone button next to "Add Reminder"
2. Speak your reminder naturally — the app listens via the browser's native speech recognition
3. The transcript is parsed to extract a **title**, **date**, and **time** using custom natural-language parsing logic
4. If no conflicting reminder exists, it's added instantly; otherwise you're prompted to confirm

> Note: Voice input requires a browser that supports the Web Speech API (Chrome/Edge recommended). The mic button auto-hides on unsupported browsers.

## Getting Started

1. Clone the repo:
   ```bash
   git clone https://github.com/shubhamk2729/task_manager.git
   ```
2. Open `index.html` in your browser (Chrome or Edge recommended for voice support)
3. Enter a User ID to log in and start adding reminders

No build step, no dependencies to install — it runs entirely in the browser.

## Project Structure

```
task_manager/
├── index.html      # App layout & modals
├── script.js       # App logic, voice parsing, reminder scheduling
└── styles.css       # Styling
```

## Future Improvements

- Sync reminders across devices instead of local-only storage
- Recurring reminders (daily/weekly)
- Improve natural-language date parsing for more phrasing variations

---
Built by [Shubham Krishna](https://github.com/shubhamk2729)
