# Viva questions

Questions an examiner may ask about this project, with answers based on how this code actually works. Read the referenced files and be ready to explain each answer in your own words.

## 1. What does the project do?

It reads a CSV file of marks, checks it for mistakes, and then calculates statistics for every subject, each student’s percentage, grade, result and rank, the grade distribution and missing scores. It explains the results in plain language and lets you download them as CSV files and a Markdown report.

## 2. Why Python, pandas and Streamlit?

pandas is the standard Python library for tabular data: it reads CSV files and computes statistics in a few lines. Streamlit turns a Python script into a web app without writing HTML or JavaScript, which keeps the project focused on the analysis.

## 3. How does Streamlit work?

Streamlit runs `app.py` from top to bottom whenever the user interacts with a widget. Widgets like `st.selectbox` return their current value, and output functions like `st.dataframe` draw on the page. `@st.cache_data` stores the validation result so the same file isn’t re-checked on every interaction.

## 4. How do you validate the uploaded file?

`analyzer/validation.py` reads every cell as text, then checks the file size and encoding, the required columns (Student ID and Name, matched case-insensitively with aliases), empty or duplicate IDs, empty names, non-numeric scores and scores outside 0 to the maximum. Each problem is reported with its line number, and analysis stops until errors are fixed.

## 5. How are missing values handled?

Empty cells and marks such as `AB` or `Absent` become `NaN`. pandas skips `NaN` when calculating the mean, median and standard deviation, so missing scores are not treated as zero. The Count column shows how many students each statistic uses, and students with missing scores get the result _Incomplete_ (unless they failed another subject).

## 6. What is the difference between mean and median, and why show both?

The mean is the sum divided by the count; the median is the middle value. A few very high or very low scores move the mean but not the median, so when they differ noticeably the app points this out (`explain_overview`).

## 7. What does standard deviation tell you?

How spread out the scores are around the mean. The app uses the sample standard deviation (`ddof=1`). A subject with a high standard deviation has a wide range of performance, which can mean the paper separated strong and weak students more.

## 8. How is a student’s percentage and grade calculated?

Percentage = total marks in the subjects they have scores for ÷ (number of those subjects × maximum marks) × 100. The grade comes from `grade_for` in `analyzer/grading.py`: A+ 90+, A 80+, B 70+, C 60+, D from the pass mark, F below it.

## 9. How is the rank calculated when students tie?

`Series.rank(method="min", ascending=False)` on the percentage. Tied students get the same rank and the next rank is skipped (1, 1, 3), which is the usual competition ranking.

## 10. How did you test the project?

With pytest (`python -m pytest`). Tests compare statistics with values calculated by hand, check every grade boundary, every validation rule (including line numbers, Windows-1252 files and Unicode names), the downloads, and run the whole Streamlit app headlessly using `streamlit.testing.v1.AppTest`.

## 11. How do you keep downloaded CSV files safe?

Text cells starting with `=`, `+`, `-` or `@` are prefixed with an apostrophe so spreadsheet programs don’t execute them as formulas (CSV injection), and files are encoded as UTF-8 with a byte-order mark so Excel displays names correctly.

## 12. What are the limitations and how could it be improved?

All subjects share one maximum mark, grading uses fixed percentage bands rather than credits or GPA, and only one file is analysed at a time. Improvements: per-subject maximum marks, comparison between exams, PDF export and correlation analysis between subjects.
