# Assets Directory

This folder contains static resources used by the to-do app UI, such as images, icons, logos, and other media files.

Use this directory to keep all visual and static assets organized and easy to reference from your components and styles.

---

## Folder Structure

A recommended structure for this directory:

- `src/assets/`
  - `icons/` – SVGs or PNGs for UI icons (e.g., add, edit, delete, check, uncheck)
  - `images/` – General images, backgrounds, and illustrations
  - `logos/` – App or company logos
  - `fonts/` – Custom web fonts (if any)
  - `mock/` – Placeholder images or demo assets (optional)

You can adjust or extend this structure as the project grows, but try to keep a clear separation by asset type.

---

## Usage Guidelines

### 1. Importing Assets in Code

For TypeScript/JavaScript modules:

- Images (PNG, JPG, SVG as files):

  - React components:
    - `import AddIcon from '../assets/icons/add.svg';`
    - `import EmptyStateImg from '../assets/images/empty-state.png';`

  - Usage in JSX:
    - `<img src={AddIcon} alt="Add task" />`
    - `<img src={EmptyStateImg} alt="No tasks yet" />`

- SVG as React components (if configured via SVGR or similar tooling):

  - `import { ReactComponent as CheckIcon } from '../assets/icons/check.svg';`
  - `<CheckIcon aria-hidden="true" />`

Check your bundler or framework configuration to confirm how SVGs are handled.

### 2. Referencing Assets in Styles

If your build setup supports resolving `url()` paths in CSS/SCSS:

- `background-image: url('../assets/images/background-pattern.png');`

For CSS Modules or SCSS, keep paths relative to the stylesheet file.

---

## Asset Conventions

To keep the assets maintainable:

1. **Naming**
   - Use lowercase, kebab-case file names:
     - `add-task.svg`
     - `delete-task.svg`
     - `empty-state-illustration.png`
   - Prefer descriptive names that reflect the asset’s purpose.

2. **Formats**
   - Icons: Prefer SVG for crisp, scalable icons.
   - Photos or complex images: Use optimized PNG or JPEG.
   - Backgrounds/illustrations: Use SVG where possible; otherwise optimized PNG/JPEG.
   - Consider WebP or AVIF for large images if supported by your build and target browsers.

3. **Optimization**
   - Run SVGs through an optimizer (e.g., SVGO) to reduce size.
   - Compress large images before committing them.
   - Avoid embedding very large assets directly in the repository when possible.

4. **Accessibility**
   - Provide meaningful `alt` text for images that convey information.
   - Use empty `alt=""` for purely decorative images.
   - For icon-only buttons, ensure accessible labels via `aria-label` or visually hidden text.

---

## Typical Assets for the To-Do App

You may want to include:

- **Icons**
  - `add-task.svg` – Add new task
  - `edit-task.svg` – Edit existing task
  - `delete-task.svg` – Delete task
  - `check.svg` / `uncheck.svg` – Mark task complete/incomplete
  - `filter.svg` – Filter or sort tasks
  - `menu.svg` – Navigation or options menu
  - `theme-toggle.svg` – Light/dark mode toggle (if applicable)

- **Images**
  - `empty-state.png` or `.svg` – Shown when there are no tasks
  - `onboarding-illustration.png` – Optional onboarding or welcome screen
  - `background-pattern.png` – Optional subtle background

- **Logos**
  - `app-logo.svg` – Main logo for header or splash screen
  - `app-logo-icon.svg` – Compact logo for favicon or mobile icon

---

## Where to Place New Assets

- Place **icons** in `src/assets/icons/`.
- Place **general images** (illustrations, backgrounds, screenshots) in `src/assets/images/`.
- Place **logos** in `src/assets/logos/`.
- Place **custom fonts** in `src/assets/fonts/` and ensure they are declared in your global styles.
- Place **temporary or demo assets** in `src/assets/mock/` and remove them before production if not needed.

---

## Referencing from Components

Example (React-style usage):

- `src/components/TodoList.tsx`
  - `import EmptyStateImg from '../assets/images/empty-state.svg';`
  - `import AddIcon from '../assets/icons/add-task.svg';`

  - Use in JSX:
    - `<img src={EmptyStateImg} alt="No tasks yet" />`
    - `<button type="button" aria-label="Add task"><img src={AddIcon} alt="" /></button>`

Adjust the import paths based on your actual file structure.

---

## Version Control Recommendations

- Do commit:
  - Optimized SVGs and images that are part of the UI.
  - Logos and branding assets.
  - Fonts that are licensed for distribution with the app.

- Avoid committing:
  - Extremely large raw assets (e.g., uncompressed photos, design source files).
  - Temporary exports or unused variants.

If you need to store large or source design files (e.g., Figma, Sketch, PSD), consider using a separate design repository or cloud storage.

---

## Updating or Replacing Assets

When updating assets:

1. Keep the same file name if you want to avoid changing import paths.
2. If you change file names or locations:
   - Update all imports in the codebase.
   - Run the app and verify that all images and icons render correctly.
3. Remove unused assets to keep the repository clean.

---

## Customization for Different Themes

If your to-do app supports themes (e.g., light/dark):

- Consider separate subfolders:
  - `src/assets/icons/light/`
  - `src/assets/icons/dark/`
- Or use CSS variables and SVGs that adapt via `currentColor` to avoid duplicating icons.

---

## Summary

- Use this folder for all static visual assets.
- Keep a clear, consistent structure and naming convention.
- Optimize assets before committing.
- Reference assets via imports in components or `url()` in styles.
- Periodically clean up unused assets to keep the project lean.