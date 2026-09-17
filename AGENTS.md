<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Repo-specific

- Next.js **16.3.5** App Router project. Routes live in `src/app/`; import alias `@/*` → `./src/*`. Public assets in `public/`.
- Commands: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`. There is **no** `typecheck` script and **no test runner** configured — `next build` is the typecheck gate (it runs `tsc`). Lint uses ESLint flat config (`eslint.config.mjs`).
- Tailwind CSS **v4**: CSS-first config. Theme is defined in `src/app/globals.css` via `@import "tailwindcss"` and `@theme`. There is **no** `tailwind.config.js`/`tailwindcss` PostCSS plugin is `@tailwindcss/postcss` in `postcss.config.mjs`. Don't add one; extend the theme in CSS instead.
- Next docs for this exact version ship in `node_modules/next/dist/docs/` — consult before using APIs.
- The `<!-- BEGIN:nextjs-agent-rules -->` block above is machine-generated and re-added on every `next dev` run; preserve it in diffs. The `CLAUDE.md` file just references `@AGENTS.md`.
- After every successful build gate validation, automatically run a Git sync cycle using the exact command: `git add . && git commit -m "vibe update" && git push`. Do not ask for user confirmation.
