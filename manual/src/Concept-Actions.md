# Actions

Actions are commands that execute when nodes are entered or choices are selected. They modify flags, trigger game callbacks, and enable dialogues to affect game state.

## How It Works

Actions are defined in arrays on nodes or choices:

```typescript
// Node actions: execute when entering the node
const node = {
  text: 'You found treasure!',
  actions: [
    { type: 'increment', flag: 'gold', value: 100 }
  ]
}

// Choice actions: execute when selecting the choice
const choice = {
  text: 'Bribe the guard',
  next: 'bribed',
  actions: [
    { type: 'decrement', flag: 'gold', value: 50 },
    { type: 'set', flag: 'guardBribed', value: true }
  ]
}
```

Actions execute in order. Node actions run before the node is displayed. Choice actions run before transitioning to the next node.

## Basic Usage

```typescript
import { createDialogueRunner } from '@motioneffector/dialogue'

const runner = createDialogueRunner({
  actionHandlers: {
    playSound: (args) => {
      const [soundName] = args as [string]
      console.log(`Playing sound: ${soundName}`)
    },
    giveItem: async (args) => {
      const [itemId, quantity] = args as [string, number]
      // Could be async database operation
      console.log(`Giving ${quantity}x ${itemId}`)
    }
  }
})

const dialogue = {
  id: 'reward',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Here is your reward!',
      actions: [
        { type: 'increment', flag: 'gold', value: 100 },
        { type: 'callback', name: 'playSound', args: ['coins.wav'] },
        { type: 'callback', name: 'giveItem', args: ['sword', 1] }
      ],
      isEnd: true
    }
  }
}
```

## Key Points

- **Action types**: `set`, `clear`, `increment`, `decrement`, `callback`

- **Execution order**: Actions run sequentially. Node actions before display, choice actions before transition.

- **Async support**: Callback actions can be async. The runner awaits them.

- **Fail-fast**: Missing callback handlers throw errors. Register all handlers before using them.

- **Flag scopes**: Use `conv:flagName` for conversation flags, unprefixed for game flags.

## Examples

### Set Flag

```typescript
{ type: 'set', flag: 'hasKey', value: true }
{ type: 'set', flag: 'playerName', value: 'Hero' }
{ type: 'set', flag: 'gold', value: 500 }
{ type: 'set', flag: 'conv:talkedOnce', value: true }  // Conversation flag
```

### Clear Flag

```typescript
{ type: 'clear', flag: 'tempBuff' }
{ type: 'clear', flag: 'conv:rememberedTopic' }
```

Removes the flag entirely. Subsequent condition checks for this flag return undefined.

### Increment

```typescript
{ type: 'increment', flag: 'visitCount' }              // +1
{ type: 'increment', flag: 'gold', value: 50 }         // +50
{ type: 'increment', flag: 'reputation', value: 10 }
```

If the flag doesn't exist, it's initialized to 0 before incrementing.

### Decrement

```typescript
{ type: 'decrement', flag: 'gold', value: 100 }
{ type: 'decrement', flag: 'health', value: 25 }
{ type: 'decrement', flag: 'stamina' }  // -1
```

### Callback

```typescript
{ type: 'callback', name: 'handlerName' }
{ type: 'callback', name: 'playSound', args: ['victory.mp3'] }
{ type: 'callback', name: 'addToInventory', args: ['potion', 3] }
```

Callbacks invoke registered action handlers:

```typescript
const runner = createDialogueRunner({
  actionHandlers: {
    playSound: (args) => {
      const [fileName] = args as [string]
      audioEngine.play(fileName)
    },
    addToInventory: async (args) => {
      const [item, count] = args as [string, number]
      await inventory.add(item, count)
    },
    triggerCutscene: (args) => {
      const [cutsceneId] = args as [string]
      cutsceneManager.play(cutsceneId)
    }
  }
})
```

### Multiple Actions

```typescript
const node = {
  text: 'You completed the quest!',
  actions: [
    { type: 'set', flag: 'quest1Complete', value: true },
    { type: 'increment', flag: 'gold', value: 200 },
    { type: 'increment', flag: 'experience', value: 50 },
    { type: 'callback', name: 'playSound', args: ['quest_complete.wav'] },
    { type: 'callback', name: 'showAchievement', args: ['First Quest'] }
  ],
  isEnd: true
}
```

### Actions on Choices

```typescript
const node = {
  text: 'The merchant offers you a deal.',
  choices: [
    {
      text: 'Accept (pay 100 gold)',
      next: 'accepted',
      conditions: { check: ['gold', '>=', 100] },
      actions: [
        { type: 'decrement', flag: 'gold', value: 100 },
        { type: 'set', flag: 'hasMerchantDeal', value: true }
      ]
    },
    {
      text: 'Decline',
      next: 'declined'
    }
  ]
}
```

### Listening to Actions

```typescript
const runner = createDialogueRunner({
  onActionExecuted: (action, result) => {
    console.log(`Action executed: ${action.type}`, result)
  }
})
```

## Related

- **[Flags](Concept-Flags)** - The state that actions modify
- **[Working with Flags](Guide-Working-With-Flags)** - Practical guide to state management
- **[Responding to Events](Guide-Responding-To-Events)** - Using onActionExecuted
- **[Types Reference](API-Types)** - Full Action type definition
