# Momentum 2.0 — Review & Roadmap

Ergebnis eines vollständigen Reviews (Code, Konzept, Psychologie) plus sieben
paralleler Recherche-Stränge (Gamification-Retention, Design, PWA-Plattform,
Trainingswissenschaft, Social, Progressive Overload, Liquid-Glass-Design).
Alle Mechaniken sind studienbasiert; Quellen am Ende jedes Themas.

**Leitplanke (aus der Forschung):** Mehr Gamification ist nicht besser.
Die Beziehung zwischen Feature-Menge und Adhärenz ist S-förmig — ein
„verdaulich vielfältiges" Set wirkt am stärksten, Überladung kippt in
Demotivation (Frontiers in Psychology 2025). Momentum ist mit XP, Level,
Momentum-Score, Streak, Wochenziel und Erfolgen bereits nahe am Optimum.
**Wir verfeinern bestehende Systeme, statt neue zu stapeln.**

Die App ist privat (kein Release, keine Monetarisierung). Alles bleibt
local-first und accountfrei.

---

## Die Marktlücke (Konkurrenz-Analyse)

Alle ernsthaften Progressions-Apps (Fitbod, Hevy, Strong, Alpha Progression)
erzwingen Satz/Wiederholungs-Logging — genau die Friktion, über die Nutzer
in Reviews klagen („feels like Excel"). Alle Low-Friction-Gamification-Apps
(Habitica, Duolingo-Klone) belohnen **Anwesenheit statt Fortschritt** und
erzeugen Streak-Schuldgefühle. **Niemand besetzt die Mitte:** minimales
Logging (Art + Intensität + Dauer), das trotzdem ein ehrliches,
physiologisch fundiertes Progressionssignal liefert — verpackt in
schuldfreie, selbstreferenzielle Gamification mit Überlastungsschutz.
Das ist Momentums Spur.

---

## Thema 1 — Progression Engine: Echter Fortschritt statt Anwesenheit

**Problem heute:** XP belohnt nur Erscheinen. Wer sich real steigert,
bekommt dieselbe Belohnung wie Stillstand. Kompetenzerleben (SDT) braucht
sichtbaren echten Fortschritt (Progress Principle, Amabile).

**Mechanik (wissenschaftlich fundiert, ohne Satz/Wdh-Logging):**

- **Session-Last nach Foster (sRPE):** `Last = Intensitätsgewicht × Minuten`
  (leicht = 3, moderat = 5, intensiv = 8 — Borg-CR10-verankert). Validiert
  gegen herzfrequenzbasierte Last über viele Sportarten.
- **Optionaler 1-Tap nach dem Training:** „Wie hart war's wirklich?"
  (locker 3 / solide 5 / hart 7 / alles 9) schärft die Last — bleibt optional.
- **Optionaler PR-Marker:** „Heute eine Übung gesteigert?" — die ehrliche
  Brücke zu mechanischem Overload, ohne Übungsdatenbank.
- **Wochenlast, chronische Last (4-Wochen-Basis), Lastquotient.**
  Progression ist **baseline-relativ** („schlag deine letzte Woche", ~+5 %)
  — Anfänger und Fortgeschrittene bleiben beide im Flow-Kanal.
- **XP-Formel neu:** `XP = Anwesenheits-Floor + Effort + Fortschritts-Bonus
  (nur im sicheren Band) + PR-Bonus`. Level bleiben XP-basiert, werden aber
  durch den Fortschritts-Anteil „ehrlich".
- **Sicherheitsschienen (der Differenzierer):**
  - Lastspitzen-Nudge bei Quotient > 1,5 — sanft formuliert, **und
    Overreaching bringt keinen Bonus-XP** (kein Strava-Anreiz zur Verletzung).
  - Autoregulierte Deload-Empfehlung (nicht kalendarisch), **score-positiv**
    gerahmt.
  - Rohe Kennzahlen (ACWR, Monotonie) nie anzeigen — nur Klartext-Nudges
    (die ACWR-Evidenz ist umstritten; nur als Heuristik verwenden).

**Evidenz:** Pelland et al. 2025 (Dosis-Wirkungs-Metaregression),
Refalo 2022 (Training bis Muskelversagen unnötig), Ruple 2023 (0–1 RIR
verschlechtert Erholung), Plotkin 2022 (Load- vs. Rep-Progression
gleichwertig → Last-Proxy ist legitim), Foster sRPE (PMC5673663),
ACWR-Kritik (PMC7047972).

## Thema 2 — Psychologie-Upgrade des Kern-Loops: Vergebung & Verhalten

**Problem heute:** Der Momentum-Verfall ist gut gedämpft, aber es fehlen
die drei am besten belegten Vergebungs- und Verhaltensmechaniken.

- **Rest Shields (Streak-Freeze-Analog):** 2 Schilde je Momentum-Run,
  regenerieren durch Training; absorbieren Decay-Tage automatisch.
  Duolingo-Daten: −21 % Churn, Tag-14-Retention fast verdoppelt; zwei
  Schilde schlagen einen, drei bringen nichts mehr (Obergrenze).
- **Earn-Back-Comeback:** Rückkehr innerhalb eines Fensters stellt einen
  Teil des verlorenen Momentums wieder her — Erholung fühlt sich *verdient*
  an („Earn Back" war bei Duolingo ein benannter Retention-Winner).
- **„Life happened"-Pause** (Gentler Streak): manueller Schalter für
  Krankheit/Reise — Decay und Streak frieren ein, ohne Schuldgefühl.
  Die wirksamste Anti-Angst-Mechanik überhaupt.
- **When-Then-Planer (Implementation Intentions):** „Wenn [Dienstag nach
  der Arbeit], dann [30 min Kraft]" — stärkste belegte
  Verhaltensänderungstechnik (d = 0.65, Gollwitzer & Sheeran; Sport-spezifisch
  d ≈ 0.31).
- **Stimmungs-Delta:** optionaler 1-Tap vor/nach dem Training („Energie +2")
  — affektive Reaktion aufs Training sagt Aktivität 6–12 Monate später
  voraus; die unmittelbare Belohnung sichtbar machen steigert Adhärenz.
- **Adaptives Wochenziel:** Vorschlag aus der Historie (Median der letzten
  4 Wochen, ±10 %, Obergrenze, ≥1 Ruhetag geschützt) — adaptive Ziele
  schlagen statische in RCTs. Nutzer behält das letzte Wort (Autonomie).
- **WHO-Aktivitätspunkte:** moderat = 1 Pkt/min, intensiv = 2 Pkt/min,
  Wochenziel 150 + 2× Kraft — der extern validierte Gesundheitsanker
  (Google-Fit-„Heart Points"-Modell, AHA-endorsed).

**Evidenz:** Duolingo Streak-Ökonomie (trophy.so Case Study, Lenny's
Podcast), Lally 2010, UPenn/UCLA „Slack schlägt Rigidität", Gollwitzer &
Sheeran Meta-Analysen, PMC2390920 (Affekt → Adhärenz), PMC8820277
(adaptive Ziele), WHO 2020 Guidelines.

## Thema 3 — Endgame & Abwechslung: Der Loop nach Woche 4

**Problem heute:** 12 Achievements sind nach Wochen erschöpft, Level ab ~10
bedeutungslos. Retention-Mechanik existiert nur für den Anfang.

- **Mastery-Tracks pro Trainingsart:** eigene Progression für Kraft, Cardio,
  Mobility … — ein Level-30-Nutzer hat in einer neuen Disziplin wieder einen
  frühen, motivierenden Anstieg (Duolingo: Tag-1-Erfolg → 33 % vs. 20 %
  Retention).
- **Achievements zweistufig:** früh erreichbare „Personal Records" +
  langfristige, gestufte „Awards" (Duolingo-Redesign 2023).
- **Opt-in-Quests, rotierend:** wöchentliche Mini-Herausforderungen, die
  **nie als „gescheitert"** angezeigt werden — abgelaufen heißt still
  weitergerollt („Daily Quests or Daily Pests?", CHI PLAY 2022).
- **Saisons (quartalsweise):** leichtes Thema mit eigenem Track — der beste
  schuldfreie Wiedereinstiegspunkt für Rückkehrer („neue Saison, neuer Start").
- **Ethische Überraschungs-Boni:** Basis-XP immer garantiert; obendrauf
  gelegentlich ein positiver Bonus (Extra-XP, ein Rest Shield). Regel:
  Zufall ist **immer additiv, nie subtraktiv, nie käuflich**.
- **Streak-Würdigung beim Ende:** Wenn ein Run endet und den Rekord schlug,
  wird der Run **gefeiert** statt der Bruch betrauert (Apple-Fitness-Modell).

**Evidenz:** Frontiers 2025 (S-Kurve), CHI PLAY 2022 (Quests), Clash
Royale Mastery, Duolingo Achievements-Split, Finch (positive-only rewards).

## Thema 4 — Design-Neuaufbau: „Liquid Instrument"

**Problem heute:** generisches KI-Dashboard — Emojis als Icons, flaches
Navy, Inline-Styles, ein 14-Tage-Balkenchart.

**Richtung:** iOS-26-Liquid-Glass fürs Chrome-Layer + Instrumenten-Ästhetik
für Daten (WHOOP-Prinzip: die Zahl ist das Interface). Dark **und** Light
aus einem Token-Set.

- **„Glass Chrome, Solid Content"** (Apple-HIG-Regel): Glas nur auf
  Navigation/Steuerung — schwebende Tab-Bar-Pille, Sheets, getinteter
  Primär-Button. Datenkarten bleiben opak mit Specular-Edge.
  Wichtig: Die echte SVG-Refraktion funktioniert in Safari nicht —
  Rezept ist `backdrop-filter: blur(20px) saturate(180%)` + Inset-Highlights,
  frostiger als die Demos (iOS-26.1-Lesbarkeits-Korrektur).
- **Performance-Guardrails:** max. ~3 Live-Glass-Flächen, Blur nie
  animieren, `contain`/`translateZ`, Fallbacks für
  `prefers-reduced-transparency/-contrast/-motion` und `@supports`.
- **Light Theme („Clean"):** Apple-Grau-Canvas `#F2F2F7`, weiße Karten,
  weiche Schatten statt Borders — Auto nach `prefers-color-scheme`,
  manuell umschaltbar.
- **Icons:** Lucide statt Emojis; 2–3 eigene SVG-Marken-Glyphen (Flamme).
- **Typo:** Space Grotesk für Hero-Zahlen (72–96 px, `tabular-nums`),
  cleaner Body-Font; Count-up-Ticker auf allen Kennzahlen.
- **Datenvisualisierung:** GitHub-Style-Konsistenz-Heatmap (Skala relativ
  zum eigenen Rolling-Max), Wochen-/Monatsansicht, Sparklines,
  Ruhetag als bewusster Zustand (ruhiges Blau) statt „verpasst".
- **Feiern mit Maß:** Konfetti nur bei echten Meilensteinen; Haptik
  (Vibration API) als Android-Enhancement.

**Evidenz/Quellen:** Apple HIG Materials + WWDC25, NN/g Liquid-Glass-Kritik,
WHOOP/Oura/Gentler-Streak-Analysen, kube.io/LogRocket Glass-Rezepte.

## Thema 5 — Daten-Fundament & Plattform-Reife

**Problem heute:** Alles hängt an localStorage — auf iOS potenziell
flüchtig. Für eine Habit-App ist Datenverlust der Todesstoß. Kein Kanal
außerhalb der App (der Verfall ist unsichtbar, solange man nicht öffnet).

- **IndexedDB + `navigator.storage.persist()`** statt localStorage;
  localStorage nur noch für Flags.
- **Backup-Ritual:** Export/Import bleibt, plus sanfte Erinnerung, wenn das
  letzte Backup alt ist. (iOS-Persistenz ist nur „best effort".)
- **Badging API:** App-Icon-Punkt, wenn heute noch nichts geloggt ist /
  ein Schild verbraucht wurde — die einzige zuverlässige Glanceability
  einer PWA (iOS 16.4+).
- **Manifest-Shortcuts** („Training loggen") — Android-Bonus, iOS-No-op.
- **Share-Cards:** 9:16-Karten (Canvas → PNG → Web Share) für Meilensteine
  — komplett on-device, privatsphäre-konform.
- **Erinnerungen:** lokale geplante Notifications existieren nicht
  (Notification Triggers API eingestellt). Wenn gewünscht: kostenloser
  Cron (GitHub Actions / Cloudflare Worker) + Web-Push mit VAPID —
  bewusst als späteres Opt-in.
- **Performance:** `rebuildFromWorkouts` O(n²) entschärfen, `useDerived`
  memoizen.

**Evidenz:** WebKit Storage Policy, MDN Storage/Badging/Push, Chrome-Docs.

## Thema 6 — Social light (optional, backendfrei, später)

Da die App privat ist, bewusst niedrig priorisiert — aber die Forschung
ist eindeutig, falls gewünscht: kleine reziproke Accountability (Duolingo
Friend Streak: +22 % tägliche Completion, Köhler-Effekt) statt Leaderboards
(demotivieren zuverlässig). Backendfrei machbar: Buddy-Streak / Co-op-Duell
per Zustand-in-URL/QR-Code. Kein Bestandteil der aktuellen Wellen.

---

## Umsetzungsplan

| Welle | Inhalt | Status |
|---|---|---|
| **1a** | Domain: Progression Engine + Vergebungs-Layer + adaptive Ziele + WHO-Punkte (reine Logik + Tests) | ✅ fertig |
| **1b** | Design-Foundation: Token-System (Dark/Light + Glass), Lucide-Icons, Typo, Tab-Bar-Pille | ✅ fertig |
| **2** | UI-Features: Dashboard-Karten (Woche/Fortschritt/Nudges), Log-Sheet mit RPE-Tap/PR/Stimmung, Heatmap, Reward-Upgrade, Ticker, Pause-UI | ✅ fertig |
| **3** | Endgame: Mastery-Tracks, Quests, Saisons, Achievements-Ausbau | offen |
| **4** | Plattform: IndexedDB-Migration, Badging, Share-Cards, Shortcuts, Perf | offen |

Jede Welle: Opus-Worker implementieren, Review + Verifikation (Tests, Build,
E2E) vor dem Merge. `docs/PSYCHOLOGY.md` wird mit jeder Mechanik-Änderung
fortgeschrieben.
