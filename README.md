# TCN Lekki Form Builder & Attendance Desk

A modern, comprehensive Next.js 16 web application designed for the **TCN Lekki** church community. This portal streamlines event registrations, manages active directories for children and mentors, provides a self-service check-in kiosk, delivers Sunday-based attendance reporting with automated absentee follow-up workflows, and runs a book library with lending and overdue tracking.

---

## 🌟 Key Features

### 1. Dynamic Form Builder & Event Registration
* **Custom Event Forms:** Generate customizable registration pages with custom slugs (e.g., `/[formSlug]`).
* **Flexible Fields:** Support for standard and custom input types, including text, numbers, emails, select dropdowns, textareas, dates, and booleans.
* **Intelligent Real-time Duplicate Engine:** As users type, the form validates inputs in real-time to alert parents if a record already exists:
  * **Level 1 (First Name Match):** Shows a gentle warning checking if the user has registered before.
  * **Level 2 (First + Last Name Match):** Displays a prominent warning indicating a matching record.
  * **Level 3 (Exact Name + Age Match):** Triggers a browser confirmation block and flags the submission as `Needs Review`.
* **Submission Moderation:** Admin dashboard panel to filter, review, approve, or delete submissions.
* **CSV Exporting:** Seamlessly download all form submissions for external analysis.

### 2. Centralized Roster Directories
* **Children Directory:** Centralized portal containing names, ages, gender, date of birth, class, day/boarding status, preferred Sunday service, parent names, contact phones, and emails. Contains direct links to each child's historical attendance log. Registration requires the full core details and blocks duplicate children.
* **Mentors Directory:** List of all registered mentors with phone numbers, emails, professional details, sub-unit, and a historic service duty log. Mentors can self-register through a public link (`/register/mentor`) or be added by an admin; duplicates are blocked.

### 3. Attendance & Session Manager
* **Session Logging:** Create check-in sessions customized by Date, Title, and Service Type (`1st Service`, `2nd Service`, `Special Event`). Only one session per service type is allowed per date.
* **Curriculum Tracking:** Store lesson notes, memory verses, or taught topics inside each session.
* **Mentor Scheduling:** Link active mentors to specific services.
* **Roster Check-in Board:** Interactive roster to toggle check-in status (optimistic UI updates with MongoDB sync). The board lists every active child and mentor, so anyone who switches services can always find their name.
* **Live Present Counts:** Each roster shows a live "present / total" tally for children and mentors.
* **Roster Reporting:** Export session attendance lists directly to CSV format.

### 4. Sunday Reports
* **Sunday-level Rollups:** The two Sunday services are grouped by date into a single day-level view, so you see the true picture per Sunday rather than per isolated session.
* **Per-service Breakdown:** Each service shows present children with a boys/girls split, plus the mentor count.
* **Distinct Sunday Total:** Anyone present at both services is counted **once** in the day's distinct totals.
* **Date Filter:** Open any Sunday on record, not just the most recent.
* **Absentee Follow-up:** Flags children who missed several consecutive Sundays (regular services only), with quick call shortcuts and a "Mark contacted" action that clears a child until they miss again.

### 5. Book Library & Lending
* **Copy-level Inventory:** Each physical book is its own record, so two people donating the same title creates two independently-tracked copies — each keeping its own contributor.
* **Title-grouped View:** The inventory groups copies by title into a single row (e.g. *"Title — 2 available / 2 · from Ada, John"*), with an **Add copy** action and an optional bulk *number of copies* field.
* **Multiple Categories:** A book can carry several categories/genres, editable per title at any time.
* **Flexible Attribution:** A contributor or borrower can be linked to a registered child or mentor, or entered as a free-text name (for parents and visitors).
* **Lending & Returns:** Lend an available copy to a borrower (with optional phone/email) and a required due date capped at 2 months. Returning captures an optional condition and note. A copy can only be on one loan at a time, and a borrower may hold only one book at a time.
* **Renew & Overdue Tracking:** Extend an active loan's due date within the cap, and filter loans by borrowed, overdue, and returned.
* **Shelf Management:** Mark a copy lost, retire it, restore it, or permanently delete a mistaken entry — each behind a confirmation.
* **Summary Cards:** Live totals for titles, total copies, available, on-loan, and overdue.

### 6. Self-Service Check-in Kiosk
* **Public Check-in Boards:** Tablet-friendly, session-scoped check-in pages for children (`/attendance/child/[sessionId]`) and mentors (`/attendance/teacher/[sessionId]`).
* **Privacy-safe Roster:** Unauthenticated kiosk pages receive only the fields needed to check people in (name, age, gender, status) — never parent contact details.
* **Name Search:** Quick search of the active roster by name.
* **Instant Overlays:** Confirm check-in with micro-animations and name-initial avatars.
* **Offline Kiosk Safety:** Displays a descriptive landing page if no active attendance session has been launched by admins.

---

## 🔒 Security & Data Protection

Built with privacy in mind for an application that holds minors' data:

* **Authenticated Admin Surface:** The entire admin area and its APIs require a valid admin session; only the public kiosk check-in flow is exempt.
* **Fail-closed Sessions:** Sessions are signed with a mandatory secret — the app refuses to run without it, with no insecure fallback.
* **Gated Admin Bootstrap & Brute-force Protection:** Admin creation is locked down after initial setup, and login is rate-limited.
* **Duplicate Protection:** Database-enforced uniqueness plus application-level checks keep the registers clean.
* **Minimal Data Exposure:** Public responses are scoped to non-sensitive fields, and error responses are generic (full detail stays in server logs).

---

## 🛠 Tech Stack

* **Framework:** Next.js 16.2 (App Router)
* **Frontend Library:** React 19, Lucide React
* **Styling:** Tailwind CSS v4
* **Database:** MongoDB (via Mongoose ODM)
* **Authentication:** JWT Sessions (`jose` & `bcryptjs`) secured via Next.js Middleware cookies (`admin_session`)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
Ensure you have the following installed:
* **Node.js** (v20 or higher recommended)
* **MongoDB** (Atlas connection URI or local instance)

### 2. Environment Configurations
Create a `.env` file at the root of the project with the following properties:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/tcn_db
JWT_SECRET=your_super_secure_jwt_secret_key_here
```
`JWT_SECRET` is **required** — the app will refuse to start without it. Generate a strong value with `openssl rand -base64 48`. Optional SMTP variables (`SMTP_USER`, `SMTP_PASS`) enable registration confirmation emails.

### 3. Setup & Running Development
```bash
# Clone the repository and navigate into the directory
cd form-builder

# Install dependencies
npm install

# Run the development server
npm run dev
```

The portal will be running locally at **`http://localhost:3000`**.

### 4. Bootstrapping Admin Account
To create your first admin account:
1. Navigate to `http://localhost:3000/setup` in your browser.
2. Fill out the **Initial Setup** form with your desired admin username and password.
3. Click **Create Admin Account**. You will be redirected to the Admin Login screen.
4. Log in at `/admin/login` to access the Admin Dashboard.

> Note: `/setup` is only open while no admin exists. Once an admin is created, an existing admin must be logged in to add another (accounts are capped at two).
