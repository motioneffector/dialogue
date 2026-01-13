/**
 * I18n adapter for @motioneffector/i18n integration
 */

import type { I18nAdapter } from './types'

/**
 * I18n instance interface (from @motioneffector/i18n)
 */
interface I18nInstance {
  t: (key: string, params?: Record<string, unknown>) => string
  hasKey: (key: string) => boolean
}

/**
 * Creates an I18n adapter from an @motioneffector/i18n instance
 */
export function createI18nAdapter(i18n: I18nInstance): I18nAdapter {
  return {
    t: (key: string, params?: Record<string, unknown>) => i18n.t(key, params),
    hasKey: (key: string) => i18n.hasKey(key),
  }
}
