# @motioneffector/dialogue

A lightweight, type-safe branching dialogue system for games and interactive fiction. Create complex conversation trees with conditional branches, flag-based state management, and dynamic text interpolation.

[![npm version](https://img.shields.io/npm/v/@motioneffector/dialogue.svg)](https://www.npmjs.com/package/@motioneffector/dialogue)
[![license](https://img.shields.io/npm/l/@motioneffector/dialogue.svg)](https://github.com/motioneffector/dialogue/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**[Try the interactive demo →](https://motioneffector.github.io/dialogue/index.html)**

## Installation

```bash
npm install @motioneffector/dialogue
```

## Quick Start

```typescript
import { createDialogueRunner } from '@motioneffector/dialogue'

const dialogue = {
  id: 'greeting',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Hello! How can I help you?',
      choices: [
        { text: 'Tell me about yourself', next: 'about' },
        { text: 'Goodbye', next: 'end' }
      ]
    },
    about: {
      text: 'I am a dialogue system built with TypeScript.',
      next: 'start'
    },
    end: {
      text: 'Farewell!',
      isEnd: true
    }
  }
}

const runner = createDialogueRunner()
const state = runner.start(dialogue)
const choices = runner.getChoices()
runner.choose(0) // Select first choice
```

## Features

- **Branching Dialogue Trees** - Create complex conversation flows with multiple paths
- **Conditional Logic** - Show/hide choices based on game state using flexible condition syntax
- **Flag System** - Track both game-wide and conversation-specific flags
- **Action System** - Execute actions on choice selection or node entry
- **Text Interpolation** - Dynamic text replacement from flags or custom sources
- **State Management** - Built-in history, back navigation, and serialization/deserialization
- **Event Hooks** - React to dialogue events (node enter/exit, choice selection, etc.)
- **I18n Support** - Built-in internationalization adapter interface
- **Validation** - Comprehensive dialogue structure validation
- Full TypeScript support with complete type definitions
- Zero dependencies
- Tree-shakeable ESM build

## API Reference

### `createDialogueRunner(options?)`

Creates a new dialogue runner instance.

**Options:**
- `gameFlags` - FlagStore for game-wide flags (optional)
- `actionHandlers` - Custom callback handlers for action execution (optional)
- `speakers` - Speaker metadata (name, portrait, color) (optional)
- `i18n` - Internationalization adapter (optional)
- `interpolation` - Custom interpolation functions (optional)
- `onNodeEnter` - Callback when entering a node (optional)
- `onNodeExit` - Callback when exiting a node (optional)
- `onChoiceSelected` - Callback when a choice is selected (optional)
- `onDialogueStart` - Callback when dialogue starts (optional)
- `onDialogueEnd` - Callback when dialogue ends (optional)
- `onActionExecuted` - Callback when an action is executed (optional)
- `onConditionEvaluated` - Callback when a condition is evaluated (optional)

**Returns:** `DialogueRunner`

**Example:**
```typescript
import { createDialogueRunner } from '@motioneffector/dialogue'

const runner = createDialogueRunner({
  actionHandlers: {
    playSound: (args) => {
      console.log('Playing sound:', args?.[0])
    }
  },
  speakers: {
    narrator: { name: 'Narrator', color: '#888' },
    hero: { name: 'Hero', color: '#44f', portrait: '/hero.png' }
  },
  onNodeEnter: (node, speaker) => {
    console.log(`${speaker?.name || 'Unknown'}: ${node.text}`)
  }
})
```

### `runner.start(dialogue)`

Starts a new dialogue.

**Parameters:**
- `dialogue` - DialogueDefinition object containing nodes and metadata

**Returns:** `DialogueState` - Current state with node and available choices

**Example:**
```typescript
const state = runner.start({
  id: 'quest-start',
  startNode: 'greeting',
  nodes: {
    greeting: {
      text: 'Welcome, traveler!',
      speaker: 'guard',
      choices: [
        { text: 'Hello', next: 'quest-offer' }
      ]
    }
  }
})
```

### `runner.getChoices(options?)`

Gets available choices for the current node.

**Options:**
- `includeUnavailable` - Include choices that fail conditions (default: false)
- `includeDisabled` - Include manually disabled choices (default: false)
- `filter` - Custom filter function (optional)

**Returns:** `ChoiceDefinition[]` or `ChoiceWithAvailability[]`

**Example:**
```typescript
// Get only available choices
const choices = runner.getChoices()

// Get all choices with availability info
const allChoices = runner.getChoices({ includeUnavailable: true })
allChoices.forEach(choice => {
  console.log(`${choice.text} - Available: ${choice.available}`)
})
```

### `runner.choose(index)`

Selects a choice by index and advances the dialogue.

**Parameters:**
- `index` - Zero-based index of the choice to select

**Returns:** `DialogueState` - Updated dialogue state

**Example:**
```typescript
const state = runner.choose(0)
if (state.isEnded) {
  console.log('Dialogue completed')
}
```

### `runner.getCurrentNode()`

Gets the current dialogue node.

**Returns:** `NodeDefinition | null`

### `runner.isEnded()`

Checks if the dialogue has ended.

**Returns:** `boolean`

### `runner.getHistory()`

Gets the full dialogue history.

**Returns:** `HistoryEntry[]` - Array of visited nodes and choices

### `runner.back()`

Goes back to the previous node in history.

**Example:**
```typescript
runner.back() // Undo last choice
```

### `runner.restart(options?)`

Restarts the current dialogue.

**Options:**
- `preserveConversationFlags` - Keep conversation flags (default: false)

**Returns:** `DialogueState`

**Example:**
```typescript
runner.restart({ preserveConversationFlags: true })
```

### `runner.jumpTo(nodeId)`

Jumps directly to a specific node.

**Parameters:**
- `nodeId` - ID of the node to jump to

**Example:**
```typescript
runner.jumpTo('secret-ending')
```

### `runner.serialize()`

Serializes the current dialogue state.

**Returns:** `SerializedState` - JSON-serializable state object

**Example:**
```typescript
const savedState = runner.serialize()
localStorage.setItem('dialogue-save', JSON.stringify(savedState))
```

### `runner.deserialize(state)`

Restores dialogue from serialized state.

**Parameters:**
- `state` - Previously serialized state object

**Example:**
```typescript
const savedState = JSON.parse(localStorage.getItem('dialogue-save'))
runner.deserialize(savedState)
```

### `runner.getConversationFlags()`

Gets all conversation-specific flags.

**Returns:** `Record<string, FlagValue>`

### `runner.clearConversationFlags()`

Clears all conversation flags.

### `validateDialogue(dialogue)`

Validates a dialogue definition structure.

**Parameters:**
- `dialogue` - DialogueDefinition to validate

**Returns:** `ValidationResult` with `valid` boolean and `errors` array

**Example:**
```typescript
import { validateDialogue } from '@motioneffector/dialogue'

const result = validateDialogue(myDialogue)
if (!result.valid) {
  console.error('Validation errors:', result.errors)
}
```

## Dialogue Definition Format

```typescript
const dialogue = {
  id: 'my-dialogue',
  startNode: 'start',
  metadata: { /* optional custom data */ },
  nodes: {
    start: {
      text: 'Node text',
      speaker: 'character-id', // optional
      tags: ['tutorial', 'intro'], // optional
      actions: [ // optional
        { type: 'set', flag: 'met_character', value: true }
      ],
      choices: [ // optional
        {
          text: 'Choice text',
          next: 'target-node',
          conditions: { /* optional */ },
          actions: [ /* optional */ ],
          disabled: false, // optional
          disabledText: 'Alternative text when disabled' // optional
        }
      ],
      next: 'auto-next-node', // optional, auto-advances
      isEnd: false // optional, marks dialogue end
    }
  }
}
```

## Conditions

Conditions control choice and node visibility based on flags.

```typescript
// Simple check
{ check: ['flag-name', '==', true] }

// Scoped flags
{ check: ['game:player_level', '>=', 5] }
{ check: ['conv:askedName', '==', true] }

// Logical operators
{ and: [condition1, condition2] }
{ or: [condition1, condition2] }
{ not: condition }

// Complex example
{
  and: [
    { check: ['game:gold', '>=', 100] },
    { or: [
      { check: ['conv:visited_shop', '==', true] },
      { check: ['game:reputation', '>', 50] }
    ]}
  ]
}
```

Supported operators: `==`, `!=`, `>`, `<`, `>=`, `<=`

## Actions

Actions are executed when entering nodes or selecting choices.

```typescript
// Set a flag
{ type: 'set', flag: 'quest_active', value: true }

// Clear a flag
{ type: 'clear', flag: 'temporary_data' }

// Increment a number flag
{ type: 'increment', flag: 'score', value: 10 }

// Decrement a number flag
{ type: 'decrement', flag: 'health', value: 5 }

// Custom callback
{ type: 'callback', name: 'playSound', args: ['coin.wav'] }
```

Flags can be scoped with `game:` or `conv:` prefix. Unscoped flags default to game scope.

## Text Interpolation

Replace placeholders in dialogue text dynamically.

```typescript
const runner = createDialogueRunner({
  interpolation: {
    playerName: () => 'Alice',
    gold: (ctx) => ctx.gameFlags.get('gold')?.toString() || '0'
  }
})

// In dialogue text:
// "Welcome back, {playerName}! You have {gold} gold."
```

## Error Handling

```typescript
import { DialogueError, ValidationError, DialogueStructureError }
  from '@motioneffector/dialogue'

try {
  runner.start(dialogue)
} catch (e) {
  if (e instanceof ValidationError) {
    console.error('Invalid dialogue field:', e.field)
  } else if (e instanceof DialogueStructureError) {
    console.error('Structure error in dialogue:', e.dialogueId, 'node:', e.nodeId)
  } else if (e instanceof DialogueError) {
    console.error('Dialogue error:', e.message)
  }
}
```

## I18n Support

Integrate with your i18n library:

```typescript
import { createI18nAdapter } from '@motioneffector/dialogue'

const i18nAdapter = createI18nAdapter({
  t: (key, params) => i18n.t(key, params),
  hasKey: (key) => i18n.exists(key)
})

const runner = createDialogueRunner({ i18n: i18nAdapter })

// Use keys in dialogue text
const dialogue = {
  nodes: {
    start: {
      text: 'dialogue.greeting', // Will be translated
      choices: [
        { text: 'dialogue.choice1', next: 'next' }
      ]
    }
  }
}
```

## Browser Support

Works in all modern browsers (ES2022+). For older browsers, use a transpiler.

## License

MIT © [motioneffector](https://github.com/motioneffector)
