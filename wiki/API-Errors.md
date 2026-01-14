# Errors

Error classes thrown by the library for handling failures.

---

## `DialogueError`

Base error class for all dialogue-related errors.

**Signature:**

```typescript
class DialogueError extends Error {
  constructor(message: string)
  name: 'DialogueError'
}
```

**Example:**

```typescript
import { DialogueError } from '@motioneffector/dialogue'

try {
  await runner.choose(999)
} catch (error) {
  if (error instanceof DialogueError) {
    console.error('Dialogue error:', error.message)
  }
}
```

---

## `ValidationError`

Thrown when validation fails, including invalid arguments and state.

**Signature:**

```typescript
class ValidationError extends DialogueError {
  constructor(message: string, field?: string)
  name: 'ValidationError'
  field?: string  // The field that failed validation
}
```

**Example:**

```typescript
import { ValidationError } from '@motioneffector/dialogue'

try {
  await runner.start(dialogue)
} catch (error) {
  if (error instanceof ValidationError) {
    console.error(`Validation failed: ${error.message}`)
    if (error.field) {
      console.error(`Field: ${error.field}`)
    }
  }
}
```

**Common Causes:**

| Scenario | Message |
|----------|---------|
| Missing start node | `Start node not found: nodeId` |
| Invalid choice index | `Invalid choice index: 5` |
| Disabled choice selected | `Cannot select disabled choice` |
| Conditions not met | `Choice conditions not met` |
| No active dialogue | `No active dialogue` |
| Dialogue ended | `Dialogue has ended` |
| Invalid game flags | `gameFlags must be a valid FlagStore` |
| Invalid action handler | `actionHandler "name" must be a function` |
| Invalid i18n adapter | `i18n adapter must have a "t" method` |

---

## `DialogueStructureError`

Thrown when dialogue structure is invalid at runtime.

**Signature:**

```typescript
class DialogueStructureError extends DialogueError {
  constructor(message: string, dialogueId?: string, nodeId?: string)
  name: 'DialogueStructureError'
  dialogueId?: string  // The dialogue that has the error
  nodeId?: string      // The node that caused the error
}
```

**Example:**

```typescript
import { DialogueStructureError } from '@motioneffector/dialogue'

try {
  await runner.choose(0)
} catch (error) {
  if (error instanceof DialogueStructureError) {
    console.error(`Structure error in dialogue "${error.dialogueId}"`)
    if (error.nodeId) {
      console.error(`At node: ${error.nodeId}`)
    }
  }
}
```

**Common Causes:**

| Scenario | Message |
|----------|---------|
| Target node not found | `Target node not found: nodeId` |
| Node not found | `Node not found: nodeId` |

---

## Error Handling Patterns

### Catching All Dialogue Errors

```typescript
import { DialogueError } from '@motioneffector/dialogue'

try {
  await runDialogue()
} catch (error) {
  if (error instanceof DialogueError) {
    // Handle any dialogue-related error
    showErrorMessage(error.message)
  } else {
    // Re-throw non-dialogue errors
    throw error
  }
}
```

### Specific Error Handling

```typescript
import { ValidationError, DialogueStructureError } from '@motioneffector/dialogue'

try {
  await runner.choose(choiceIndex)
} catch (error) {
  if (error instanceof ValidationError) {
    if (error.message.includes('conditions not met')) {
      showMessage('You cannot select that choice right now.')
    } else if (error.message.includes('disabled')) {
      showMessage('That option is not available.')
    } else {
      showMessage(`Invalid choice: ${error.message}`)
    }
  } else if (error instanceof DialogueStructureError) {
    console.error(`Dialogue bug: ${error.message}`)
    // Fall back to a safe state
    await runner.restart()
  }
}
```

### Validation Before Runtime

```typescript
import { validateDialogue } from '@motioneffector/dialogue'

// Validate at build/load time to avoid runtime errors
function loadDialogue(dialogue) {
  const result = validateDialogue(dialogue)
  if (!result.valid) {
    // Log errors but don't throw - handle gracefully
    console.error('Dialogue validation errors:', result.errors)
    return null
  }
  return dialogue
}
```

---

## Error Inheritance

```
Error
└── DialogueError
    ├── ValidationError
    └── DialogueStructureError
```

All errors extend `DialogueError`, which extends the native `Error` class. You can catch at any level of the hierarchy.
