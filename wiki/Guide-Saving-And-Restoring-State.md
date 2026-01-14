# Saving and Restoring State

Persist dialogue progress for save/load functionality. Serialize the current position, history, and conversation flags, then restore them later.

## Prerequisites

Before starting, you should:

- [Complete Your First Dialogue](Your-First-Dialogue)
- [Understand Flags](Concept-Flags)

## Overview

We'll implement save/load for dialogue state so players can resume conversations.

1. Serialize current state
2. Store the serialized data
3. Restore state in a new session
4. Handle game flags separately

## Step 1: Serialize State

Call `serialize()` to get a JSON-compatible object representing the current dialogue state:

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'

const dialogue: DialogueDefinition = {
  id: 'quest-dialogue',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Will you help me?',
      choices: [
        { text: 'Yes', next: 'accepted' },
        { text: 'Tell me more', next: 'details' }
      ]
    },
    details: {
      text: 'Bandits stole my supplies.',
      actions: [{ type: 'set', flag: 'conv:heardDetails', value: true }],
      next: 'start'
    },
    accepted: {
      text: 'Thank you! Here is the map.',
      isEnd: true
    }
  }
}

const runner = createDialogueRunner()
await runner.start(dialogue)
await runner.choose(1)  // "Tell me more"

// Serialize current state
const savedState = runner.serialize()

console.log(savedState)
// {
//   dialogueId: 'quest-dialogue',
//   currentNodeId: 'start',
//   history: [...],
//   conversationFlags: { heardDetails: true }
// }
```

## Step 2: Store the Data

The serialized state is plain JSON. Store it however suits your game:

```typescript
// Browser localStorage
function saveToLocalStorage() {
  const state = runner.serialize()
  localStorage.setItem('dialogue_save', JSON.stringify(state))
}

// Or send to server
async function saveToServer() {
  const state = runner.serialize()
  await fetch('/api/save', {
    method: 'POST',
    body: JSON.stringify({ dialogueState: state })
  })
}
```

## Step 3: Restore State

Start the same dialogue, then call `deserialize()` with the saved state:

```typescript
// Load from storage
const savedJson = localStorage.getItem('dialogue_save')

if (savedJson) {
  const savedState = JSON.parse(savedJson)

  // Start the dialogue first
  const runner = createDialogueRunner()
  await runner.start(dialogue)  // Must start the same dialogue

  // Then restore the saved state
  await runner.deserialize(savedState)

  console.log(runner.getCurrentNode()?.text)  // Restored position
  console.log(runner.getConversationFlags())  // Restored flags
  console.log(runner.getHistory())            // Restored history
}
```

## Step 4: Handle Game Flags Separately

Serialized state does NOT include game flags. Those are persistent state that you manage separately:

```typescript
import { createFlagStore } from '@motioneffector/flags'

// Your game's persistent state
const gameFlags = createFlagStore()

// Save everything
function saveGame() {
  const save = {
    gameFlags: gameFlags.all(),
    dialogueState: runner.serialize()
  }
  localStorage.setItem('game_save', JSON.stringify(save))
}

// Load everything
function loadGame() {
  const saveJson = localStorage.getItem('game_save')
  if (!saveJson) return false

  const save = JSON.parse(saveJson)

  // Restore game flags
  for (const [key, value] of Object.entries(save.gameFlags)) {
    gameFlags.set(key, value as any)
  }

  // Restore dialogue if one was active
  if (save.dialogueState) {
    const runner = createDialogueRunner({ gameFlags })
    // Note: You need to have the dialogue definition available
    await runner.start(getDialogueById(save.dialogueState.dialogueId))
    await runner.deserialize(save.dialogueState)
  }

  return true
}
```

## Complete Example

```typescript
import { createDialogueRunner, DialogueDefinition, SerializedState } from '@motioneffector/dialogue'
import { createFlagStore } from '@motioneffector/flags'

// Dialogue registry
const dialogues: Record<string, DialogueDefinition> = {
  'merchant-quest': {
    id: 'merchant-quest',
    startNode: 'offer',
    nodes: {
      offer: {
        text: 'I need someone to deliver this package.',
        choices: [
          { text: 'Where to?', next: 'details' },
          { text: 'How much?', next: 'payment' },
          { text: 'I accept', next: 'accepted' }
        ]
      },
      details: {
        text: 'The castle in the north.',
        actions: [{ type: 'set', flag: 'conv:knows_destination', value: true }],
        next: 'offer'
      },
      payment: {
        text: '50 gold on delivery.',
        actions: [{ type: 'set', flag: 'conv:knows_payment', value: true }],
        next: 'offer'
      },
      accepted: {
        text: 'Excellent! Here is the package.',
        actions: [
          { type: 'set', flag: 'hasPackage', value: true },
          { type: 'set', flag: 'quest_delivery', value: 'active' }
        ],
        isEnd: true
      }
    }
  }
}

// Game state
const gameFlags = createFlagStore()
gameFlags.set('gold', 100)
gameFlags.set('playerName', 'Hero')

let runner = createDialogueRunner({ gameFlags })
let activeDialogueId: string | null = null

// Save system
interface SaveData {
  gameFlags: Record<string, any>
  dialogue: SerializedState | null
}

function save(): string {
  const data: SaveData = {
    gameFlags: gameFlags.all(),
    dialogue: activeDialogueId ? runner.serialize() : null
  }
  return JSON.stringify(data)
}

async function load(saveJson: string): Promise<void> {
  const data: SaveData = JSON.parse(saveJson)

  // Restore game flags
  gameFlags.clear()
  for (const [key, value] of Object.entries(data.gameFlags)) {
    gameFlags.set(key, value)
  }

  // Restore dialogue if active
  if (data.dialogue) {
    const dialogue = dialogues[data.dialogue.dialogueId]
    if (dialogue) {
      runner = createDialogueRunner({ gameFlags })
      await runner.start(dialogue)
      await runner.deserialize(data.dialogue)
      activeDialogueId = data.dialogue.dialogueId
    }
  }
}

// Demo
async function demo() {
  // Start a dialogue
  await runner.start(dialogues['merchant-quest'])
  activeDialogueId = 'merchant-quest'

  // Make some choices
  await runner.choose(0)  // "Where to?"
  await runner.choose(1)  // "How much?"

  console.log('Before save:')
  console.log('Position:', runner.getCurrentNode()?.text)
  console.log('Conv flags:', runner.getConversationFlags())
  console.log('History:', runner.getHistory().length, 'entries')

  // Save
  const saveData = save()
  console.log('\nSaved!')

  // Simulate game restart
  runner = createDialogueRunner({ gameFlags })
  activeDialogueId = null

  // Load
  await load(saveData)

  console.log('\nAfter load:')
  console.log('Position:', runner.getCurrentNode()?.text)
  console.log('Conv flags:', runner.getConversationFlags())
  console.log('History:', runner.getHistory().length, 'entries')

  // Continue playing
  await runner.choose(2)  // "I accept"
  console.log('\nQuest accepted:', gameFlags.get('quest_delivery'))
}

demo()
```

## Variations

### Saving Mid-Node

Serialization captures the current node. If the dialogue is at an end node, restoring will put you at that end node.

### Multiple Active Dialogues

If your game has multiple simultaneous dialogues, serialize each runner separately:

```typescript
const saves = {
  mainQuest: mainQuestRunner.serialize(),
  sideQuest: sideQuestRunner.serialize()
}
```

### Validation on Load

Check that the dialogue still exists and the save is compatible:

```typescript
async function loadSafely(saveJson: string): Promise<boolean> {
  try {
    const data = JSON.parse(saveJson)

    if (data.dialogue) {
      const dialogue = dialogues[data.dialogue.dialogueId]
      if (!dialogue) {
        console.error('Dialogue no longer exists:', data.dialogue.dialogueId)
        return false
      }

      // Verify the node still exists
      if (!dialogue.nodes[data.dialogue.currentNodeId]) {
        console.error('Node no longer exists:', data.dialogue.currentNodeId)
        return false
      }
    }

    await load(saveJson)
    return true
  } catch (e) {
    console.error('Failed to load save:', e)
    return false
  }
}
```

## Troubleshooting

### "Start a dialogue before deserializing"

**Symptom:** `deserialize()` throws an error.

**Cause:** You called `deserialize()` before `start()`.

**Solution:** Always call `start(dialogue)` first, then `deserialize(state)`.

### Wrong Dialogue Restored

**Symptom:** State doesn't match expected.

**Cause:** Started a different dialogue than the one that was serialized.

**Solution:** Use `dialogueId` from the saved state to find the correct dialogue definition.

## See Also

- **[Navigating History](Guide-Navigating-History)** - What's captured in history
- **[State API](API-State)** - serialize/deserialize reference
- **[Types Reference](API-Types)** - SerializedState interface
