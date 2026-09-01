# Timestamps

This repository keeps OpenTimestamps proofs for the **Letters to Miss Aquarius**.

Its presence is also what admits this repo to the estate's stamping sweep:
`stamp-new.sh` discovers proof-bearing repos by looking for existing `.ots`
files, which a repo holding none can never satisfy. A `TIMESTAMPS.md` is the
deliberate act of saying *proofs are kept here*; from the second run onward the
`.ots` test carries it.

## What is stamped, and what is not

**Stamped:** `letters/*.html` — the five letters. They are corpus material: CC0,
served by [corpus.333.eco](https://corpus.333.eco), and citable.

**Not stamped:** every other page in this repository. Those are a website, not
documents, and stamping them would make the proof set meaningless by making it
universal. `letters/index.html` is the contents page and is excluded for the
same reason.

## ⛔ Not deposited, and that is a decision rather than an omission

The letters carry **no DOI and will not get one at this stage.** The estate's
posture, from `project_publication_strategy`: **prior art is a DUTY, citation is
a CHOICE.** Three reasons the choice is *no* here:

1. **They are scaffold.** Each letter says so in its own banner — the connective
   prose awaits the founder's revision in his own voice. Minting a permanent
   identifier for text that announces it is unfinished is a cost with no matching
   benefit.
2. **Genre.** A DOI signals a citable scholarly contribution. Letters to a
   successor are the intimate register — nearer to essays, which carry no DOI by
   standing rule — not scholarly works.
3. **Permanence against revision.** Zenodo versions are immutable. A deposit now
   would point a permanent identifier at scaffold prose forever, and the whole
   plan is that it gets rewritten.

The stamp is the duty half and costs nothing: it answers *this existed at this
time*, and rotates cleanly through `<name>.html.rN.ots` when a letter is revised.
The citation half stays available for after the revision, when a DOI would point
at his voice rather than at scaffold.

## Rotation

A revised letter keeps its old proof: move it to `letters/<name>.html.rN.ots`
and add a row below, then stamp the new text. Silently re-stamping would erase
the record of what the letter used to say — and for these letters, that record
is the point.

| Date | File | Revision | Note |
| --- | --- | --- | --- |
| 2026-09-01 | `letters/*.html` | r0 | First stamp. Scaffold state, pre-revision. |
