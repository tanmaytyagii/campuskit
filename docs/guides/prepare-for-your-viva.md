# Prepare for your viva

A viva tests whether you understand your project, not whether you can recite it. If you started from a CampusKit template, examiners will reasonably ask which parts you built and how the rest works. This guide helps you answer both.

## Start a week before

1. **Run it yourself, from the ZIP.** Follow `GETTING_STARTED.md` on the computer you will present with. Note every problem you hit and how you fixed it: these are good answers to “what challenges did you face?”.
2. **Read the architecture document.** Each template has `docs/ARCHITECTURE.md`. Redraw its diagram by hand, without looking, until you can.
3. **Trace one feature end to end.** Pick the main feature (marking attendance, adding a transaction, uploading a CSV). Follow it from the button the user clicks to the place the data is saved, file by file. Write the file names down.
4. **Change something and see what breaks.** Rename a field, change a calculation, remove a validation rule. Run the tests. Understanding why a test fails teaches you more than reading the code.
5. **Add something of your own.** Each project page and each architecture document lists ideas for extending the project. Build at least one. It is the part of the project that is clearly yours, and the best thing to demonstrate.

## Practise the questions

Every template includes `docs/VIVA_QUESTIONS.md` with questions examiners commonly ask and answers based on how the code actually works. Use them like this:

- Read a question, close the file, and answer out loud in your own words.
- Open the files the answer mentions and check that you were right.
- Add the details of anything you changed.

The learning center on the CampusKit website can turn these questions, and your project's real features and limitations, into a draft report that you then rewrite and complete yourself.

## Questions about the template

Be ready for these, and answer them honestly:

- **“Did you write all of this?”** Say which template you started from and what you added or changed. Showing your own additions is far stronger than claiming everything.
- **“Why did you choose this stack?”** Give reasons that fit your project, for example: React for a multi-screen interface, pandas for tabular data, no server because the data stays on one computer.
- **“What are the limitations?”** Each project page and README lists them. Knowing them shows you understand the design.
- **“How did you test it?”** Run the automated tests in front of the examiner if you can, and explain one test case line by line.

## Plan the demonstration

- Prepare three or four actions that show the main features, in order, and practise them.
- Start from a known state: reset the demo data or load a sample file before you begin.
- Have a backup: screenshots you captured yourself, and the app already running in a second browser tab.
- If something fails during the demo, say what you expected and what you would check first. That is a good answer too.

## On the day

- Bring your report, the project on your laptop (already installed, tested the evening before) and a copy on a USB drive.
- Close unrelated tabs and turn off notifications.
- When you don't know an answer, say so, and explain how you would find out.

See also [Using templates honestly](using-templates-honestly.md).
