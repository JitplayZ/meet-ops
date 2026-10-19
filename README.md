# 📅 MeetOps

> **The Centralized Workplace Meeting & Room Operations Platform.**

---

## 🚀 Hero Description

**MeetOps** is a modern, production-grade workplace operations SaaS platform designed to help organizations manage meeting rooms, prevent scheduling conflicts, and streamline meeting workflows through a centralized booking system. Built with scalability and user experience in mind, it provides a seamless interface for teams to collaborate without the friction of double-bookings or lost schedules.

---

## 🔗 Live Demo
[**View Live Application (Placeholder)**](https://meet-ops-orcin.vercel.app)

---

## 🎯 Core Purpose

In fast-paced startups and coworking environments, meeting room conflicts cause significant productivity losses. MeetOps solves this real-world problem by providing:
- Absolute prevention of double-bookings.
- Clear, real-time visibility into room availability.
- A structured approval workflow for high-demand resources.

---

## 🏆 Product Context

MeetOps was developed **solo** as a submission for the **TestSprite Hackathon**. The project demonstrates a complete, end-to-end SaaS architecture with integrated AI testing, robust authentication, and complex data relations.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **Authentication System** | Secure login, registration, and session management via Supabase. |
| **Protected Dashboard** | Personalized view of upcoming meetings and pending approvals. |
| **Room Management** | Create, edit, and manage physical or virtual meeting spaces. |
| **Meeting Scheduling** | Intuitive booking system with instant availability checking. |
| **Conflict Detection** | Smart validation prevents overlapping bookings for the same room. |
| **Approval Workflow** | Admin controls for reviewing, approving, or declining requests. |
| **Meeting Calendar** | Visual monthly and weekly grid of all organizational events. |
| **Role-Based Access** | Strict distinction and permissions between Users and Admins. |
| **Lifecycle Tracking** | Automated transition of meetings from Pending → Approved → Completed. |
| **Search & Filtering** | Find meetings instantly by title, room, or specific date. |
| **Activity Dashboard** | Real-time metrics and summary cards for account activity. |

---

## 🛠️ Tech Stack

| Technology | Version | Usage |
| :--- | :--- | :--- |
| **React + Vite** | React 19 / Vite 6 | Frontend framework and blazing-fast build tool. |
| **TypeScript** | ~5.7 | End-to-end type safety and developer experience. |
| **TailwindCSS** | v4 (`@tailwindcss/vite`) | Utility-first CSS powering the responsive dark SaaS UI. |
| **Supabase** | `supabase-js` v2 | Backend-as-a-service for Auth, PostgreSQL, and storage. |
| **PostgreSQL + RLS** | — | Relational data with Row Level Security so users only see their own rows. |
| **Google Gemini** | `@google/generative-ai` v0.24 | AI booking assistant with function-calling (`getRooms` / `bookRoom`) and a rule-based fallback. |
| **React Router DOM** | v7 | Client-side routing with protected route guards. |
| **React Hook Form + Zod** | — | Form state and schema validation for booking/auth flows. |
| **date-fns** | v4 | Time/date math for the calendar grid, conflict windows, and lifecycle transitions. |
| **lucide-react** | — | Icon set used across the UI. |
| **TestSprite Web** | — | AI-driven automated end-to-end testing run against the live deployed app. |

---

## 📂 Project Structure

```text
meetops/
├── src/
│   ├── components/
│   │   ├── layout/            # App shell: MainLayout, Sidebar, Topbar
│   │   ├── ChatBot.tsx        # Floating AI booking assistant (Gemini + fallback)
│   │   └── ProtectedRoute.tsx # Auth/role route guard
│   ├── contexts/              # AuthContext (session + logout), ThemeContext (dark/light)
│   ├── lib/                   # supabase.ts client, timeout.ts helpers
│   ├── pages/                 # Route views: Landing, Login, Register, ResetPassword,
│   │                          #   Dashboard, Meetings, MeetingSchedule, Calendar,
│   │                          #   Rooms, Admin, Settings
│   ├── services/              # aiService, chatbotService, meetingService,
│   │                          #   roomService, notificationService (Supabase + Gemini calls)
│   ├── types/                 # Global TypeScript definitions
│   ├── App.tsx                # Route table
│   ├── index.css              # Tailwind v4 directives + design tokens
│   └── main.tsx               # Application entry point
├── stitch_meetops_enterprise_ai_redesign/  # UI/UX design references & screenshots
├── seed_e2e_data.js           # Provisions a deterministic E2E account + upcoming meetings
├── .env                       # Supabase + Gemini credentials
└── package.json               # Project dependencies & scripts
```

---

## 🛣️ Routes

**Public Routes**
- `/login` — User authentication portal.
- `/register` — New account creation.

**Private Routes (Protected)**
- `/dashboard` — Main activity and upcoming overview.
- `/meetings` — Filterable meeting list and history.
- `/meetings/new` — Meeting creation and scheduling wizard.
- `/calendar` — Visual grid view of all scheduled rooms.
- `/rooms` — Resource management (Admin only).
- `/admin` — Approval workflows and global oversight (Admin only).

---

## 🔌 API Connections

Interactions are handled directly via the Supabase client. Examples:
- `getMeetings()` — Fetches all organization meetings (Admin).
- `getUserMeetings(uid)` — Fetches meetings specific to the logged-in user.
- `createMeeting(data)` — Inserts a new booking request.
- `cancelMeeting(id)` — Cancels a booking with ownership validation.

---

## 🗄️ Database Structure

The PostgreSQL database utilizes strict Row Level Security (RLS) across 4 core tables:

- **`users`** — Extended profiles linking Auth models to application roles.
- **`rooms`** — Manageable physical spaces with capacity limits.
- **`meetings`** — The core entity containing timestamps, relations, and status enums.
- **`notifications`** — System alerts for status changes and approvals.

---

## ⚙️ Environment Variables

Create a `.env` file in the root directory. Example:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## 💻 Local Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   Create `.env` and configure your keys.

3. **Run dev server:**
   ```bash
   npm run dev
   ```

---

## 🧪 Testing

MeetOps is tested with **TestSprite Web**, which drives a real browser against the **live deployed application** for comprehensive, AI-generated end-to-end testing.

Before running the suite, provision deterministic data so the "signed-in" flows have fresh, non-conflicting future bookings to assert against:

```bash
node seed_e2e_data.js   # creates e2e.robot@resourceflow.test + upcoming meetings (idempotent)
```

### Season 4 — TestSprite findings & fixes

The TestSprite Web run surfaced six concrete user-flow failures. Each was root-caused and fixed:

| # | Failing flow | What we observed | Root cause | Fix |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Filter meetings by room and date** | The Meeting Calendar mockup showed non-interactive labels; a DOM scan found no buttons/selects to filter with. | UI bug — the Landing demo panel and the in-app Calendar filters were static / not wired. | Rebuilt the Landing demo card with real `<button>` room-type + day filters that drive a live meeting list, and wired the Calendar's Smart Filters (room type by capacity, floor select, new date input) to actually filter the grid. |
| 2 | **User books a meeting from the AI assistant** | `"Sorry, I encountered an error: Chat session not initialized. API key might be missing."` | Init race — the chat session was created in a `useEffect`; typing before it resolved (or a null session) threw with no fallback. | `ChatBot` now lazily awaits a memoized session (`ensureChatSession`) and falls back to the rule-based `chatbotService` whenever Gemini returns nothing/errors. `aiService`/`chatbotService` guard against a missing key instead of crashing. |
| 3 | **Admin logs out after using the calendar** | After Logout the page showed the `/login` "Welcome back" form instead of the public homepage `/`. | Race — `logout()` set `user=null`, so the still-mounted `ProtectedRoute` fired `<Navigate to="/login">`, overriding the redirect. | Added a synchronous `isLoggingOut()` ref that suppresses the guard redirect, and `Sidebar.handleLogout` now hard-navigates to `/` via `window.location.assign('/')` after sign-out. |
| 4 | **Book a room through quick booking** | The submitted booking (e.g. `"E2E Test Booking"`) was never found — searches returned 0 matches. | Not a persistence bug — inserts work; the test used a **past** date, so the booking fell out of the Upcoming tab and the Mon–Fri calendar grid. | Added past-date + required-title validation on the booking form, and made Meetings' room/date/search filters query the full dataset so a just-created booking is always findable. |
| 5 | **User schedules a meeting from the calendar view** | A booking conflict was shown when scheduling a slot that was already taken. | Environment — stale seeded data already held that exact slot. | `createMeeting` now runs `findNextFreeSlot()` and returns an actionable `"Next available slot: …"` suggestion instead of a bare conflict error. |
| 6 | **Open meetings list after signing in** | `"Upcoming (0)"` / "No upcoming meetings found". | Environment — the signed-in test account had zero meetings. | `seed_e2e_data.js` provisions a deterministic account with three future-dated, non-conflicting meetings so the list has data to assert. |

After the fixes, `npm run build` passes cleanly and every named flow was re-verified end-to-end in the browser (filters update, assistant replies without error, logout lands on `/`, quick booking appears under Upcoming, and the meetings list is populated).

---

## 🚢 Production Commands

**Build the application:**
```bash
npm run build
```

**Start the preview server:**
```bash
npm run preview
```

---

## 🔒 Security Notes

- **Auth Protection**: Internal routes require active sessions.
- **Role Enforcement**: Administrator-only paths (Admin Approvals, Room Creation) enforce role verification at the component and database level.
- **Meeting Permissions**: Users are strictly limited to canceling/modifying their own generated bookings, validated across the stack.

---

## 🔄 Meeting Workflow Summary

1. **Create Meeting**: A user selects a room and specifies a requested time block.
2. **Conflict Validation**: MeetOps verifies real-time that no conflicting meeting holds that slot.
3. **Approval**: Bookings enter an initial `Pending` state for administrators to `Approve` or `Decline`.
4. **Lifecycle**: Upon passing the meeting's scheduled end time, active bookings gracefully transition to `Completed`.

---

## 🚧 Current Constraints

- No recurring meetings yet.
- Email notifications not implemented.

---

## 👨‍💻 Author

Built **solo** for the TestSprite Hackathon.

---

## 📜 License

MIT License.
