'use client'

import { useState, useEffect } from 'react'

interface ProjectInfo {
  name: string
  path: string
  tech: string[]
  claudeSummaries: string[]
  hasGit: boolean
  lastCommitDate?: string
  lastCommitMessage?: string
  description?: string
  generatedSummary: string
  summaryNeedsReview: boolean
  status: 'active' | 'complete' | 'experiment' | 'archived' | 'unknown'
  portfolioWorthy: boolean
  featured: boolean
  notes: string
}

type StatusFilter = 'all' | 'active' | 'complete' | 'experiment' | 'archived' | 'unknown' | 'needs-review'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  complete: 'bg-blue-100 text-blue-800',
  experiment: 'bg-purple-100 text-purple-800',
  archived: 'bg-gray-100 text-gray-800',
  unknown: 'bg-yellow-100 text-yellow-800',
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ProjectInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [expandedProject, setExpandedProject] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  async function fetchProjects() {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/projects')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjects(data.projects)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function updateProject(name: string, updates: Partial<ProjectInfo>) {
    setProjects(prev =>
      prev.map(p => (p.name === name ? { ...p, ...updates } : p))
    )
  }

  async function saveProjects() {
    try {
      setSaving(true)
      const res = await fetch('/api/admin/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects })
      })
      if (!res.ok) throw new Error('Failed to save')
      const data = await res.json()
      setLastSaved(new Date().toLocaleTimeString())
    } catch (err) {
      setError('Failed to save projects')
    } finally {
      setSaving(false)
    }
  }

  const filteredProjects = projects.filter(p => {
    let matchesFilter = false
    if (filter === 'all') matchesFilter = true
    else if (filter === 'needs-review') matchesFilter = p.summaryNeedsReview
    else matchesFilter = p.status === filter

    const matchesSearch =
      searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tech.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.claudeSummaries.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())) ||
      p.generatedSummary.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const statusCounts = {
    all: projects.length,
    'needs-review': projects.filter(p => p.summaryNeedsReview).length,
    active: projects.filter(p => p.status === 'active').length,
    complete: projects.filter(p => p.status === 'complete').length,
    experiment: projects.filter(p => p.status === 'experiment').length,
    archived: projects.filter(p => p.status === 'archived').length,
    unknown: projects.filter(p => p.status === 'unknown').length,
  }

  const featuredCount = projects.filter(p => p.featured).length
  const portfolioCount = projects.filter(p => p.portfolioWorthy).length

  if (loading) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Project Review</h1>
        <p className="text-[var(--muted)]">Scanning projects...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">Project Review</h1>
        <p className="text-red-600">Error: {error}</p>
      </main>
    )
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Project Review</h1>
        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-sm text-green-600">Saved at {lastSaved}</span>
          )}
          <button
            onClick={saveProjects}
            disabled={saving}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
      <p className="text-[var(--muted)] mb-8">
        Review and catalog your projects for portfolio and pattern reuse
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-3xl font-bold">{projects.length}</div>
          <div className="text-sm text-[var(--muted)]">Total Projects</div>
        </div>
        <div
          className="bg-orange-50 rounded-lg p-4 cursor-pointer hover:bg-orange-100 transition-colors"
          onClick={() => setFilter('needs-review')}
        >
          <div className="text-3xl font-bold text-orange-600">{statusCounts['needs-review']}</div>
          <div className="text-sm text-orange-700">Needs Review</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-3xl font-bold">{projects.filter(p => p.claudeSummaries.length > 0).length}</div>
          <div className="text-sm text-[var(--muted)]">With Claude History</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-[var(--accent)]">{featuredCount}</div>
          <div className="text-sm text-[var(--muted)]">Featured</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-3xl font-bold">{portfolioCount}</div>
          <div className="text-sm text-[var(--muted)]">Portfolio Worthy</div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search projects, tech, or summaries..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'needs-review', 'unknown', 'active', 'complete', 'experiment', 'archived'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                filter === status
                  ? status === 'needs-review'
                    ? 'bg-orange-500 text-white'
                    : 'bg-[var(--foreground)] text-white'
                  : status === 'needs-review'
                    ? 'bg-orange-100 hover:bg-orange-200 text-orange-800'
                    : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {status === 'needs-review' ? 'Needs Review' : status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status]})
            </button>
          ))}
        </div>
      </div>

      {/* Project List */}
      <div className="space-y-3">
        {filteredProjects.map(project => (
          <div
            key={project.name}
            className="border border-[var(--border)] rounded-lg overflow-hidden"
          >
            {/* Header Row */}
            <div
              className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedProject(expandedProject === project.name ? null : project.name)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium">{project.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>
                    {project.status}
                  </span>
                  {project.summaryNeedsReview && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">
                      Needs Review
                    </span>
                  )}
                  {project.featured && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800">
                      Featured
                    </span>
                  )}
                  {project.portfolioWorthy && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                      Portfolio
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--muted)] truncate">{project.generatedSummary}</p>
              </div>

              <div className="hidden md:flex items-center gap-2 flex-wrap justify-end max-w-xs">
                {project.tech.slice(0, 4).map(t => (
                  <span key={t} className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                    {t}
                  </span>
                ))}
                {project.tech.length > 4 && (
                  <span className="text-xs text-[var(--muted)]">+{project.tech.length - 4}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {project.claudeSummaries.length > 0 && (
                  <span className="text-xs text-[var(--muted)]" title="Claude conversations">
                    {project.claudeSummaries.length} convos
                  </span>
                )}
                <svg
                  className={`w-5 h-5 transition-transform ${expandedProject === project.name ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            {/* Expanded Content */}
            {expandedProject === project.name && (
              <div className="border-t border-[var(--border)] p-4 bg-gray-50 space-y-4">
                {/* Summary */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Summary</h4>
                  <textarea
                    value={project.generatedSummary}
                    onChange={e => updateProject(project.name, {
                      generatedSummary: e.target.value,
                      summaryNeedsReview: false
                    })}
                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded bg-white resize-none"
                    rows={2}
                  />
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-4">
                  <select
                    value={project.status}
                    onChange={e => updateProject(project.name, { status: e.target.value as ProjectInfo['status'] })}
                    className="text-sm px-3 py-1 border border-[var(--border)] rounded bg-white"
                  >
                    <option value="unknown">Unknown</option>
                    <option value="active">Active</option>
                    <option value="complete">Complete</option>
                    <option value="experiment">Experiment</option>
                    <option value="archived">Archived</option>
                  </select>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={project.summaryNeedsReview}
                      onChange={e => updateProject(project.name, { summaryNeedsReview: e.target.checked })}
                      className="rounded accent-orange-500"
                    />
                    Needs Review
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={project.portfolioWorthy}
                      onChange={e => updateProject(project.name, { portfolioWorthy: e.target.checked })}
                      className="rounded"
                    />
                    Portfolio Worthy
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={project.featured}
                      onChange={e => updateProject(project.name, { featured: e.target.checked })}
                      className="rounded"
                    />
                    Featured on Site
                  </label>
                </div>

                {/* Tech Stack */}
                {project.tech.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Tech Stack</h4>
                    <div className="flex flex-wrap gap-2">
                      {project.tech.map(t => (
                        <span key={t} className="text-xs px-2 py-1 bg-white border border-[var(--border)] rounded">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Git Info */}
                {project.hasGit && project.lastCommitDate && (
                  <div>
                    <h4 className="text-sm font-medium mb-1">Last Commit</h4>
                    <p className="text-sm text-[var(--muted)]">
                      {new Date(project.lastCommitDate).toLocaleDateString()} - {project.lastCommitMessage}
                    </p>
                  </div>
                )}

                {/* Claude Summaries */}
                {project.claudeSummaries.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Claude Conversation History ({project.claudeSummaries.length})
                    </h4>
                    <ul className="text-sm text-[var(--muted)] space-y-1 max-h-40 overflow-y-auto">
                      {project.claudeSummaries.map((summary, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[var(--accent)]">•</span>
                          {summary}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Notes</h4>
                  <textarea
                    value={project.notes}
                    onChange={e => updateProject(project.name, { notes: e.target.value })}
                    placeholder="Add notes about this project..."
                    className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded bg-white resize-none"
                    rows={2}
                  />
                </div>

                {/* Path */}
                <div className="text-xs text-[var(--muted)]">
                  Path: {project.path}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <p className="text-center text-[var(--muted)] py-8">No projects match your search.</p>
      )}
    </main>
  )
}
