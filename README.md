# 🔥 Momentum

**Ein evidenzbasierter, gamifizierter Sport-Tracker.** Tracke deine
Trainingseinheiten, sammle XP, steige Level auf, halte deine Streak — und baue
**Momentum** auf, das bei Inaktivität sanft abkühlt, dich aber nie im Stich
lässt.

> **Live-App:** https://sefa-emana.github.io/Momentum/
> Auf dem Handy im Browser öffnen und über „Zum Home-Bildschirm hinzufügen" als
> App installieren (PWA, funktioniert offline).

## Features

- **Training loggen** — Art (Kraft, Cardio, Mobility, Sport, Sonstiges),
  Intensität und Dauer. Auch 5 Minuten zählen.
- **XP & Level** — effort-basierte XP mit einer früh belohnenden,
  später fordernden Level-Kurve.
- **Momentum** — kontinuierliche 0–100-Skala. Ein Ruhetag schadet nie; längere
  Pausen kühlen dein Momentum langsam ab (Floor bei 15). Rückkehr nach einer
  Pause gibt einen Comeback-Boost.
- **Streaks** nach der „Never miss twice"-Regel — ein einzelner Pausentag bricht
  die Streak nicht.
- **Wochenziele** — selbst gesetzt, mit Live-Fortschritt und Bonus beim
  Erreichen.
- **Erfolge** — an echte Meilensteine gekoppelt, mit Bonus-XP.
- **PWA** — installierbar, offline-fähig, mobile-first.
- **Lokal & privat** — alle Daten liegen im Browser (localStorage). Backup-Export
  und Import inklusive.

Die psychologische Fundierung ist in [`docs/PSYCHOLOGY.md`](docs/PSYCHOLOGY.md)
dokumentiert.

## Tech-Stack

- **React 18 + TypeScript + Vite**
- **Zustand** (State + localStorage-Persistenz)
- **framer-motion** (Belohnungs-Animationen)
- **date-fns** (Datums-/Streak-Logik)
- **vite-plugin-pwa** (Service Worker, Manifest, Offline)
- **Vitest** (Unit-Tests) · **Playwright** (E2E, Desktop + Mobile)

Architektur: Die gesamte Spiel-Logik lebt als **reine Funktionen** in
`src/domain/` (XP, Momentum, Streak, Ziele, Erfolge). Momentum & Level werden
deterministisch aus der Trainings-Historie abgeleitet — dadurch ist alles
reproduzierbar und vollständig testbar. Der Store (`src/state/`) persistiert nur
Rohdaten.

## Entwicklung

```bash
npm install
npm run dev         # Dev-Server
npm test            # Unit-Tests (Vitest)
npm run e2e:install # Playwright-Browser einmalig installieren
npm run e2e         # End-to-End-Tests
npm run build       # Produktions-Build nach dist/
npm run preview     # Build lokal servieren
```

Zum Neu-Generieren der App-Icons aus `public/favicon.svg`:

```bash
node scripts/generate-icons.mjs
```

## Deployment

Push auf `main` (oder den Feature-Branch) löst die GitHub-Actions-Pipeline
(`.github/workflows/ci.yml`) aus: Typecheck → Lint → Unit-Tests → Build →
E2E-Tests → Deploy auf **GitHub Pages**. Die Pages-Umgebung wird beim ersten
Lauf automatisch aktiviert.

Der Vite-`base`-Pfad ist `/Momentum/` (Projekt-Site). Für ein Deployment unter
anderem Pfad `BASE_PATH` setzen.

## Lizenz

MIT
