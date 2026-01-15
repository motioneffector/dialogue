# I18n API

Functions and interfaces for internationalization support.

---

## `createI18nAdapter()`

Creates an I18nAdapter from an @motioneffector/i18n instance.

**Signature:**

```typescript
function createI18nAdapter(i18n: I18nInstance): I18nAdapter
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `i18n` | `I18nInstance` | Yes | An @motioneffector/i18n instance |

**Returns:** `I18nAdapter` — Adapter compatible with the dialogue runner.

**Example:**

```typescript
import { createDialogueRunner, createI18nAdapter } from '@motioneffector/dialogue'
import { createI18n } from '@motioneffector/i18n'

const i18n = createI18n({
  locale: 'en',
  messages: {
    en: {
      'greeting.hello': 'Hello!',
      'greeting.goodbye': 'Goodbye!'
    },
    es: {
      'greeting.hello': '¡Hola!',
      'greeting.goodbye': '¡Adiós!'
    }
  }
})

const adapter = createI18nAdapter(i18n)

const runner = createDialogueRunner({ i18n: adapter })
```

---

## Types

### `I18nAdapter`

Interface that adapters must implement.

```typescript
interface I18nAdapter {
  t: (key: string, params?: Record<string, unknown>) => string
  hasKey: (key: string) => boolean
}
```

| Method | Description |
|--------|-------------|
| `t(key, params?)` | Translate a key, optionally with interpolation parameters |
| `hasKey(key)` | Check if a translation key exists |

---

## Custom Adapters

You can create custom adapters for any i18n library:

### Simple Object Adapter

```typescript
const translations = {
  'greeting': 'Hello!',
  'farewell': 'Goodbye!'
}

const adapter: I18nAdapter = {
  t: (key) => translations[key] || key,
  hasKey: (key) => key in translations
}
```

### react-i18next Adapter

```typescript
import i18next from 'i18next'

const adapter: I18nAdapter = {
  t: (key, params) => i18next.t(key, params),
  hasKey: (key) => i18next.exists(key)
}
```

### FormatJS / react-intl Adapter

```typescript
import { IntlShape } from 'react-intl'

function createIntlAdapter(intl: IntlShape): I18nAdapter {
  return {
    t: (key, params) => intl.formatMessage({ id: key }, params),
    hasKey: (key) => intl.messages[key] !== undefined
  }
}
```

---

## How Translation Works

When the runner processes node text:

1. Calls `hasKey(text)` to check if text is a translation key
2. If true: calls `t(text, params)` to get translated text
3. If false: uses text as-is (literal text)
4. After translation: applies interpolation (`{{flag}}` replacement)

```typescript
const dialogue = {
  id: 'example',
  startNode: 'start',
  nodes: {
    start: {
      // This is a translation key
      text: 'greeting.welcome',
      next: 'literal'
    },
    literal: {
      // This is literal text (hasKey returns false)
      text: 'This text is not translated.',
      isEnd: true
    }
  }
}
```

---

## Parameters in Translations

The `t()` method receives parameters that can be used for interpolation:

```typescript
// Translation: "Hello, {name}!"
const adapter: I18nAdapter = {
  t: (key, params) => {
    const templates = {
      'greeting': 'Hello, {name}!'
    }
    let text = templates[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v))
      }
    }
    return text
  },
  hasKey: (key) => key in templates
}
```

Note: The dialogue system's own `{{flag}}` interpolation runs AFTER i18n translation, so you can combine both:

```typescript
// Translation: "Welcome back, {name}!"
// Node text: "greeting.welcome"
// Final result after i18n + interpolation: "Welcome back, Hero!"
```
