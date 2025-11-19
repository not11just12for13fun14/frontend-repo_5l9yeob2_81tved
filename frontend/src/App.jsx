import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, Flag } from 'lucide-react'

const STATUS = {
  new: { key: 'new', label: 'New Order (Zlecenie)', color: 'bg-gray-100', card: 'bg-white', accent: 'border-gray-300' },
  in_production: { key: 'in_production', label: 'In Production (Realizacja)', color: 'bg-blue-50', card: 'bg-white', accent: 'border-blue-300' },
  completed: { key: 'completed', label: 'Completed (Wykonane)', color: 'bg-green-50', card: 'bg-white', accent: 'border-green-300' },
  error: { key: 'error', label: 'Error Report (Błędne Zgłoszenie)', color: 'bg-orange-50', card: 'bg-white', accent: 'border-orange-300' },
}

const PRIORITY_COLOR = {
  low: 'text-gray-400',
  medium: 'text-yellow-500',
  high: 'text-red-600',
}

function Toolbar({ query, setQuery, onAdd }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 border-b bg-white">
      <div className="relative w-80 max-w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by ID / Title"
          className="w-full pl-9 pr-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300 text-sm"
        />
      </div>
      <button onClick={onAdd} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded shadow-sm">
        <Plus size={16} /> Add New Card
      </button>
    </div>
  )
}

function Avatar({ name, url }) {
  const initials = useMemo(() => name.split(' ').map(p => p[0]).slice(0,2).join('').toUpperCase(), [name])
  return (
    <div className="flex items-center gap-2">
      {url ? (
        <img src={url} alt={name} className="w-6 h-6 rounded-full object-cover" />
      ) : (
        <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 grid place-items-center text-xs font-semibold">{initials}</div>
      )}
      <span className="text-xs text-gray-700">{name}</span>
    </div>
  )
}

function Card({ job, onDragStart }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, job)}
      className={`group ${STATUS[job.status].card} border ${STATUS[job.status].accent} rounded-md p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start justify-between">
        <h4 className="font-medium text-gray-800 text-sm leading-snug">{job.title}</h4>
        <Flag size={16} className={PRIORITY_COLOR[job.priority]} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <Avatar name={job.assigned_to} url={job.avatar_url} />
        <span className="text-xs text-gray-500">Due {new Date(job.due_date).toLocaleDateString()}</span>
      </div>
    </div>
  )
}

function Column({ status, jobs, onDropCard }) {
  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const data = e.dataTransfer.getData('application/json')
    if (!data) return
    const job = JSON.parse(data)
    onDropCard(job)
  }

  return (
    <div className={`flex-1 min-w-[300px] ${STATUS[status].color} rounded-md border ${STATUS[status].accent} p-3`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">{STATUS[status].label}</h3>
        <span className="text-xs text-gray-500">{jobs.length}</span>
      </div>
      <div className="space-y-3">
        {jobs.map(job => (
          <Card key={job.id} job={job} onDragStart={(e, j) => {
            e.dataTransfer.setData('application/json', JSON.stringify(j))
          }} />
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'
  const [query, setQuery] = useState('')
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  const filtered = useMemo(() => {
    if (!query) return jobs
    const q = query.toLowerCase()
    return jobs.filter(j => j.title.toLowerCase().includes(q))
  }, [jobs, query])

  const grouped = useMemo(() => {
    return {
      new: filtered.filter(j => j.status === 'new'),
      in_production: filtered.filter(j => j.status === 'in_production'),
      completed: filtered.filter(j => j.status === 'completed'),
      error: filtered.filter(j => j.status === 'error'),
    }
  }, [filtered])

  const fetchJobs = async () => {
    setLoading(true)
    const res = await fetch(`${baseUrl}/api/jobs`)
    const data = await res.json()
    setJobs(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchJobs()
  }, [])

  const addCard = async () => {
    const today = new Date()
    const due = new Date(today)
    due.setDate(today.getDate() + 7)
    const payload = {
      title: `JOB-${Math.floor(1000 + Math.random()*9000)}`,
      assigned_to: 'Unassigned',
      avatar_url: '',
      due_date: due.toISOString().slice(0,10),
      priority: 'medium',
      status: 'new',
    }
    const res = await fetch(`${baseUrl}/api/jobs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    setJobs(prev => [...prev, data])
  }

  const moveCard = async (job, toStatus) => {
    if (job.status === toStatus) return
    const res = await fetch(`${baseUrl}/api/jobs/${job.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: toStatus }) })
    const updated = await res.json()
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j))
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Toolbar query={query} setQuery={setQuery} onAdd={addCard} />

      <div className="p-4">
        <div className="flex gap-4 overflow-x-auto">
          {(['new','in_production','completed','error']).map((s) => (
            <div key={s} className="min-w-[320px]">
              <Column
                status={s}
                jobs={grouped[s]}
                onDropCard={(job) => moveCard(job, s)}
              />
            </div>
          ))}
        </div>
      </div>

      {loading && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-white/90 border border-gray-200 rounded-md px-4 py-2 shadow-sm text-sm text-gray-700">Loading...</div>
        </div>
      )}
    </div>
  )
}
