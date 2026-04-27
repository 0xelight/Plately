'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Upload, X, Loader2, CheckCircle2, ChefHat,
  ImagePlus, Clapperboard, LayoutGrid, Layers,
  Smartphone, PlaySquare, Camera,
} from 'lucide-react'
import type { Format, Platform, Profile } from '@/lib/types'

const FORMATS: { value: Format; label: string; icon: React.ElementType; desc: string }[] = [
  { value: 'video',    label: 'Vidéo',     icon: Clapperboard, desc: '9:16 · TikTok / Reels' },
  { value: 'carousel', label: 'Carrousel', icon: LayoutGrid,   desc: '1:1 · Feed Instagram' },
  { value: 'both',     label: 'Les deux',  icon: Layers,       desc: 'Vidéo + Carrousel' },
]

const PLATFORMS: { value: Platform; label: string; icon: React.ElementType }[] = [
  { value: 'tiktok',    label: 'TikTok',    icon: PlaySquare },
  { value: 'reels',     label: 'Reels',     icon: Camera },
  { value: 'instagram', label: 'Instagram', icon: Smartphone },
]

type StepStatus = 'pending' | 'active' | 'done' | 'error'
type Step = { label: string; status: StepStatus }

function buildSteps(format: Format): Step[] {
  const steps: Step[] = [
    { label: 'Téléversement des photos', status: 'pending' },
    { label: 'Analyse IA de vos photos', status: 'pending' },
  ]
  if (format === 'carousel' || format === 'both')
    steps.push({ label: 'Génération du carrousel', status: 'pending' })
  if (format === 'video' || format === 'both')
    steps.push({ label: 'Génération de la vidéo', status: 'pending' })
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
    const raw = localStorage.getItem('plately_profile')
    if (!raw) { router.push('/'); return }
    setProfile(JSON.parse(raw) as Profile)
  }, [router])

  function addFiles(files: FileList | null) {
    if (!files) return
    const newFiles = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .slice(0, 5 - photos.length)
    if (!newFiles.length) return
    setPhotos(prev => [...prev, ...newFiles].slice(0, 5))
    newFiles.forEach(file => {
      setPreviews(prev => [...prev, URL.createObjectURL(file)].slice(0, 5))
    })
  }

  function removePhoto(idx: number) {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => { URL.revokeObjectURL(prev[idx]); return prev.filter((_, i) => i !== idx) })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files)
  }, [photos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function setStep(idx: number, status: StepStatus) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status } : s))
    const total = buildSteps(format).length
    setProgress(Math.round(((idx + (status === 'done' ? 1 : 0.5)) / total) * 100))
  }

  async function handleGenerate() {
    if (!profile || photos.length === 0) return
    setGenerating(true); setError(null)
    const initialSteps = buildSteps(format)
    setSteps(initialSteps); setProgress(0)

    try {
      setStep(0, 'active')
      const fd = new FormData()
      photos.forEach(f => fd.append('photos', f))
      const { paths: photo_paths } = await fetch('/api/upload', { method: 'POST', body: fd }).then(r => r.json())
      setStep(0, 'done')

      setStep(1, 'active')
      const { project_id, scene_json } = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_paths, profile, format, platform }),
      }).then(r => r.json())
      setStep(1, 'done')

      let stepIdx = 2
      const tasks: Promise<void>[] = []

      if (format === 'carousel' || format === 'both') {
        const idx = stepIdx++
        setStep(idx, 'active')
        tasks.push(fetch('/api/generate-carousel', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id, scene_json, photo_paths }),
        }).then(() => setStep(idx, 'done')))
      }

      if (format === 'video' || format === 'both') {
        const idx = stepIdx++
        setStep(idx, 'active')
        tasks.push(fetch('/api/generate-video', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id, scene_json, photo_paths }),
        }).then(() => setStep(idx, 'done')))
      }

      await Promise.all(tasks)

      const finalIdx = initialSteps.length - 1
      setStep(finalIdx, 'active')
      let attempts = 0
      while (attempts++ < 60) {
        const proj = await fetch(`/api/project/${project_id}/status`).then(r => r.json())
        if (proj.status === 'done') break
        if (proj.status === 'error') throw new Error('Génération échouée côté serveur')
        await new Promise(r => setTimeout(r, 3000))
      }
      setStep(finalIdx, 'done')
      setProgress(100)
      await new Promise(r => setTimeout(r, 600))
      router.push(`/project/${project_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      setSteps(prev => prev.map(s => s.status === 'active' ? { ...s, status: 'error' } : s))
      setGenerating(false)
    }
  }

  if (!profile) return null

  return (
    <main className="min-h-screen gradient-page">
      {/* Header */}
      <header className="glass sticky top-0 z-20 border-b">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shadow-sm shadow-brand/30">
            <ChefHat className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-sm">Plately</span>
          <span className="text-muted-foreground text-sm">·</span>
          <span className="text-sm text-muted-foreground font-medium">{profile.resto_name}</span>
          <div className="ml-auto flex items-center gap-3">
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              onClick={() => { localStorage.clear(); router.push('/') }}
            >
              Changer de profil
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-10">
        {!generating ? (
          <div className="animate-in-up space-y-8">
            {/* Title */}
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Créer du contenu
              </h1>
              <p className="text-muted-foreground mt-1.5">
                Ajoutez 1 à 5 photos — l&apos;IA s&apos;occupe du reste.
              </p>
            </div>

            {/* Drop zone */}
            <div
              className={cn(
                'relative border-2 border-dashed rounded-3xl transition-all duration-200 cursor-pointer overflow-hidden',
                dragging
                  ? 'border-brand bg-accent scale-[1.01]'
                  : 'border-border hover:border-brand/50 bg-card',
                photos.length >= 5 && 'pointer-events-none opacity-60'
              )}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="sr-only"
                onChange={e => addFiles(e.target.files)} />

              {photos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-16 h-16 rounded-2xl gradient-brand-soft border border-brand/20 flex items-center justify-center">
                    <Upload className="h-7 w-7 text-brand" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-base">Glissez vos photos ici</p>
                    <p className="text-sm text-muted-foreground mt-1">ou cliquez pour sélectionner · max 5 photos</p>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {['JPG', 'PNG', 'WEBP'].map(ext => (
                      <span key={ext} className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">{ext}</span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-5">
                  <div className="grid grid-cols-5 gap-3">
                    {previews.map((src, i) => (
                      <div key={i} className="relative aspect-square rounded-2xl overflow-hidden group border border-border">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <button
                            className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full bg-white/90 flex items-center justify-center"
                            onClick={e => { e.stopPropagation(); removePhoto(i) }}
                          >
                            <X className="h-3.5 w-3.5 text-foreground" />
                          </button>
                        </div>
                        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">{i + 1}</span>
                        </div>
                      </div>
                    ))}
                    {photos.length < 5 && (
                      <div className="aspect-square rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:border-brand/40 transition-colors">
                        <ImagePlus className="h-5 w-5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-medium">Ajouter</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-3 font-medium">
                    {photos.length}/5 photo{photos.length > 1 ? 's' : ''} sélectionnée{photos.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}
            </div>

            {/* Format + Platform */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold mb-3">Format de sortie</p>
                <div className="grid grid-cols-3 gap-2">
                  {FORMATS.map(f => {
                    const Icon = f.icon
                    return (
                      <button
                        key={f.value}
                        onClick={() => setFormat(f.value)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all duration-150',
                          format === f.value
                            ? 'border-brand bg-accent text-brand shadow-sm'
                            : 'border-border bg-card hover:border-brand/30 hover:bg-muted/50'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <div>
                          <p className="text-xs font-semibold leading-none">{f.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{f.desc}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-3">Plateforme cible</p>
                <div className="grid grid-cols-3 gap-2">
                  {PLATFORMS.map(p => {
                    const Icon = p.icon
                    return (
                      <button
                        key={p.value}
                        onClick={() => setPlatform(p.value)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all duration-150',
                          platform === p.value
                            ? 'border-brand bg-accent text-brand shadow-sm'
                            : 'border-border bg-card hover:border-brand/30 hover:bg-muted/50'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <p className="text-xs font-semibold">{p.label}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-destructive/8 border border-destructive/20 rounded-2xl px-4 py-3 text-sm text-destructive">
                <X className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              size="xl"
              onClick={handleGenerate}
              disabled={photos.length === 0}
              className="w-full gradient-brand border-0 text-white font-semibold text-base shadow-lg shadow-brand/20 hover:opacity-90 active:scale-[0.99] transition-all"
            >
              Générer mon contenu →
            </Button>
          </div>
        ) : (
          /* ── Generating state ── */
          <div className="max-w-sm mx-auto py-16 animate-in">
            <div className="text-center mb-10">
              <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center mx-auto mb-5 shadow-xl shadow-brand/30">
                <Loader2 className="h-9 w-9 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight">Génération…</h2>
              <p className="text-muted-foreground text-sm mt-1.5">Notre IA compose votre contenu</p>
            </div>

            <div className="mb-7">
              <Progress value={progress} className="h-1.5" />
              <p className="text-right text-xs text-muted-foreground mt-1.5 font-medium">{progress}%</p>
            </div>

            <div className="space-y-2.5">
              {steps.map((step, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300',
                    step.status === 'active' && 'bg-accent border border-brand/20',
                    step.status === 'done' && 'opacity-50',
                    step.status === 'error' && 'bg-destructive/8 border border-destructive/20',
                  )}
                >
                  <div className="shrink-0">
                    {step.status === 'pending' && <div className="w-5 h-5 rounded-full border-2 border-border" />}
                    {step.status === 'active' && <Loader2 className="w-5 h-5 text-brand animate-spin" />}
                    {step.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {step.status === 'error' && <X className="w-5 h-5 text-destructive" />}
                  </div>
                  <span className={cn(
                    'text-sm font-medium',
                    step.status === 'active' && 'text-brand',
                    step.status === 'error' && 'text-destructive',
                  )}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {error && (
              <div className="mt-6 text-center space-y-3">
                <p className="text-sm text-destructive">{error}</p>
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
