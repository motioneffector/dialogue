# The DialogueRunner

The DialogueRunner is the engine that executes your dialogue trees. You give it a dialogue definition, and it handles navigation, state tracking, condition evaluation, action execution, and history management.

## How It Works

The runner maintains internal state:
- **Current node**: Where you are in the dialogue
- **History**: Stack of visited nodes (for back/undo)
- **Conversation flags**: Temporary state scoped to this dialogue

You interact with the runner through async methods. Each method returns the new state or modifies internal state.

```
┌─────────────────────────────────────────────┐
│              DialogueRunner                  │
├─────────────────────────────────────────────┤
│  State:                                     │
│  - currentNode: NodeDefinition              │
│  - history: HistoryEntry[]                  │
│  - conversationFlags: Map<string, value>    │
├─────────────────────────────────────────────┤
│  Methods:                                   │
│  - start(dialogue) → DialogueState          │
│  - choose(index) → DialogueState            │
│  - getChoices() → ChoiceDefinition[]        │
│  - getCurrentNode() → NodeDefinition        │
│  - isEnded() → boolean                      │
│  - back(), restart(), jumpTo()              │
│  - serialize(), deserialize()               │
└─────────────────────────────────────────────┘
```

## Basic Usage

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'

const dialogue: DialogueDefinition = {
  id: 'example',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Hello!',
      choices: [{ text: 'Hi', next: 'end' }]
    },
    end: { text: 'Goodbye!', isEnd: true }
  }
}

// Create runner with optional configuration
const runner = createDialogueRunner({
  // gameFlags: myFlagStore,
  // speakers: { npc: { name: 'Villager' } },
  // onNodeEnter: (node, speaker) => { ... }
})

// Start the dialogue
const state = await runner.start(dialogue)
console.log(state.currentNode.text)  // "Hello!"

// Get available choices
const choices = runner.getChoices()
console.log(choices[0].text)  // "Hi"

// Make a selection
const newState = await runner.choose(0)
console.log(newState.isEnded)  // true
```

## Key Points

- **Async methods**: `start()`, `choose()`, `back()`, `restart()`, `jumpTo()`, and `deserialize()` are all async because actions can be async.

- **Stateful**: One runner instance handles one dialogue at a time. Starting a new dialogue clears the previous state.

- **Configuration options**: Pass `gameFlags`, `speakers`, `actionHandlers`, `i18n`, `interpolation`, and event callbacks when creating the runner.

- **Event callbacks**: React to `onNodeEnter`, `onNodeExit`, `onChoiceSelected`, `onDialogueStart`, `onDialogueEnd`, `onActionExecuted`, and `onConditionEvaluated`.

- **History tracking**: Every node visit is recorded. Use `getHistory()` to see the path taken, `back()` to undo, or `jumpTo()` for non-linear navigation.

## Examples

### With Event Callbacks

```typescript
const runner = createDialogueRunner({
  onNodeEnter: (node, speaker) => {
    console.log(`Entering node: ${node.text}`)
    if (speaker) {
      console.log(`Speaker: ${speaker.name}`)
    }
  },
  onChoiceSelected: (choice, index) => {
    console.log(`Player chose: ${choice.text}`)
  },
  onDialogueEnd: (dialogueId) => {
    console.log(`Dialogue ${dialogueId} complete`)
  }
})
```

### With Game Flags

```typescript
import { createFlagStore } from '@motioneffector/flags'

const gameFlags = createFlagStore()
gameFlags.set('gold', 100)
gameFlags.set('hasKey', true)

const runner = createDialogueRunner({ gameFlags })
```

Conditions and actions can read/write these flags. See [Flags](Concept-Flags) for details.

### With Speakers

```typescript
const runner = createDialogueRunner({
  speakers: {
    merchant: { name: 'Marcus', portrait: 'merchant.png' },
    guard: { name: 'Sir Roland', portrait: 'guard.png', color: '#cc0000' }
  }
})
```

Reference speakers in nodes with `speaker: 'merchant'`. The runner resolves the ID to the full speaker object.

## Related

- **[Dialogue Trees](Concept-Dialogue-Trees)** - The data structures the runner executes
- **[Responding to Events](Guide-Responding-To-Events)** - React to dialogue events in your game
- **[DialogueRunner API](API-DialogueRunner)** - Full method reference
