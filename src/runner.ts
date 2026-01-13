/**
 * Core dialogue runner implementation
 */

import type {
  DialogueRunner,
  DialogueRunnerOptions,
  DialogueDefinition,
  NodeDefinition,
  ChoiceDefinition,
  GetChoicesOptions,
  ChoiceWithAvailability,
  FlagStore,
  Action,
  Condition,
  HistoryEntry,
  SerializedState,
  RestartOptions,
  Speaker,
  FlagValue,
  InterpolationContext,
} from './types'
import { ValidationError } from './errors'

/**
 * Create an internal flag store for conversation flags
 */
function createInternalFlagStore(): FlagStore {
  const flags = new Map<string, FlagValue>()

  const store: FlagStore = {
    get: (key: string) => flags.get(key),
    set: (key: string, value: FlagValue) => {
      flags.set(key, value)
      return store
    },
    has: (key: string) => flags.has(key),
    delete: (key: string) => {
      flags.delete(key)
      return store
    },
    clear: () => {
      flags.clear()
      return store
    },
    increment: (key: string, amount = 1) => {
      const current = (flags.get(key) as number) || 0
      const newValue = current + amount
      flags.set(key, newValue)
      return newValue
    },
    decrement: (key: string, amount = 1) => {
      const current = (flags.get(key) as number) || 0
      const newValue = Math.max(0, current - amount)
      flags.set(key, newValue)
      return newValue
    },
    check: () => true, // Simple implementation
    all: () => Object.fromEntries(flags),
    keys: () => Array.from(flags.keys()),
  }

  return store
}

/**
 * Parse flag scope (game: or conv:)
 */
function parseFlagScope(flag: string): { scope: 'game' | 'conv'; key: string } {
  if (flag.startsWith('conv:')) {
    return { scope: 'conv', key: flag.slice(5) }
  }
  if (flag.startsWith('game:')) {
    return { scope: 'game', key: flag.slice(5) }
  }
  return { scope: 'game', key: flag }
}

/**
 * Evaluate a condition against flag stores
 */
function evaluateCondition(
  condition: Condition,
  gameFlags: FlagStore,
  convFlags: FlagStore
): boolean {
  if ('check' in condition) {
    const [flagName, operator, value] = condition.check
    const { scope, key } = parseFlagScope(flagName)
    const store = scope === 'game' ? gameFlags : convFlags
    // For conversation scope, strip prefix; for game scope, keep original key
    const storeKey = scope === 'conv' ? key : flagName
    const flagValue = store.get(storeKey)

    switch (operator) {
      case '==':
        return flagValue === value
      case '!=':
        return flagValue !== value
      case '>':
        return (flagValue as number) > (value as number)
      case '<':
        return (flagValue as number) < (value as number)
      case '>=':
        return (flagValue as number) >= (value as number)
      case '<=':
        return (flagValue as number) <= (value as number)
      default:
        return false
    }
  }

  if ('and' in condition) {
    return condition.and.every(c => evaluateCondition(c, gameFlags, convFlags))
  }

  if ('or' in condition) {
    return condition.or.some(c => evaluateCondition(c, gameFlags, convFlags))
  }

  if ('not' in condition) {
    return !evaluateCondition(condition.not, gameFlags, convFlags)
  }

  return false
}

/**
 * Execute an action
 */
async function executeAction(
  action: Action,
  gameFlags: FlagStore,
  convFlags: FlagStore,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Intentionally flexible callback registry, users provide typed implementations
  actionHandlers: Record<string, (...args: any[]) => any>,
  onActionExecuted?: (action: Action, result?: unknown) => void
): Promise<unknown> {
  let result: unknown

  try {
    switch (action.type) {
      case 'set': {
        const { scope, key } = parseFlagScope(action.flag)
        const store = scope === 'game' ? gameFlags : convFlags
        // For conversation scope, strip prefix; for game scope, keep original key
        const storeKey = scope === 'conv' ? key : action.flag
        store.set(storeKey, action.value)
        result = action.value
        break
      }
      case 'clear': {
        const { scope, key } = parseFlagScope(action.flag)
        const store = scope === 'game' ? gameFlags : convFlags
        const storeKey = scope === 'conv' ? key : action.flag
        store.delete(storeKey)
        result = true
        break
      }
      case 'increment': {
        const { scope, key } = parseFlagScope(action.flag)
        const store = scope === 'game' ? gameFlags : convFlags
        const storeKey = scope === 'conv' ? key : action.flag
        result = store.increment(storeKey, action.value)
        break
      }
      case 'decrement': {
        const { scope, key } = parseFlagScope(action.flag)
        const store = scope === 'game' ? gameFlags : convFlags
        const storeKey = scope === 'conv' ? key : action.flag
        result = store.decrement(storeKey, action.value)
        break
      }
      case 'callback': {
        const handler = actionHandlers[action.name]
        if (!handler) {
          throw new Error(`Action handler not registered: ${action.name}`)
        }
        result = await handler(action.args)
        break
      }
    }

    onActionExecuted?.(action, result)
  } catch (error) {
    // For callback actions with missing handlers, re-throw
    if (action.type === 'callback' && !actionHandlers[action.name]) {
      throw error
    }
    // For other action errors, log but don't break traversal
    console.error('Action execution error:', error)
  }

  return result
}

/**
 * Interpolate text with flag values
 * Supports async interpolation functions per PLAN.md
 */
async function interpolateText(
  text: string,
  context: InterpolationContext,
  customInterpolation: Record<string, (ctx: InterpolationContext) => string | Promise<string>>,
  speaker?: Speaker
): Promise<string> {
  let result = text

  // Replace {{...}} patterns
  const matches = Array.from(result.matchAll(/\{\{(\w+(?::\w+)?)\}\}/g))
  for (const match of matches) {
    const key = match[1]
    if (!key) continue
    let value = ''

    // Check custom interpolation first - support async functions
    if (customInterpolation[key]) {
      const interpolated = await customInterpolation[key](context)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion -- interpolated can be any type from user functions
      value = String(interpolated || '')
    }
    // Special case for speaker
    else if (key === 'speaker' && speaker) {
      value = speaker.name
    }
    // Check flag stores
    else {
      const { scope, key: flagKey } = parseFlagScope(key)
      const store = scope === 'game' ? context.gameFlags : context.conversationFlags
      // For conversation scope, strip prefix; for game scope, keep original key
      const storeKey = scope === 'conv' ? flagKey : key
      const flagValue = store.get(storeKey)
      value = flagValue !== undefined ? String(flagValue) : ''
    }

    result = result.replace(match[0], value)
  }

  return result
}

/**
 * Creates a new dialogue runner instance
 */
export function createDialogueRunner(options: DialogueRunnerOptions = {}): DialogueRunner {
  const {
    gameFlags = createInternalFlagStore(),
    actionHandlers = {},
    speakers = {},
    i18n,
    interpolation = {},
    onNodeEnter,
    onNodeExit,
    onChoiceSelected,
    onDialogueStart,
    onDialogueEnd,
    onActionExecuted,
    onConditionEvaluated,
  } = options

  // Validate gameFlags
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check for user-provided data
  if (gameFlags && typeof gameFlags.get !== 'function') {
    throw new ValidationError('gameFlags must be a valid FlagStore', 'gameFlags')
  }

  // Validate actionHandlers
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Defensive runtime check for user-provided data
  if (actionHandlers) {
    for (const [key, handler] of Object.entries(actionHandlers)) {
      if (typeof handler !== 'function') {
        throw new ValidationError(`actionHandler "${key}" must be a function`, 'actionHandlers')
      }
    }
  }

  // Validate i18n adapter
  if (i18n) {
    if (typeof i18n.t !== 'function') {
      throw new ValidationError('i18n adapter must have a "t" method', 'i18n')
    }
    if (typeof i18n.hasKey !== 'function') {
      throw new ValidationError('i18n adapter must have a "hasKey" method', 'i18n')
    }
  }

  // State
  let currentDialogue: DialogueDefinition | null = null
  let currentNodeId: string | null = null
  let currentInterpolatedNode: NodeDefinition | null = null
  let conversationFlags: FlagStore = createInternalFlagStore()
  let history: HistoryEntry[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event system accepts varied argument types
  const eventHandlers: Record<string, (((...args: any[]) => void)[])> = {}

  /**
   * Get the current node definition with interpolation
   */
  async function getInterpolatedNode(): Promise<NodeDefinition | null> {
    if (!currentDialogue || !currentNodeId) return null

    const node = currentDialogue.nodes[currentNodeId]
    if (!node) return null

    const speaker = node.speaker ? speakers[node.speaker] : undefined
    const context: InterpolationContext = {
      currentNode: node,
      ...(speaker ? { speaker } : {}),
      gameFlags,
      conversationFlags,
    }

    // Handle i18n
    let text = node.text
    if (i18n?.hasKey(text)) {
      text = i18n.t(text, {})
    }

    // Interpolate text (supports async per PLAN.md)
    text = await interpolateText(text, context, interpolation, speaker)

    return { ...node, text }
  }

  /**
   * Update current interpolated node
   */
  async function updateInterpolatedNode(): Promise<void> {
    currentInterpolatedNode = await getInterpolatedNode()
  }

  /**
   * Process auto-advance nodes
   */
  async function processAutoAdvance(): Promise<void> {
    if (!currentDialogue || !currentNodeId) return

    const node = currentDialogue.nodes[currentNodeId]
    if (!node) return

    // Auto-advance if node has 'next' but no choices
    if (node.next && (!node.choices || node.choices.length === 0)) {
      onNodeExit?.(node)

      history.push({
        nodeId: currentNodeId,
        node,
        timestamp: Date.now(),
        conversationFlags: { ...conversationFlags.all() },
      })

      currentNodeId = node.next

      const nextNode = currentDialogue.nodes[currentNodeId]
      if (nextNode) {
        // Execute node actions
        if (nextNode.actions) {
          for (const action of nextNode.actions) {
            await executeAction(action, gameFlags, conversationFlags, actionHandlers, onActionExecuted)
          }
        }

        await updateInterpolatedNode()

        const speaker = nextNode.speaker ? speakers[nextNode.speaker] : undefined
        onNodeEnter?.(nextNode, speaker)

        // Check for further auto-advance
        await processAutoAdvance()
      }
    }
  }

  const runner: DialogueRunner = {
    start: async (dialogue: DialogueDefinition) => {
      currentDialogue = dialogue
      currentNodeId = dialogue.startNode
      conversationFlags = createInternalFlagStore()
      history = []

      onDialogueStart?.(dialogue)

      const node = currentDialogue.nodes[currentNodeId]
      if (!node) {
        throw new ValidationError(`Start node not found: ${dialogue.startNode}`)
      }

      // Execute node actions
      if (node.actions) {
        for (const action of node.actions) {
          await executeAction(action, gameFlags, conversationFlags, actionHandlers, onActionExecuted)
        }
      }

      await updateInterpolatedNode()

      const speaker = node.speaker ? speakers[node.speaker] : undefined
      onNodeEnter?.(node, speaker)

      // Process auto-advance
      await processAutoAdvance()

      await updateInterpolatedNode()

      const isEnded = runner.isEnded()

      if (isEnded && currentNodeId) {
        const endNode = currentDialogue.nodes[currentNodeId]
        if (endNode) {
          onDialogueEnd?.(dialogue.id, endNode)
        }
      }

      if (!currentInterpolatedNode) {
        throw new ValidationError('Failed to initialize dialogue state')
      }

      return {
        currentNode: currentInterpolatedNode,
        availableChoices: runner.getChoices() as ChoiceDefinition[],
        isEnded,
      }
    },

    getChoices: (options: GetChoicesOptions = {}) => {
      if (!currentDialogue || !currentNodeId) return []

      const node = currentDialogue.nodes[currentNodeId]
      if (!node?.choices) return []

      const { includeUnavailable = false, includeDisabled = false, filter } = options

      let choices = node.choices

      // Apply custom filter first
      if (filter) {
        choices = choices.filter(filter)
      }

      if (includeUnavailable) {
        return choices.map(choice => {
          const available = choice.disabled
            ? false
            : choice.conditions
              ? evaluateCondition(choice.conditions, gameFlags, conversationFlags)
              : true

          if (choice.conditions && onConditionEvaluated) {
            onConditionEvaluated(choice.conditions, available)
          }

          const result: ChoiceWithAvailability = {
            ...choice,
            available,
          }

          if (!available && !choice.disabled && choice.conditions) {
            result.reason = 'Conditions not met'
          }

          return result
        })
      }

      // Filter by conditions and disabled state
      return choices.filter(choice => {
        if (choice.disabled) return includeDisabled // Include disabled choices if explicitly requested

        if (!choice.conditions) return true

        const result = evaluateCondition(choice.conditions, gameFlags, conversationFlags)
        onConditionEvaluated?.(choice.conditions, result)
        return result
      })
    },

    choose: async (index: number) => {
      if (!currentDialogue || !currentNodeId) {
        throw new ValidationError('No active dialogue')
      }

      if (runner.isEnded()) {
        throw new ValidationError('Dialogue has ended')
      }

      const node = currentDialogue.nodes[currentNodeId]
      if (!node?.choices) {
        throw new ValidationError('No choices available')
      }

      // Validate index is within ORIGINAL choices list
      if (index < 0 || index >= node.choices.length) {
        throw new ValidationError(`Invalid choice index: ${String(index)}`)
      }

      // Get choice from ORIGINAL list
      const choice = node.choices[index]
      if (!choice) {
        throw new ValidationError(`Invalid choice index: ${String(index)}`)
      }

      // Validate choice is not disabled
      if (choice.disabled) {
        throw new ValidationError('Cannot select disabled choice')
      }

      // Check conditions
      if (choice.conditions) {
        const conditionMet = evaluateCondition(choice.conditions, gameFlags, conversationFlags)
        if (!conditionMet) {
          throw new ValidationError('Choice conditions not met')
        }
      }

      onChoiceSelected?.(choice, index)
      onNodeExit?.(node)

      // Add to history
      history.push({
        nodeId: currentNodeId,
        node,
        choiceIndex: index,
        choice,
        timestamp: Date.now(),
        conversationFlags: { ...conversationFlags.all() },
      })

      // Execute choice actions
      if (choice.actions) {
        for (const action of choice.actions) {
          await executeAction(action, gameFlags, conversationFlags, actionHandlers, onActionExecuted)
        }
      }

      // Move to next node
      currentNodeId = choice.next

      const nextNode = currentDialogue.nodes[currentNodeId]
      if (!nextNode) {
        throw new ValidationError(`Target node not found: ${choice.next}`)
      }

      // Execute node actions
      if (nextNode.actions) {
        for (const action of nextNode.actions) {
          await executeAction(action, gameFlags, conversationFlags, actionHandlers, onActionExecuted)
        }
      }

      await updateInterpolatedNode()

      const speaker = nextNode.speaker ? speakers[nextNode.speaker] : undefined
      onNodeEnter?.(nextNode, speaker)

      // Process auto-advance
      await processAutoAdvance()

      await updateInterpolatedNode()

      const isEnded = runner.isEnded()

      if (isEnded && currentNodeId) {
        const endNode = currentDialogue.nodes[currentNodeId]
        if (endNode) {
          onDialogueEnd?.(currentDialogue.id, endNode)
        }
      }

      if (!currentInterpolatedNode) {
        throw new ValidationError('Failed to complete choice transition')
      }

      return {
        currentNode: currentInterpolatedNode,
        availableChoices: runner.getChoices() as ChoiceDefinition[],
        isEnded,
      }
    },

    isEnded: () => {
      if (!currentDialogue || !currentNodeId) return false

      const node = currentDialogue.nodes[currentNodeId]
      if (!node) return false

      // Explicitly marked as end
      if (node.isEnd) return true

      // No choices and no auto-advance
      if ((!node.choices || node.choices.length === 0) && !node.next) return true

      return false
    },

    getCurrentNode: () => {
      // Only return null if explicitly marked as ended, not for implicit end states
      if (currentInterpolatedNode?.isEnd) {
        return null
      }
      return currentInterpolatedNode
    },

    getHistory: () => {
      return [...history]
    },

    back: async () => {
      if (history.length === 0) return

      const lastEntry = history.pop()
      if (!lastEntry) return

      currentNodeId = lastEntry.nodeId

      // Restore conversation flags from snapshot
      conversationFlags.clear()
      for (const [key, value] of Object.entries(lastEntry.conversationFlags)) {
        conversationFlags.set(key, value)
      }

      await updateInterpolatedNode()

      const node = currentDialogue?.nodes[currentNodeId]
      if (node) {
        const speaker = node.speaker ? speakers[node.speaker] : undefined
        onNodeEnter?.(node, speaker)
      }
    },

    restart: async (options: RestartOptions = {}) => {
      if (!currentDialogue) {
        throw new ValidationError('No active dialogue')
      }

      history = []

      // Start dialogue (this runs start node actions)
      const state = await runner.start(currentDialogue)

      // Clear conversation flags AFTER start if not preserving
      if (!options.preserveConversationFlags) {
        conversationFlags.clear()
        await updateInterpolatedNode()
      }

      return state
    },

    jumpTo: async (nodeId: string) => {
      if (!currentDialogue) {
        throw new ValidationError('No active dialogue')
      }

      const node = currentDialogue.nodes[nodeId]
      if (!node) {
        throw new ValidationError(`Node not found: ${nodeId}`)
      }

      const previousNodeId = currentNodeId

      if (previousNodeId) {
        const prevNode = currentDialogue.nodes[previousNodeId]
        if (prevNode) {
          onNodeExit?.(prevNode)
          history.push({
            nodeId: previousNodeId,
            node: prevNode,
            timestamp: Date.now(),
            conversationFlags: { ...conversationFlags.all() },
          })
        }
      }

      currentNodeId = nodeId

      await updateInterpolatedNode()

      const speaker = node.speaker ? speakers[node.speaker] : undefined
      onNodeEnter?.(node, speaker)
    },

    serialize: () => {
      if (!currentDialogue || !currentNodeId) {
        throw new ValidationError('No active dialogue to serialize')
      }

      return {
        dialogueId: currentDialogue.id,
        currentNodeId,
        history,
        conversationFlags: conversationFlags.all(),
      }
    },

    deserialize: async (state: SerializedState) => {
      if (!currentDialogue) {
        throw new ValidationError('Start a dialogue before deserializing state')
      }

      currentNodeId = state.currentNodeId
      history = state.history

      // Restore conversation flags
      conversationFlags = createInternalFlagStore()
      for (const [key, value] of Object.entries(state.conversationFlags)) {
        conversationFlags.set(key, value)
      }

      await updateInterpolatedNode()

      const node = currentDialogue.nodes[currentNodeId]
      if (node) {
        const speaker = node.speaker ? speakers[node.speaker] : undefined
        onNodeEnter?.(node, speaker)
      }
    },

    getConversationFlags: () => {
      return conversationFlags.all()
    },

    clearConversationFlags: () => {
      conversationFlags.clear()
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Event system accepts varied callback signatures
    on: (event: string, callback: (...args: any[]) => void) => {
      eventHandlers[event] ??= []
      eventHandlers[event].push(callback)
    },
  }

  return runner
}
