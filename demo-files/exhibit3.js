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

export let tmCurrentIndex = 5
let tmSaveSlots = [
  { nodeId: 'node3', gold: 150, convFlags: { askedJob: true, askedPay: true }, timestamp: Date.now() - 60000 },
  null,
  null,
  null
]

// Pre-populate the timeline
const prePopulatedHistory = [
  { nodeId: 'node1', text: 'Welcome, traveler!', speaker: '🏪', change: 'NODE_ENTER' },
  { nodeId: 'node2', text: 'I need someone to...', speaker: '🏪', change: 'SET conv:askedJob = true' },
  { nodeId: 'node3', text: 'I\'ll pay you 100...', speaker: '🏪', change: 'SET conv:askedPay = true' },
  { nodeId: 'node4', text: 'Hmm, you drive a...', speaker: '🏪', change: 'INCREMENT negotiationRounds' },
  { nodeId: 'node5', text: 'Fine, 120 gold...', speaker: '🏪', change: 'NODE_ENTER' },
  { nodeId: 'node6', text: 'Excellent! Come back...', speaker: '🏪', change: 'SET hasQuest = true' }
]

export function renderTimeMachine() {
  const timelineEl = document.getElementById('tm-timeline')
  const currentTextEl = document.getElementById('tm-current-text')
  const choicesEl = document.getElementById('tm-choices')
  const gameFlagsEl = document.getElementById('tm-game-flags')
  const convFlagsEl = document.getElementById('tm-conv-flags')
  const changesEl = document.getElementById('tm-changes')
  const sliderEl = document.getElementById('tm-slider')

  // Render timeline
  timelineEl.innerHTML = prePopulatedHistory.map((entry, index) => `
    <div class="timeline-node ${index === tmCurrentIndex ? 'current' : ''}" onclick="tmJumpTo(${index})">
      <div class="timeline-node-number">${index + 1}</div>
      <div class="timeline-node-icon">${entry.speaker}</div>
    </div>
    ${index < prePopulatedHistory.length - 1 ? '<div class="timeline-connector"></div>' : ''}
  `).join('')

  // Update slider
  sliderEl.max = prePopulatedHistory.length - 1
  sliderEl.value = tmCurrentIndex

  // Render current state
  const current = prePopulatedHistory[tmCurrentIndex]
  currentTextEl.textContent = tmDialogue.nodes[current.nodeId].text

  // Render choices
  const node = tmDialogue.nodes[current.nodeId]
  if (node.isEnd) {
    choicesEl.innerHTML = '<div class="text-muted">Dialogue has ended.</div>'
  } else if (node.choices) {
    choicesEl.innerHTML = node.choices.map((choice, i) => `
      <button class="choice-btn" onclick="tmChoose(${i})">${choice.text}</button>
    `).join('')
  }

  // Render flags
  const goldValues = [150, 150, 150, 150, 150, 150]
  gameFlagsEl.innerHTML = `
    <div class="flag-item">
      <span class="flag-name">gold:</span>
      <div class="flag-bar">
        <div class="flag-bar-fill" style="width: 60%"></div>
        <span class="flag-bar-value">${goldValues[tmCurrentIndex]}</span>
      </div>
    </div>
    <div class="flag-item">
      <span class="flag-name">hasQuest:</span>
      <div class="flag-bool ${tmCurrentIndex === 5 ? 'true' : 'false'}"></div>
    </div>
  `

  convFlagsEl.innerHTML = `
    <div class="flag-item">
      <span class="flag-name">askedJob:</span>
      <div class="flag-bool ${tmCurrentIndex >= 1 ? 'true' : 'false'}"></div>
    </div>
    <div class="flag-item">
      <span class="flag-name">askedPay:</span>
      <div class="flag-bool ${tmCurrentIndex >= 2 ? 'true' : 'false'}"></div>
    </div>
  `

  changesEl.innerHTML = `<div class="text-secondary">${current.change}</div>`

  // Render save slots
  tmSaveSlots.forEach((slot, i) => {
    const el = document.getElementById(`save-slot-${i}`)
    if (slot) {
      el.className = 'save-slot filled'
      el.innerHTML = `
        <div class="save-slot-title">Slot ${i + 1}</div>
        <div class="save-slot-preview">🏪</div>
        <div class="save-slot-info">${slot.gold}g - Node ${slot.nodeId.replace('node', '')}</div>
        <div class="save-slot-actions">
          <button class="btn btn-small btn-primary" onclick="loadSlot(${i}); event.stopPropagation();">Load</button>
        </div>
      `
    }
  })
}

export function tmJumpTo(index) {
  tmCurrentIndex = index
  renderTimeMachine()
}

export function tmBack() {
  if (tmCurrentIndex > 0) {
    tmCurrentIndex--
    renderTimeMachine()
  }
}

export function tmForward() {
  if (tmCurrentIndex < prePopulatedHistory.length - 1) {
    tmCurrentIndex++
    renderTimeMachine()
  }
}

export function tmChoose(index) {
  if (tmCurrentIndex < prePopulatedHistory.length - 1) {
    tmCurrentIndex++
    renderTimeMachine()
  }
}

export function tmRestart() {
  tmCurrentIndex = 0
  renderTimeMachine()
}

export function tmAutoPlay() {
  tmCurrentIndex = 0
  renderTimeMachine()
  let i = 0
  const interval = setInterval(() => {
    if (i < prePopulatedHistory.length - 1) {
      i++
      tmCurrentIndex = i
      renderTimeMachine()
    } else {
      clearInterval(interval)
    }
  }, 1000)
}

export function loadSlot(index) {
  const slot = tmSaveSlots[index]
  if (slot) {
    const nodeIndex = parseInt(slot.nodeId.replace('node', '')) - 1
    tmCurrentIndex = nodeIndex
    renderTimeMachine()
  }
}

export function saveSlot(index) {
  const current = prePopulatedHistory[tmCurrentIndex]
  tmSaveSlots[index] = {
    nodeId: current.nodeId,
    gold: 150,
    convFlags: {},
    timestamp: Date.now()
  }
  renderTimeMachine()
}

export function saveCurrentSlot() {
  // Find first empty slot
  const emptyIndex = tmSaveSlots.findIndex(s => s === null)
  if (emptyIndex >= 0) {
    saveSlot(emptyIndex)
  }
}

export function initExhibit3() {
  document.getElementById('tm-slider').addEventListener('input', (e) => {
    tmCurrentIndex = parseInt(e.target.value)
    renderTimeMachine()
  })
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
