'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { Upload, ImageIcon, X, Loader2, CheckCircle2, Utensils } from 'lucide-react'
import type { Format, Platform, Profile } from '@/lib/types'

const FORMATS: { value: Format; label: string }[] = [
  { value: 'video', label: 'Vidéo' },
  { value: 'carousel', label: 'Carrousel' },
  { value: 'both', label: 'Les deux' },
]

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'reels', label: 'Reels' },
  { value: 'instagram', label: 'Instagram' },
]

type Step = {
  label: string
  status: 'pending' | 'active' | 'done' | 'error'
}

function buildSteps(format: Format): Step[] {
  const steps: Step[] = [
    { label: 'Téléversement des photos', status: 'pending' },
    { label: 'Analyse IA de vos photos', status: 'pending' },
  ]
  if (format === 'carousel' || format === 'both') {
    steps.push({ label: 'Génération du carrousel', status: 'pending' })
  }
  if (format === 'video' || format === 'both') {
    steps.push({ label: 'Génération de la vidéo', status: 'pending' })
  }
  steps.push({ label: 'Finalisation', status: 'pending' })
  return steps
}

export default function NewPage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [format, setFormat] = useState<Format>('both')
  const [platform, setPlatform] = useState<Platform>('reels')
  const [dragging, setDragging] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [steps, setSteps] = useState<Step[]>([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const profileRaw = localStorage.getItem('plately_profile')
    if (!profileRaw) {
      router.push('/')
      return
    }
    setProfile(JSON.parse(profileRaw) as Profile)
  }, [router])

  function addFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 5 - photos.length)
    if (!newFiles.length) return

    setPhotos(prev => [...prev, ...newFiles].slice(0, 5))
    newFiles.forEach(file => {
      const url = URL.createObjectURL(file)
      setPreviews(prev => [...prev, url].slice(0, 5))
    })
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx])
      return prev.filter((_, i) => i !== idx)
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }, [photos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function updateStep(idx: number, status: Step['status']) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status } : s))
    setProgress(Math.round(((idx + (status === 'done' ? 1 : 0.5)) / (buildSteps(format).length)) * 100))
  }

  async function handleGenerate() {
    if (!profile || photos.length === 0) return
    setGenerating(true)
    setError(null)
    const initialSteps = buildSteps(format)
    setSteps(initialSteps)
    setProgress(0)

    try {
      // Step 0: Upload
      updateStep(0, 'active')
      const formData = new FormData()
      photos.forEach(f => formData.append('photos', f))
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData })
      const { paths: photo_paths } = await uploadRes.json()
      updateStep(0, 'done')

      // Step 1: Analyze
      updateStep(1, 'active')
      const analyzeRes = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_paths, profile, format, platform }),
      })
      const { project_id, scene_json } = await analyzeRes.json()
      updateStep(1, 'done')

      let stepIdx = 2

      // Parallel generation
      const tasks: Promise<void>[] = []

      if (format === 'carousel' || format === 'both') {
        const idx = stepIdx++
        updateStep(idx, 'active')
        tasks.push(
          fetch('/api/generate-carousel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id, scene_json, photo_paths }),
          }).then(() => updateStep(idx, 'done'))
        )
      }

      if (format === 'video' || format === 'both') {
        const idx = stepIdx++
        updateStep(idx, 'active')
        tasks.push(
          fetch('/api/generate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id, scene_json, photo_paths }),
          }).then(() => updateStep(idx, 'done'))
        )
      }

      await Promise.all(tasks)

      // Final step
      const finalIdx = initialSteps.length - 1
      updateStep(finalIdx, 'active')

      // Poll until done
      let attempts = 0
      while (attempts < 60) {
        const statusRes = await fetch(`/api/project/${project_id}/status`)
        const proj = await statusRes.json()
        if (proj.status === 'done') break
        if (proj.status === 'error') throw new Error('Génération échouée')
        await new Promise(r => setTimeout(r, 3000))
        attempts++
      }

      updateStep(finalIdx, 'done')
      setProgress(100)
      await new Promise(r => setTimeout(r, 800))
      router.push(`/project/${project_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s))
      setGenerating(false)
    }
  }

  if (!profile) return null

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
            <Utensils className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm">Plately</span>
          <span className="text-muted-foreground text-sm ml-1">— {profile.resto_name}</span>
          <button
            className="ml-auto text-xs text-muted-foreground hover:text-foreground underline"
            onClick={() => { localStorage.clear(); router.push('/') }}
          >
            Changer de profil
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-10">
        {!generating ? (
          <div className="space-y-8 animate-in">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Créer du contenu</h1>
              <p className="text-muted-foreground mt-1">Ajoutez 1 à 5 photos de vos plats ou de votre restaurant.</p>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                'relative border-2 border-dashed rounded-3xl transition-colors cursor-pointer',
                dragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 bg-white/60',
                photos.length >= 5 && 'pointer-events-none opacity-60'
              )}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={e => addFiles(e.target.files)}
              />

              {photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Glissez vos photos ici</p>
                    <p className="text-sm text-muted-foreground mt-0.5">ou cliquez pour sélectionner (max 5)</p>
                  </div>
                  <p className="text-xs text-muted-foreground">JPG, PNG, WEBP acceptés</p>
                </div>
              ) : (
                <div className="p-4">
                  <div className="grid grid-cols-5 gap-3">
                    {previews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-xl overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button
                          className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center"
                          onClick={e => { e.stopPropagation(); removePhoto(i) }}
                        >
                          <X className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <div className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 text-center">{photos.length}/5 photo{photos.length > 1 ? 's' : ''}</p>
                </div>
              )}
            </div>

            {/* Format + Platform */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium mb-3">Format</p>
                <div className="flex gap-2">
                  {FORMATS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFormat(f.value)}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all',
                        format === f.value
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-border bg-white hover:border-primary/40'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Plateforme</p>
                <div className="flex gap-2">
                  {PLATFORMS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => setPlatform(p.value)}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all',
                        platform === p.value
                          ? 'border-primary bg-primary text-white shadow-sm'
                          : 'border-border bg-white hover:border-primary/40'
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              size="xl"
              className="w-full gradient-brand border-0 text-white shadow-lg hover:opacity-90 transition-opacity"
              disabled={photos.length === 0}
              onClick={handleGenerate}
            >
              Générer le contenu →
            </Button>
          </div>
        ) : (
          /* Generating state */
          <div className="max-w-md mx-auto py-20 animate-in">
            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-3xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <h2 className="text-xl font-bold">Génération en cours…</h2>
              <p className="text-muted-foreground text-sm mt-1">Notre IA crée votre contenu</p>
            </div>

            <Progress value={progress} className="mb-8 h-2" />

            <div className="space-y-3">
              {steps.map((step, i) => (
                <div key={i} className={cn(
                  'flex items-center gap-3 p-3 rounded-xl transition-all',
                  step.status === 'active' && 'bg-primary/5 border border-primary/20',
                  step.status === 'done' && 'opacity-60',
                  step.status === 'error' && 'bg-destructive/5 border border-destructive/20',
                )}>
                  {step.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-border" />}
                  {step.status === 'active' && <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />}
                  {step.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                  {step.status === 'error' && <X className="w-5 h-5 text-destructive flex-shrink-0" />}
                  <span className={cn(
                    'text-sm',
                    step.status === 'active' && 'font-medium text-primary',
                    step.status === 'error' && 'text-destructive',
                  )}>{step.label}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-6 text-center">
                <p className="text-sm text-destructive mb-3">{error}</p>
                <Button variant="outline" onClick={() => { setGenerating(false); setError(null) }}>
                  Réessayer
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
