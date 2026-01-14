# Validating Dialogues

Check dialogue structure before runtime to catch errors early. The validator detects missing nodes, broken links, and unreachable content.

## Prerequisites

Before starting, you should:

- [Understand Dialogue Trees](Concept-Dialogue-Trees)

## Overview

We'll use the validation function to check dialogues and handle errors gracefully.

1. Run validation on a dialogue
2. Check the result
3. Handle common errors
4. Integrate into your build process

## Step 1: Run Validation

Import and call `validateDialogue()` with your dialogue definition:

```typescript
import { validateDialogue, DialogueDefinition } from '@motioneffector/dialogue'

const dialogue: DialogueDefinition = {
  id: 'test',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Hello!',
      choices: [
        { text: 'Continue', next: 'middle' },
        { text: 'End', next: 'end' }
      ]
    },
    middle: {
      text: 'Middle node',
      next: 'end'
    },
    end: {
      text: 'Goodbye!',
      isEnd: true
    }
  }
}

const result = validateDialogue(dialogue)
console.log(result.valid)   // true
console.log(result.errors)  // []
```

## Step 2: Check the Result

The result object has two properties:

```typescript
interface ValidationResult {
  valid: boolean      // true if no errors
  errors: string[]    // Array of error messages
}
```

Handle invalid dialogues:

```typescript
const result = validateDialogue(dialogue)

if (!result.valid) {
  console.error('Dialogue validation failed:')
  result.errors.forEach(error => console.error(`  - ${error}`))
  throw new Error('Invalid dialogue')
}
```

## Step 3: Common Errors

### Missing Start Node

```typescript
const broken: DialogueDefinition = {
  id: 'test',
  startNode: 'begin',  // Doesn't exist!
  nodes: {
    start: { text: 'Hello' }
  }
}

// Error: Start node "begin" not found in nodes
```

### Invalid Choice Target

```typescript
const broken: DialogueDefinition = {
  id: 'test',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Hello',
      choices: [
        { text: 'Go', next: 'nowhere' }  // Doesn't exist!
      ]
    }
  }
}

// Error: Choice in node "start" targets non-existent node "nowhere"
```

### Orphan Nodes

```typescript
const broken: DialogueDefinition = {
  id: 'test',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Hello',
      isEnd: true
    },
    orphan: {
      text: 'I can never be reached!'
    }
  }
}

// Error: Unreachable nodes: orphan
```

### Invalid Auto-Advance Target

```typescript
const broken: DialogueDefinition = {
  id: 'test',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Hello',
      next: 'missing'  // Doesn't exist!
    }
  }
}

// Error: Node "start" auto-advances to non-existent node "missing"
```

## Step 4: Build Integration

Validate dialogues when loading or building your game:

```typescript
import { validateDialogue, DialogueDefinition } from '@motioneffector/dialogue'

// Validate all dialogues at startup
function loadDialogues(dialogues: DialogueDefinition[]): Map<string, DialogueDefinition> {
  const loaded = new Map<string, DialogueDefinition>()
  const errors: string[] = []

  for (const dialogue of dialogues) {
    const result = validateDialogue(dialogue)

    if (result.valid) {
      loaded.set(dialogue.id, dialogue)
    } else {
      errors.push(`Dialogue "${dialogue.id}":`)
      result.errors.forEach(e => errors.push(`  - ${e}`))
    }
  }

  if (errors.length > 0) {
    console.error('Dialogue validation errors:')
    errors.forEach(e => console.error(e))
    throw new Error(`${errors.length} dialogue(s) failed validation`)
  }

  console.log(`Loaded ${loaded.size} valid dialogues`)
  return loaded
}
```

## Complete Example

```typescript
import { validateDialogue, DialogueDefinition } from '@motioneffector/dialogue'

// A collection of dialogues to validate
const dialogues: DialogueDefinition[] = [
  {
    id: 'greeting',
    startNode: 'start',
    nodes: {
      start: {
        text: 'Hello!',
        choices: [
          { text: 'Hi', next: 'respond' },
          { text: 'Bye', next: 'farewell' }
        ]
      },
      respond: {
        text: 'Nice to meet you!',
        next: 'farewell'
      },
      farewell: {
        text: 'Goodbye!',
        isEnd: true
      }
    }
  },
  {
    id: 'broken',
    startNode: 'intro',  // This doesn't exist
    nodes: {
      start: {
        text: 'Oops',
        choices: [
          { text: 'Go', next: 'nowhere' }  // This doesn't exist either
        ]
      },
      unreachable: {
        text: 'No way to get here'
      }
    }
  }
]

// Validate each dialogue
function validateAll() {
  console.log('Validating dialogues...\n')

  let allValid = true

  for (const dialogue of dialogues) {
    const result = validateDialogue(dialogue)

    if (result.valid) {
      console.log(`[OK] ${dialogue.id}`)
    } else {
      console.log(`[FAIL] ${dialogue.id}`)
      result.errors.forEach(error => {
        console.log(`       - ${error}`)
      })
      allValid = false
    }
  }

  console.log('')

  if (allValid) {
    console.log('All dialogues valid!')
  } else {
    console.log('Some dialogues have errors. Fix them before running.')
  }

  return allValid
}

validateAll()

// Output:
// Validating dialogues...
//
// [OK] greeting
// [FAIL] broken
//        - Start node "intro" not found in nodes
//        - Choice in node "start" targets non-existent node "nowhere"
//        - Unreachable nodes: start, unreachable
//
// Some dialogues have errors. Fix them before running.
```

## Variations

### Validation in Development Only

Skip validation in production for performance:

```typescript
function loadDialogue(dialogue: DialogueDefinition) {
  if (process.env.NODE_ENV === 'development') {
    const result = validateDialogue(dialogue)
    if (!result.valid) {
      throw new Error(`Invalid dialogue: ${result.errors.join(', ')}`)
    }
  }
  return dialogue
}
```

### Custom Validation Rules

Extend validation with your own checks:

```typescript
function validateCustomRules(dialogue: DialogueDefinition): string[] {
  const errors: string[] = []

  for (const [nodeId, node] of Object.entries(dialogue.nodes)) {
    // Require all nodes to have tags
    if (!node.tags || node.tags.length === 0) {
      errors.push(`Node "${nodeId}" has no tags`)
    }

    // Require speaker for all text nodes
    if (!node.speaker && !node.isEnd) {
      errors.push(`Node "${nodeId}" has no speaker`)
    }
  }

  return errors
}

function fullValidation(dialogue: DialogueDefinition) {
  const structuralResult = validateDialogue(dialogue)
  const customErrors = validateCustomRules(dialogue)

  return {
    valid: structuralResult.valid && customErrors.length === 0,
    errors: [...structuralResult.errors, ...customErrors]
  }
}
```

## Troubleshooting

### False Orphan Warning

**Symptom:** Nodes reported as orphans that you know are reachable.

**Cause:** Conditional choices might be the only path to them.

**Solution:** The validator does reachability analysis statically. Nodes only reachable through conditions that might fail are still considered reachable.

### No Errors But Still Broken

**Symptom:** Validation passes but dialogue fails at runtime.

**Cause:** Validation checks structure, not logic. Missing action handlers or bad conditions aren't caught.

**Solution:** Test the dialogue at runtime. Validation only catches structural issues.

## See Also

- **[Dialogue Trees](Concept-Dialogue-Trees)** - Dialogue structure
- **[Validation API](API-Validation)** - Function reference
- **[Errors](API-Errors)** - Error types thrown at runtime
