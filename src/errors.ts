/**
 * Error classes for @motioneffector/dialogue
 */

/**
 * Base error class for all dialogue-related errors
 */
export class DialogueError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DialogueError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends DialogueError {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Error thrown when dialogue structure is invalid
 */
export class DialogueStructureError extends DialogueError {
  constructor(
    message: string,
    public readonly dialogueId?: string,
    public readonly nodeId?: string
  ) {
    super(message)
    this.name = 'DialogueStructureError'
  }
}
