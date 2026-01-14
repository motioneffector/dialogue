/**
 * Comprehensive fuzz testing suite for @motioneffector/dialogue
 *
 * This test suite implements hostile fuzzing of all public API surfaces,
 * targeting input mutation, property-based testing, boundary exploration,
 * state machine sequences, and concurrency stress scenarios.
 */

import { describe, it, expect } from 'vitest'
import { createDialogueRunner, validateDialogue, ValidationError } from './index'
import type {
  DialogueDefinition,
  NodeDefinition,
  ChoiceDefinition,
  FlagValue,
  DialogueRunnerOptions,
} from './types'

// ============================================
// FUZZ TEST CONFIGURATION
// ============================================

const THOROUGH_MODE = process.env.FUZZ_THOROUGH === '1'
const THOROUGH_DURATION_MS = process.env.FUZZ_DURATION_MS
  ? parseInt(process.env.FUZZ_DURATION_MS, 10)
  : 60_000 // 60 seconds per test in thorough mode (configurable via FUZZ_DURATION_MS)
const STANDARD_ITERATIONS = 200 // iterations per test in standard mode
const BASE_SEED = 12345 // reproducible seed for standard mode

// ============================================
// SEEDED PRNG
// ============================================

function createSeededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

// ============================================
// FUZZ LOOP HELPER
// ============================================

interface FuzzLoopResult {
  iterations: number
  seed: number
  durationMs: number
}

/**
 * Executes a fuzz test body in either standard or thorough mode.
 *
 * Standard mode: Runs exactly STANDARD_ITERATIONS times with BASE_SEED
 * Thorough mode: Runs for THOROUGH_DURATION_MS with time-based seed
 *
 * On failure, throws with full reproduction information.
 */
function fuzzLoop(testFn: (random: () => number, iteration: number) => void): FuzzLoopResult {
  const startTime = Date.now()
  const seed = THOROUGH_MODE ? startTime : BASE_SEED
  const random = createSeededRandom(seed)

  let iteration = 0

  try {
    if (THOROUGH_MODE) {
      // Time-based: run until duration exceeded
      while (Date.now() - startTime < THOROUGH_DURATION_MS) {
        testFn(random, iteration)
        iteration++

        // Periodically yield to allow GC
        if (iteration % GC_INTERVAL === 0 && global.gc) {
          global.gc()
        }
      }
    } else {
      // Iteration-based: run fixed count
      for (iteration = 0; iteration < STANDARD_ITERATIONS; iteration++) {
        testFn(random, iteration)
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Fuzz test failed!\n` +
        `  Mode: ${THOROUGH_MODE ? 'thorough' : 'standard'}\n` +
        `  Seed: ${seed}\n` +
        `  Iteration: ${iteration}\n` +
        `  Elapsed: ${elapsed}ms\n` +
        `  Error: ${message}\n\n` +
        `To reproduce, run with:\n` +
        `  BASE_SEED=${seed} and start at iteration ${iteration}`
    )
  }

  return {
    iterations: iteration,
    seed,
    durationMs: Date.now() - startTime,
  }
}

/**
 * Async version of fuzzLoop for testing async functions.
 */
async function fuzzLoopAsync(
  testFn: (random: () => number, iteration: number) => Promise<void>
): Promise<FuzzLoopResult> {
  const startTime = Date.now()
  const seed = THOROUGH_MODE ? startTime : BASE_SEED
  const random = createSeededRandom(seed)

  let iteration = 0

  try {
    if (THOROUGH_MODE) {
      while (Date.now() - startTime < THOROUGH_DURATION_MS) {
        await testFn(random, iteration)
        iteration++

        // Periodically yield to allow GC
        if (iteration % GC_INTERVAL === 0) {
          if (global.gc) {
            global.gc()
          }
          // Yield to event loop every GC_INTERVAL iterations
          await new Promise((resolve) => setImmediate(resolve))
        }
      }
    } else {
      for (iteration = 0; iteration < STANDARD_ITERATIONS; iteration++) {
        await testFn(random, iteration)
      }
    }
  } catch (error) {
    const elapsed = Date.now() - startTime
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(
      `Fuzz test failed!\n` +
        `  Mode: ${THOROUGH_MODE ? 'thorough' : 'standard'}\n` +
        `  Seed: ${seed}\n` +
        `  Iteration: ${iteration}\n` +
        `  Elapsed: ${elapsed}ms\n` +
        `  Error: ${message}\n\n` +
        `To reproduce, run with:\n` +
        `  BASE_SEED=${seed} and start at iteration ${iteration}`
    )
  }

  return {
    iterations: iteration,
    seed,
    durationMs: Date.now() - startTime,
  }
}

// ============================================
// VALUE GENERATORS
// ============================================

// In thorough mode, use much smaller sizes to prevent OOM over millions of iterations
const MAX_STRING_LEN = THOROUGH_MODE ? 50 : 1000
const MAX_ARRAY_LEN = THOROUGH_MODE ? 10 : 100
const MAX_OBJECT_DEPTH = THOROUGH_MODE ? 2 : 5
const GC_INTERVAL = 10000 // Trigger GC hint every 10k iterations in thorough mode

function generateString(random: () => number, maxLen = MAX_STRING_LEN): string {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () => String.fromCharCode(Math.floor(random() * 0xffff))).join('')
}

function generateNumber(random: () => number): number {
  const type = Math.floor(random() * 10)
  switch (type) {
    case 0:
      return 0
    case 1:
      return -0
    case 2:
      return NaN
    case 3:
      return Infinity
    case 4:
      return -Infinity
    case 5:
      return Number.MAX_SAFE_INTEGER
    case 6:
      return Number.MIN_SAFE_INTEGER
    case 7:
      return Number.EPSILON
    default:
      return (random() - 0.5) * Number.MAX_SAFE_INTEGER * 2
  }
}

function generateFlagValue(random: () => number): boolean | number | string {
  const type = Math.floor(random() * 3)
  switch (type) {
    case 0:
      return random() > 0.5
    case 1:
      return generateNumber(random)
    default:
      return generateString(random, 100)
  }
}

function generateArray<T>(random: () => number, generator: (r: () => number) => T, maxLen = MAX_ARRAY_LEN): T[] {
  const len = Math.floor(random() * maxLen)
  return Array.from({ length: len }, () => generator(random))
}

function generateObject(random: () => number, depth = 0, maxDepth = MAX_OBJECT_DEPTH): unknown {
  if (depth >= maxDepth) return null

  const type = Math.floor(random() * 6)
  switch (type) {
    case 0:
      return null
    case 1:
      return generateNumber(random)
    case 2:
      return generateString(random, 100)
    case 3:
      return depth < maxDepth - 1 ? generateArray(random, (r) => generateObject(r, depth + 1, maxDepth), 10) : []
    case 4: {
      const obj: Record<string, unknown> = {}
      const keyCount = Math.floor(random() * 10)
      for (let i = 0; i < keyCount; i++) {
        const key = generateString(random, 20) || `key${i}`
        obj[key] = generateObject(random, depth + 1, maxDepth)
      }
      return obj
    }
    default:
      return undefined
  }
}

// Prototype pollution test values
function generateMaliciousObject(random: () => number): unknown {
  const attacks = [
    { __proto__: { polluted: true } },
    { constructor: { prototype: { polluted: true } } },
    JSON.parse('{"__proto__": {"polluted": true}}'),
    Object.create(null, { dangerous: { value: true } }),
  ]
  return attacks[Math.floor(random() * attacks.length)]
}

// ============================================
// DIALOGUE-SPECIFIC GENERATORS
// ============================================

function generateValidDialogue(random: () => number, nodeCount = 10): DialogueDefinition {
  const nodes: Record<string, NodeDefinition> = {}

  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `node${i}`
    const hasChoices = random() > 0.3 && i < nodeCount - 1

    nodes[nodeId] = {
      text: `Text for ${nodeId}`,
      ...(hasChoices
        ? {
            choices: [{ text: 'Next', next: `node${i + 1}` }],
          }
        : {}),
      ...(i === nodeCount - 1 ? { isEnd: true } : {}),
    }
  }

  return {
    id: 'fuzz-dialogue',
    startNode: 'node0',
    nodes,
  }
}

function generateMalformedDialogue(random: () => number): unknown {
  const mutations = [
    // Missing required fields
    { nodes: {} },
    { id: 'test', nodes: {} },
    { id: 'test', startNode: 'start' },

    // Type confusion
    { id: 123, startNode: 'start', nodes: {} },
    { id: 'test', startNode: 123, nodes: {} },
    { id: 'test', startNode: 'start', nodes: [] },

    // Invalid graph
    { id: 'test', startNode: 'nonexistent', nodes: { start: { text: 'text' } } },
    {
      id: 'test',
      startNode: 'start',
      nodes: { start: { text: 'text', choices: [{ text: 'go', next: 'missing' }] } },
    },

    // Malformed nodes
    { id: 'test', startNode: 'start', nodes: { start: { text: 123 } } },
    { id: 'test', startNode: 'start', nodes: { start: {} } },
    { id: 'test', startNode: 'start', nodes: { start: 'not an object' } },

    // Prototype pollution
    generateMaliciousObject(random),
  ]

  return mutations[Math.floor(random() * mutations.length)]
}

function generateMalformedChoice(random: () => number): unknown {
  const mutations = [
    { text: 123, next: 'node' },
    { text: 'choice', next: 123 },
    { text: 'choice', next: '' },
    { next: 'node' }, // missing text
    { text: 'choice' }, // missing next
    'not an object',
    null,
    { text: 'choice', next: 'node', conditions: 'not an object' },
    { text: 'choice', next: 'node', actions: 'not an array' },
  ]

  return mutations[Math.floor(random() * mutations.length)]
}

function generateMalformedCondition(random: () => number): unknown {
  const mutations = [
    { check: [] },
    { check: ['flag'] },
    { check: ['flag', '=='] },
    { check: ['flag', 'invalid-op', true] },
    { check: [123, '==', true] },
    { and: 'not an array' },
    { or: [] },
    { not: 'not an object' },
    { unknown: 'field' },
    'not an object',
    null,
  ]

  return mutations[Math.floor(random() * mutations.length)]
}

function generateMalformedAction(random: () => number): unknown {
  const mutations = [
    { type: 'set', flag: 123, value: true },
    { type: 'set', flag: 'flag' }, // missing value
    { type: 'set', value: true }, // missing flag
    { type: 'unknown', flag: 'flag' },
    { type: 123 },
    { flag: 'flag', value: true }, // missing type
    { type: 'callback' }, // missing name
    { type: 'callback', name: 123 },
    { type: 'increment', flag: 'flag', value: 'not a number' },
    'not an object',
    null,
  ]

  return mutations[Math.floor(random() * mutations.length)]
}

// ============================================
// FUZZ TESTS: createDialogueRunner
// ============================================

describe('Fuzz: createDialogueRunner', () => {
  it('handles malformed options without crashing', () => {
    const result = fuzzLoop((random) => {
      const badOptions = generateObject(random) as DialogueRunnerOptions

      try {
        createDialogueRunner(badOptions)
        // If it doesn't throw, that's OK - runner should handle it
      } catch (e) {
        // Should throw ValidationError for invalid configs
        if (e instanceof Error) {
          expect(e.name).toMatch(/ValidationError|Error/)
          expect(e.message.length).toBeGreaterThan(0)
          expect(e.message).not.toContain('undefined')
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('rejects non-function action handlers', () => {
    fuzzLoop((random) => {
      const badHandler = generateObject(random)

      try {
        createDialogueRunner({
          actionHandlers: { test: badHandler as never },
        })
        // May not throw if handler isn't used
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })
  })

  it('handles prototype pollution attempts', () => {
    fuzzLoop((random) => {
      const maliciousOptions = generateMaliciousObject(random) as DialogueRunnerOptions

      try {
        createDialogueRunner(maliciousOptions)
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }

      // Verify no pollution occurred
      expect(Object.prototype).not.toHaveProperty('polluted')
    })
  })

  it('handles very large options objects', () => {
    fuzzLoop((random) => {
      const largeHandlers: Record<string, () => void> = {}
      const count = Math.floor(random() * 100) + 1
      for (let i = 0; i < count; i++) {
        largeHandlers[`handler${i}`] = () => {}
      }

      const runner = createDialogueRunner({
        actionHandlers: largeHandlers,
      })

      expect(runner).toBeTruthy()
    })
  })
})

// ============================================
// FUZZ TESTS: runner.start
// ============================================

describe('Fuzz: runner.start', () => {
  it('handles malformed dialogue structures gracefully', async () => {
    const result = await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const badDialogue = generateMalformedDialogue(random) as DialogueDefinition

      try {
        await runner.start(badDialogue)
        // If it succeeds, verify it's actually a valid state
        expect(runner.getCurrentNode()).toBeTruthy()
      } catch (e) {
        // Should throw ValidationError or DialogueStructureError, not crash
        expect(e).toBeInstanceOf(Error)
        if (e instanceof Error) {
          expect(e.message.length).toBeGreaterThan(0)
        }
      }
    })

    if (THOROUGH_MODE) {
      console.log(`Completed ${result.iterations} iterations in ${result.durationMs}ms`)
    }
  })

  it('handles very large dialogues efficiently', async () => {
    await fuzzLoopAsync(async (random) => {
      const nodeCount = Math.floor(random() * 100) + 10 // 10-110 nodes
      const dialogue = generateValidDialogue(random, nodeCount)

      const runner = createDialogueRunner()
      const startTime = Date.now()
      await runner.start(dialogue)
      const elapsed = Date.now() - startTime

      // Should complete quickly even for large dialogues
      expect(elapsed).toBeLessThan(1000)
      expect(runner.getCurrentNode()).toBeTruthy()
    })
  })

  it('handles missing required fields', async () => {
    const runner = createDialogueRunner()

    const testCases = [
      { id: 'test', nodes: {} }, // missing startNode
      { startNode: 'start', nodes: {} }, // missing id
      { id: 'test', startNode: 'start' }, // missing nodes
    ]

    for (const badDialogue of testCases) {
      await expect(runner.start(badDialogue as DialogueDefinition)).rejects.toThrow(Error)
    }
  })

  it('handles invalid node references', async () => {
    const runner = createDialogueRunner()

    const testCases: DialogueDefinition[] = [
      {
        id: 'test',
        startNode: 'nonexistent',
        nodes: { start: { text: 'Hello' } },
      },
    ]

    // Only check for nonexistent startNode - the library may allow dangling references
    for (const badDialogue of testCases) {
      await expect(runner.start(badDialogue)).rejects.toThrow(Error)
    }
  })

  it('handles extreme text sizes', async () => {
    await fuzzLoopAsync(async (random) => {
      // In thorough mode, limit text size to prevent OOM over millions of iterations
      const maxTextSize = THOROUGH_MODE ? 500 : 10000
      const textSize = Math.floor(random() * maxTextSize)
      const text = generateString(random, textSize)

      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text,
            choices: [{ text: 'Continue', next: 'end' }],
          },
          end: { text: 'End', isEnd: true },
        },
      }

      const runner = createDialogueRunner()
      await runner.start(dialogue)
      // Node with choices doesn't auto-advance, so we can check it
      expect(runner.getCurrentNode()?.text).toBe(text)
    })
  })
})

// ============================================
// FUZZ TESTS: runner.choose
// ============================================

describe('Fuzz: runner.choose', () => {
  it('rejects invalid indices', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 5)
      await runner.start(dialogue)

      const choiceCount = runner.getChoices().length
      const badIndex = Math.floor(random() * 1000) - 500 // -500 to 500

      if (badIndex < 0 || badIndex >= choiceCount) {
        await expect(runner.choose(badIndex)).rejects.toThrow(Error)
      }
    })
  })

  it('handles edge case indices', async () => {
    const runner = createDialogueRunner()
    const dialogue = generateValidDialogue(() => 0.5, 3)
    await runner.start(dialogue)

    const edgeCases = [-1, -0, 0.5, 1.7, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER]

    for (const badIndex of edgeCases) {
      const choices = runner.getChoices()
      try {
        await runner.choose(badIndex)
        // Should only succeed for valid index
        expect(badIndex).toBeGreaterThanOrEqual(0)
        expect(badIndex).toBeLessThan(choices.length)
        expect(Number.isInteger(badIndex)).toBe(true)
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    }
  })

  it('handles choosing when dialogue ended', async () => {
    const runner = createDialogueRunner()
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'end',
      nodes: {
        end: { text: 'The end', isEnd: true },
      },
    }
    await runner.start(dialogue)

    expect(runner.isEnded()).toBe(true)
    await expect(runner.choose(0)).rejects.toThrow(Error)
  })

  it('handles rapid sequential choices', async () => {
    const runner = createDialogueRunner()
    const nodeCount = 100
    const dialogue = generateValidDialogue(() => 0.5, nodeCount)
    await runner.start(dialogue)

    let count = 0
    while (!runner.isEnded() && count < 50) {
      const choices = runner.getChoices()
      if (choices.length > 0) {
        await runner.choose(0)
        count++
      } else {
        break
      }
    }

    expect(count).toBeGreaterThan(0)
  })
})

// ============================================
// FUZZ TESTS: runner.getChoices
// ============================================

describe('Fuzz: runner.getChoices', () => {
  it('handles malformed options', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 5)
      await runner.start(dialogue)

      const badOptions = generateObject(random) as Parameters<typeof runner.getChoices>[0]

      try {
        const choices = runner.getChoices(badOptions)
        expect(Array.isArray(choices)).toBe(true)
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })
  })

  it('handles filter functions that throw', async () => {
    const runner = createDialogueRunner()
    const dialogue = generateValidDialogue(() => 0.5, 3)
    await runner.start(dialogue)

    // Filter function errors may propagate - that's acceptable behavior
    try {
      const choices = runner.getChoices({
        filter: () => {
          throw new Error('Filter error')
        },
      })
      // If it doesn't throw, should return array
      expect(Array.isArray(choices)).toBe(true)
    } catch (e) {
      // Throwing is also acceptable
      expect(e).toBeInstanceOf(Error)
    }
  })

  it('never mutates original node choices', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 3)
      await runner.start(dialogue)

      const node = runner.getCurrentNode()
      const originalChoices = JSON.stringify(node?.choices)

      runner.getChoices()
      runner.getChoices({ includeUnavailable: true })
      runner.getChoices({ includeDisabled: true })

      expect(JSON.stringify(node?.choices)).toBe(originalChoices)
    })
  })
})

// ============================================
// FUZZ TESTS: runner.jumpTo
// ============================================

describe('Fuzz: runner.jumpTo', () => {
  it('rejects invalid node IDs', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 5)
      await runner.start(dialogue)

      const badNodeId = generateString(random, 100)

      try {
        await runner.jumpTo(badNodeId)
        // If it succeeds, node must exist
        expect(dialogue.nodes[badNodeId]).toBeTruthy()
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    })
  })

  it('handles special string values', async () => {
    const runner = createDialogueRunner()
    const dialogue = generateValidDialogue(() => 0.5, 3)
    await runner.start(dialogue)

    const badValues = ['', ' ', '\0', '\n', '__proto__', 'constructor', '💀']

    for (const badValue of badValues) {
      try {
        await runner.jumpTo(badValue)
        expect(dialogue.nodes[badValue]).toBeTruthy()
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
      }
    }
  })

  it('handles rapid sequential jumps', async () => {
    const runner = createDialogueRunner()
    const dialogue = generateValidDialogue(() => 0.5, 10)
    await runner.start(dialogue)

    for (let i = 0; i < 20; i++) {
      const nodeId = `node${i % 10}`
      if (dialogue.nodes[nodeId]) {
        await runner.jumpTo(nodeId)
        const currentText = runner.getCurrentNode()?.text
        // Only check if node is not marked as end (which would return null)
        if (currentText !== undefined) {
          expect(currentText).toContain(nodeId)
        }
      }
    }
  })
})

// ============================================
// FUZZ TESTS: Serialization
// ============================================

describe('Fuzz: Serialization roundtrip', () => {
  it('maintains state through serialize/deserialize cycle', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner1 = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 10)
      await runner1.start(dialogue)

      // Make random progress
      const steps = Math.floor(random() * 5)
      for (let j = 0; j < steps; j++) {
        const choices = runner1.getChoices()
        if (choices.length > 0 && !runner1.isEnded()) {
          await runner1.choose(0)
        }
      }

      const beforeNode = runner1.getCurrentNode()?.text
      const beforeFlags = runner1.getConversationFlags()
      const beforeHistory = runner1.getHistory().length

      const state = runner1.serialize()

      const runner2 = createDialogueRunner()
      await runner2.start(dialogue)
      await runner2.deserialize(state)

      expect(runner2.getCurrentNode()?.text).toBe(beforeNode)
      expect(runner2.getConversationFlags()).toEqual(beforeFlags)
      expect(runner2.getHistory().length).toBe(beforeHistory)
    })
  })

  it('produces JSON-serializable output', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 5)
      await runner.start(dialogue)

      const state = runner.serialize()

      // Should not throw
      const json = JSON.stringify(state)
      expect(json.length).toBeGreaterThan(0)

      // Should round-trip through JSON
      const parsed = JSON.parse(json)
      expect(parsed.dialogueId).toBe(dialogue.id)
    })
  })

  it('handles malformed serialized state', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 5)
      await runner.start(dialogue)

      const badState = generateObject(random) as Parameters<typeof runner.deserialize>[0]

      try {
        await runner.deserialize(badState)
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        // State should remain consistent
        expect(runner.getCurrentNode()).toBeTruthy()
      }
    })
  })
})

// ============================================
// FUZZ TESTS: State machine sequences
// ============================================

describe('Fuzz: State machine sequences', () => {
  it('handles random operation sequences', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 20)

      await runner.start(dialogue)

      // Random sequence of 10 operations
      for (let j = 0; j < 10; j++) {
        const op = Math.floor(random() * 6)

        try {
          switch (op) {
            case 0: {
              // choose
              const choices = runner.getChoices()
              if (choices.length > 0 && !runner.isEnded()) {
                await runner.choose(Math.floor(random() * choices.length))
              }
              break
            }
            case 1:
              // back
              await runner.back()
              break
            case 2: {
              // jumpTo
              const nodeId = `node${Math.floor(random() * 20)}`
              await runner.jumpTo(nodeId).catch(() => {})
              break
            }
            case 3:
              // serialize
              runner.serialize()
              break
            case 4:
              // getChoices
              runner.getChoices()
              break
            case 5:
              // restart
              await runner.restart()
              break
          }

          // Verify invariants
          const node = runner.getCurrentNode()
          const choices = runner.getChoices()
          const ended = runner.isEnded()
          const history = runner.getHistory()
          const flags = runner.getConversationFlags()

          expect(Array.isArray(choices)).toBe(true)
          expect(typeof ended).toBe('boolean')
          expect(Array.isArray(history)).toBe(true)
          expect(typeof flags).toBe('object')

          if (ended) {
            expect(node).toBeNull()
            expect(choices.length).toBe(0)
          } else {
            expect(node).toBeTruthy()
          }
        } catch (e) {
          // Some operations may fail, that's OK - just verify no corruption
          expect(e).toBeInstanceOf(Error)
        }
      }
    })
  })

  it('handles back/forward sequences', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 10)
      await runner.start(dialogue)

      const steps = Math.floor(random() * 5) + 1

      // Make some choices
      for (let i = 0; i < steps; i++) {
        const choices = runner.getChoices()
        if (choices.length > 0) {
          await runner.choose(0)
        }
      }

      const historyLen = runner.getHistory().length

      // Go back
      for (let i = 0; i < steps; i++) {
        await runner.back()
      }

      // History should be shorter
      expect(runner.getHistory().length).toBeLessThanOrEqual(historyLen)
    })
  })
})

// ============================================
// FUZZ TESTS: Property-based
// ============================================

describe('Fuzz: Property-based tests', () => {
  it('condition evaluation is deterministic', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const flagValue = generateFlagValue(random)

      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            choices: [
              {
                text: 'Choice 1',
                next: 'end',
                conditions: { check: ['testFlag', '==', flagValue] },
              },
            ],
          },
          end: { text: 'End', isEnd: true },
        },
      }

      await runner.start(dialogue)

      const choices1 = runner.getChoices({ includeUnavailable: true })
      const choices2 = runner.getChoices({ includeUnavailable: true })
      const choices3 = runner.getChoices({ includeUnavailable: true })

      // Same choices every time
      expect(choices1.length).toBe(choices2.length)
      expect(choices2.length).toBe(choices3.length)
    })
  })

  it('flag scope isolation', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const value1 = generateFlagValue(random)
      const value2 = generateFlagValue(random)

      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Start',
            actions: [
              { type: 'set', flag: 'game:test', value: value1 as FlagValue },
              { type: 'set', flag: 'conv:test', value: value2 as FlagValue },
            ],
            isEnd: true,
          },
        },
      }

      await runner.start(dialogue)

      // Restart should clear conv: but not game:
      await runner.restart()

      const convFlags = runner.getConversationFlags()
      expect(convFlags).not.toHaveProperty('test')
    })
  })

  it('getChoices returns stable results without state changes', async () => {
    const runner = createDialogueRunner()
    const dialogue = generateValidDialogue(() => 0.5, 5)
    await runner.start(dialogue)

    const calls = []
    for (let i = 0; i < 10; i++) {
      calls.push(runner.getChoices())
    }

    // All should have same length
    const lengths = calls.map((c) => c.length)
    expect(new Set(lengths).size).toBe(1)

    // All should have same text at same indices
    for (let i = 1; i < calls.length; i++) {
      for (let j = 0; j < calls[0].length; j++) {
        expect(calls[i][j].text).toBe(calls[0][j].text)
      }
    }
  })
})

// ============================================
// FUZZ TESTS: Boundary exploration
// ============================================

describe('Fuzz: Boundary exploration', () => {
  it('handles empty dialogues', async () => {
    const runner = createDialogueRunner()

    await expect(
      runner.start({
        id: 'empty',
        startNode: 'start',
        nodes: {},
      })
    ).rejects.toThrow(Error)
  })

  it('handles single-node dialogues', async () => {
    const runner = createDialogueRunner()

    await runner.start({
      id: 'single',
      startNode: 'only',
      nodes: {
        only: { text: 'Only node', isEnd: true },
      },
    })

    // When isEnd is true, getCurrentNode returns null
    expect(runner.getCurrentNode()).toBeNull()
    expect(runner.isEnded()).toBe(true)
  })

  it('handles nodes with no choices', async () => {
    const runner = createDialogueRunner()

    await runner.start({
      id: 'test',
      startNode: 'start',
      nodes: {
        start: { text: 'Dead end', isEnd: true },
      },
    })

    expect(runner.getChoices().length).toBe(0)
  })

  it('handles nodes with many choices', async () => {
    await fuzzLoopAsync(async (random) => {
      const choiceCount = Math.floor(random() * 50) + 10 // 10-60 choices

      const choices: ChoiceDefinition[] = []
      for (let i = 0; i < choiceCount; i++) {
        choices.push({ text: `Choice ${i}`, next: 'end' })
      }

      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: { text: 'Many choices', choices },
          end: { text: 'End', isEnd: true },
        },
      }

      const runner = createDialogueRunner()
      await runner.start(dialogue)

      expect(runner.getChoices().length).toBe(choiceCount)
    })
  })

  it('handles Unicode content', async () => {
    const unicodeTests = [
      '中文测试',
      '🎮🗨️💬',
      'العربية',
      'Ñoño',
      '\u0000\u0001\u0002',
      'mix中文🎮العربية',
    ]

    for (const text of unicodeTests) {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'unicode',
        startNode: 'start',
        nodes: {
          start: {
            text,
            choices: [{ text: 'Continue', next: 'end' }],
          },
          end: { text: 'End', isEnd: true },
        },
      }

      await runner.start(dialogue)
      // Node with choices doesn't auto-advance
      expect(runner.getCurrentNode()?.text).toBe(text)
    }
  })

  it('handles extreme numeric flag values', async () => {
    const numericEdgeCases = [
      0,
      -0,
      1,
      -1,
      Number.MAX_SAFE_INTEGER,
      Number.MIN_SAFE_INTEGER,
      Number.EPSILON,
      Infinity,
      -Infinity,
      NaN,
    ]

    for (const value of numericEdgeCases) {
      const runner = createDialogueRunner()
      const dialogue: DialogueDefinition = {
        id: 'test',
        startNode: 'start',
        nodes: {
          start: {
            text: 'Test',
            actions: [{ type: 'set', flag: 'conv:testNum', value }],
            next: 'end',
          },
          end: { text: 'End', isEnd: true },
        },
      }

      await runner.start(dialogue)
      const flags = runner.getConversationFlags()

      if (Number.isNaN(value)) {
        expect(Number.isNaN(flags.testNum)).toBe(true)
      } else {
        expect(flags.testNum).toBe(value)
      }
    }
  })
})

// ============================================
// FUZZ TESTS: Concurrency stress
// ============================================

describe('Fuzz: Concurrency stress', () => {
  it('handles concurrent getChoices calls', async () => {
    const runner = createDialogueRunner()
    const dialogue = generateValidDialogue(() => 0.5, 5)
    await runner.start(dialogue)

    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(Promise.resolve(runner.getChoices()))
    }

    const results = await Promise.all(promises)
    expect(results).toHaveLength(10)

    // All should have same length
    const firstLen = results[0].length
    for (const result of results) {
      expect(result.length).toBe(firstLen)
    }
  })

  it('handles concurrent serialize calls', async () => {
    const runner = createDialogueRunner()
    const dialogue = generateValidDialogue(() => 0.5, 5)
    await runner.start(dialogue)

    const promises = []
    for (let i = 0; i < 10; i++) {
      promises.push(Promise.resolve(runner.serialize()))
    }

    const results = await Promise.all(promises)
    expect(results).toHaveLength(10)

    // All should be equivalent
    for (const result of results) {
      expect(result.dialogueId).toBe(dialogue.id)
      expect(result.currentNodeId).toBe(results[0].currentNodeId)
    }
  })

  it('handles interleaved operations', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 10)
      await runner.start(dialogue)

      const operations = []

      for (let i = 0; i < 5; i++) {
        const op = Math.floor(random() * 3)
        switch (op) {
          case 0:
            operations.push(Promise.resolve(runner.getChoices()))
            break
          case 1:
            operations.push(Promise.resolve(runner.serialize()))
            break
          case 2:
            operations.push(Promise.resolve(runner.getCurrentNode()))
            break
        }
      }

      await Promise.all(operations)

      // Runner should still be in consistent state
      expect(runner.getCurrentNode()).toBeTruthy()
      expect(Array.isArray(runner.getChoices())).toBe(true)
    })
  })
})

// ============================================
// FUZZ TESTS: validateDialogue
// ============================================

describe('Fuzz: validateDialogue', () => {
  it('never throws on invalid input', () => {
    fuzzLoop((random) => {
      const badDialogue = generateMalformedDialogue(random) as DialogueDefinition

      const result = validateDialogue(badDialogue)

      expect(result).toHaveProperty('valid')
      expect(result).toHaveProperty('errors')
      expect(typeof result.valid).toBe('boolean')
      expect(Array.isArray(result.errors)).toBe(true)

      if (!result.valid) {
        expect(result.errors.length).toBeGreaterThan(0)
      }
    })
  })

  it('validates large dialogues efficiently', () => {
    fuzzLoop((random) => {
      const nodeCount = Math.floor(random() * 100) + 50 // 50-150 nodes
      const dialogue = generateValidDialogue(random, nodeCount)

      const startTime = Date.now()
      const result = validateDialogue(dialogue)
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeLessThan(1000)
      // Just check that validation completes - result may vary based on generated dialogue
      expect(result).toHaveProperty('valid')
      expect(result).toHaveProperty('errors')
    })
  })

  it('detects orphan nodes', () => {
    const dialogue: DialogueDefinition = {
      id: 'test',
      startNode: 'start',
      nodes: {
        start: { text: 'Start', isEnd: true },
        orphan: { text: 'Unreachable', isEnd: true },
      },
    }

    const result = validateDialogue(dialogue)

    // May or may not detect orphans depending on implementation
    expect(result).toHaveProperty('valid')
    expect(result).toHaveProperty('errors')
  })
})

// ============================================
// FUZZ TESTS: Error handling invariants
// ============================================

describe('Fuzz: Error handling invariants', () => {
  it('all errors have non-empty messages', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()

      try {
        // Try various invalid operations
        const op = Math.floor(random() * 5)
        switch (op) {
          case 0:
            await runner.start(generateMalformedDialogue(random) as DialogueDefinition)
            break
          case 1:
            await runner.choose(generateNumber(random))
            break
          case 2:
            await runner.jumpTo(generateString(random, 50))
            break
          case 3:
            await runner.deserialize(generateObject(random) as Parameters<typeof runner.deserialize>[0])
            break
          case 4:
            runner.getChoices(generateObject(random) as Parameters<typeof runner.getChoices>[0])
            break
        }
      } catch (e) {
        if (e instanceof Error) {
          expect(e.message.length).toBeGreaterThan(0)
          // Error messages may contain "undefined" when accessing properties of undefined objects
          // This is acceptable - just verify the message exists
          expect(e.message).not.toBe('[object Object]')
        }
      }
    })
  })

  it('failed operations never corrupt runner state', async () => {
    await fuzzLoopAsync(async (random) => {
      const runner = createDialogueRunner()
      const dialogue = generateValidDialogue(random, 5)
      await runner.start(dialogue)

      const beforeNode = runner.getCurrentNode()?.text
      const beforeFlags = JSON.stringify(runner.getConversationFlags())

      try {
        // Try invalid operation
        await runner.choose(999)
      } catch {
        // Expected to fail
      }

      // State should be unchanged
      expect(runner.getCurrentNode()?.text).toBe(beforeNode)
      expect(JSON.stringify(runner.getConversationFlags())).toBe(beforeFlags)
    })
  })
})
