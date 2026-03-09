'use client'

interface FileTag {
  id: string
  name: string
  color: string
}

interface FileTagPillsProps {
  tags: FileTag[]
  maxVisible?: number
  size?: 'xs' | 'sm'
}

export function FileTagPills({
  tags,
  maxVisible = 3,
  size = 'xs'
}: FileTagPillsProps) {
  if (!tags || tags.length === 0) {
    return null
  }

  const visibleTags = tags.slice(0, maxVisible)
  const remainingCount = tags.length - maxVisible

  const isXs = size === 'xs'

  return (
    <div className="flex flex-wrap gap-0.5 items-center">
      {visibleTags.map(tag => (
        <span
          key={tag.id}
          className={`inline-flex items-center rounded-full font-medium ${
            isXs ? 'px-1 py-0 text-[9px]' : 'px-1.5 py-0.5 text-[10px]'
          }`}
          style={{
            backgroundColor: `${tag.color}20`,
            color: tag.color
          }}
          title={tag.name}
        >
          {tag.name}
        </span>
      ))}
      {remainingCount > 0 && (
        <span
          className={`inline-flex items-center rounded-full bg-gray-100 text-gray-600 font-medium ${
            isXs ? 'px-1 py-0 text-[9px]' : 'px-1.5 py-0.5 text-[10px]'
          }`}
          title={tags.slice(maxVisible).map(t => t.name).join(', ')}
        >
          +{remainingCount}
        </span>
      )}
    </div>
  )
}
