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
- **Comeback-Boost:** Rückkehr nach ≥ 3 Tagen gibt +25 statt +15 Momentum und
  eine „Willkommen zurück"-Feier — genau der Moment, in dem Menschen sonst
  aufgeben.
- **Sprache** durchgehend positiv: „abgekühlt", „Comeback", „Momentum
  aufbauen" — nie „verloren" oder „versagt".

## 5. Goal-Setting Theory (Locke & Latham)

Spezifische, herausfordernde, selbst gesetzte Ziele schlagen „gib dein Bestes".

- **Wochenziel** ist nutzergesetzt (Default 4), spezifisch und leicht fordernd.
- **Live-Feedback** „x / Ziel" auf dem Dashboard.
- **Fresh Start** jeden Montag (ISO-Woche) als natürlicher Neuanfang.
- Erreichen gibt einen spürbaren XP-Bonus (+150 XP).

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

## Quellen (Auswahl)

- Self-Determination Theory — Ryan & Deci; NN/g „Autonomy, Relatedness,
  Competence".
- BJ Fogg — Fogg Behavior Model, Tiny Habits.
- Lally et al. (2010), *European Journal of Social Psychology* — Habit-Bildung.
- Kahneman & Tversky — Loss Aversion / Prospect Theory.
- James Clear, *Atomic Habits* — „Never miss twice".
- Locke & Latham — Goal-Setting Theory.
- Deci, Koestner & Ryan — Overjustification / intrinsische Motivation.
- Duolingo Engineering/Research — Streak- & Freeze-Mechaniken.
