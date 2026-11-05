export type AssetTypeOption = { key: string; name: string; isActive: boolean; assetCount?: number }
export const defaultAssetTypes: AssetTypeOption[] = [
  { key: 'VEHICLE', name: 'Vehicle', isActive: true },
  { key: 'EQUIPMENT', name: 'Equipment', isActive: true },
  { key: 'TOOL', name: 'Tool', isActive: true },
  { key: 'TECHNOLOGY', name: 'Technology', isActive: true },
]
export const assetTypeLabel = (key: string, types: AssetTypeOption[] = defaultAssetTypes) => types.find(type => type.key === key)?.name || key.replaceAll('_', ' ')
