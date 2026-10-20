# Phase 19 context: reader chrome

Material decisions only. Plan and contract: harness/build/phase-19-reader-chrome.md,
harness/contracts/phase-19-contract.md. Plan approved by the user on 2026-10-20.

## Decisions by the user

- Bookmarks and Notes stay as buttons beside Contents until phase 20 folds them into the tabbed
  panel (the design's toolbar has no place for them).
- Open PDF leaves the reader (library only). In the reader the sync line becomes a small badge,
  shown only when it needs the reader; the full line stays in the library.

## Judgment calls

- Branch cut from `mac-webkit-baseline`, not main, so local verify starts green.
- Zoom steps follow the design (25 … 400 without 33). A saved 33 % still opens, as Custom.
- The compact breakpoint stays at the app's 699 px; the design's 720 px arrives with the bottom
  sheets in phase 20.
