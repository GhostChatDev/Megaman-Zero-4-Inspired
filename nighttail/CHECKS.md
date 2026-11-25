# Nighttail — what the browser checks can and cannot see

Recorded diagnosis for task item 1. Nothing in `.github/workflows/` was changed.

## The root page stays Banana Signal's

The Ghost Screenshots check and the local `check_app` both photograph **one page: the
repository root `index.html`** (its folder list is `[APP_DIR, dist, build, out, ., docs,
public]`, and none of the first six exist here). Root `index.html` is left byte-identical
to `main` (108,804 bytes, md5 `c5d393b49201f2ac3d2490f68d09c707`), so the locked "Web game
checks" keep passing. Per instruction, no check file was touched.

**Consequence:** no CI check can ever test Nighttail, which lives at `nighttail/index.html`.

## So Nighttail is tested by its own harness

    node nighttail/check.mjs

It loads the real page and its five scripts in a small DOM stand-in, then proves: the page
and scripts load with no error, the first screen is the title (not blank), Start on a
click, a tap and the Enter key leaves the title, area 1 loads, the game clock keeps
advancing through 10 s of play with no uncaught error, and the run state holds.

It is a Node script over the real code, not a browser test, and it is not wired into CI.
The root page's "blank" reading in `check_app` belongs to Banana Signal's canvas title
screen, and is not a Nighttail defect.
