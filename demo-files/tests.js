// ============================================
// TEST RUNNER
// ============================================

import { createDialogueRunner, createInternalFlagStore, validateDialogue, ValidationError } from './library.js'

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export const testRunner = {
  tests: [],
  results: [],
  running: false,

  register(name, fn) {
    this.tests.push({ name, fn })
  },

  async run(runVisualDemo) {
    if (this.running) return
    this.running = true
    this.results = []

    const output = document.getElementById('test-output')
    const progressFill = document.getElementById('progress-fill')
    const progressText = document.getElementById('progress-text')
    const summary = document.getElementById('test-summary')
    const passedCount = document.getElementById('passed-count')
    const failedCount = document.getElementById('failed-count')
    const skippedCount = document.getElementById('skipped-count')
    const runBtn = document.getElementById('run-tests')

    runBtn.disabled = true
    output.innerHTML = ''
    summary.classList.add('hidden')
    progressFill.style.width = '0%'
    progressFill.className = 'test-progress-fill'

    // Run visual demo of all exhibits first
    if (runVisualDemo) {
      progressText.textContent = 'Running visual demo of all exhibits...'
      await runVisualDemo()
    }

    let passed = 0
    let failed = 0

    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i]
      const progress = ((i + 1) / this.tests.length) * 100

      progressFill.style.width = `${progress}%`
      progressText.textContent = `Running: ${test.name}`

      try {
        await test.fn()
        passed++
        this.results.push({ name: test.name, passed: true })
        output.innerHTML += `
          <div class="test-item">
            <span class="test-icon pass">✓</span>
            <span class="test-name">${escapeHtml(test.name)}</span>
          </div>
        `
      } catch (e) {
        failed++
        this.results.push({ name: test.name, passed: false, error: e.message })
        output.innerHTML += `
          <div class="test-item">
            <span class="test-icon fail">✗</span>
            <div>
              <div class="test-name">${escapeHtml(test.name)}</div>
              <div class="test-error">${escapeHtml(e.message)}</div>
            </div>
          </div>
        `
      }

      output.scrollTop = output.scrollHeight
      await new Promise(r => setTimeout(r, 20))
    }

    progressFill.classList.add(failed === 0 ? 'success' : 'failure')
    progressText.textContent = `Complete: ${passed}/${this.tests.length} passed`

    passedCount.textContent = passed
    failedCount.textContent = failed
    skippedCount.textContent = 0
    summary.classList.remove('hidden')

    runBtn.disabled = false
    this.running = false
  }
}

// Register tests
testRunner.register('creates runner with minimal options', () => {
  const runner = createDialogueRunner()
  if (!runner) throw new Error('Expected runner to be created')
  if (typeof runner.start !== 'function') throw new Error('Expected start method')
})

testRunner.register('creates runner with gameFlags store', () => {
  const gameFlags = createInternalFlagStore()
  const runner = createDialogueRunner({ gameFlags })
  if (!runner) throw new Error('Expected runner to be created')
})

testRunner.register('returns object with all expected methods', () => {
  const runner = createDialogueRunner()
  const methods = ['start', 'getChoices', 'choose', 'isEnded', 'getCurrentNode', 'getHistory', 'back', 'restart', 'jumpTo', 'serialize', 'deserialize', 'getConversationFlags', 'clearConversationFlags', 'on']
  for (const method of methods) {
    if (typeof runner[method] !== 'function') throw new Error(`Expected ${method} method`)
  }
})

testRunner.register('starts dialogue at startNode', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Hello!' } } }
  const state = await runner.start(dialogue)
  if (state.currentNode.text !== 'Hello!') throw new Error('Expected correct start node')
})

testRunner.register('returns current node state', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Test', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'End' } } }
  const state = await runner.start(dialogue)
  if (!state.currentNode) throw new Error('Expected currentNode')
  if (!state.availableChoices) throw new Error('Expected availableChoices')
  if (typeof state.isEnded !== 'boolean') throw new Error('Expected isEnded boolean')
})

testRunner.register('returns available choices for current node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Test', choices: [{ text: 'A', next: 'end' }, { text: 'B', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  const choices = runner.getChoices()
  if (choices.length !== 2) throw new Error('Expected 2 choices')
})

testRunner.register('excludes choices where conditions fail', async () => {
  const gameFlags = createInternalFlagStore()
  gameFlags.set('hasKey', false)
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Door', choices: [{ text: 'Open', next: 'end', conditions: { check: ['hasKey', '==', true] } }, { text: 'Leave', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  const choices = runner.getChoices()
  if (choices.length !== 1) throw new Error('Expected 1 available choice')
  if (choices[0].text !== 'Leave') throw new Error('Expected Leave choice')
})

testRunner.register('advances to next node by choice index', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'The End' } } }
  await runner.start(dialogue)
  const state = await runner.choose(0)
  if (state.currentNode.text !== 'The End') throw new Error('Expected to advance to end node')
})

testRunner.register('throws ValidationError for invalid index', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  try {
    await runner.choose(99)
    throw new Error('Expected ValidationError')
  } catch (e) {
    if (e.name !== 'ValidationError') throw new Error('Expected ValidationError')
  }
})

testRunner.register('returns true at terminal node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'End', next: 'end' }] }, end: { text: 'End', isEnd: true } } }
  await runner.start(dialogue)
  await runner.choose(0)
  if (!runner.isEnded()) throw new Error('Expected isEnded to be true')
})

testRunner.register('records each node visited in history', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'middle' }] }, middle: { text: 'Middle', choices: [{ text: 'End', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  await runner.choose(0)
  await runner.choose(0)
  const history = runner.getHistory()
  if (history.length !== 2) throw new Error('Expected 2 history entries')
})

testRunner.register('back() returns to previous node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  await runner.choose(0)
  await runner.back()
  const node = runner.getCurrentNode()
  if (node.text !== 'Start') throw new Error('Expected to return to Start')
})

testRunner.register('restart() returns to start node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  await runner.choose(0)
  const state = await runner.restart()
  if (state.currentNode.text !== 'Start') throw new Error('Expected to restart at Start')
})

testRunner.register('jumpTo() jumps to specified node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start' }, middle: { text: 'Middle' }, end: { text: 'End' } } }
  await runner.start(dialogue)
  await runner.jumpTo('middle')
  const node = runner.getCurrentNode()
  if (node.text !== 'Middle') throw new Error('Expected to jump to Middle')
})

testRunner.register('serialize() returns JSON-compatible object', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start' } } }
  await runner.start(dialogue)
  const state = runner.serialize()
  try {
    JSON.stringify(state)
  } catch (e) {
    throw new Error('Expected JSON-compatible object')
  }
})

testRunner.register('deserialize() restores current node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start' }, middle: { text: 'Middle' } } }
  await runner.start(dialogue)
  await runner.jumpTo('middle')
  const state = runner.serialize()

  const runner2 = createDialogueRunner()
  await runner2.start(dialogue)
  await runner2.deserialize(state)
  const node = runner2.getCurrentNode()
  if (node.text !== 'Middle') throw new Error('Expected to restore to Middle')
})

testRunner.register('interpolates text variables', async () => {
  const gameFlags = createInternalFlagStore()
  gameFlags.set('playerName', 'Hero')
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Hello {{playerName}}!' } } }
  const state = await runner.start(dialogue)
  if (state.currentNode.text !== 'Hello Hero!') throw new Error('Expected interpolated text')
})

testRunner.register('executes node actions on entry', async () => {
  const gameFlags = createInternalFlagStore()
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', actions: [{ type: 'set', flag: 'visited', value: true }] } } }
  await runner.start(dialogue)
  if (gameFlags.get('visited') !== true) throw new Error('Expected action to execute')
})

testRunner.register('executes choice actions on selection', async () => {
  const gameFlags = createInternalFlagStore()
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end', actions: [{ type: 'set', flag: 'chosen', value: true }] }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  await runner.choose(0)
  if (gameFlags.get('chosen') !== true) throw new Error('Expected choice action to execute')
})

testRunner.register('conversation flags cleared on new dialogue', async () => {
  const runner = createDialogueRunner()
  const dialogue1 = { id: 'test1', startNode: 'start', nodes: { start: { text: 'Start', actions: [{ type: 'set', flag: 'conv:temp', value: true }] } } }
  await runner.start(dialogue1)
  const flags1 = runner.getConversationFlags()
  if (flags1['temp'] !== true) throw new Error('Expected conv flag to be set')

  const dialogue2 = { id: 'test2', startNode: 'start', nodes: { start: { text: 'Start' } } }
  await runner.start(dialogue2)
  const flags2 = runner.getConversationFlags()
  if (flags2['temp'] !== undefined) throw new Error('Expected conv flag to be cleared')
})

testRunner.register('evaluates AND conditions', async () => {
  const gameFlags = createInternalFlagStore()
  gameFlags.set('hasKey', true)
  gameFlags.set('hasMap', true)
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end', conditions: { and: [{ check: ['hasKey', '==', true] }, { check: ['hasMap', '==', true] }] } }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  const choices = runner.getChoices()
  if (choices.length !== 1) throw new Error('Expected AND condition to pass')
})

testRunner.register('evaluates OR conditions', async () => {
  const gameFlags = createInternalFlagStore()
  gameFlags.set('hasKey', false)
  gameFlags.set('hasLockpick', true)
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end', conditions: { or: [{ check: ['hasKey', '==', true] }, { check: ['hasLockpick', '==', true] }] } }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  const choices = runner.getChoices()
  if (choices.length !== 1) throw new Error('Expected OR condition to pass')
})

testRunner.register('evaluates NOT conditions', async () => {
  const gameFlags = createInternalFlagStore()
  gameFlags.set('isDead', false)
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end', conditions: { not: { check: ['isDead', '==', true] } } }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  const choices = runner.getChoices()
  if (choices.length !== 1) throw new Error('Expected NOT condition to pass')
})

testRunner.register('validateDialogue returns valid for good dialogue', () => {
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'End' } } }
  const result = validateDialogue(dialogue)
  if (!result.valid) throw new Error('Expected valid dialogue')
})

testRunner.register('validateDialogue returns invalid for missing startNode', () => {
  const dialogue = { id: 'test', startNode: 'nonexistent', nodes: { start: { text: 'Start' } } }
  const result = validateDialogue(dialogue)
  if (result.valid) throw new Error('Expected invalid dialogue')
})

testRunner.register('validateDialogue returns invalid for orphan nodes', () => {
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', isEnd: true }, orphan: { text: 'Orphan' } } }
  const result = validateDialogue(dialogue)
  if (result.valid) throw new Error('Expected invalid dialogue with orphan nodes')
})

testRunner.register('handles unicode in text', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'こんにちは世界 🌍' } } }
  const state = await runner.start(dialogue)
  if (state.currentNode.text !== 'こんにちは世界 🌍') throw new Error('Expected unicode text')
})

testRunner.register('handles circular dialogue references', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'loop', nodes: { loop: { text: 'Loop', choices: [{ text: 'Again', next: 'loop' }] } } }
  await runner.start(dialogue)
  await runner.choose(0)
  await runner.choose(0)
  const node = runner.getCurrentNode()
  if (node.text !== 'Loop') throw new Error('Expected to handle circular references')
})

testRunner.register('rejects __proto__ as node ID', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: '__proto__', nodes: { '__proto__': { text: 'Malicious' } } }
  try {
    await runner.start(dialogue)
    throw new Error('Expected ValidationError')
  } catch (e) {
    if (e.name !== 'ValidationError') throw new Error('Expected ValidationError for __proto__')
  }
})

testRunner.register('disabled choices excluded by default', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Disabled', next: 'end', disabled: true }, { text: 'Enabled', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  const choices = runner.getChoices()
  if (choices.length !== 1) throw new Error('Expected disabled choice to be excluded')
  if (choices[0].text !== 'Enabled') throw new Error('Expected only enabled choice')
})

testRunner.register('includeUnavailable shows all choices with availability', async () => {
  const gameFlags = createInternalFlagStore()
  gameFlags.set('hasKey', false)
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Door', choices: [{ text: 'Open', next: 'end', conditions: { check: ['hasKey', '==', true] } }, { text: 'Leave', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  const choices = runner.getChoices({ includeUnavailable: true })
  if (choices.length !== 2) throw new Error('Expected 2 choices with includeUnavailable')
  if (choices[0].available !== false) throw new Error('Expected first choice to be unavailable')
})

testRunner.register('auto-advances when node has next but no choices', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', next: 'middle' }, middle: { text: 'Middle' } } }
  const state = await runner.start(dialogue)
  if (state.currentNode.text !== 'Middle') throw new Error('Expected auto-advance to Middle')
})

testRunner.register('increment action increases flag value', async () => {
  const gameFlags = createInternalFlagStore()
  gameFlags.set('count', 5)
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', actions: [{ type: 'increment', flag: 'count', value: 3 }] } } }
  await runner.start(dialogue)
  if (gameFlags.get('count') !== 8) throw new Error('Expected count to be 8')
})

testRunner.register('decrement action decreases flag value', async () => {
  const gameFlags = createInternalFlagStore()
  gameFlags.set('count', 10)
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', actions: [{ type: 'decrement', flag: 'count', value: 3 }] } } }
  await runner.start(dialogue)
  if (gameFlags.get('count') !== 7) throw new Error('Expected count to be 7')
})

testRunner.register('clear action removes flag', async () => {
  const gameFlags = createInternalFlagStore()
  gameFlags.set('temp', true)
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', actions: [{ type: 'clear', flag: 'temp' }] } } }
  await runner.start(dialogue)
  if (gameFlags.get('temp') !== undefined) throw new Error('Expected temp flag to be cleared')
})
