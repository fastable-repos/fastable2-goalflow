import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Goal, Category, Status } from '../types'
import CategoryBadge from '../components/CategoryBadge'
import Sparkline from '../components/Sparkline'
import NewGoalModal from '../components/NewGoalModal'

type CategoryFilter = 'all' | Category
type StatusFilter = Status

interface Props {
  goals: Goal[]
  onAddGoal: (data: Omit<Goal, 'id' | 'createdAt' | 'entries' | 'status'>) => void
  onExport: () => void
  onImport: (file: File) => Promise<void>
}

function getDaysSince(isoDate: string): number {
  const diff = Date.now() - new Date(isoDate).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

function getSparklineData(goal: Goal): number[] {
  const metricKeys = ['weight', 'reps', 'mood'] as const
  for (const key of metricKeys) {
    const pts = goal.entries
      .filter((e) => e.metrics[key] !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7)
      .map((e) => e.metrics[key] as number)
    if (pts.length > 0) return pts
  }
  return []
}

function GoalCard({
  goal,
  onClick,
}: {
  goal: Goal
  onClick: () => void
}) {
  const lastEntry = goal.entries.length
    ? goal.entries.reduce((latest, e) =>
        new Date(e.date) > new Date(latest.date) ? e : latest
      )
    : null
  const daysSince = lastEntry ? getDaysSince(lastEntry.date) : null
  const sparkData = getSparklineData(goal)

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-xl p-5 transition-all group focus:outline-none focus:ring-2 focus:ring-emerald-500"
      data-testid={`goal-card-${goal.id}`}
      aria-label={`Open goal: ${goal.title}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-slate-100 truncate group-hover:text-emerald-400 transition-colors">
            {goal.title}
          </h3>
          {goal.targetDate && (
            <p className="text-xs text-slate-500 mt-0.5">
              Target:{' '}
              {new Date(goal.targetDate).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
        <CategoryBadge category={goal.category} />
      </div>

      {/* Latest entry snippet */}
      {lastEntry ? (
        <p className="text-sm text-slate-400 line-clamp-2 mb-3">
          {lastEntry.text}
        </p>
      ) : (
        <p className="text-sm text-slate-600 italic mb-3">No entries yet</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-500">
          {daysSince === null
            ? 'No activity'
            : daysSince === 0
              ? 'Updated today'
              : `${daysSince}d ago`}
        </div>
        {sparkData.length > 0 && (
          <Sparkline data={sparkData} width={72} height={24} />
        )}
      </div>
    </button>
  )
}

const CATEGORY_FILTERS: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'habit', label: 'Habit' },
  { value: 'learning', label: 'Learning' },
]

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

export default function Dashboard({ goals, onAddGoal, onExport, onImport }: Props) {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active')
  const [importing, setImporting] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  const filtered = goals.filter((g) => {
    if (g.status !== statusFilter) return false
    if (categoryFilter !== 'all' && g.category !== categoryFilter) return false
    return true
  })

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      await onImport(file)
    } catch {
      // error already logged in hook
    } finally {
      setImporting(false)
      if (importRef.current) importRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-2xl font-bold tracking-tight">
              GoalFlow
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onExport}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-slate-100 transition-colors"
              data-testid="export-btn"
            >
              Export
            </button>
            <button
              onClick={() => importRef.current?.click()}
              disabled={importing}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-slate-100 transition-colors disabled:opacity-50"
              data-testid="import-btn"
            >
              {importing ? 'Importing…' : 'Import'}
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
              data-testid="import-file-input"
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Category chips */}
          <div
            className="flex gap-2 flex-wrap"
            role="group"
            aria-label="Filter by category"
          >
            {CATEGORY_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setCategoryFilter(value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  categoryFilter === value
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
                }`}
                data-testid={`filter-category-${value}`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Status tabs */}
          <div
            className="flex gap-1 bg-slate-800 rounded-lg p-1 ml-auto"
            role="tablist"
            aria-label="Filter by status"
          >
            {STATUS_TABS.map(({ value, label }) => (
              <button
                key={value}
                role="tab"
                aria-selected={statusFilter === value}
                onClick={() => setStatusFilter(value)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  statusFilter === value
                    ? 'bg-slate-600 text-slate-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                data-testid={`filter-status-${value}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Goal grid */}
        {filtered.length === 0 ? (
          <div
            className="text-center py-20 text-slate-500"
            data-testid="empty-state"
          >
            <p className="text-lg font-medium">No goals here yet</p>
            <p className="text-sm mt-1">
              {statusFilter === 'active'
                ? 'Create your first goal to get started'
                : `No ${statusFilter} goals`}
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            data-testid="goals-grid"
          >
            {filtered.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => navigate(`/goal/${goal.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-8 z-30 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white text-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-emerald-500/50"
        aria-label="New Goal"
        data-testid="new-goal-fab"
      >
        +
      </button>

      {/* New Goal Modal */}
      {showModal && (
        <NewGoalModal
          onSave={(data) => {
            onAddGoal(data)
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
