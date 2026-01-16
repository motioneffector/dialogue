# Types Reference

All TypeScript types and interfaces exported by the library.

---

## Dialogue Structure

### `DialogueDefinition`

Complete definition of a dialogue tree.

```typescript
interface DialogueDefinition {
  id: string
  startNode: string
  metadata?: Record<string, unknown>
  nodes: Record<string, NodeDefinition>
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier for the dialogue |
| `startNode` | `string` | Yes | ID of the first node |
| `metadata` | `Record<string, unknown>` | No | Custom metadata for the dialogue |
| `nodes` | `Record<string, NodeDefinition>` | Yes | Map of node IDs to definitions |

### `NodeDefinition`

Definition of a single dialogue node.

```typescript
interface NodeDefinition {
  text: string
  speaker?: string
  tags?: string[]
  actions?: Action[]
  choices?: ChoiceDefinition[]
  next?: string
  isEnd?: boolean
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `text` | `string` | Yes | Text to display (or i18n key) |
| `speaker` | `string` | No | Speaker ID for this node |
| `tags` | `string[]` | No | Custom tags for filtering/routing |
| `actions` | `Action[]` | No | Actions to execute on entry |
| `choices` | `ChoiceDefinition[]` | No | Available choices |
| `next` | `string` | No | Next node for auto-advance |
| `isEnd` | `boolean` | No | Marks node as dialogue endpoint |

### `ChoiceDefinition`

Definition of a player choice.

```typescript
interface ChoiceDefinition {
  text: string
  next: string
  conditions?: Condition
  actions?: Action[]
  tags?: string[]
  disabled?: boolean
  disabledText?: string
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `text` | `string` | Yes | Display text for the choice |
| `next` | `string` | Yes | Target node ID |
| `conditions` | `Condition` | No | Conditions for availability |
| `actions` | `Action[]` | No | Actions to execute on selection |
| `tags` | `string[]` | No | Custom tags |
| `disabled` | `boolean` | No | Force-disable this choice |
| `disabledText` | `string` | No | Text shown when disabled |

### `ChoiceWithAvailability`

Choice with availability information (returned by `getChoices({ includeUnavailable: true })`).

```typescript
interface ChoiceWithAvailability extends ChoiceDefinition {
  available: boolean
  reason?: string
}
```

| Property | Type | Description |
|----------|------|-------------|
| `available` | `boolean` | Whether the choice is currently available |
| `reason` | `string` | Reason for unavailability (if applicable) |

---

## Conditions

### `Condition`

Boolean expression for conditional logic.

```typescript
type Condition =
  | { check: [string, string, FlagValue] }
  | { and: Condition[] }
  | { or: Condition[] }
  | { not: Condition }
```

**Check format:** `{ check: [flagName, operator, value] }`

**Operators:** `==`, `!=`, `>`, `<`, `>=`, `<=`

**Examples:**

```typescript
// Simple equality
{ check: ['hasKey', '==', true] }

// Numeric comparison
{ check: ['gold', '>=', 100] }

// AND combination
{ and: [
  { check: ['hasKey', '==', true] },
  { check: ['gold', '>=', 50] }
]}

// OR combination
{ or: [
  { check: ['hasKey', '==', true] },
  { check: ['hasLockpick', '==', true] }
]}

// NOT inversion
{ not: { check: ['isPoisoned', '==', true] } }
```

---

## Actions

### `Action`

Command to execute during dialogue.

```typescript
type Action =
  | { type: 'set'; flag: string; value: FlagValue }
  | { type: 'clear'; flag: string }
  | { type: 'increment'; flag: string; value?: number }
  | { type: 'decrement'; flag: string; value?: number }
  | { type: 'callback'; name: string; args?: unknown[] }
```

**Action Types:**

| Type | Properties | Description |
|------|------------|-------------|
| `set` | `flag`, `value` | Set flag to value |
| `clear` | `flag` | Remove flag |
| `increment` | `flag`, `value?` | Add to numeric flag (default: 1) |
| `decrement` | `flag`, `value?` | Subtract from numeric flag (default: 1) |
| `callback` | `name`, `args?` | Call registered action handler |

### `ActionHandler`

Function signature for callback action handlers.

```typescript
type ActionHandler = (args?: unknown[]) => unknown | Promise<unknown>
```

---

## Speakers

### `Speaker`

Character metadata for dialogue speakers.

```typescript
interface Speaker {
  name: string
  portrait?: string | null
  color?: string
  [key: string]: unknown
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | `string` | Yes | Display name |
| `portrait` | `string \| null` | No | Portrait image path |
| `color` | `string` | No | Color for UI styling |
| `[key]` | `unknown` | No | Custom properties |

---

## Flags

### `FlagValue`

Supported types for flag values.

```typescript
type FlagValue = boolean | number | string
```

### `FlagStore`

Interface for flag storage (from @motioneffector/flags).

```typescript
interface FlagStore {
  get(key: string): FlagValue | undefined
  set(key: string, value: FlagValue): FlagStore
  has(key: string): boolean
  delete(key: string): FlagStore
  clear(): FlagStore
  increment(key: string, amount?: number): number
  decrement(key: string, amount?: number): number
  check(condition: string): boolean
  all(): Record<string, FlagValue>
  keys(): string[]
}
```

---

## Internationalization

### `I18nAdapter`

Interface for internationalization adapters.

```typescript
interface I18nAdapter {
  t: (key: string, params?: Record<string, unknown>) => string
  hasKey: (key: string) => boolean
}
```

| Method | Description |
|--------|-------------|
| `t(key, params?)` | Translate a key, optionally with parameters |
| `hasKey(key)` | Check if a translation key exists |

---

## Interpolation

### `InterpolationFunction`

Custom text interpolation function.

```typescript
type InterpolationFunction = (context: InterpolationContext) => string | Promise<string>
```

### `InterpolationContext`

Context provided to interpolation functions.

```typescript
interface InterpolationContext {
  currentNode: NodeDefinition
  speaker?: Speaker
  gameFlags: FlagStore
  conversationFlags: FlagStore
}
```

---

## State

### `DialogueState`

Current state returned by `start()` and `choose()`.

```typescript
interface DialogueState {
  currentNode: NodeDefinition
  availableChoices: ChoiceDefinition[]
  isEnded: boolean
}
```

### `HistoryEntry`

Record of a visited node.

```typescript
interface HistoryEntry {
  nodeId: string
  node: NodeDefinition
  choiceIndex?: number
  choice?: ChoiceDefinition
  timestamp: number
  conversationFlags: Record<string, FlagValue>
}
```

### `SerializedState`

JSON-compatible dialogue state for save/load.

```typescript
interface SerializedState {
  dialogueId: string
  currentNodeId: string
  history: HistoryEntry[]
  conversationFlags: Record<string, FlagValue>
}
```

---

## Options

### `DialogueRunnerOptions`

Configuration for `createDialogueRunner()`.

```typescript
interface DialogueRunnerOptions {
  gameFlags?: FlagStore
  actionHandlers?: Record<string, ActionHandler>
  speakers?: Record<string, Speaker>
  i18n?: I18nAdapter
  interpolation?: Record<string, InterpolationFunction>
  onNodeEnter?: (node: NodeDefinition, speaker?: Speaker) => void
  onNodeExit?: (node: NodeDefinition) => void
  onChoiceSelected?: (choice: ChoiceDefinition, index: number) => void
  onDialogueStart?: (dialogue: DialogueDefinition) => void
  onDialogueEnd?: (dialogueId: string, endNode?: NodeDefinition) => void
  onActionExecuted?: (action: Action, result?: unknown) => void
  onConditionEvaluated?: (condition: Condition, result: boolean) => void
}
```

### `GetChoicesOptions`

Options for `runner.getChoices()`.

```typescript
interface GetChoicesOptions {
  includeUnavailable?: boolean
  includeDisabled?: boolean
  filter?: (choice: ChoiceDefinition) => boolean
}
```

### `RestartOptions`

Options for `runner.restart()`.

```typescript
interface RestartOptions {
  preserveConversationFlags?: boolean
}
```

---

## Validation

### `ValidationResult`

Result from `validateDialogue()`.

```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `valid` | `boolean` | True if dialogue passed validation |
| `errors` | `string[]` | Array of error messages |
