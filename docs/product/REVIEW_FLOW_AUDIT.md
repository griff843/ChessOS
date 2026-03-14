# Chess-OS Review Flow Audit

Consolidated product audit covering UX quality, daily-use readiness, competitive positioning, and redesign plan for the game review flow.

Date: 2026-03-14

---

## Part 1: Review Flow UX Audit

### Executive Verdict

Good foundation, but needs targeted redesign/polish soon.

The review flow has a correct coaching logic chain (diagnosis, repair targets, repair evidence), solid data model, and clean dark-theme design language. But the experience currently feels like a developer-facing proof of correctness, not a coaching product. Three critical gaps prevent daily-driver quality: no chessboard, no actionable next-step, and no way to find the page without deep-linking.

### What Is Working

**Coaching logic is sound.** The three-layer narrative (what happened, what to train, how recurring is it) is the correct coaching structure. The bounded taxonomies (8 diagnosis categories, 9 repair targets, 5 evidence statuses) are well-designed and produce focused, believable output.

**Badge and color system is deliberate.** Danger for tactical/calculation, warning for opening/endgame, info for strategic, accent for time. Consistent across diagnosis and repair cards. Creates immediate visual priority.

**Template-based coaching text is clear.** Lines like "A miscalculation at Nxe5 caused a 280cp loss. The position required deeper calculation" are specific, actionable, and credibly authoritative. No overclaiming.

**The "First Losing Decision" block is the strongest single element.** Red-tinted border, monospace move notation, centipawn swing, before/after eval. This is the moment of truth and it reads clearly.

**SectionCard design language is clean and reusable.** Consistent header/body/subtitle pattern across all cards, with correct spacing and hierarchy.

**Import-to-diagnosis pipeline works.** The full path (upload PGN, analyze, expand game row, "View full diagnosis", game page, click "Diagnose Game") functions end-to-end.

### What Is Not Working

Listed in priority order by product impact.

#### P0 -- Blocks daily use

**No chessboard anywhere in the review flow.** The losing move has a FEN in the data model (`DiagnosisMove.fen`). The project has `react-chessboard` installed and uses it in the study player. But the game review page shows only algebraic notation and centipawn numbers. A chess coaching product that describes positions without showing them is fundamentally incomplete.

**No actionable CTA after diagnosis.** After the user reads "Your primary repair target is tactical pattern recognition," there is no button to generate a study session targeting that weakness, no link to relevant exercises, no "Start training this" action. The coaching narrative ends at identification with no bridge to action.

**The page is undiscoverable.** `/games/[gameId]` is not in the sidebar. There is no `/games` list page. There is no command palette entry. The only navigation path is Import results, expand a game row, click "View full diagnosis" (a small right-aligned link). Similarly, `/repertoire` is not in the sidebar.

#### P1 -- Significantly degrades the experience

**No game metadata on the review page.** The page header shows `gameId` and position count but no player names, date, result, opening name, or ECO code, all of which are available from PGN headers. The user sees "game26 . 47 positions" instead of "Griffin vs. Stockfish . Sicilian Najdorf . 0-1 . Mar 12, 2026".

**Three stacked cards feel like system output, not coaching.** The flow is DiagnosisCard, RepairTargetCard, RepairEvidenceCard, each with their own header, subtitle, and badge. The cards don't reference each other. They feel like three independent reports rather than one coach speaking.

**No loading states.** The game page loads diagnosis + all past diagnoses (for evidence computation) with no Suspense boundary or skeleton UI. The dashboard loads 22 artifacts in parallel with no loading indicator.

**"Back to Import" is the only escape route.** The game page header has a single link to `/import` regardless of how the user arrived. No breadcrumbs, no contextual navigation, no game list to return to.

#### P2 -- Polish issues

**Garbled Unicode on dashboard.** Center-dot separators in the objective/coaching sections render as garbled characters (double-encoded UTF-8). At least 6 instances.

**White cards in dark mode.** The import page metadata grid uses `bg-white/70`, creating jarring white rectangles in an otherwise dark theme.

**No mobile responsive layout.** Sidebar is fixed 224px with no collapse. Content overlaps at narrow viewports.

**Duplicate label maps.** `CATEGORY_LABELS` defined identically in both `diagnosis-card.tsx` and `repair-target-card.tsx`.

**"Game Loss Diagnosis" title before knowing if it was a loss.** The pre-diagnosis CTA says "Game Loss Diagnosis" but the engine handles non-losses too.

### Coaching Narrative Quality

The page does not tell a coherent story. The order of information is: primary cause, losing move details, contributing factors, stats, then a separate card for repair target, then another card for evidence. This interleaves coaching content with reference data and separates "what happened" from "what to do" across card boundaries.

Each block adds value individually, but the reading experience is fragmented. The system feels like it is reporting metadata, not coaching the user.

### Actionability

After reading the page, the user does NOT know what to do next. There is no CTA, no link to training, no bridge to a study session. The page is a dead end. This is the single biggest product gap in the review flow.

### Information Architecture

The hierarchy is wrong. The most important information (the critical position + why the game was lost) should be the visual anchor, but the chessboard is missing entirely. The losing move is buried inside the first of three cards behind a "PRIMARY CAUSE" uppercase label.

There are too many cards for the amount of information. Three SectionCards with three headers, three subtitles, and five uppercase section labels create visual overhead that exceeds the coaching content density.

The page is organized around system implementation (diagnosis function, repair function, evidence function) rather than user understanding (what happened, how bad, what to do).

### Visual Quality

The dark theme and card design language are premium. The badge color system is well-designed. Spacing and typography within individual cards are clean.

What breaks the quality: no board (text-only chess review feels like a log viewer), three separate card boundaries creating visual noise, and the stats row in DiagnosisCard wrapping awkwardly on narrow viewports.

### Trust and Credibility

The coaching text is appropriately confident without overclaiming. The labels and explanations are specific and grounded in engine data. The flow is trustworthy at the data level.

What undermines trust: the missing chessboard makes the user work harder to verify claims, the garbled Unicode signals lack of polish, and the absence of game metadata (player names, opening) makes the page feel disconnected from the actual game.

### Product Maturity

The review flow is not strong enough to continue building on without targeted polish. The missing chessboard and missing CTA are structural gaps, not cosmetic issues. Repertoire branch repair and other downstream features will need the same board visualization and coaching-narrative integration. Building those first means building on weak foundations.

---

## Part 2: Daily-Driver / Elite Execution Audit

### Daily-Driver Verdict

Ready for limited shadow-primary daily use.

The core training loop (generate session, solve exercises, get graded feedback, refresh insights, read coaching guidance, repeat) is genuinely complete and functional. The interactive chessboard, 5-tier grading, coaching insight panels, adaptive objective system, and session completion recap are all working. A serious player could use this daily and get value from it today.

What holds it back from "serious daily use" is not the coaching engine (which is surprisingly sophisticated) but operational friction: no session resume on browser close, the review queue has no direct "drill now" action, sessions are identified by opaque IDs, and the game diagnosis flow terminates without connecting to action.

### Current Strengths

**The training session itself is the product's strongest asset.** The study player has an interactive chessboard (480px, click-to-move + drag, flip button), 4 exercise types (tactical/recall/visualization/reconstruction), per-move coaching explanations with progressive hints, adaptive difficulty recommendations, and a progress rail. This is not a prototype. It is a functional training tool.

**The coaching engine is genuinely adaptive.** Session generation runs a full objective lifecycle: trend profiling, weakness detection, readiness forecasting, objective selection/escalation/rotation, intervention coaching with effectiveness tracking, and difficulty policy computation. The user makes exactly one choice (perspective: hero/opponent/both). Everything else is automated. This is more systematic than most human coaches for drill prescription.

**The completion-to-insights loop is closed.** Finishing a session writes progress atomically (results, analytics, progress store, review queue). Clicking "Refresh Insights" on the recap screen regenerates dashboard, coaching summary, curriculum plan, study plan, pattern intelligence, and readiness forecast. The Coach and Curriculum pages then render the updated guidance.

**The session completion recap is strong.** Trophy banner with accuracy, session coaching feedback (themes improved, themes struggling, recurring weakness, next session type), grade distribution, eval loss stats, hardest misses, mastery state changes, and five forward-action buttons.

**Exercise variety creates cognitive range.** Recall exercises (timed memorization, blind reconstruction), visualization exercises (study moves, answer with hidden board), and reconstruction exercises alongside standard tactical puzzles. Mixed sessions give cognitive variety that pure puzzle trainers don't offer.

### Current Weaknesses

#### Blockers to daily habit formation

**No session resume.** All study progress is client-side React state. If the user closes the browser, navigates away, or the page refreshes mid-session, all progress is lost. For a 10-exercise session this is tolerable. For daily use with interruptions, it is a real friction point that will break trust.

**Review queue is display-only.** `/review` shows overdue exercises with urgency scores but has no "Start Review Session" button. The user must mentally register what is overdue, navigate to Sessions, generate a new session, and hope the adaptive ranking incorporates those exercises. This indirect coupling undermines the urgency the review page tries to create.

**Sessions have no human-readable identity.** Sessions are named by auto-generated IDs (truncated to 20 chars). After two weeks of daily use, the session list is a wall of opaque strings. No dates on the list cards, no focus-area labels, no naming like "Tactical Recovery #3".

**The game diagnosis flow is a dead end.** After reading "Your primary repair target is tactical pattern recognition," there is no button to generate a session targeting that weakness, link to relevant exercises, or any bridge to action. The coaching narrative ends at identification.

**No chessboard on the game review page.** The losing move has a FEN in the data model. `react-chessboard` is installed and used in the study player. But the diagnosis page shows only algebraic notation and centipawn numbers. The study experience has a board; the review experience doesn't.

#### Significant friction

**Under-promotion is impossible.** The study board auto-promotes pawns to queen. If the engine's best move is an under-promotion (Rook, Bishop, Knight), the user literally cannot input the correct answer. This is an edge case, but it is a correctness issue that damages trust when it occurs.

**Dashboard information overload.** With all sections populated, the dashboard renders 18+ card groups. No collapsing, no tabs, no progressive disclosure. A daily user learns to ignore most of it, which means those insights are wasted computation.

**Garbled Unicode.** Center-dot separators in dashboard objective sections render as garbled characters. At least 6 instances. Small but visually jarring on a surface the user sees every day.

**No mobile responsive layout.** Fixed 224px sidebar with no collapse. Unusable on phone/tablet.

**Game review pages are undiscoverable.** No `/games` list page, no sidebar entry, no command palette command. Reachable only through import results. Similarly, `/repertoire` is not in the sidebar.

### Competitive Assessment

#### vs Chessable

Distance: far. Chess-OS does not have a repertoire course system. Chessable's core value (learn an opening repertoire through spaced repetition with visual board positions) is not replicated. Chess-OS's repertoire drill console exists but is hidden, uses text-input recall rather than board-based move entry, and has no course/book structure. Where Chess-OS has an edge is that its training comes from the user's own mistakes, not pre-packaged courses, and the adaptive objective system is more sophisticated than Chessable's flat spaced repetition. But Chessable's product polish, mobile app, and content library are leagues ahead.

Could Chess-OS reduce Chessable dependence? Not yet. The repertoire drilling system needs board-based interaction and discoverability before it competes.

#### vs Lichess

Distance: moderate on puzzles, close on analysis. Lichess puzzle storm and puzzle streak are faster, more varied (millions vs hundreds from your own games), and more addictive. Chess-OS's advantage is specificity: every exercise comes from a position where the user made a mistake, with grading calibrated to their history, and coaching explanations tied to their patterns. Lichess's game analysis is instant and visual but doesn't track longitudinal weakness patterns. Chess-OS's diagnosis/repair/evidence chain gives longitudinal intelligence that Lichess doesn't attempt.

Could Chess-OS reduce Lichess dependence? Partially. For targeted weakness drilling (not casual puzzle solving), Chess-OS is already more useful. For game analysis, not yet because Lichess shows the board and Chess-OS doesn't.

#### vs Chess.com

Distance: moderate. Chess.com's game review is immediate, visual, and polished. The user sees the board, the eval bar, and colored move annotations instantly after a game. Chess-OS requires manual PGN import, local pipeline execution, and then a separate diagnosis click. Chess.com's "Lessons" feature is broader in scope. However, Chess.com's personalization is shallow (generic "you made X inaccuracies" feedback). Chess-OS's coaching engine, with objective lifecycle, intervention escalation, portfolio rotation, pattern intelligence, and progression gates, is substantially more sophisticated in its training prescription. Chess.com tells you what happened; Chess-OS tells you what to do about it and tracks whether the intervention worked.

Could Chess-OS reduce Chess.com dependence? For post-game analysis, not yet (needs a board on the review page, and the import friction is high). For training prescription and drill, yes. Chess-OS's adaptive sessions are more targeted than Chess.com's puzzle recommendations.

#### vs Human Coach

Distance: complementary, not replacement. Chess-OS's coaching engine mimics a structured coaching methodology: objective setting, intervention, escalation, portfolio rotation, effectiveness tracking. For drill prescription, pattern tracking, and progress monitoring, it is more systematic than most human coaches. But it cannot conduct a conversation, cannot watch the user think, cannot detect emotional tilt or time-management habits during live games, and cannot provide creative training ideas.

Could Chess-OS reduce human coaching dependence? For the "what should I drill this week" component of coaching, yes. For the strategic guidance and motivation component, no. A serious player could use Chess-OS as their daily drill system and reduce coaching sessions from weekly to biweekly.

### Product Maturity Estimate

Chess-OS is a complete but rough training system. The engine is mature, the UI is functional but not polished, and the daily-use workflow has real gaps.

The coaching engine is the most advanced component. The 4-stage exercise ranking pipeline, objective lifecycle with intervention memory, pattern intelligence, and readiness forecasting represent genuine coaching logic that goes beyond what any commercial chess platform currently offers to consumers.

The study experience is the second strongest area. Interactive board, 4 exercise types, per-move coaching with hints, adaptive difficulty, session completion feedback.

The diagnosis flow (game review) is the weakest user-facing surface. No board, no forward CTA, text-only presentation.

The operational layer (navigation, discoverability, resume, session identity) is where daily-use friction lives. These are not architectural problems. They are finishing work.

Overall: the foundation is 80% there. The remaining 20% is what separates "interesting project" from "daily-driver tool."

### Highest-Leverage Next Move

Bridge the review queue to action. The single biggest daily-use gap is that the review queue shows urgency without enabling action. Adding a "Generate Review Session" button to `/review` that creates a session specifically from overdue/due-soon exercises would close the most visible gap in the daily loop, make the spaced-repetition system actionable, and give the user a reason to check `/review` daily (habit trigger, action, reward loop).

Second highest leverage: add session resume (checkpoint state to disk/localStorage on each exercise completion).

Third: add a board to the game review page with a forward CTA to generate a targeted session.

---

## Part 3: Review Flow Redesign Plan

### Proposed Target Review-Flow Structure

Reading order, top to bottom:

#### Layer 1: Game Context Bar

A compact horizontal bar replacing the current PageHeader. Shows the information a chess player looks for first: who played whom, what opening, result, and when.

Content: `{heroName} vs {opponentName} . {openingName} . {result} . {date}`

Data sources: Player names from `parsePgnHeaders()` on the raw PGN file. Opening from `opening-report.json` filtered by `sourceGameId`. Result inferred from `gameLost` + `finalEvalCp`. Date from `dataset.createdAt`. heroColor rendered as a small colored dot rather than text.

Fallbacks: If PGN is missing, show `gameId`. If opening not classified, omit. If result ambiguous, omit.

#### Layer 2: Critical Position Board

A display-only chessboard (320px) rendering `losingMove.fen`, oriented to the hero's perspective. The played move highlighted in red (from/to squares). Below the board: the move in monospace with eval swing and before/after eval annotation.

This replaces the current "First Losing Decision" red-bordered text block inside DiagnosisCard and elevates it to the dominant visual element.

#### Layer 3: Coaching Verdict

A single paragraph combining the diagnosis explanation with the repair target in one connected statement. Currently these are spread across two separate cards.

Current (two separate cards):
- DiagnosisCard: "A tactical oversight at Nxe5 cost 280cp. Practice pattern recognition for similar threats."
- RepairTargetCard: "Primary Target: Tactical Pattern Recognition"

Proposed (one connected statement):
"You lost this game to a tactical blunder at move 23. Your primary training target is tactical pattern recognition. Practice spotting similar threats before they cost material."

Composed from existing template text. No new generation step.

#### Layer 4: Cross-Game Evidence

Immediately below the verdict, a single compact line showing the evidence status. An inline badge + one sentence.

- Isolated: `First occurrence` "This is the first time this weakness has appeared."
- Emerging: `Emerging pattern` "Seen 2 times in your last 5 analyzed games."
- Recurring: `Recurring issue` "Seen 4 times in 5 games. This is a consistent weakness."
- Improving: `Improving` "This used to appear more often. Keep practicing."
- Persistent: `Persistent` "This has been appearing across 8 games. Prioritize this area."

Replaces the full RepairEvidenceCard (a SectionCard with its own header, subtitle, "Pattern Status" label, stats row, and explanation).

#### Layer 5: Action Bar

A prominent CTA: "Generate session targeting {primaryTarget}". Uses the existing `generateNewSession` server action. On success, redirect to `/study/{sessionId}`.

This element currently does not exist at all.

#### Layer 6: Contributing Factors

A collapsible section. Each factor shows: move reference, category badge, note, and a 120px mini-board if FEN is resolvable. FEN resolved by looking up `factor.ply` in the `TrainingDatasetRow[]` array already loaded on the page.

#### Layer 7: Game Stats

A quiet row at the bottom: Mistakes, Blunders, Total CP loss, Final eval. Same data as current, positioned last instead of mid-card.

#### Non-Loss Path

Game Context Bar + a simple centered message: "No clear loss detected in this game" with the `diagnosis.explanation` text below. No board, no repair targets, no evidence, no CTA.

#### Pre-Diagnosis Path

Game Context Bar + the current GameDiagnosisActions card with the title changed from "Game Loss Diagnosis" to "Game Diagnosis".

### Before vs After Model

Before: Three independent SectionCards (DiagnosisCard, RepairTargetCard, RepairEvidenceCard), each with their own title, subtitle, badge, and explanation. No board. No game metadata. No CTA. Information flows system-out (diagnosis, targets, evidence) rather than user-in (what happened, how bad, what to do).

After: One unified page with a board-anchored header, a single flowing coaching narrative, and a terminal action. The three data sources are still separate domain computations, but the UI renders them as sections of one coaching review.

### Main Takeaway Layer

The user should get this in the first 3 seconds of looking at the page:

A chessboard showing the critical position + one sentence explaining why they lost.

Everything else is supporting detail. If the user reads nothing below the board and the verdict sentence, they should still understand what happened and what to practice.

### Information Hierarchy

From most to least important:

1. Critical position (board) -- "this is where it went wrong"
2. Primary cause (category badge + one sentence) -- "this is why"
3. Training target (target label + one sentence) -- "this is what to practice"
4. Evidence status (inline badge + sentence) -- "this is how often it happens"
5. Action CTA (button) -- "do something about it"
6. Secondary targets (compact line) -- "also consider these"
7. Contributing factors (expandable list) -- "other mistakes in this game"
8. Game stats (quiet row) -- "the numbers"

### Action Layer

Primary action: "Generate session targeting {primaryTarget}" button. Creates a new study session. Initially uses the existing `generateNewSession("hero")`. The session will naturally incorporate the weakness through the adaptive ranking system (which already boosts exercises matching weak categories). Explicit category weighting is a follow-up enhancement.

Secondary action: "View in review queue" link to `/review`. Shows the user their overdue exercises, which will include exercises related to the diagnosed weakness if they have been studied before.

Tertiary action (non-loss games): "Return to Import" or "View next game". When no loss was detected, the page should get the user moving forward.

What should NOT be on this page: session history, mastery state details, curriculum planning. Those belong on Coach/Curriculum. The game review page is about one game.

### Design Guidance

#### Spacing

Use a single SectionCard for the entire coaching review (layers 2-8). Internal sections separated by `border-b border-border-subtle` dividers, not card boundaries. Board section: `p-6`. Verdict section: `p-5`. Everything else: `p-4`. Stats row: `px-4 py-3`. Vertical rhythm: `space-y-4` between internal sections.

#### Density

The current flow renders approximately 3 card headers, 5 uppercase labels, 4 badge groups, and 3 explanation paragraphs. The redesign should feel like 60% of that density by merging redundant labels and connecting prose. Remove all "PRIMARY CAUSE" / "PRIMARY TARGET" / "PATTERN STATUS" uppercase labels. Hierarchy should be communicated through size and position, not labels announcing what the next block is.

#### Card Usage

One SectionCard for the coaching review body. The Game Context Bar is NOT inside a card. It replaces the PageHeader and sits above the card. The GameDiagnosisActions (pre-diagnosis state) remains its own SectionCard.

#### Typography

Coaching verdict text: `text-sm text-text-secondary leading-relaxed`. The target label within it: `font-semibold text-text-primary`. Move notation: `font-mono text-sm` (unchanged). Stats: `text-xs text-text-muted` (unchanged). Category badge inside the verdict: same Badge component, same variants.

#### Color Semantics

Board highlight for the played move: `bg-danger/30` on from/to squares (red tint). Evidence badge colors: unchanged (info/warning/danger/success mapping is correct). Category badge colors: unchanged. CTA button: `bg-accent text-white` (solid accent).

#### Badge Usage

Reduce from approximately 6 badges on the current three-card flow to approximately 3: category badge (in verdict), evidence status badge (inline), and optionally secondary target badges (compact line). Remove the target badge from RepairTargetCard. The target label is embedded in the verdict text as bold text.

### Implementation-Safe Plan

#### What remains domain logic (no changes)

- `diagnoseGameLoss()` in `packages/training/src/diagnosis/` -- unchanged
- `generateRepairTargets()` in `packages/training/src/repair/` -- unchanged
- `evaluateRepairEvidence()` in `packages/training/src/repair/` -- unchanged
- `CATEGORY_TO_TARGET` mapping -- unchanged
- All type definitions -- unchanged

#### What remains derived UI (computed in page component)

- Repair targets computed on-the-fly from diagnosis -- unchanged
- Repair evidence computed on-the-fly from diagnosis history -- unchanged
- Game metadata loaded from PGN file -- new loading step, same pattern as existing `loadHeroColorByGameId()`
- Opening classification filtered from global report -- new loading step

#### What should NOT be refactored yet

- Do not persist repair targets or evidence as separate artifacts. On-the-fly computation is fast and avoids artifact staleness.
- Do not add FEN to `ContributingFactor` type in the domain package. Resolve FEN in the page component by looking up dataset rows by ply.
- Do not modify `generateNewSession` to accept a category filter. The initial CTA generates a standard session. Category-weighted generation is a follow-up.
- Do not build the `/games` list page in this milestone.
- Do not add games to the sidebar in this milestone.

#### New components to create

1. `PositionBoard` (`apps/web/src/components/ui/position-board.tsx`) -- reusable static chessboard wrapper. Props: `fen`, `orientation`, `size`, `highlightSquares`, `highlightColor`. Centralizes board colors and configuration.
2. `CoachingReview` (`apps/web/src/components/diagnosis/coaching-review.tsx`) -- unified review component replacing the three separate cards. Props: `diagnosis`, `recommendation`, `evidence`, `datasetRows`, `gameMetadata`.
3. `DiagnosisActionBar` (`apps/web/src/components/diagnosis/diagnosis-action-bar.tsx`) -- client component with the "Generate session" CTA. Props: `targetLabel`. Uses `useTransition` and `generateNewSession`.
4. `GameContextBar` (`apps/web/src/components/diagnosis/game-context-bar.tsx`) -- compact metadata bar. Props: `gameId`, `heroName`, `opponentName`, `openingName`, `result`, `date`, `heroColor`.

#### Shared constants to extract

`CATEGORY_LABELS` and `CATEGORY_VARIANT` to `apps/web/src/components/diagnosis/diagnosis-constants.ts`. Both existing card files import from here.

#### Files modified

- `apps/web/src/app/games/[gameId]/page.tsx` -- new data loading, replace three card renders with new components
- `apps/web/src/components/diagnosis/diagnosis-card.tsx` -- keep for backward compatibility, game review page stops using directly
- `apps/web/src/components/diagnosis/repair-target-card.tsx` -- same
- `apps/web/src/components/diagnosis/repair-evidence-card.tsx` -- same

#### Files created

- `apps/web/src/components/ui/position-board.tsx`
- `apps/web/src/components/diagnosis/coaching-review.tsx`
- `apps/web/src/components/diagnosis/diagnosis-action-bar.tsx`
- `apps/web/src/components/diagnosis/game-context-bar.tsx`
- `apps/web/src/components/diagnosis/diagnosis-constants.ts`

### Milestone: Review Flow Redesign v1

#### Goal

Transform the game review page from three independent system-output cards into a unified coaching review surface with a chessboard, connected narrative, and actionable CTA.

#### Scope

1. Create `PositionBoard` reusable static chessboard component
2. Create `GameContextBar` game metadata header (player names, opening, result)
3. Create `CoachingReview` unified review component merging diagnosis, repair targets, and evidence
4. Create `DiagnosisActionBar` with "Generate session targeting X" CTA button
5. Extract shared `CATEGORY_LABELS`/`CATEGORY_VARIANT` constants
6. Update `/games/[gameId]/page.tsx` to use new components and load game metadata
7. Resolve contributing factor FENs from dataset rows for mini-board display
8. Rename pre-diagnosis CTA from "Game Loss Diagnosis" to "Game Diagnosis"
9. Update E2E tests to match new DOM structure

#### Out of Scope

- `/games` list page (separate milestone)
- Adding games/repertoire to sidebar navigation (separate milestone)
- Category-weighted session generation (follow-up enhancement)
- Session resume capability (separate milestone)
- Review queue action button (separate milestone)
- Mobile responsive sidebar (separate milestone)
- Dashboard information overload (separate milestone)
- Garbled Unicode fix on dashboard (separate quick fix)

#### Acceptance Criteria

1. Game review page shows a chessboard rendering the losing move position when diagnosis exists
2. Player names, opening name, and game result are visible in the page header when PGN data is available
3. Diagnosis, repair target, and evidence information renders within a single unified card
4. The coaching text connects diagnosis explanation to repair target in one flowing narrative
5. A "Generate session" CTA button exists and successfully triggers session generation
6. Contributing factors show mini-board thumbnails when FEN is resolvable from dataset
7. Non-loss games render a clean "no loss detected" state without repair/evidence sections
8. Pre-diagnosis state shows neutral "Game Diagnosis" title
9. All existing E2E tests pass (updated selectors) or equivalent coverage is maintained
10. No regressions on import page (which may still reference the old card components)

---

## Appendix A: Data Fields Available for Review Flow

### DiagnosisMove (has FEN)

| Field | Type | Currently shown |
|-------|------|----------------|
| positionId | string | No |
| ply | number | Yes (as move number) |
| moveSan | string | Yes |
| fen | string | No (should render board) |
| phase | GamePhase | Yes |
| label | MistakeLabel | Yes |
| evalBefore | number | Yes |
| evalAfter | number | Yes |
| swingCp | number | Yes |

### ContributingFactor (no FEN, resolvable via dataset rows)

| Field | Type | Currently shown |
|-------|------|----------------|
| category | DiagnosisCategory | Yes (badge) |
| ply | number | Yes |
| moveSan | string | Yes |
| swingCp | number | Yes |
| note | string | Yes |

### Game Metadata (not currently surfaced)

| Data | Source | Persistence |
|------|--------|-------------|
| Player names (White/Black) | PGN file via `parsePgnHeaders()` | Runtime only |
| Opening name/family | `opening-report.json` filtered by gameId | Persisted globally |
| Game date | `ImportedGame.playedAt` | Not persisted to any artifact |
| Game result | Inferred from `gameLost` + `finalEvalCp` | Partially available |
| Time control | `ImportedGame.timeControl` | Not persisted |
| Source platform | `ImportedGame.source` | Not persisted |

## Appendix B: Existing Board Usage Patterns

The codebase has 4 locations using `react-chessboard` with `allowDragging: false`:

1. `session-replay.tsx` -- full-size read-only board for past exercise replay
2. `recall-board.tsx` -- used in memorize phase and reconstruct phase
3. `cognitive-feedback.tsx` -- 200px mini-board showing original position after recall grading
4. `visualization-view.tsx` -- full-size board during study phase before hiding

Shared board colors: `darkSquareStyle: { backgroundColor: "#4a4a5e" }`, `lightSquareStyle: { backgroundColor: "#7a7a8e" }`. No centralized `PositionBoard` component exists yet.

## Appendix C: Navigation Gaps

| Surface | In sidebar | In command palette | Reachable via |
|---------|-----------|-------------------|---------------|
| `/games/[gameId]` | No | No | Import results "View full diagnosis" link only |
| `/games` (list) | No | No | Does not exist |
| `/repertoire` | No | No | Import page "Start repair drill" CTA only |
| `/review` | Yes | Yes | Sidebar + command palette |
| `/sessions` | Yes | Yes | Sidebar + command palette |
| `/coach` | Yes | Yes | Sidebar + command palette |

## Appendix D: Priority Sequencing Recommendation

Based on the three audits, the recommended priority sequence for upcoming milestones:

1. **Review Flow Redesign v1** -- this milestone (board, unified narrative, CTA)
2. **Daily Loop Tightening** -- review queue action button, session resume, session identity
3. **Navigation and Discoverability** -- games list page, sidebar entries for games/repertoire
4. **M004 Repertoire Branch Repair v1** -- builds on the PositionBoard component and coaching-narrative patterns established in the redesign
