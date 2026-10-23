import type { DemoDefinition } from '../../types.ts';

export const attendanceDemo: DemoDefinition = {
  projectId: 'attendance-system',
  appName: 'Student Attendance System',
  appSubtitle: 'Riverside Public School',
  fidelity: 'template-logic',
  summary:
    'Add students, mark attendance and watch the summaries update, using the template’s own calculations, validation and sample class.',
  notice:
    'A re-created version of the app for trying out with fictional data. The screens are rebuilt with CampusKit’s components, while the calculations, validation and data updates run the template’s own code.',
  runs: {
    files: [
      'src/lib/attendance.ts',
      'src/lib/validation.ts',
      'src/lib/dates.ts',
      'src/lib/demo-data.ts',
      'src/lib/storage.ts',
      'src/state/reducer.ts',
      'src/config.ts',
      'src/types.ts',
    ],
    description:
      'The calculations, form validation, date handling, the reducer that applies every change, the check on saved data and the sample class are the template’s own modules, imported unchanged. The screens are re-created with CampusKit’s components.',
  },
  data: {
    description:
      'The template’s fictional sample class: twelve students in Class 10-A and 10-B, with attendance for the ten school days before today.',
    editable: true,
    persistence: 'session',
    reset: 'Reset brings back the sample class. Until then your changes stay in this browser tab.',
  },
  features: [
    {
      id: 'students',
      label: 'Students',
      explanation:
        'The class roster, sorted by class and roll number. Search matches names and roll numbers, and each percentage is calculated from the student’s saved marks. In the template this is the Students screen.',
      tryThis: [
        'Search for a name or a roll number, or show one class.',
        'Add a student with a roll number that is already used in that class, read the message, then fix it.',
        'Edit a student, or delete one and see their attendance marks removed with them.',
      ],
      simplified: [
        'The template has its own styles and accent colour; here the screen uses CampusKit’s design.',
      ],
      source: [
        { file: 'src/views/StudentsView.tsx', symbol: 'StudentsView' },
        { file: 'src/lib/validation.ts', symbol: 'validateStudentInput' },
        { file: 'src/lib/attendance.ts', symbol: 'matchesSearch' },
        { file: 'src/lib/attendance.ts', symbol: 'sortStudents' },
        { file: 'src/state/reducer.ts', symbol: 'attendanceReducer' },
      ],
      learn: {
        walkthrough: ['validation', 'student-form', 'reducer'],
        architecture: ['ui-components', 'validation'],
        viva: ['duplicate-roll', 'delete-student'],
      },
    },
    {
      id: 'mark',
      label: 'Mark attendance',
      explanation:
        'Choose a date and a class, set each student’s status and save. Saving sends an attendance/save action to the template’s reducer, which merges the marks into the record for that date. Future dates are refused, as in the template.',
      tryThis: [
        'Use “Mark all present”, change one student to Late or Absent, then save.',
        'Open an earlier school day to see and change its saved marks.',
        'Enter a future date to see it refused.',
      ],
      simplified: [
        'The template has its own styles and accent colour; here the screen uses CampusKit’s design.',
      ],
      source: [
        { file: 'src/views/MarkAttendanceView.tsx', symbol: 'MarkAttendanceView' },
        { file: 'src/state/reducer.ts', symbol: 'attendanceReducer' },
        { file: 'src/lib/dates.ts', symbol: 'isValidDateKey' },
        { file: 'src/lib/attendance.ts', symbol: 'countsForDate' },
      ],
      learn: {
        walkthrough: ['mark-attendance', 'reducer', 'dates'],
        architecture: ['views', 'state'],
        viva: ['by-date', 'date-strings', 'reducer'],
      },
    },
    {
      id: 'summary',
      label: 'Summary',
      explanation:
        'Every figure here is calculated from the saved marks by src/lib/attendance.ts. A student’s percentage is (days present + days late) ÷ days marked × 100, and anyone under the template’s 75 % threshold is listed. In the template these figures are on the Dashboard.',
      tryThis: [
        'Mark today’s attendance, then come back to see today’s counts and the percentages change.',
        'Check one student’s percentage by hand with the table at the bottom.',
      ],
      simplified: [
        'The template’s Records screen, with date-range filters and CSV export, isn’t part of the demo.',
      ],
      source: [
        { file: 'src/lib/attendance.ts', symbol: 'attendancePercentage' },
        { file: 'src/lib/attendance.ts', symbol: 'summarizeStudents' },
        { file: 'src/lib/attendance.ts', symbol: 'summarizeClasses' },
        { file: 'src/lib/attendance.ts', symbol: 'overallCounts' },
        { file: 'src/views/DashboardView.tsx', symbol: 'DashboardView' },
      ],
      learn: {
        walkthrough: ['calculations'],
        architecture: ['calculations'],
        viva: ['percentage', 'threshold'],
      },
    },
    {
      id: 'data',
      label: 'Data model',
      explanation:
        'The demo keeps its data in exactly the shape the template saves to the browser: a list of students and an attendance object keyed by date, then by student id. The JSON below is the demo’s data as it is now.',
      tryThis: ['Add a student or save attendance, then find your change in the JSON.'],
      simplified: [
        'The template saves this object in localStorage under “campuskit-attendance:v1”; the demo keeps it in this tab only.',
      ],
      source: [
        { file: 'src/types.ts', symbol: 'AttendanceData' },
        { file: 'src/types.ts', symbol: 'AttendanceByDate' },
        { file: 'src/lib/storage.ts', symbol: 'validateData' },
        { file: 'src/lib/storage.ts', symbol: 'saveData' },
      ],
      learn: {
        walkthrough: ['types', 'storage'],
        architecture: ['storage'],
        viva: ['by-date', 'storage-security', 'corrupted-data'],
      },
    },
  ],
  tour: [
    {
      id: 'roster',
      feature: 'students',
      title: 'The student list',
      text: 'These twelve students are the template’s own fictional sample class. The list is sorted and searched by functions in src/lib/attendance.ts, the same ones the downloaded app uses.',
      highlight: 'student-list',
    },
    {
      id: 'validation',
      feature: 'students',
      title: 'Adding a student',
      text: 'The form checks names, roll numbers and classes with validateStudentInput from src/lib/validation.ts, so you see exactly the messages the template shows.',
      highlight: 'add-student',
    },
    {
      id: 'records',
      feature: 'mark',
      title: 'Attendance records',
      text: 'Saving sends an attendance/save action to the template’s reducer, which stores each status under the date and then the student’s id.',
      highlight: 'mark-list',
    },
    {
      id: 'summaries',
      feature: 'summary',
      title: 'Summaries',
      text: 'Percentages and counts are never stored. They are recalculated from the records each time, so they always agree with the data.',
      highlight: 'summary-figures',
    },
    {
      id: 'model',
      feature: 'data',
      title: 'The data model',
      text: 'This is the object the template saves in the browser. Every screen reads from it, and every change goes through the reducer first.',
      highlight: 'data-json',
    },
  ],
  presentation: [
    {
      id: 'introduce',
      feature: 'students',
      title: 'Introduce the project',
      say: 'This app keeps a class roster and records attendance every school day. It runs entirely in the browser: no server, no login and no database.',
      action: 'Point at the student list and the note that the data is fictional.',
      expect: 'Twelve students in Class 10-A and Class 10-B, each with an attendance percentage.',
      concept: 'The problem the project solves and its scope',
      learn: { viva: ['problem'] },
    },
    {
      id: 'search',
      feature: 'students',
      title: 'Find students',
      say: 'Search and the class filter are plain functions over the student list, so they are easy to test.',
      action: 'Type “Diya” in Search, clear it, then choose Class 10-B.',
      expect: 'The list narrows to the matching students and comes back when the search is cleared.',
      concept: 'Pure functions: matchesSearch and sortStudents',
      learn: { walkthrough: ['calculations'] },
    },
    {
      id: 'add-student',
      feature: 'students',
      title: 'Add a student',
      say: 'New students are checked before they are saved. Roll numbers must be unique within a class.',
      action:
        'Select “Add student”, enter roll number 10A-01 in Class 10-A to see the message, then change it to 10A-07 and save.',
      expect:
        'The first attempt names the student who already has 10A-01; after the change the new student appears in the list.',
      concept: 'Validation and the reducer’s student/add action',
      learn: { walkthrough: ['validation'], viva: ['duplicate-roll'] },
    },
    {
      id: 'mark-attendance',
      feature: 'mark',
      title: 'Mark attendance for today',
      say: 'Attendance is saved per date, then per student id, so one day can be edited without touching the others.',
      action: 'Open Mark attendance, choose “Mark all present”, change one student to Late, then save.',
      expect: 'A message confirms the date was saved, and the counts above the list show your marks.',
      concept: 'The attendance/save action and data stored by date',
      learn: { walkthrough: ['mark-attendance'], viva: ['by-date'] },
    },
    {
      id: 'summary',
      feature: 'summary',
      title: 'Review the summary',
      say: 'Every number is calculated from the saved records. Late counts as attended; absent does not.',
      action:
        'Open Summary, read today’s counts, then check one student’s percentage with the table at the bottom.',
      expect:
        'Today’s counts match what you saved, and each percentage equals (present + late) ÷ days marked.',
      concept: 'Derived data and the attendance percentage rule',
      learn: { walkthrough: ['calculations'], viva: ['percentage'] },
    },
    {
      id: 'data-model',
      feature: 'data',
      title: 'Explain the data model and limitations',
      say: 'Everything is one JSON object in the browser’s localStorage. That keeps the app simple, but the data stays on one device and is not shared or backed up automatically.',
      action: 'Open Data model and find today’s date and the student you added.',
      expect: 'The JSON contains your new student and today’s marks under today’s date.',
      concept: 'The data model and the limits of browser storage',
      learn: { walkthrough: ['types', 'storage'], viva: ['limitations', 'storage-security'] },
    },
  ],
  fullProjectAdds: [
    'Saves to the browser’s localStorage, so the data is still there after closing the browser, and keeps a backup if saved data can’t be read.',
    'A Records screen with date-range filters and CSV export.',
    'Settings with a JSON backup you can download and import, and buttons to load or clear the sample class.',
    'Its own look, with the app name, institution, accent colour and attendance threshold set in src/app.config.json, which the generator customizes.',
    'Automated tests (npm test) for the calculations, validation, storage and screens.',
  ],
  limitations: [
    'The data is fictional and kept only in this browser tab. Reset, or closing the tab, brings back the sample class.',
    'Dates come from your computer’s clock, so the sample school days are the ten weekdays before today.',
    'The screens are re-created with CampusKit’s components; only the logic listed above runs the template’s code.',
  ],
};
