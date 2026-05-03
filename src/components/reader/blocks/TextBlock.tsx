import type { TextBlock as TextBlockType, StoryBlock as StoryBlockType } from '@/lib/content/types'

interface Props {
  block: TextBlockType | StoryBlockType
}

export default function TextBlock({ block }: Props) {
  const isStory = block.type === 'story'

  return (
    <div className="mb-6">
      {block.section && (
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: '#c9a84c' }}
        >
          {block.section}
        </p>
      )}
      <div
        className="text-base leading-relaxed whitespace-pre-line"
        style={{
          color: isStory ? '#9ca3af' : '#d1d5db',
          fontStyle: isStory ? 'italic' : 'normal',
        }}
      >
        {block.value}
      </div>
    </div>
  )
}
