import React, { useState, useRef } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom'

// ─── Types ───────────────────────────────────────────────────────────────────

type Category = 'fitness' | 'habit' | 'learning'
type Status = 'active' | 'completed' | 'archived'

interface Metrics {
  weight?: number
  reps?: number
  mood?: number
  [key: string]: number | undefined
}

interface JournalEntry {
  id: string
  date: string
  text: string
  metrics: Metrics
}

interface Goal {
  id: string
  title: string
  category: Category
  description: string
  targetDate: string
  status: Status
  createdAt: string
  entries: JournalEntry[]
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'goalflow_goals'

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Goal[]
  } catch (e) {
    console.error('Failed to load goals:', e)
    return []
  }
}

function saveGoals(goals: Goal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  } catch (e) {
    console.error('Failed to save goals:', e)
  }
}

function generateId(): string {
  return crypto.randomUUID()
}

// ─── Category styling ────────────────────────────────────────────────────────

const categoryColors: Record<Category, { bg: string; text: string; border: string }> = {
  fitness: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  habit: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  learning: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
}

// ─── SVG Sparkline ───────────────────────────────────────────────────────────

function Sparkline({ data, width = 80, height = 32 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * height
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline fill="none" stroke="#10B981" strokeWidth="1.5" points={points} />
    </svg>
  )
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

function LineChart({ entries, metricKey }: { entries: JournalEntry[]; metricKey: string }) {
  const data = entries
    .filter((e) => e.metrics[metricKey] !== undefined)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ date: e.date, value: e.metrics[metricKey] as number }))

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-48 text-slate-500 text-sm"
        data-testid="empty-chart-state"
      >
        No metrics recorded yet
      </div>
    )
  }

  const W = 500
  const H = 200
  const pad = { top: 20, right: 20, bottom: 40, left: 50 }
  const cW = W - pad.left - pad.right
  const cH = H - pad.top - pad.bottom

  const vals = data.map((d) => d.value)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const rangeV = maxV - minV || 1

  const toX = (i: number) => (data.length === 1 ? cW / 2 : (i / (data.length - 1)) * cW)
  const toY = (v: number) => cH - ((v - minV) / rangeV) * cH

  const points = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(' ')
  const yTicks = [minV, (minV + maxV) / 2, maxV]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      <g transform={`translate(${pad.left},${pad.top})`}>
        {/* Grid + Y labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={0} y1={toY(tick)} x2={cW} y2={toY(tick)}
              stroke="#334155" strokeWidth="1" strokeDasharray="4"
            />
            <text x={-8} y={toY(tick) + 4} textAnchor="end" fill="#94a3b8" fontSize="11">
              {Math.round(tick)}
            </text>
          </g>
        ))}

        {/* Line */}
        <polyline fill="none" stroke="#10B981" strokeWidth="2" points={points} />

        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.value)} r="4" fill="#10B981" />
        ))}

        {/* X labels */}
        {data.map((d, i) => (
          <text key={i} x={toX(i)} y={cH + 20} textAnchor="middle" fill="#94a3b8" fontSize="10">
            {d.date.slice(5)}
          </text>
        ))}

        {/* Axes */}
        <line x1={0} y1={0} x2={0} y2={cH} stroke="#475569" strokeWidth="1" />
        <line x1={0} y1={cH} x2={cW} y2={cH} stroke="#475569" strokeWidth="1" />

        {/* Legend */}
        <text x={cW / 2} y={-5} textAnchor="middle" fill="#94a3b8" fontSize="11">
          {metricKey}
        </text>
      </g>
    </svg>
  )
}

// ─── New Goal Modal ───────────────────────────────────────────────────────────

interface NewGoalModalProps {
  onClose: () => void
  onSave: (goal: Goal) => void
}

function NewGoalModal({ onClose, onSave }: NewGoalModalProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('fitness')
  const [description, setDescription] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title = 'Title is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return
    onSave({
      id: generateId(),
      title: title.trim(),
      category,
      description,
      targetDate,
      status: 'active',
      createdAt: new Date().toISOString(),
      entries: [],
    })
    onClose()
  }

  const cats: Category[] = ['fitness', 'habit', 'learning']

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
        data-testid="new-goal-modal"
      >
        <h2 className="text-xl font-bold text-white mb-6">New Goal</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Goal Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-600"
              placeholder="e.g., Morning Run"
              data-testid="goal-title-input"
            />
            {errors.title && (
              <p className="text-red-400 text-xs mt-1" data-testid="title-error">
                {errors.title}
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
            <div className="flex gap-2">
              {cats.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex-1 py-2 rounded-lg capitalize text-sm font-medium border transition-all ${
                    category === cat
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-slate-700 text-slate-300 border-slate-600 hover:border-emerald-500/50'
                  }`}
                  data-testid={`category-${cat}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-600 resize-none"
              placeholder="What do you want to achieve?"
              rows={3}
              data-testid="goal-description-input"
            />
          </div>

          {/* Target Date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Target Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-600"
              data-testid="goal-target-date-input"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
            data-testid="modal-cancel-btn"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors font-medium"
            data-testid="modal-save-btn"
          >
            Save Goal
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

function GoalCard({ goal, onClick }: { goal: Goal; onClick: () => void }) {
  const colors = categoryColors[goal.category]
  const sorted = [...goal.entries].sort((a, b) => b.date.localeCompare(a.date))
  const latest = sorted[0]

  const allMetricKeys = Array.from(new Set(goal.entries.flatMap((e) => Object.keys(e.metrics))))
  const firstKey = allMetricKeys[0]
  const sparkData = firstKey
    ? goal.entries
        .filter((e) => e.metrics[firstKey] !== undefined)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((e) => e.metrics[firstKey] as number)
    : []

  const daysSince =
    latest
      ? Math.floor((Date.now() - new Date(latest.date).getTime()) / (1000 * 60 * 60 * 24))
      : null

  return (
    <div
      className="bg-slate-800 rounded-xl p-5 cursor-pointer hover:ring-2 hover:ring-emerald-500/30 shadow-lg transition-all"
      onClick={onClick}
      data-testid="goal-card"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-white font-semibold text-base leading-tight flex-1 mr-2">{goal.title}</h3>
        <span
          className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border} shrink-0`}
        >
          {goal.category}
        </span>
      </div>

      {goal.targetDate && <p className="text-slate-500 text-xs mb-2">Target: {goal.targetDate}</p>}

      {latest && <p className="text-slate-400 text-sm line-clamp-1 mb-3">{latest.text}</p>}

      <div className="flex items-end justify-between">
        <div>
          {daysSince !== null && (
            <p className="text-slate-500 text-xs">
              {daysSince === 0 ? 'Updated today' : `${daysSince}d since update`}
            </p>
          )}
        </div>
        {sparkData.length >= 2 && <Sparkline data={sparkData} />}
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface DashboardProps {
  goals: Goal[]
  setGoals: (goals: Goal[]) => void
}

function Dashboard({ goals, setGoals }: DashboardProps) {
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<Status>('active')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleNewGoal(goal: Goal) {
    const next = [...goals, goal]
    setGoals(next)
    saveGoals(next)
  }

  function handleExport() {
    try {
      const blob = new Blob([JSON.stringify(goals, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'goalflow-backup.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Export failed:', e)
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string) as Goal[]
        setGoals(parsed)
        saveGoals(parsed)
      } catch (err) {
        console.error('Import failed:', err)
      }
    }
    reader.readAsText(file)
    // Reset so same file can be re-imported
    e.target.value = ''
  }

  const filtered = goals.filter((g) => {
    if (g.status !== statusFilter) return false
    if (categoryFilter !== 'all' && g.category !== categoryFilter) return false
    return true
  })

  const catOptions: { value: Category | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'habit', label: 'Habit' },
    { value: 'learning', label: 'Learning' },
  ]

  const statusOptions: { value: Status; label: string }[] = [
    { value: 'active', label: 'Active' },
    { value: 'completed', label: 'Completed' },
    { value: 'archived', label: 'Archived' },
  ]

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <h1 className="text-2xl font-bold text-emerald-400">GoalFlow</h1>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
            data-testid="import-file-input"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm font-medium transition-colors"
            data-testid="import-btn"
          >
            Import
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 text-sm font-medium transition-colors"
            data-testid="export-btn"
          >
            Export
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50">
        <div className="flex gap-2 mb-3 flex-wrap">
          {catOptions.map((c) => (
            <button
              key={c.value}
              onClick={() => setCategoryFilter(c.value)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                categoryFilter === c.value
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
              data-testid={`filter-category-${c.value}`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {statusOptions.map((s) => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                statusFilter === s.value
                  ? 'bg-slate-600 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
              data-testid={`filter-status-${s.value}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Goals Grid */}
      <main className="px-6 py-6">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500" data-testid="empty-state">
            <p className="text-lg mb-2">No goals yet</p>
            <p className="text-sm">Click + to add your first goal</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onClick={() => navigate(`/goals/${goal.id}`)}
              />
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-2xl font-medium shadow-xl flex items-center justify-center transition-all hover:scale-105"
        data-testid="new-goal-fab"
        aria-label="New Goal"
      >
        +
      </button>

      {showModal && (
        <NewGoalModal onClose={() => setShowModal(false)} onSave={handleNewGoal} />
      )}
    </div>
  )
}

// ─── Journal Entry Form ───────────────────────────────────────────────────────

interface JournalEntryFormProps {
  onSave: (entry: JournalEntry) => void
  onCancel: () => void
}

function JournalEntryForm({ onSave, onCancel }: JournalEntryFormProps) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [text, setText] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [mood, setMood] = useState('')

  function handleSave() {
    const metrics: Metrics = {}
    if (weight !== '') metrics.weight = parseFloat(weight)
    if (reps !== '') metrics.reps = parseInt(reps, 10)
    if (mood !== '') metrics.mood = parseInt(mood, 10)

    onSave({ id: generateId(), date, text, metrics })
  }

  return (
    <div
      className="bg-slate-700/50 rounded-xl p-5 space-y-4 border border-slate-600"
      data-testid="journal-entry-form"
    >
      {/* Date */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-slate-600 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-500"
          data-testid="entry-date-input"
        />
      </div>

      {/* Text */}
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">Journal Entry</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          className="w-full bg-slate-600 text-white rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-500 resize-none"
          placeholder="Write about your progress today..."
          data-testid="entry-text-input"
        />
      </div>

      {/* Metrics */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-2">Metrics (optional)</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Weight (lbs)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-slate-600 text-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-500 text-sm"
              placeholder="0"
              data-testid="metric-weight-input"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Reps</label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-full bg-slate-600 text-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-500 text-sm"
              placeholder="0"
              data-testid="metric-reps-input"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Mood (1–10)</label>
            <input
              type="number"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              min="1"
              max="10"
              className="w-full bg-slate-600 text-white rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-emerald-500 border border-slate-500 text-sm"
              placeholder="5"
              data-testid="metric-mood-input"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg bg-slate-600 text-slate-300 hover:bg-slate-500 text-sm transition-colors"
          data-testid="cancel-entry-btn"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="flex-1 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-sm font-medium transition-colors"
          data-testid="save-entry-btn"
        >
          Save Entry
        </button>
      </div>
    </div>
  )
}

// ─── Goal Detail ──────────────────────────────────────────────────────────────

interface GoalDetailProps {
  goals: Goal[]
  setGoals: (goals: Goal[]) => void
}

function GoalDetail({ goals, setGoals }: GoalDetailProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showForm, setShowForm] = useState(false)
  const [activeMetric, setActiveMetric] = useState<string>('mood')

  const goal = goals.find((g) => g.id === id)

  if (!goal) {
    return (
      <div className="min-h-screen bg-[#0F172A] text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Goal not found</p>
          <button
            onClick={() => navigate('/')}
            className="text-emerald-400 hover:underline"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Narrow goal type for use in closures (TypeScript can't narrow across closure boundaries)
  const currentGoal: Goal = goal

  const allMetricKeys = Array.from(new Set(currentGoal.entries.flatMap((e) => Object.keys(e.metrics))))
  const displayMetric = allMetricKeys.includes(activeMetric) ? activeMetric : allMetricKeys[0]

  function handleAddEntry(entry: JournalEntry) {
    const updated: Goal = { ...currentGoal, entries: [...currentGoal.entries, entry] }
    const next = goals.map((g) => (g.id === currentGoal.id ? updated : g))
    setGoals(next)
    saveGoals(next)
    setShowForm(false)
    const keys = Object.keys(entry.metrics)
    if (keys.length > 0) setActiveMetric(keys[0])
  }

  function handleStatus(status: Status) {
    const updated: Goal = { ...currentGoal, status }
    const next = goals.map((g) => (g.id === currentGoal.id ? updated : g))
    setGoals(next)
    saveGoals(next)
  }

  const colors = categoryColors[currentGoal.category]
  const sortedEntries = [...currentGoal.entries].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="min-h-screen bg-[#0F172A] text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center gap-4 sticky top-0 z-10">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 hover:text-white transition-colors text-sm"
          data-testid="back-btn"
        >
          ← Back
        </button>
        <h1 className="text-xl font-bold text-white flex-1 truncate">{currentGoal.title}</h1>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
        >
          {currentGoal.category}
        </span>
      </header>

      <main className="px-6 py-6 max-w-2xl mx-auto space-y-6">
        {/* Meta Card */}
        <div className="bg-slate-800 rounded-xl p-5 space-y-3">
          {currentGoal.description && <p className="text-slate-300 text-sm">{currentGoal.description}</p>}
          {currentGoal.targetDate && (
            <p className="text-slate-500 text-xs">Target: {currentGoal.targetDate}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                currentGoal.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : currentGoal.status === 'completed'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-slate-600 text-slate-400'
              }`}
            >
              {currentGoal.status}
            </span>

            {currentGoal.status === 'active' && (
              <button
                onClick={() => handleStatus('completed')}
                className="text-sm px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 transition-colors"
                data-testid="mark-complete-btn"
              >
                Mark as Completed
              </button>
            )}
            {currentGoal.status !== 'archived' && (
              <button
                onClick={() => handleStatus('archived')}
                className="text-sm px-3 py-1 rounded-full bg-slate-600 text-slate-400 hover:bg-slate-500 transition-colors"
                data-testid="archive-btn"
              >
                Archive
              </button>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Metric Trend</h2>
            {allMetricKeys.length > 0 && (
              <div className="flex gap-2">
                {allMetricKeys.map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveMetric(key)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                      displayMetric === key
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div data-testid="chart-container">
            {displayMetric ? (
              <LineChart entries={currentGoal.entries} metricKey={displayMetric} />
            ) : (
              <div
                className="flex items-center justify-center h-48 text-slate-500 text-sm"
                data-testid="empty-chart-state"
              >
                No metrics recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Add Entry */}
        <div>
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full py-3 rounded-xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 font-medium transition-colors"
              data-testid="add-entry-btn"
            >
              + Add Journal Entry
            </button>
          ) : (
            <JournalEntryForm onSave={handleAddEntry} onCancel={() => setShowForm(false)} />
          )}
        </div>

        {/* Journal Feed */}
        <div className="space-y-4">
          <h2 className="text-white font-semibold">Journal Entries</h2>
          {sortedEntries.length === 0 ? (
            <p className="text-slate-500 text-sm">No entries yet. Start journaling!</p>
          ) : (
            sortedEntries.map((entry) => (
              <div
                key={entry.id}
                className="border-l-2 border-emerald-500/50 pl-4 py-1"
                data-testid="journal-entry"
              >
                <p className="text-slate-500 text-xs mb-1">{entry.date}</p>
                <p className="text-slate-200 text-sm">{entry.text}</p>
                {Object.keys(entry.metrics).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(entry.metrics).map(([key, val]) => (
                      <span
                        key={key}
                        className="px-2 py-0.5 rounded-full bg-slate-700 text-emerald-400 text-xs font-medium"
                      >
                        {key}: {val}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────────

function App() {
  const [goals, setGoals] = useState<Goal[]>(() => loadGoals())

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard goals={goals} setGoals={setGoals} />} />
        <Route path="/goals/:id" element={<GoalDetail goals={goals} setGoals={setGoals} />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
