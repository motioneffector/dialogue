# Working with Flags

Track and modify state during conversations. This guide covers setting flags, using both scopes, and integrating with your game's state management.

## Prerequisites

Before starting, you should:

- [Complete Your First Dialogue](Your-First-Dialogue)

## Overview

We'll build a quest dialogue that tracks progress, rewards the player, and remembers conversation state.

1. Set flags via actions
2. Use game flags for persistent state
3. Use conversation flags for dialogue-specific state
4. Integrate an external flag store

## Step 1: Set Flags via Actions

Actions in nodes or choices can set, increment, decrement, or clear flags.

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'

const dialogue: DialogueDefinition = {
  id: 'quest-giver',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Will you retrieve the ancient artifact?',
      choices: [
        {
          text: 'I accept this quest',
          next: 'accepted',
          actions: [
            { type: 'set', flag: 'quest_artifact', value: 'active' },
            { type: 'increment', flag: 'activeQuests' }
          ]
        },
        {
          text: 'Not right now',
          next: 'declined'
        }
      ]
    },
    accepted: {
      text: 'Excellent! Find it in the northern caves.',
      isEnd: true
    },
    declined: {
      text: 'Return when you\'re ready.',
      isEnd: true
    }
  }
}
```

## Step 2: Use Game Flags for Persistent State

Game flags persist across dialogues. Perfect for inventory, quest progress, and player stats.

```typescript
import { createFlagStore } from '@motioneffector/flags'

const gameFlags = createFlagStore()
gameFlags.set('gold', 100)
gameFlags.set('playerLevel', 5)

const runner = createDialogueRunner({ gameFlags })
await runner.start(dialogue)

// After accepting the quest:
console.log(gameFlags.get('quest_artifact'))  // 'active'
console.log(gameFlags.get('activeQuests'))    // 1

// Start a different dialogue - game flags persist
await runner.start(anotherDialogue)
console.log(gameFlags.get('quest_artifact'))  // Still 'active'
```

## Step 3: Use Conversation Flags for Dialogue State

Conversation flags reset when a new dialogue starts. Use them for "have we discussed this topic?" tracking.

```typescript
const dialogue: DialogueDefinition = {
  id: 'informant',
  startNode: 'start',
  nodes: {
    start: {
      text: 'What do you want to know?',
      choices: [
        {
          text: 'Tell me about the thieves guild',
          next: 'thieves',
          conditions: { not: { check: ['conv:asked_thieves', '==', true] } }
        },
        {
          text: 'Any news about the thieves guild?',
          next: 'thieves-update',
          conditions: { check: ['conv:asked_thieves', '==', true] }
        },
        { text: 'Nevermind', next: 'end' }
      ]
    },
    thieves: {
      text: 'They operate from the old warehouse...',
      actions: [{ type: 'set', flag: 'conv:asked_thieves', value: true }],
      next: 'start'
    },
    'thieves-update': {
      text: 'Nothing new since we last spoke.',
      next: 'start'
    },
    end: { text: 'Be careful out there.', isEnd: true }
  }
}
```

The first time you ask about thieves, you get the full explanation. Ask again in the same conversation, you get the shorter response. Leave and return - the conversation flags reset.

## Step 4: Integrate External Flag Store

For real games, you likely have your own state management. Pass a compatible FlagStore:

```typescript
import { createFlagStore } from '@motioneffector/flags'

// Your game's central state
const gameState = createFlagStore()

// Initialize from save data, database, etc.
gameState.set('gold', savedGame.gold)
gameState.set('playerName', savedGame.name)

// Pass to dialogue runner
const runner = createDialogueRunner({ gameFlags: gameState })

// After dialogues, save your state
function saveGame() {
  const data = gameState.all()
  localStorage.setItem('save', JSON.stringify(data))
}
```

## Complete Example

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'
import { createFlagStore } from '@motioneffector/flags'

const dialogue: DialogueDefinition = {
  id: 'blacksmith',
  startNode: 'greeting',
  nodes: {
    greeting: {
      text: 'Welcome to my forge! You have {{gold}} gold.',
      choices: [
        {
          text: 'Buy Iron Sword (50g)',
          next: 'bought-sword',
          conditions: { check: ['gold', '>=', 50] },
          actions: [
            { type: 'decrement', flag: 'gold', value: 50 },
            { type: 'set', flag: 'hasIronSword', value: true },
            { type: 'set', flag: 'conv:madePurchase', value: true }
          ]
        },
        {
          text: 'Upgrade my sword',
          next: 'upgrade',
          conditions: {
            and: [
              { check: ['hasIronSword', '==', true] },
              { check: ['gold', '>=', 100] }
            ]
          }
        },
        {
          text: 'Just browsing',
          next: 'browse'
        }
      ]
    },
    'bought-sword': {
      text: 'A fine choice! This blade will serve you well.',
      next: 'greeting'
    },
    upgrade: {
      text: 'I\'ll make this blade even stronger!',
      actions: [
        { type: 'decrement', flag: 'gold', value: 100 },
        { type: 'set', flag: 'hasSteelSword', value: true },
        { type: 'clear', flag: 'hasIronSword' }
      ],
      next: 'greeting'
    },
    browse: {
      text: 'Take your time. Let me know if you need anything.',
      choices: [
        {
          text: 'Actually, I\'ll buy something',
          next: 'greeting',
          conditions: { not: { check: ['conv:madePurchase', '==', true] } }
        },
        {
          text: 'Thanks, goodbye',
          next: 'farewell'
        }
      ]
    },
    farewell: {
      text: 'Come back when you need quality steel!',
      isEnd: true
    }
  }
}

async function main() {
  const gameFlags = createFlagStore()
  gameFlags.set('gold', 200)
  gameFlags.set('playerName', 'Hero')

  const runner = createDialogueRunner({ gameFlags })
  await runner.start(dialogue)

  // Simulate gameplay
  console.log('Starting gold:', gameFlags.get('gold'))

  // After some choices...
  console.log('Has sword:', gameFlags.get('hasIronSword'))
  console.log('Remaining gold:', gameFlags.get('gold'))
}
```

## Variations

### Counter Flags

Track counts with increment/decrement:

```typescript
actions: [
  { type: 'increment', flag: 'timesVisited' },
  { type: 'increment', flag: 'reputation', value: 5 }
]

// Use in conditions
conditions: { check: ['timesVisited', '>=', 3] }
```

### Clearing Flags

Remove a flag entirely:

```typescript
actions: [
  { type: 'clear', flag: 'temporaryBuff' }
]
```

### Reading Flags at Runtime

```typescript
// Get all conversation flags
const convFlags = runner.getConversationFlags()

// Clear conversation flags manually
runner.clearConversationFlags()

// Game flags through your store
console.log(gameFlags.all())
```

## Troubleshooting

### Flag Value Not Updating

**Symptom:** Actions run but flag values seem unchanged.

**Cause:** Checking the wrong scope or reading before the action executes.

**Solution:** Remember node actions run on entry. The new value is available immediately after.

### Conversation Flags Persisting

**Symptom:** Conversation flags from a previous dialogue appear in a new one.

**Cause:** You haven't called `start()` on a new dialogue.

**Solution:** `start()` clears conversation flags. If you need them cleared manually, call `runner.clearConversationFlags()`.

## See Also

- **[Flags](Concept-Flags)** - Understanding the two scopes
- **[Actions](Concept-Actions)** - All action types
- **[Dynamic Text](Guide-Dynamic-Text)** - Displaying flag values in text
