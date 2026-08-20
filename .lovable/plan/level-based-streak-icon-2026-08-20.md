# Level-based streak icon

## Goal
Replace the generic Flame icon with one of four custom SVGs based on the user's current streak days, shown in both the header streak badge and the profile streak card.

## Levels
```text
Level 1: 1–10 days
Level 2: 11–30 days
Level 3: 31–100 days
Level 4: 100+ days
```

## Where to upload the SVGs
Place the four SVG files in `src/assets/streak/` with these exact names so the component can import them predictably:

```text
src/assets/streak/streak-level-1.svg
src/assets/streak/streak-level-2.svg
src/assets/streak/streak-level-3.svg
src/assets/streak/streak-level-4.svg
```

If the file panel supports drag-and-drop, drop them there; otherwise create the folder and paste each SVG file. The component will import each SVG as a React component via Vite.

## Implementation steps

1. **Create `src/components/StreakIcon.tsx`**
   - Accept `streak: number` and optional `className`.
   - Map the streak to the correct imported SVG using the levels above.
   - If `streak` is `0` or missing, render nothing (or a placeholder) so the badge still behaves as it does today.
   - Fall back to the existing `Flame` lucide icon if any SVG import is missing, so the build never breaks.

2. **Update `src/components/AppHeader.tsx`**
   - Replace `<Flame className="h-4 w-4" ... />` inside the streak badge with `<StreakIcon streak={streak} className="h-4 w-4" />`.
   - Keep the badge text and layout unchanged.

3. **Update `src/routes/_authenticated/profile.tsx`**
   - Add the level icon above or beside the large streak number in the Current streak card.
   - Use the same `<StreakIcon streak={data?.streak ?? 0} />` component with an appropriate size (e.g. `h-10 w-10`).

4. **Verify**
   - Run a build/typecheck to confirm all imports resolve.
   - Check the header badge and profile card in the preview for each level by temporarily overriding the streak value if needed.

## Notes
- SVG files imported as React components must be source files; do not externalize them as CDN assets.
- Keep the existing `Flame` fallback so the UI stays functional until all four SVGs are uploaded.
