import { describe, it, expect, vi } from 'vitest'
import { createDialogueRunner, createI18nAdapter, validateDialogue } from './index'
import type { DialogueDefinition, FlagStore, I18nAdapter } from './types'

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

describe('Conditions', () => {
  describe('Integration with @motioneffector/flags', () => {
    it('evaluates simple equality check', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasKey', true)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Check', next: 'end', conditions: { check: ['hasKey', '==', true] } },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
    })

    it('evaluates numeric comparisons', () => {
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
              { text: 'Buy', next: 'end', conditions: { check: ['gold', '>=', 50] } },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
    })

    it('evaluates and conditions', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasKey', true)
      gameFlags.set('hasMap', true)
      const runner = createDialogueRunner({ gameFlags })
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
                conditions: {
                  and: [
                    { check: ['hasKey', '==', true] },
                    { check: ['hasMap', '==', true] },
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
    })

    it('evaluates or conditions', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasKey', false)
      gameFlags.set('hasLockpick', true)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              {
                text: 'Open',
                next: 'end',
                conditions: {
                  or: [
                    { check: ['hasKey', '==', true] },
                    { check: ['hasLockpick', '==', true] },
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
    })

    it('evaluates not conditions', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('isDead', false)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              {
                text: 'Continue',
                next: 'end',
                conditions: { not: { check: ['isDead', '==', true] } },
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
    })

    it('handles missing flags as undefined', () => {
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
                text: 'Check missing',
                next: 'end',
                conditions: { check: ['missingFlag', '==', true] },
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(0)
    })
  })

  describe('Choice Filtering', () => {
    it('choice with passing condition is available', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasAccess', true)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Enter', next: 'end', conditions: { check: ['hasAccess', '==', true] } },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
    })

    it('choice with failing condition is unavailable', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('hasAccess', false)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Enter', next: 'end', conditions: { check: ['hasAccess', '==', true] } },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(0)
    })

    it('choice without condition is always available', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Always', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices.length).toBe(1)
    })
  })
})

describe('Text Interpolation', () => {
  describe('Flag Interpolation', () => {
    it('replaces {{flagName}} with game flag value', () => {
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

    it('replaces {{game:flagName}} with game flag value', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('game:score', 1000)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Score: {{game:score}}',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('Score: 1000')
    })

    it('replaces {{conv:flagName}} with conversation flag value', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'You said: {{conv:answer}}',
            actions: [{ type: 'set', flag: 'conv:answer', value: 'yes' }],
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toContain('yes')
    })

    it('replaces missing flags with empty string', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Hello {{missingName}}!',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('Hello !')
    })
  })

  describe('Custom Interpolation', () => {
    it('replaces with custom interpolation functions', () => {
      const interpolation = {
        time: () => '12:00',
      }
      const runner = createDialogueRunner({ interpolation })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'The time is {{time}}',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('The time is 12:00')
    })

    it('custom functions receive context', () => {
      const interpolation = {
        nodeText: (ctx: any) => ctx.currentNode.text.includes('Start') ? 'yes' : 'no',
      }
      const runner = createDialogueRunner({ interpolation })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start: {{nodeText}}',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toContain('yes')
    })

    it('custom functions can be async', async () => {
      const interpolation = {
        async: async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return 'async-value'
        },
      }
      const runner = createDialogueRunner({ interpolation })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Value: {{async}}',
          },
        },
      }
      const state = await runner.start(dialogue)
      expect(state.currentNode.text).toBe('Value: async-value')
    })
  })

  describe('Speaker Interpolation', () => {
    it('{{speaker}} replaced with current speaker name', () => {
      const speakers = {
        npc: { name: 'Marcus' },
      }
      const runner = createDialogueRunner({ speakers })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'npc',
            text: 'I am {{speaker}}',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('I am Marcus')
    })
  })
})

describe('Speaker System', () => {
  describe('Speaker Resolution', () => {
    it('resolves speaker id to speaker object', () => {
      const onNodeEnter = vi.fn()
      const speakers = {
        npc: { name: 'Marcus', portrait: 'marcus.png' },
      }
      const runner = createDialogueRunner({ speakers, onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'npc',
            text: 'Hello',
          },
        },
      }
      runner.start(dialogue)
      expect(onNodeEnter).toHaveBeenCalled()
      const lastCall = onNodeEnter.mock.calls[0]
      expect(lastCall?.[1]).toEqual({ name: 'Marcus', portrait: 'marcus.png' })
    })

    it('passes speaker to nodeEnter event', () => {
      const onNodeEnter = vi.fn()
      const speakers = {
        npc: { name: 'Test NPC' },
      }
      const runner = createDialogueRunner({ speakers, onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'npc',
            text: 'Hello',
          },
        },
      }
      runner.start(dialogue)
      expect(onNodeEnter).toHaveBeenCalled()
      expect(onNodeEnter.mock.calls[0]?.[1]).toBeDefined()
    })

    it('handles missing speaker gracefully', () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'unknownSpeaker',
            text: 'Hello',
          },
        },
      }
      expect(() => runner.start(dialogue)).not.toThrow()
    })
  })

  describe('Speaker Metadata', () => {
    it('includes name in speaker', () => {
      const onNodeEnter = vi.fn()
      const speakers = {
        npc: { name: 'Marcus' },
      }
      const runner = createDialogueRunner({ speakers, onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'npc',
            text: 'Hello',
          },
        },
      }
      runner.start(dialogue)
      const speaker = onNodeEnter.mock.calls[0]?.[1]
      expect(speaker).toHaveProperty('name', 'Marcus')
    })

    it('includes portrait in speaker', () => {
      const onNodeEnter = vi.fn()
      const speakers = {
        npc: { name: 'Marcus', portrait: 'portrait.png' },
      }
      const runner = createDialogueRunner({ speakers, onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'npc',
            text: 'Hello',
          },
        },
      }
      runner.start(dialogue)
      const speaker = onNodeEnter.mock.calls[0]?.[1]
      expect(speaker).toHaveProperty('portrait', 'portrait.png')
    })

    it('includes color in speaker', () => {
      const onNodeEnter = vi.fn()
      const speakers = {
        npc: { name: 'Marcus', color: '#ff0000' },
      }
      const runner = createDialogueRunner({ speakers, onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'npc',
            text: 'Hello',
          },
        },
      }
      runner.start(dialogue)
      const speaker = onNodeEnter.mock.calls[0]?.[1]
      expect(speaker).toHaveProperty('color', '#ff0000')
    })

    it('includes custom properties', () => {
      const onNodeEnter = vi.fn()
      const speakers = {
        npc: { name: 'Marcus', customProp: 'customValue' },
      }
      const runner = createDialogueRunner({ speakers, onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            speaker: 'npc',
            text: 'Hello',
          },
        },
      }
      runner.start(dialogue)
      const speaker = onNodeEnter.mock.calls[0]?.[1]
      expect(speaker).toHaveProperty('customProp', 'customValue')
    })
  })
})

describe('History & Backtracking', () => {
  describe('runner.getHistory()', () => {
    it('returns empty array before any choices', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const history = runner.getHistory()
      expect(history.length).toBe(0)
    })

    it('records each node visited', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'middle' }],
          },
          middle: {
            text: 'Middle',
            choices: [{ text: 'End', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      runner.choose(0)
      const history = runner.getHistory()
      expect(history.length).toBe(2)
    })

    it('records choice made at each node', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      const history = runner.getHistory()
      expect(history[0]).toHaveProperty('choice')
      expect(history[0]?.choice?.text).toBe('Go')
    })

    it('includes timestamp for each entry', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      const history = runner.getHistory()
      expect(history[0]).toHaveProperty('timestamp')
      expect(typeof history[0]?.timestamp).toBe('number')
    })
  })

  describe('runner.back()', () => {
    it('returns to previous node', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      runner.back()
      const node = runner.getCurrentNode()
      expect(node?.text).toBe('Start')
    })

    it('removes last history entry', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'middle' }],
          },
          middle: {
            text: 'Middle',
            choices: [{ text: 'End', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      runner.choose(0)
      const lengthBefore = runner.getHistory().length
      runner.back()
      const lengthAfter = runner.getHistory().length
      expect(lengthAfter).toBe(lengthBefore - 1)
    })

    it('does nothing if no history', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: { text: 'Start' },
        },
      }
      runner.start(dialogue)
      expect(() => runner.back()).not.toThrow()
    })

    it('fires nodeEnter for restored node', () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      onNodeEnter.mockClear()
      runner.back()
      expect(onNodeEnter).toHaveBeenCalled()
    })

    it('restores conversation flags to previous state', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:flag1', value: true }],
            choices: [{ text: 'Go', next: 'middle' }],
          },
          middle: {
            text: 'Middle',
            actions: [{ type: 'set', flag: 'conv:flag2', value: true }],
          },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      runner.back()
      const flags = runner.getConversationFlags()
      expect(flags['flag2']).toBeUndefined()
    })
  })

  describe('runner.restart()', () => {
    it('returns to start node', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      const state = runner.restart()
      expect(state.currentNode.text).toBe('Start')
    })

    it('clears history', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      runner.restart()
      const history = runner.getHistory()
      expect(history.length).toBe(0)
    })

    it('clears conversation flags', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:temp', value: true }],
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      runner.restart()
      const flags = runner.getConversationFlags()
      expect(Object.keys(flags).length).toBe(0)
    })

    it('respects preserveConversationFlags option', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:preserved', value: true }],
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      runner.restart({ preserveConversationFlags: true })
      const flags = runner.getConversationFlags()
      expect(flags['preserved']).toBe(true)
    })
  })

  describe('runner.jumpTo()', () => {
    it('jumps to specified node', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
          },
          middle: {
            text: 'Middle',
          },
          end: {
            text: 'End',
          },
        },
      }
      runner.start(dialogue)
      runner.jumpTo('middle')
      const node = runner.getCurrentNode()
      expect(node?.text).toBe('Middle')
    })

    it('adds to history', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
          },
          middle: {
            text: 'Middle',
          },
        },
      }
      runner.start(dialogue)
      runner.jumpTo('middle')
      const history = runner.getHistory()
      expect(history.length).toBeGreaterThan(0)
    })

    it('fires appropriate events', () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
          },
          middle: {
            text: 'Middle',
          },
        },
      }
      runner.start(dialogue)
      onNodeEnter.mockClear()
      runner.jumpTo('middle')
      expect(onNodeEnter).toHaveBeenCalled()
    })

    it('throws ValidationError for invalid node', () => {
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
      expect(() => runner.jumpTo('nonexistent')).toThrow()
    })
  })
})

describe('Events', () => {
  describe('dialogueStart', () => {
    it('fires when dialogue starts', () => {
      const onDialogueStart = vi.fn()
      const runner = createDialogueRunner({ onDialogueStart })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: { start: { text: 'Start' } },
      }
      runner.start(dialogue)
      expect(onDialogueStart).toHaveBeenCalled()
    })

    it('includes dialogue definition', () => {
      const onDialogueStart = vi.fn()
      const runner = createDialogueRunner({ onDialogueStart })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: { start: { text: 'Start' } },
      }
      runner.start(dialogue)
      expect(onDialogueStart).toHaveBeenCalledWith(dialogue)
    })
  })

  describe('dialogueEnd', () => {
    it('fires when dialogue ends', () => {
      const onDialogueEnd = vi.fn()
      const runner = createDialogueRunner({ onDialogueEnd })
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
      expect(onDialogueEnd).toHaveBeenCalled()
    })

    it('includes dialogue id', () => {
      const onDialogueEnd = vi.fn()
      const runner = createDialogueRunner({ onDialogueEnd })
      const dialogue: DialogueDefinition = {
        id: 'test-id',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            isEnd: true,
          },
        },
      }
      runner.start(dialogue)
      expect(onDialogueEnd).toHaveBeenCalledWith('test-id', expect.anything())
    })

    it('includes end node', () => {
      const onDialogueEnd = vi.fn()
      const runner = createDialogueRunner({ onDialogueEnd })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'End Node',
            isEnd: true,
          },
        },
      }
      runner.start(dialogue)
      const endNode = onDialogueEnd.mock.calls[0]?.[1]
      expect(endNode).toHaveProperty('text', 'End Node')
    })
  })

  describe('nodeEnter', () => {
    it('fires when entering node', () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: { start: { text: 'Start' } },
      }
      runner.start(dialogue)
      expect(onNodeEnter).toHaveBeenCalled()
    })

    it('includes node definition', () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: { start: { text: 'Start' } },
      }
      runner.start(dialogue)
      expect(onNodeEnter).toHaveBeenCalledWith(expect.objectContaining({ text: 'Start' }), undefined)
    })

    it('includes speaker if present', () => {
      const onNodeEnter = vi.fn()
      const speakers = { npc: { name: 'NPC' } }
      const runner = createDialogueRunner({ onNodeEnter, speakers })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: { start: { text: 'Start', speaker: 'npc' } },
      }
      runner.start(dialogue)
      expect(onNodeEnter).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ name: 'NPC' }))
    })
  })

  describe('nodeExit', () => {
    it('fires when leaving node', () => {
      const onNodeExit = vi.fn()
      const runner = createDialogueRunner({ onNodeExit })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      expect(onNodeExit).toHaveBeenCalled()
    })

    it('includes node definition', () => {
      const onNodeExit = vi.fn()
      const runner = createDialogueRunner({ onNodeExit })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      expect(onNodeExit).toHaveBeenCalledWith(expect.objectContaining({ text: 'Start' }))
    })
  })

  describe('choiceSelected', () => {
    it('fires when choice made', () => {
      const onChoiceSelected = vi.fn()
      const runner = createDialogueRunner({ onChoiceSelected })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      expect(onChoiceSelected).toHaveBeenCalled()
    })

    it('includes choice definition', () => {
      const onChoiceSelected = vi.fn()
      const runner = createDialogueRunner({ onChoiceSelected })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      expect(onChoiceSelected).toHaveBeenCalledWith(expect.objectContaining({ text: 'Go' }), 0)
    })

    it('includes choice index', () => {
      const onChoiceSelected = vi.fn()
      const runner = createDialogueRunner({ onChoiceSelected })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      expect(onChoiceSelected).toHaveBeenCalledWith(expect.anything(), 0)
    })
  })

  describe('actionExecuted', () => {
    it('fires when action runs', () => {
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

    it('includes action definition', () => {
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
      expect(onActionExecuted).toHaveBeenCalledWith(expect.objectContaining({ type: 'set' }), expect.anything())
    })

    it('includes action result', () => {
      const onActionExecuted = vi.fn()
      const handler = () => 'result'
      const runner = createDialogueRunner({
        actionHandlers: { test: handler },
        onActionExecuted,
      })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'callback', name: 'test' }],
          },
        },
      }
      runner.start(dialogue)
      expect(onActionExecuted).toHaveBeenCalledWith(expect.anything(), 'result')
    })
  })

  describe('conditionEvaluated', () => {
    it('fires when condition checked', () => {
      const onConditionEvaluated = vi.fn()
      const gameFlags = createMockFlagStore()
      gameFlags.set('test', true)
      const runner = createDialogueRunner({ gameFlags, onConditionEvaluated })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Go', next: 'end', conditions: { check: ['test', '==', true] } },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.getChoices()
      expect(onConditionEvaluated).toHaveBeenCalled()
    })

    it('includes condition', () => {
      const onConditionEvaluated = vi.fn()
      const gameFlags = createMockFlagStore()
      gameFlags.set('test', true)
      const runner = createDialogueRunner({ gameFlags, onConditionEvaluated })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Go', next: 'end', conditions: { check: ['test', '==', true] } },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.getChoices()
      expect(onConditionEvaluated).toHaveBeenCalledWith(expect.objectContaining({ check: expect.anything() }), expect.anything())
    })

    it('includes result boolean', () => {
      const onConditionEvaluated = vi.fn()
      const gameFlags = createMockFlagStore()
      gameFlags.set('test', true)
      const runner = createDialogueRunner({ gameFlags, onConditionEvaluated })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Go', next: 'end', conditions: { check: ['test', '==', true] } },
            ],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.getChoices()
      expect(onConditionEvaluated).toHaveBeenCalledWith(expect.anything(), true)
    })
  })
})

describe('Serialization', () => {
  describe('runner.serialize()', () => {
    it('returns JSON-compatible object', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: { start: { text: 'Start' } },
      }
      runner.start(dialogue)
      const state = runner.serialize()
      expect(() => JSON.stringify(state)).not.toThrow()
    })

    it('includes dialogue id', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test-id',
        startNode: 'start',
        nodes: { start: { text: 'Start' } },
      }
      runner.start(dialogue)
      const state = runner.serialize()
      expect(state.dialogueId).toBe('test-id')
    })

    it('includes current node', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: { start: { text: 'Start' } },
      }
      runner.start(dialogue)
      const state = runner.serialize()
      expect(state.currentNodeId).toBe('start')
    })

    it('includes history', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      const state = runner.serialize()
      expect(state.history).toBeDefined()
      expect(Array.isArray(state.history)).toBe(true)
    })

    it('includes conversation flags', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:test', value: true }],
          },
        },
      }
      runner.start(dialogue)
      const state = runner.serialize()
      expect(state.conversationFlags).toBeDefined()
      expect(state.conversationFlags['test']).toBe(true)
    })
  })

  describe('runner.deserialize()', () => {
    it('restores current node', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: { text: 'Start' },
          middle: { text: 'Middle' },
        },
      }
      runner.start(dialogue)
      runner.jumpTo('middle')
      const state = runner.serialize()

      const runner2 = createDialogueRunner()
      runner2.start(dialogue)
      runner2.deserialize(state)
      const node = runner2.getCurrentNode()
      expect(node?.text).toBe('Middle')
    })

    it('restores history', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      const state = runner.serialize()

      const runner2 = createDialogueRunner()
      runner2.start(dialogue)
      runner2.deserialize(state)
      const history = runner2.getHistory()
      expect(history.length).toBeGreaterThan(0)
    })

    it('restores conversation flags', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:restored', value: true }],
          },
        },
      }
      runner.start(dialogue)
      const state = runner.serialize()

      const runner2 = createDialogueRunner()
      runner2.start(dialogue)
      runner2.deserialize(state)
      const flags = runner2.getConversationFlags()
      expect(flags['restored']).toBe(true)
    })

    it('fires nodeEnter for restored node', () => {
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: { text: 'Start' },
          middle: { text: 'Middle' },
        },
      }
      runner.start(dialogue)
      runner.jumpTo('middle')
      const state = runner.serialize()

      const runner2 = createDialogueRunner({ onNodeEnter })
      runner2.start(dialogue)
      onNodeEnter.mockClear()
      runner2.deserialize(state)
      expect(onNodeEnter).toHaveBeenCalled()
    })
  })

  describe('Round-Trip', () => {
    it('serialize then deserialize restores state', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'middle' }],
          },
          middle: {
            text: 'Middle',
            actions: [{ type: 'set', flag: 'conv:test', value: true }],
          },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      const state = runner.serialize()

      const runner2 = createDialogueRunner()
      runner2.start(dialogue)
      runner2.deserialize(state)

      const node = runner2.getCurrentNode()
      const flags = runner2.getConversationFlags()
      expect(node?.text).toBe('Middle')
      expect(flags['test']).toBe(true)
    })

    it('choices work after restore', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'middle' }],
          },
          middle: {
            text: 'Middle',
            choices: [{ text: 'End', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      const state = runner.serialize()

      const runner2 = createDialogueRunner()
      runner2.start(dialogue)
      runner2.deserialize(state)
      const choices = runner2.getChoices()
      expect(choices.length).toBe(1)
      expect(() => runner2.choose(0)).not.toThrow()
    })

    it('conditions work after restore', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('test', true)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              { text: 'Go', next: 'middle', conditions: { check: ['test', '==', true] } },
            ],
          },
          middle: { text: 'Middle' },
        },
      }
      runner.start(dialogue)
      const state = runner.serialize()

      const runner2 = createDialogueRunner({ gameFlags })
      runner2.start(dialogue)
      runner2.deserialize(state)
      const choices = runner2.getChoices()
      expect(choices.length).toBe(1)
    })
  })
})

describe('i18n Integration', () => {
  describe('I18nAdapter Interface', () => {
    it('calls t() for text lookup', () => {
      const i18n = {
        t: vi.fn((key: string) => `translated_${key}`),
        hasKey: () => true,
      }
      const runner = createDialogueRunner({ i18n })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'greeting.hello',
          },
        },
      }
      runner.start(dialogue)
      expect(i18n.t).toHaveBeenCalledWith('greeting.hello', expect.anything())
    })

    it('calls hasKey() to check key existence', () => {
      const i18n = {
        t: (key: string) => key,
        hasKey: vi.fn(() => false),
      }
      const runner = createDialogueRunner({ i18n })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'literal text',
          },
        },
      }
      runner.start(dialogue)
      expect(i18n.hasKey).toHaveBeenCalled()
    })

    it('passes params to t()', () => {
      const i18n = {
        t: vi.fn((key: string, params?: any) => `${key}_${params?.name}`),
        hasKey: () => true,
      }
      const gameFlags = createMockFlagStore()
      gameFlags.set('name', 'Alice')
      const runner = createDialogueRunner({ i18n, gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'greeting.hello',
          },
        },
      }
      runner.start(dialogue)
      expect(i18n.t).toHaveBeenCalledWith(expect.anything(), expect.anything())
    })
  })

  describe('Text Resolution', () => {
    it('uses i18n when key exists', () => {
      const i18n = {
        t: (key: string) => 'Translated Text',
        hasKey: (key: string) => key === 'greeting.hello',
      }
      const runner = createDialogueRunner({ i18n })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'greeting.hello',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('Translated Text')
    })

    it('uses literal text when key doesn't exist', () => {
      const i18n = {
        t: (key: string) => key,
        hasKey: () => false,
      }
      const runner = createDialogueRunner({ i18n })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'This is literal text',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('This is literal text')
    })

    it('works without i18n adapter', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Plain text',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('Plain text')
    })
  })

  describe('createI18nAdapter', () => {
    it('wraps @motioneffector/i18n instance', () => {
      const mockI18n = {
        t: (key: string) => 'translated',
        hasKey: (key: string) => true,
      }
      const adapter = createI18nAdapter(mockI18n as any)
      expect(adapter.t).toBeDefined()
      expect(adapter.hasKey).toBeDefined()
    })

    it('t() delegates to i18n.t()', () => {
      const mockI18n = {
        t: vi.fn((key: string) => 'translated'),
        hasKey: () => true,
      }
      const adapter = createI18nAdapter(mockI18n as any)
      adapter.t('test.key')
      expect(mockI18n.t).toHaveBeenCalledWith('test.key', undefined)
    })

    it('hasKey() delegates to i18n.hasKey()', () => {
      const mockI18n = {
        t: (key: string) => key,
        hasKey: vi.fn((key: string) => true),
      }
      const adapter = createI18nAdapter(mockI18n as any)
      adapter.hasKey('test.key')
      expect(mockI18n.hasKey).toHaveBeenCalledWith('test.key')
    })
  })
})

describe('Validation', () => {
  describe('validateDialogue()', () => {
    it('returns valid: true for valid dialogue', () => {
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      const result = validateDialogue(dialogue)
      expect(result.valid).toBe(true)
    })

    it('returns valid: false for missing startNode', () => {
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'nonexistent',
        nodes: {
          start: { text: 'Start' },
        },
      }
      const result = validateDialogue(dialogue)
      expect(result.valid).toBe(false)
    })

    it('returns valid: false for missing nodes', () => {
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {},
      }
      const result = validateDialogue(dialogue)
      expect(result.valid).toBe(false)
    })

    it('returns valid: false for invalid choice targets', () => {
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [{ text: 'Go', next: 'nonexistent' }],
          },
        },
      }
      const result = validateDialogue(dialogue)
      expect(result.valid).toBe(false)
    })

    it('returns valid: false for orphan nodes', () => {
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: { text: 'Start', isEnd: true },
          orphan: { text: 'Orphan' },
        },
      }
      const result = validateDialogue(dialogue)
      expect(result.valid).toBe(false)
    })

    it('includes error descriptions', () => {
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'nonexistent',
        nodes: {
          start: { text: 'Start' },
        },
      }
      const result = validateDialogue(dialogue)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(typeof result.errors[0]).toBe('string')
    })
  })
})

describe('Edge Cases', () => {
  describe('Circular Dialogues', () => {
    it('handles node pointing to itself', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'loop',
        nodes: {
          loop: {
            text: 'Loop',
            choices: [{ text: 'Again', next: 'loop' }],
          },
        },
      }
      runner.start(dialogue)
      expect(() => runner.choose(0)).not.toThrow()
      expect(() => runner.choose(0)).not.toThrow()
    })

    it('handles A → B → A cycles', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'a',
        nodes: {
          a: {
            text: 'A',
            choices: [{ text: 'To B', next: 'b' }],
          },
          b: {
            text: 'B',
            choices: [{ text: 'To A', next: 'a' }],
          },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      runner.choose(0)
      expect(runner.getCurrentNode()?.text).toBe('A')
    })

    it('history tracks repeated visits', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'loop',
        nodes: {
          loop: {
            text: 'Loop',
            choices: [{ text: 'Again', next: 'loop' }],
          },
        },
      }
      runner.start(dialogue)
      runner.choose(0)
      runner.choose(0)
      const history = runner.getHistory()
      expect(history.length).toBe(2)
    })
  })

  describe('Empty Dialogue', () => {
    it('handles dialogue with only start node', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: { text: 'Only node' },
        },
      }
      expect(() => runner.start(dialogue)).not.toThrow()
    })

    it('ends immediately if start has no choices', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: { text: 'End immediately' },
        },
      }
      runner.start(dialogue)
      expect(runner.isEnded()).toBe(true)
    })
  })

  describe('Large Dialogues', () => {
    it('handles 1000 nodes', () => {
      const nodes: Record<string, any> = {}
      for (let i = 0; i < 1000; i++) {
        nodes[`node${i}`] = {
          text: `Node ${i}`,
          choices: i < 999 ? [{ text: 'Next', next: `node${i + 1}` }] : [],
        }
      }
      const dialogue: DialogueDefinition = {
        id: 'large',
        startNode: 'node0',
        nodes,
      }
      const runner = createDialogueRunner()
      expect(() => runner.start(dialogue)).not.toThrow()
    })

    it('handles deep nesting', () => {
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              {
                text: 'Complex',
                next: 'end',
                conditions: {
                  and: [
                    {
                      or: [
                        { check: ['a', '==', true] },
                        { check: ['b', '==', true] },
                      ],
                    },
                    {
                      not: {
                        and: [
                          { check: ['c', '==', false] },
                          { check: ['d', '==', false] },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
          end: { text: 'End' },
        },
      }
      const runner = createDialogueRunner()
      expect(() => runner.start(dialogue)).not.toThrow()
    })

    it('history doesn't explode memory', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'loop',
        nodes: {
          loop: {
            text: 'Loop',
            choices: [{ text: 'Again', next: 'loop' }],
          },
        },
      }
      runner.start(dialogue)
      for (let i = 0; i < 100; i++) {
        runner.choose(0)
      }
      const history = runner.getHistory()
      expect(history.length).toBeLessThan(200) // Some reasonable limit
    })
  })

  describe('Unicode', () => {
    it('handles unicode in text', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'こんにちは世界 🌍',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('こんにちは世界 🌍')
    })

    it('handles unicode in flag names', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'flag_日本語', value: true }],
          },
        },
      }
      expect(() => runner.start(dialogue)).not.toThrow()
    })

    it('handles emoji in choices', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Choose',
            choices: [{ text: '👍 Yes', next: 'end' }],
          },
          end: { text: 'End' },
        },
      }
      runner.start(dialogue)
      const choices = runner.getChoices()
      expect(choices[0]?.text).toBe('👍 Yes')
    })
  })
})

describe('Auto-Advance', () => {
  describe('Node with next Property', () => {
    it('auto-advances when node has next but no choices', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            next: 'middle',
          },
          middle: {
            text: 'Middle',
          },
        },
      }
      const state = runner.start(dialogue)
      expect(state.currentNode.text).toBe('Middle')
    })

    it('fires nodeExit and nodeEnter', () => {
      const onNodeExit = vi.fn()
      const onNodeEnter = vi.fn()
      const runner = createDialogueRunner({ onNodeExit, onNodeEnter })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            next: 'middle',
          },
          middle: {
            text: 'Middle',
          },
        },
      }
      runner.start(dialogue)
      expect(onNodeExit).toHaveBeenCalled()
      expect(onNodeEnter).toHaveBeenCalledTimes(2)
    })

    it('executes actions before advancing', () => {
      const gameFlags = createMockFlagStore()
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'started', value: true }],
            next: 'middle',
          },
          middle: {
            text: 'Middle',
          },
        },
      }
      runner.start(dialogue)
      expect(gameFlags.get('started')).toBe(true)
    })
  })
})

describe('Conversation Flag Utilities', () => {
  describe('runner.getConversationFlags()', () => {
    it('returns current conversation flags', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:test', value: 'value' }],
          },
        },
      }
      runner.start(dialogue)
      const flags = runner.getConversationFlags()
      expect(flags['test']).toBe('value')
    })

    it('returns empty object before start', () => {
      const runner = createDialogueRunner()
      const flags = runner.getConversationFlags()
      expect(Object.keys(flags).length).toBe(0)
    })
  })

  describe('runner.clearConversationFlags()', () => {
    it('clears all conversation flags', () => {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [
              { type: 'set', flag: 'conv:flag1', value: true },
              { type: 'set', flag: 'conv:flag2', value: true },
            ],
          },
        },
      }
      runner.start(dialogue)
      runner.clearConversationFlags()
      const flags = runner.getConversationFlags()
      expect(Object.keys(flags).length).toBe(0)
    })

    it('does not affect game flags', () => {
      const gameFlags = createMockFlagStore()
      gameFlags.set('persistent', true)
      const runner = createDialogueRunner({ gameFlags })
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [{ type: 'set', flag: 'conv:temp', value: true }],
          },
        },
      }
      runner.start(dialogue)
      runner.clearConversationFlags()
      expect(gameFlags.get('persistent')).toBe(true)
    })
  })
})
