// ============================================
// INLINE LIBRARY CODE
// ============================================

// Error classes
export class DialogueError extends Error {
  constructor(message) {
    super(message)
    this.name = 'DialogueError'
  }
}

export class ValidationError extends DialogueError {
  constructor(message, field) {
    super(message)
    this.name = 'ValidationError'
    this.field = field
  }
}

export class DialogueStructureError extends DialogueError {
  constructor(message, dialogueId, nodeId) {
    super(message)
    this.name = 'DialogueStructureError'
    this.dialogueId = dialogueId
    this.nodeId = nodeId
  }
}

// Forbidden keys for prototype pollution prevention
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function safeGet(obj, key) {
  if (typeof key !== 'string') return undefined
  if (FORBIDDEN_KEYS.has(key)) return undefined
  if (!Object.hasOwn(obj, key)) return undefined
  return obj[key]
}

// Create internal flag store
export function createInternalFlagStore() {
  const flags = new Map()
  const store = {
    get: (key) => flags.get(key),
    set: (key, value) => { flags.set(key, value); return store },
    has: (key) => flags.has(key),
    delete: (key) => { flags.delete(key); return store },
    clear: () => { flags.clear(); return store },
    increment: (key, amount = 1) => {
      const current = flags.get(key) || 0
      const newValue = current + amount
      flags.set(key, newValue)
      return newValue
    },
    decrement: (key, amount = 1) => {
      const current = flags.get(key) || 0
      const newValue = Math.max(0, current - amount)
      flags.set(key, newValue)
      return newValue
    },
    check: () => true,
    all: () => Object.fromEntries(flags),
    keys: () => Array.from(flags.keys()),
  }
  return store
}

// Parse flag scope
function parseFlagScope(flag) {
  if (flag.startsWith('conv:')) {
    return { scope: 'conv', key: flag.slice(5) }
  }
  if (flag.startsWith('game:')) {
    return { scope: 'game', key: flag.slice(5) }
  }
  return { scope: 'game', key: flag }
}

// Evaluate condition
function evaluateCondition(condition, gameFlags, convFlags) {
  if ('check' in condition) {
    const [flagName, operator, value] = condition.check
    const { scope, key } = parseFlagScope(flagName)
    const store = scope === 'game' ? gameFlags : convFlags
    const storeKey = scope === 'conv' ? key : flagName
    const flagValue = store.get(storeKey)

    switch (operator) {
      case '==': return flagValue === value
      case '!=': return flagValue !== value
      case '>': return flagValue > value
      case '<': return flagValue < value
      case '>=': return flagValue >= value
      case '<=': return flagValue <= value
      default: return false
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

// Execute action
async function executeAction(action, gameFlags, convFlags, actionHandlers, onActionExecuted) {
  let result
  try {
    switch (action.type) {
      case 'set': {
        const { scope, key } = parseFlagScope(action.flag)
        const store = scope === 'game' ? gameFlags : convFlags
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
        const handler = safeGet(actionHandlers, action.name)
        if (!handler) throw new Error(`Action handler not registered: ${action.name}`)
        result = await handler(action.args)
        break
      }
    }
    onActionExecuted?.(action, result)
  } catch (error) {
    if (action.type === 'callback' && !actionHandlers[action.name]) throw error
    console.error('Action execution error:', error)
  }
  return result
}

// Interpolate text
async function interpolateText(text, context, customInterpolation, speaker) {
  let result = text
  const matches = Array.from(result.matchAll(/\{\{(\w+(?::\w+)?)\}\}/g))
  for (const match of matches) {
    const key = match[1]
    if (!key) continue
    let value = ''
    const interpolationFn = safeGet(customInterpolation, key)
    if (interpolationFn) {
      const interpolated = await interpolationFn(context)
      value = String(interpolated || '')
    } else if (key === 'speaker' && speaker) {
      value = speaker.name
    } else {
      const { scope, key: flagKey } = parseFlagScope(key)
      const store = scope === 'game' ? context.gameFlags : context.conversationFlags
      const storeKey = scope === 'conv' ? flagKey : key
      const flagValue = store.get(storeKey)
      value = flagValue !== undefined ? String(flagValue) : ''
    }
    result = result.replace(match[0], value)
  }
  return result
}

// Create dialogue runner
export function createDialogueRunner(options = {}) {
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

  if (gameFlags && typeof gameFlags.get !== 'function') {
    throw new ValidationError('gameFlags must be a valid FlagStore', 'gameFlags')
  }
  if (actionHandlers) {
    for (const [key, handler] of Object.entries(actionHandlers)) {
      if (typeof handler !== 'function') {
        throw new ValidationError(`actionHandler "${key}" must be a function`, 'actionHandlers')
      }
    }
  }
  if (i18n) {
    if (typeof i18n.t !== 'function') {
      throw new ValidationError('i18n adapter must have a "t" method', 'i18n')
    }
    if (typeof i18n.hasKey !== 'function') {
      throw new ValidationError('i18n adapter must have a "hasKey" method', 'i18n')
    }
  }

  let currentDialogue = null
  let currentNodeId = null
  let currentInterpolatedNode = null
  let conversationFlags = createInternalFlagStore()
  let history = []

  async function getInterpolatedNode() {
    if (!currentDialogue || !currentNodeId) return null
    const node = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
    if (!node) return null
    const speaker = node.speaker ? safeGet(speakers, node.speaker) : undefined
    const context = {
      currentNode: node,
      ...(speaker ? { speaker } : {}),
      gameFlags,
      conversationFlags,
    }
    let text = node.text
    if (i18n?.hasKey(text)) text = i18n.t(text, {})
    text = await interpolateText(text, context, interpolation, speaker)
    return { ...node, text }
  }

  async function updateInterpolatedNode() {
    currentInterpolatedNode = await getInterpolatedNode()
  }

  async function processAutoAdvance() {
    if (!currentDialogue || !currentNodeId) return
    const node = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
    if (!node) return
    if (node.next && (!node.choices || node.choices.length === 0)) {
      onNodeExit?.(node)
      history.push({
        nodeId: currentNodeId,
        node,
        timestamp: Date.now(),
        conversationFlags: { ...conversationFlags.all() },
      })
      currentNodeId = node.next
      const nextNode = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
      if (nextNode) {
        if (nextNode.actions) {
          for (const action of nextNode.actions) {
            await executeAction(action, gameFlags, conversationFlags, actionHandlers, onActionExecuted)
          }
        }
        await updateInterpolatedNode()
        const speaker = nextNode.speaker ? safeGet(speakers, nextNode.speaker) : undefined
        onNodeEnter?.(nextNode, speaker)
        await processAutoAdvance()
      }
    }
  }

  const runner = {
    start: async (dialogue) => {
      currentDialogue = dialogue
      currentNodeId = dialogue.startNode
      conversationFlags = createInternalFlagStore()
      history = []
      onDialogueStart?.(dialogue)
      const node = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
      if (!node) throw new ValidationError(`Start node not found: ${dialogue.startNode}`)
      if (node.actions) {
        for (const action of node.actions) {
          await executeAction(action, gameFlags, conversationFlags, actionHandlers, onActionExecuted)
        }
      }
      await updateInterpolatedNode()
      const speaker = node.speaker ? safeGet(speakers, node.speaker) : undefined
      onNodeEnter?.(node, speaker)
      await processAutoAdvance()
      await updateInterpolatedNode()
      const isEnded = runner.isEnded()
      if (isEnded && currentNodeId) {
        const endNode = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
        if (endNode) onDialogueEnd?.(dialogue.id, endNode)
      }
      if (!currentInterpolatedNode) throw new ValidationError('Failed to initialize dialogue state')
      return {
        currentNode: currentInterpolatedNode,
        availableChoices: runner.getChoices(),
        isEnded,
      }
    },

    getChoices: (options = {}) => {
      if (!currentDialogue || !currentNodeId) return []
      const node = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
      if (!node?.choices) return []
      const { includeUnavailable = false, includeDisabled = false, filter } = options
      let choices = node.choices
      if (filter) choices = choices.filter(filter)
      if (includeUnavailable) {
        return choices.map(choice => {
          const available = choice.disabled ? false : choice.conditions
            ? evaluateCondition(choice.conditions, gameFlags, conversationFlags)
            : true
          if (choice.conditions && onConditionEvaluated) {
            onConditionEvaluated(choice.conditions, available)
          }
          const result = { ...choice, available }
          if (!available && !choice.disabled && choice.conditions) {
            result.reason = 'Conditions not met'
          }
          return result
        })
      }
      return choices.filter(choice => {
        if (choice.disabled) return includeDisabled
        if (!choice.conditions) return true
        const result = evaluateCondition(choice.conditions, gameFlags, conversationFlags)
        onConditionEvaluated?.(choice.conditions, result)
        return result
      })
    },

    choose: async (index) => {
      if (!currentDialogue || !currentNodeId) throw new ValidationError('No active dialogue')
      if (runner.isEnded()) throw new ValidationError('Dialogue has ended')
      const node = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
      if (!node?.choices) throw new ValidationError('No choices available')
      if (index < 0 || index >= node.choices.length) throw new ValidationError(`Invalid choice index: ${index}`)
      const choice = node.choices[index]
      if (!choice) throw new ValidationError(`Invalid choice index: ${index}`)
      if (choice.disabled) throw new ValidationError('Cannot select disabled choice')
      if (choice.conditions) {
        const conditionMet = evaluateCondition(choice.conditions, gameFlags, conversationFlags)
        if (!conditionMet) throw new ValidationError('Choice conditions not met')
      }
      onChoiceSelected?.(choice, index)
      onNodeExit?.(node)
      history.push({
        nodeId: currentNodeId,
        node,
        choiceIndex: index,
        choice,
        timestamp: Date.now(),
        conversationFlags: { ...conversationFlags.all() },
      })
      if (choice.actions) {
        for (const action of choice.actions) {
          await executeAction(action, gameFlags, conversationFlags, actionHandlers, onActionExecuted)
        }
      }
      currentNodeId = choice.next
      const nextNode = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
      if (!nextNode) throw new ValidationError(`Target node not found: ${choice.next}`)
      if (nextNode.actions) {
        for (const action of nextNode.actions) {
          await executeAction(action, gameFlags, conversationFlags, actionHandlers, onActionExecuted)
        }
      }
      await updateInterpolatedNode()
      const speaker = nextNode.speaker ? speakers[nextNode.speaker] : undefined
      onNodeEnter?.(nextNode, speaker)
      await processAutoAdvance()
      await updateInterpolatedNode()
      const isEnded = runner.isEnded()
      if (isEnded && currentNodeId) {
        const endNode = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
        if (endNode) onDialogueEnd?.(currentDialogue.id, endNode)
      }
      if (!currentInterpolatedNode) throw new ValidationError('Failed to complete choice transition')
      return {
        currentNode: currentInterpolatedNode,
        availableChoices: runner.getChoices(),
        isEnded,
      }
    },

    isEnded: () => {
      if (!currentDialogue || !currentNodeId) return false
      const node = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
      if (!node) return false
      if (node.isEnd) return true
      if ((!node.choices || node.choices.length === 0) && !node.next) return true
      return false
    },

    getCurrentNode: () => {
      if (currentInterpolatedNode?.isEnd) return null
      return currentInterpolatedNode
    },

    getHistory: () => [...history],

    back: async () => {
      if (history.length === 0) return
      const lastEntry = history.pop()
      if (!lastEntry) return
      currentNodeId = lastEntry.nodeId
      conversationFlags.clear()
      for (const [key, value] of Object.entries(lastEntry.conversationFlags)) {
        conversationFlags.set(key, value)
      }
      await updateInterpolatedNode()
      const node = currentDialogue?.nodes[currentNodeId]
      if (node) {
        const speaker = node.speaker ? safeGet(speakers, node.speaker) : undefined
        onNodeEnter?.(node, speaker)
      }
    },

    restart: async (restartOptions = {}) => {
      if (!currentDialogue) throw new ValidationError('No active dialogue')
      history = []
      const state = await runner.start(currentDialogue)
      if (!restartOptions.preserveConversationFlags) {
        conversationFlags.clear()
        await updateInterpolatedNode()
      }
      return state
    },

    jumpTo: async (nodeId) => {
      if (!currentDialogue) throw new ValidationError('No active dialogue')
      const node = safeGet(currentDialogue.nodes, nodeId)
      if (!node) throw new ValidationError(`Node not found: ${nodeId}`)
      const previousNodeId = currentNodeId
      if (previousNodeId) {
        const prevNode = safeGet(currentDialogue.nodes, previousNodeId)
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
      const speaker = node.speaker ? safeGet(speakers, node.speaker) : undefined
      onNodeEnter?.(node, speaker)
    },

    serialize: () => {
      if (!currentDialogue || !currentNodeId) throw new ValidationError('No active dialogue to serialize')
      return {
        dialogueId: currentDialogue.id,
        currentNodeId,
        history,
        conversationFlags: conversationFlags.all(),
      }
    },

    deserialize: async (state) => {
      if (!currentDialogue) throw new ValidationError('Start a dialogue before deserializing state')
      currentNodeId = state.currentNodeId
      history = state.history
      conversationFlags = createInternalFlagStore()
      for (const [key, value] of Object.entries(state.conversationFlags)) {
        conversationFlags.set(key, value)
      }
      await updateInterpolatedNode()
      const node = currentNodeId ? safeGet(currentDialogue.nodes, currentNodeId) : undefined
      if (node) {
        const speaker = node.speaker ? safeGet(speakers, node.speaker) : undefined
        onNodeEnter?.(node, speaker)
      }
    },

    getConversationFlags: () => conversationFlags.all(),
    clearConversationFlags: () => conversationFlags.clear(),
    on: () => {},
  }

  return runner
}

// Validate dialogue
export function validateDialogue(dialogue) {
  const errors = []
  if (!dialogue.nodes || Object.keys(dialogue.nodes).length === 0) {
    errors.push('Dialogue must have at least one node')
    return { valid: false, errors }
  }
  if (!Object.hasOwn(dialogue.nodes, dialogue.startNode)) {
    errors.push(`Start node "${dialogue.startNode}" not found in nodes`)
  }
  const reachable = new Set()
  const toVisit = [dialogue.startNode]
  while (toVisit.length > 0) {
    const nodeId = toVisit.pop()
    if (!nodeId || reachable.has(nodeId)) continue
    reachable.add(nodeId)
    const node = dialogue.nodes[nodeId]
    if (!node) continue
    if (node.choices) {
      for (const choice of node.choices) {
        if (!Object.hasOwn(dialogue.nodes, choice.next)) {
          errors.push(`Choice in node "${nodeId}" targets non-existent node "${choice.next}"`)
        } else if (!reachable.has(choice.next)) {
          toVisit.push(choice.next)
        }
      }
    }
    if (node.next && !Object.hasOwn(dialogue.nodes, node.next)) {
      errors.push(`Node "${nodeId}" auto-advances to non-existent node "${node.next}"`)
    } else if (node.next && !reachable.has(node.next)) {
      toVisit.push(node.next)
    }
  }
  const allNodes = Object.keys(dialogue.nodes)
  const orphans = allNodes.filter(nodeId => !reachable.has(nodeId))
  if (orphans.length > 0) {
    errors.push(`Unreachable nodes: ${orphans.join(', ')}`)
  }
  return { valid: errors.length === 0, errors }
}

// Export for global use
window.createDialogueRunner = createDialogueRunner
window.validateDialogue = validateDialogue
window.createInternalFlagStore = createInternalFlagStore
window.ValidationError = ValidationError
window.DialogueError = DialogueError
window.DialogueStructureError = DialogueStructureError
