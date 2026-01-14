// ============================================
// MAIN INITIALIZATION
// ============================================

import { initExhibit1, restartDialogue } from './exhibit1.js'
import { initExhibit2, toggleLabSwitch, updateLabInput } from './exhibit2.js'
import { initExhibit3, tmCurrentIndex, tmBack, renderTimeMachine, saveSlot, loadSlot } from './exhibit3.js'
import { testRunner } from './tests.js'

// ============================================
// VISUAL DEMO AUTOMATION
// ============================================

const DEMO_DELAY = 400 // ms between actions - fast but perceptible

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runVisualDemo() {
  const progressText = document.getElementById('progress-text')

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' })
  await sleep(300)

  // ========== EXHIBIT 1: THE CONVERSATION ==========
  progressText.textContent = 'Demo: Exhibit 1 - The Conversation'
  document.getElementById('exhibit-1').scrollIntoView({ behavior: 'smooth', block: 'center' })
  await sleep(DEMO_DELAY)

  // Reset exhibit 1 first
  await restartDialogue()
  await sleep(DEMO_DELAY)

  // Click through the dialogue choices
  const clickChoice = async (index) => {
    const choicesEl = document.getElementById('choices-list')
    const buttons = choicesEl.querySelectorAll('.choice-btn:not(:disabled)')
    if (buttons[index]) {
      buttons[index].style.outline = '3px solid var(--accent-blue)'
      await sleep(DEMO_DELAY / 2)
      buttons[index].click()
      await sleep(DEMO_DELAY)
    }
  }

  // Play through dialogue: Ask about job -> Ask about pay -> Negotiate (if available) -> Accept
  await clickChoice(0) // "What kind of job?"
  await clickChoice(0) // "What's the pay?"
  await clickChoice(0) // Try to negotiate or accept
  await clickChoice(0) // Accept deal
  await sleep(DEMO_DELAY)

  // ========== EXHIBIT 2: THE CONDITION LABORATORY ==========
  progressText.textContent = 'Demo: Exhibit 2 - The Condition Laboratory'
  document.getElementById('exhibit-2').scrollIntoView({ behavior: 'smooth', block: 'center' })
  await sleep(DEMO_DELAY)

  // Animate gold slider
  const goldSlider = document.getElementById('lab-gold')
  const goldValue = document.getElementById('lab-gold-value')
  for (let v = 120; v <= 220; v += 20) {
    goldSlider.value = v
    goldValue.textContent = v
    updateLabInput('gold', v)
    await sleep(100)
  }
  await sleep(DEMO_DELAY / 2)

  // Toggle hasKey switch
  progressText.textContent = 'Demo: Toggling hasKey switch'
  toggleLabSwitch('hasKey')
  await sleep(DEMO_DELAY)

  // Animate reputation slider
  const repSlider = document.getElementById('lab-reputation')
  const repValue = document.getElementById('lab-reputation-value')
  for (let v = 30; v <= 60; v += 10) {
    repSlider.value = v
    repValue.textContent = v
    updateLabInput('reputation', v)
    await sleep(100)
  }
  await sleep(DEMO_DELAY / 2)

  // Change class dropdown
  const classSelect = document.getElementById('lab-class')
  classSelect.value = 'mage'
  updateLabInput('class', 'mage')
  await sleep(DEMO_DELAY)
  classSelect.value = 'warrior'
  updateLabInput('class', 'warrior')
  await sleep(DEMO_DELAY)

  // ========== EXHIBIT 3: THE TIME MACHINE ==========
  progressText.textContent = 'Demo: Exhibit 3 - The Time Machine'
  document.getElementById('exhibit-3').scrollIntoView({ behavior: 'smooth', block: 'center' })
  await sleep(DEMO_DELAY)

  // Scrub through timeline
  window.tmCurrentIndex = 0
  renderTimeMachine()
  await sleep(DEMO_DELAY / 2)

  for (let i = 1; i <= 5; i++) {
    window.tmCurrentIndex = i
    renderTimeMachine()
    await sleep(DEMO_DELAY / 2)
  }

  // Go back a few steps
  progressText.textContent = 'Demo: Navigating history backwards'
  await sleep(DEMO_DELAY / 2)
  tmBack()
  await sleep(DEMO_DELAY / 2)
  tmBack()
  await sleep(DEMO_DELAY / 2)

  // Save to a slot
  progressText.textContent = 'Demo: Saving state to slot'
  saveSlot(1)
  await sleep(DEMO_DELAY)

  // Load from slot 0
  progressText.textContent = 'Demo: Loading saved state'
  loadSlot(0)
  await sleep(DEMO_DELAY)

  // Scroll to test runner
  document.querySelector('.test-runner').scrollIntoView({ behavior: 'smooth', block: 'center' })
  await sleep(DEMO_DELAY)

  progressText.textContent = 'Demo complete! Running tests...'
  await sleep(DEMO_DELAY)
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await initExhibit1()
  initExhibit2()
  initExhibit3()

  document.getElementById('run-tests').addEventListener('click', () => {
    testRunner.run(runVisualDemo)
  })
})
