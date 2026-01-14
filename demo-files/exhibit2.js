// ============================================
// EXHIBIT 2: THE CONDITION LABORATORY
// ============================================

export const labState = {
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

function evaluateLabCondition(condition) {
  if ('check' in condition) {
    const [flag, op, value] = condition.check
    const flagValue = labState[flag]
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
    return condition.and.every(c => evaluateLabCondition(c))
  }
  if ('or' in condition) {
    return condition.or.some(c => evaluateLabCondition(c))
  }
  if ('not' in condition) {
    return !evaluateLabCondition(condition.not)
  }
  return false
}

export function renderLabConditions() {
  const conditionsEl = document.getElementById('lab-conditions')
  const outputsEl = document.getElementById('lab-outputs')

  conditionsEl.innerHTML = labConditions.map(cond => {
    const result = evaluateLabCondition(cond.condition)
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
    const result = evaluateLabCondition(cond.condition)
    return `
      <div class="output-row">
        <div class="output-bulb ${result ? 'lit' : ''}"></div>
        <span class="output-text">"${cond.label}"</span>
        <span class="output-status ${result ? 'available' : ''}">${result ? '[AVAILABLE]' : '[LOCKED]'}</span>
      </div>
    `
  }).join('')
}

export function updateLabInput(input, value) {
  labState[input] = value
  renderLabConditions()
}

export function toggleLabSwitch(input) {
  labState[input] = !labState[input]
  const track = document.getElementById(`lab-${input}`)
  const label = document.getElementById(`lab-${input}-label`)
  track.classList.toggle('on', labState[input])
  label.textContent = labState[input] ? 'ON' : 'OFF'
  renderLabConditions()
}

export function randomizeLabInputs() {
  labState.gold = Math.floor(Math.random() * 250)
  labState.hasKey = Math.random() > 0.5
  labState.reputation = Math.floor(Math.random() * 200) - 100
  labState.class = ['warrior', 'mage', 'rogue'][Math.floor(Math.random() * 3)]

  document.getElementById('lab-gold').value = labState.gold
  document.getElementById('lab-gold-value').textContent = labState.gold
  document.getElementById('lab-reputation').value = labState.reputation
  document.getElementById('lab-reputation-value').textContent = labState.reputation
  document.getElementById('lab-class').value = labState.class

  const keyTrack = document.getElementById('lab-hasKey')
  const keyLabel = document.getElementById('lab-hasKey-label')
  keyTrack.classList.toggle('on', labState.hasKey)
  keyLabel.textContent = labState.hasKey ? 'ON' : 'OFF'

  renderLabConditions()
}

export function initExhibit2() {
  document.getElementById('lab-gold').addEventListener('input', (e) => {
    const value = parseInt(e.target.value)
    document.getElementById('lab-gold-value').textContent = value
    updateLabInput('gold', value)
  })

  document.getElementById('lab-reputation').addEventListener('input', (e) => {
    const value = parseInt(e.target.value)
    document.getElementById('lab-reputation-value').textContent = value
    updateLabInput('reputation', value)
  })

  document.getElementById('lab-class').addEventListener('change', (e) => {
    updateLabInput('class', e.target.value)
  })

  renderLabConditions()
}

window.toggleLabSwitch = toggleLabSwitch
window.randomizeLabInputs = randomizeLabInputs
window.updateLabInput = updateLabInput
