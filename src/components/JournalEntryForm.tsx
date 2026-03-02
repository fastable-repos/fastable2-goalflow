import { useState, type FormEvent } from 'react'
import type { JournalEntry, Metrics } from '../types'

interface Props {
  onSave: (entry: Omit<JournalEntry, 'id'>) => void
  onCancel: () => void
}

export default function JournalEntryForm({ onSave, onCancel }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [text, setText] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [mood, setMood] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(evt: FormEvent) {
    evt.preventDefault()
    if (!text.trim()) {
      setError('Please write something in your journal entry')
      return
    }
    setError('')

    const metrics: Metrics = {}
    if (weight !== '' && !isNaN(Number(weight))) metrics.weight = Number(weight)
    if (reps !== '' && !isNaN(Number(reps))) metrics.reps = Number(reps)
    if (mood !== '' && !isNaN(Number(mood))) metrics.mood = Number(mood)

    onSave({
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      text: text.trim(),
      metrics,
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 space-y-4"
      data-testid="journal-entry-form"
    >
      <h3 className="text-sm font-semibold text-slate-200">Add Journal Entry</h3>

      {/* Date */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-400" htmlFor="entry-date">
          Date
        </label>
        <input
          id="entry-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Journal Text */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-slate-400" htmlFor="entry-text">
          Journal Entry <span className="text-red-400">*</span>
        </label>
        <textarea
          id="entry-text"
          rows={4}
          placeholder="Write about your progress, thoughts, and experiences..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
          data-testid="entry-text-input"
        />
        {error && (
          <p className="text-red-400 text-xs" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-slate-400">
          Metrics (optional)
        </span>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label
              htmlFor="entry-weight"
              className="text-xs text-slate-500"
            >
              Weight (lbs)
            </label>
            <input
              id="entry-weight"
              type="number"
              step="0.1"
              min="0"
              placeholder="—"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              data-testid="entry-weight-input"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="entry-reps" className="text-xs text-slate-500">
              Reps
            </label>
            <input
              id="entry-reps"
              type="number"
              min="0"
              placeholder="—"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              data-testid="entry-reps-input"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="entry-mood" className="text-xs text-slate-500">
              Mood (1–10)
            </label>
            <input
              id="entry-mood"
              type="number"
              min="1"
              max="10"
              step="1"
              placeholder="—"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              data-testid="entry-mood-input"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg text-sm font-medium border border-slate-600 text-slate-400 hover:bg-slate-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition-colors"
          data-testid="save-entry-btn"
        >
          Save Entry
        </button>
      </div>
    </form>
  )
}
