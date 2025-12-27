You are editing a React + TypeScript portfolio website that parodies the Spotify artist page UI.

Goal: Replace the current generic icon row to the right of the big green Play button with THREE Spotify-style rounded-rectangle “capsule” buttons (like Spotify’s small rounded rectangular control between Play and Shuffle). These capsules MUST use the official LinkedIn and GitHub logos so visitors instantly recognize them.

Requirements
1) Layout / placement
- The 3 capsules appear immediately to the right of the Play button, grouped together, before the Follow button.
- Use asymmetric spacing like Spotify:
  - Larger gap between Play and the capsule group
  - Tight spacing between capsules
  - Medium gap between capsule group and Follow
- Capsules should be visually “secondary” to Play (lower contrast, smaller presence).

2) Capsules (3 total)
A) LinkedIn capsule
- Icon: LinkedIn logo (brand-recognizable)
- On click: open my LinkedIn in a new tab (target=_blank, rel=noopener noreferrer)
- Tooltip on hover: “View LinkedIn”
B) GitHub capsule
- Icon: GitHub logo (brand-recognizable)
- On click: open my GitHub in a new tab (target=_blank, rel=noopener noreferrer)
- Tooltip on hover: “View GitHub”
C) Resume / “Liner notes” capsule
- Icon: document/notes icon (non-brand)
- On click: open my resume PDF (or resume route) in a new tab
- Tooltip on hover: “Read resume”

Important: Do NOT replace LinkedIn/GitHub with abstract icons. Must be the recognizable logos.

3) Capsule styling (Spotify-like)
- Rounded rectangle (pill-ish), not a circle
- Subtle border + subtle background (do not introduce new colors besides existing palette; Spotify green is #1ED760)
- Icon centered (icon-only buttons; no labels inside capsules)
- Hover:
  - background becomes slightly brighter
  - icon slightly lifts (translateY(-1px))
  - tooltip fades in from below
- Active/press:
  - tiny scale down (0.98) for a “click” feel
- Use CSS transitions/keyframes only (NO framer-motion or external animation libs)

4) Tooltips
- Tooltips appear below each capsule.
- Should not cause layout shift (use absolute positioning).
- Respect prefers-reduced-motion (disable lift/fade/scale animations and use instant state changes).

5) Accessibility
- Buttons must be keyboard focusable with a visible focus ring consistent with the design.
- Add aria-label for each capsule (LinkedIn, GitHub, Resume).
- Ensure hit area is at least 40x40px (can be achieved via padding).

6) Code organization
- Keep changes small and clean.
- Create a reusable component for these capsule buttons (e.g., SecondaryCapsuleButton).
- If you use an icon library already in the repo (e.g., lucide-react), use it for the resume icon only.
- For LinkedIn/GitHub logos: use existing SVG assets if present; otherwise add minimal inline SVGs (single color, matched stroke/fill weight) or add local SVG files under assets. Do not add new dependencies.

Output format
1) Short plan of which files you’ll modify/add.
2) Exact code (copy-pasteable) for new components + modified files.
3) Exact CSS (or Tailwind classes) for capsule styling + tooltip + reduced motion handling.
4) Note any assumptions you made about file structure / routing.

Ask NO questions. URLs for LinkedIn/GitHub/resume are already present in the codebase, use them.
