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

## The RFC 3161 leg — added 2026-09-03, and scoped for the same reason

Until now the Letters had **leg 1 only**: OpenTimestamps gives permanence and no
legal standing, and the estate's whole argument for two legs is that each covers
the other's weakness. The Letters had the permanent half and not the standing half.

`./tsa-stamp.sh` closes it — but **scoped to `letters/*.html`, not to the
repository.** Everywhere else in the estate that script manifests `git ls-files`,
which is correct where every tracked file is a document. Here it would do exactly
what the paragraph above forbids: make the proof set universal, and therefore
meaningless. The scope *is* the doctrine, expressed in a `git ls-files` pattern.

✅ **The deploy interaction is closed (2026-09-03).** `pages-deploy.yml` and
`snapshot.yml` now carry `paths-ignore: [timestamps/**, TIMESTAMPS.md, **/*.ots]`,
so a timestamping commit no longer redeploys the site or re-runs an archival
snapshot. ⚠️ **The `**/*.ots` entry is the one that is easy to miss: the OTS proofs
live NEXT TO the letters as `letters/*.html.ots`, so ignoring `timestamps/**` alone
would have left every OTS upgrade still deploying.** The artifact and its proof are
siblings on disk, and a filter written from the directory name catches only half.
⭐ `paths-ignore` skips a push only when *every* changed file matches, so editing a
letter and rotating its proof in one commit still deploys — which is correct.

⏳ **With that closed, scheduling this leg is now unblocked** and is the remaining
step to bring this repo in line with the four corpus repos.

⚠️ **Historic note — why it was NOT on a schedule.** Every workflow in this repo commits, and both
`pages-deploy.yml` and `snapshot.yml` fire on *any* push to `main` — so a weekly
bot commit would redeploy a live site and re-run an archival snapshot for a commit
that changes no content. The four corpus repos automate this leg because there a
bot commit is free; here it is not. Closing that needs `paths-ignore: timestamps/**`
on both site workflows, which is a change to a live deploy path and wants a
deliberate decision. **Until then: run `./tsa-stamp.sh` by hand after any change to
a letter, and `./tsa-verify.sh` to check.**

⛔ **The CA trust anchors are part of the leg, not decoration.** `timestamps/ca/*.pem`
must be present or every reply is discarded with *"REPLY DID NOT VERIFY"* — which
is what happened on the first run here, when the script was copied and the anchors
were not. The script is useless without them.

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
