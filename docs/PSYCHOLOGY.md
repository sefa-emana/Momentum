# Die Psychologie hinter Momentum

Momentum ist bewusst evidenzbasiert gestaltet. Jede Mechanik lässt sich auf
etablierte Forschung zu Motivation und Habit-Bildung zurückführen. Dieses
Dokument erklärt die Prinzipien und die daraus abgeleiteten konkreten Zahlen
(siehe `src/domain/constants.ts`).

## 1. Self-Determination Theory (Autonomie, Kompetenz, Verbundenheit)

Autonome Motivation sagt langfristiges Dranbleiben deutlich besser voraus als
Motivation durch äußeren Druck.

- **Autonomie:** Nutzer wählen Trainingsart, Intensität, Dauer und ihr
  Wochenziel selbst.
- **Kompetenz:** XP, Level, Fortschrittsbalken und Streaks machen Fortschritt
  sichtbar.
- **Verbundenheit:** bewusst schlank gehalten (keine erzwungenen Leaderboards,
  die die nicht-kompetitive Mehrheit demotivieren).

## 2. Habit-Bildung / Fogg Behavior Model / Tiny Habits

Verhalten = Motivation × Ability × Prompt. Da Motivation schwankt, muss das
Verhalten leicht bleiben.

- **Tiny-Habit-Floor:** Auch 5 Minuten zählen und geben XP (`XP_BASE = 20`).
- **Sofortige positive Emotion** ist der „Klebstoff" der Gewohnheit: nach jedem
  Log gibt es sofort ein Belohnungs-Overlay (XP, Momentum, Erfolge).
- Lally et al. (2010): Ein verpasster Tag zerstört Habit-Bildung **nicht** —
  nur chronische Inkonsistenz tut das. Daraus folgt die Grace-Period (§4).

## 3. Streaks & „Never miss twice"

Streaks wirken über **Loss Aversion** (ein Verlust wiegt ~2× schwerer als ein
gleich großer Gewinn). Rigide Alles-oder-Nichts-Streaks führen aber nach einem
Bruch zum „What-the-Hell"-Aufgeben.

- **Never-miss-twice-Regel** (Atomic Habits): Die Streak überlebt einen
  einzelnen Pausentag und bricht erst, wenn zwei Tage in Folge fehlen. Rest ist
  gesund. Siehe `src/domain/streak.ts`.

## 4. Momentum-Verfall („Rückfall") — motivierend statt bestrafend

Der Verfall nutzt Loss Aversion, aber gedämpft, damit die Erfahrung „Gewinnen"
bleibt und nicht in „Verlust vermeiden" (Angst) kippt.

- **Kontinuierliche 0–100-Skala** statt binärem Streak-Bruch.
- **Grace-Period:** 1 voller Ruhetag → **kein** Verfall (`MOMENTUM_GRACE_DAYS`).
- **Sanfte, beschleunigende Kurve:** `decay = 6 · (inaktiveTage − 1)^1.3`.
- **Floor bei 15** (`MOMENTUM_FLOOR`): Momentum fällt nie auf 0 — das Comeback
  ist immer nur eine Einheit entfernt.
- **Sprache** durchgehend positiv: „abgekühlt", „Comeback", „Momentum
  aufbauen" — nie „verloren" oder „versagt".

## 4a. Vergebungs-Layer: Rest Shields, Earn-Back & Pausen

Der Verfall ist gut gedämpft — aber die drei am besten belegten Vergebungs­
mechaniken fehlten. Sie machen die App angstfrei, ohne die Konsistenz-Belohnung
zu verwässern.

**Prinzip → Rest Shields (Streak-Freeze-Analog).** Duolingo-Daten zu
Streak-Freezes: −21 % Churn, Tag-14-Retention nahezu verdoppelt. Wichtig ist die
Dosis — „zwei Schilde schlagen eins, drei bringen nichts mehr". Und: verdient
schlägt gekauft (Earn-Back > Buy-Back).

- **Mechanik:** Jeder Momentum-Run startet mit 2 Schilden. Ein Schild
  regeneriert je 4 aktive Trainingstage (Obergrenze 2). Ein Schild absorbiert
  automatisch je einen Verfalls-Tag *jenseits* der Grace-Period, **bevor** die
  Verfallskurve greift. Ein Gap von 4 Tagen (= 3 inaktive Tage = 1 Grace +
  2 Schild-absorbiert) kostet so null Momentum. Fällt Momentum trotzdem bis auf
  den Floor und kommt es zum Comeback, füllt der neue Run die Schilde wieder
  auf 2. Alles deterministisch im Momentum-Fold berechnet — kein manuelles
  Verbrauchen, keine Kaufoption.
- **Konstanten:** `SHIELD_START = 2`, `MAX_SHIELDS = 2`,
  `SHIELD_EARN_ACTIVE_DAYS = 4`.

**Prinzip → Earn-Back-Comeback.** „Earn Back" war bei Duolingo ein benannter
Retention-Winner: ein Teil des Verlorenen zurückzuverdienen fühlt sich *verdient*
an, nicht geschenkt. Statt eines flachen Bonus skaliert die Rückkehr jetzt mit
dem, was die Pause real gekostet hat.

- **Mechanik:** `comebackGain = clamp(15 + round(0,5 · verlorenesMomentum), 15,
  40)`. Wer aus großer Höhe zurückkommt, bekommt spürbar mehr zurück; wer ohnehin
  am Floor stand, bekommt nur den Basis-Gain — ehrlich und gedeckelt (nie eine
  volle Auslöschung der Pause).
- **Konstanten:** `MOMENTUM_GAIN = 15`, `COMEBACK_GAIN_MAX = 40`,
  `COMEBACK_GAP_DAYS = 3`.

**Prinzip → „Life happened"-Pause (Gentler Streak).** Die wirksamste
Anti-Angst-Mechanik überhaupt: ein manueller Schalter für Krankheit/Reise. Tage
innerhalb einer Pause zählen als *weder aktiv noch inaktiv* — Verfall und Streak
frieren ein, ohne Schuldgefühl.

- **Mechanik:** `Pause = { from, to }` (ISO-Daten, `to = null` = noch aktiv,
  höchstens eine aktive Pause). Pausierte Tage werden in jedem Gap abgezogen —
  sowohl im Momentum-Fold als auch in der Streak-Berechnung. Schilde werden für
  pausierte Tage nicht verbraucht.

## 5. Goal-Setting Theory (Locke & Latham)

Spezifische, herausfordernde, selbst gesetzte Ziele schlagen „gib dein Bestes".

- **Wochenziel** ist nutzergesetzt (Default 4), spezifisch und leicht fordernd.
- **Live-Feedback** „x / Ziel" auf dem Dashboard.
- **Fresh Start** jeden Montag (ISO-Woche) als natürlicher Neuanfang.
- Erreichen gibt einen spürbaren XP-Bonus (+150 XP).

**Adaptives Wochenziel.** Adaptive Ziele schlagen statische in RCTs
(PMC8820277). Momentum schlägt aus der Historie ein neues Ziel vor, ohne es je
zu erzwingen (Autonomie bleibt).

- **Mechanik:** `suggestWeeklyGoal` zählt unter den letzten 4 abgeschlossenen
  ISO-Wochen die Ziel-Treffer. ≥ 3 Treffer → +1 (gedeckelt bei 6, schützt ≥ 1
  Ruhetag); ≤ 1 Treffer → −1 (Boden 2); sonst behalten. Reine Empfehlung — der
  Nutzer entscheidet.
- **Konstanten:** `ADAPTIVE_GOAL_MAX = 6`, `ADAPTIVE_GOAL_MIN = 2`.

## 6. Belohnungen & Overjustification vermeiden

Erwartete extrinsische Belohnungen können intrinsische Motivation verdrängen
(Deci & Lepper).

- Erfolge sind an **echte Meilensteine** gekoppelt (nicht inflationär).
- Sie werden als **Kompetenz-Signal** und als **Überraschung** präsentiert
  (Reward-Overlay), nicht als vorab versprochene Bedingung.
- Momentum koppelt in die Belohnung (Bonus-XP = Momentum ÷ 5): Konsistenz
  verstärkt sich selbst.

## 7. XP-Kurve & Leveling

Früh schnell (sofortiges Erfolgsgefühl), später fordernder.

- `Gesamt-XP bis Level L = 100 · (L−1)^1.5`.
- Level 1→2: 100 XP (eine gute Einheit), Level 10→11: ~3162 XP.

## 8. Progression Engine: echter Fortschritt statt Anwesenheit

**Prinzip.** XP belohnte bisher nur Erscheinen — wer sich real steigert, bekam
dasselbe wie Stillstand. Kompetenzerleben (SDT) und das Progress Principle
(Amabile) brauchen *sichtbaren echten* Fortschritt. Die Progression ist
baseline-relativ („schlag deine letzte Woche"), damit Anfänger und
Fortgeschrittene beide im Flow-Kanal bleiben.

- **Session-Last nach Foster (sRPE):** `Last = Intensitätsgewicht · Minuten`
  (leicht 3, moderat 5, intensiv 8 — Borg-CR10-verankert, PMC5673663). Gegen
  herzfrequenzbasierte Last über viele Sportarten validiert → legitimer
  Progressions-Proxy ohne Satz/Wdh-Logging (Plotkin 2022: Last- vs.
  Wdh-Progression gleichwertig). Ein optionaler Post-Session-Tap („Wie hart
  war's wirklich?", `feel` 3/5/7/9) schärft die Last.
- **XP-Fortschritts-Boni obendrauf** (Basis-Formel unverändert):
  - `PR_BONUS_XP = 30` für einen ehrlich markierten persönlichen Rekord
    (`prBeaten`) — die Brücke zu mechanischem Overload ohne Übungsdatenbank.
  - `PROGRESS_BONUS_XP = 40`, einmal pro ISO-Woche, für die erste Einheit, die
    die Wochenlast der Vorwoche übertrifft.
- **Sicherheitsschienen (der Differenzierer):** Rohe Kennzahlen (ACWR,
  Monotonie) werden **nie** angezeigt — die ACWR-Evidenz ist umstritten
  (PMC7047972), wir nutzen sie nur als interne Heuristik für Klartext-Nudges.
  - Lastspitzen-Nudge bei `loadRatio > 1.5` **und** akuter Last ≥ 300 AU
    (`overreachStatus`) — so sehen Anfänger nie einen Alarm.
  - **Overreaching bringt keinen Bonus-XP:** bei erhöhter Last entfallen PR- und
    Fortschritts-Bonus (kein Strava-Anreiz zur Verletzung; Refalo 2022: Training
    bis Muskelversagen unnötig, Ruple 2023: 0–1 RIR verschlechtert Erholung).
  - Deload-Nudge (`monotonyStatus`): hohe Monotonie (> 2,0) *und* Wochenlast im
    eigenen oberen Terzil der letzten 8 Wochen — score-positiv gerahmt, nicht
    kalendarisch.
- **Konstanten:** `INTENSITY_RPE`, `LOAD_DURATION_CAP_MIN = 180`,
  `LOAD_RATIO_ELEVATED = 1.5`, `PR_BONUS_XP`, `PROGRESS_BONUS_XP`.
- **Evidenz:** Pelland 2025 (Dosis-Wirkungs-Metaregression), Foster sRPE
  (PMC5673663), Plotkin 2022, Refalo 2022, Ruple 2023, ACWR-Kritik (PMC7047972).

## 9. WHO-Aktivitätspunkte: der externe Gesundheitsanker

**Prinzip.** Neben der selbstreferenziellen Gamification braucht es einen
extern validierten Anker (WHO 2020; Google-Fit-„Heart Points", AHA-endorsed) —
er verankert die App in echter Gesundheit statt reiner Punkte-Logik.

- **Mechanik:** moderat = 1 Punkt/min, intensiv = 2 Punkte/min, leicht 0;
  summiert über die ISO-Woche. Wochenziel 150 Punkte + 2× Kraft
  (`strengthSessionsThisWeek`).
- **Konstanten:** `WHO_POINTS_PER_MIN`, `WHO_WEEKLY_POINTS_TARGET = 150`,
  `WHO_WEEKLY_STRENGTH_TARGET = 2`.

## 10. Stimmungs-Delta: die unmittelbare Belohnung sichtbar machen

**Prinzip.** Die affektive Reaktion aufs Training sagt körperliche Aktivität
6–12 Monate später voraus (PMC2390920). Wer sieht, dass Training die Stimmung
hebt, bleibt eher dran.

- **Mechanik:** optionaler 1-Tap vor/nach dem Training (`moodBefore`,
  `moodAfter`, je 1–5). Rein optional, kein Zwang — das Delta macht die
  unmittelbare positive Emotion sichtbar (Fogg: „Klebstoff" der Gewohnheit).

## Quellen (Auswahl)

- Self-Determination Theory — Ryan & Deci; NN/g „Autonomy, Relatedness,
  Competence".
- BJ Fogg — Fogg Behavior Model, Tiny Habits.
- Lally et al. (2010), *European Journal of Social Psychology* — Habit-Bildung.
- Kahneman & Tversky — Loss Aversion / Prospect Theory.
- James Clear, *Atomic Habits* — „Never miss twice".
- Locke & Latham — Goal-Setting Theory.
- Deci, Koestner & Ryan — Overjustification / intrinsische Motivation.
- Duolingo Engineering/Research — Streak-, Freeze- & Earn-Back-Ökonomie
  (trophy.so Case Study; −21 % Churn, „two beats one").
- Foster — Session-RPE-Modell zur Trainingslast (PMC5673663).
- Pelland et al. 2025 — Dosis-Wirkungs-Metaregression (Progression).
- Plotkin 2022 — Load- vs. Rep-Progression gleichwertig.
- Refalo 2022 / Ruple 2023 — Training nahe Muskelversagen: Ertrag vs. Erholung.
- ACWR-Kritik — PMC7047972 (nur als Heuristik verwenden, nie roh anzeigen).
- Gentler Streak — „Life happened"-Pause als Anti-Angst-Mechanik.
- Adaptive Ziele — PMC8820277 (adaptiv schlägt statisch in RCTs).
- WHO 2020 Physical Activity Guidelines; Google-Fit „Heart Points".
- Affekt → Adhärenz — PMC2390920 (affektive Reaktion sagt Aktivität voraus).
