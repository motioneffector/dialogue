/**
 * Type definitions for @motioneffector/dialogue
 */

/**
 * Value types supported by the flag system
 */
export type FlagValue = boolean | number | string

/**
 * Condition format from @motioneffector/flags
 */
export type Condition =
  | { check: [string, string, FlagValue] }
  | { and: Condition[] }
  | { or: Condition[] }
  | { not: Condition }

/**
 * Action types that can be executed during dialogue
 */
export type Action =
  | { type: 'set'; flag: string; value: FlagValue }
  | { type: 'clear'; flag: string }
  | { type: 'increment'; flag: string; value?: number }
  | { type: 'decrement'; flag: string; value?: number }
  | { type: 'callback'; name: string; args?: unknown[] }

/**
 * Definition of a single choice in a dialogue node
 */
export interface ChoiceDefinition {
  text: string
  next: string
  conditions?: Condition
  actions?: Action[]
  tags?: string[]
  disabled?: boolean
  disabledText?: string
}

/**
 * Definition of a single dialogue node
 */
export interface NodeDefinition {
  text: string
  speaker?: string
  tags?: string[]
  actions?: Action[]
  choices?: ChoiceDefinition[]
  next?: string
  isEnd?: boolean
}

/**
 * Complete dialogue definition
 */
export interface DialogueDefinition {
  id: string
  startNode: string
  metadata?: Record<string, unknown>
  nodes: Record<string, NodeDefinition>
}

/**
 * Speaker metadata
 */
export interface Speaker {
  name: string
  portrait?: string | null
  color?: string
  [key: string]: unknown
}

/**
 * I18n adapter interface
 */
export interface I18nAdapter {
  t: (key: string, params?: Record<string, unknown>) => string
  hasKey: (key: string) => boolean
}

/**
 * Flag store interface (from @motioneffector/flags)
 */
export interface FlagStore {
  get(key: string): FlagValue | undefined
  set(key: string, value: FlagValue): FlagStore
  has(key: string): boolean
  delete(key: string): FlagStore
  clear(): FlagStore
  increment(key: string, amount?: number): number
  decrement(key: string, amount?: number): number
  check(condition: string): boolean
  all(): Record<string, FlagValue>
  keys(): string[]
}

/**
 * Action handler function signature
 */
export type ActionHandler = (args?: unknown[]) => unknown | Promise<unknown>

/**
 * Interpolation function signature
 */
export type InterpolationFunction = (context: InterpolationContext) => string | Promise<string>

/**
 * Context provided to interpolation functions
 */
export interface InterpolationContext {
  currentNode: NodeDefinition
  speaker?: Speaker
  gameFlags: FlagStore
  conversationFlags: FlagStore
}

/**
 * Options for creating a dialogue runner
 */
export interface DialogueRunnerOptions {
  gameFlags?: FlagStore
  actionHandlers?: Record<string, ActionHandler>
  speakers?: Record<string, Speaker>
  i18n?: I18nAdapter
  interpolation?: Record<string, InterpolationFunction>
  onNodeEnter?: (node: NodeDefinition, speaker?: Speaker) => void
  onNodeExit?: (node: NodeDefinition) => void
  onChoiceSelected?: (choice: ChoiceDefinition, index: number) => void
  onDialogueStart?: (dialogue: DialogueDefinition) => void
  onDialogueEnd?: (dialogueId: string, endNode?: NodeDefinition) => void
  onActionExecuted?: (action: Action, result?: unknown) => void
  onConditionEvaluated?: (condition: Condition, result: boolean) => void
}

/**
 * Options for getting choices
 */
export interface GetChoicesOptions {
  includeUnavailable?: boolean
  filter?: (choice: ChoiceDefinition) => boolean
}

/**
 * Choice with availability information
 */
export interface ChoiceWithAvailability extends ChoiceDefinition {
  available: boolean
  reason?: string
}

/**
 * Current dialogue state
 */
export interface DialogueState {
  currentNode: NodeDefinition
  availableChoices: ChoiceDefinition[]
  isEnded: boolean
}

/**
 * History entry
 */
export interface HistoryEntry {
  nodeId: string
  node: NodeDefinition
  choiceIndex?: number
  choice?: ChoiceDefinition
  timestamp: number
}

/**
 * Serialized dialogue state
 */
export interface SerializedState {
  dialogueId: string
  currentNodeId: string
  history: HistoryEntry[]
  conversationFlags: Record<string, FlagValue>
}

/**
 * Restart options
 */
export interface RestartOptions {
  preserveConversationFlags?: boolean
}

/**
 * Dialogue validation result
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Dialogue runner interface
 */
export interface DialogueRunner {
  start(dialogue: DialogueDefinition): DialogueState | Promise<DialogueState>
  getChoices(options?: GetChoicesOptions): ChoiceDefinition[] | ChoiceWithAvailability[]
  choose(index: number): DialogueState | Promise<DialogueState>
  isEnded(): boolean
  getCurrentNode(): NodeDefinition | null
  getHistory(): HistoryEntry[]
  back(): void | Promise<void>
  restart(options?: RestartOptions): DialogueState | Promise<DialogueState>
  jumpTo(nodeId: string): void | Promise<void>
  serialize(): SerializedState
  deserialize(state: SerializedState): void | Promise<void>
  getConversationFlags(): Record<string, FlagValue>
  clearConversationFlags(): void
  on(
    event: string,
    callback: (
      ...args: [NodeDefinition | DialogueDefinition | ChoiceDefinition | Action | Condition, ...unknown[]]
    ) => void
  ): void
}
