// Import library and expose globally for tests
import * as Library from '../dist/index.js'
window.Library = Library

const { createDialogueRunner } = Library

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

// ============================================
// EXHIBIT 1: THE CONVERSATION
// ============================================

const merchantDialogue = {
  id: 'merchant-quest',
  startNode: 'greeting',
  nodes: {
    greeting: {
      text: 'Welcome, traveler! You have {{gold}} gold. I have a job for you.',
      speaker: 'merchant',
      choices: [
        { text: 'What kind of job?', next: 'job-details', actions: [{ type: 'set', flag: 'conv:askedJob', value: true }] },
        { text: 'What\'s the pay?', next: 'pay-details', actions: [{ type: 'set', flag: 'conv:askedPay', value: true }] },
        { text: 'Not interested', next: 'decline' }
      ]
    },
    'job-details': {
      text: 'There\'s a bandit camp nearby. Clear it out, and I\'ll make it worth your while.',
      speaker: 'merchant',
      choices: [
        { text: 'What\'s the pay?', next: 'pay-details', actions: [{ type: 'set', flag: 'conv:askedPay', value: true }] },
        { text: 'I\'ll do it!', next: 'accept', actions: [{ type: 'set', flag: 'hasQuest', value: true }] },
        { text: 'Too dangerous', next: 'decline' }
      ]
    },
    'pay-details': {
      text: 'I\'ll pay you 100 gold pieces. You currently have {{gold}} gold - this would help, no?',
      speaker: 'merchant',
      choices: [
        { text: 'Tell me about the job first', next: 'job-details', actions: [{ type: 'set', flag: 'conv:askedJob', value: true }], conditions: { check: ['conv:askedJob', '!=', true] } },
        { text: 'Can you pay more?', next: 'negotiate', conditions: { check: ['reputation', '>=', 20] } },
        { text: 'Deal! I\'ll take it', next: 'accept', actions: [{ type: 'set', flag: 'hasQuest', value: true }] },
        { text: 'Not enough', next: 'decline' }
      ]
    },
    negotiate: {
      text: 'Hmm, you drive a hard bargain. Fine - 120 gold, but only because of your reputation.',
      speaker: 'merchant',
      actions: [{ type: 'set', flag: 'conv:negotiated', value: true }],
      choices: [
        { text: 'Deal!', next: 'accept-bonus', actions: [{ type: 'set', flag: 'hasQuest', value: true }, { type: 'set', flag: 'questReward', value: 120 }] },
        { text: 'Still not enough', next: 'decline' }
      ]
    },
    accept: {
      text: 'Excellent! Come back when the job is done. Good luck out there!',
      speaker: 'merchant',
      actions: [{ type: 'set', flag: 'questReward', value: 100 }],
      isEnd: true
    },
    'accept-bonus': {
      text: 'You\'ve got yourself a deal! 120 gold when you return. Don\'t let me down!',
      speaker: 'merchant',
      isEnd: true
    },
    decline: {
      text: 'Your loss, traveler. Come back if you change your mind.',
      speaker: 'merchant',
      isEnd: true
    }
  }
}

const speakers = {
  merchant: { name: 'Merchant', portrait: '🏪', color: '#d29922' }
}

let exhibit1GameFlags = createFlagStore()
let exhibit1Runner = null
let exhibit1ActionStream = []

function exhibit1AddToActionStream(type, content) {
  exhibit1ActionStream.push({ type, content })
  exhibit1RenderActionStream()
}

function exhibit1RenderActionStream() {
  const container = document.getElementById('action-stream-content')
  if (!container) return
  container.innerHTML = exhibit1ActionStream.map(item => `
    <div class="action-item">
      <span class="action-type">${item.type}</span>
      <span>${item.content}</span>
    </div>
  `).join('')
  container.scrollTop = container.scrollHeight
}

function exhibit1RenderFlags() {
  const gameContainer = document.getElementById('game-flags')
  const convContainer = document.getElementById('conv-flags')
  if (!gameContainer || !convContainer) return

  const gameFlagsData = exhibit1GameFlags.all()
  gameContainer.innerHTML = Object.entries(gameFlagsData).map(([key, value]) => {
    if (typeof value === 'number') {
      const max = key === 'gold' ? 250 : key === 'reputation' ? 100 : 100
      const percent = key === 'reputation' ? ((value + 100) / 200) * 100 : (value / max) * 100
      return `
        <div class="flag-item">
          <span class="flag-name">${key}:</span>
          <div class="flag-bar">
            <div class="flag-bar-fill" style="width: ${percent}%"></div>
            <span class="flag-bar-value">${value}</span>
          </div>
        </div>
      `
    } else {
      return `
        <div class="flag-item">
          <span class="flag-name">${key}:</span>
          <div class="flag-bool ${value ? 'true' : 'false'}"></div>
          <span>${value}</span>
        </div>
      `
    }
  }).join('')

  const convFlagsData = exhibit1Runner ? exhibit1Runner.getConversationFlags() : {}
  convContainer.innerHTML = Object.entries(convFlagsData).length === 0
    ? '<div class="flag-item text-muted">No conversation flags set</div>'
    : Object.entries(convFlagsData).map(([key, value]) => `
      <div class="flag-item">
        <span class="flag-name">${key}:</span>
        <div class="flag-bool ${value ? 'true' : 'false'}"></div>
        <span>${value}</span>
      </div>
    `).join('')
}

function exhibit1RenderDialogue(state) {
  const textEl = document.getElementById('dialogue-text')
  const choicesEl = document.getElementById('choices-list')
  const endedEl = document.getElementById('dialogue-ended')
  const portraitEl = document.getElementById('speaker-portrait')
  const nameEl = document.getElementById('speaker-name')
  if (!textEl || !choicesEl || !endedEl || !portraitEl || !nameEl) return

  // Update speaker
  const speakerKey = state.currentNode.speaker
  const speaker = speakerKey ? speakers[speakerKey] : null
  if (speaker) {
    portraitEl.textContent = speaker.portrait
    nameEl.textContent = speaker.name
    portraitEl.classList.add('active')
  } else {
    portraitEl.textContent = '👤'
    nameEl.textContent = 'Narrator'
    portraitEl.classList.remove('active')
  }

  // Update text
  textEl.innerHTML = state.currentNode.text

  if (state.isEnded) {
    choicesEl.classList.add('hidden')
    endedEl.classList.remove('hidden')
  } else {
    choicesEl.classList.remove('hidden')
    endedEl.classList.add('hidden')

    // Render choices
    const allChoices = exhibit1Runner.getChoices({ includeUnavailable: true })
    choicesEl.innerHTML = allChoices.map((choice, index) => {
      const hasActions = choice.actions && choice.actions.length > 0
      const isAvailable = choice.available !== false
      return `
        <button class="choice-btn"
                data-action="selectChoice"
                data-index="${index}"
                ${!isAvailable ? 'disabled' : ''}>
          ${hasActions ? '<span class="action-indicator">⚡</span>' : ''}
          <span>${choice.text}</span>
          ${!isAvailable ? '<span class="text-muted">(conditions not met)</span>' : ''}
        </button>
      `
    }).join('')
  }

  exhibit1RenderFlags()
}

async function selectChoice(index) {
  if (!exhibit1Runner) return
  try {
    const state = await exhibit1Runner.choose(index)
    exhibit1RenderDialogue(state)
  } catch (err) {
    console.error('Choice error:', err)
  }
}

async function restartDialogue() {
  exhibit1ActionStream = []
  exhibit1RenderActionStream()
  exhibit1GameFlags = createFlagStore()
  exhibit1GameFlags.set('gold', 150)
  exhibit1GameFlags.set('reputation', 25)
  exhibit1GameFlags.set('hasQuest', false)
  await exhibit1Init()
}

async function exhibit1Init() {
  exhibit1Runner = createDialogueRunner({
    gameFlags: exhibit1GameFlags,
    speakers,
    onNodeEnter: (node, speaker) => {
      exhibit1AddToActionStream('NODE_ENTER', `"${node.text.substring(0, 30)}..."`)
    },
    onActionExecuted: (action, result) => {
      if (action.type === 'set') {
        exhibit1AddToActionStream('SET', `<span class="action-flag">${action.flag}</span> = <span class="action-value">${action.value}</span>`)
      } else if (action.type === 'increment') {
        exhibit1AddToActionStream('INCREMENT', `<span class="action-flag">${action.flag}</span> by ${action.value || 1}`)
      } else if (action.type === 'decrement') {
        exhibit1AddToActionStream('DECREMENT', `<span class="action-flag">${action.flag}</span> by ${action.value || 1}`)
      }
      exhibit1RenderFlags()
    }
  })

  exhibit1AddToActionStream('INTERPOLATE', '<span class="action-flag">{{gold}}</span> → <span class="action-value">"150"</span>')

  const state = await exhibit1Runner.start(merchantDialogue)
  exhibit1RenderDialogue(state)
}

window.selectChoice = selectChoice
window.restartDialogue = restartDialogue

// ============================================
// EXHIBIT 2: THE CONDITION LABORATORY
// ============================================

const exhibit2LabState = {
  gold: 120,
  hasKey: false,
  reputation: 30,
  class: 'warrior'
}

const labConditions = [
  {
    id: 'buy-sword',
    label: 'Buy Sword (100g)',
    condition: { check: ['gold', '>=', 100] },
    description: 'gold >= 100'
  },
  {
    id: 'open-door',
    label: 'Open the Door',
    condition: { or: [{ check: ['hasKey', '==', true] }, { check: ['reputation', '>=', 50] }] },
    description: 'hasKey OR reputation >= 50'
  },
  {
    id: 'buy-armor',
    label: 'Buy Heavy Armor (200g)',
    condition: { and: [{ check: ['gold', '>=', 200] }, { not: { check: ['class', '==', 'mage'] } }] },
    description: 'gold >= 200 AND NOT mage'
  },
  {
    id: 'cast-fireball',
    label: 'Cast Fireball',
    condition: { check: ['class', '==', 'mage'] },
    description: 'class == mage'
  }
]

function exhibit2EvaluateCondition(condition) {
  if ('check' in condition) {
    const [flag, op, value] = condition.check
    const flagValue = exhibit2LabState[flag]
    switch (op) {
      case '==': return flagValue === value
      case '!=': return flagValue !== value
      case '>=': return flagValue >= value
      case '<=': return flagValue <= value
      case '>': return flagValue > value
      case '<': return flagValue < value
    }
  }
  if ('and' in condition) {
    return condition.and.every(c => exhibit2EvaluateCondition(c))
  }
  if ('or' in condition) {
    return condition.or.some(c => exhibit2EvaluateCondition(c))
  }
  if ('not' in condition) {
    return !exhibit2EvaluateCondition(condition.not)
  }
  return false
}

function exhibit2RenderConditions() {
  const conditionsEl = document.getElementById('lab-conditions')
  const outputsEl = document.getElementById('lab-outputs')
  if (!conditionsEl || !outputsEl) return

  conditionsEl.innerHTML = labConditions.map(cond => {
    const result = exhibit2EvaluateCondition(cond.condition)
    return `
      <div class="condition-row">
        <div class="condition-wire ${result ? 'active' : ''}"></div>
        <div class="condition-check">${cond.description}</div>
        <div class="condition-status ${result ? 'pass' : 'fail'}">${result ? '✓ PASS' : '✗ FAIL'}</div>
        <div class="condition-wire ${result ? 'active' : ''}"></div>
      </div>
    `
  }).join('')

  outputsEl.innerHTML = labConditions.map(cond => {
    const result = exhibit2EvaluateCondition(cond.condition)
    return `
      <div class="output-row">
        <div class="output-bulb ${result ? 'lit' : ''}"></div>
        <span class="output-text">"${cond.label}"</span>
        <span class="output-status ${result ? 'available' : ''}">${result ? '[AVAILABLE]' : '[LOCKED]'}</span>
      </div>
    `
  }).join('')
}

function updateLabInput(input, value) {
  exhibit2LabState[input] = value
  exhibit2RenderConditions()
}

function toggleLabSwitch(input) {
  exhibit2LabState[input] = !exhibit2LabState[input]
  const track = document.getElementById(`lab-${input}`)
  const label = document.getElementById(`lab-${input}-label`)
  if (track && label) {
    track.classList.toggle('on', exhibit2LabState[input])
    label.textContent = exhibit2LabState[input] ? 'ON' : 'OFF'
  }
  exhibit2RenderConditions()
}

function randomizeLabInputs() {
  exhibit2LabState.gold = Math.floor(Math.random() * 250)
  exhibit2LabState.hasKey = Math.random() > 0.5
  exhibit2LabState.reputation = Math.floor(Math.random() * 200) - 100
  exhibit2LabState.class = ['warrior', 'mage', 'rogue'][Math.floor(Math.random() * 3)]

  const goldSlider = document.getElementById('lab-gold')
  const goldValue = document.getElementById('lab-gold-value')
  const repSlider = document.getElementById('lab-reputation')
  const repValue = document.getElementById('lab-reputation-value')
  const classSelect = document.getElementById('lab-class')
  const keyTrack = document.getElementById('lab-hasKey')
  const keyLabel = document.getElementById('lab-hasKey-label')

  if (goldSlider && goldValue) {
    goldSlider.value = exhibit2LabState.gold
    goldValue.textContent = exhibit2LabState.gold
  }
  if (repSlider && repValue) {
    repSlider.value = exhibit2LabState.reputation
    repValue.textContent = exhibit2LabState.reputation
  }
  if (classSelect) {
    classSelect.value = exhibit2LabState.class
  }
  if (keyTrack && keyLabel) {
    keyTrack.classList.toggle('on', exhibit2LabState.hasKey)
    keyLabel.textContent = exhibit2LabState.hasKey ? 'ON' : 'OFF'
  }

  exhibit2RenderConditions()
}

function exhibit2Init() {
  const goldSlider = document.getElementById('lab-gold')
  const goldValue = document.getElementById('lab-gold-value')
  const repSlider = document.getElementById('lab-reputation')
  const repValue = document.getElementById('lab-reputation-value')
  const classSelect = document.getElementById('lab-class')

  if (goldSlider && goldValue) {
    goldSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value)
      goldValue.textContent = value
      updateLabInput('gold', value)
    })
  }

  if (repSlider && repValue) {
    repSlider.addEventListener('input', (e) => {
      const value = parseInt(e.target.value)
      repValue.textContent = value
      updateLabInput('reputation', value)
    })
  }

  if (classSelect) {
    classSelect.addEventListener('change', (e) => {
      updateLabInput('class', e.target.value)
    })
  }

  exhibit2RenderConditions()
}

window.toggleLabSwitch = toggleLabSwitch
window.randomizeLabInputs = randomizeLabInputs
window.updateLabInput = updateLabInput

// ============================================
// EXHIBIT 3: THE TIME MACHINE
// ============================================

const tmDialogue = {
  id: 'time-machine-demo',
  startNode: 'node1',
  nodes: {
    node1: {
      text: 'Welcome, traveler! You have 150 gold.',
      speaker: 'merchant',
      choices: [
        { text: 'What kind of work?', next: 'node2', actions: [{ type: 'set', flag: 'conv:askedJob', value: true }] }
      ]
    },
    node2: {
      text: 'I need someone to clear out some bandits.',
      speaker: 'merchant',
      choices: [
        { text: 'What\'s the reward?', next: 'node3', actions: [{ type: 'set', flag: 'conv:askedPay', value: true }] }
      ]
    },
    node3: {
      text: 'I\'ll pay you 100 gold pieces.',
      speaker: 'merchant',
      choices: [
        { text: 'Can you pay more?', next: 'node4' }
      ]
    },
    node4: {
      text: 'Hmm, you drive a hard bargain...',
      speaker: 'merchant',
      actions: [{ type: 'increment', flag: 'conv:negotiationRounds', value: 1 }],
      choices: [
        { text: 'How about 120 gold?', next: 'node5' }
      ]
    },
    node5: {
      text: 'Fine, 120 gold. But that\'s my final offer.',
      speaker: 'merchant',
      choices: [
        { text: 'Deal!', next: 'node6', actions: [{ type: 'set', flag: 'hasQuest', value: true }] }
      ]
    },
    node6: {
      text: 'Excellent! Come back when the job is done.',
      speaker: 'merchant',
      isEnd: true
    }
  }
}

let exhibit3CurrentIndex = 5
let exhibit3SaveSlots = [
  { nodeId: 'node3', gold: 150, convFlags: { askedJob: true, askedPay: true }, timestamp: Date.now() - 60000 },
  null,
  null,
  null
]

const prePopulatedHistory = [
  { nodeId: 'node1', text: 'Welcome, traveler!', speaker: '🏪', change: 'NODE_ENTER' },
  { nodeId: 'node2', text: 'I need someone to...', speaker: '🏪', change: 'SET conv:askedJob = true' },
  { nodeId: 'node3', text: 'I\'ll pay you 100...', speaker: '🏪', change: 'SET conv:askedPay = true' },
  { nodeId: 'node4', text: 'Hmm, you drive a...', speaker: '🏪', change: 'INCREMENT negotiationRounds' },
  { nodeId: 'node5', text: 'Fine, 120 gold...', speaker: '🏪', change: 'NODE_ENTER' },
  { nodeId: 'node6', text: 'Excellent! Come back...', speaker: '🏪', change: 'SET hasQuest = true' }
]

function renderTimeMachine() {
  const timelineEl = document.getElementById('tm-timeline')
  const currentTextEl = document.getElementById('tm-current-text')
  const choicesEl = document.getElementById('tm-choices')
  const gameFlagsEl = document.getElementById('tm-game-flags')
  const convFlagsEl = document.getElementById('tm-conv-flags')
  const changesEl = document.getElementById('tm-changes')
  const sliderEl = document.getElementById('tm-slider')

  if (!timelineEl || !currentTextEl || !choicesEl) return

  // Render timeline
  timelineEl.innerHTML = prePopulatedHistory.map((entry, index) => `
    <div class="timeline-node ${index === exhibit3CurrentIndex ? 'current' : ''}" data-action="tmJumpTo" data-index="${index}">
      <div class="timeline-node-number">${index + 1}</div>
      <div class="timeline-node-icon">${entry.speaker}</div>
    </div>
    ${index < prePopulatedHistory.length - 1 ? '<div class="timeline-connector"></div>' : ''}
  `).join('')

  // Update slider
  if (sliderEl) {
    sliderEl.max = prePopulatedHistory.length - 1
    sliderEl.value = exhibit3CurrentIndex
  }

  // Render current state
  const current = prePopulatedHistory[exhibit3CurrentIndex]
  currentTextEl.textContent = tmDialogue.nodes[current.nodeId].text

  // Render choices
  const node = tmDialogue.nodes[current.nodeId]
  if (node.isEnd) {
    choicesEl.innerHTML = '<div class="text-muted">Dialogue has ended.</div>'
  } else if (node.choices) {
    choicesEl.innerHTML = node.choices.map((choice, i) => `
      <button class="choice-btn" data-action="tmChoose" data-index="${i}">${choice.text}</button>
    `).join('')
  }

  // Render flags
  if (gameFlagsEl) {
    const goldValues = [150, 150, 150, 150, 150, 150]
    gameFlagsEl.innerHTML = `
      <div class="flag-item">
        <span class="flag-name">gold:</span>
        <div class="flag-bar">
          <div class="flag-bar-fill" style="width: 60%"></div>
          <span class="flag-bar-value">${goldValues[exhibit3CurrentIndex]}</span>
        </div>
      </div>
      <div class="flag-item">
        <span class="flag-name">hasQuest:</span>
        <div class="flag-bool ${exhibit3CurrentIndex === 5 ? 'true' : 'false'}"></div>
      </div>
    `
  }

  if (convFlagsEl) {
    convFlagsEl.innerHTML = `
      <div class="flag-item">
        <span class="flag-name">askedJob:</span>
        <div class="flag-bool ${exhibit3CurrentIndex >= 1 ? 'true' : 'false'}"></div>
      </div>
      <div class="flag-item">
        <span class="flag-name">askedPay:</span>
        <div class="flag-bool ${exhibit3CurrentIndex >= 2 ? 'true' : 'false'}"></div>
      </div>
    `
  }

  if (changesEl) {
    changesEl.innerHTML = `<div class="text-secondary">${current.change}</div>`
  }

  // Render save slots
  exhibit3SaveSlots.forEach((slot, i) => {
    const el = document.getElementById(`save-slot-${i}`)
    if (el && slot) {
      el.className = 'save-slot filled'
      el.innerHTML = `
        <div class="save-slot-title">Slot ${i + 1}</div>
        <div class="save-slot-preview">🏪</div>
        <div class="save-slot-info">${slot.gold}g - Node ${slot.nodeId.replace('node', '')}</div>
        <div class="save-slot-actions">
          <button class="btn btn-small btn-primary" data-action="loadSlot" data-index="${i}">Load</button>
        </div>
      `
    }
  })
}

function tmJumpTo(index) {
  exhibit3CurrentIndex = index
  renderTimeMachine()
}

function tmBack() {
  if (exhibit3CurrentIndex > 0) {
    exhibit3CurrentIndex--
    renderTimeMachine()
  }
}

function tmForward() {
  if (exhibit3CurrentIndex < prePopulatedHistory.length - 1) {
    exhibit3CurrentIndex++
    renderTimeMachine()
  }
}

function tmChoose(index) {
  if (exhibit3CurrentIndex < prePopulatedHistory.length - 1) {
    exhibit3CurrentIndex++
    renderTimeMachine()
  }
}

function tmRestart() {
  exhibit3CurrentIndex = 0
  renderTimeMachine()
}

function tmAutoPlay() {
  exhibit3CurrentIndex = 0
  renderTimeMachine()
  let i = 0
  const interval = setInterval(() => {
    if (i < prePopulatedHistory.length - 1) {
      i++
      exhibit3CurrentIndex = i
      renderTimeMachine()
    } else {
      clearInterval(interval)
    }
  }, 1000)
}

function loadSlot(index) {
  const slot = exhibit3SaveSlots[index]
  if (slot) {
    const nodeIndex = parseInt(slot.nodeId.replace('node', '')) - 1
    exhibit3CurrentIndex = nodeIndex
    renderTimeMachine()
  }
}

function saveSlot(index) {
  const current = prePopulatedHistory[exhibit3CurrentIndex]
  exhibit3SaveSlots[index] = {
    nodeId: current.nodeId,
    gold: 150,
    convFlags: {},
    timestamp: Date.now()
  }
  renderTimeMachine()
}

function saveCurrentSlot() {
  const emptyIndex = exhibit3SaveSlots.findIndex(s => s === null)
  if (emptyIndex >= 0) {
    saveSlot(emptyIndex)
  }
}

function exhibit3Init() {
  const slider = document.getElementById('tm-slider')
  if (slider) {
    slider.addEventListener('input', (e) => {
      exhibit3CurrentIndex = parseInt(e.target.value)
      renderTimeMachine()
    })
  }
  renderTimeMachine()
}

window.tmJumpTo = tmJumpTo
window.tmBack = tmBack
window.tmForward = tmForward
window.tmChoose = tmChoose
window.tmRestart = tmRestart
window.tmAutoPlay = tmAutoPlay
window.loadSlot = loadSlot
window.saveSlot = saveSlot
window.saveCurrentSlot = saveCurrentSlot

// ============================================
// INITIALIZATION (NO AUTO-PLAY)
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Event delegation for dynamically created elements (avoiding inline onclick)
  document.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]')
    if (!target) return

    const action = target.dataset.action
    const index = parseInt(target.dataset.index, 10)

    switch (action) {
      case 'selectChoice':
        selectChoice(index)
        break
      case 'tmJumpTo':
        tmJumpTo(index)
        break
      case 'tmChoose':
        tmChoose(index)
        break
      case 'loadSlot':
        e.stopPropagation()
        loadSlot(index)
        break
    }
  })

  // Initialize exhibit 1 with empty state - dialogue starts but no actions shown
  exhibit1GameFlags.set('gold', 150)
  exhibit1GameFlags.set('reputation', 25)
  exhibit1GameFlags.set('hasQuest', false)

  // Set dialogue text placeholder (NO AUTO-START)
  const dialogueText = document.getElementById('dialogue-text')
  if (dialogueText) {
    dialogueText.textContent = ''
    dialogueText.dataset.placeholder = 'Restart to begin conversation'
  }

  // Initialize exhibit 2 with inputs populated but outputs empty
  exhibit2Init()

  // Initialize exhibit 3 - renders timeline but no auto-play
  exhibit3Init()
})
