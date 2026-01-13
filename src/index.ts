/**
 * @motioneffector/dialogue
 * Branching dialogue and interaction tree runner
 */

// Core functionality
export { createDialogueRunner } from './runner'
export { validateDialogue } from './validation'
export { createI18nAdapter } from './i18n-adapter'

// Error classes
export { DialogueError, ValidationError, DialogueStructureError } from './errors'

// Type exports
export type {
  FlagValue,
  Condition,
  Action,
  ChoiceDefinition,
  NodeDefinition,
  DialogueDefinition,
  Speaker,
  I18nAdapter,
  FlagStore,
  ActionHandler,
  InterpolationFunction,
  InterpolationContext,
  DialogueRunnerOptions,
  GetChoicesOptions,
  ChoiceWithAvailability,
  DialogueState,
  HistoryEntry,
  SerializedState,
  RestartOptions,
  ValidationResult,
  DialogueRunner,
} from './types'
