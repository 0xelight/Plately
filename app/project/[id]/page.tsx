'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import useEmblaCarousel from 'embla-carousel-react'
import JSZip from 'jszip'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Download, Copy, Check, ChevronLeft, ChevronRight,
  Send, Loader2, ChefHat, RefreshCw, Hash,
  ArrowLeft, Sparkles, Volume2, Image as ImageIcon,
} from 'lucide-react'
import Link from 'next/link'
import type { Project, Message, SceneJSON } from '@/lib/types'

const SUGGESTIONS = [
  { label: 'Caption plus courte', icon: '✂️' },
  { label: 'Musique plus énergique', icon: '⚡' },
  { label: 'Texte en blanc', icon: '🎨' },
  { label: 'Plus de dynamisme', icon: '🚀' },
]

/* ─── Video Player ─────────────────────────────────────────────── */
function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="relative w-full max-w-[288px] mx-auto">
      {/* Phone frame */}
      <div className="absolute inset-0 rounded-[2.5rem] border-[6px] border-foreground/8 shadow-2xl pointer-events-none z-10" />
      <div className="aspect-[9/16] rounded-[2.2rem] overflow-hidden bg-foreground">
        <video src={url} autoPlay muted loop playsInline className="w-full h-full object-cover" />
      </div>
      <a
        href={url}
        download
        className="absolute bottom-4 right-2 z-20 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-foreground/80 backdrop-blur-sm text-white text-xs font-semibold hover:bg-foreground transition-colors"
      >
        <Download className="h-3.5 w-3.5" />
        Télécharger
      </a>
    </div>
  )
}

/* ─── Carousel Player ──────────────────────────────────────────── */
function CarouselPlayer({ urls }: { urls: string[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', () => setCurrent(emblaApi.selectedScrollSnap()))
  }, [emblaApi])

  async function downloadAll() {
    const zip = new JSZip()
    await Promise.all(urls.map(async (url, i) => {
      const blob = await fetch(url).then(r => r.blob())
      zip.file(`plately-slide-${i + 1}.jpg`, blob)
    }))
    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = 'plately-carousel.zip'; a.click()
  }

  return (
    <div className="relative w-full max-w-[340px] mx-auto">
      <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl" ref={emblaRef}>
        <div className="flex h-full">
          {urls.map((url, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Nav arrows */}
      {urls.length > 1 && <>
        <button onClick={() => emblaApi?.scrollPrev()}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button onClick={() => emblaApi?.scrollNext()}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10">
          <ChevronRight className="h-4 w-4" />
        </button>
      </>}

      {/* Slide counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
        {urls.map((_, i) => (
          <button key={i} onClick={() => emblaApi?.scrollTo(i)}
            className={cn('h-1.5 rounded-full transition-all duration-300 bg-white',
              i === current ? 'w-5 opacity-100' : 'w-1.5 opacity-50')} />
        ))}
      </div>

      {/* Download */}
      <button onClick={downloadAll}
        className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-sm text-white text-xs font-semibold hover:bg-black/80 transition-colors">
        <Download className="h-3.5 w-3.5" />
        ZIP
      </button>
    </div>
  )
}

/* ─── Copy button ──────────────────────────────────────────────── */
function CopyBtn({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className={cn('p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground', className)}>
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function ProjectPage() {
  const params = useParams()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [sceneJson, setSceneJson] = useState<SceneJSON | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [rerendering, setRerendering] = useState(false)
  const [activeTab, setActiveTab] = useState<'video' | 'carousel'>('video')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchProject = useCallback(async () => {
    const data = await fetch(`/api/project/${id}/status`).then(r => r.json()) as Project
    setProject(data)
    if (data.scene_json) setSceneJson(data.scene_json)
    if (data.video_url) setActiveTab('video')
    else if (data.carousel_urls?.length) setActiveTab('carousel')
  }, [id])

  const fetchMessages = useCallback(async () => {
    const data = await fetch(`/api/project/${id}/messages`).then(r => r.json()) as Message[]
    setMessages(data)
  }, [id])

  useEffect(() => { fetchProject(); fetchMessages() }, [fetchProject, fetchMessages])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleChat(msg: string) {
    if (!msg.trim() || !sceneJson || chatLoading) return
    const text = msg.trim(); setInput(''); setChatLoading(true)

    const tempId = Date.now().toString()
    setMessages(prev => [...prev, { id: tempId, project_id: id, role: 'user', content: text, scene_json_snapshot: null, created_at: new Date().toISOString() }])

    try {
      const data = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: id, message: text, scene_json: sceneJson, history: messages.slice(-6) }),
      }).then(r => r.json())

      setSceneJson(data.updated_scene_json)
      setMessages(prev => [
        ...prev.filter(m => m.id !== tempId),
        { id: tempId + '_u', project_id: id, role: 'user' as const, content: text, scene_json_snapshot: null, created_at: new Date().toISOString() },
        { id: tempId + '_a', project_id: id, role: 'assistant' as const, content: data.assistant_message, scene_json_snapshot: data.updated_scene_json, created_at: new Date().toISOString() },
      ])

      if (data.needs_rerender) {
        setRerendering(true)
        const photoPaths = project?.photo_paths ?? []

        const rerenderCalls: Promise<Response>[] = []
        if (data.rerender_type === 'carousel' || data.rerender_type === 'both')
          rerenderCalls.push(fetch('/api/generate-carousel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: id, scene_json: data.updated_scene_json, photo_paths: photoPaths }) }))
        if (data.rerender_type === 'video' || data.rerender_type === 'both')
          rerenderCalls.push(fetch('/api/generate-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: id, scene_json: data.updated_scene_json, photo_paths: photoPaths }) }))

        await Promise.all(rerenderCalls)
        await fetchProject()
        setRerendering(false)
      }
    } finally { setChatLoading(false); inputRef.current?.focus() }
  }

  if (!project) return (
    <div className="min-h-screen flex items-center justify-center gradient-page">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand mx-auto" />
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    </div>
  )

  const hasVideo = !!project.video_url
  const hasCarousel = !!(project.carousel_urls?.length)
  const caption = sceneJson?.caption ?? project.caption ?? ''
  const hashtags = sceneJson?.hashtags ?? project.hashtags ?? []
  const music = sceneJson?.music ?? ''

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass sticky top-0 z-20 border-b">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link href="/new" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            <ArrowLeft className="h-4 w-4" /> Nouveau
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shadow-sm shadow-brand/30">
            <ChefHat className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-extrabold text-sm tracking-tight">Plately</span>

          {rerendering && (
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-brand" />
              Régénération en cours…
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full">

        {/* ── Left — Preview ─────────────────────────────── */}
        <div className="flex-1 p-6 lg:p-10 space-y-6 min-h-0 overflow-y-auto">

          {/* Tab toggle if both */}
          {hasVideo && hasCarousel && (
            <div className="flex gap-1 p-1 bg-muted rounded-2xl w-fit">
              {[
                { key: 'video' as const, label: 'Vidéo', icon: Volume2 },
                { key: 'carousel' as const, label: 'Carrousel', icon: ImageIcon },
              ].map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={cn('flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                    activeTab === key ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
                  <Icon className="h-4 w-4" />{label}
                </button>
              ))}
            </div>
          )}

          {/* Media */}
          {hasVideo && activeTab === 'video' && project.video_url && <VideoPlayer url={project.video_url} />}
          {hasCarousel && activeTab === 'carousel' && project.carousel_urls && <CarouselPlayer urls={project.carousel_urls} />}
          {hasVideo && !hasCarousel && project.video_url && <VideoPlayer url={project.video_url} />}
          {hasCarousel && !hasVideo && project.carousel_urls && <CarouselPlayer urls={project.carousel_urls} />}

          {/* Caption card */}
          {caption && (
            <div className="bg-card rounded-2xl border border-border p-5 shadow-card max-w-[400px]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Caption</span>
                <CopyBtn text={caption} />
              </div>
              <p className="text-sm leading-relaxed">{caption}</p>
            </div>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="max-w-[400px]">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Hashtags</span>
                <CopyBtn text={hashtags.join(' ')} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {hashtags.map((tag, i) => (
                  <span key={i} className="inline-flex items-center gap-0.5 text-xs bg-accent text-brand rounded-lg px-2.5 py-1 font-semibold border border-brand/15">
                    <Hash className="h-2.5 w-2.5" />{tag.replace(/^#/, '')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Music badge */}
          {music && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground max-w-[400px]">
              <Volume2 className="h-3.5 w-3.5 text-brand shrink-0" />
              <span className="font-medium capitalize">{music.replace(/-/g, ' ')}</span>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-border shrink-0" />

        {/* ── Right — Chat ────────────────────────────────── */}
        <div className="w-full lg:w-[400px] shrink-0 flex flex-col border-t lg:border-t-0 bg-card/50">

          {/* Chat header */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-brand-soft border border-brand/20 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-brand" />
              </div>
              <div>
                <p className="text-sm font-bold">Éditeur IA</p>
                <p className="text-[11px] text-muted-foreground">Décrivez vos modifications</p>
              </div>
            </div>
          </div>

          {/* Quick suggestions */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button key={s.label} onClick={() => handleChat(s.label)} disabled={chatLoading}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-border bg-background hover:border-brand/40 hover:bg-accent font-medium transition-all disabled:opacity-40">
                  <span>{s.icon}</span>{s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 custom-scrollbar">
            <div className="p-4 space-y-3">
              {messages.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl gradient-brand-soft border border-brand/20 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="h-5 w-5 text-brand" />
                  </div>
                  <p className="text-sm font-medium">Demandez une modification</p>
                  <p className="text-xs text-muted-foreground mt-1">Caption, musique, texte, style…</p>
                </div>
              )}
              {messages.map(m => (
                <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-lg gradient-brand shrink-0 mt-0.5 flex items-center justify-center">
                      <Sparkles className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'user'
                      ? 'gradient-brand text-white rounded-tr-sm'
                      : 'bg-muted text-foreground rounded-tl-sm border border-border'
                  )}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="w-6 h-6 rounded-lg gradient-brand shrink-0 mt-0.5 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                  <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-3.5 py-3 flex gap-1">
                    {[0, 150, 300].map(d => (
                      <span key={d} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
                        style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <form onSubmit={e => { e.preventDefault(); handleChat(input) }} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={chatLoading}
                placeholder="Ex : rends le texte plus court…"
                className="flex-1 h-10 px-3.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-50 transition-shadow"
              />
              <Button type="submit" size="icon" disabled={!input.trim() || chatLoading}
                className="gradient-brand border-0 text-white shadow-md shadow-brand/20 hover:opacity-90 shrink-0">
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
