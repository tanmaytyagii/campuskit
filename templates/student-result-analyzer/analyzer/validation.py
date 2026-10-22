"""Loads a results CSV file and checks it before any analysis runs.

Expected layout (column names are matched case-insensitively):

    Student ID, Name, Class, Mathematics, Science, ...

* ``Student ID`` and ``Name`` are required. ``Class`` (or ``Section``) is optional.
* Every other column is treated as a subject and must contain scores from 0 to
  the maximum marks. Empty cells, and cells marked ``AB``/``Absent``, are
  treated as missing scores and reported as warnings, not errors.

Line numbers in messages match the line numbers you see in a spreadsheet or
text editor (the header is line 1).
"""

from __future__ import annotations

import io
import re
from dataclasses import dataclass, field

import pandas as pd

MAX_FILE_BYTES = 5 * 1024 * 1024
MAX_STUDENTS = 10_000
MAX_LISTED = 8

ID_COLUMN = "Student ID"
NAME_COLUMN = "Name"
CLASS_COLUMN = "Class"

ID_ALIASES = {"student_id", "id", "roll_no", "roll_number", "roll", "admission_no", "admission_number", "enrolment_no", "enrollment_no"}
NAME_ALIASES = {"name", "student_name", "full_name"}
CLASS_ALIASES = {"class", "section", "class_section"}
ABSENT_MARKERS = {"ab", "abs", "absent", "-", "na", "n/a"}


@dataclass
class Issue:
    level: str  # "error" or "warning"
    message: str


@dataclass
class ValidationResult:
    data: pd.DataFrame | None
    """Clean data: Student ID, Name, optional Class, then one float column per subject."""
    subjects: list[str] = field(default_factory=list)
    errors: list[Issue] = field(default_factory=list)
    warnings: list[Issue] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.errors and self.data is not None


def normalize_header(name: str) -> str:
    """'Student ID ' -> 'student_id', 'Social Studies' -> 'social_studies'."""
    return re.sub(r"[^a-z0-9]+", "_", name.strip().lower()).strip("_")


def _list_lines(lines: list[int]) -> str:
    shown = ", ".join(str(line) for line in lines[:MAX_LISTED])
    extra = len(lines) - MAX_LISTED
    return f"{shown} and {extra} more" if extra > 0 else shown


def decode_csv(raw: bytes) -> tuple[str | None, list[Issue]]:
    """Decodes bytes as UTF-8 (with or without BOM), falling back to Windows-1252."""
    try:
        return raw.decode("utf-8-sig"), []
    except UnicodeDecodeError:
        pass
    try:
        text = raw.decode("cp1252")
    except UnicodeDecodeError:
        return None, [Issue("error", "The file is not a text CSV file. Save it as “CSV UTF-8” and try again.")]
    return text, [
        Issue(
            "warning",
            "The file is not UTF-8, so it was read as Windows-1252. If any names look wrong, "
            "save the file as “CSV UTF-8 (Comma delimited)” and upload it again.",
        )
    ]


def _read_table(text: str) -> tuple[list[str], pd.DataFrame] | Issue:
    try:
        table = pd.read_csv(
            io.StringIO(text),
            header=None,
            dtype=str,
            keep_default_na=False,
            skip_blank_lines=False,
        )
    except pd.errors.EmptyDataError:
        return Issue("error", "The file is empty.")
    except pd.errors.ParserError as error:
        detail = str(error).strip().splitlines()[-1]
        return Issue("error", f"The file could not be read as CSV: {detail}. Check for extra commas on that line.")
    table = table.fillna("")
    header = [str(value).strip() for value in table.iloc[0].tolist()]
    rows = table.iloc[1:].copy()
    rows.index = rows.index + 1  # index is now the 1-based line number
    return header, rows


def validate_results(raw: bytes, max_marks: int) -> ValidationResult:
    """Validates CSV bytes. Errors stop the analysis; warnings are shown alongside it."""
    result = ValidationResult(data=None)

    if len(raw) == 0:
        result.errors.append(Issue("error", "The file is empty."))
        return result
    if len(raw) > MAX_FILE_BYTES:
        result.errors.append(Issue("error", "The file is larger than 5 MB. Split it into smaller files."))
        return result

    text, issues = decode_csv(raw)
    for issue in issues:
        (result.errors if issue.level == "error" else result.warnings).append(issue)
    if text is None:
        return result

    table = _read_table(text)
    if isinstance(table, Issue):
        result.errors.append(table)
        return result
    header, rows = table

    # --- Header checks -----------------------------------------------------
    empty_headers = [str(position + 1) for position, name in enumerate(header) if not name]
    if empty_headers:
        result.errors.append(Issue("error", f"Column(s) {', '.join(empty_headers)} have no name in the first row."))
    normalized = [normalize_header(name) for name in header]
    seen: dict[str, str] = {}
    for original, key in zip(header, normalized):
        if key and key in seen:
            result.errors.append(Issue("error", f"The columns “{seen[key]}” and “{original}” have the same name."))
        seen.setdefault(key, original)

    def find(aliases: set[str]) -> int | None:
        return next((index for index, key in enumerate(normalized) if key in aliases), None)

    id_index, name_index, class_index = find(ID_ALIASES), find(NAME_ALIASES), find(CLASS_ALIASES)
    missing = [label for label, index in ((ID_COLUMN, id_index), (NAME_COLUMN, name_index)) if index is None]
    if missing:
        found = ", ".join(name for name in header if name) or "no column names"
        result.errors.append(
            Issue(
                "error",
                f"Required column(s) missing: {', '.join(missing)}. The first row must name the columns, "
                f"for example: Student ID, Name, Class, Mathematics, Science. Found: {found}.",
            )
        )

    known = {index for index in (id_index, name_index, class_index) if index is not None}
    subject_indexes = [index for index, name in enumerate(header) if index not in known and name]
    if not subject_indexes:
        result.errors.append(Issue("error", "No subject columns were found. Add one column of scores per subject."))
    if result.errors:
        return result

    # --- Rows ----------------------------------------------------------------
    blank = rows.apply(lambda row: all(str(value).strip() == "" for value in row), axis=1)
    rows = rows[~blank]
    if rows.empty:
        result.errors.append(Issue("error", "The file has column names but no student rows."))
        return result
    if len(rows) > MAX_STUDENTS:
        result.errors.append(Issue("error", f"The file has more than {MAX_STUDENTS:,} students."))
        return result

    assert id_index is not None and name_index is not None
    ids = rows[id_index].astype(str).str.strip()
    names = rows[name_index].astype(str).str.strip().str.replace(r"\s+", " ", regex=True)

    empty_ids = ids[ids == ""].index.tolist()
    if empty_ids:
        result.errors.append(Issue("error", f"Student ID is empty on line(s) {_list_lines(empty_ids)}."))
    empty_names = names[names == ""].index.tolist()
    if empty_names:
        result.errors.append(Issue("error", f"Name is empty on line(s) {_list_lines(empty_names)}."))
    duplicated = ids[(ids != "") & ids.duplicated(keep=False)]
    for student_id, group in duplicated.groupby(duplicated, sort=False):
        result.errors.append(
            Issue("error", f"Student ID “{student_id}” appears more than once (lines {_list_lines(group.index.tolist())}).")
        )

    clean = pd.DataFrame({ID_COLUMN: ids, NAME_COLUMN: names})
    if class_index is not None:
        clean[CLASS_COLUMN] = rows[class_index].astype(str).str.strip()

    subjects: list[str] = []
    absent_count = 0
    missing_cells = 0
    for index in subject_indexes:
        label = header[index]
        cells = rows[index].astype(str).str.strip()
        is_absent = cells.str.lower().isin(ABSENT_MARKERS)
        is_empty = cells == ""
        numbers = pd.to_numeric(cells.where(~(is_absent | is_empty)), errors="coerce")

        not_numeric = cells[~is_empty & ~is_absent & numbers.isna()]
        if not not_numeric.empty:
            examples = ", ".join(f"“{value}” (line {line})" for line, value in list(not_numeric.items())[:MAX_LISTED])
            result.errors.append(Issue("error", f"{label}: scores must be numbers, but found {examples}."))
        out_of_range = numbers[(numbers < 0) | (numbers > max_marks)]
        if not out_of_range.empty:
            examples = ", ".join(f"{value:g} (line {line})" for line, value in list(out_of_range.items())[:MAX_LISTED])
            result.errors.append(Issue("error", f"{label}: scores must be between 0 and {max_marks}, but found {examples}."))

        absent_count += int(is_absent.sum())
        missing_cells += int((is_absent | is_empty).sum())
        clean[label] = numbers.astype(float)
        subjects.append(label)

    if absent_count:
        result.warnings.append(
            Issue("warning", f"{absent_count} score(s) marked as absent (for example “AB”) are treated as missing.")
        )
    if missing_cells:
        result.warnings.append(
            Issue(
                "warning",
                f"{missing_cells} score(s) are missing. Averages for those subjects use only the students who have a score; "
                "see the Missing data tab for details.",
            )
        )
    no_scores = clean[subjects].isna().all(axis=1)
    if no_scores.any():
        result.warnings.append(
            Issue("warning", f"Line(s) {_list_lines(clean.index[no_scores].tolist())} have no scores in any subject.")
        )

    if result.errors:
        return result
    result.data = clean.reset_index(drop=True)
    result.subjects = subjects
    return result
