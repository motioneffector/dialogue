import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createDialogueRunner } from './runner'
import type { DialogueDefinition, FlagStore, NodeDefinition, ChoiceDefinition } from './types'
import { ValidationError } from './errors'

// Mock flag store for testing
function createMockFlagStore(): FlagStore {
  const flags = new Map<string, boolean | number | string>()
  return {
    get: (key: string) => flags.get(key),
    set: (key: string, value: boolean | number | string) => {
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
      const newValue = current - amount
      flags.set(key, newValue)
      return newValue
    },
    check: (condition: string) => {
      // Simple mock implementation
      return true
    },
    all: () => Object.fromEntries(flags),
    keys: () => Array.from(flags.keys()),
  } as FlagStore
  const store = {
    get: (key: string) => flags.get(key),
    set: (key: string, value: boolean | number | string) => {
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
      const newValue = current - amount
      flags.set(key, newValue)
      return newValue
    },
    check: (condition: string) => {
      // Simple mock implementation
      return true
    },
    all: () => Object.fromEntries(flags),
    keys: () => Array.from(flags.keys()),
  } as FlagStore
  return store
}

// Test dialogue fixture
function createTestDialogue(): DialogueDefinition {
  return {
    id: 'test-dialogue',
    startNode: 'start',
    nodes: {
      start: {
        text: 'Welcome!',
        speaker: 'npc',
        choices: [
          { text: 'Continue', next: 'middle' },
          { text: 'End', next: 'end' },
        ],
      },
      middle: {
        text: 'Middle node',
        choices: [{ text: 'Go to end', next: 'end' }],
      },
      end: {
        text: 'The end',
        isEnd: true,
      },
    },
  }
}

describe('createDialogueRunner()', () => {
  describe('Basic Functionality', () => {
    it('creates runner with minimal options', () => {
      const runner = createDialogueRunner()
      expect(runner).toBeDefined()
      expect(runner.start).toBeDefined()
    })

    it('creates runner with gameFlags store', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      expect(runner).toBeDefined()
    })

    it('creates runner with event callbacks', () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      expect(runner).toBeDefined()
    })

    it('creates runner with actionHandlers', () => {
      const actionHandlers = { testAction: vi.fn() }
      const runner = createDialogueRunner({ actionHandlers })
      expect(runner).toBeDefined()
    })

    it('creates runner with speakers config', () => {
      const speakers = { npc: { name: 'Test NPC' } }
      const runner = createDialogueRunner({ speakers })
      expect(runner).toBeDefined()
    })

    it('creates runner with i18n adapter', () => {
      const i18n = { t: (key: string) => key, hasKey: () => false }
      const runner = createDialogueRunner({ i18n })
      expect(runner).toBeDefined()
    })

    it('creates runner with interpolation functions', () => {
      const interpolation = { custom: () => 'test' }
      const runner = createDialogueRunner({ interpolation })
      expect(runner).toBeDefined()
    })

    it('returns object with all expected methods', () => {
      const runner = createDialogueRunner()
      expect(runner.start).toBeTypeOf('function')
      expect(runner.getChoices).toBeTypeOf('function')
      expect(runner.choose).toBeTypeOf('function')
      expect(runner.isEnded).toBeTypeOf('function')
      expect(runner.getCurrentNode).toBeTypeOf('function')
      expect(runner.getHistory).toBeTypeOf('function')
      expect(runner.back).toBeTypeOf('function')
      expect(runner.restart).toBeTypeOf('function')
      expect(runner.jumpTo).toBeTypeOf('function')
      expect(runner.serialize).toBeTypeOf('function')
      expect(runner.deserialize).toBeTypeOf('function')
      expect(runner.getConversationFlags).toBeTypeOf('function')
      expect(runner.clearConversationFlags).toBeTypeOf('function')
      expect(runner.on).toBeTypeOf('function')
    })
  })

  describe('Validation', () => {
    it('throws ValidationError if gameFlags is not a flag store', () => {
      expect(() => createDialogueRunner({ gameFlags: {} as FlagStore })).toThrow(ValidationError)
    })

    it('accepts gameFlags as optional', () => {
      const runner = createDialogueRunner()
      expect(runner).toBeDefined()
    })
  })
})

describe('runner.start()', () => {
  describe('Basic Start', () => {
    it('starts dialogue at startNode', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('Welcome!')
    })

    it('returns current node state', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      const state = runner.start(dialogue)
      expect(state.currentNode).toBeDefined()
      expect(state.availableChoices).toBeDefined()
      expect(state.isEnded).toBeDefined()
    })

    it('sets isEnded to false', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      const state = runner.start(dialogue)
      expect(state.isEnded).toBe(false)
    })

    it('clears conversation flags from previous dialogue', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      // Set a conversation flag somehow
      const flags1 = runner.getConversationFlags()
      runner.start(dialogue) // Start again
      const flags2 = runner.getConversationFlags()
      expect(Object.keys(flags2).length).toBe(0)
    })

    it('fires dialogueStart event', () => {
      const onDialogueStart = vi.fn()
      const runner = createDialogueRunner({ onDialogueStart })
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      expect(onDialogueStart).toHaveBeenCalledWith(dialogue)
    })
  })

  describe('State', () => {
    it('tracks current node id', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      const node = runner.getCurrentNode()
      expect(node).toBeDefined()
      expect(node?.text).toBe('Welcome!')
    })

    it('initializes empty history', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      const history = runner.getHistory()
      expect(history.length).toBe(0)
    })

    it('initializes fresh conversation flag store', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      const flags = runner.getConversationFlags()
      expect(flags).toEqual({})
    })
  })

  describe('Node Entry', () => {
    it('fires nodeEnter event on start', () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      expect(onNodeEnter).toHaveBeenCalled()
    })

    it('executes node actions on entry', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'visited', value: true }],
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('visited')).toBe(true)
    })

    it('interpolates text variables', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('playerName', 'Hero')
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Hello {{playerName}}!',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('Hello Hero!')
    })
  })
})

describe('runner.getChoices()', () => {
  describe('Basic Choices', () => {
    it('returns available choices for current node', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(2)
    })

    it('excludes choices where conditions fail', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasKey', false)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Door',
            choices: [
              { text: 'Open door', next: 'opened', conditions: { check: ['hasKey', '==', true] } },
              { text: 'Leave', next: 'end' },
            ],
          },
          opened: { text: 'Opened' },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Leave')
    })

    it('returns empty array for node with no choices', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'No choices',
          },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(0)
    })

    it('returns empty array when dialogue ended', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'End',
            isEnd: true,
          },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(0)
    })
  })

  describe('Filtering Options', () => {
    it('includeUnavailable: true returns all choices', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasKey', false)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Door',
            choices: [
              { text: 'Open door', next: 'opened', conditions: { check: ['hasKey', '==', true] } },
              { text: 'Leave', next: 'end' },
            ],
          },
          opened: { text: 'Opened' },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices({ includeUnavailable: true })
      expect(choices.length).toBe(2)
    })

    it('unavailable choices have available: false', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasKey', false)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Door',
            choices: [
              { text: 'Open door', next: 'opened', conditions: { check: ['hasKey', '==', true] } },
            ],
          },
          opened: { text: 'Opened' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices({ includeUnavailable: true })
      expect(choices[0]).toHaveProperty('available', false)
    })

    it('unavailable choices include reason', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasKey', false)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Door',
            choices: [
              { text: 'Open door', next: 'opened', conditions: { check: ['hasKey', '==', true] } },
            ],
          },
          opened: { text: 'Opened' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices({ includeUnavailable: true })
      expect(choices[0]).toHaveProperty('reason')
    })

    it('custom filter function works', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      const choices = runner.getChoices({
        filter: choice => choice.text === 'Continue',
      })
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Continue')
    })

    it('filter by tags works', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Important', next: 'end', tags: ['important'] },
              { text: 'Normal', next: 'end' },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices({
        filter: choice => choice.tags?.includes('important') ?? false,
      })
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Important')
    })
  })

  describe('Disabled Choices', () => {
    it('includes disabled choices by default', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Disabled', next: 'end', disabled: true },
              { text: 'Enabled', next: 'end' },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(2)
    })

    it('disabled choices have disabled: true', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Disabled', next: 'end', disabled: true, disabledText: 'Not yet' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices[0]).toHaveProperty('disabled', true)
    })

    it('disabled choices include disabledText', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Disabled', next: 'end', disabled: true, disabledText: 'Not yet' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices[0]).toHaveProperty('disabledText', 'Not yet')
    })
  })
})

describe('runner.choose()', () => {
  describe('Basic Selection', () => {
    it('advances to next node by choice index', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      const state = runner.choose(0)
      expect(state.currentNode.text).toBe('Middle node')
    })

    it('returns new node state', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      const state = runner.choose(0)
      expect(state.currentNode).toBeDefined()
      expect(state.availableChoices).toBeDefined()
      expect(state.isEnded).toBeDefined()
    })

    it('fires choiceSelected event', () => {
      const onChoiceSelected = vi.fn()
      const runner = createDialogueRunner({ onChoiceSelected })
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      runner.choose(0)
      expect(onChoiceSelected).toHaveBeenCalled()
    })

    it('fires nodeExit event for previous node', () => {
      const onNodeExit = vi.fn()
      const runner = createDialogueRunner({ onNodeExit })
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      runner.choose(0)
      expect(onNodeExit).toHaveBeenCalled()
    })

    it('fires nodeEnter event for new node', () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      onNodeEnter.mockClear()
      runner.choose(0)
      expect(onNodeEnter).toHaveBeenCalled()
    })
  })

  describe('Actions', () => {
    it('executes choice actions on selection', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              {
                text: 'Action choice',
                next: 'end',
                actions: [{ type: 'set', flag: 'chosen', value: true }],
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      expect(gameFlags.get('chosen')).toBe(true)
    })

    it('executes target node actions on entry', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: {
            text: 'End',
            actions: [{ type: 'set', flag: 'reached', value: true }],
          },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      expect(gameFlags.get('reached')).toBe(true)
    })

    it('action errors do not break traversal', () => {
      const actionHandlers = {
        failingAction: () => {
          throw new Error('Action failed')
        },
      }
      const runner = createDialogueRunner({ actionHandlers })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              {
                text: 'Go',
                next: 'end',
                actions: [{ type: 'callback', name: 'failingAction' }],
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      expect(() => runner.choose(0)).not.toThrow()
      expect(runner.getCurrentNode()?.text).toBe('End')
    })
  })

  describe('Validation', () => {
    it('throws ValidationError for invalid index', () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      runner.start(dialogue)
      expect(() => runner.choose(99)).toThrow(ValidationError)
    })

    it('throws ValidationError for unavailable choice', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasKey', false)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Door',
            choices: [
              { text: 'Open door', next: 'opened', conditions: { check: ['hasKey', '==', true] } },
              { text: 'Leave', next: 'end' },
            ],
          },
          opened: { text: 'Opened' },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      expect(() => runner.choose(0)).toThrow(ValidationError)
    })

    it('throws ValidationError for disabled choice', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Disabled', next: 'end', disabled: true },
              { text: 'Enabled', next: 'end' },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      expect(() => runner.choose(0)).toThrow(ValidationError)
    })

    it('throws ValidationError when dialogue ended', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'End',
            isEnd: true,
          },
        },
      }
      runner.start(dialogue)
      expect(() => runner.choose(0)).toThrow(ValidationError)
    })
  })
})

describe('runner.isEnded()', () => {
  it('returns false after start', () => {
    const runner = createDialogueRunner()
    const dialogue = createTestDialogue()
    runner.start(dialogue)
    expect(runner.isEnded()).toBe(false)
  })

  it('returns true at terminal node', () => {
    const runner = createDialogueRunner()
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'Start',
          choices: [{ text: 'End', next: 'end' }],
        },
        end: {
          text: 'End',
          isEnd: true,
        },
      },
    }
    runner.start(dialogue)
    runner.choose(0)
    expect(runner.isEnded()).toBe(true)
  })

  it('returns true for node with isEnd: true', () => {
    const runner = createDialogueRunner()
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'Start',
          isEnd: true,
        },
      },
    }
    runner.start(dialogue)
    expect(runner.isEnded()).toBe(true)
  })

  it('returns true for node with no choices and no next', () => {
    const runner = createDialogueRunner()
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'Start',
        },
      },
    }
    runner.start(dialogue)
    expect(runner.isEnded()).toBe(true)
  })
})

describe('runner.getCurrentNode()', () => {
  it('returns current node definition', () => {
    const runner = createDialogueRunner()
    const dialogue = createTestDialogue()
    runner.start(dialogue)
    const node = runner.getCurrentNode()
    expect(node?.text).toBe('Welcome!')
  })

  it('returns null before start', () => {
    const runner = createDialogueRunner()
    const node = runner.getCurrentNode()
    expect(node).toBeNull()
  })

  it('returns last node after end', () => {
    const runner = createDialogueRunner()
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'End',
          isEnd: true,
        },
      },
    }
    runner.start(dialogue)
    const node = runner.getCurrentNode()
    expect(node?.text).toBe('End')
  })

  it('includes interpolated text', () => {
    const gameFlags = createMockFlagStore()
    gameFlags.set('name', 'Alice')
    const runner = createDialogueRunner({ gameFlags })
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'Hello {{name}}!',
        },
      },
    }
    runner.start(dialogue)
    const node = runner.getCurrentNode()
    expect(node?.text).toBe('Hello Alice!')
  })
})
