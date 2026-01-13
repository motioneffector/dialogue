/**
 * Core dialogue runner implementation
 */

import type {
  DialogueRunner,
  DialogueRunnerOptions,
  DialogueDefinition,
  DialogueState,
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
    const flagValue = store.get(key)

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
  actionHandlers: Record<string, (...args: any[]) => any>,
  onActionExecuted?: (action: Action, result?: unknown) => void
): Promise<unknown> {
  let result: unknown

  try {
    switch (action.type) {
      case 'set': {
        const { scope, key } = parseFlagScope(action.flag)
        const store = scope === 'game' ? gameFlags : convFlags
        store.set(key, action.value)
        result = undefined
        break
      }
      case 'clear': {
        const { scope, key } = parseFlagScope(action.flag)
        const store = scope === 'game' ? gameFlags : convFlags
        store.delete(key)
        result = undefined
        break
      }
      case 'increment': {
        const { scope, key } = parseFlagScope(action.flag)
        const store = scope === 'game' ? gameFlags : convFlags
        result = store.increment(key, action.value)
        break
      }
      case 'decrement': {
        const { scope, key } = parseFlagScope(action.flag)
        const store = scope === 'game' ? gameFlags : convFlags
        result = store.decrement(key, action.value)
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
    // Log error but don't break traversal
    console.error('Action execution error:', error)
  }

  return result
}

/**
 * Interpolate text with flag values
 */
function interpolateText(
  text: string,
  context: InterpolationContext,
  customInterpolation: Record<string, (ctx: InterpolationContext) => string | Promise<string>>,
  speaker?: Speaker
): string {
  let result = text

  // Replace {{...}} patterns
  const matches = Array.from(result.matchAll(/\{\{(\w+(?::\w+)?)\}\}/g))
  for (const match of matches) {
    const key = match[1]!
    let value = ''

    // Check custom interpolation first (only sync for now)
    if (customInterpolation[key]) {
      const interpolated = customInterpolation[key]!(context)
      value = typeof interpolated === 'string' ? interpolated : ''
    }
    // Special case for speaker
    else if (key === 'speaker' && speaker) {
      value = speaker.name
    }
    // Check flag stores
    else {
      const { scope, key: flagKey } = parseFlagScope(key)
      const store = scope === 'game' ? context.gameFlags : context.conversationFlags
      const flagValue = store.get(flagKey)
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
  if (gameFlags && typeof gameFlags.get !== 'function') {
    throw new ValidationError('gameFlags must be a valid FlagStore', 'gameFlags')
  }

  // State
  let currentDialogue: DialogueDefinition | null = null
  let currentNodeId: string | null = null
  let currentInterpolatedNode: NodeDefinition | null = null
  let conversationFlags: FlagStore = createInternalFlagStore()
  let history: HistoryEntry[] = []
  const eventHandlers: Record<string, (((...args: any[]) => void)[])> = {}

  /**
   * Get the current node definition with interpolation
   */
  function getInterpolatedNode(): NodeDefinition | null {
    if (!currentDialogue || !currentNodeId) return null

    const node = currentDialogue.nodes[currentNodeId]
    if (!node) return null

    const speaker = node.speaker ? speakers[node.speaker] : undefined
    const context: InterpolationContext = {
      currentNode: node,
      speaker,
      gameFlags,
      conversationFlags,
    }

    // Handle i18n
    let text = node.text
    if (i18n && i18n.hasKey(text)) {
      text = i18n.t(text, {})
    }

    // Interpolate text
    text = interpolateText(text, context, interpolation, speaker)

    return { ...node, text }
  }

  /**
   * Update current interpolated node
   */
  function updateInterpolatedNode(): void {
    currentInterpolatedNode = getInterpolatedNode()
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

        updateInterpolatedNode()

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

      updateInterpolatedNode()

      const speaker = node.speaker ? speakers[node.speaker] : undefined
      onNodeEnter?.(node, speaker)

      // Process auto-advance
      await processAutoAdvance()

      updateInterpolatedNode()

      const isEnded = runner.isEnded()

      if (isEnded && currentNodeId) {
        const endNode = currentDialogue.nodes[currentNodeId]
        if (endNode) {
          onDialogueEnd?.(dialogue.id, endNode)
        }
      }

      return {
        currentNode: currentInterpolatedNode!,
        availableChoices: runner.getChoices() as ChoiceDefinition[],
        isEnded,
      }
    },

    getChoices: (options: GetChoicesOptions = {}) => {
      if (!currentDialogue || !currentNodeId) return []

      const node = currentDialogue.nodes[currentNodeId]
      if (!node || !node.choices) return []

      const { includeUnavailable = false, filter } = options

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
        if (choice.disabled) return true // Include disabled choices by default

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
      if (!node || !node.choices) {
        throw new ValidationError('No choices available')
      }

      const availableChoices = runner.getChoices() as ChoiceDefinition[]
      const choice = availableChoices[index]

      if (!choice) {
        throw new ValidationError(`Invalid choice index: ${index}`)
      }

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

      updateInterpolatedNode()

      const speaker = nextNode.speaker ? speakers[nextNode.speaker] : undefined
      onNodeEnter?.(nextNode, speaker)

      // Process auto-advance
      await processAutoAdvance()

      updateInterpolatedNode()

      const isEnded = runner.isEnded()

      if (isEnded && currentNodeId) {
        const endNode = currentDialogue.nodes[currentNodeId]
        if (endNode) {
          onDialogueEnd?.(currentDialogue.id, endNode)
        }
      }

      return {
        currentNode: currentInterpolatedNode!,
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
      return currentInterpolatedNode
    },

    getHistory: () => {
      return [...history]
    },

    back: () => {
      if (history.length === 0) return

      const lastEntry = history.pop()
      if (!lastEntry) return

      currentNodeId = lastEntry.nodeId

      updateInterpolatedNode()

      // Restore conversation flags (simplified - would need full state restoration)
      const node = currentDialogue?.nodes[currentNodeId]
      if (node) {
        const speaker = node.speaker ? speakers[node.speaker] : undefined
        onNodeEnter?.(node, speaker)
      }
    },

    restart: (options: RestartOptions = {}) => {
      if (!currentDialogue) {
        throw new ValidationError('No active dialogue')
      }

      history = []

      if (!options.preserveConversationFlags) {
        conversationFlags = createInternalFlagStore()
      }

      return runner.start(currentDialogue)
    },

    jumpTo: (nodeId: string) => {
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
          })
        }
      }

      currentNodeId = nodeId

      updateInterpolatedNode()

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

    deserialize: (state: SerializedState) => {
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

      updateInterpolatedNode()

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

    on: (event: string, callback: (...args: any[]) => void) => {
      if (!eventHandlers[event]) {
        eventHandlers[event] = []
      }
      eventHandlers[event]!.push(callback)
    },
  }

  return runner
}
