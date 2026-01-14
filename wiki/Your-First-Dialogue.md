# Your First Dialogue

Build a working branching dialogue in about 5 minutes.

By the end of this guide, you'll have a 3-node conversation where the player can choose between two paths, each leading to a different ending.

## What We're Building

A simple NPC greeting where the player can ask for help or say goodbye:

```
NPC: "Welcome! Need any help?"
  → "Yes, I'm lost" → NPC: "The exit is north." → END
  → "No thanks"     → NPC: "Safe travels!"     → END
```

## Step 1: Define the Dialogue Structure

A dialogue needs three things: an `id`, a `startNode`, and a `nodes` object containing all the conversation nodes.

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'

const dialogue: DialogueDefinition = {
  id: 'npc-greeting',
  startNode: 'welcome',
  nodes: {
    welcome: {
      text: 'Welcome! Need any help?',
      choices: [
        { text: 'Yes, I\'m lost', next: 'help' },
        { text: 'No thanks', next: 'goodbye' }
      ]
    },
    help: {
      text: 'The exit is to the north. Good luck!',
      isEnd: true
    },
    goodbye: {
      text: 'Safe travels!',
      isEnd: true
    }
  }
}
```

Each node has `text` (what's displayed) and either `choices` (player options) or `isEnd: true` (conversation ends here).

## Step 2: Create the Runner and Start

The `DialogueRunner` manages the dialogue state. Create one and call `start()` with your dialogue.

```typescript
const runner = createDialogueRunner()
const state = await runner.start(dialogue)

console.log(state.currentNode.text)
// Output: "Welcome! Need any help?"
```

The `state` object tells you the current node, available choices, and whether the dialogue has ended.

## Step 3: Display Choices

Get available choices with `getChoices()`. These are the options the player can select.

```typescript
const choices = runner.getChoices()

choices.forEach((choice, index) => {
  console.log(`${index}: ${choice.text}`)
})
// Output:
// 0: Yes, I'm lost
// 1: No thanks
```

## Step 4: Make a Choice

When the player selects an option, call `choose()` with the choice index.

```typescript
const newState = await runner.choose(0)  // Player selects "Yes, I'm lost"

console.log(newState.currentNode.text)
// Output: "The exit is to the north. Good luck!"

console.log(newState.isEnded)
// Output: true
```

## Step 5: Check for End

Use `isEnded()` to know when the conversation is complete.

```typescript
if (runner.isEnded()) {
  console.log('Dialogue complete!')
}
```

## The Complete Code

Here's everything together:

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'

const dialogue: DialogueDefinition = {
  id: 'npc-greeting',
  startNode: 'welcome',
  nodes: {
    welcome: {
      text: 'Welcome! Need any help?',
      choices: [
        { text: 'Yes, I\'m lost', next: 'help' },
        { text: 'No thanks', next: 'goodbye' }
      ]
    },
    help: {
      text: 'The exit is to the north. Good luck!',
      isEnd: true
    },
    goodbye: {
      text: 'Safe travels!',
      isEnd: true
    }
  }
}

async function runDialogue() {
  const runner = createDialogueRunner()
  let state = await runner.start(dialogue)

  while (!state.isEnded) {
    // Display current text
    console.log(`NPC: ${state.currentNode.text}`)

    // Display choices
    const choices = runner.getChoices()
    choices.forEach((choice, i) => console.log(`  ${i}: ${choice.text}`))

    // For this example, always pick the first choice
    state = await runner.choose(0)
  }

  // Display final text
  console.log(`NPC: ${state.currentNode.text}`)
  console.log('--- Dialogue Complete ---')
}

runDialogue()
```

## What's Next?

Now that you have the basics:

- **[Understand Dialogue Trees](Concept-Dialogue-Trees)** - Learn how nodes, choices, and auto-advance work
- **[Add Conditional Choices](Guide-Conditional-Choices)** - Show/hide choices based on game state
- **[Track State with Flags](Guide-Working-With-Flags)** - Remember player decisions across dialogues
- **[Explore the API](API-DialogueRunner)** - Full reference for all runner methods
