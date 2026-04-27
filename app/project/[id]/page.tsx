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
  Send, Loader2, Utensils, RefreshCw, Hash, ArrowLeft
} from 'lucide-react'
import Link from 'next/link'
import type { Project, Message, SceneJSON } from '@/lib/types'

const QUICK_SUGGESTIONS = [
  'Caption plus courte',
  'Musique plus énergique',
  'Texte en blanc',
  'Slide plus dynamique',
]

function VideoPlayer({ url }: { url: string }) {
  return (
    <div className="relative w-full max-w-[320px] mx-auto">
      <div className="aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-2xl">
        <video
          src={url}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
      </div>
      <a
        href={url}
        download
        className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
      >
        <Download className="h-4 w-4" />
      </a>
    </div>
  )
}

function CarouselPlayer({ urls }: { urls: string[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    emblaApi.on('select', () => setCurrent(emblaApi.selectedScrollSnap()))
  }, [emblaApi])

  async function downloadAll() {
    const zip = new JSZip()
    await Promise.all(
      urls.map(async (url, i) => {
        const res = await fetch(url)
        const blob = await res.blob()
        zip.file(`slide_${i + 1}.jpg`, blob)
      })
    )
    const blob = await zip.generateAsync({ type: 'blob' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'plately-carousel.zip'
    a.click()
  }

  return (
    <div className="relative w-full max-w-[320px] mx-auto">
      <div className="aspect-[4/5] rounded-3xl overflow-hidden shadow-2xl" ref={emblaRef}>
        <div className="flex h-full">
          {urls.map((url, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0 relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <button
        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        onClick={() => emblaApi?.scrollPrev()}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button
        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        onClick={() => emblaApi?.scrollNext()}
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
        {urls.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn('w-1.5 h-1.5 rounded-full transition-all', i === current ? 'bg-white w-4' : 'bg-white/50')}
          />
        ))}
      </div>

      {/* Download */}
      <button
        onClick={downloadAll}
        className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/80 transition-colors"
      >
        <Download className="h-4 w-4" />
      </button>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

export default function ProjectPage() {
  const params = useParams()
  const id = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [sceneJson, setSceneJson] = useState<SceneJSON | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [rerendering, setRerendering] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const fetchProject = useCallback(async () => {
    const res = await fetch(`/api/project/${id}/status`)
    const data = await res.json() as Project
    setProject(data)
    if (data.scene_json) setSceneJson(data.scene_json)
  }, [id])

  const fetchMessages = useCallback(async () => {
    const res = await fetch(`/api/project/${id}/messages`)
    const data = await res.json() as Message[]
    setMessages(data)
  }, [id])

  useEffect(() => {
    fetchProject()
    fetchMessages()
  }, [fetchProject, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleChat(msg: string) {
    if (!msg.trim() || !sceneJson || chatLoading) return
    const text = msg.trim()
    setInput('')
    setChatLoading(true)

    // Optimistic user message
    const tempMsg: Message = {
      id: Date.now().toString(),
      project_id: id,
      role: 'user',
      content: text,
      scene_json_snapshot: null,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: id,
          message: text,
          scene_json: sceneJson,
          history: messages.slice(-6),
        }),
      })
      const data = await res.json()
      setSceneJson(data.updated_scene_json)
      setMessages(prev => [...prev.filter(m => m.id !== tempMsg.id), {
        id: Date.now().toString() + '_u',
        project_id: id,
        role: 'user',
        content: text,
        scene_json_snapshot: null,
        created_at: new Date().toISOString(),
      }, {
        id: Date.now().toString() + '_a',
        project_id: id,
        role: 'assistant',
        content: data.assistant_message,
        scene_json_snapshot: data.updated_scene_json,
        created_at: new Date().toISOString(),
      }])

      if (data.needs_rerender) {
        setRerendering(true)
        const photoPaths = (project?.carousel_urls ?? []).map((u: string) =>
          u.replace(`/outputs/${id}/`, `/tmp/plately/${id}/`)
        )

        if (data.rerender_type === 'carousel' || data.rerender_type === 'both') {
          await fetch('/api/generate-carousel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: id, scene_json: data.updated_scene_json, photo_paths: photoPaths }),
          })
        }
        if (data.rerender_type === 'video' || data.rerender_type === 'both') {
          await fetch('/api/generate-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: id, scene_json: data.updated_scene_json, photo_paths: photoPaths }),
          })
        }
        await fetchProject()
        setRerendering(false)
      }
    } finally {
      setChatLoading(false)
      inputRef.current?.focus()
    }
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const hasVideo = !!project.video_url
  const hasCarousel = !!(project.carousel_urls?.length)
  const caption = sceneJson?.caption ?? project.caption ?? ''
  const hashtags = sceneJson?.hashtags ?? project.hashtags ?? []

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/new" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            Nouveau
          </Link>
          <div className="h-4 w-px bg-border" />
          <div className="w-6 h-6 rounded-md gradient-brand flex items-center justify-center">
            <Utensils className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm">Plately</span>
          {rerendering && (
            <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Régénération…
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-6xl mx-auto w-full gap-0 lg:gap-0">
        {/* Left — Preview */}
        <div className="flex-1 p-6 lg:p-10 space-y-6 lg:overflow-y-auto">
          {/* Media preview */}
          {hasVideo && project.video_url && <VideoPlayer url={project.video_url} />}
          {hasCarousel && !hasVideo && project.carousel_urls && (
            <CarouselPlayer urls={project.carousel_urls} />
          )}
          {hasVideo && hasCarousel && project.carousel_urls && (
            <div className="mt-6">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Carrousel</p>
              <CarouselPlayer urls={project.carousel_urls} />
            </div>
          )}

          {/* Caption */}
          {caption && (
            <div className="bg-white rounded-2xl border border-border p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-foreground leading-relaxed flex-1">{caption}</p>
                <CopyButton text={caption} />
              </div>
            </div>
          )}

          {/* Hashtags */}
          {hashtags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-0.5 text-xs bg-primary/10 text-primary rounded-full px-3 py-1 font-medium"
                >
                  <Hash className="h-3 w-3" />
                  {tag.replace(/^#/, '')}
                </span>
              ))}
              <CopyButton text={hashtags.join(' ')} />
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="hidden lg:block w-px bg-border" />

        {/* Right — Chat */}
        <div className="w-full lg:w-[380px] flex flex-col bg-white/60 lg:bg-white/80 border-t lg:border-t-0 lg:border-l border-border">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-sm">Modifier le contenu</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Décrivez les changements souhaités</p>
          </div>

          {/* Quick suggestions */}
          <div className="p-3 border-b border-border flex flex-wrap gap-2">
            {QUICK_SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => handleChat(s)}
                disabled={chatLoading}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-white hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">Demandez des modifications à votre contenu</p>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm',
                      m.role === 'user'
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-secondary text-secondary-foreground rounded-tl-sm'
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-border">
            <form
              onSubmit={e => { e.preventDefault(); handleChat(input) }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ex: rends le texte plus court…"
                disabled={chatLoading}
                className="flex-1 h-10 px-3 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || chatLoading}
                className="gradient-brand border-0 text-white flex-shrink-0"
              >
                {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
