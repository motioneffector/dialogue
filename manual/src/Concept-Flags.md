# Flags

Flags are key-value state that dialogues can read and write. They power conditional choices ("show this option only if the player has a key") and dynamic text ("Hello, {{playerName}}!").

## How It Works

There are two flag scopes:

**Game flags** are persistent and shared across all dialogues. Use them for inventory, quest progress, relationship stats, and anything that should persist.

**Conversation flags** are ephemeral and reset when a new dialogue starts. Use them for dialogue-specific state like "has the NPC mentioned the secret yet?"

```
┌────────────────────────────────────┐
│          Game Flags                │
│  (persistent across dialogues)     │
│                                    │
│  gold: 150                         │
│  hasKey: true                      │
│  questComplete: false              │
└────────────────────────────────────┘

┌────────────────────────────────────┐
│     Conversation Flags             │
│  (reset per dialogue)              │
│                                    │
│  mentionedSecret: true             │
│  askedAboutWeather: true           │
└────────────────────────────────────┘
```

## Basic Usage

```typescript
import { createDialogueRunner } from '@motioneffector/dialogue'

// Option 1: Use internal flag store (simple games)
const runner = createDialogueRunner()

// Option 2: Provide your own flag store (recommended for real games)
import { createFlagStore } from '@motioneffector/flags'
const gameFlags = createFlagStore()
gameFlags.set('gold', 100)

const runner = createDialogueRunner({ gameFlags })
```

Flags are set via [Actions](Concept-Actions) in nodes or choices:

```typescript
const dialogue = {
  id: 'example',
  startNode: 'start',
  nodes: {
    start: {
      text: 'You found a key!',
      actions: [
        { type: 'set', flag: 'hasKey', value: true },           // Game flag
        { type: 'set', flag: 'conv:foundItem', value: true }    // Conversation flag
      ]
    }
  }
}
```

## Key Points

- **Prefix notation**: Use `conv:flagName` for conversation flags. Unprefixed flags (or `game:flagName`) are game flags.

- **Flag values** can be boolean, number, or string. Choose based on what you're tracking.

- **Conditions** read flags to show/hide choices. See [Conditions](Concept-Conditions).

- **Interpolation** inserts flag values into text: `"You have {{gold}} gold."`

- **Conversation flags clear** when you call `runner.start()` on a new dialogue. Game flags persist.

## Examples

### Setting Flags

```typescript
// In a node's actions array
actions: [
  { type: 'set', flag: 'questStarted', value: true },
  { type: 'set', flag: 'gold', value: 500 },
  { type: 'set', flag: 'playerName', value: 'Hero' }
]
```

### Incrementing/Decrementing

```typescript
actions: [
  { type: 'increment', flag: 'visitCount' },           // +1
  { type: 'increment', flag: 'gold', value: 50 },      // +50
  { type: 'decrement', flag: 'health', value: 10 }     // -10
]
```

### Clearing Flags

```typescript
actions: [
  { type: 'clear', flag: 'tempBuff' }  // Remove the flag entirely
]
```

### Conversation Flags for Dialogue State

```typescript
const dialogue = {
  id: 'secret-keeper',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Hello again.',
      choices: [
        {
          text: 'Tell me the secret',
          next: 'secret',
          conditions: { not: { check: ['conv:heardSecret', '==', true] } }
        },
        {
          text: 'Remind me of the secret',
          next: 'reminder',
          conditions: { check: ['conv:heardSecret', '==', true] }
        }
      ]
    },
    secret: {
      text: 'The treasure is buried under the old oak tree.',
      actions: [{ type: 'set', flag: 'conv:heardSecret', value: true }],
      next: 'start'
    },
    reminder: {
      text: 'As I said, check under the old oak tree.',
      next: 'start'
    }
  }
}
```

The NPC remembers what they've told you within this conversation, but forgets if you leave and return.

### Accessing Flags at Runtime

```typescript
// Get all conversation flags
const convFlags = runner.getConversationFlags()
console.log(convFlags)  // { heardSecret: true, ... }

// Clear conversation flags manually
runner.clearConversationFlags()

// Game flags are accessed through your flag store
console.log(gameFlags.get('gold'))
```

## Related

- **[Actions](Concept-Actions)** - Commands that modify flags
- **[Conditions](Concept-Conditions)** - Expressions that read flags
- **[Working with Flags](Guide-Working-With-Flags)** - Practical guide to flag management
- **[Dynamic Text](Guide-Dynamic-Text)** - Interpolating flag values into text
