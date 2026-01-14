/**
 * Dialogue validation utilities
 */

import type { DialogueDefinition, ValidationResult } from './types'

/**
 * Set of forbidden keys that could lead to prototype pollution
 */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

/**
 * Safely get a property from an object, preventing prototype pollution
 */
function safeGet<T>(obj: Record<string, T>, key: string): T | undefined {
  if (typeof key !== 'string') return undefined
  if (FORBIDDEN_KEYS.has(key)) return undefined
  if (!Object.hasOwn(obj, key)) return undefined
  return obj[key]
}

/**
 * Validates a dialogue definition for structural integrity
 */
export function validateDialogue(dialogue: DialogueDefinition): ValidationResult {
  const errors: string[] = []

  // Check if dialogue has nodes
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Runtime validation for user-provided data
  if (!dialogue.nodes || Object.keys(dialogue.nodes).length === 0) {
    errors.push('Dialogue must have at least one node')
    return { valid: false, errors }
  }

  // Check if start node exists
  if (!safeGet(dialogue.nodes, dialogue.startNode)) {
    errors.push(`Start node "${dialogue.startNode}" not found in nodes`)
  }

  // Track reachable nodes
  const reachable = new Set<string>()
  const toVisit = [dialogue.startNode]

  while (toVisit.length > 0) {
    const nodeId = toVisit.pop()
    if (!nodeId || reachable.has(nodeId)) continue

    reachable.add(nodeId)

    const node = safeGet(dialogue.nodes, nodeId)
    if (!node) continue

    // Check choices target valid nodes
    if (node.choices) {
      for (const choice of node.choices) {
        if (!safeGet(dialogue.nodes, choice.next)) {
          errors.push(`Choice in node "${nodeId}" targets non-existent node "${choice.next}"`)
        } else if (!reachable.has(choice.next)) {
          toVisit.push(choice.next)
        }
      }
    }

    // Check auto-advance target
    if (node.next && !safeGet(dialogue.nodes, node.next)) {
      errors.push(`Node "${nodeId}" auto-advances to non-existent node "${node.next}"`)
    } else if (node.next && !reachable.has(node.next)) {
      toVisit.push(node.next)
    }
  }

  // Check for orphan nodes (unreachable from start)
  const allNodes = Object.keys(dialogue.nodes)
  const orphans = allNodes.filter(nodeId => !reachable.has(nodeId))

  if (orphans.length > 0) {
    errors.push(`Unreachable nodes: ${orphans.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
