# Output fidelity — the standing paste test

The product's core promise is that **what a writer sees is what arrives in the
group**. This is the sim to test it with, and how to run the test. Re-run it
whenever anything touches the copy handler, `lrToReadingHtml()` or the paste
handler — and whenever a writer reports a sim landing wrong.

The automated half lives in `test/fidelity_browser.js`. It compares the three
render passes against each other, which catches drift between them. It cannot
tell you what Gmail and Google Groups actually do with the result. That part is
by hand, and it is this document.

---

## Step 1 — build the Google Docs source (do this once, keep the doc)

The nastiest bug in this area comes from Google Docs' own clipboard markup, so
the text has to genuinely come out of Google Docs. Typing it into LCARS by hand
does not test the same thing.

Make a Google Doc containing exactly this, with the formatting shown:

> Ensign Rala checked the readout twice. The number was **wrong**, and it was
> wrong in a way that meant somebody had *chosen* it.
>
> She tagged the console and stepped back. **Wrong by exactly point four**, she
> thought — not a rounding error. A decision.

- The two **bold** phrases must be really bold in Docs.
- The one *italic* word must be really italic in Docs.
- Everything else stays plain.
- Leave the blank line between the two paragraphs.

---

## Step 2 — build the test sim in LCARS

Make a new sim called **"Formatting test"**.

Before you start, in Settings check that **Bold locations** and **Italic
thoughts** are ON — those are the defaults, and the test assumes them.

Add a character named **Rala** and give it a colour (any colour). Add a second
character named **Doe** with a different colour. That is what makes the
character-colouring part of the test mean anything.

Then type the sim below into the editor. Type it — do not paste it — except for
the one marked block, which you paste from your Google Doc.

```
((USS Example, Main Engineering))

Rala: I have run it three times. The number does not change.

::She turns the console so he can see it.::

Doe: Then the number is not the problem.

oO He already knows. He has known since the briefing. Oo

=/\= Engineering to Bridge, we have something. =/\=

    [indent this line one level] She waited. The silence went on a beat too long.

        [indent this line two levels] And then another.

Doe: Log it. Do not send it yet.

- first bulleted line
- second bulleted line

Here is a link: https://example.com

This line has some bold typed in LCARS and some italic typed in LCARS.

((OOC: this is a note to the group, not part of the scene.))
```

Notes on typing it:

- The bracketed instructions (`[indent this line one level]`) are instructions —
  delete the bracket text and indent the line with the toolbar's indent button.
  One level on the first, two on the second.
- The bullets are the toolbar's bullet button, not typed hyphens.
- The link is the toolbar's link button.
- On the "bold typed in LCARS" line, actually bold and italic those words with
  the toolbar.
- Keep the blank lines exactly where they are — blank-line handling is one of
  the things being tested.

**Then paste your Google Doc text in**, as its own block, between the comms line
and the first indented line. Paste it with Ctrl+V, normally, the way a writer
would.

---

## Step 3 — look at it in the editor, before copying anything

Write down what you see. This is the "what a writer sees" half, and half the
bugs show up here rather than in the email.

- [ ] Is the **pasted Docs block** the same weight as the rest of the sim, or is
      the whole thing bold?
- [ ] Are the two phrases you bolded **in Docs** still bold?
- [ ] Is the word you italicised in Docs still italic?
- [ ] Does the pasted block sit at the same line spacing as the typed lines, or
      is it looser?

---

## Step 4 — copy it out, paste into Gmail and Google Groups

Press **Copy** in LCARS. Paste into a **Gmail compose window** and into a
**Google Groups compose window** separately — they are different editors and
Groups is the stricter of the two.

Check each of these in both:

| # | What to check | Expected |
|---|---|---|
| 1 | Line spacing | Single-spaced, with exactly one blank line where you left one. No doubled gaps. |
| 2 | Blank lines | Present as real blank lines, not collapsed away, and with no stray visible character on them. |
| 3 | The very first line | Same font, size and weight as everything below it — not bigger, not a different typeface. |
| 4 | `((USS Example, Main Engineering))` | Bold, brackets included. |
| 5 | `oO … Oo` | Italic, including the `oO` and `Oo` themselves — and the italic **stops** at `Oo`. |
| 6 | `::…::` and `=/\= … =/\=` | Ordinary text. No pink, no green, no highlight. The `=/\=` characters intact and not mangled. |
| 7 | Colour | None anywhere. In particular Rala's and Doe's character colours must be gone. |
| 8 | Indents | Two visibly different indent depths, roughly matching LCARS. |
| 9 | Bullets | Real bullets, not lines starting with a dot or a hyphen. |
| 10 | The link | Still a working link. |
| 11 | Bold and italic typed **in LCARS** | Still bold and italic. |
| 12 | The pasted **Docs block** | Same weight as the rest, with its own bold and italic intact. *(Expected to fail today.)* |
| 13 | `((OOC: …))` | Matches whatever your Italic OOC setting is — italic if on, plain if off. Same in both. |

---

## Step 5 — send it, and read what was delivered

Send the Gmail message to yourself and the Groups post to a test group, then
**read the delivered message**, not the compose window. Groups reprocesses the
HTML on send, and a difference between "looks right while composing" and "looks
right when received" is a real and separate bug.

Run through the same thirteen checks on the delivered copy.

---

## Step 6 — the share link

Publish a share link on the same sim (Sim Details → Share Link) and open it.
It should look like the delivered email: locations bold, thoughts italic,
markers plain, no colour, indents intact. The one thing that legitimately
differs is character colour — a reader never sees it, by design, in either
place.

---

## Reporting back

For each of the thirteen checks, one line is enough:

```
1  spacing        Gmail OK      Groups OK
2  blank lines    Gmail OK      Groups doubled
...
12 Docs block     Gmail all bold in LCARS before copying, un-bold in Gmail
```

"OK" or a short description of what was wrong is all that is needed. A
screenshot of the delivered message helps most on anything to do with spacing.
