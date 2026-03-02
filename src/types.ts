export type Category = 'fitness' | 'habit' | 'learning'
export type Status = 'active' | 'completed' | 'archived'

export interface Metrics {
  weight?: number
  reps?: number
  mood?: number
  [key: string]: number | undefined
}

export interface JournalEntry {
  id: string
  date: string // ISO string
  text: string
  metrics: Metrics
}

export interface Goal {
  id: string
  title: string
  category: Category
  description: string
  targetDate: string // ISO string
  status: Status
  createdAt: string // ISO string
  entries: JournalEntry[]
}

export interface Settings {
  exportedAt?: string
}
