# Conditions

Conditions are boolean expressions that control choice visibility. A choice with a failing condition is hidden from the player (by default) or shown as unavailable.

## How It Works

Conditions check flag values using comparison operators. They can be combined with logical operators to create complex requirements.

```typescript
// Simple: "player has at least 100 gold"
conditions: { check: ['gold', '>=', 100] }

// Compound: "player has key AND is not poisoned"
conditions: {
  and: [
    { check: ['hasKey', '==', true] },
    { not: { check: ['isPoisoned', '==', true] } }
  ]
}
```

When evaluating choices, the runner:
1. Checks each choice's conditions against current flags
2. Hides choices with failing conditions (by default)
3. Returns only available choices from `getChoices()`

## Basic Usage

```typescript
const dialogue = {
  id: 'locked-door',
  startNode: 'door',
  nodes: {
    door: {
      text: 'A locked door blocks your path.',
      choices: [
        {
          text: 'Use the key',
          next: 'opened',
          conditions: { check: ['hasKey', '==', true] }
        },
        {
          text: 'Force it open (Strength 15+)',
          next: 'forced',
          conditions: { check: ['strength', '>=', 15] }
        },
        {
          text: 'Leave',
          next: 'leave'
        }
      ]
    },
    opened: { text: 'The door swings open.', isEnd: true },
    forced: { text: 'You break down the door!', isEnd: true },
    leave: { text: 'You walk away.', isEnd: true }
  }
}
```

If the player has no key and strength < 15, only "Leave" appears.

## Key Points

- **Basic check format**: `{ check: ['flagName', 'operator', value] }`

- **Operators**: `==`, `!=`, `>`, `<`, `>=`, `<=`

- **Combinators**: `{ and: [...] }`, `{ or: [...] }`, `{ not: {...} }`

- **Missing flags** are treated as `undefined`. A check like `['missingFlag', '==', true]` fails.

- **Nesting**: Combine operators arbitrarily: `{ and: [{ or: [...] }, { not: {...} }] }`

- **Hidden by default**: Failing conditions hide the choice. Use `getChoices({ includeUnavailable: true })` to see all choices with availability info.

## Examples

### Numeric Comparisons

```typescript
// Must have enough gold
conditions: { check: ['gold', '>=', 100] }

// Health below threshold
conditions: { check: ['health', '<', 25] }

// Exact level match
conditions: { check: ['level', '==', 10] }
```

### Boolean Checks

```typescript
// Flag is true
conditions: { check: ['hasKey', '==', true] }

// Flag is false (or missing)
conditions: { check: ['isEvil', '==', false] }

// Flag is NOT true (same as above, different style)
conditions: { not: { check: ['isEvil', '==', true] } }
```

### String Comparisons

```typescript
// Specific class
conditions: { check: ['playerClass', '==', 'mage'] }

// Not a specific faction
conditions: { check: ['faction', '!=', 'enemy'] }
```

### AND - All Must Pass

```typescript
// Need both key AND enough gold
conditions: {
  and: [
    { check: ['hasKey', '==', true] },
    { check: ['gold', '>=', 50] }
  ]
}
```

### OR - Any Must Pass

```typescript
// Can open with key OR lockpick
conditions: {
  or: [
    { check: ['hasKey', '==', true] },
    { check: ['hasLockpick', '==', true] }
  ]
}
```

### NOT - Invert Result

```typescript
// Only if NOT poisoned
conditions: { not: { check: ['isPoisoned', '==', true] } }
```

### Complex Nested Conditions

```typescript
// (hasKey OR hasLockpick) AND (NOT isWounded) AND (gold >= 10)
conditions: {
  and: [
    {
      or: [
        { check: ['hasKey', '==', true] },
        { check: ['hasLockpick', '==', true] }
      ]
    },
    { not: { check: ['isWounded', '==', true] } },
    { check: ['gold', '>=', 10] }
  ]
}
```

### Conversation Flags in Conditions

```typescript
// Only show if we discussed this topic in this conversation
conditions: { check: ['conv:discussedQuest', '==', true] }
```

### Showing Unavailable Choices

```typescript
const choices = runner.getChoices({ includeUnavailable: true })

choices.forEach(choice => {
  if (choice.available) {
    console.log(`[ ] ${choice.text}`)
  } else {
    console.log(`[X] ${choice.text} (${choice.reason})`)
  }
})
```

This lets you show grayed-out choices so players know what they're missing.

## Related

- **[Flags](Concept-Flags)** - The state that conditions check
- **[Conditional Choices](Guide-Conditional-Choices)** - Practical guide to conditional logic
- **[Types Reference](API-Types)** - Full Condition type definition
