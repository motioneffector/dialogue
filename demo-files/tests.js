// ============================================
// DEMO INTEGRITY TESTS
// These tests verify the demo itself is correctly structured.
// They are IDENTICAL across all @motioneffector demos.
// Do not modify, skip, or weaken these tests.
// ============================================

function registerIntegrityTests() {
  // ─────────────────────────────────────────────
  // STRUCTURAL INTEGRITY
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library is loaded', () => {
    if (typeof window.Library === 'undefined') {
      throw new Error('window.Library is undefined - library not loaded')
    }
  })

  testRunner.registerTest('[Integrity] Library has exports', () => {
    const exports = Object.keys(window.Library)
    if (exports.length === 0) {
      throw new Error('window.Library has no exports')
    }
  })

  testRunner.registerTest('[Integrity] Test runner exists', () => {
    const runner = document.getElementById('test-runner')
    if (!runner) {
      throw new Error('No element with id="test-runner"')
    }
  })

  testRunner.registerTest('[Integrity] Test runner is first section after header', () => {
    const main = document.querySelector('main')
    if (!main) {
      throw new Error('No <main> element found')
    }
    const firstSection = main.querySelector('section')
    if (!firstSection || firstSection.id !== 'test-runner') {
      throw new Error('Test runner must be the first <section> inside <main>')
    }
  })

  testRunner.registerTest('[Integrity] Run All Tests button exists with correct format', () => {
    const btn = document.getElementById('run-all-tests')
    if (!btn) {
      throw new Error('No button with id="run-all-tests"')
    }
    const text = btn.textContent.trim()
    if (!text.includes('Run All Tests')) {
      throw new Error(`Button text must include "Run All Tests", got: "${text}"`)
    }
    const icon = btn.querySelector('.btn-icon')
    if (!icon || !icon.textContent.includes('▶')) {
      throw new Error('Button must have play icon (▶) in .btn-icon element')
    }
  })

  testRunner.registerTest('[Integrity] At least one exhibit exists', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    if (exhibits.length === 0) {
      throw new Error('No elements with class="exhibit"')
    }
  })

  testRunner.registerTest('[Integrity] All exhibits have unique IDs', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    const ids = new Set()
    exhibits.forEach(ex => {
      if (!ex.id) {
        throw new Error('Exhibit missing id attribute')
      }
      if (ids.has(ex.id)) {
        throw new Error(`Duplicate exhibit id: ${ex.id}`)
      }
      ids.add(ex.id)
    })
  })

  testRunner.registerTest('[Integrity] All exhibits registered for walkthrough', () => {
    const exhibitElements = document.querySelectorAll('.exhibit')
    const registeredCount = testRunner.exhibits.length
    if (registeredCount < exhibitElements.length) {
      throw new Error(
        `Only ${registeredCount} exhibits registered for walkthrough, ` +
        `but ${exhibitElements.length} .exhibit elements exist`
      )
    }
  })

  testRunner.registerTest('[Integrity] CSS loaded from demo-files/', () => {
    const links = document.querySelectorAll('link[rel="stylesheet"]')
    const hasExternal = Array.from(links).some(link =>
      link.href.includes('demo-files/')
    )
    if (!hasExternal) {
      throw new Error('No stylesheet loaded from demo-files/ directory')
    }
  })

  testRunner.registerTest('[Integrity] No inline style tags', () => {
    const styles = document.querySelectorAll('style')
    if (styles.length > 0) {
      throw new Error(`Found ${styles.length} inline <style> tags - extract to demo-files/demo.css`)
    }
  })

  testRunner.registerTest('[Integrity] No inline onclick handlers', () => {
    const withOnclick = document.querySelectorAll('[onclick]')
    if (withOnclick.length > 0) {
      throw new Error(`Found ${withOnclick.length} elements with onclick - use addEventListener`)
    }
  })

  // ─────────────────────────────────────────────
  // NO AUTO-PLAY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Output areas are empty on load', () => {
    const outputs = document.querySelectorAll('.exhibit-output, .output, [data-output]')
    outputs.forEach(output => {
      const hasPlaceholder = output.dataset.placeholder ||
        output.classList.contains('placeholder') ||
        output.querySelector('.placeholder')

      const text = output.textContent.trim()
      const children = output.children.length

      if ((text.length > 50 || children > 1) && !hasPlaceholder) {
        throw new Error(
          `Output area appears pre-populated: "${text.substring(0, 50)}..." - ` +
          `outputs must be empty until user interaction`
        )
      }
    })
  })

  testRunner.registerTest('[Integrity] No setTimeout calls on module load', () => {
    if (window.__suspiciousTimersDetected) {
      throw new Error(
        'Detected setTimeout/setInterval during page load - ' +
        'demos must not auto-run'
      )
    }
  })

  // ─────────────────────────────────────────────
  // REAL LIBRARY VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Library functions are callable', () => {
    const lib = window.Library
    const exports = Object.keys(lib)

    const hasFunctions = exports.some(key => typeof lib[key] === 'function')
    if (!hasFunctions) {
      throw new Error('Library exports no callable functions')
    }
  })

  testRunner.registerTest('[Integrity] No mock implementations detected', () => {
    const suspicious = [
      'mockParse', 'mockValidate', 'fakeParse', 'fakeValidate',
      'stubParse', 'stubValidate', 'testParse', 'testValidate'
    ]
    suspicious.forEach(name => {
      if (typeof window[name] === 'function') {
        throw new Error(`Detected mock function: window.${name} - use real library`)
      }
    })
  })

  // ─────────────────────────────────────────────
  // VISUAL FEEDBACK VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] CSS includes animation definitions', () => {
    const sheets = document.styleSheets
    let hasAnimations = false

    try {
      for (const sheet of sheets) {
        if (!sheet.href || sheet.href.includes('demo-files/')) {
          const rules = sheet.cssRules || sheet.rules
          for (const rule of rules) {
            if (rule.type === CSSRule.KEYFRAMES_RULE ||
                (rule.style && (
                  rule.style.animation ||
                  rule.style.transition ||
                  rule.style.animationName
                ))) {
              hasAnimations = true
              break
            }
          }
        }
        if (hasAnimations) break
      }
    } catch (e) {
      hasAnimations = true
    }

    if (!hasAnimations) {
      throw new Error('No CSS animations or transitions found - visual feedback required')
    }
  })

  testRunner.registerTest('[Integrity] Interactive elements have hover states', () => {
    const buttons = document.querySelectorAll('button, .btn')
    if (buttons.length === 0) return

    const btn = buttons[0]
    const styles = window.getComputedStyle(btn)
    if (styles.cursor !== 'pointer') {
      throw new Error('Buttons should have cursor: pointer')
    }
  })

  // ─────────────────────────────────────────────
  // WALKTHROUGH REGISTRATION VERIFICATION
  // ─────────────────────────────────────────────

  testRunner.registerTest('[Integrity] Walkthrough demonstrations are async functions', () => {
    testRunner.exhibits.forEach(exhibit => {
      if (typeof exhibit.demonstrate !== 'function') {
        throw new Error(`Exhibit "${exhibit.name}" has no demonstrate function`)
      }
      const result = exhibit.demonstrate.toString()
      if (!result.includes('async') && !result.includes('Promise')) {
        console.warn(`Exhibit "${exhibit.name}" demonstrate() may not be async`)
      }
    })
  })

  testRunner.registerTest('[Integrity] Each exhibit has required elements', () => {
    const exhibits = document.querySelectorAll('.exhibit')
    exhibits.forEach(exhibit => {
      const title = exhibit.querySelector('.exhibit-title, h2, h3')
      if (!title) {
        throw new Error(`Exhibit ${exhibit.id} missing title element`)
      }

      const interactive = exhibit.querySelector(
        '.exhibit-interactive, .exhibit-content, [data-interactive]'
      )
      if (!interactive) {
        throw new Error(`Exhibit ${exhibit.id} missing interactive area`)
      }
    })
  })
}

// ============================================
// LIBRARY-SPECIFIC TESTS
// ============================================

const { createDialogueRunner, validateDialogue, ValidationError } = window.Library

// Create a simple FlagStore implementation (not exported by library)
function createFlagStore() {
  const store = new Map()
  return {
    get: (key) => store.get(key),
    set: (key, value) => {
      store.set(key, value)
      return this
    },
    has: (key) => store.has(key),
    delete: (key) => {
      store.delete(key)
      return this
    },
    clear: () => {
      store.clear()
      return this
    },
    increment: (key, amount = 1) => {
      const current = store.get(key) || 0
      const newValue = current + amount
      store.set(key, newValue)
      return newValue
    },
    decrement: (key, amount = 1) => {
      const current = store.get(key) || 0
      const newValue = Math.max(0, current - amount)
      store.set(key, newValue)
      return newValue
    },
    check: () => true,
    all: () => Object.fromEntries(store),
    keys: () => Array.from(store.keys())
  }
}

// Call integrity tests first
registerIntegrityTests()

testRunner.registerTest('creates runner with minimal options', () => {
  const runner = createDialogueRunner()
  if (!runner) throw new Error('Expected runner to be created')
  if (typeof runner.start !== 'function') throw new Error('Expected start method')
})

testRunner.registerTest('creates runner with gameFlags store', () => {
  const gameFlags = createFlagStore()
  const runner = createDialogueRunner({ gameFlags })
  if (!runner) throw new Error('Expected runner to be created')
})

testRunner.registerTest('returns object with all expected methods', () => {
  const runner = createDialogueRunner()
  const methods = ['start', 'getChoices', 'choose', 'isEnded', 'getCurrentNode', 'getHistory', 'back', 'restart', 'jumpTo', 'serialize', 'deserialize', 'getConversationFlags', 'clearConversationFlags', 'on']
  for (const method of methods) {
    if (typeof runner[method] !== 'function') throw new Error(`Expected ${method} method`)
  }
})

testRunner.registerTest('starts dialogue at startNode', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Hello!' } } }
  const state = await runner.start(dialogue)
  if (state.currentNode.text !== 'Hello!') throw new Error('Expected correct start node')
})

testRunner.registerTest('returns current node state', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Test', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'End' } } }
  const state = await runner.start(dialogue)
  if (!state.currentNode) throw new Error('Expected currentNode')
  if (!state.availableChoices) throw new Error('Expected availableChoices')
  if (typeof state.isEnded !== 'boolean') throw new Error('Expected isEnded boolean')
})

testRunner.registerTest('returns available choices for current node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Test', choices: [{ text: 'A', next: 'end' }, { text: 'B', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  const choices = runner.getChoices()
  if (choices.length !== 2) throw new Error('Expected 2 choices')
})

testRunner.registerTest('excludes choices where conditions fail', async () => {
  const gameFlags = createFlagStore()
  gameFlags.set('hasKey', false)
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Door', choices: [{ text: 'Open', next: 'end', conditions: { check: ['hasKey', '==', true] } }, { text: 'Leave', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  const choices = runner.getChoices()
  if (choices.length !== 1) throw new Error('Expected 1 available choice')
  if (choices[0].text !== 'Leave') throw new Error('Expected Leave choice')
})

testRunner.registerTest('advances to next node by choice index', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'The End' } } }
  await runner.start(dialogue)
  const state = await runner.choose(0)
  if (state.currentNode.text !== 'The End') throw new Error('Expected to advance to end node')
})

testRunner.registerTest('throws ValidationError for invalid index', async () => {
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

testRunner.registerTest('returns true at terminal node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'End', next: 'end' }] }, end: { text: 'End', isEnd: true } } }
  await runner.start(dialogue)
  await runner.choose(0)
  if (!runner.isEnded()) throw new Error('Expected isEnded to be true')
})

testRunner.registerTest('records each node visited in history', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'middle' }] }, middle: { text: 'Middle', choices: [{ text: 'End', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  await runner.choose(0)
  await runner.choose(0)
  const history = runner.getHistory()
  if (history.length !== 2) throw new Error('Expected 2 history entries')
})

testRunner.registerTest('back() returns to previous node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  await runner.choose(0)
  await runner.back()
  const node = runner.getCurrentNode()
  if (node.text !== 'Start') throw new Error('Expected to return to Start')
})

testRunner.registerTest('restart() returns to start node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  await runner.choose(0)
  const state = await runner.restart()
  if (state.currentNode.text !== 'Start') throw new Error('Expected to restart at Start')
})

testRunner.registerTest('jumpTo() jumps to specified node', async () => {
  const runner = createDialogueRunner()
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start' }, middle: { text: 'Middle' }, end: { text: 'End' } } }
  await runner.start(dialogue)
  await runner.jumpTo('middle')
  const node = runner.getCurrentNode()
  if (node.text !== 'Middle') throw new Error('Expected to jump to Middle')
})

testRunner.registerTest('serialize() returns JSON-compatible object', async () => {
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

testRunner.registerTest('deserialize() restores current node', async () => {
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

testRunner.registerTest('interpolates text variables', async () => {
  const gameFlags = createFlagStore()
  gameFlags.set('playerName', 'Hero')
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Hello {{playerName}}!' } } }
  const state = await runner.start(dialogue)
  if (state.currentNode.text !== 'Hello Hero!') throw new Error('Expected interpolated text')
})

testRunner.registerTest('executes node actions on entry', async () => {
  const gameFlags = createFlagStore()
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', actions: [{ type: 'set', flag: 'visited', value: true }] } } }
  await runner.start(dialogue)
  if (gameFlags.get('visited') !== true) throw new Error('Expected action to execute')
})

testRunner.registerTest('executes choice actions on selection', async () => {
  const gameFlags = createFlagStore()
  const runner = createDialogueRunner({ gameFlags })
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end', actions: [{ type: 'set', flag: 'chosen', value: true }] }] }, end: { text: 'End' } } }
  await runner.start(dialogue)
  await runner.choose(0)
  if (gameFlags.get('chosen') !== true) throw new Error('Expected choice action to execute')
})

testRunner.registerTest('conversation flags cleared on new dialogue', async () => {
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

testRunner.registerTest('validateDialogue returns valid for good dialogue', () => {
  const dialogue = { id: 'test', startNode: 'start', nodes: { start: { text: 'Start', choices: [{ text: 'Go', next: 'end' }] }, end: { text: 'End' } } }
  const result = validateDialogue(dialogue)
  if (!result.valid) throw new Error('Expected valid dialogue')
})

testRunner.registerTest('validateDialogue returns invalid for missing startNode', () => {
  const dialogue = { id: 'test', startNode: 'nonexistent', nodes: { start: { text: 'Start' } } }
  const result = validateDialogue(dialogue)
  if (result.valid) throw new Error('Expected invalid dialogue')
})

// ============================================
// EXHIBIT REGISTRATIONS FOR WALKTHROUGH
// ============================================

testRunner.registerExhibit(
  'The Conversation',
  document.getElementById('exhibit-1'),
  async () => {
    // Restart dialogue first
    await window.restartDialogue()
    await testRunner.delay(800)

    // Click through choices
    const clickChoice = async (index) => {
      const choicesEl = document.getElementById('choices-list')
      const buttons = choicesEl.querySelectorAll('.choice-btn:not(:disabled)')
      if (buttons[index]) {
        buttons[index].click()
        await testRunner.delay(800)
      }
    }

    await clickChoice(0) // "What kind of job?"
    await clickChoice(0) // "What's the pay?"
    await clickChoice(0) // Try to negotiate or accept
  }
)

testRunner.registerExhibit(
  'The Condition Laboratory',
  document.getElementById('exhibit-2'),
  async () => {
    // Animate gold slider
    const goldSlider = document.getElementById('lab-gold')
    const goldValue = document.getElementById('lab-gold-value')
    for (let v = 120; v <= 220; v += 25) {
      goldSlider.value = v
      goldValue.textContent = v
      window.updateLabInput('gold', v)
      await testRunner.delay(150)
    }
    await testRunner.delay(400)

    // Toggle hasKey switch
    window.toggleLabSwitch('hasKey')
    await testRunner.delay(600)
  }
)

testRunner.registerExhibit(
  'The Time Machine',
  document.getElementById('exhibit-3'),
  async () => {
    // Scrub through timeline
    for (let i = 0; i <= 3; i++) {
      window.tmJumpTo(i)
      await testRunner.delay(600)
    }
    await testRunner.delay(400)

    // Go back
    window.tmBack()
    await testRunner.delay(600)
  }
)
