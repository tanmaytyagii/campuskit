"""Analysis code for the Student Result Analyzer.

The modules here are plain Python + pandas with no Streamlit imports, so they
can be tested and reused without running the web interface:

- ``config``      reads and checks ``app_config.json``
- ``validation``  loads a CSV file and checks it before any analysis
- ``grading``     the grading scale
- ``analysis``    statistics, student results, grade distributions, missing data
- ``explain``     plain-language explanations of the results
- ``report``      downloadable CSV and Markdown output
"""
