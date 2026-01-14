# Configuring Speakers

Associate character metadata with dialogue nodes. Define portraits, colors, and custom properties for each speaker in your game.

## Prerequisites

Before starting, you should:

- [Complete Your First Dialogue](Your-First-Dialogue)

## Overview

We'll set up a character database and use it to display speaker information during dialogue.

1. Define a speakers object
2. Reference speakers in nodes
3. Access speaker data in events
4. Use custom properties for game-specific data

## Step 1: Define Speakers

Create a speakers object mapping IDs to speaker metadata:

```typescript
import { createDialogueRunner } from '@motioneffector/dialogue'

const runner = createDialogueRunner({
  speakers: {
    hero: {
      name: 'You',
      portrait: 'portraits/hero.png',
      color: '#4a90d9'
    },
    merchant: {
      name: 'Marcus the Merchant',
      portrait: 'portraits/merchant.png',
      color: '#d4a574'
    },
    guard: {
      name: 'City Guard',
      portrait: 'portraits/guard.png',
      color: '#8b0000'
    }
  }
})
```

The `name` property is required. Everything else is optional.

## Step 2: Reference Speakers in Nodes

Use the speaker ID in node definitions:

```typescript
const dialogue: DialogueDefinition = {
  id: 'market-conversation',
  startNode: 'merchant-greeting',
  nodes: {
    'merchant-greeting': {
      speaker: 'merchant',
      text: 'Welcome to my shop! Looking for anything special?',
      choices: [
        { text: 'What do you have?', next: 'inventory' },
        { text: 'Just looking', next: 'browse' }
      ]
    },
    inventory: {
      speaker: 'merchant',
      text: 'I have potions, scrolls, and rare artifacts.',
      next: 'merchant-greeting'
    },
    browse: {
      speaker: 'hero',
      text: 'I\'ll take a look around.',
      next: 'end'
    },
    end: {
      speaker: 'merchant',
      text: 'Take your time!',
      isEnd: true
    }
  }
}
```

## Step 3: Access Speaker Data in Events

The `onNodeEnter` callback receives the resolved speaker object:

```typescript
const runner = createDialogueRunner({
  speakers: {
    npc: { name: 'Elder', portrait: 'elder.png', color: '#gold' }
  },
  onNodeEnter: (node, speaker) => {
    if (speaker) {
      // Update your UI
      displayPortrait(speaker.portrait)
      setNameColor(speaker.color)
      showSpeakerName(speaker.name)
    } else {
      // Narrator or unattributed text
      hidePortrait()
    }

    displayDialogueText(node.text)
  }
})
```

## Step 4: Custom Properties

Add any properties your game needs:

```typescript
const runner = createDialogueRunner({
  speakers: {
    wizard: {
      name: 'Archmage Elara',
      portrait: 'wizard.png',
      color: '#9b59b6',
      // Custom properties
      voiceActor: 'voice/elara/',
      animationSet: 'elderly_female',
      faction: 'mages_guild',
      relationship: 'friendly'
    }
  },
  onNodeEnter: (node, speaker) => {
    if (speaker) {
      playVoiceLine(speaker.voiceActor + 'greeting.mp3')
      setCharacterAnimation(speaker.animationSet)
    }
  }
})
```

## Complete Example

```typescript
import { createDialogueRunner, DialogueDefinition, Speaker } from '@motioneffector/dialogue'

interface GameSpeaker extends Speaker {
  voiceId?: string
  mood?: 'happy' | 'neutral' | 'angry'
}

const speakers: Record<string, GameSpeaker> = {
  player: {
    name: 'Hero',
    portrait: 'hero.png',
    color: '#3498db'
  },
  innkeeper: {
    name: 'Greta',
    portrait: 'innkeeper.png',
    color: '#e67e22',
    voiceId: 'greta',
    mood: 'happy'
  },
  stranger: {
    name: '???',
    portrait: 'hooded.png',
    color: '#2c3e50',
    voiceId: 'stranger',
    mood: 'neutral'
  }
}

const runner = createDialogueRunner({
  speakers,
  onNodeEnter: (node, speaker) => {
    const gameSpeaker = speaker as GameSpeaker | undefined

    if (gameSpeaker) {
      console.log(`[${gameSpeaker.name}]: ${node.text}`)
      console.log(`  Portrait: ${gameSpeaker.portrait}`)
      console.log(`  Mood: ${gameSpeaker.mood || 'neutral'}`)
    } else {
      console.log(`[Narrator]: ${node.text}`)
    }
  }
})

const dialogue: DialogueDefinition = {
  id: 'inn-scene',
  startNode: 'enter',
  nodes: {
    enter: {
      text: 'You enter the warm, bustling inn.',  // No speaker = narrator
      next: 'greet'
    },
    greet: {
      speaker: 'innkeeper',
      text: 'Welcome, traveler! Need a room for the night?',
      choices: [
        { text: 'Yes please', next: 'room' },
        { text: 'Who\'s that in the corner?', next: 'stranger-intro' }
      ]
    },
    room: {
      speaker: 'innkeeper',
      text: 'That\'ll be 10 gold. Up the stairs, second door.',
      isEnd: true
    },
    'stranger-intro': {
      speaker: 'innkeeper',
      text: 'That one? Arrived yesterday. Hasn\'t said a word.',
      next: 'stranger-speaks'
    },
    'stranger-speaks': {
      speaker: 'stranger',
      text: '...I can hear you, you know.',
      isEnd: true
    }
  }
}

await runner.start(dialogue)
```

## Variations

### Dynamic Speaker Names

Use interpolation for names that change:

```typescript
speakers: {
  companion: { name: '{{companionName}}', portrait: 'companion.png' }
}
```

Set `companionName` in your game flags to customize.

### No Speaker (Narrator)

Omit the `speaker` property for narration:

```typescript
nodes: {
  narration: {
    text: 'The wind howls outside as night falls.',  // No speaker
    next: 'dialogue'
  }
}
```

### Unknown Speakers

Reveal identities progressively:

```typescript
const speakers = {
  mysterious: { name: '???', portrait: 'silhouette.png' },
  revealed: { name: 'Prince Aldric', portrait: 'prince.png' }
}

// Later in dialogue, switch speakers when identity is revealed
```

## Troubleshooting

### Speaker Not Appearing

**Symptom:** `onNodeEnter` receives `undefined` for speaker.

**Cause:** Speaker ID in node doesn't match any key in speakers object.

**Solution:** Check spelling. `speaker: 'Merchant'` won't match `speakers: { merchant: ... }`.

### Portrait Path Issues

**Symptom:** Portraits don't load in your UI.

**Cause:** Path format doesn't match your asset loader.

**Solution:** The library doesn't load images - it just stores the path. Ensure your UI code handles the path correctly.

## See Also

- **[The DialogueRunner](Concept-DialogueRunner)** - Runner configuration options
- **[Dynamic Text](Guide-Dynamic-Text)** - Using `{{speaker}}` in text
- **[Responding to Events](Guide-Responding-To-Events)** - Using onNodeEnter
