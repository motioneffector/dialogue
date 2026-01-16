# Navigating History

Let players go back, restart, or jump to specific nodes in a dialogue. The runner tracks every node visited, enabling undo, replay, and non-linear navigation.

## Prerequisites

Before starting, you should:

- [Complete Your First Dialogue](Your-First-Dialogue)

## Overview

We'll implement back/undo functionality, restart options, and debug navigation.

1. View the history stack
2. Go back to previous nodes
3. Restart the dialogue
4. Jump to arbitrary nodes

## Step 1: View History

Every choice creates a history entry. Use `getHistory()` to see the path taken:

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'

const dialogue: DialogueDefinition = {
  id: 'journey',
  startNode: 'start',
  nodes: {
    start: {
      text: 'You stand at a crossroads.',
      choices: [
        { text: 'Go north', next: 'forest' },
        { text: 'Go south', next: 'village' }
      ]
    },
    forest: {
      text: 'You enter a dark forest.',
      choices: [{ text: 'Continue', next: 'clearing' }]
    },
    clearing: {
      text: 'You find a peaceful clearing.',
      isEnd: true
    },
    village: {
      text: 'You reach a small village.',
      isEnd: true
    }
  }
}

const runner = createDialogueRunner()
await runner.start(dialogue)

await runner.choose(0)  // Go north
await runner.choose(0)  // Continue

const history = runner.getHistory()
console.log(history.length)  // 2

history.forEach(entry => {
  console.log(`Node: ${entry.nodeId}, Choice: ${entry.choice?.text}`)
})
// Node: start, Choice: Go north
// Node: forest, Choice: Continue
```

## Step 2: Go Back

Use `back()` to return to the previous node. This also restores conversation flags to their state at that point.

```typescript
const runner = createDialogueRunner()
await runner.start(dialogue)

console.log(runner.getCurrentNode()?.text)  // "You stand at a crossroads."

await runner.choose(0)  // Go north
console.log(runner.getCurrentNode()?.text)  // "You enter a dark forest."

await runner.back()
console.log(runner.getCurrentNode()?.text)  // "You stand at a crossroads."

// History is also restored
console.log(runner.getHistory().length)  // 0
```

### Implementing an Undo Button

```typescript
function handleUndo() {
  if (runner.getHistory().length > 0) {
    runner.back()
    updateUI()
  } else {
    console.log('Nothing to undo')
  }
}
```

## Step 3: Restart the Dialogue

Use `restart()` to return to the start node and clear history:

```typescript
await runner.start(dialogue)
await runner.choose(0)
await runner.choose(0)

console.log(runner.getHistory().length)  // 2
console.log(runner.getCurrentNode()?.text)  // "You find a peaceful clearing."

await runner.restart()

console.log(runner.getHistory().length)  // 0
console.log(runner.getCurrentNode()?.text)  // "You stand at a crossroads."
```

### Preserving Conversation Flags

By default, `restart()` clears conversation flags. To keep them:

```typescript
await runner.restart({ preserveConversationFlags: true })
```

## Step 4: Jump to Any Node

Use `jumpTo()` for non-linear navigation (debugging, cheats, or special game mechanics):

```typescript
await runner.start(dialogue)
await runner.jumpTo('clearing')

console.log(runner.getCurrentNode()?.text)  // "You find a peaceful clearing."

// Jump adds to history
console.log(runner.getHistory().length)  // 1
```

## Complete Example

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'

const dialogue: DialogueDefinition = {
  id: 'demo',
  startNode: 'intro',
  nodes: {
    intro: {
      text: 'Welcome! This demonstrates history navigation.',
      next: 'menu'
    },
    menu: {
      text: 'What would you like to do?',
      choices: [
        { text: 'Explore path A', next: 'pathA' },
        { text: 'Explore path B', next: 'pathB' }
      ]
    },
    pathA: {
      text: 'You chose path A.',
      actions: [{ type: 'set', flag: 'conv:visited_A', value: true }],
      choices: [{ text: 'Continue', next: 'endA' }]
    },
    pathB: {
      text: 'You chose path B.',
      actions: [{ type: 'set', flag: 'conv:visited_B', value: true }],
      choices: [{ text: 'Continue', next: 'endB' }]
    },
    endA: { text: 'Path A complete!', isEnd: true },
    endB: { text: 'Path B complete!', isEnd: true }
  }
}

async function demo() {
  const runner = createDialogueRunner()
  await runner.start(dialogue)

  console.log('--- Starting dialogue ---')
  console.log(runner.getCurrentNode()?.text)

  // Auto-advance through intro
  console.log(runner.getCurrentNode()?.text)  // Menu

  // Choose path A
  await runner.choose(0)
  console.log(runner.getCurrentNode()?.text)  // Path A
  console.log('Visited A:', runner.getConversationFlags()['visited_A'])

  // Go back and try path B instead
  await runner.back()
  console.log('After back:', runner.getCurrentNode()?.text)  // Menu
  console.log('Visited A after back:', runner.getConversationFlags()['visited_A'])  // undefined (restored)

  await runner.choose(1)  // Path B
  console.log(runner.getCurrentNode()?.text)  // Path B

  // View full history
  console.log('\n--- History ---')
  runner.getHistory().forEach((entry, i) => {
    console.log(`${i + 1}. ${entry.nodeId} → ${entry.choice?.text || '(auto)'}`)
  })

  // Restart
  await runner.restart()
  console.log('\nAfter restart:', runner.getCurrentNode()?.text)
  console.log('History length:', runner.getHistory().length)  // 0
}

demo()
```

## Variations

### History Entry Data

Each history entry contains:

```typescript
interface HistoryEntry {
  nodeId: string              // The node that was visited
  node: NodeDefinition        // Full node data
  choiceIndex?: number        // Which choice was selected (if any)
  choice?: ChoiceDefinition   // Full choice data
  timestamp: number           // When this happened
  conversationFlags: Record<string, FlagValue>  // Flag snapshot
}
```

### Using Timestamps

```typescript
const history = runner.getHistory()
const duration = Date.now() - history[0].timestamp
console.log(`Dialogue took ${duration}ms so far`)
```

### History for Analytics

```typescript
function trackDialogueCompletion() {
  const history = runner.getHistory()
  const path = history.map(e => e.nodeId).join(' → ')
  analytics.track('dialogue_complete', { path })
}
```

## Troubleshooting

### Back Does Nothing

**Symptom:** Calling `back()` has no effect.

**Cause:** History is empty (at start node).

**Solution:** Check `getHistory().length > 0` before calling `back()`.

### Jump Fails

**Symptom:** `jumpTo()` throws an error.

**Cause:** Node ID doesn't exist in the dialogue.

**Solution:** Verify the node ID matches exactly (case-sensitive).

## See Also

- **[Saving and Restoring State](Guide-Saving-And-Restoring-State)** - Persist history across sessions
- **[Navigation API](API-Navigation)** - Method reference
- **[Types Reference](API-Types)** - HistoryEntry interface
