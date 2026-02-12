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
      const newValue = current - amount
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
    it('sets game flag value', async () => {
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
      await runner.start(dialogue)
      expect(gameFlags.get('testFlag')).toBe(true)
    })

    it('overwrites existing value', async () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('flag', 'old')
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'flag', value: 'new' }],
          },
        },
      }
      await runner.start(dialogue)
      expect(gameFlags.get('flag')).toBe('new')
    })

    it('creates new flag if not exists', async () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'newFlag', value: 100 }],
          },
        },
      }
      await runner.start(dialogue)
      expect(gameFlags.has('newFlag')).toBe(true)
      expect(gameFlags.get('newFlag')).toBe(100)
    })

    it('sets conversation flag value', async () => {
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
      await runner.start(dialogue)
      const flags = runner.getConversationFlags()
      expect(flags['testFlag']).toBe('test')
    })

    it('fires actionExecuted event', async () => {
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
      await runner.start(dialogue)
      expect(onActionExecuted).toHaveBeenCalled()
    })
  })

  describe('Clear Action', () => {
    it('clears game flag', async () => {
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
      await runner.start(dialogue)
      expect(gameFlags.has('testFlag')).toBe(false)
    })

    it('clears conversation flag', async () => {
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
      await runner.start(dialogue)
      const flags = runner.getConversationFlags()
      const hasTemp = 'temp' in flags
      expect(hasTemp).toBe(false)
    })

    it('no error if flag doesn\'t exist', async () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'clear', flag: 'nonexistent' }],
          },
        },
      }
      await expect(runner.start(dialogue)).resolves.not.toThrow()
    })
  })

  describe('Increment Action', () => {
    it('increments game flag by 1 default', async () => {
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
      await runner.start(dialogue)
      expect(gameFlags.get('counter')).toBe(6)
    })

    it('increments by specified value', async () => {
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
      await runner.start(dialogue)
      expect(gameFlags.get('score')).toBe(150)
    })

    it('initializes to value if flag undefined', async () => {
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
      await runner.start(dialogue)
      expect(gameFlags.get('newCounter')).toBe(10)
    })

    it('works with conversation flags', async () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [
              { type: 'set', flag: 'conv:score', value: 5 },
              { type: 'increment', flag: 'conv:score', value: 3 },
            ],
          },
        },
      }
      await runner.start(dialogue)
      const flags = runner.getConversationFlags()
      expect(flags['score']).toBe(8)
    })
  })

  describe('Decrement Action', () => {
    it('decrements game flag by 1 default', async () => {
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
      await runner.start(dialogue)
      expect(gameFlags.get('counter')).toBe(4)
    })

    it('decrements by specified value', async () => {
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
      await runner.start(dialogue)
      expect(gameFlags.get('health')).toBe(75)
    })

    it('allows negative results', async () => {
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
      await runner.start(dialogue)
      const health = gameFlags.get('health')
      expect(health).toBe(-10)
    })

    it('works with conversation flags', async () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [
              { type: 'set', flag: 'conv:counter', value: 10 },
              { type: 'decrement', flag: 'conv:counter', value: 3 },
            ],
          },
        },
      }
      await runner.start(dialogue)
      const flags = runner.getConversationFlags()
      expect(flags['counter']).toBe(7)
    })
  })

  describe('Callback Action', () => {
    it('calls registered action handler', async () => {
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
      await runner.start(dialogue)
      expect(handler).toHaveBeenCalled()
    })

    it('passes args to handler', async () => {
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
      await runner.start(dialogue)
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

    it('throws if handler not registered', async () => {
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
      await expect(runner.start(dialogue)).rejects.toThrow('unknownAction')
    })

    it('fires actionExecuted event with result', async () => {
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
      await runner.start(dialogue)
      expect(onActionExecuted).toHaveBeenCalled()
      const lastCall = onActionExecuted.mock.calls[onActionExecuted.mock.calls.length - 1]
      expect(lastCall?.[1]).toBe('result')
    })
  })
})
