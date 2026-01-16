# State API

Methods for serializing, deserializing, and managing dialogue state.

---

## `runner.serialize()`

Serializes the current dialogue state to a JSON-compatible object.

**Signature:**

```typescript
serialize(): SerializedState
```

**Returns:** `SerializedState` — Object containing dialogue ID, current node, history, and conversation flags.

**Example:**

```typescript
await runner.start(dialogue)
await runner.choose(0)
await runner.choose(1)

const state = runner.serialize()

// Store as JSON
localStorage.setItem('dialogue_save', JSON.stringify(state))

console.log(state)
// {
//   dialogueId: 'quest-dialogue',
//   currentNodeId: 'node3',
//   history: [...],
//   conversationFlags: { discussed: true }
// }
```

**Throws:**

- `ValidationError` — When no active dialogue

**Notes:**

- Game flags are NOT included (manage separately)
- The returned object is safe to pass to `JSON.stringify()`

---

## `runner.deserialize()`

Restores dialogue state from a previously serialized state.

**Signature:**

```typescript
deserialize(state: SerializedState): Promise<void>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `state` | `SerializedState` | Yes | Previously serialized state |

**Returns:** `Promise<void>`

**Example:**

```typescript
// Load saved state
const savedJson = localStorage.getItem('dialogue_save')
const savedState = JSON.parse(savedJson)

// Must start the same dialogue first
await runner.start(dialogue)

// Then restore state
await runner.deserialize(savedState)

console.log(runner.getCurrentNode()?.text)  // Restored position
console.log(runner.getHistory().length)     // Restored history
```

**Throws:**

- `ValidationError` — When no dialogue has been started

**Notes:**

- Call `start()` with the same dialogue before `deserialize()`
- Fires `onNodeEnter` for the restored node
- Restores history and conversation flags

---

## `runner.getConversationFlags()`

Returns a copy of all conversation flags.

**Signature:**

```typescript
getConversationFlags(): Record<string, FlagValue>
```

**Returns:** `Record<string, FlagValue>` — Copy of conversation flag values.

**Example:**

```typescript
const flags = runner.getConversationFlags()

console.log(flags)
// { discussed_quest: true, mood: 'friendly' }

// This is a copy - modifications don't affect internal state
flags.discussed_quest = false
console.log(runner.getConversationFlags().discussed_quest)  // Still true
```

---

## `runner.clearConversationFlags()`

Clears all conversation flags.

**Signature:**

```typescript
clearConversationFlags(): void
```

**Returns:** `void`

**Example:**

```typescript
await runner.start(dialogue)
// ... some choices that set conversation flags ...

console.log(Object.keys(runner.getConversationFlags()).length)  // 3

runner.clearConversationFlags()

console.log(Object.keys(runner.getConversationFlags()).length)  // 0
```

---

## `runner.on()`

Registers an event listener for dialogue events.

**Signature:**

```typescript
on(event: string, callback: (...args: unknown[]) => void): void
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `event` | `string` | Yes | Event name to listen for |
| `callback` | `function` | Yes | Handler function |

**Returns:** `void`

**Example:**

```typescript
runner.on('nodeEnter', (node, speaker) => {
  console.log(`Entered: ${node.text}`)
})

runner.on('choiceSelected', (choice, index) => {
  console.log(`Chose: ${choice.text}`)
})
```

**Available Events:**

| Event | Arguments | Description |
|-------|-----------|-------------|
| `nodeEnter` | `(node, speaker?)` | Fired when entering a node |
| `nodeExit` | `(node)` | Fired when leaving a node |
| `choiceSelected` | `(choice, index)` | Fired when a choice is made |
| `dialogueStart` | `(dialogue)` | Fired when dialogue starts |
| `dialogueEnd` | `(dialogueId, endNode?)` | Fired when dialogue ends |
| `actionExecuted` | `(action, result?)` | Fired after action executes |
| `conditionEvaluated` | `(condition, result)` | Fired after condition check |

---

## Types

### `SerializedState`

```typescript
interface SerializedState {
  dialogueId: string
  currentNodeId: string
  history: HistoryEntry[]
  conversationFlags: Record<string, FlagValue>
}
```

| Property | Type | Description |
|----------|------|-------------|
| `dialogueId` | `string` | ID of the serialized dialogue |
| `currentNodeId` | `string` | ID of the current node |
| `history` | `HistoryEntry[]` | Full history stack |
| `conversationFlags` | `Record<string, FlagValue>` | Conversation flag values |

### `FlagValue`

```typescript
type FlagValue = boolean | number | string
```

Supported value types for flags.
