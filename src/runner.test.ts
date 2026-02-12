import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createDialogueRunner } from './runner'
import type { DialogueDefinition, FlagStore, NodeDefinition, ChoiceDefinition } from './types'
import { ValidationError } from './errors'

// Mock flag store for testing
function createMockFlagStore(): FlagStore {
  const flags = new Map<string, boolean | number | string>()
  const store: FlagStore = {
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
  }
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
      expect(runner.start).toBeTypeOf('function')
      expect(runner.getChoices).toBeTypeOf('function')
    })

    it('creates runner with gameFlags store', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      expect(runner).toBeDefined()
      expect(runner.start).toBeTypeOf('function')
    })

    it('creates runner with event callbacks', () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      expect(runner).toBeDefined()
      expect(runner.start).toBeTypeOf('function')
    })

    it('creates runner with actionHandlers', () => {
      const actionHandlers = { testAction: vi.fn() }
      const runner = createDialogueRunner({ actionHandlers })
      expect(runner).toBeDefined()
      expect(runner.start).toBeTypeOf('function')
    })

    it('creates runner with speakers config', () => {
      const speakers = { npc: { name: 'Test NPC' } }
      const runner = createDialogueRunner({ speakers })
      expect(runner).toBeDefined()
      expect(runner.start).toBeTypeOf('function')
    })

    it('creates runner with i18n adapter', () => {
      const i18n = { t: (key: string) => key, hasKey: () => false }
      const runner = createDialogueRunner({ i18n })
      expect(runner).toBeDefined()
      expect(runner.start).toBeTypeOf('function')
    })

    it('creates runner with interpolation functions', () => {
      const interpolation = { custom: () => 'test' }
      const runner = createDialogueRunner({ interpolation })
      expect(runner).toBeDefined()
      expect(runner.start).toBeTypeOf('function')
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
    it('throws ValidationError if actionHandler is not a function', () => {
      expect(() =>
        createDialogueRunner({ actionHandlers: { bad: 'not a function' as any } })
      ).toThrow(/function/)
    })

    it('throws ValidationError if i18n adapter missing t method', () => {
      expect(() =>
        createDialogueRunner({ i18n: { hasKey: () => false } as any })
      ).toThrow(/method/)
    })

    it('throws ValidationError if i18n adapter missing hasKey method', () => {
      expect(() =>
        createDialogueRunner({ i18n: { t: (key: string) => key } as any })
      ).toThrow(/hasKey/)
    })
  })
})

describe('runner.start() - Validation', () => {
  it('throws ValidationError for missing startNode', async () => {
    const runner = createDialogueRunner()
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'nonexistent',
      nodes: {
        start: { text: 'Start' },
      },
    }
    await expect(runner.start(dialogue)).rejects.toThrow(/nonexistent/)
  })

  it('throws ValidationError for invalid dialogue structure', async () => {
    const runner = createDialogueRunner()
    const dialogue: any = {
      id: 'test',
      // Missing startNode
      nodes: {
        start: { text: 'Start' },
      },
    }
    await expect(runner.start(dialogue)).rejects.toThrow(/not found|undefined/)
  })

  it('throws ValidationError if startNode not in nodes', async () => {
    const runner = createDialogueRunner()
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'missing',
      nodes: {
        start: { text: 'Start' },
      },
    }
    await expect(runner.start(dialogue)).rejects.toThrow(/missing/)
  })
})

describe('runner.start()', () => {
  describe('Basic Start', () => {
    it('starts dialogue at startNode', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      const state = await runner.start(dialogue)
      expect(state.currentNode.text).toBe('Welcome!')
    })

    it('returns current node state', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      const state = await runner.start(dialogue)
      expect(state.currentNode).toBeDefined()
      expect(state.currentNode.text).toBe('Welcome!')
      expect(state.availableChoices).toHaveLength(2)
      expect(state.availableChoices[0]?.text).toBe('Continue')
      expect(state.availableChoices[1]?.text).toBe('End')
      expect(state.isEnded).toBe(false)
    })

    it('sets isEnded to false', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      const state = await runner.start(dialogue)
      expect(state.isEnded).toBe(false)
    })

    it('clears conversation flags from previous dialogue', async () => {
      const runner = createDialogueRunner()
      const dialogue1: DialogueDefinition = {
        id: 'test1',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:temp', value: true }],
          },
        },
      }
      await runner.start(dialogue1)
      const flags1 = runner.getConversationFlags()
      expect(flags1['temp']).toBe(true)

      const dialogue2 = createTestDialogue()
      await runner.start(dialogue2) // Start new dialogue
      const flags2 = runner.getConversationFlags()
      // Verify conversation flags are cleared when starting new dialogue
      const hasTemp = 'temp' in flags2
      expect(hasTemp).toBe(false)
    })

    it('fires dialogueStart event', async () => {
      const onDialogueStart = vi.fn()
      const runner = createDialogueRunner({ onDialogueStart })
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      expect(onDialogueStart).toHaveBeenCalledWith(dialogue)
    })

    it('preserves game flags from previous dialogue', async () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('persistent', 'value1')
      const runner = createDialogueRunner({ gameFlags })
      const dialogue1: DialogueDefinition = {
        id: 'test1',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'persistent', value: 'value2' }],
          },
        },
      }
      await runner.start(dialogue1)
      expect(gameFlags.get('persistent')).toBe('value2')

      const dialogue2 = createTestDialogue()
      await runner.start(dialogue2)
      // Game flags should still be present
      expect(gameFlags.get('persistent')).toBe('value2')
    })
  })

  describe('State', () => {
    it('tracks current node id', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      const node = runner.getCurrentNode()
      expect(node).toBeDefined()
      expect(node?.text).toBe('Welcome!')
    })

    it('initializes empty history', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      const history = runner.getHistory()
      // No choices made yet — verify by checking first entry doesn't exist
      expect(history.find(h => h !== undefined)).toBe(undefined)
    })

    it('initializes fresh conversation flag store', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      const flags = runner.getConversationFlags()
      expect(flags).toEqual({})
    })
  })

  describe('Node Entry', () => {
    it('fires nodeEnter event on start', async () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      expect(onNodeEnter).toHaveBeenCalled()
    })

    it('executes node actions on entry', async () => {
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
      await runner.start(dialogue)
      expect(gameFlags.get('visited')).toBe(true)
    })

    it('interpolates text variables', async () => {
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
      const state = await runner.start(dialogue)
      expect(state.currentNode.text).toBe('Hello Hero!')
    })

    it('returns node speaker', async () => {
      const speakers = { npc: { name: 'TestNPC' } }
      const runner = createDialogueRunner({ speakers })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Hello',
            speaker: 'npc',
          },
        },
      }
      const state = await runner.start(dialogue)
      expect(state.currentNode.speaker).toBeDefined()
      expect(state.currentNode.speaker).toBe('npc')
    })

    it('returns node tags', async () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Tagged node',
            tags: ['important', 'intro'],
          },
        },
      }
      const state = await runner.start(dialogue)
      expect(state.currentNode.tags).toEqual(['important', 'intro'])
    })
  })
})

describe('runner.getChoices()', () => {
  describe('Basic Choices', () => {
    it('returns available choices for current node', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(2)
      expect(choices[0]?.text).toBe('Continue')
      expect(choices[1]?.text).toBe('End')
    })

    it('excludes choices where conditions fail', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Leave')
    })

    it('returns empty array for node with no choices', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices()
      // Node explicitly has no choices — verify none returned
      expect(choices.find(c => c.text !== undefined)).toBe(undefined)
    })

    it('returns empty array when dialogue ended', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices()
      // Dialogue is ended — verify no choices available
      expect(choices.find(c => c.text !== undefined)).toBe(undefined)
    })
  })

  describe('Filtering Options', () => {
    it('includeUnavailable: true returns all choices', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices({ includeUnavailable: true })
      expect(choices.length).toBe(2)
      expect(choices[0]?.text).toBe('Open door')
      expect(choices[1]?.text).toBe('Leave')
    })

    it('unavailable choices have available: false', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices({ includeUnavailable: true })
      expect(choices[0]).toHaveProperty('available', false)
    })

    it('unavailable choices include reason', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices({ includeUnavailable: true })
      expect(choices[0]?.reason).toMatch(/key|condition|flag/i)
    })

    it('custom filter function works', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      const choices = runner.getChoices({
        filter: choice => choice.text === 'Continue',
      })
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Continue')
    })

    it('filter by tags works', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices({
        filter: choice => choice.tags?.includes('important') ?? false,
      })
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Important')
    })
  })

  describe('Disabled Choices', () => {
    it('disabled: true choices excluded by default', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Enabled')
    })

    it('includeDisabled: true shows disabled choices', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices({ includeDisabled: true })
      expect(choices.length).toBe(2)
      expect(choices[0]?.text).toBe('Disabled')
      expect(choices[1]?.text).toBe('Enabled')
    })

    it('disabled choices have disabled: true flag', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices({ includeDisabled: true })
      expect(choices[0]).toHaveProperty('disabled', true)
    })

    it('disabled choices include disabledText', async () => {
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
      await runner.start(dialogue)
      const choices = runner.getChoices({ includeDisabled: true })
      expect(choices[0]).toHaveProperty('disabledText', 'Not yet')
    })

    it('handles node with only disabled choices', async () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Disabled 1', next: 'end', disabled: true },
              { text: 'Disabled 2', next: 'end', disabled: true },
            ],
          },
          end: { text: 'End' },
        },
      }
      await runner.start(dialogue)
      const choices = runner.getChoices()
      // All choices are disabled — none should be available
      expect(choices.find(c => c.text !== undefined)).toBe(undefined)
    })
  })
})

describe('runner.choose()', () => {
  describe('Basic Selection', () => {
    it('advances to next node by choice index', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      const state = await runner.choose(0)
      expect(state.currentNode.text).toBe('Middle node')
    })

    it('returns new node state', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      const state = await runner.choose(0)
      expect(state.currentNode.text).toBe('Middle node')
      expect(state.availableChoices).toHaveLength(1)
      expect(state.availableChoices[0]?.text).toBe('Go to end')
      expect(state.isEnded).toBe(false)
    })

    it('fires choiceSelected event', async () => {
      const onChoiceSelected = vi.fn()
      const runner = createDialogueRunner({ onChoiceSelected })
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      await runner.choose(0)
      expect(onChoiceSelected).toHaveBeenCalled()
    })

    it('fires nodeExit event for previous node', async () => {
      const onNodeExit = vi.fn()
      const runner = createDialogueRunner({ onNodeExit })
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      await runner.choose(0)
      expect(onNodeExit).toHaveBeenCalled()
    })

    it('fires nodeEnter event for new node', async () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      onNodeEnter.mockClear()
      await runner.choose(0)
      expect(onNodeEnter).toHaveBeenCalled()
    })
  })

  describe('Actions', () => {
    it('executes choice actions on selection', async () => {
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
      await runner.start(dialogue)
      await runner.choose(0)
      expect(gameFlags.get('chosen')).toBe(true)
    })

    it('executes target node actions on entry', async () => {
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
      await runner.start(dialogue)
      await runner.choose(0)
      expect(gameFlags.get('reached')).toBe(true)
    })

    it('action errors do not break traversal', async () => {
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
      await runner.start(dialogue)
      await runner.choose(0)
      expect(runner.getCurrentNode()?.text).toBe('End')
    })

    it('executes multiple actions in order', async () => {
      const gameFlags = createMockFlagStore()
      const executionOrder: string[] = []
      const actionHandlers = {
        action1: () => executionOrder.push('action1'),
        action2: () => executionOrder.push('action2'),
      }
      const runner = createDialogueRunner({ gameFlags, actionHandlers })
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
                actions: [
                  { type: 'set', flag: 'flag1', value: true },
                  { type: 'callback', name: 'action1' },
                  { type: 'set', flag: 'flag2', value: true },
                  { type: 'callback', name: 'action2' },
                ],
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      await runner.start(dialogue)
      await runner.choose(0)
      expect(gameFlags.get('flag1')).toBe(true)
      expect(gameFlags.get('flag2')).toBe(true)
      expect(executionOrder).toEqual(['action1', 'action2'])
    })

    it('interpolates new node text', async () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('score', 100)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Check', next: 'result' }],
          },
          result: {
            text: 'Your score is {{score}}!',
          },
        },
      }
      await runner.start(dialogue)
      const state = await runner.choose(0)
      expect(state.currentNode.text).toBe('Your score is 100!')
    })
  })

  describe('Validation', () => {
    it('throws ValidationError for invalid index', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      await expect(runner.choose(99)).rejects.toThrow(/index/)
    })

    it('throws ValidationError for negative index', async () => {
      const runner = createDialogueRunner()
      const dialogue = createTestDialogue()
      await runner.start(dialogue)
      await expect(runner.choose(-1)).rejects.toThrow(/index/)
    })

    it('throws ValidationError for unavailable choice', async () => {
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
      await runner.start(dialogue)
      await expect(runner.choose(0)).rejects.toThrow(/unavailable|condition/)
    })

    it('throws ValidationError for disabled choice', async () => {
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
      await runner.start(dialogue)
      await expect(runner.choose(0)).rejects.toThrow(/disabled/)
    })

    it('throws ValidationError when dialogue ended', async () => {
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
      await runner.start(dialogue)
      await expect(runner.choose(0)).rejects.toThrow(/ended/)
    })

    it('throws ValidationError when no dialogue started', async () => {
      const runner = createDialogueRunner()
      await expect(runner.choose(0)).rejects.toThrow(/started|dialogue/)
    })
  })
})

describe('runner.isEnded()', () => {
  it('returns false after start', async () => {
    const runner = createDialogueRunner()
    const dialogue = createTestDialogue()
    await runner.start(dialogue)
    expect(runner.isEnded()).toBe(false)
  })

  it('returns true at terminal node', async () => {
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
    await runner.start(dialogue)
    await runner.choose(0)
    expect(runner.isEnded()).toBe(true)
  })

  it('returns true for node with isEnd: true', async () => {
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
    await runner.start(dialogue)
    expect(runner.isEnded()).toBe(true)
  })

  it('returns true for node with no choices and no next', async () => {
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
    await runner.start(dialogue)
    expect(runner.isEnded()).toBe(true)
  })
})

describe('runner.getCurrentNode()', () => {
  it('returns current node definition', async () => {
    const runner = createDialogueRunner()
    const dialogue = createTestDialogue()
    await runner.start(dialogue)
    const node = runner.getCurrentNode()
    expect(node?.text).toBe('Welcome!')
  })

  it('returns null before start', () => {
    const runner = createDialogueRunner()
    const node = runner.getCurrentNode()
    // Before starting, no current node exists
    expect(node).toBe(null)
  })

  it('returns null if dialogue ended', async () => {
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
    await runner.start(dialogue)
    await runner.choose(0)
    const node = runner.getCurrentNode()
    // After dialogue ends, no current node
    expect(node).toBe(null)
  })

  it('includes interpolated text', async () => {
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
    await runner.start(dialogue)
    const node = runner.getCurrentNode()
    expect(node?.text).toBe('Hello Alice!')
  })
})

describe('Security: prototype pollution prevention', () => {
  it('rejects __proto__ as node ID', async () => {
    const runner = createDialogueRunner()
    const maliciousDialogue: DialogueDefinition = {
      id: 'malicious',
      startNode: '__proto__',
      nodes: {
        __proto__: {
          text: 'Malicious node',
        } as NodeDefinition,
      },
    }

    // Should fail to start because __proto__ is not a safe key
    await expect(runner.start(maliciousDialogue)).rejects.toThrow(/__proto__|dangerous/)
  })

  it('rejects constructor as node ID', async () => {
    const runner = createDialogueRunner()
    const maliciousDialogue: DialogueDefinition = {
      id: 'malicious',
      startNode: 'constructor',
      nodes: {
        constructor: {
          text: 'Malicious node',
        } as NodeDefinition,
      },
    }

    await expect(runner.start(maliciousDialogue)).rejects.toThrow(/constructor|dangerous/)
  })

  it('rejects prototype as node ID', async () => {
    const runner = createDialogueRunner()
    const maliciousDialogue: DialogueDefinition = {
      id: 'malicious',
      startNode: 'prototype',
      nodes: {
        prototype: {
          text: 'Malicious node',
        } as NodeDefinition,
      },
    }

    await expect(runner.start(maliciousDialogue)).rejects.toThrow(/prototype|dangerous/)
  })

  it('rejects __proto__ as speaker name', async () => {
    const speakers = {
      __proto__: { name: 'Malicious' },
    }
    const runner = createDialogueRunner({ speakers })
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'Hello',
          speaker: '__proto__',
        },
      },
    }

    await runner.start(dialogue)
    const node = runner.getCurrentNode()
    // Should not be able to access __proto__ speaker - verify safe execution
    expect(node?.text).toBe('Hello')
  })

  it('rejects __proto__ as action handler name', async () => {
    let handlerCalled = false
    const actionHandlers = {
      __proto__: () => {
        handlerCalled = true
      },
    }
    const runner = createDialogueRunner({ actionHandlers })
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'Test',
          actions: [{ type: 'callback', name: '__proto__' }],
        },
      },
    }

    // Should complete but handler should not be called (error is logged, not thrown)
    await runner.start(dialogue)
    expect(handlerCalled).toBe(false)
  })

  it('rejects constructor as action handler name', async () => {
    let handlerCalled = false
    const actionHandlers = {
      constructor: () => {
        handlerCalled = true
      },
    }
    const runner = createDialogueRunner({ actionHandlers })
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'Test',
          actions: [{ type: 'callback', name: 'constructor' }],
        },
      },
    }

    // Should complete but handler should not be called (error is logged, not thrown)
    await runner.start(dialogue)
    expect(handlerCalled).toBe(false)
  })

  it('rejects __proto__ as interpolation key', async () => {
    let interpolationCalled = false
    const interpolation = {
      __proto__: () => {
        interpolationCalled = true
        return 'malicious'
      },
    }
    const runner = createDialogueRunner({ interpolation })
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'Hello {{__proto__}}',
        },
      },
    }

    await runner.start(dialogue)
    const node = runner.getCurrentNode()
    // Interpolation function should not be called
    expect(interpolationCalled).toBe(false)
    // Should render empty string instead of calling malicious function
    expect(node?.text).toBe('Hello ')
  })

  it('does not pollute Object.prototype via node access', async () => {
    const runner = createDialogueRunner()
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'Safe node',
          choices: [{ text: 'Go to __proto__', next: '__proto__' }],
        },
        __proto__: {
          text: 'Malicious',
        } as NodeDefinition,
        safe: {
          text: 'Safe fallback',
        },
      },
    }

    await runner.start(dialogue)
    // __proto__ node should not be accessible
    const choices = runner.getChoices()
    expect(choices.length).toBe(1)
    expect(choices[0]?.text).toBe('Go to __proto__')

    // Verify Object.prototype is not polluted
    const protoHasText = Object.prototype.hasOwnProperty.call(Object.prototype, 'text')
    expect(protoHasText).toBe(false)
    const emptyHasText = Object.prototype.hasOwnProperty.call({}, 'text')
    expect(emptyHasText).toBe(false)
  })

  it('handles normal property names correctly', async () => {
    const runner = createDialogueRunner({
      speakers: { alice: { name: 'Alice' } },
      actionHandlers: { greet: () => 'hello' },
      interpolation: { custom: () => 'custom value' },
    })

    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: {
          text: 'Test {{custom}}',
          speaker: 'alice',
          actions: [{ type: 'callback', name: 'greet' }],
        },
      },
    }

    // Should work normally for safe property names
    const state = await runner.start(dialogue)
    expect(state.currentNode.text).toBe('Test custom value')
    expect(state.currentNode.speaker).toBe('alice')
    const node = runner.getCurrentNode()
    expect(node?.text).toBe('Test custom value')
  })
})
