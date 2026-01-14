# @motioneffector/dialogue

A lightweight, type-safe branching dialogue system for games and interactive fiction.

[![npm version](https://img.shields.io/npm/v/@motioneffector/dialogue.svg)](https://www.npmjs.com/package/@motioneffector/dialogue)
[![license](https://img.shields.io/npm/l/@motioneffector/dialogue.svg)](https://github.com/motioneffector/dialogue/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

**[Try the interactive demo →](https://motioneffector.github.io/dialogue/)**

## Features

- **Branching Dialogue Trees** - Complex conversation flows with multiple paths
- **Conditional Logic** - Show or hide choices based on flags
- **Flag System** - Game-wide and conversation-specific state tracking
- **Action System** - Execute callbacks and modify flags on events
- **Text Interpolation** - Dynamic text replacement from flags or functions
- **State Management** - History tracking, undo, save and restore
- **Event Hooks** - React to node transitions and choice selection
- **I18n Support** - Built-in internationalization adapter interface
- **Validation** - Comprehensive dialogue structure checking

[Read the full manual →](https://github.com/motioneffector/dialogue/wiki)

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
        { text: 'Tell me more', next: 'about' },
        { text: 'Goodbye', next: 'end' }
      ]
    },
    about: { text: 'I am a dialogue system.', next: 'start' },
    end: { text: 'Farewell!', isEnd: true }
  }
}

const runner = createDialogueRunner()
runner.start(dialogue)
runner.choose(0) // Select first choice
```

## Testing & Validation

- **Comprehensive test suite** - 255 unit tests covering core functionality
- **Fuzz tested** - Randomized input testing to catch edge cases
- **Strict TypeScript** - Full type coverage with no `any` types
- **Zero dependencies** - No supply chain risk

## License

MIT © [motioneffector](https://github.com/motioneffector)
