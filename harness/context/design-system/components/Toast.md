# Toast

A short message at the bottom of the screen that the person can act on: an import failed, storage is full, notes exported, back online.

- **danger** for failures the person can do something about (on `danger-soft`, with the alert icon). It stays until dismissed.
- **positive** for completed actions (Exported 23 notes). **neutral** for status (You're offline. Changes will sync later). Both leave after 4 seconds.
- Say what happened and what to do, in one sentence, without blame: "This PDF couldn't be opened. It may be damaged or password-protected."
- At most one action, named with a verb (Try again, Show file, Undo).
- Never use a toast to confirm something visible on screen, such as a new highlight.

Consumer provides: `children` (the message), `tone`, optional `action`, `onDismiss`.
