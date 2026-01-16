# Dialogue Trees

A dialogue tree is a graph of nodes connected by choices. Each node represents a moment in the conversation: what someone says, what the player can do, and where the conversation goes next.

## How It Works

Think of a dialogue as a flowchart:

```
[Start] → "Hello!"
              ↓
         ┌─────────┐
         │ Choices │
         └─────────┘
        ↙           ↘
  "Help me"      "Goodbye"
       ↓              ↓
   [Help]         [Farewell]
   "Sure!"        "Bye!"
       ↓              ↓
    [END]          [END]
```

The player enters at the start node, reads text, picks a choice, moves to the next node, and repeats until reaching an end node.

## Basic Usage

```typescript
import { DialogueDefinition } from '@motioneffector/dialogue'

const dialogue: DialogueDefinition = {
  id: 'shopkeeper',
  startNode: 'greeting',
  nodes: {
    greeting: {
      text: 'Welcome to my shop!',
      speaker: 'merchant',
      choices: [
        { text: 'What do you sell?', next: 'inventory' },
        { text: 'Just browsing', next: 'farewell' }
      ]
    },
    inventory: {
      text: 'I have potions, scrolls, and weapons.',
      next: 'greeting'  // Auto-advance back to greeting
    },
    farewell: {
      text: 'Come back anytime!',
      isEnd: true
    }
  }
}
```

The dialogue definition has three parts: `id` (unique identifier), `startNode` (where to begin), and `nodes` (the actual content).

## Key Points

- **DialogueDefinition** has `id`, `startNode`, and `nodes`. The `id` is used for serialization and events.

- **NodeDefinition** contains `text` (required), plus optional `speaker`, `choices`, `actions`, `tags`, `next`, and `isEnd`.

- **ChoiceDefinition** has `text` and `next` (required), plus optional `conditions`, `actions`, `tags`, `disabled`, and `disabledText`.

- **Auto-advance nodes** use `next` instead of `choices`. The runner automatically moves to the next node without player input. Useful for NPC monologues or cutscenes.

- **End nodes** are marked with `isEnd: true` or simply have no `choices` and no `next`. When reached, the dialogue is complete.

## Examples

### Linear Sequence (Auto-Advance)

```typescript
const cutscene: DialogueDefinition = {
  id: 'intro-cutscene',
  startNode: 'line1',
  nodes: {
    line1: {
      text: 'The kingdom has fallen.',
      next: 'line2'
    },
    line2: {
      text: 'Only you can restore it.',
      next: 'line3'
    },
    line3: {
      text: 'Your journey begins now.',
      isEnd: true
    }
  }
}
```

Each node auto-advances to the next. No player choices needed.

### Branching Paths

```typescript
const quest: DialogueDefinition = {
  id: 'quest-choice',
  startNode: 'offer',
  nodes: {
    offer: {
      text: 'Will you help us?',
      choices: [
        { text: 'I accept', next: 'accept' },
        { text: 'I refuse', next: 'refuse' },
        { text: 'Tell me more first', next: 'details' }
      ]
    },
    details: {
      text: 'Bandits have stolen our supplies. We need them back.',
      next: 'offer'  // Return to the choice
    },
    accept: {
      text: 'Thank you! Here is the map to their hideout.',
      isEnd: true
    },
    refuse: {
      text: 'I understand. Perhaps another time.',
      isEnd: true
    }
  }
}
```

Multiple choices branch to different paths. Some paths converge, others end separately.

### Looping Conversations

```typescript
const shopLoop: DialogueDefinition = {
  id: 'shop-menu',
  startNode: 'menu',
  nodes: {
    menu: {
      text: 'What would you like?',
      choices: [
        { text: 'Buy items', next: 'buy' },
        { text: 'Sell items', next: 'sell' },
        { text: 'Leave', next: 'leave' }
      ]
    },
    buy: {
      text: 'Here are my wares...',
      next: 'menu'  // Loop back
    },
    sell: {
      text: 'Show me what you have...',
      next: 'menu'  // Loop back
    },
    leave: {
      text: 'Goodbye!',
      isEnd: true
    }
  }
}
```

Nodes can point back to earlier nodes, creating loops. The player stays in the dialogue until they choose to leave.

## Related

- **[The DialogueRunner](Concept-DialogueRunner)** - How to execute dialogue trees
- **[Conditional Choices](Guide-Conditional-Choices)** - Hide choices based on game state
- **[Types Reference](API-Types)** - Full type definitions for DialogueDefinition, NodeDefinition, etc.
