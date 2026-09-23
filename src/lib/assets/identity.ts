export class AssetIdentityValidationError extends Error {}

function optionalText(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') throw new AssetIdentityValidationError(`${label} must be text`)
  const text = value.trim()
  if (text.length > 100) throw new AssetIdentityValidationError(`${label} must be 100 characters or fewer`)
  return text || null
}

// Undefined means "leave unchanged" for PATCH; blank or null clears the field.
export function parseAssetIdentity(body: { equipmentId?: unknown; category?: unknown }) {
  return {
    equipmentId: optionalText(body.equipmentId, 'Equipment ID'),
    category: optionalText(body.category, 'Category'),
  }
}
