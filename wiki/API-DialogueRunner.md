# DialogueRunner API

Core methods for running and interacting with dialogues.

---

## `createDialogueRunner()`

Creates a new DialogueRunner instance with optional configuration.

**Signature:**

```typescript
function createDialogueRunner(options?: DialogueRunnerOptions): DialogueRunner
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `DialogueRunnerOptions` | No | Configuration for the runner |

**Returns:** `DialogueRunner` — A new runner instance ready to execute dialogues.

**Example:**

```typescript
import { createDialogueRunner } from '@motioneffector/dialogue'

// Basic usage
const runner = createDialogueRunner()

// With configuration
const runner = createDialogueRunner({
  gameFlags: myFlagStore,
  speakers: { npc: { name: 'Villager' } },
  onNodeEnter: (node, speaker) => console.log(node.text)
})
```

**Throws:**

- `ValidationError` — When `gameFlags` is not a valid FlagStore
- `ValidationError` — When `actionHandlers` contains non-function values
- `ValidationError` — When `i18n` adapter is missing required methods

---

## `runner.start()`

Starts a dialogue from its start node. Clears previous state and conversation flags.

**Signature:**

```typescript
start(dialogue: DialogueDefinition): Promise<DialogueState>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dialogue` | `DialogueDefinition` | Yes | The dialogue to execute |

**Returns:** `Promise<DialogueState>` — The initial state including current node and available choices.

**Example:**

```typescript
const dialogue = {
  id: 'greeting',
  startNode: 'start',
  nodes: {
    start: { text: 'Hello!', choices: [{ text: 'Hi', next: 'end' }] },
    end: { text: 'Goodbye!', isEnd: true }
  }
}

const state = await runner.start(dialogue)
console.log(state.currentNode.text)  // "Hello!"
console.log(state.isEnded)           // false
```

**Throws:**

- `ValidationError` — When start node is not found

---

## `runner.getChoices()`

Returns available choices for the current node, filtered by conditions.

**Signature:**

```typescript
getChoices(options?: GetChoicesOptions): ChoiceDefinition[] | ChoiceWithAvailability[]
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `GetChoicesOptions` | No | Options for filtering choices |

**Returns:** `ChoiceDefinition[]` — Available choices (default), or `ChoiceWithAvailability[]` if `includeUnavailable: true`.

**Example:**

```typescript
// Get only available choices
const choices = runner.getChoices()

// Include unavailable choices with availability info
const allChoices = runner.getChoices({ includeUnavailable: true })
allChoices.forEach(choice => {
  console.log(`${choice.text}: ${choice.available ? 'available' : choice.reason}`)
})

// Include disabled choices
const withDisabled = runner.getChoices({ includeDisabled: true })

// Custom filter
const tagged = runner.getChoices({
  filter: choice => choice.tags?.includes('important')
})
```

---

## `runner.choose()`

Selects a choice by index and advances to the next node.

**Signature:**

```typescript
choose(index: number): Promise<DialogueState>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `index` | `number` | Yes | Index of the choice in the original choices array |

**Returns:** `Promise<DialogueState>` — The new state after the choice.

**Example:**

```typescript
const choices = runner.getChoices()
console.log(choices[0].text)  // "Accept quest"

const newState = await runner.choose(0)
console.log(newState.currentNode.text)  // Next node's text
```

**Throws:**

- `ValidationError` — When no active dialogue
- `ValidationError` — When dialogue has ended
- `ValidationError` — When index is out of bounds
- `ValidationError` — When choice is disabled
- `ValidationError` — When choice conditions are not met
- `ValidationError` — When target node is not found

---

## `runner.getCurrentNode()`

Returns the current node definition with interpolated text.

**Signature:**

```typescript
getCurrentNode(): NodeDefinition | null
```

**Returns:** `NodeDefinition | null` — The current node, or null if no dialogue is active.

**Example:**

```typescript
const node = runner.getCurrentNode()
if (node) {
  console.log(node.text)
  console.log(node.speaker)
}
```

---

## `runner.isEnded()`

Checks if the current dialogue has ended.

**Signature:**

```typescript
isEnded(): boolean
```

**Returns:** `boolean` — True if the dialogue has reached an end node.

**Example:**

```typescript
while (!runner.isEnded()) {
  displayNode(runner.getCurrentNode())
  const choice = await getUserChoice(runner.getChoices())
  await runner.choose(choice)
}
console.log('Dialogue complete!')
```

---

## Types

### `DialogueRunnerOptions`

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

| Property | Type | Description |
|----------|------|-------------|
| `gameFlags` | `FlagStore` | External flag store for persistent state |
| `actionHandlers` | `Record<string, ActionHandler>` | Callback action handlers |
| `speakers` | `Record<string, Speaker>` | Speaker metadata by ID |
| `i18n` | `I18nAdapter` | Internationalization adapter |
| `interpolation` | `Record<string, InterpolationFunction>` | Custom text interpolation functions |
| `onNodeEnter` | `function` | Called when entering a node |
| `onNodeExit` | `function` | Called when leaving a node |
| `onChoiceSelected` | `function` | Called when a choice is made |
| `onDialogueStart` | `function` | Called when dialogue starts |
| `onDialogueEnd` | `function` | Called when dialogue ends |
| `onActionExecuted` | `function` | Called after each action executes |
| `onConditionEvaluated` | `function` | Called after each condition check |

### `GetChoicesOptions`

```typescript
interface GetChoicesOptions {
  includeUnavailable?: boolean
  includeDisabled?: boolean
  filter?: (choice: ChoiceDefinition) => boolean
}
```

| Property | Type | Description |
|----------|------|-------------|
| `includeUnavailable` | `boolean` | Include choices with failing conditions. Default: `false` |
| `includeDisabled` | `boolean` | Include choices with `disabled: true`. Default: `false` |
| `filter` | `function` | Custom filter function |

### `DialogueState`

```typescript
interface DialogueState {
  currentNode: NodeDefinition
  availableChoices: ChoiceDefinition[]
  isEnded: boolean
}
```

| Property | Type | Description |
|----------|------|-------------|
| `currentNode` | `NodeDefinition` | The current node with interpolated text |
| `availableChoices` | `ChoiceDefinition[]` | Choices available at current node |
| `isEnded` | `boolean` | Whether dialogue has ended |
