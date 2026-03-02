import type { Category } from '../types'

const CONFIG: Record<Category, { label: string; className: string }> = {
  fitness: {
    label: 'Fitness',
    className: 'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  },
  habit: {
    label: 'Habit',
    className: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
  },
  learning: {
    label: 'Learning',
    className: 'bg-purple-500/20 text-purple-300 ring-purple-500/30',
  },
}

interface Props {
  category: Category
  size?: 'sm' | 'md'
}

export default function CategoryBadge({ category, size = 'sm' }: Props) {
  const { label, className } = CONFIG[category]
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1'
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ring-1 ring-inset ${className} ${sizeClass}`}
    >
      {label}
    </span>
  )
}
