# Dynamic Text

Display personalized or variable text in dialogues using interpolation. Insert flag values, speaker names, or custom computed values into node text.

## Prerequisites

Before starting, you should:

- [Complete Your First Dialogue](Your-First-Dialogue)
- [Understand Flags](Concept-Flags)

## Overview

We'll create dialogue with dynamic greetings, status displays, and computed values.

1. Use `{{flagName}}` syntax for basic interpolation
2. Access both flag scopes
3. Register custom interpolation functions
4. Use the special `{{speaker}}` variable

## Step 1: Basic Flag Interpolation

Wrap flag names in double curly braces to insert their values.

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'
import { createFlagStore } from '@motioneffector/flags'

const gameFlags = createFlagStore()
gameFlags.set('playerName', 'Aria')
gameFlags.set('gold', 150)

const dialogue: DialogueDefinition = {
  id: 'greeting',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Welcome, {{playerName}}! You have {{gold}} gold.',
      isEnd: true
    }
  }
}

const runner = createDialogueRunner({ gameFlags })
const state = await runner.start(dialogue)

console.log(state.currentNode.text)
// Output: "Welcome, Aria! You have 150 gold."
```

## Step 2: Access Both Flag Scopes

Use `conv:` prefix for conversation flags:

```typescript
const dialogue: DialogueDefinition = {
  id: 'count-visits',
  startNode: 'start',
  nodes: {
    start: {
      text: 'This is visit #{{conv:visitCount}} in our conversation.',
      actions: [{ type: 'increment', flag: 'conv:visitCount' }],
      choices: [
        { text: 'Visit again', next: 'start' },
        { text: 'Leave', next: 'end' }
      ]
    },
    end: { text: 'Goodbye!', isEnd: true }
  }
}
```

Each time you loop back to start, the count increases.

## Step 3: Custom Interpolation Functions

Register functions that compute values dynamically:

```typescript
const runner = createDialogueRunner({
  gameFlags,
  interpolation: {
    time: () => {
      const hour = new Date().getHours()
      if (hour < 12) return 'morning'
      if (hour < 18) return 'afternoon'
      return 'evening'
    },
    healthStatus: (context) => {
      const health = context.gameFlags.get('health') as number
      if (health > 75) return 'healthy'
      if (health > 25) return 'wounded'
      return 'critical'
    }
  }
})

const dialogue: DialogueDefinition = {
  id: 'healer',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Good {{time}}, traveler. You look {{healthStatus}}.',
      isEnd: true
    }
  }
}

// Output (at 3pm, with health=50):
// "Good afternoon, traveler. You look wounded."
```

### Context Object

Custom interpolation functions receive a context object:

```typescript
interface InterpolationContext {
  currentNode: NodeDefinition
  speaker?: Speaker
  gameFlags: FlagStore
  conversationFlags: FlagStore
}
```

### Async Functions

Interpolation functions can be async:

```typescript
interpolation: {
  weatherReport: async () => {
    const response = await fetch('/api/weather')
    const data = await response.json()
    return data.condition
  }
}
```

## Step 4: Speaker Interpolation

Use `{{speaker}}` to insert the current speaker's name:

```typescript
const runner = createDialogueRunner({
  speakers: {
    guard: { name: 'Captain Reynolds' },
    merchant: { name: 'Old Tom' }
  }
})

const dialogue: DialogueDefinition = {
  id: 'intro',
  startNode: 'guard-speaks',
  nodes: {
    'guard-speaks': {
      speaker: 'guard',
      text: 'I am {{speaker}}, captain of the guard.',
      next: 'merchant-speaks'
    },
    'merchant-speaks': {
      speaker: 'merchant',
      text: 'And I am {{speaker}}. What can I do for you?',
      isEnd: true
    }
  }
}

// Outputs:
// "I am Captain Reynolds, captain of the guard."
// "And I am Old Tom. What can I do for you?"
```

## Complete Example

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'
import { createFlagStore } from '@motioneffector/flags'

const gameFlags = createFlagStore()
gameFlags.set('playerName', 'Kira')
gameFlags.set('gold', 500)
gameFlags.set('reputation', 75)
gameFlags.set('questsCompleted', 12)

const runner = createDialogueRunner({
  gameFlags,
  speakers: {
    guildmaster: { name: 'Master Aldric' }
  },
  interpolation: {
    rank: (ctx) => {
      const rep = ctx.gameFlags.get('reputation') as number
      if (rep >= 100) return 'Legend'
      if (rep >= 75) return 'Veteran'
      if (rep >= 50) return 'Journeyman'
      return 'Novice'
    },
    greeting: () => {
      const hour = new Date().getHours()
      if (hour < 12) return 'Good morning'
      if (hour < 18) return 'Good afternoon'
      return 'Good evening'
    }
  }
})

const dialogue: DialogueDefinition = {
  id: 'guild-status',
  startNode: 'status',
  nodes: {
    status: {
      speaker: 'guildmaster',
      text: '{{greeting}}, {{playerName}}! As a {{rank}}, you\'ve completed {{questsCompleted}} quests and earned {{gold}} gold. I am {{speaker}}, and I\'m proud of your progress.',
      isEnd: true
    }
  }
}

const state = await runner.start(dialogue)
console.log(state.currentNode.text)
// "Good afternoon, Kira! As a Veteran, you've completed 12 quests and earned 500 gold. I am Master Aldric, and I'm proud of your progress."
```

## Variations

### Missing Flags

Missing flags interpolate to empty string:

```typescript
text: 'Hello {{unknownFlag}}!'
// Output: "Hello !"
```

### Multiple Interpolations

Combine as many as needed:

```typescript
text: '{{playerName}} the {{playerClass}}: {{health}}/{{maxHealth}} HP, {{mana}}/{{maxMana}} MP'
```

### Computed Display Values

Use custom functions to format values:

```typescript
interpolation: {
  goldFormatted: (ctx) => {
    const gold = ctx.gameFlags.get('gold') as number
    return gold.toLocaleString()  // "1,234"
  },
  healthBar: (ctx) => {
    const health = ctx.gameFlags.get('health') as number
    const maxHealth = ctx.gameFlags.get('maxHealth') as number
    const bars = Math.round((health / maxHealth) * 10)
    return '█'.repeat(bars) + '░'.repeat(10 - bars)
  }
}
```

## Troubleshooting

### Value Shows as Empty

**Symptom:** `{{flagName}}` renders as nothing.

**Cause:** Flag doesn't exist or is undefined.

**Solution:** Set the flag before starting dialogue, or check your flag name spelling.

### Custom Function Not Called

**Symptom:** `{{custom}}` shows literally instead of computed value.

**Cause:** Function name not registered in interpolation options.

**Solution:** Verify the function is registered when creating the runner:

```typescript
const runner = createDialogueRunner({
  interpolation: {
    custom: () => 'value'  // Must match {{custom}}
  }
})
```

## See Also

- **[Flags](Concept-Flags)** - Understanding flag values
- **[Configuring Speakers](Guide-Configuring-Speakers)** - Setting up speaker names
- **[Types Reference](API-Types)** - InterpolationContext interface
