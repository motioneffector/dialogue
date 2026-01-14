# Conditional Choices

Show or hide dialogue choices based on game state. This guide covers adding conditions to choices and handling different flag types.

## Prerequisites

Before starting, you should:

- [Complete Your First Dialogue](Your-First-Dialogue)
- [Understand Flags](Concept-Flags)

## Overview

We'll create a shop interaction where purchase options appear only when the player has enough gold.

1. Define choices with conditions
2. Set up flags for the conditions to check
3. See choices appear/disappear based on state
4. Handle unavailable choices gracefully

## Step 1: Add Conditions to Choices

Conditions go in the `conditions` property of a choice. The basic format is `{ check: ['flagName', 'operator', value] }`.

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'

const shopDialogue: DialogueDefinition = {
  id: 'potion-shop',
  startNode: 'menu',
  nodes: {
    menu: {
      text: 'Welcome to the potion shop! What would you like?',
      choices: [
        {
          text: 'Buy Health Potion (50 gold)',
          next: 'bought-health',
          conditions: { check: ['gold', '>=', 50] }
        },
        {
          text: 'Buy Mana Potion (75 gold)',
          next: 'bought-mana',
          conditions: { check: ['gold', '>=', 75] }
        },
        {
          text: 'Leave',
          next: 'leave'
        }
      ]
    },
    'bought-health': {
      text: 'Here is your Health Potion!',
      actions: [{ type: 'decrement', flag: 'gold', value: 50 }],
      next: 'menu'
    },
    'bought-mana': {
      text: 'Here is your Mana Potion!',
      actions: [{ type: 'decrement', flag: 'gold', value: 75 }],
      next: 'menu'
    },
    leave: {
      text: 'Come back anytime!',
      isEnd: true
    }
  }
}
```

## Step 2: Set Up Game Flags

Create a flag store and set the player's gold before starting the dialogue.

```typescript
import { createFlagStore } from '@motioneffector/flags'

const gameFlags = createFlagStore()
gameFlags.set('gold', 100)

const runner = createDialogueRunner({ gameFlags })
await runner.start(shopDialogue)
```

With 100 gold, the player sees both potion options. After buying the 75-gold Mana Potion, only the Health Potion remains affordable.

## Step 3: Using Compound Conditions

Combine multiple requirements with `and`, `or`, and `not`.

```typescript
{
  text: 'Buy Legendary Sword',
  next: 'bought-sword',
  conditions: {
    and: [
      { check: ['gold', '>=', 1000] },
      { check: ['reputation', '>=', 50] },
      { check: ['questComplete', '==', true] }
    ]
  }
}
```

This choice only appears if the player has 1000+ gold, 50+ reputation, AND completed the quest.

```typescript
{
  text: 'Open the door',
  next: 'opened',
  conditions: {
    or: [
      { check: ['hasKey', '==', true] },
      { check: ['lockpickSkill', '>=', 10] }
    ]
  }
}
```

This choice appears if the player has a key OR high lockpick skill.

## Step 4: Show Unavailable Choices

Sometimes you want players to see what they're missing. Use `includeUnavailable: true`:

```typescript
const choices = runner.getChoices({ includeUnavailable: true })

choices.forEach(choice => {
  if (choice.available) {
    console.log(`[${choice.text}]`)
  } else {
    console.log(`[${choice.text}] - ${choice.reason}`)
    // Output: "[Buy Mana Potion (75 gold)] - Conditions not met"
  }
})
```

## Complete Example

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'
import { createFlagStore } from '@motioneffector/flags'

const dialogue: DialogueDefinition = {
  id: 'guild-master',
  startNode: 'greeting',
  nodes: {
    greeting: {
      text: 'Welcome to the Adventurer\'s Guild.',
      choices: [
        {
          text: 'I want to join',
          next: 'join-check',
          conditions: { not: { check: ['isGuildMember', '==', true] } }
        },
        {
          text: 'I\'d like a quest',
          next: 'quest-board',
          conditions: { check: ['isGuildMember', '==', true] }
        },
        {
          text: 'Request advanced quest',
          next: 'advanced-quest',
          conditions: {
            and: [
              { check: ['isGuildMember', '==', true] },
              { check: ['questsCompleted', '>=', 5] }
            ]
          }
        },
        { text: 'Goodbye', next: 'farewell' }
      ]
    },
    'join-check': {
      text: 'The fee is 100 gold. Do you have it?',
      choices: [
        {
          text: 'Yes, here you go',
          next: 'joined',
          conditions: { check: ['gold', '>=', 100] },
          actions: [
            { type: 'decrement', flag: 'gold', value: 100 },
            { type: 'set', flag: 'isGuildMember', value: true }
          ]
        },
        { text: 'I\'ll come back later', next: 'greeting' }
      ]
    },
    joined: {
      text: 'Welcome to the guild! Visit the quest board anytime.',
      next: 'greeting'
    },
    'quest-board': {
      text: 'Here are the available quests...',
      isEnd: true
    },
    'advanced-quest': {
      text: 'Ah, a seasoned adventurer. I have a special task for you.',
      isEnd: true
    },
    farewell: {
      text: 'Safe travels!',
      isEnd: true
    }
  }
}

async function main() {
  const gameFlags = createFlagStore()
  gameFlags.set('gold', 150)
  gameFlags.set('isGuildMember', false)
  gameFlags.set('questsCompleted', 0)

  const runner = createDialogueRunner({ gameFlags })
  await runner.start(dialogue)

  // Player sees: "I want to join", "Goodbye"
  // "I'd like a quest" is hidden (not a member)
  // "Request advanced quest" is hidden (not a member)
}
```

## Variations

### Using Conversation Flags

Track dialogue-specific state that resets between conversations:

```typescript
{
  text: 'Tell me again about the treasure',
  next: 'treasure-reminder',
  conditions: { check: ['conv:heardAboutTreasure', '==', true] }
}
```

### Disabled vs Conditional

Use `disabled: true` for choices that should be visible but not selectable:

```typescript
{
  text: 'Enter the VIP area',
  next: 'vip',
  disabled: true,
  disabledText: 'Members only'
}
```

To show disabled choices:

```typescript
const choices = runner.getChoices({ includeDisabled: true })
```

## Troubleshooting

### Choice Never Appears

**Symptom:** A conditional choice never shows up.

**Cause:** The condition checks a flag that doesn't exist or has the wrong value.

**Solution:** Log your flags before `getChoices()`:

```typescript
console.log(gameFlags.all())
const choices = runner.getChoices()
```

### Choice Appears When It Shouldn't

**Symptom:** A choice appears even when conditions should fail.

**Cause:** Operator or value mismatch. `'=='` is strict equality.

**Solution:** Double-check types. `{ check: ['count', '==', '5'] }` won't match the number `5`.

## See Also

- **[Conditions](Concept-Conditions)** - Deep dive into condition syntax
- **[Flags](Concept-Flags)** - Understanding flag scopes
- **[DialogueRunner API](API-DialogueRunner)** - getChoices() options
