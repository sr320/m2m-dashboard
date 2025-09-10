# Shellfish Environmental Monitor (Mock)

Ready-to-commit Vite + React (TypeScript) with Tailwind CSS, minimal local UI components, Recharts, and a GitHub Pages workflow.
Configured for GitHub Pages at **https://sr320.github.io/m2m-dashboard/**.

## Quickstart
```bash
npm i
npm run dev
```

## Deploy to GitHub Pages
1. Create a GitHub repo named **m2m-dashboard** under **sr320** and push.
2. The `vite.config.ts` already has `base: '/m2m-dashboard/'`.
3. In GitHub → Settings → Pages → **Build and deployment**: Source = **GitHub Actions**.
4. Push to `main` — the included workflow will publish to:
   `https://sr320.github.io/m2m-dashboard/`

## Customize
- **Sites**: edit the `SITES` array in `src/App.tsx`.
- **Thresholds**: edit `THRESHOLDS` (UI edits are mock, not persisted).
- **Real data**: replace the simulator with your API/WebSocket in the `useEffect` that updates `series`.
