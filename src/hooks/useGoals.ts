import { useState, useCallback } from 'react'
import type { Goal, JournalEntry, Status } from '../types'

const STORAGE_KEY = 'goalflow_goals'
const SETTINGS_KEY = 'goalflow_settings'

function loadGoals(): Goal[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Goal[]
  } catch (err) {
    console.error('Failed to load goals from localStorage', err)
    return []
  }
}

function saveGoals(goals: Goal[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals))
  } catch (err) {
    console.error('Failed to save goals to localStorage', err)
  }
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>(loadGoals)

  const persist = useCallback((updated: Goal[]) => {
    saveGoals(updated)
    setGoals(updated)
  }, [])

  const addGoal = useCallback(
    (draft: Omit<Goal, 'id' | 'createdAt' | 'entries' | 'status'>) => {
      const newGoal: Goal = {
        ...draft,
        id: crypto.randomUUID(),
        status: 'active',
        createdAt: new Date().toISOString(),
        entries: [],
      }
      persist([...goals, newGoal])
      return newGoal
    },
    [goals, persist]
  )

  const updateGoalStatus = useCallback(
    (goalId: string, status: Status) => {
      const updated = goals.map((g) =>
        g.id === goalId ? { ...g, status } : g
      )
      persist(updated)
    },
    [goals, persist]
  )

  const addEntry = useCallback(
    (goalId: string, entry: Omit<JournalEntry, 'id'>) => {
      const newEntry: JournalEntry = {
        ...entry,
        id: crypto.randomUUID(),
      }
      const updated = goals.map((g) =>
        g.id === goalId ? { ...g, entries: [...g.entries, newEntry] } : g
      )
      persist(updated)
      return newEntry
    },
    [goals, persist]
  )

  const exportData = useCallback(() => {
    try {
      const data = {
        goals,
        exportedAt: new Date().toISOString(),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `goalflow-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      const settings = { exportedAt: new Date().toISOString() }
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch (err) {
      console.error('Failed to export data', err)
    }
  }, [goals])

  const importData = useCallback(
    (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const content = e.target?.result as string
            const parsed = JSON.parse(content)
            const imported = parsed.goals as Goal[]
            if (!Array.isArray(imported)) {
              throw new Error('Invalid backup format: missing goals array')
            }
            persist(imported)
            resolve()
          } catch (err) {
            console.error('Failed to import data', err)
            reject(err)
          }
        }
        reader.onerror = () => {
          const err = new Error('Failed to read file')
          console.error(err)
          reject(err)
        }
        reader.readAsText(file)
      })
    },
    [persist]
  )

  const getGoal = useCallback(
    (goalId: string) => goals.find((g) => g.id === goalId),
    [goals]
  )

  return {
    goals,
    addGoal,
    updateGoalStatus,
    addEntry,
    exportData,
    importData,
    getGoal,
  }
}
