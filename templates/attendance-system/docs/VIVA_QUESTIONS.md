# Viva questions

Questions an examiner may ask about this project, with answers based on how this code actually works. Read the referenced files and make sure you can explain each answer in your own words.

## 1. What problem does this project solve?

Teachers need a quick way to record daily attendance and spot students who are missing too many classes. The app keeps a roster, records Present/Late/Absent for each school day, and calculates each student’s attendance percentage so students below the threshold (75 % by default) are flagged.

## 2. Why did you choose React and TypeScript?

React lets the interface be built from reusable components that re-render automatically when data changes. TypeScript adds types such as `Student` and `AttendanceStatus` (`src/types.ts`), so mistakes like misspelling a status are caught before the app runs.

## 3. Where is the data stored? Is it secure?

In the browser’s localStorage under the key `campuskit-attendance:v1` (`src/lib/storage.ts`). It never leaves the computer, which protects privacy, but anyone using the same browser profile can see or change it, and there are no user accounts. A real school deployment would need a server, authentication and access control.

## 4. How is the attendance percentage calculated?

`(present + late) / days marked × 100`, rounded to one decimal place (`src/lib/attendance.ts`). Late counts as attended. Days on which a student has no mark are excluded, so a student who joined later isn’t penalised. A student with no marks shows “No marks yet” instead of 0 %.

## 5. What is a reducer and why use one here?

A reducer is a pure function `(state, action) => newState`. Every change (add student, save attendance, delete, import) goes through `attendanceReducer` in `src/state/reducer.ts`. Having one place for updates makes the logic easy to test and avoids components changing data in inconsistent ways.

## 6. How do components get the data?

Through React Context. `AttendanceProvider` holds the data with `useReducer` and exposes it via the `useAttendance()` hook, so any view can read data or dispatch actions without passing props through every level.

## 7. What happens if the saved data is corrupted?

`loadData` parses the JSON inside `try/catch`, and `validateData` checks every field (ids, dates, statuses). If anything is wrong, the app starts with fresh data and copies the unreadable value to a backup key, so nothing is silently lost and the app never crashes on bad data.

## 8. How do you prevent duplicate roll numbers?

`validateStudentInput` in `src/lib/validation.ts` compares the roll number and class case-insensitively against existing students, ignoring the student being edited. The form shows the error next to the field and moves focus to it.

## 9. Why store dates as `YYYY-MM-DD` strings?

They sort correctly as text, compare easily for date ranges, and are built from local date parts. `toISOString()` would use UTC, which can shift late-evening attendance to the next day in time zones such as IST.

## 10. How does navigation work without a router library?

The current view is kept in the URL hash (for example `#/records`). `useHashRoute` reads it and listens for `hashchange`, so links, refresh and the back button all work.

## 11. What does the CSV export protect against?

Values containing commas, quotes or line breaks are quoted (RFC 4180), and cells starting with `=`, `+`, `-` or `@` are prefixed with `'` so spreadsheet software doesn’t execute them as formulas (CSV injection).

## 12. How did you test the project?

With Vitest and Testing Library (`npm test`). Unit tests check calculations, date handling, storage recovery, CSV escaping and validation. Component tests render the whole app in jsdom and simulate a user adding a student, marking attendance, searching and deleting.

## 13. What are the limitations, and how would you improve the project?

Data is limited to one browser, there are no accounts, and attendance is per day rather than per period. Improvements: a backend with a database (see the table design in `docs/ARCHITECTURE.md`), login for teachers, per-period attendance, and charts of trends over time.

## 14. How is the app made accessible?

Form fields have labels and inline error messages linked with `aria-describedby`; dialogs use the native `<dialog>` element for focus trapping; status messages are announced via an `aria-live` region; focus moves to the page heading after navigation; and keyboard focus is always visible.
