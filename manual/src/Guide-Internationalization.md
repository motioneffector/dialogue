# Internationalization (i18n)

Support multiple languages in your dialogues. Use translation keys instead of literal text, and integrate with your localization system.

## Prerequisites

Before starting, you should:

- [Complete Your First Dialogue](Your-First-Dialogue)

## Overview

We'll set up i18n integration so dialogues can be translated.

1. Create an I18nAdapter
2. Use translation keys in dialogues
3. Handle fallbacks
4. Integrate with @motioneffector/i18n or custom systems

## Step 1: Create an I18nAdapter

The adapter connects the dialogue runner to your translation system:

```typescript
import { createDialogueRunner, I18nAdapter } from '@motioneffector/dialogue'

// Simple adapter for demonstration
const translations: Record<string, string> = {
  'dialogue.greeting': 'Hello, traveler!',
  'dialogue.farewell': 'Safe journeys!',
  'choice.yes': 'Yes',
  'choice.no': 'No'
}

const i18nAdapter: I18nAdapter = {
  t: (key: string) => translations[key] || key,
  hasKey: (key: string) => key in translations
}

const runner = createDialogueRunner({ i18n: i18nAdapter })
```

## Step 2: Use Translation Keys

Instead of literal text, use keys that your i18n system resolves:

```typescript
import { DialogueDefinition } from '@motioneffector/dialogue'

const dialogue: DialogueDefinition = {
  id: 'greeting',
  startNode: 'start',
  nodes: {
    start: {
      text: 'dialogue.greeting',  // Key, not literal text
      choices: [
        { text: 'choice.yes', next: 'continue' },
        { text: 'choice.no', next: 'farewell' }
      ]
    },
    continue: {
      text: 'dialogue.continue',
      isEnd: true
    },
    farewell: {
      text: 'dialogue.farewell',
      isEnd: true
    }
  }
}

const state = await runner.start(dialogue)
console.log(state.currentNode.text)  // "Hello, traveler!"
```

## Step 3: Handle Fallbacks

When `hasKey()` returns false, the text is treated as literal:

```typescript
const i18nAdapter: I18nAdapter = {
  t: (key: string) => {
    const translated = translations[key]
    if (translated) return translated
    console.warn(`Missing translation: ${key}`)
    return key  // Return key as fallback
  },
  hasKey: (key: string) => key in translations
}

// Dialogue with mixed keys and literal text
const dialogue: DialogueDefinition = {
  id: 'mixed',
  startNode: 'start',
  nodes: {
    start: {
      text: 'dialogue.greeting',  // Will be translated
      next: 'literal'
    },
    literal: {
      text: 'This text has no translation key.',  // Used as-is
      isEnd: true
    }
  }
}
```

The runner calls `hasKey()` first. If true, it calls `t()` to translate. If false, it uses the text directly.

## Step 4: Integrate with @motioneffector/i18n

Use the built-in adapter factory:

```typescript
import { createDialogueRunner, createI18nAdapter } from '@motioneffector/dialogue'
import { createI18n } from '@motioneffector/i18n'

// Set up your i18n instance
const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      greeting: 'Hello!',
      farewell: 'Goodbye!'
    },
    es: {
      greeting: '¡Hola!',
      farewell: '¡Adiós!'
    }
  }
})

// Create adapter from i18n instance
const adapter = createI18nAdapter(i18n)

// Use in runner
const runner = createDialogueRunner({ i18n: adapter })
```

## Complete Example

```typescript
import { createDialogueRunner, createI18nAdapter, DialogueDefinition, I18nAdapter } from '@motioneffector/dialogue'

// Simulated translation database
const translations: Record<string, Record<string, string>> = {
  en: {
    'shop.greeting': 'Welcome to my shop!',
    'shop.buy_prompt': 'Would you like to buy something?',
    'shop.thanks': 'Thank you for your purchase!',
    'shop.farewell': 'Come back soon!',
    'choice.buy': 'Yes, show me your wares',
    'choice.browse': 'Just browsing',
    'choice.leave': 'No thanks, goodbye'
  },
  es: {
    'shop.greeting': '¡Bienvenido a mi tienda!',
    'shop.buy_prompt': '¿Te gustaría comprar algo?',
    'shop.thanks': '¡Gracias por tu compra!',
    'shop.farewell': '¡Vuelve pronto!',
    'choice.buy': 'Sí, muéstrame tus productos',
    'choice.browse': 'Solo estoy mirando',
    'choice.leave': 'No gracias, adiós'
  },
  ja: {
    'shop.greeting': 'いらっしゃいませ！',
    'shop.buy_prompt': '何かお買い求めですか？',
    'shop.thanks': 'お買い上げありがとうございます！',
    'shop.farewell': 'またお越しください！',
    'choice.buy': 'はい、商品を見せてください',
    'choice.browse': '見ているだけです',
    'choice.leave': 'いいえ、さようなら'
  }
}

// Create adapter for a specific locale
function createLocaleAdapter(locale: string): I18nAdapter {
  const messages = translations[locale] || translations['en']

  return {
    t: (key: string) => messages[key] || key,
    hasKey: (key: string) => key in messages
  }
}

// The dialogue uses only keys
const shopDialogue: DialogueDefinition = {
  id: 'shop',
  startNode: 'greeting',
  nodes: {
    greeting: {
      speaker: 'merchant',
      text: 'shop.greeting',
      next: 'prompt'
    },
    prompt: {
      speaker: 'merchant',
      text: 'shop.buy_prompt',
      choices: [
        { text: 'choice.buy', next: 'thanks' },
        { text: 'choice.browse', next: 'farewell' },
        { text: 'choice.leave', next: 'farewell' }
      ]
    },
    thanks: {
      speaker: 'merchant',
      text: 'shop.thanks',
      next: 'farewell'
    },
    farewell: {
      speaker: 'merchant',
      text: 'shop.farewell',
      isEnd: true
    }
  }
}

// Run in different languages
async function demo() {
  for (const locale of ['en', 'es', 'ja']) {
    console.log(`\n--- ${locale.toUpperCase()} ---`)

    const runner = createDialogueRunner({
      i18n: createLocaleAdapter(locale),
      speakers: {
        merchant: { name: locale === 'ja' ? '商人' : locale === 'es' ? 'Mercader' : 'Merchant' }
      }
    })

    const state = await runner.start(shopDialogue)
    console.log(state.currentNode.text)

    const choices = runner.getChoices()
    choices.forEach(c => console.log(`  - ${c.text}`))
  }
}

demo()

// Output:
// --- EN ---
// Welcome to my shop!
// Would you like to buy something?
//   - Yes, show me your wares
//   - Just browsing
//   - No thanks, goodbye
//
// --- ES ---
// ¡Bienvenido a mi tienda!
// ¿Te gustaría comprar algo?
//   - Sí, muéstrame tus productos
//   - Solo estoy mirando
//   - No gracias, adiós
//
// --- JA ---
// いらっしゃいませ！
// 何かお買い求めですか？
//   - はい、商品を見せてください
//   - 見ているだけです
//   - いいえ、さようなら
```

## Variations

### Translation Parameters

Pass parameters through the adapter:

```typescript
// Your translation system supports parameters
// "greeting": "Hello, {{name}}!"

const i18nAdapter: I18nAdapter = {
  t: (key: string, params?: Record<string, unknown>) => {
    let text = translations[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{{${k}}}`, String(v))
      }
    }
    return text
  },
  hasKey: (key: string) => key in translations
}
```

### Lazy Loading Translations

Load translations on demand:

```typescript
const loadedLocales = new Set<string>()
let currentMessages: Record<string, string> = {}

async function loadLocale(locale: string) {
  if (!loadedLocales.has(locale)) {
    const response = await fetch(`/i18n/${locale}.json`)
    currentMessages = await response.json()
    loadedLocales.add(locale)
  }
}

const i18nAdapter: I18nAdapter = {
  t: (key) => currentMessages[key] || key,
  hasKey: (key) => key in currentMessages
}
```

### Using ICU Message Format

Integrate with libraries like `intl-messageformat`:

```typescript
import { IntlMessageFormat } from 'intl-messageformat'

const messages: Record<string, IntlMessageFormat> = {
  'shop.greeting': new IntlMessageFormat('Hello, {name}!', 'en')
}

const i18nAdapter: I18nAdapter = {
  t: (key, params) => {
    const message = messages[key]
    return message ? message.format(params) : key
  },
  hasKey: (key) => key in messages
}
```

## Troubleshooting

### Translation Key Shown Instead of Text

**Symptom:** You see "dialogue.greeting" instead of "Hello!".

**Cause:** Either `hasKey()` returned false, or the key isn't in your translations.

**Solution:** Check that the key exists in your translation data and that `hasKey()` returns true for it.

### Wrong Language

**Symptom:** Text appears in wrong language.

**Cause:** Adapter is using the wrong locale's translations.

**Solution:** Verify your adapter is configured with the correct locale when creating the runner.

## See Also

- **[I18n API](API-I18n)** - createI18nAdapter reference
- **[Types Reference](API-Types)** - I18nAdapter interface
- **[Dynamic Text](Guide-Dynamic-Text)** - Interpolation works with translated text
