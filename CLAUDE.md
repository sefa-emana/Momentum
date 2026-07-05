# Momentum — Arbeitsregeln für Claude

## Definition of Done (WICHTIG, gilt für jede Aufgabe)

Eine Aufgabe ist erst fertig, wenn die App **live und für den Owner testbar**
ist. Der Abschluss jeder Implementierung umfasst zwingend, in dieser
Reihenfolge:

1. Implementieren → Reviewen → Testen (Typecheck, Lint, Unit, Build, E2E).
2. Committen und auf den Arbeitsbranch pushen.
3. **Deployment sicherstellen:** Nach `main` mergen und pushen — nur
   `main`-Deployments erreichen GitHub Pages (das `github-pages`-Environment
   blockiert andere Branches). Danach den CI-Lauf auf `main` beobachten, bis
   der Deploy-Job grün ist.
4. Erst melden, wenn die Live-URL aktualisiert ist:
   https://sefa-emana.github.io/Momentum/

Niemals mit „fertig" abschließen, solange der Deploy nicht verifiziert ist.

## Projekt-Kontext

- Private App nur für den Owner — **keine Monetarisierung**, kein Release,
  local-first, keine Accounts, kein Backend.
- Jede Mechanik muss psychologisch/trainingswissenschaftlich fundiert sein
  (aktuelle Studien; Belege in `docs/PSYCHOLOGY.md` fortschreiben).
  Grundprinzip: motivierend, nie bestrafend; Progressive Overload ehrlich
  abbilden; Overreaching nie belohnen.
- Strategie und offene Themen: `docs/ROADMAP.md`.
- Architektur: gesamte Spiellogik als reine Funktionen in `src/domain/`
  (deterministisch aus der Historie ableitbar — Replay-Konsistenz von
  `rebuildFromWorkouts` nie brechen), Store persistiert nur Rohdaten
  (IndexedDB primär, localStorage-Spiegel).
- Design: „Glass Chrome, Solid Content" (Liquid-Glass-Token-System in
  `src/ui/theme.css`, Dark + Light), Lucide-Icons statt Emojis, deutsche UI.

## Verifikation lokal

```bash
npx tsc -b --noEmit && npm run lint && npm test && npm run build
PW_CHROMIUM=/opt/pw-browsers/chromium npm run e2e
```
