'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ChefHat, Plus, Video, LayoutGrid, Layers,
  Clock, ArrowRight, LogOut,
} from 'lucide-react'
import type { Project } from '@/lib/types'

const FORMAT_ICONS = { video: Video, carousel: LayoutGrid, both: Layers }

const STATUS_STYLE: Record<string, string> = {
  done:       'text-green-700 bg-green-50 border-green-200',
  generating: 'text-amber-700 bg-amber-50 border-amber-200',
  analyzing:  'text-blue-700 bg-blue-50 border-blue-200',
  pending:    'text-muted-foreground bg-muted border-border',
  error:      'text-destructive bg-destructive/8 border-destructive/20',
}
const STATUS_LABEL: Record<string, string> = {
  done: 'Terminé', generating: 'En cours…',
  analyzing: 'Analyse…', pending: 'En attente', error: 'Erreur',
}

export default function ProjectsPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => { setProjects(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen gradient-page">
      <header className="glass sticky top-0 z-20 border-b">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/new" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shadow-sm shadow-brand/30">
              <ChefHat className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-extrabold tracking-tight text-sm">Plately</span>
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => router.push('/new')}
              className="gradient-brand border-0 text-white shadow-sm shadow-brand/20 hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Nouveau
            </Button>
            <button
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
              onClick={async () => {
                await fetch('/api/auth/logout', { method: 'POST' })
                localStorage.clear()
                router.push('/login')
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight">Mes projets</h1>
          {!loading && (
            <p className="text-muted-foreground mt-1.5 text-sm">
              {projects.length} projet{projects.length > 1 ? 's' : ''} créé{projects.length > 1 ? 's' : ''}
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-muted-foreground text-sm">Chargement…</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl gradient-brand-soft border border-brand/20 flex items-center justify-center mx-auto mb-4">
              <Layers className="h-7 w-7 text-brand" />
            </div>
            <p className="font-semibold mb-1.5">Aucun projet encore</p>
            <p className="text-sm text-muted-foreground mb-6">Créez votre premier contenu IA</p>
            <Button
              onClick={() => router.push('/new')}
              className="gradient-brand border-0 text-white shadow-md shadow-brand/20 hover:opacity-90"
            >
              Créer un contenu →
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {projects.map(p => {
              const Icon = FORMAT_ICONS[p.format]
              return (
                <Link
                  key={p.id}
                  href={`/project/${p.id}`}
                  className="flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-4 hover:border-brand/30 hover:shadow-card transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl gradient-brand-soft border border-brand/20 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {p.caption ?? `Projet ${p.format}`}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-[11px] font-semibold px-2.5 py-1 rounded-lg border shrink-0',
                    STATUS_STYLE[p.status] ?? STATUS_STYLE.pending
                  )}>
                    {STATUS_LABEL[p.status] ?? p.status}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
