import { describe, it, expect, vi } from 'vitest'
import { createDialogueRunner } from './runner'
import type { DialogueDefinition, FlagStore } from './types'

// Mock flag store
function createMockFlagStore(): FlagStore {
  const flags = new Map<string, boolean | number | string>()
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
      const newValue = Math.max(0, current - amount)
      flags.set(key, newValue)
      return newValue
    },
    check: () => true,
    all: () => Object.fromEntries(flags),
    keys: () => Array.from(flags.keys()),
  } as FlagStore
  return store
}

describe('Actions', () => {
  describe('Set Action', () => {
    it('sets game flag value', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'testFlag', value: true }],
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('testFlag')).toBe(true)
    })

    it('sets conversation flag value', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:testFlag', value: 'test' }],
          },
        },
      }
      runner.start(dialogue)
      const flags = runner.getConversationFlags()
      expect(flags['testFlag']).toBe('test')
    })

    it('fires actionExecuted event', () => {
      const onActionExecuted = vi.fn()
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags, onActionExecuted })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'test', value: true }],
          },
        },
      }
      runner.start(dialogue)
      expect(onActionExecuted).toHaveBeenCalled()
    })
  })

  describe('Clear Action', () => {
    it('clears game flag', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('testFlag', true)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'clear', flag: 'testFlag' }],
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.has('testFlag')).toBe(false)
    })

    it('clears conversation flag', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [
              { type: 'set', flag: 'conv:temp', value: true },
              { type: 'clear', flag: 'conv:temp' },
            ],
          },
        },
      }
      runner.start(dialogue)
      const flags = runner.getConversationFlags()
      expect(flags['temp']).toBeUndefined()
    })
  })

  describe('Increment Action', () => {
    it('increments game flag by 1 default', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('counter', 5)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'increment', flag: 'counter' }],
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('counter')).toBe(6)
    })

    it('increments by specified value', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('score', 100)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'increment', flag: 'score', value: 50 }],
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('score')).toBe(150)
    })

    it('initializes to value if flag undefined', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'increment', flag: 'newCounter', value: 10 }],
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('newCounter')).toBe(10)
    })
  })

  describe('Decrement Action', () => {
    it('decrements game flag by 1 default', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('counter', 5)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'decrement', flag: 'counter' }],
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('counter')).toBe(4)
    })

    it('decrements by specified value', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('health', 100)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'decrement', flag: 'health', value: 25 }],
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('health')).toBe(75)
    })

    it('does not go below 0 for numbers', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('health', 10)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'decrement', flag: 'health', value: 20 }],
          },
        },
      }
      runner.start(dialogue)
      const health = gameFlags.get('health')
      expect(health).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Callback Action', () => {
    it('calls registered action handler', () => {
      const handler = vi.fn()
      const runner = createDialogueRunner({ actionHandlers: { testAction: handler } })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'callback', name: 'testAction' }],
          },
        },
      }
      runner.start(dialogue)
      expect(handler).toHaveBeenCalled()
    })

    it('passes args to handler', () => {
      const handler = vi.fn()
      const runner = createDialogueRunner({ actionHandlers: { testAction: handler } })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'callback', name: 'testAction', args: ['arg1', 42, true] }],
          },
        },
      }
      runner.start(dialogue)
      expect(handler).toHaveBeenCalledWith(['arg1', 42, true])
    })

    it('handles async handlers', async () => {
      const handler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'result'
      })
      const runner = createDialogueRunner({ actionHandlers: { asyncAction: handler } })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'callback', name: 'asyncAction' }],
          },
        },
      }
      await runner.start(dialogue)
      expect(handler).toHaveBeenCalled()
    })

    it('throws if handler not registered', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'callback', name: 'unknownAction' }],
          },
        },
      }
      expect(() => runner.start(dialogue)).toThrow()
    })

    it('fires actionExecuted event with result', () => {
      const onActionExecuted = vi.fn()
      const handler = () => 'result'
      const runner = createDialogueRunner({
        actionHandlers: { testAction: handler },
        onActionExecuted,
      })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'callback', name: 'testAction' }],
          },
        },
      }
      runner.start(dialogue)
      expect(onActionExecuted).toHaveBeenCalled()
      const lastCall = onActionExecuted.mock.calls[onActionExecuted.mock.calls.length - 1]
      expect(lastCall?.[1]).toBe('result')
    })
  })
})
