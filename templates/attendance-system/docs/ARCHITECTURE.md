# Architecture

This document explains how the attendance app is put together, so you can extend it and explain it confidently.

## Overview

The app is a **single-page application** (SPA). Vite serves and bundles the TypeScript and React code; the browser does all the work. There is no backend: data is stored in the browser’s localStorage.

```text
 app.config.json ──► config.ts ──► main.tsx ──► <App>
                                               │
                         ┌─────────────────────┼──────────────────────┐
                         ▼                     ▼                      ▼
                 AttendanceProvider      NoticeProvider        useHashRoute()
                 (data + dispatch)       (toast messages)      (current view)
                         │
          ┌──────────────┼───────────────┬──────────────┬──────────────┐
          ▼              ▼               ▼              ▼              ▼
    DashboardView  MarkAttendance  StudentsView   RecordsView   SettingsView
          │              │               │              │              │
          └──────────────┴──── lib/attendance.ts (calculations) ──────┘
                                         lib/storage.ts (localStorage)
```

## Layers

| Layer         | Files                                                     | Responsibility                                                               |
| ------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Configuration | `src/app.config.json`, `src/config.ts`                    | Editable settings, validated at start-up.                                    |
| Types         | `src/types.ts`                                            | The shape of students and attendance data.                                   |
| Logic         | `src/lib/*.ts`                                            | Pure functions: calculations, validation, dates, CSV, storage. No React.     |
| State         | `src/state/reducer.ts`, `src/state/AttendanceContext.tsx` | One reducer owns every change; the context shares data and saves it.         |
| Views         | `src/views/*.tsx`                                         | One component per screen. They read data, call `dispatch`, and show results. |
| Components    | `src/components/*.tsx`                                    | Reusable UI: dialogs, form, badges, empty states, notices.                   |

Keeping calculations in `lib/` (instead of inside components) means they can be tested without a browser and reused by several screens.

## Data model

```ts
interface Student {
  id: string; // random UUID
  rollNumber: string; // unique within a class
  name: string;
  className: string; // e.g. "Class 10-A"
  createdAt: string; // ISO timestamp
}

type AttendanceStatus = 'present' | 'absent' | 'late';

// Attendance grouped by date, then by student id
type AttendanceByDate = Record<string, Record<string, AttendanceStatus>>;
```

Storing attendance **by date** makes marking a whole class for one day a single update, and makes it easy to tell whether a date has been recorded.

This app has no database, so there are no tables. If you moved it to a database, a typical relational design would be:

| Table        | Columns                                                                                                     |
| ------------ | ----------------------------------------------------------------------------------------------------------- |
| `students`   | `id` (primary key), `roll_number`, `name`, `class_name`, `created_at`; unique (`class_name`, `roll_number`) |
| `attendance` | `date`, `student_id` (foreign key → `students.id`), `status`; primary key (`date`, `student_id`)            |

## How a change flows through the app

1. A user action (for example clicking **Save attendance**) calls `dispatch({ type: 'attendance/save', date, marks })`.
2. `attendanceReducer` returns a **new** data object; the old one is not modified.
3. React re-renders every component that uses the data.
4. An effect in `AttendanceProvider` notices the new data and calls `saveData`, which writes JSON to localStorage.
5. A notice (“Attendance saved for …”) is announced through an `aria-live` region.

When the app starts, `loadData` reads localStorage and `validateData` checks every field. Invalid data is never used: the app starts fresh and keeps the unreadable value under a backup key.

## Navigation

The current screen is stored in the URL hash (`#/students`). `useHashRoute` listens for the browser’s `hashchange` event. This keeps back/forward buttons working without adding a routing library. After navigation, focus moves to the page heading so screen-reader users hear which screen opened.

## Design decisions

- **localStorage instead of a server** keeps the project runnable offline with one command. The trade-off is that data is per-browser (see “Known limitations” in the README).
- **A reducer** gives one place where data changes, which is easier to test and reason about than many separate `useState` calls.
- **Native `<dialog>`** provides focus trapping and Escape-to-close without extra libraries.
- **Local dates** (`YYYY-MM-DD` built from `getFullYear()/getMonth()/getDate()`) avoid the classic bug where `toISOString()` saves late-evening attendance under the next day.
- **CSV export** quotes values and prefixes cells that start with `=`, `+`, `-` or `@`, so spreadsheet programs don’t treat names as formulas.

## Ideas for extending the project

- Track attendance per period or subject (add a `period` key under each date).
- Add charts of attendance over time.
- Replace localStorage with a backend API and database (see the table design above) to share data between teachers.
- Add a printable monthly register.
