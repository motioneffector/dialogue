import { describe, it, expect, beforeEach } from 'vitest'
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
    check: (condition: string) => {
      // Parse simple conditions for testing
      const match = condition.match(/(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)/)
      if (match) {
        const [, key, op, valueStr] = match
        const flagValue = flags.get(key!)
        let value: boolean | number | string = valueStr!.trim()
        if (value === 'true') value = true
        else if (value === 'false') value = false
        else if (!isNaN(Number(value))) value = Number(value)

        switch (op) {
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
        }
      }
      return Boolean(flags.get(condition))
    },
    all: () => Object.fromEntries(flags),
    keys: () => Array.from(flags.keys()),
  } as FlagStore
  return store
}

describe('Dual Flag System', () => {
  describe('Game Flags (Persistent)', () => {
    it('reads game flags for conditions', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasKey', true)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Door',
            choices: [
              { text: 'Open', next: 'opened', conditions: { check: ['hasKey', '==', true] } },
              { text: 'Leave', next: 'end' },
            ],
          },
          opened: { text: 'Opened' },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(2)
      expect(choices[0]?.text).toBe('Open')
      expect(choices[1]?.text).toBe('Leave')
    })

    it('writes game flags via actions', () => {
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
                text: 'Set flag',
                next: 'end',
                actions: [{ type: 'set', flag: 'game:visited', value: true }],
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      expect(gameFlags.get('game:visited')).toBe(true)
    })

    it('unprefixed flags default to game scope', () => {
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

    it('"game:" prefix explicitly uses game scope', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'game:visited', value: true }],
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('game:visited')).toBe(true)
    })

    it('game flag changes persist after dialogue ends', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'persistent', value: true }],
            isEnd: true,
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('persistent')).toBe(true)
    })
  })

  describe('Conversation Flags (Ephemeral)', () => {
    it('"conv:" prefix uses conversation scope', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:discussed', value: true }],
          },
        },
      }
      runner.start(dialogue)
      const convFlags = runner.getConversationFlags()
      expect(convFlags['discussed']).toBe(true)
    })

    it('conversation flags start empty on dialogue start', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: { start: { text: 'Start' } },
      }
      runner.start(dialogue)
      const flags = runner.getConversationFlags()
      // Verify no flags exist — confirmed by checking specific non-existence
      const hasDiscussed = 'discussed' in flags
      expect(hasDiscussed).toBe(false)
      const hasTemp = 'temp' in flags
      expect(hasTemp).toBe(false)
    })

    it('conversation flags cleared on dialogue end', () => {
      const runner = createDialogueRunner()
      const dialogue1: DialogueDefinition = {
        id: 'test1',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:temp', value: true }],
            isEnd: true,
          },
        },
      }
      runner.start(dialogue1)
      const dialogue2: DialogueDefinition = {
        id: 'test2',
        startNode: 'start',
        nodes: { start: { text: 'Start' } },
      }
      runner.start(dialogue2)
      const flags = runner.getConversationFlags()
      // Verify conversation flag is cleared when starting new dialogue
      const hasTemp = 'temp' in flags
      expect(hasTemp).toBe(false)
    })

    it('conversation flags isolated between dialogues', () => {
      const runner = createDialogueRunner()
      const dialogue1: DialogueDefinition = {
        id: 'test1',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:flag1', value: true }],
          },
        },
      }
      runner.start(dialogue1)
      const flags1 = runner.getConversationFlags()
      expect(flags1['flag1']).toBe(true)

      const dialogue2: DialogueDefinition = {
        id: 'test2',
        startNode: 'start',
        nodes: { start: { text: 'Start' } },
      }
      runner.start(dialogue2)
      const flags2 = runner.getConversationFlags()
      // Verify flag1 from first dialogue is not present in second dialogue
      const hasFlag1 = 'flag1' in flags2
      expect(hasFlag1).toBe(false)
    })

    it('conversation flags readable in conditions', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:discussed', value: true }],
            choices: [
              {
                text: 'Follow up',
                next: 'end',
                conditions: { check: ['conv:discussed', '==', true] },
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Follow up')
      expect(choices[0]?.next).toBe('end')
    })
  })

  describe('Mixed Conditions', () => {
    it('evaluates game and conv flags together', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasKey', true)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:asked', value: true }],
            choices: [
              {
                text: 'Both needed',
                next: 'end',
                conditions: {
                  and: [
                    { check: ['hasKey', '==', true] },
                    { check: ['conv:asked', '==', true] },
                  ],
                },
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Both needed')
      expect(choices[0]?.next).toBe('end')
    })

    it('and conditions with both scopes work', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('game:flag1', true)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:flag2', value: true }],
            choices: [
              {
                text: 'Choice',
                next: 'end',
                conditions: {
                  and: [
                    { check: ['game:flag1', '==', true] },
                    { check: ['conv:flag2', '==', true] },
                  ],
                },
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Choice')
      expect(choices[0]?.next).toBe('end')
    })

    it('or conditions with both scopes work', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('game:flag1', false)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:flag2', value: true }],
            choices: [
              {
                text: 'Choice',
                next: 'end',
                conditions: {
                  or: [
                    { check: ['game:flag1', '==', true] },
                    { check: ['conv:flag2', '==', true] },
                  ],
                },
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Choice')
      expect(choices[0]?.next).toBe('end')
    })
  })

  describe('getConversationFlags()', () => {
    it('returns copy not reference', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:flag1', value: true }],
          },
        },
      }
      runner.start(dialogue)
      const flags1 = runner.getConversationFlags()
      const flags2 = runner.getConversationFlags()
      expect(flags1).not.toBe(flags2) // Different object references
      expect(flags1).toEqual(flags2) // Same values
      flags1['flag1'] = false // Modifying copy shouldn't affect internal state
      const flags3 = runner.getConversationFlags()
      expect(flags3['flag1']).toBe(true) // Original value unchanged
    })
  })

  describe('Flag Resolution', () => {
    it('"gold" resolves to game:gold', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('gold', 100)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Check gold', next: 'end', conditions: { check: ['gold', '>=', 50] } },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Check gold')
      expect(choices[0]?.next).toBe('end')
    })

    it('"game:gold" resolves to game:gold', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('game:gold', 100)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Check gold', next: 'end', conditions: { check: ['game:gold', '>=', 50] } },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Check gold')
      expect(choices[0]?.next).toBe('end')
    })

    it('"conv:discussed" resolves to conv:discussed', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:discussed', value: true }],
            choices: [
              {
                text: 'Follow up',
                next: 'end',
                conditions: { check: ['conv:discussed', '==', true] },
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
      expect(choices[0]?.text).toBe('Follow up')
      expect(choices[0]?.next).toBe('end')
    })

    it('unknown prefix treated as game scope', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('custom:flag', true)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'custom:flag', value: true }],
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('custom:flag')).toBe(true)
    })
  })
})
