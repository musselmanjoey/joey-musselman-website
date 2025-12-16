import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'

const PROJECTS_DIR = 'C:/Users/musse/Projects'
const CLAUDE_PROJECTS_DIR = path.join(os.homedir(), '.claude', 'projects')
const CATALOG_FILE = 'C:/Users/musse/Projects/projects-catalog.json'

interface SavedProjectData {
  status?: string
  summaryNeedsReview?: boolean
  portfolioWorthy?: boolean
  featured?: boolean
  generatedSummary?: string
  notes?: string
}

interface CatalogFile {
  projects: Array<{ name: string } & SavedProjectData>
  lastSaved: string
}

function loadCatalog(): Map<string, SavedProjectData> {
  const catalog = new Map<string, SavedProjectData>()

  if (fs.existsSync(CATALOG_FILE)) {
    try {
      const data: CatalogFile = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'))
      for (const project of data.projects) {
        catalog.set(project.name, {
          status: project.status,
          summaryNeedsReview: project.summaryNeedsReview,
          portfolioWorthy: project.portfolioWorthy,
          featured: project.featured,
          generatedSummary: project.generatedSummary,
          notes: project.notes
        })
      }
    } catch {}
  }

  return catalog
}

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

function detectTechStack(projectPath: string): string[] {
  const tech: string[] = []

  // Check for various config files
  const checks: [string, string[]][] = [
    ['package.json', ['Node.js']],
    ['requirements.txt', ['Python']],
    ['Cargo.toml', ['Rust']],
    ['go.mod', ['Go']],
    ['*.csproj', ['C#', '.NET']],
    ['*.sln', ['.NET']],
    ['pom.xml', ['Java', 'Maven']],
    ['build.gradle', ['Java', 'Gradle']],
  ]

  for (const [file, techs] of checks) {
    if (file.includes('*')) {
      const pattern = file.replace('*', '')
      try {
        const files = fs.readdirSync(projectPath)
        if (files.some(f => f.endsWith(pattern))) {
          tech.push(...techs)
        }
      } catch {}
    } else {
      if (fs.existsSync(path.join(projectPath, file))) {
        tech.push(...techs)
      }
    }
  }

  // Parse package.json for more detail
  const pkgPath = path.join(projectPath, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      const deps = { ...pkg.dependencies, ...pkg.devDependencies }

      if (deps['next']) tech.push('Next.js')
      if (deps['react']) tech.push('React')
      if (deps['vue']) tech.push('Vue')
      if (deps['express']) tech.push('Express')
      if (deps['typescript']) tech.push('TypeScript')
      if (deps['tailwindcss']) tech.push('Tailwind')
      if (deps['prisma'] || deps['@prisma/client']) tech.push('Prisma')
      if (deps['socket.io']) tech.push('Socket.IO')
      if (deps['electron']) tech.push('Electron')
    } catch {}
  }

  // Parse requirements.txt for Python packages
  const reqPath = path.join(projectPath, 'requirements.txt')
  if (fs.existsSync(reqPath)) {
    try {
      const reqs = fs.readFileSync(reqPath, 'utf-8')
      if (reqs.includes('flask')) tech.push('Flask')
      if (reqs.includes('django')) tech.push('Django')
      if (reqs.includes('fastapi')) tech.push('FastAPI')
      if (reqs.includes('sqlalchemy')) tech.push('SQLAlchemy')
      if (reqs.includes('pytorch') || reqs.includes('torch')) tech.push('PyTorch')
      if (reqs.includes('tensorflow')) tech.push('TensorFlow')
      if (reqs.includes('openai')) tech.push('OpenAI')
      if (reqs.includes('anthropic')) tech.push('Anthropic')
    } catch {}
  }

  // Check for database files
  if (fs.existsSync(path.join(projectPath, 'prisma', 'schema.prisma'))) {
    tech.push('Prisma')
    try {
      const schema = fs.readFileSync(path.join(projectPath, 'prisma', 'schema.prisma'), 'utf-8')
      if (schema.includes('postgresql')) tech.push('PostgreSQL')
      if (schema.includes('mysql')) tech.push('MySQL')
      if (schema.includes('sqlite')) tech.push('SQLite')
    } catch {}
  }

  // Dedupe
  return [...new Set(tech)]
}

function getClaudeSummaries(projectName: string): string[] {
  const claudeProjectName = `C--Users-musse-Projects-${projectName}`
  const claudeProjectPath = path.join(CLAUDE_PROJECTS_DIR, claudeProjectName)

  const summaries: Set<string> = new Set()

  if (!fs.existsSync(claudeProjectPath)) {
    return []
  }

  try {
    const files = fs.readdirSync(claudeProjectPath).filter(f => f.endsWith('.jsonl'))

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(claudeProjectPath, file), 'utf-8')
        const lines = content.split('\n')

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const data = JSON.parse(line)
            if (data.type === 'summary' && data.summary) {
              summaries.add(data.summary)
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}

  return [...summaries].sort()
}

function getGitInfo(projectPath: string): { hasGit: boolean; lastCommitDate?: string; lastCommitMessage?: string } {
  const gitDir = path.join(projectPath, '.git')
  if (!fs.existsSync(gitDir)) {
    return { hasGit: false }
  }

  try {
    const lastCommit = execSync('git log -1 --format="%ai|||%s"', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 5000
    }).trim()

    const [date, message] = lastCommit.split('|||')
    return {
      hasGit: true,
      lastCommitDate: date,
      lastCommitMessage: message
    }
  } catch {
    return { hasGit: true }
  }
}

function getReadmeDescription(projectPath: string): string | undefined {
  const readmePaths = ['README.md', 'readme.md', 'README.txt', 'readme.txt']

  for (const readme of readmePaths) {
    const readmePath = path.join(projectPath, readme)
    if (fs.existsSync(readmePath)) {
      try {
        const content = fs.readFileSync(readmePath, 'utf-8')
        // Get first paragraph after title
        const lines = content.split('\n')
        let foundTitle = false
        let description = ''

        for (const line of lines) {
          if (line.startsWith('#')) {
            foundTitle = true
            continue
          }
          if (foundTitle && line.trim() && !line.startsWith('#') && !line.startsWith('!')) {
            description = line.trim()
            break
          }
        }

        if (description) {
          return description.slice(0, 200)
        }
      } catch {}
    }
  }

  return undefined
}

function generateProjectSummary(
  projectName: string,
  projectPath: string,
  tech: string[],
  claudeSummaries: string[],
  readmeDescription?: string
): string {
  const parts: string[] = []

  // Try to get package.json description
  const pkgPath = path.join(projectPath, 'package.json')
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      if (pkg.description) {
        parts.push(pkg.description)
      }
    } catch {}
  }

  // Try requirements.txt header comment
  const reqPath = path.join(projectPath, 'requirements.txt')
  if (fs.existsSync(reqPath) && parts.length === 0) {
    try {
      const content = fs.readFileSync(reqPath, 'utf-8')
      const firstLine = content.split('\n')[0]
      if (firstLine.startsWith('#')) {
        parts.push(firstLine.replace(/^#\s*/, ''))
      }
    } catch {}
  }

  // Use README description
  if (readmeDescription && parts.length === 0) {
    parts.push(readmeDescription)
  }

  // Synthesize from Claude summaries if available
  if (parts.length === 0 && claudeSummaries.length > 0) {
    // Find common themes in summaries
    const themes = claudeSummaries.slice(0, 5).join(', ')
    parts.push(`Work includes: ${themes}`)
  }

  // Fallback: describe based on tech stack
  if (parts.length === 0 && tech.length > 0) {
    const mainTech = tech.slice(0, 3).join(', ')
    parts.push(`${projectName} project using ${mainTech}`)
  }

  // Final fallback
  if (parts.length === 0) {
    parts.push(`${projectName} - no description available`)
  }

  return parts[0].slice(0, 300)
}

export async function GET() {
  const projects: ProjectInfo[] = []
  const catalog = loadCatalog()

  try {
    const entries = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name.startsWith('.')) continue

      const projectPath = path.join(PROJECTS_DIR, entry.name)
      const tech = detectTechStack(projectPath)
      const claudeSummaries = getClaudeSummaries(entry.name)
      const gitInfo = getGitInfo(projectPath)
      const description = getReadmeDescription(projectPath)

      // Check if we have saved data for this project
      const savedData = catalog.get(entry.name)

      // Use saved summary if available, otherwise generate
      const generatedSummary = savedData?.generatedSummary || generateProjectSummary(
        entry.name,
        projectPath,
        tech,
        claudeSummaries,
        description
      )

      // Use saved needsReview flag, otherwise auto-detect
      const summaryNeedsReview = savedData?.summaryNeedsReview ??
        (generatedSummary.includes('no description available') ||
        generatedSummary.startsWith('Work includes:') ||
        generatedSummary.includes('project using'))

      // Map saved status string to valid status
      const validStatuses = ['active', 'complete', 'experiment', 'archived', 'unknown']
      const savedStatus = savedData?.status?.toLowerCase()
      const status = (validStatuses.includes(savedStatus || '') ? savedStatus : 'unknown') as ProjectInfo['status']

      projects.push({
        name: entry.name,
        path: projectPath,
        tech,
        claudeSummaries,
        ...gitInfo,
        description,
        generatedSummary,
        summaryNeedsReview,
        status,
        portfolioWorthy: savedData?.portfolioWorthy ?? false,
        featured: savedData?.featured ?? false,
        notes: savedData?.notes ?? ''
      })
    }

    // Sort by last commit date (most recent first), then by name
    projects.sort((a, b) => {
      if (a.lastCommitDate && b.lastCommitDate) {
        return new Date(b.lastCommitDate).getTime() - new Date(a.lastCommitDate).getTime()
      }
      if (a.lastCommitDate) return -1
      if (b.lastCommitDate) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json({ projects })
  } catch (error) {
    console.error('Error scanning projects:', error)
    return NextResponse.json({ error: 'Failed to scan projects' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { projects } = await request.json() as { projects: ProjectInfo[] }

    const catalogData: CatalogFile = {
      projects: projects.map(p => ({
        name: p.name,
        status: p.status,
        summaryNeedsReview: p.summaryNeedsReview,
        portfolioWorthy: p.portfolioWorthy,
        featured: p.featured,
        generatedSummary: p.generatedSummary,
        notes: p.notes
      })),
      lastSaved: new Date().toISOString()
    }

    fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalogData, null, 2), 'utf-8')

    return NextResponse.json({ success: true, savedCount: projects.length })
  } catch (error) {
    console.error('Error saving projects:', error)
    return NextResponse.json({ error: 'Failed to save projects' }, { status: 500 })
  }
}
