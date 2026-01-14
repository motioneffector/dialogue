// ============================================
// EXHIBIT 1: THE CONVERSATION
// ============================================

import { createDialogueRunner, createInternalFlagStore } from './library.js'

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

export let gameFlags = createInternalFlagStore()
gameFlags.set('gold', 150)
gameFlags.set('reputation', 25)
gameFlags.set('hasQuest', false)

export let runner
let actionStreamContent = []

function addToActionStream(type, content) {
  actionStreamContent.push({ type, content })
  renderActionStream()
}

function renderActionStream() {
  const container = document.getElementById('action-stream-content')
  container.innerHTML = actionStreamContent.map(item => `
    <div class="action-item">
      <span class="action-type">${item.type}</span>
      <span>${item.content}</span>
    </div>
  `).join('')
  container.scrollTop = container.scrollHeight
}

function renderFlags() {
  const gameContainer = document.getElementById('game-flags')
  const convContainer = document.getElementById('conv-flags')

  const gameFlagsData = gameFlags.all()
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

  const convFlagsData = runner ? runner.getConversationFlags() : {}
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

function renderDialogue(state) {
  const textEl = document.getElementById('dialogue-text')
  const choicesEl = document.getElementById('choices-list')
  const endedEl = document.getElementById('dialogue-ended')
  const portraitEl = document.getElementById('speaker-portrait')
  const nameEl = document.getElementById('speaker-name')

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

  // Update text with interpolation highlighting
  let text = state.currentNode.text
  textEl.innerHTML = text

  if (state.isEnded) {
    choicesEl.classList.add('hidden')
    endedEl.classList.remove('hidden')
  } else {
    choicesEl.classList.remove('hidden')
    endedEl.classList.add('hidden')

    // Render choices
    const allChoices = runner.getChoices({ includeUnavailable: true })
    choicesEl.innerHTML = allChoices.map((choice, index) => {
      const hasActions = choice.actions && choice.actions.length > 0
      const isAvailable = choice.available !== false
      return `
        <button class="choice-btn"
                onclick="selectChoice(${index})"
                ${!isAvailable ? 'disabled' : ''}>
          ${hasActions ? '<span class="action-indicator">⚡</span>' : ''}
          <span>${choice.text}</span>
          ${!isAvailable ? '<span class="text-muted">(conditions not met)</span>' : ''}
        </button>
      `
    }).join('')
  }

  renderFlags()
}

export async function selectChoice(index) {
  try {
    const state = await runner.choose(index)
    renderDialogue(state)
  } catch (err) {
    console.error('Choice error:', err)
  }
}

export async function restartDialogue() {
  actionStreamContent = []
  renderActionStream()
  gameFlags = createInternalFlagStore()
  gameFlags.set('gold', 150)
  gameFlags.set('reputation', 25)
  gameFlags.set('hasQuest', false)
  await initExhibit1()
}

export async function initExhibit1() {
  runner = createDialogueRunner({
    gameFlags,
    speakers,
    onNodeEnter: (node, speaker) => {
      addToActionStream('NODE_ENTER', `"${node.text.substring(0, 30)}..."`)
    },
    onActionExecuted: (action, result) => {
      if (action.type === 'set') {
        addToActionStream('SET', `<span class="action-flag">${action.flag}</span> = <span class="action-value">${action.value}</span>`)
      } else if (action.type === 'increment') {
        addToActionStream('INCREMENT', `<span class="action-flag">${action.flag}</span> by ${action.value || 1}`)
      } else if (action.type === 'decrement') {
        addToActionStream('DECREMENT', `<span class="action-flag">${action.flag}</span> by ${action.value || 1}`)
      }
      renderFlags()
    }
  })

  // Add initial interpolation to action stream
  addToActionStream('INTERPOLATE', '<span class="action-flag">{{gold}}</span> → <span class="action-value">"150"</span>')

  const state = await runner.start(merchantDialogue)
  renderDialogue(state)
}

window.selectChoice = selectChoice
window.restartDialogue = restartDialogue
