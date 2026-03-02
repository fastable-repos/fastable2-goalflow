import { useState, type FormEvent } from 'react'
import type { Category } from '../types'

interface FormData {
  title: string
  category: Category
  description: string
  targetDate: string
}

interface Errors {
  title?: string
  targetDate?: string
}

interface Props {
  onSave: (data: FormData) => void
  onClose: () => void
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'fitness', label: 'Fitness' },
  { value: 'habit', label: 'Habit' },
  { value: 'learning', label: 'Learning' },
]

export default function NewGoalModal({ onSave, onClose }: Props) {
  const [form, setForm] = useState<FormData>({
    title: '',
    category: 'fitness',
    description: '',
    targetDate: '',
  })
  const [errors, setErrors] = useState<Errors>({})

  function validate(): boolean {
    const e: Errors = {}
    if (!form.title.trim()) e.title = 'Goal title is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit(evt: FormEvent) {
    evt.preventDefault()
    if (!validate()) return
    onSave(form)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      data-testid="new-goal-modal"
    >
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">New Goal</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-slate-400 hover:text-slate-200 transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-1">
            <label
              htmlFor="goal-title"
              className="text-sm font-medium text-slate-300"
            >
              Goal Title <span className="text-red-400">*</span>
            </label>
            <input
              id="goal-title"
              type="text"
              placeholder="e.g. Morning Run"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            {errors.title && (
              <p
                className="text-red-400 text-xs"
                data-testid="title-error"
                role="alert"
              >
                {errors.title}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1">
            <span className="text-sm font-medium text-slate-300">Category</span>
            <div
              className="flex gap-2"
              role="group"
              aria-label="Category selection"
            >
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, category: value })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.category === value
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-400'
                  }`}
                  data-testid={`category-${value}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label
              htmlFor="goal-description"
              className="text-sm font-medium text-slate-300"
            >
              Description
            </label>
            <textarea
              id="goal-description"
              rows={3}
              placeholder="What do you want to achieve?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Target Date */}
          <div className="space-y-1">
            <label
              htmlFor="goal-target-date"
              className="text-sm font-medium text-slate-300"
            >
              Target Date
            </label>
            <input
              id="goal-target-date"
              type="date"
              value={form.targetDate}
              onChange={(e) =>
                setForm({ ...form, targetDate: e.target.value })
              }
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white transition-colors"
              data-testid="save-goal-btn"
            >
              Save Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
