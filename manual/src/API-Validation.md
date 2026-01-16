# Validation API

Functions for validating dialogue structure before runtime.

---

## `validateDialogue()`

Validates a dialogue definition for structural correctness.

**Signature:**

```typescript
function validateDialogue(dialogue: DialogueDefinition): ValidationResult
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `dialogue` | `DialogueDefinition` | Yes | The dialogue to validate |

**Returns:** `ValidationResult` — Object with `valid` boolean and `errors` array.

**Example:**

```typescript
import { validateDialogue } from '@motioneffector/dialogue'

const dialogue = {
  id: 'test',
  startNode: 'start',
  nodes: {
    start: {
      text: 'Hello!',
      choices: [{ text: 'Continue', next: 'end' }]
    },
    end: { text: 'Goodbye!', isEnd: true }
  }
}

const result = validateDialogue(dialogue)

if (result.valid) {
  console.log('Dialogue is valid!')
} else {
  console.error('Validation errors:')
  result.errors.forEach(error => console.error(`  - ${error}`))
}
```

**Checks Performed:**

| Check | Error Message |
|-------|---------------|
| Start node exists | `Start node "X" not found in nodes` |
| Has at least one node | `Dialogue has no nodes` |
| Choice targets exist | `Choice in node "X" targets non-existent node "Y"` |
| Auto-advance targets exist | `Node "X" auto-advances to non-existent node "Y"` |
| No orphan nodes | `Unreachable nodes: X, Y, Z` |
| No prototype pollution | `Invalid node reference: "__proto__"` |

---

## Types

### `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean
  errors: string[]
}
```

| Property | Type | Description |
|----------|------|-------------|
| `valid` | `boolean` | True if no errors were found |
| `errors` | `string[]` | Array of error message strings |

---

## Usage Patterns

### Build-Time Validation

```typescript
import { validateDialogue } from '@motioneffector/dialogue'
import dialogues from './dialogues.json'

function validateAllDialogues() {
  const errors: string[] = []

  for (const dialogue of dialogues) {
    const result = validateDialogue(dialogue)
    if (!result.valid) {
      errors.push(`[${dialogue.id}]`)
      result.errors.forEach(e => errors.push(`  ${e}`))
    }
  }

  if (errors.length > 0) {
    console.error('Dialogue validation failed:')
    errors.forEach(e => console.error(e))
    process.exit(1)
  }

  console.log(`Validated ${dialogues.length} dialogues successfully`)
}
```

### Runtime Validation (Development Only)

```typescript
function loadDialogue(dialogue: DialogueDefinition) {
  if (process.env.NODE_ENV === 'development') {
    const result = validateDialogue(dialogue)
    if (!result.valid) {
      throw new Error(`Invalid dialogue "${dialogue.id}": ${result.errors.join(', ')}`)
    }
  }
  return dialogue
}
```

### Custom Validation Extension

```typescript
function validateWithCustomRules(dialogue: DialogueDefinition): ValidationResult {
  // Run built-in validation
  const result = validateDialogue(dialogue)

  // Add custom rules
  for (const [nodeId, node] of Object.entries(dialogue.nodes)) {
    // Require speaker for non-end nodes
    if (!node.isEnd && !node.speaker) {
      result.valid = false
      result.errors.push(`Node "${nodeId}" missing speaker`)
    }

    // Require tags
    if (!node.tags || node.tags.length === 0) {
      result.valid = false
      result.errors.push(`Node "${nodeId}" has no tags`)
    }
  }

  return result
}
```
