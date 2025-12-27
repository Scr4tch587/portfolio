You are implementing small, Spotify-like micro-interactions for a portfolio site (Spotify artist page parody).
Each project is a “song”. When a user opens a project detail page, it appears in a “Now Playing” bar at the bottom.
After the user stays on that project continuously for 5 seconds, we count it as a “stream” and update popularity.

Implement the following features ONLY (do not add unrelated extras):

(1B) Soft user acknowledgment at 5s:
- At exactly 5 seconds of continuous focus on a project detail page, show a non-blocking toast above the Now Playing bar: “▶ Stream this project?”
- The toast includes a small “Stream” button.
- Auto-confirms after 1 second if the user does nothing (so it still counts without friction).
- If user clicks “Stream”, confirm immediately (no waiting).
- If the user navigates away before 5 seconds, nothing happens.
- If the user navigates away during the 1 second auto-confirm window, cancel (no stream).

(2) Make stream count satisfying:
- When the stream is confirmed, increment the stream count with a smooth animation:
  - digits roll/tick upward OR at minimum a 1.05 scale “pop” + easing and settle back
  - brief Spotify-green (#1ED760) glow highlight on the number for ~400ms
- Do not just change text instantly.

(3) First-time stream badge (per visitor):
- When a project is streamed for the first time by THIS visitor, show a small “🟢 First listen” badge next to the project title in the detail view and in any list rows (where applicable).
- Persist per-visitor using localStorage (keyed by project id).
- Do not show it again on subsequent streams by the same visitor.

(10) Soundless haptic-style visual feedback:
- On stream confirmation, add a short (100–150ms) “haptic” visual effect:
  - either a subtle scale pulse on the Now Playing bar OR a micro shake on the play button
  - must be subtle, not distracting
- Keep it accessibility-friendly (respect prefers-reduced-motion).

Constraints / environment:
- Frontend is React + TypeScript.
- No external animation libraries (no framer-motion). Use CSS transitions/keyframes + minimal JS.
- Must respect `prefers-reduced-motion` (disable pulses/shakes and use non-animated fallback).
- Keep code changes small and organized: new components/hooks are fine, but avoid sprawling refactors.
- Ensure “continuous 5 seconds” means: if the tab becomes hidden or route changes, timer pauses/resets and no stream is counted.
- Avoid counting multiple streams during a single continuous stay: once streamed, do not re-trigger unless the user leaves the project and returns.

What I want in your output:
1) A short implementation plan (bullet points) listing files/components you will touch.
2) Exact code changes (full code for new components/hooks; patch-style or copy-pasteable snippets for modified files).
3) LocalStorage schema/keys you will use.
4) Edge cases checklist (route change, tab hidden, reduced motion, double-trigger prevention).

Ask NO questions. Make reasonable assumptions if needed and state them.
