# @motioneffector/dialogue

Dialogue trees are like choose-your-own-adventure books: you read text, make choices, and the story branches. This library lets you define those trees as data and run them with full control over state, history, and events.

## I want to...

| Goal | Where to go |
|------|-------------|
| Get up and running quickly | [Your First Dialogue](Your-First-Dialogue) |
| Understand dialogue structure | [Dialogue Trees](Concept-Dialogue-Trees) |
| Show/hide choices based on state | [Conditional Choices](Guide-Conditional-Choices) |
| Track player progress | [Working with Flags](Guide-Working-With-Flags) |
| Save dialogue progress | [Saving and Restoring State](Guide-Saving-And-Restoring-State) |
| Look up a specific method | [API Reference](API-DialogueRunner) |

## Key Concepts

### Dialogue Trees

A dialogue is a graph of nodes connected by choices. Each node contains text (what's said) and optionally choices (what the player can do). Choices point to other nodes, creating branching paths through the conversation.

### The DialogueRunner

The runner is the engine that executes your dialogue. You give it a dialogue definition, and it maintains the current position, evaluates conditions, executes actions, and provides navigation methods like `back()` and `restart()`.

### Flags

Flags are key-value state that conditions and actions read/write. Game flags persist across dialogues; conversation flags reset when a new dialogue starts. Use them to track inventory, quest progress, or conversation-specific state.

### Conditions

Conditions are boolean expressions that determine if a choice is available. They check flag values using comparison operators (`==`, `>=`, etc.) and can be combined with `and`/`or`/`not` logic.

## Quick Example

```typescript
import { createDialogueRunner } from '@motioneffector/dialogue'

const dialogue = {
  id: 'greeting',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Hello, traveler! How can I help you?',
      choices: [
        { text: 'Tell me about this place', next: 'about' },
        { text: 'Goodbye', next: 'farewell' }
      ]
    },
    about: {
      text: 'This is the Village of Beginnings. Many adventurers start here.',
      next: 'start'  // Auto-advance back to start
    },
    farewell: {
      text: 'Safe travels!',
      isEnd: true
    }
  }
}

const runner = createDialogueRunner()
const state = await runner.start(dialogue)

console.log(state.currentNode.text)  // "Hello, traveler! How can I help you?"
console.log(state.availableChoices)  // Two choices available

await runner.choose(0)  // Select "Tell me about this place"
// Auto-advances to 'about', then back to 'start'
```

---

**[Full API Reference →](API-DialogueRunner)**
