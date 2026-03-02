import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Goal, JournalEntry, Status } from '../types'
import CategoryBadge from '../components/CategoryBadge'
import MetricLineChart from '../components/MetricLineChart'
import JournalEntryForm from '../components/JournalEntryForm'

interface Props {
  goal: Goal
  onAddEntry: (goalId: string, entry: Omit<JournalEntry, 'id'>) => void
  onUpdateStatus: (goalId: string, status: Status) => void
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getMetricKeys(goal: Goal): string[] {
  const keys = new Set<string>()
  for (const entry of goal.entries) {
    for (const key of Object.keys(entry.metrics)) {
      if (entry.metrics[key] !== undefined) keys.add(key)
    }
  }
  return Array.from(keys)
}

function MetricBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-700/60 border border-slate-600 rounded-full px-2.5 py-1 text-xs font-medium text-slate-300">
      <span className="text-slate-500">{label}:</span>
      <span className="text-emerald-400 font-semibold">{value}</span>
    </span>
  )
}

export default function GoalDetail({ goal, onAddEntry, onUpdateStatus }: Props) {
  const navigate = useNavigate()
  const [showEntryForm, setShowEntryForm] = useState(false)

  const sortedEntries = [...goal.entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const metricKeys = getMetricKeys(goal)
  const hasMetrics = metricKeys.length > 0

  function handleSaveEntry(entry: Omit<JournalEntry, 'id'>) {
    onAddEntry(goal.id, entry)
    setShowEntryForm(false)
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/90 backdrop-blur border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5 text-sm"
            aria-label="Back to dashboard"
            data-testid="back-btn"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Dashboard
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-slate-300 font-medium truncate">{goal.title}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Goal Meta */}
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="text-2xl font-bold text-slate-100">{goal.title}</h1>
                <CategoryBadge category={goal.category} size="md" />
              </div>
              {goal.description && (
                <p className="text-slate-400 text-sm mt-2">{goal.description}</p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                {goal.targetDate && (
                  <span>
                    🎯 Target:{' '}
                    <span className="text-slate-300">
                      {formatDate(goal.targetDate)}
                    </span>
                  </span>
                )}
                <span>
                  📅 Started:{' '}
                  <span className="text-slate-300">
                    {formatDate(goal.createdAt)}
                  </span>
                </span>
              </div>
            </div>

            {/* Status Controls */}
            <div className="flex flex-col gap-2 shrink-0">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold text-center ${
                  goal.status === 'active'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : goal.status === 'completed'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-slate-600/40 text-slate-400 border border-slate-600'
                }`}
                data-testid="goal-status-badge"
              >
                {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
              </span>
              {goal.status === 'active' && (
                <button
                  onClick={() => onUpdateStatus(goal.id, 'completed')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors whitespace-nowrap"
                  data-testid="mark-complete-btn"
                >
                  Mark Complete
                </button>
              )}
              {goal.status !== 'archived' && (
                <button
                  onClick={() => onUpdateStatus(goal.id, 'archived')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 border border-slate-700 hover:text-slate-300 hover:border-slate-500 transition-colors whitespace-nowrap"
                  data-testid="archive-btn"
                >
                  Archive
                </button>
              )}
              {goal.status !== 'active' && (
                <button
                  onClick={() => onUpdateStatus(goal.id, 'active')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors whitespace-nowrap"
                  data-testid="reactivate-btn"
                >
                  Reactivate
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Chart Section */}
        <section className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-slate-200 mb-4">
            Progress Chart
          </h2>
          {hasMetrics ? (
            <div className="space-y-6">
              {metricKeys.map((key) => (
                <MetricLineChart key={key} entries={goal.entries} metricKey={key} />
              ))}
            </div>
          ) : (
            <div
              className="flex items-center justify-center h-32 text-slate-500 text-sm"
              data-testid="no-metrics-message"
            >
              No metrics recorded yet — add a journal entry with metric values to see your trend.
            </div>
          )}
        </section>

        {/* Add Entry Button / Form */}
        <section>
          {showEntryForm ? (
            <JournalEntryForm
              onSave={handleSaveEntry}
              onCancel={() => setShowEntryForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowEntryForm(true)}
              className="w-full py-3 rounded-xl border-2 border-dashed border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors text-sm font-medium"
              data-testid="add-entry-btn"
            >
              + Add Journal Entry
            </button>
          )}
        </section>

        {/* Journal Feed */}
        <section>
          <h2 className="text-base font-semibold text-slate-200 mb-4">
            Journal ({goal.entries.length})
          </h2>
          {sortedEntries.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              No entries yet. Start journaling your progress!
            </p>
          ) : (
            <div className="space-y-4" data-testid="journal-feed">
              {sortedEntries.map((entry) => {
                const metricEntries = Object.entries(entry.metrics).filter(
                  ([, v]) => v !== undefined
                ) as [string, number][]

                return (
                  <article
                    key={entry.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-5 border-l-4"
                    style={{ borderLeftColor: '#10B981' }}
                    data-testid={`journal-entry-${entry.id}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <time className="text-xs font-medium text-slate-400">
                        {formatDate(entry.date)}
                      </time>
                    </div>
                    <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {entry.text}
                    </p>
                    {metricEntries.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {metricEntries.map(([key, value]) => (
                          <MetricBadge
                            key={key}
                            label={key.charAt(0).toUpperCase() + key.slice(1)}
                            value={value}
                          />
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
