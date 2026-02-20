# Portfolio — Project Context & Implementation Plan

## Project Overview

**What this is:** A personal portfolio website for Kai Zhang (1A Software Engineering, University of Waterloo) that parodies the Spotify artist page. Projects replace songs/albums, "playing" a project starts a fake progress bar and after 5 continuous seconds triggers a "stream" (view count stored in Firebase Firestore). The site is live at **kaizhang.ca**, deployed via GitHub Pages with GitHub Actions CI/CD.

**Tech stack:** React 19 + Vite 7, Tailwind CSS 4, Firebase/Firestore, lucide-react icons, Montserrat font, deployed to GitHub Pages.

**Data:** 4 albums (WAT.ai, UW Orbital, Wisp, Rootify) and 6 singles/EPs (DocBot, ReelJobs, Waypost, kaizhang.ca, Project Periodic, Kai's Music Blog). All hardcoded in `Home.jsx` with view counts merged from Firestore at load time.

---

## Current Architecture

### File Map

| File | Purpose |
|------|---------|
| `portfolio/src/App.jsx` | Root: wraps `<PlayerProvider><Layout><Home/></Layout></PlayerProvider>` |
| `portfolio/src/main.jsx` | Entry: mounts App inside BrowserRouter + StrictMode |
| `portfolio/src/context/PlayerContext.jsx` | Global state: currentProject, isPlaying, currentTime, durationSeconds, continuousPlayTime, likedIds, streamConfirmedTrigger. Methods: playProject(), togglePlay(), confirmStream(), toggleLike(), clearCurrentProjectDelayed() |
| `portfolio/src/pages/Home.jsx` | Single page: hero banner (370px), action bar (play/social/follow), Popular section (sortable track list), Discography (horizontal scroll + "Show All" grid), About section (image gallery). Fetches Firestore data on mount, merges with hardcoded projects |
| `portfolio/src/components/Layout.jsx` | Layout wrapper: `<main>` + `<RightSidebar>` in a flex row, `<PlayerBar>` fixed bottom. Tracks scroll state |
| `portfolio/src/components/PlayerBar.jsx` | Fixed bottom bar (h-24): project info left, playback controls center, volume right. Shows/hides with fade animation based on `currentProject` existence |
| `portfolio/src/components/RightSidebar.jsx` | 320px right panel: project image, title, description, tags, credits (github/website/year). Shows/hides based on `currentProject` existence. `hidden lg:flex` |
| `portfolio/src/components/Sidebar.jsx` | **UNUSED** — old left sidebar with mock data, never mounted |
| `portfolio/src/hooks/useStreamTracker.js` | Monitors continuousPlayTime. At 5000ms: first stream pauses + shows confirmable toast (3s countdown). Subsequent: auto-confirm + brief toast |
| `portfolio/src/index.css` | Custom animations (fadeInUp, fadeOutDown, slideUp, slideDown, likePop, streamCounterGlow, hapticPulse, microShake), custom scrollbar, reduced-motion support |

### Current Layout Structure

```
┌──────────────────────────────────────────┐
│  (no top bar)                            │
├──────────────────────────────────┬───────┤
│                                  │ Right │
│   Main Content (Home.jsx)        │ Side  │  ← Only shows when project selected
│   - Hero banner                  │ bar   │
│   - Action bar                   │       │
│   - Popular tracks               │       │
│   - Discography                  │       │
│   - About                        │       │
├──────────────────────────────────┴───────┤
│   PlayerBar (fixed bottom)               │  ← Only shows when project selected
└──────────────────────────────────────────┘
```

### Key Architectural Patterns

- **Enter/exit animations:** Components track `animState` ('enter'/'exit'). CSS class applies keyframe animation. `setTimeout` unmounts after exit animation duration (220-280ms).
- **Stream tracking flow:** `playProject()` → progress bar ticks at 20%/sec → `continuousPlayTime` increments every 100ms → at 5000ms `useStreamTracker` triggers toast → confirm → `confirmStream()` in context → `streamCompleteTrigger` increments → `Home.jsx` useEffect catches trigger, increments Firestore views
- **Firestore:** `projects/{id}` docs with `views` field. `visitors/{visitorId}` with `lastSeen` timestamp.
- **Playback speed:** 20% per second (100% in 5s), then loops. 5s of playback = one stream trigger.

---

## Layout Overhaul Plan — Match Real Spotify Desktop

### Target Layout

Based on the real Spotify desktop app screenshot:

```
┌──────────────────────────────────────────────────────────┐
│ [KZ logo]   [Home]   [🔍 What do you want to play?]  [👤] │  ← TopBar (64px)
├────┬─────────────────────────────────────────────────┬───┤
│ 📚 │                                                 │ < │  ← LeftSidebar (72px) + Main + Right chevron
│ +  │         Hero Banner                             │   │
│    │         Action Bar                              │   │
│ 🎵 │         Popular Tracks                          │   │
│ 🎵 │         Discography                             │   │
│ 🎵 │         About                                   │   │
│ ❤️ │                                                 │   │
├────┴─────────────────────────────────────────────────┴───┤
│ [🎵 img] Title / Artist   ⏮ ▶ ⏭   ━━━━━━   🔊 ━━━     │  ← PlayerBar (full width, always visible)
└──────────────────────────────────────────────────────────┘
```

When right chevron `<` is clicked, it expands into the existing RightSidebar:

```
├────┬──────────────────────────────────┬──────────────┤
│ 📚 │                                  │  [X] Title   │
│ +  │     Main Content                 │  [image]     │
│ 🎵 │                                  │  description │
│ 🎵 │                                  │  tags        │
│ ❤️ │                                  │  credits     │
├────┴──────────────────────────────────┴──────────────┤
```

### Behavior on Page Load

1. Firestore data loads, merges with hardcoded projects
2. A **random project is auto-selected** (but **paused** — progress bar frozen, not playing)
3. This populates: PlayerBar (shows project info), LeftSidebar (1 thumbnail in recently played)
4. RightSidebar stays **collapsed** (just the chevron visible) — user clicks to expand
5. User hits play when ready, which starts the progress bar and stream timer

---

## Phase 1: Modify `PlayerContext.jsx`

**Why first:** Every new component depends on new context state. This is the foundation.

### New State to Add

```javascript
const [recentlyPlayed, setRecentlyPlayed] = useState([]);        // Project[], max 10, most recent first
const [allProjectsList, setAllProjectsList] = useState([]);       // Full merged project list (set by Home.jsx)
const [searchQuery, setSearchQuery] = useState('');               // TopBar search input
const [rightSidebarOpen, setRightSidebarOpen] = useState(false);  // Collapsed by default
```

### New Methods to Add

```javascript
// Called internally by playProject — tracks recently played
const addToRecentlyPlayed = (project) => {
  setRecentlyPlayed(prev => {
    const filtered = prev.filter(p => p.id !== project.id);  // deduplicate
    return [project, ...filtered].slice(0, 10);               // prepend, cap at 10
  });
};

// Toggle right sidebar open/closed
const toggleRightSidebar = () => setRightSidebarOpen(prev => !prev);

// Pure filter function for search (title + tags + description, case-insensitive)
const searchProjects = (query, projects) => {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return projects.filter(p =>
    p.title.toLowerCase().includes(q) ||
    (p.tags && p.tags.some(tag => tag.toLowerCase().includes(q))) ||
    (p.description && p.description.toLowerCase().includes(q))
  );
};
```

### Modify Existing `playProject`

```javascript
const playProject = (project) => {
  setCurrentProject(project);
  setIsPlaying(true);
  setCurrentTime(0);
  setContinuousPlayTime(0);
  setDurationSeconds(parseDuration(project.duration));
  addToRecentlyPlayed(project);  // ← ADD THIS LINE
};
```

### Expose in Provider Value

Add to the existing value object:
```javascript
recentlyPlayed,
allProjectsList, setAllProjectsList,
searchQuery, setSearchQuery, searchProjects,
rightSidebarOpen, toggleRightSidebar,
```

---

## Phase 2: Modify `Home.jsx`

### 2a. Push Project Data to Context

After the Firestore merge (inside the existing `fetchProjects` useEffect, after `setAllProjects(mergedProjects)`):

```javascript
setAllProjectsList(mergedProjects);  // push to context so TopBar search works
```

Import `setAllProjectsList` from `usePlayer()`.

### 2b. Auto-Select Random Project on Load

Add at the top of the component:
```javascript
const hasAutoPlayed = useRef(false);
```

Add a new useEffect:
```javascript
useEffect(() => {
  if (firestoreInitialized && allProjects.length > 0 && !currentProject && !hasAutoPlayed.current) {
    hasAutoPlayed.current = true;
    const randomIndex = Math.floor(Math.random() * allProjects.length);
    playProject(allProjects[randomIndex]);
    // Immediately pause — selected but not playing
    setIsPlaying(false);
  }
}, [firestoreInitialized, allProjects]);
```

Import `setIsPlaying` from `usePlayer()`.

### 2c. Adjust Hero Banner Padding

The TopBar will overlay the top of the hero. The hero currently starts at the top of the main scroll area. No padding change needed — the transparent TopBar overlays the hero naturally (this is how real Spotify works). The hero's `justify-end` flex alignment pushes content to the bottom, so the top bar overlaps empty sky/image area.

---

## Phase 3: Create New Components

### 3a. Create `portfolio/src/components/TopBar.jsx`

This is the navigation bar that sits at the top of the main content column (NOT over the left sidebar — matching Spotify's layout).

**Props:** `scrollY` (number) — scroll offset of the main content area

**Structure:**
```
<header> (h-16, sticky top-0, z-40, full width of main column)
├── Left section
│   ├── Site logo (square_logo.png, 32x32, rounded)
│   └── Home icon button (lucide Home, 24px)
├── Center section (flex-1, max-w-[480px], mx-auto)
│   └── Search pill (bg-[#242424], rounded-full, h-12)
│       ├── Search icon (lucide Search, left)
│       ├── <input> placeholder="What do you want to play?"
│       └── Browse icon (lucide LayoutGrid, right)
│       └── {focused && query && <SearchOverlay />}
└── Right section
    └── Profile avatar (profilephoto1.jpg, 32x32, rounded-full)
```

**Scroll behavior:**
- `scrollY <= 64`: `background: transparent`
- `scrollY > 64`: `background: #121212`
- Transition: `transition: background-color 300ms ease`

**Search behavior:**
- Input bound to `searchQuery` / `setSearchQuery` from context
- When focused AND query is non-empty, render `<SearchOverlay>` positioned below the pill
- Blur/Escape clears focus

**Key imports:** `usePlayer` context, `square_logo.png`, `profilephoto1.jpg`, lucide icons (Home, Search, LayoutGrid)

### 3b. Create `portfolio/src/components/SearchOverlay.jsx`

Dropdown that appears below the TopBar search input.

**Props:** `results` (array), `onSelect` (function), `onClose` (function)

**Structure:**
```
<div> (absolute, top-full mt-2, w-full, bg-[#282828], rounded-lg, shadow-2xl, max-h-[400px], overflow-y-auto, z-50)
├── If no results: "No results found" (p-4, text-gray-400, text-sm)
└── For each result:
    <div> (flex, items-center, gap-3, px-4, py-2, hover:bg-white/10, cursor-pointer)
    ├── <img> (project.image, 40x40, rounded, object-cover)
    └── <div>
        ├── <span> title (text-white, text-sm, font-medium)
        └── <span> type • year (text-gray-400, text-xs)
```

**Behavior:**
- `onSelect(project)` calls `playProject(project)`, clears `searchQuery`, closes overlay
- Click outside → `onClose()`
- Escape key → `onClose()`
- Use a `useEffect` with `mousedown` listener for click-outside detection
- Use a `useEffect` with `keydown` listener for Escape

### 3c. Create `portfolio/src/components/LeftSidebar.jsx`

Narrow sidebar matching Spotify's collapsed library view.

**Props:** none (reads everything from context)

**Structure:**
```
<aside> (w-[72px], bg-[#121212], rounded-lg, flex flex-col, p-2, gap-1, items-center, overflow-y-auto, custom-scrollbar, shrink-0, hidden md:flex)
├── Top: Library icon button
│   <button> (w-12 h-12, rounded-lg, flex items-center justify-center, text-gray-400, hover:text-white)
│   └── <Library size={20} />  (from lucide)
├── Plus button
│   <button> (w-8 h-8, rounded-full, flex items-center justify-center, text-gray-400, hover:text-white, hover:bg-[#1a1a1a])
│   └── <Plus size={16} />  (from lucide)
├── Divider: <div> (w-8 h-px bg-[#282828] my-2)
├── Recently played thumbnails (scrollable, flex-1, overflow-y-auto, flex flex-col gap-1)
│   For each project in recentlyPlayed:
│   <button> (w-12 h-12, rounded, overflow-hidden, shrink-0, relative, group)
│   ├── <img> (project.image, w-full h-full, object-cover)
│   ├── If currentProject?.id === project.id:
│   │   <div> (absolute, bottom-0, left-1/2, -translate-x-1/2, w-1 h-1, bg-green-500, rounded-full)
│   └── Tooltip on hover (group-hover:visible, absolute, left-full, ml-2, bg-[#282828], px-2, py-1, rounded, text-xs, whitespace-nowrap, z-50)
│       └── project.title
├── Spacer: <div className="mt-auto" />
└── Bottom: Liked songs button
    <button> (w-12 h-12, rounded, bg-gradient-to-br from-indigo-600 to-purple-600, flex items-center justify-center, relative)
    ├── <Heart size={14} fill="white" className="text-white" />
    └── If likedCount > 0:
        <span> (absolute, -top-1, -right-1, w-4 h-4, bg-green-500, text-black, text-[10px], font-bold, rounded-full, flex items-center justify-center)
        └── likedCount
```

**Click handlers:**
- Recently played thumbnail → `playProject(project)`
- Liked songs button → could scroll to liked section or be decorative
- Library icon → decorative (visual fidelity)
- Plus icon → decorative or link to GitHub

**Key imports:** `usePlayer` context, lucide icons (Library, Plus, Heart)

---

## Phase 4: Restructure `Layout.jsx`

This is the major integration step. The current layout:

```jsx
<div className="bg-black min-h-screen font-sans text-white flex flex-col h-screen overflow-hidden">
  <div className={`flex flex-1 p-2 ${currentProject ? 'gap-2' : ''} overflow-hidden ${currentProject ? 'pb-24' : ''}`}>
    <main ref={mainRef} className="flex-1 bg-[#121212] rounded-lg overflow-y-auto custom-scrollbar relative">
      {children}
    </main>
    <RightSidebar />
  </div>
  <PlayerBar />
</div>
```

### New Layout Structure

```jsx
<div className="bg-black min-h-screen font-sans text-white flex flex-col h-screen overflow-hidden">
  {/* Content row: left sidebar + main column + right sidebar/toggle */}
  <div className="flex flex-1 p-2 gap-2 overflow-hidden pb-24">

    {/* Left Sidebar — collapsed library */}
    <LeftSidebar />

    {/* Main content column (TopBar + scrollable content) */}
    <div className="flex-1 flex flex-col bg-[#121212] rounded-lg overflow-hidden relative">
      {/* TopBar — sticky inside this column */}
      <TopBar scrollY={scrollY} />

      {/* Scrollable main content */}
      <main
        ref={mainRef}
        onScroll={handleMainScroll}
        className={`flex-1 overflow-y-auto custom-scrollbar ${isScrolling ? 'scrolling' : ''}`}
      >
        {children}
      </main>
    </div>

    {/* Right sidebar: collapsed chevron OR expanded panel */}
    {rightSidebarOpen ? (
      <RightSidebar onClose={toggleRightSidebar} />
    ) : (
      <button
        onClick={toggleRightSidebar}
        className="hidden lg:flex items-center justify-center w-8 bg-[#121212] rounded-lg hover:bg-[#1a1a1a] transition-colors cursor-pointer shrink-0"
        aria-label="Expand now playing view"
      >
        <ChevronLeft size={16} className="text-gray-400 hover:text-white" />
      </button>
    )}
  </div>

  {/* Player Bar — full width, always visible */}
  <PlayerBar />
</div>
```

### Scroll Tracking Changes

Update the existing scroll handler to also track `scrollY`:

```javascript
const [scrollY, setScrollY] = useState(0);

const handleMainScroll = () => {
  const el = mainRef.current;
  if (el) setScrollY(el.scrollTop);

  // existing isScrolling debounce logic stays the same
  setIsScrolling(true);
  if (timeoutRef.current) clearTimeout(timeoutRef.current);
  timeoutRef.current = setTimeout(() => setIsScrolling(false), 500);
};
```

Remove the old `useEffect` scroll listener — use `onScroll` JSX prop instead (simpler).

### Imports to Add

```javascript
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import { ChevronLeft } from 'lucide-react';
```

Get `rightSidebarOpen` and `toggleRightSidebar` from `usePlayer()`.

### Key Detail: `pb-24` is Always Applied

Since auto-select ensures a project is always loaded after init, the PlayerBar is always visible, so `pb-24` is always applied (no conditional needed).

---

## Phase 5: Modify Existing Components

### 5a. Modify `RightSidebar.jsx`

**Current behavior:** Visibility is driven by `currentProject` existence. Shows/hides with animation when project is selected/deselected.

**New behavior:** Visibility is driven by `rightSidebarOpen` from context. The X button collapses the sidebar (does NOT clear the current project).

**Changes:**

1. Accept `onClose` prop
2. Remove the `useEffect` that watches `currentProject` for show/hide
3. Visibility is now controlled by Layout.jsx (conditionally renders the component)
4. The X button calls `onClose` instead of `clearCurrentProjectDelayed`
5. Remove `hidden lg:flex` — Layout handles visibility
6. Keep enter animation (`animate-fade-in-up`) on mount
7. For exit animation: Layout can wrap in a transition or the component can animate on unmount

**Simplified component:**

```jsx
const RightSidebar = ({ onClose }) => {
  const { currentProject } = usePlayer();

  const title = currentProject?.title || 'No project selected';
  const artist = currentProject ? 'Kai Zhang' : 'Select a project';

  return (
    <div className="w-80 bg-[#121212] flex flex-col p-4 rounded-lg text-white overflow-y-auto custom-scrollbar animate-fade-in-up shrink-0">
      <div className="flex justify-between items-center mb-6">
        <span className="font-bold text-base">{title}</span>
        <X className="text-gray-400 hover:text-white cursor-pointer" size={20} onClick={onClose} />
      </div>

      {/* Rest of content stays the same: image, title, description, tags, credits */}
      ...
    </div>
  );
};
```

### 5b. Modify `PlayerBar.jsx`

**Current behavior:** Complex enter/exit animation tied to `currentProject` appearing/disappearing. Returns `null` when not visible.

**New behavior:** Always visible after mount (since auto-select ensures a project is loaded). Simplify to just render always (with a one-time fade-in).

**Changes:**

1. Remove `visible`/`animState` state and the `useEffect` that manages them
2. Simply check `if (!currentProject) return null;` — but since auto-select happens immediately, this is just a brief guard
3. Add `animate-fade-in-up` class for the initial appearance
4. Everything else (controls, progress bar, volume) stays the same

---

## Phase 6: CSS + Cleanup

### 6a. Add to `index.css`

```css
/* TopBar background transition */
.topbar {
  transition: background-color 300ms ease;
}

/* Search overlay entrance */
@keyframes searchOverlayIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.search-overlay-enter {
  animation: searchOverlayIn 200ms ease both;
}

/* Left sidebar tooltip */
.sidebar-tooltip {
  transition: opacity 150ms ease, transform 150ms ease;
}
```

### 6b. Delete `portfolio/src/components/Sidebar.jsx`

The old unused sidebar. Replaced by `LeftSidebar.jsx`.

---

## Mobile Responsive Strategy

| Component | < 768px (mobile) | 768-1024px (tablet) | > 1024px (desktop) |
|-----------|-----------------|--------------------|--------------------|
| TopBar | Full width, search pill slightly narrower | Full | Full |
| LeftSidebar | `hidden` | `hidden md:flex` (72px) | 72px |
| Right toggle | `hidden` | `hidden` | `hidden lg:flex` |
| RightSidebar | `hidden` | `hidden` | Expanded when toggled |
| PlayerBar | Full width (consider hiding some right-side icons) | Full width | Full width |

---

## Implementation Order & Dependency Graph

```
Phase 1: PlayerContext.jsx ← Foundation, everything depends on this
    │
    ▼
Phase 2: Home.jsx ← Data pipeline + auto-select
    │
    ├──▶ Phase 3a: LeftSidebar.jsx (new)      ┐
    ├──▶ Phase 3b: SearchOverlay.jsx (new)     ├── Can be done in parallel
    └──▶ Phase 3c: TopBar.jsx (new)            ┘
              │
              ▼
         Phase 4: Layout.jsx ← Integrates all new + existing components
              │
              ├──▶ Phase 5a: RightSidebar.jsx (modify)  ┐
              └──▶ Phase 5b: PlayerBar.jsx (modify)      ├── Can be done in parallel
                                                         ┘
              │
              ▼
         Phase 6: index.css + delete old Sidebar.jsx
```

---

## Verification Checklist

After implementation, verify:

1. **Page load:** Site loads → random project auto-selected (paused) → PlayerBar visible with project info → LeftSidebar shows 1 thumbnail
2. **Left sidebar:** Click projects in Popular/Discography → thumbnails accumulate in left sidebar (most recent on top, max 10). Active project has green indicator
3. **Search:** Type in TopBar search → overlay shows filtered results → click result plays it and closes overlay → Escape/click-outside closes overlay
4. **Right sidebar:** Chevron visible on right edge → click expands → shows project details → X collapses back to chevron → current project stays in player bar
5. **Top bar scroll:** Scroll main content → TopBar transitions from transparent to `#121212` after ~64px
6. **Responsive:** Resize to mobile → LeftSidebar and right toggle hidden. Resize to desktop → they reappear
7. **Stream tracking:** Play a project for 5s → toast appears → view count increments in Firestore (existing functionality preserved)
8. **Likes:** Heart button toggles → count badge updates on LeftSidebar liked button
9. **Existing features:** Discography filter tabs, Show All grid, About image gallery, SE Webring menu, Follow/socials menu — all still work
10. **Run `npm run build`** — no build errors

---

## Additional Improvement Suggestions (Lower Priority)

These are separate from the layout overhaul and can be done independently afterward.

### Spotify Fidelity
- **Verified Artist Badge:** Blue checkmark + "Verified Artist" on hero banner — huge visual impact, 10 min to add
- **Monthly Listeners:** Wire up Firestore visitor count instead of hardcoded "0"
- **Dynamic Color Gradient:** Extract dominant color from hero/project image for the gradient below the hero (currently static `#252b36`)
- **Three-Dot Menu:** `...` button next to Follow with "Share" / "Copy link" options
- **CSS Equalizer:** Replace CDN GIF (`open.spotifycdn.com/cdn/images/equaliser-animated-green.f93a2ef4.gif`) with pure CSS 3-bar animation
- **"Fans Also Like":** Section linking to SE Webring peers' portfolios

### Interactivity
- **Seekable Progress Bar:** Add click-to-seek on the player bar progress bar (currently visual-only)
- **Functional Volume Slider:** Store volume state, update fill width, change icon based on level
- **Skip Forward/Back:** Wire up the SkipBack/SkipForward buttons to navigate between projects
- **Keyboard Shortcuts:** Space = play/pause, arrows = seek/volume, Escape = close modals
- **Loading Skeletons:** Gray pulsing rectangles while Firestore loads (prevents layout shift)
- **Dynamic Page Title:** `document.title = "Kai Zhang - ${project.title}"`

### Responsiveness
- **Smooth Discography Transitions:** Animate between normal and "Show All" views instead of hard cut
- **Compact Mobile Player Bar:** 48px bar on mobile with just thumbnail + title + play button
- **Horizontal Scroll Arrows:** Fade gradient + arrows on discography horizontal scroll

### Performance
- **Image Optimization:** Convert to WebP, add `loading="lazy"`, preload hero image
- **Remove Console.logs:** Multiple `console.log` statements in Home.jsx — remove or gate with `import.meta.env.DEV`
- **Memoize Computed Lists:** Wrap `popularProjects`, `filteredDiscography`, etc. in `useMemo`
- **Extract Project Data:** Move `initialAlbums`/`initialSingles` to `src/data/projects.js`
