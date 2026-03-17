# Data Integrity Contract

> M12B — Data Integrity + Performance Hardening

## LoadResult Type

All artifact loaders internally use a discriminated union for error handling:

```typescript
type LoadResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "missing" | "corrupt"; message: string };
```

- `missing` — File does not exist (ENOENT)
- `corrupt` — File exists but contains invalid JSON or fails type guard validation

Public API remains `T | null` for backward compatibility. Corruption is logged via `console.warn` with `[chess-os]` prefix.

**Source:** `apps/web/src/lib/safe-parse.ts`

## Type Guard Validators

Each artifact shape has a hand-written type guard checking 3-6 required top-level keys:

| Validator | Required Keys |
|-----------|--------------|
| `isLearnerOverview` | totalExercises, lifetimeAccuracy, masteryDistribution, recentSessions, focusRecommendations |
| `isTrendReport` | sessionTimeline, categoryTrends |
| `isReviewReport` | totalOverdue, categoryUrgency |
| `isCoachingSummary` | headline, insights |
| `isStudyPlan` | primaryFocus, rationale |
| `isMistakePatterns` | categoryPatterns, blunderProfile |
| `isReviewQueue` | totalEntries, entries (array) |
| `isCurriculumPlan` | sessions (array), sessionCount |
| `isExerciseProgress` | totalExercises, exercises (object) |
| `isStudySession` | sessionId, exercises (array), exerciseCount |

**Source:** `apps/web/src/lib/validators.ts`

## safeParseJsonl

Resilient JSONL parser with per-line error handling:

```typescript
function safeParseJsonl<T>(raw: string, sourcePath?: string): { rows: T[]; skipped: number }
```

- Parses each line independently in a try-catch
- Bad lines are skipped and logged (not thrown)
- Empty/whitespace lines are silently skipped
- Returns count of skipped lines for diagnostics

Used in: `loadExerciseCorpusRaw`, `loadHistoryRecords`, `loadExerciseCorpus`, `loadSessionHistory`

**Source:** `apps/web/src/lib/safe-parse.ts`

## atomicWriteFile

Write-then-rename pattern for crash-safe writes:

```typescript
function atomicWriteFileSync(filePath: string, data: string): void
async function atomicWriteFile(filePath: string, data: string): Promise<void>
```

- Creates parent directories if needed
- Writes to `<path>.tmp` first
- Renames (atomic on same volume — POSIX and NTFS)
- Used for all JSON artifact writes (11 in generation.ts, 4 in study-server.ts)
- `appendFile` calls are NOT atomic — `safeParseJsonl` handles truncated last lines

**Source:** `packages/db/src/persistence/atomic-write.ts`

## deriveReadiness

Pure function deriving readiness status from pre-loaded data:

```typescript
function deriveReadiness(preloaded: {
  overview: unknown | null;
  progress: unknown | null;
  corpusExists: boolean;
}): ReadinessStatus
```

- No I/O — computes from already-loaded artifacts
- Used in empty-state branches of dashboard, coach, review, curriculum pages
- Saves 3 redundant stat() calls when data exists (common case)

**Source:** `apps/web/src/lib/artifacts.ts`

## ArtifactStatus (Enhanced)

Settings page artifact health now includes validation:

```typescript
interface ArtifactStatus {
  name: string;
  path: string;
  exists: boolean;
  sizeBytes: number | null;
  lastModified: string | null;
  valid: boolean | null;           // null=missing, true=valid, false=corrupt
  validationError: string | null;  // error message when invalid
}
```

Display states:
- Green CheckCircle — exists and valid
- Amber AlertTriangle — exists but invalid (shows validation error)
- Red XCircle — missing

**Source:** `apps/web/src/lib/artifacts.ts`, `apps/web/src/app/settings/page.tsx`
