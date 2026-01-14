# Navigation API

Methods for navigating dialogue history and moving between nodes.

---

## `runner.getHistory()`

Returns the history of visited nodes with choice and flag data.

**Signature:**

```typescript
getHistory(): HistoryEntry[]
```

**Returns:** `HistoryEntry[]` — Array of history entries in chronological order.

**Example:**

```typescript
const history = runner.getHistory()

history.forEach((entry, index) => {
  console.log(`${index + 1}. Node: ${entry.nodeId}`)
  if (entry.choice) {
    console.log(`   Choice: ${entry.choice.text}`)
  }
  console.log(`   Time: ${new Date(entry.timestamp).toISOString()}`)
})
```

---

## `runner.back()`

Returns to the previous node and restores conversation flags to their state at that point.

**Signature:**

```typescript
back(): Promise<void>
```

**Returns:** `Promise<void>`

**Example:**

```typescript
await runner.start(dialogue)
await runner.choose(0)  // Move to next node

console.log(runner.getHistory().length)  // 1

await runner.back()  // Return to previous node

console.log(runner.getHistory().length)  // 0
console.log(runner.getCurrentNode()?.text)  // Original node
```

**Notes:**

- Does nothing if history is empty
- Restores conversation flags from the history snapshot
- Fires `onNodeEnter` for the restored node
- Does not restore game flags (those are persistent)

---

## `runner.restart()`

Restarts the dialogue from the start node, clearing history.

**Signature:**

```typescript
restart(options?: RestartOptions): Promise<DialogueState>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `options` | `RestartOptions` | No | Options for restart behavior |

**Returns:** `Promise<DialogueState>` — The initial state after restart.

**Example:**

```typescript
// Standard restart - clears history and conversation flags
await runner.restart()

// Preserve conversation flags
await runner.restart({ preserveConversationFlags: true })
```

**Throws:**

- `ValidationError` — When no active dialogue

---

## `runner.jumpTo()`

Jumps directly to a specific node, adding the current node to history.

**Signature:**

```typescript
jumpTo(nodeId: string): Promise<void>
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `nodeId` | `string` | Yes | ID of the node to jump to |

**Returns:** `Promise<void>`

**Example:**

```typescript
await runner.start(dialogue)

// Jump to a specific node
await runner.jumpTo('secret-ending')

console.log(runner.getCurrentNode()?.text)  // Secret ending text
console.log(runner.getHistory().length)     // 1 (jump was recorded)
```

**Throws:**

- `ValidationError` — When no active dialogue
- `ValidationError` — When target node does not exist

**Notes:**

- Adds the previous node to history (enables `back()`)
- Fires `onNodeExit` for the previous node
- Fires `onNodeEnter` for the target node
- Does not execute node actions on the target (unlike normal transitions)

---

## Types

### `HistoryEntry`

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

| Property | Type | Description |
|----------|------|-------------|
| `nodeId` | `string` | ID of the visited node |
| `node` | `NodeDefinition` | Full node definition |
| `choiceIndex` | `number` | Index of choice made (if any) |
| `choice` | `ChoiceDefinition` | Full choice definition (if any) |
| `timestamp` | `number` | Unix timestamp when node was visited |
| `conversationFlags` | `Record<string, FlagValue>` | Snapshot of conversation flags at this point |

### `RestartOptions`

```typescript
interface RestartOptions {
  preserveConversationFlags?: boolean
}
```

| Property | Type | Description |
|----------|------|-------------|
| `preserveConversationFlags` | `boolean` | Keep conversation flags on restart. Default: `false` |
