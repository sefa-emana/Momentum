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
  Intensität und Dauer. Auch 5 Minuten zählen. Optional: Session-RPE-Tap
  („Wie hart war's wirklich?"), PR-Marker und Stimmungs-Tap.
- **Progression Engine** — Trainingslast nach Fosters validiertem
  sRPE-Modell (Intensität × Dauer). XP belohnen echten Fortschritt relativ
  zur eigenen Baseline („schlag deine letzte Woche"), nie Overreaching:
  Bei steilen Lastsprüngen pausieren Boni und ein sanfter Hinweis erscheint.
- **XP & Level** — Anwesenheits-Floor + Effort + Fortschritts-/PR-Boni,
  früh belohnende, später fordernde Level-Kurve.
- **Momentum** — kontinuierliche 0–100-Skala mit Vergebungs-Layer:
  Rest Shields fangen verpasste Tage ab, „Life happened"-Pausen frieren
  alles ein, Comebacks stellen verlorenes Momentum teilweise wieder her.
- **Streaks** nach der „Never miss twice"-Regel, pausenfest.
- **Wochenziele** — selbst gesetzt, mit adaptivem Vorschlag aus der eigenen
  Historie und WHO-Aktivitätspunkten (150/Woche + 2× Kraft) als
  Gesundheitsanker.
- **Endgame** — Mastery-Tracks pro Trainingsart, rotierende Opt-in-Quests
  (verschwinden still statt zu „scheitern"), gestufte Erfolge,
  deterministische Überraschungs-Boni (immer additiv).
- **Konsistenz-Heatmap** — GitHub-Style, relativ zur eigenen Bestmarke.
- **Design** — Liquid-Glass-Chrome (iOS-26-Stil, Safari-kompatibel) mit
  solidem Content-Layer, Dark & Clean-Light aus einem Token-Set,
  Lucide-Icons, Space-Grotesk-Zahlen, reduzierte-Bewegung-Fallbacks.
- **PWA** — installierbar, offline-fähig, App-Badge-Erinnerung,
  Manifest-Shortcut, Share-Cards (on-device gerendert).
- **Lokal & privat** — alle Daten im Browser: IndexedDB als Quelle der
  Wahrheit, localStorage als Spiegel, `storage.persist()` plus
  Backup-Export/-Import mit Frische-Hinweis. Kein Backend, keine Accounts.

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

Push auf `main` oder einen `claude/**`-Branch löst die GitHub-Actions-Pipeline
(`.github/workflows/ci.yml`) aus: Typecheck → Lint → Unit-Tests → Build →
E2E-Tests → Deploy auf **GitHub Pages**.

### Einmalige Aktivierung von GitHub Pages

GitHub Pages muss pro Repository **einmal** freigeschaltet werden — das ist die
einzige manuelle Aktion:

1. **Repository → Settings → Pages → Build and deployment → Source:**
   `GitHub Actions` auswählen.
2. Falls das Repo **privat** ist: GitHub Pages ist für private Repos nur mit
   einem bezahlten Plan verfügbar. Auf dem Free-Plan das Repo unter
   **Settings → General → Change repository visibility** auf **public** stellen
   (die App enthält keinerlei Geheimnisse — reiner Frontend-Code, Daten liegen
   nur lokal im Browser).

Danach deployt jeder weitere Push automatisch. Die Live-URL ist dann
`https://<user>.github.io/Momentum/`.

> Hinweis: Aus dieser automatisierten Umgebung heraus sind das Umschalten der
> Repo-Sichtbarkeit und das Aktivieren von Pages per API gesperrt — diese
> beiden Klicks muss der Repo-Owner einmalig selbst machen.

Der Vite-`base`-Pfad ist `/Momentum/` (Projekt-Site). Für ein Deployment unter
anderem Pfad `BASE_PATH` setzen.

## Lizenz

MIT
