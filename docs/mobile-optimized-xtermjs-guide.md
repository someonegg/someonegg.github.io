# Mobile Optimized XTerm.js Guide

This document summarizes a mobile-focused patch set built on top of `xterm.js 5.5` (`5.5.0-mobile` branch).

Commit list: <https://github.com/someonegg/xterm.js/commits/5.5.0-mobile/>

## Baseline and Scope

- Upstream baseline: `xterm.js v5.5`
- Patch branch: `5.5.0-mobile`
- Scope in this guide: the latest 4 commits on that branch (ordered newest to oldest)

## Change 1: iOS IME punctuation/space input fix (`keyup` fallback)

### What changed

- Added a `keyup` fallback in composition-related handling.
- Covers `keyCode 229` cases where punctuation/space input is not reliably available at `keydown` time.

### Why it matters

- Some iOS native IMEs may drop or delay punctuation and space characters.
- The fallback improves input reliability.

## Change 2: `focusOnMouseDown` focus policy (`always` / `cursor`)

### What changed

- Added option: `focusOnMouseDown?: 'always' | 'cursor'`, default `always`.
- In `cursor` mode, terminal focus is triggered only for left-click/tap near the current cursor region.
- This reduces accidental focus grabs and unnecessary soft keyboard popups.

### Why it matters

- On mobile pages with mixed interactions, always-focusing on any pointer down is too aggressive.
- `cursor` mode significantly reduces focus noise.

## Change 3: touch-to-wheel reporting in mouse mode

### What changed

- While mouse events are active, `touchstart/touchmove` are handled by a touch-to-wheel path.
- Scroll distance is accumulated by cell height before dispatching wheel actions.
- At most one wheel step is emitted per `touchmove`, avoiding bursty jumps.
- Multi-touch gestures are ignored for safety.

### Why it matters

- Mobile devices cannot rely on native wheel input in mouse-reporting terminals.
- This allows swipe scrolling to be recognized by remote TUIs (for example `less`, `vim`, `tmux` panes).

## Change 4: `forceSelection` option (always allow text selection)

### What changed

- Added terminal option: `forceSelection?: boolean` (default `false`).
- When enabled, selection stays on the normal text-selection path even when mouse reporting mode is active.

### Why it matters

- In mobile and remote terminal usage, mouse mode often blocks selection gestures.
- `forceSelection=true` prioritizes copy-friendly behavior.

## Recommended Integration Options

If you pass options through `ttyd`, start with:

```bash
--client-option "focusOnMouseDown=cursor" \
--client-option "forceSelection=true"
```

- `focusOnMouseDown=cursor`: reduce accidental focus.
- `forceSelection=true`: prioritize text selection and copy.

## Compatibility and Trade-offs

- These changes target mobile interaction quality and do not alter core VT semantics.
- `forceSelection=true` improves copy behavior, but evaluate it if your app depends heavily on mouse-reporting interactions.
- `focusOnMouseDown=cursor` improves focus behavior; keep `always` if your workflow needs immediate focus on any pointer down.

## One-page Summary

This patch set makes mobile terminal interaction more predictable:

- Select reliably (`forceSelection`)
- Scroll in mouse mode (touch-to-wheel)
- Focus only when it makes sense (`focusOnMouseDown=cursor`)
- Keep punctuation/space input stable on iOS IME (`keyup` fallback)
