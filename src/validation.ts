/**
 * Dialogue validation utilities
 */

import type { DialogueDefinition, ValidationResult } from './types'

/**
 * Validates a dialogue definition for structural integrity
 */
export function validateDialogue(dialogue: DialogueDefinition): ValidationResult {
  const errors: string[] = []

  // Check if dialogue has nodes
  if (!dialogue.nodes || Object.keys(dialogue.nodes).length === 0) {
    errors.push('Dialogue must have at least one node')
    return { valid: false, errors }
  }

  // Check if start node exists
  if (!dialogue.nodes[dialogue.startNode]) {
    errors.push(`Start node "${dialogue.startNode}" not found in nodes`)
  }

  // Track reachable nodes
  const reachable = new Set<string>()
  const toVisit = [dialogue.startNode]

  while (toVisit.length > 0) {
    const nodeId = toVisit.pop()
    if (!nodeId || reachable.has(nodeId)) continue

    reachable.add(nodeId)

    const node = dialogue.nodes[nodeId]
    if (!node) continue

    // Check choices target valid nodes
    if (node.choices) {
      for (const choice of node.choices) {
        if (!dialogue.nodes[choice.next]) {
          errors.push(`Choice in node "${nodeId}" targets non-existent node "${choice.next}"`)
        } else if (!reachable.has(choice.next)) {
          toVisit.push(choice.next)
        }
      }
    }

    // Check auto-advance target
    if (node.next && !dialogue.nodes[node.next]) {
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
