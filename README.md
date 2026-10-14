# Smart Co-Working Space Management Using Real-Time Monitoring

Starter project — Milestone 1 (Project Foundation).

## What's included

- **backend/** — Express + MongoDB (Mongoose) API
  - `GET /api/test` — health check route
  - `POST /api/auth/register` — create a user (hashed password, JWT issued)
  - `POST /api/auth/login` — log in, receive JWT
  - `GET /api/auth/profile` — protected route, requires `Authorization: Bearer <token>`
  - `models/User.js`, `models/Workspace.js` — core schemas
  - `middleware/authMiddleware.js` — `protect` (JWT check) and `authorize(...roles)` (role check)
- **frontend/** — React (Vite) app that calls `/api/test` on load to prove the
  full chain (React → Express → confirms server is reachable) works.

## How to run it

### 1. Backend

```bash
cd backend
npm install          # already done if you unzipped this as-is
```

Copy `.env.example` to `.env` and fill in real values:

```bash
cp .env.example .env
```

Then edit `.env`:
- `MONGO_URI` — get this from MongoDB Atlas (Database → Connect → Drivers).
  Create a free cluster if you haven't yet.
- `JWT_SECRET` — any long random string (e.g. generate one with
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

Start the server:

```bash
npx nodemon server.js
```

You should see:
```
MongoDB connected: <your-cluster-host>
Server running on port 5000
```

Test it: open http://localhost:5000/api/test in your browser — you should see
`{"message":"Smart Co-Working API is running"}`.

### 2. Frontend

In a **separate terminal**:

```bash
cd frontend
npm install           # already done if you unzipped this as-is
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). You should see a
green "Smart Co-Working API is running" status — that confirms React,
Express, and (once you've added your Mongo URI) MongoDB are all connected.

## Testing auth routes (with Postman/Thunder Client, before UI exists)

**Register:**
```
POST http://localhost:5000/api/auth/register
Body (JSON):
{
  "name": "Nikhil",
  "email": "nikhil@example.com",
  "password": "test1234",
  "role": "user"
}
```

**Login:**
```
POST http://localhost:5000/api/auth/login
Body (JSON):
{
  "email": "nikhil@example.com",
  "password": "test1234"
}
```
Copy the `token` from the response.

**Get profile (protected):**
```
GET http://localhost:5000/api/auth/profile
Header: Authorization: Bearer <paste token here>
```

## Workspace routes (new)

- `GET /api/workspaces` — public. Lists approved workspaces. Supports query
  filters: `?location=Bhubaneswar&minCapacity=10&maxPrice=1000&workspaceType=shared_desk&amenities=wifi,parking`
- `GET /api/workspaces/:id` — public. Single workspace details.
- `GET /api/workspaces/mine/list` — owner/admin only. Your own workspaces
  (including pending/rejected ones).
- `GET /api/workspaces/admin/all` — **admin only**. Every workspace from
  every owner, any status, with owner name/email populated. Supports
  `?status=pending`.
- `POST /api/workspaces` — owner/admin only. Creates a workspace. Owner
  submissions start as `pending`; admin submissions start `approved`.
- `PUT /api/workspaces/:id` — owner (of that workspace) or admin only.
- `DELETE /api/workspaces/:id` — owner (of that workspace) or admin only.
- `PATCH /api/workspaces/:id/occupancy` — owner/admin only. Updates the live
  `occupied` count (this is the hook Socket.IO real-time monitoring will
  call into later).

**Testing in Postman:** register a user with `"role": "owner"`, log in, copy
the token, then use it as `Authorization: Bearer <token>` on the `POST
/api/workspaces` request. Example body:

```json
{
  "name": "TechHub Coworking",
  "location": "Bhubaneswar",
  "area": 1500,
  "capacity": 50,
  "workspaceType": "shared_desk",
  "price": 500,
  "amenities": ["wifi", "parking", "cafeteria"]
}
```

## Frontend pages (new)

- `/` — **Home**: public list of approved workspaces, pulled live from
  `GET /api/workspaces`.
- `/register` — create an account as `user` or `owner`.
- `/login` — log in; JWT + user info are stored in `localStorage` and kept
  in React context (`src/context/AuthContext.jsx`) for the whole session.
- `/add-workspace` — **protected**, only visible/reachable if logged in as
  `owner` or `admin` (enforced by `src/components/ProtectedRoute.jsx`, which
  redirects to `/login` or `/` otherwise). Submits to
  `POST /api/workspaces`, then redirects to `/my-workspaces`.
- `/my-workspaces` — **protected** (owner/admin). Shows **all** of your own
  workspaces regardless of status — pending, approved, or rejected — with a
  status badge and delete option. This is the page to check when a new
  submission "seems to disappear": it's almost always sitting here as
  `pending`, since new owner submissions don't appear on the public `/` page
  until an admin approves them.
- `/admin/workspaces` — **protected, admin only**. Approve, reject, or
  delete any workspace from any owner, with filter tabs by status. This is
  the click-instead-of-Postman way to approve listings (see below).

The navbar (`src/components/Navbar.jsx`) shows different links depending on
whether you're logged out, logged in as a user, or logged in as an
owner/admin.

**To try it end to end:**
1. Run both `backend` (`npm run dev`) and `frontend` (`npm run dev`).
2. Go to `/register`, sign up as **owner**.
3. Go to `/add-workspace`, submit a listing — you'll be redirected to
   `/my-workspaces` and see it there with a "Pending approval" badge.
4. It won't show on `/` yet. Register a second account as **admin**, log in
   as that admin, go to "Admin approvals" in the navbar (`/admin/workspaces`),
   and click **Approve** on the listing.
5. Refresh `/my-workspaces` (as the owner) — badge now says "Approved".
   Refresh `/` — the workspace now appears there too.

## Booking system (new)

**Backend routes** (`backend/routes/bookingRoutes.js`):

| Method | Route | Access | Notes |
|---|---|---|---|
| GET | `/api/bookings/availability?workspaceId=&date=` | public | Returns capacity, already-booked count, and remaining seats for that date. |
| POST | `/api/bookings` | user | Creates a `pending` request. Rejected with `409` if it would exceed remaining capacity for that date. |
| GET | `/api/bookings/mine` | user | Their own booking requests, any status. |
| PATCH | `/api/bookings/:id/cancel` | user (own booking) | Cancels a pending or approved booking. |
| GET | `/api/bookings/owner?status=pending` | owner, admin | Booking requests for the owner's workspaces (admin sees all). `status` filter optional. |
| PATCH | `/api/bookings/:id/approve` | owner (of that workspace), admin | Re-checks capacity at approval time in case other requests filled it since. |
| PATCH | `/api/bookings/:id/reject` | owner (of that workspace), admin | |

Capacity is enforced by summing `numberOfPeople` across all `pending` +
`approved` bookings for a workspace on a given date, so overbooking is
blocked both at request time and at approval time.

**Frontend pages:**
- `/workspaces/:id` — workspace detail page with a booking request form;
  shows live remaining capacity as you pick a date.
- `/my-bookings` — a logged-in **user's** own bookings, with a Cancel
  button on pending/approved ones. Linked from the navbar.
- `/booking-requests` — an **owner's** (or admin's) view of requests for
  their workspaces, with **Approve** / **Reject** buttons and a status
  filter tab bar. Linked from the navbar.

**To try the full booking flow:**
1. As a **user**, go to a workspace's detail page, pick a date/time/people,
   and submit a request.
2. Log in as the **owner** of that workspace, go to "Booking requests" —
   the request appears under the Pending tab.
3. Click **Approve** (or **Reject**).
4. Log back in as the user and check "My bookings" — the status has
   updated.
5. Try requesting more people than the workspace has remaining capacity for
   that date — you should get a clear error instead of it silently
   succeeding.

## Search & smart matching (new)

**Backend:**
- `GET /api/workspaces` — plain filter search (unchanged): `?location=&minCapacity=&maxPrice=&workspaceType=&amenities=wifi,parking`. Returns only workspaces that meet every filter, no ranking.
- `GET /api/workspaces/match` — **weighted smart matching** (new): `?numberOfPeople=&area=&budget=&location=&workspaceType=&amenities=wifi,parking`. Returns *every* approved workspace (except a hard `workspaceType` filter if given) with a `matchScore` (0–100), sorted best-match-first.

Weights: capacity 25%, area 20%, budget 20%, location 20%, amenities 15%.
Each factor gives full credit if the workspace meets/beats what you asked
for, partial credit if it's close but short (e.g. a workspace with 8 seats
against a 10-person request scores 0.8 on capacity, not 0), and no penalty
on any factor you didn't specify.

**Frontend:** the Home page (`/`) now has a search bar — location, people,
area, budget, type, and amenity checkboxes. Leaving everything blank and
clicking "Show all" behaves as before. Filling in anything switches to
smart-match mode: results are sorted by match score and each card shows a
"NN% match" badge.

**To try it:** with a few approved workspaces of different sizes/prices/
locations in your database, search for "10 people, ₹1000 budget,
Bhubaneswar, wifi+parking" and confirm the best-fitting workspace sorts to
the top with the highest match percentage.

## Real-time occupancy monitoring (new)

This is the feature your project is named after — Socket.IO pushes live
occupancy changes to anyone watching a workspace, no page refresh needed.

**Backend (`server.js`):**
- Express and Socket.IO now share one HTTP server. Clients join a "room"
  per workspace (`workspace_<id>`) so updates for one workspace never leak
  to someone watching a different one.
- The existing `PATCH /api/workspaces/:id/occupancy` route now also
  broadcasts an `occupancyUpdate` event to that workspace's room every time
  it's called — the REST call and the real-time push happen together, from
  one action.

**Frontend:**
- `src/services/socket.js` — one shared Socket.IO client connection for the
  whole app.
- `src/hooks/useWorkspaceOccupancy.js` — a hook that joins/leaves a
  workspace's room and keeps `{ occupied, capacity, available }` live.
- **`/workspaces/:id`** (public detail page) now shows a live occupancy bar
  with a pulsing "live" indicator — updates instantly if the owner changes
  occupancy while you're looking at the page.
- **`/live-monitor`** (new, owner/admin only) — a control panel listing all
  your *approved* workspaces with a live occupancy bar each, plus
  **"+ Check in" / "− Check out"** buttons that simulate people
  arriving/leaving. Pressing a button calls the occupancy route, which
  broadcasts the update to every viewer — including the public detail page,
  if someone has it open at the same time.

**To try it (best with two browser windows/tabs side by side):**
1. Window A: log in as the workspace's owner, go to `/live-monitor`.
2. Window B: open that same workspace's public page at `/workspaces/:id`
   (logged out or as a different user is fine).
3. In Window A, click **"+ Check in"** a few times.
4. Watch Window B's occupancy bar and numbers update immediately, with no
   refresh — that's the real-time monitoring working end to end.

**Note:** this was built and boot-tested in a sandboxed environment without
access to a real MongoDB instance, so the Socket.IO connection/room-joining
mechanics were verified directly, but the full round trip (owner clicks →
database saves → broadcast fires) should be your first thing to confirm
once you run it locally with your Atlas connection active.

## Dashboards (new)

A single **`/dashboard`** route renders the right summary view based on
who's logged in — linked from the navbar for any logged-in user, and set
as the landing page right after login/register.

**Backend (`/api/stats/*`):**
- `GET /api/stats/user` — booking counts by status, plus your next
  approved upcoming booking.
- `GET /api/stats/owner` — workspace counts by status, booking counts by
  status, today's bookings, and aggregate occupancy (occupied/capacity
  summed across all your approved workspaces).
- `GET /api/stats/admin` — platform totals (users by role, workspaces by
  status, bookings), plus "new today" counts for each.

**Frontend:**
- **User dashboard** — stat cards (total/pending/approved/completed
  bookings) + your next upcoming booking, with links to My Bookings and
  Explore.
- **Owner dashboard** — workspace and booking stat cards, a live-style
  occupancy bar aggregated across all your approved workspaces, and quick
  links to My Workspaces, Booking Requests, Live Monitor, and Add
  Workspace.
- **Admin dashboard** — platform-wide stat cards, a highlighted banner if
  any workspaces are waiting for approval (links straight to
  `/admin/workspaces`), and a "today's activity" section.

**To try it:** log in as any role and click "Dashboard" in the navbar (or
just log in — you'll land there automatically). Compare the owner
dashboard's occupancy bar against what you see on `/live-monitor` — they
should always agree, since both read from the same `occupied`/`capacity`
fields on your workspaces.

## Notifications (new)

Two layers: **in-app** (fully working, no setup needed) and **email**
(works once you add real SMTP credentials — SMS was intentionally skipped,
see note below).

**Backend:**
- `models/Notification.js` — one record per notification: who it's for,
  type, message, link, read/unread.
- `utils/notify.js` — the one function every trigger point calls. It (1)
  saves the notification, (2) pushes it live via Socket.IO to the user's
  personal room if they're online, and (3) fires a best-effort email.
  Never throws — a failed notification never breaks the booking/approval
  action that triggered it.
- `utils/sendEmail.js` — Nodemailer wrapper. **If `EMAIL_HOST`/`EMAIL_USER`/
  `EMAIL_PASS` aren't set in `.env`, it silently skips sending and logs to
  the console instead of erroring** — so the app works fully without any
  email setup, and you can add real credentials later with zero code
  changes.
- Trigger points wired in: new booking request → notifies the owner;
  booking approved/rejected → notifies the user; booking cancelled →
  notifies the owner; new workspace submitted → notifies every admin;
  workspace approved/rejected → notifies the owner.
- `GET /api/notifications/mine`, `PATCH /api/notifications/:id/read`,
  `PATCH /api/notifications/read-all`.

**Frontend:**
- `context/NotificationContext.jsx` — fetches notifications on login, joins
  the user's personal Socket.IO room, and updates live when a new one
  arrives (no refresh needed, matching the pattern from real-time
  monitoring).
- 🔔 **bell icon in the navbar**, with an unread-count badge and a dropdown
  list. Clicking a notification marks it read and navigates to the
  relevant page (e.g. a new booking request takes an owner straight to
  `/booking-requests`).

**To enable real email sending:** open `backend/.env` and fill in
`EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS` (and `EMAIL_FROM`). For Gmail,
use an **App Password** (Google Account → Security → 2-Step Verification →
App passwords), not your normal password — Gmail blocks plain-password SMTP
logins. Restart the backend after saving; no code changes needed.

**Why email/SMS notifications weren't fully built:** this sandbox has no
network access to real SMTP or SMS providers, so email sending is
code-complete and tested for its no-op path, but the actual "email arrives
in an inbox" step needs to be verified on your machine with real
credentials. SMS (the original plan mentioned it as an option) was left out
entirely — it needs a paid provider (Twilio or similar) and an API key,
which felt like unnecessary cost/complexity for a student project when
email covers the same use case. Happy to add it if you want it for the
presentation.

**To try it (in-app half, fully testable now):**
1. Unzip over your project, `cd backend && npm install`, `cd frontend &&
   npm install` (new: `nodemailer` on the backend, nothing new on the
   frontend).
2. Restart both servers.
3. As a user, request a booking. Log in as the workspace's owner (or open a
   second browser) — the bell should show a new unread notification
   pointing to Booking Requests, live, no refresh.
4. Approve or reject it. Switch back to the user — bell updates again.

## Next steps (in order)

1. ✅ Register/login working.
2. ✅ Workspace CRUD routes built.
3. ✅ Register/Login + "Add Workspace" pages built, with protected routes.
4. ✅ Booking + availability logic, with an owner approve/reject flow.
5. ✅ Search & filter UI, plus the weighted smart-matching score.
6. ✅ Socket.IO real-time occupancy monitoring, with a live-updating public
   view and an owner control panel.
7. ✅ Dashboards — user, owner, and admin summary views, plus the earlier
   admin approval page and live monitor.
8. ✅ Notifications — in-app (live via Socket.IO) fully working; email via
   Nodemailer code-complete, needs your real SMTP credentials to verify
   end to end.
9. Deployment: frontend → Vercel, backend → Render/Railway, database →
   MongoDB Atlas (already set up), per your original tech stack.

See the full phase breakdown discussed in chat for details on each step.
