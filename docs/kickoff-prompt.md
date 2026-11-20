# First prompt for Claude Code

Paste this into Claude Code after opening this folder:

---

Read CLAUDE.md and everything in docs/ and design/README.md. Then start
phase 1 (Foundation):

1. Scaffold a Next.js App Router + TypeScript (strict) project in this folder,
   keeping the existing files.
2. Add Docker Compose for Postgres, Prisma with the schema from
   docs/data-model.md, and a seed script with the Siargao Trip sample data.
3. Set up Auth.js, Tailwind with the tokens from docs/design-system.md,
   shadcn/ui, and the fonts.
4. Build the app shell: bottom tab bar under lg, sidebar at lg+, matching
   design/Main.dc.html and design/Desktop.dc.html.
5. Add Vitest, Playwright, ESLint/Prettier and a GitHub Actions workflow
   (lint, typecheck, test, build).
6. Fill in the Commands section of CLAUDE.md.

Show me the plan before writing code, and commit in small steps.
