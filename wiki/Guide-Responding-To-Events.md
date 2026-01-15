# Responding to Events

React to dialogue events in your game code. Trigger animations, play sounds, update UI, or log analytics when things happen in the dialogue.

## Prerequisites

Before starting, you should:

- [Complete Your First Dialogue](Your-First-Dialogue)

## Overview

We'll connect dialogue events to game systems like audio, animation, and analytics.

1. Register event callbacks
2. Handle node transitions
3. Respond to choices
4. Debug with action and condition events

## Step 1: Register Event Callbacks

Pass callbacks in the runner options:

```typescript
import { createDialogueRunner } from '@motioneffector/dialogue'

const runner = createDialogueRunner({
  onDialogueStart: (dialogue) => {
    console.log(`Starting dialogue: ${dialogue.id}`)
  },
  onDialogueEnd: (dialogueId, endNode) => {
    console.log(`Dialogue ${dialogueId} ended at node: ${endNode?.text}`)
  },
  onNodeEnter: (node, speaker) => {
    console.log(`Entered node: ${node.text.substring(0, 50)}...`)
  },
  onNodeExit: (node) => {
    console.log(`Exited node`)
  },
  onChoiceSelected: (choice, index) => {
    console.log(`Player chose option ${index}: ${choice.text}`)
  }
})
```

## Step 2: Handle Node Transitions

`onNodeEnter` fires every time a new node is displayed. Use it to update your UI:

```typescript
const runner = createDialogueRunner({
  speakers: {
    npc: { name: 'Elder', portrait: 'elder.png' }
  },
  onNodeEnter: (node, speaker) => {
    // Update dialogue box
    dialogueUI.setText(node.text)

    // Update speaker display
    if (speaker) {
      dialogueUI.showSpeaker(speaker.name, speaker.portrait)
    } else {
      dialogueUI.hidePortrait()  // Narrator text
    }

    // Play voice line if tagged
    if (node.tags?.includes('voiced')) {
      audioManager.playVoice(node.speaker, node.text)
    }
  },
  onNodeExit: (node) => {
    // Clean up previous node
    audioManager.stopVoice()
  }
})
```

## Step 3: Respond to Choices

`onChoiceSelected` fires when the player makes a selection:

```typescript
const runner = createDialogueRunner({
  onChoiceSelected: (choice, index) => {
    // Play click sound
    audioManager.play('ui_click')

    // Log for analytics
    analytics.track('dialogue_choice', {
      choice: choice.text,
      index: index,
      tags: choice.tags
    })

    // Trigger animation based on choice tags
    if (choice.tags?.includes('aggressive')) {
      characterAnimator.play('angry_gesture')
    } else if (choice.tags?.includes('friendly')) {
      characterAnimator.play('smile')
    }
  }
})
```

## Step 4: Debug Events

`onActionExecuted` and `onConditionEvaluated` help debug complex dialogues:

```typescript
const runner = createDialogueRunner({
  onActionExecuted: (action, result) => {
    console.log(`Action executed:`, action)
    console.log(`Result:`, result)
  },
  onConditionEvaluated: (condition, result) => {
    console.log(`Condition:`, condition)
    console.log(`Passed:`, result)
  }
})
```

## Complete Example

```typescript
import { createDialogueRunner, DialogueDefinition } from '@motioneffector/dialogue'

// Mock game systems
const gameUI = {
  showDialogue: (text: string, speaker?: string) => {
    console.log(speaker ? `[${speaker}]: ${text}` : text)
  },
  hideDialogue: () => console.log('--- Dialogue closed ---'),
  showChoices: (choices: string[]) => {
    choices.forEach((c, i) => console.log(`  ${i + 1}. ${c}`))
  }
}

const audioManager = {
  play: (sound: string) => console.log(`[Audio] Playing: ${sound}`),
  playMusic: (track: string) => console.log(`[Music] Playing: ${track}`)
}

const analytics = {
  track: (event: string, data: any) => console.log(`[Analytics] ${event}:`, data)
}

// Create runner with all events
const runner = createDialogueRunner({
  speakers: {
    wizard: { name: 'Archmage Thorn', portrait: 'wizard.png' },
    player: { name: 'Hero' }
  },

  onDialogueStart: (dialogue) => {
    audioManager.playMusic('mysterious_theme')
    analytics.track('dialogue_started', { id: dialogue.id })
  },

  onDialogueEnd: (dialogueId, endNode) => {
    gameUI.hideDialogue()
    analytics.track('dialogue_completed', {
      id: dialogueId,
      endNode: endNode?.text?.substring(0, 30)
    })
  },

  onNodeEnter: (node, speaker) => {
    gameUI.showDialogue(node.text, speaker?.name)

    if (node.tags?.includes('dramatic')) {
      audioManager.play('dramatic_sting')
    }
  },

  onChoiceSelected: (choice, index) => {
    audioManager.play('ui_select')
    analytics.track('choice_made', {
      text: choice.text,
      index
    })
  },

  onActionExecuted: (action, result) => {
    if (action.type === 'callback') {
      console.log(`[Callback] ${action.name} returned:`, result)
    }
  }
})

const dialogue: DialogueDefinition = {
  id: 'wizard-meeting',
  startNode: 'intro',
  nodes: {
    intro: {
      speaker: 'wizard',
      text: 'Ah, you have finally arrived.',
      tags: ['dramatic'],
      next: 'choice'
    },
    choice: {
      speaker: 'wizard',
      text: 'I have a task for you. Will you accept?',
      choices: [
        { text: 'What is it?', next: 'explain' },
        { text: 'I accept blindly', next: 'accept', tags: ['brave'] },
        { text: 'I refuse', next: 'refuse' }
      ]
    },
    explain: {
      speaker: 'wizard',
      text: 'Retrieve the Crystal of Ages from the dungeon.',
      next: 'choice'
    },
    accept: {
      speaker: 'wizard',
      text: 'Excellent! Your courage will be rewarded.',
      tags: ['dramatic'],
      isEnd: true
    },
    refuse: {
      speaker: 'wizard',
      text: 'A pity. Leave my tower.',
      isEnd: true
    }
  }
}

async function main() {
  await runner.start(dialogue)

  // Simulate player input
  await runner.choose(0)  // "What is it?"
  await runner.choose(1)  // "I accept blindly"
}

main()
```

## Variations

### Async Event Handlers

Event handlers can be async, but they don't block the dialogue:

```typescript
onNodeEnter: async (node, speaker) => {
  await loadVoiceFile(node.speaker)
  playVoice()
}
```

### Conditional Event Logic

Check node properties to handle different scenarios:

```typescript
onNodeEnter: (node, speaker) => {
  if (node.isEnd) {
    showEndDialogueAnimation()
  }

  if (node.speaker === 'villain') {
    playVillainTheme()
  }
}
```

### Using Tags for Event Routing

```typescript
onNodeEnter: (node, speaker) => {
  node.tags?.forEach(tag => {
    switch (tag) {
      case 'shake_screen':
        camera.shake()
        break
      case 'flash':
        screen.flash()
        break
      case 'pause':
        dialogue.waitForInput()
        break
    }
  })
}
```

## Troubleshooting

### Event Not Firing

**Symptom:** Your callback never runs.

**Cause:** Callback not passed to runner options.

**Solution:** Verify you passed the callback when creating the runner, not after.

### Event Fires Multiple Times

**Symptom:** `onNodeEnter` fires more than expected.

**Cause:** Auto-advancing nodes fire enter events too.

**Solution:** This is correct behavior. Each node entered fires the event. Filter by `node.text` or tags if needed.

## See Also

- **[The DialogueRunner](Concept-DialogueRunner)** - Runner configuration
- **[Actions](Concept-Actions)** - What triggers onActionExecuted
- **[State API](API-State)** - Event subscription with on()
