'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Sparkles, ChefHat, TrendingUp, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Vibe } from '@/lib/types'

const RESTO_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Café' },
  { value: 'bar', label: 'Bar' },
  { value: 'boulangerie', label: 'Boulangerie' },
  { value: 'autre', label: 'Autre' },
]

const STYLES = [
  { value: 'bistrot', label: 'Bistrot' },
  { value: 'moderne', label: 'Moderne' },
  { value: 'street_food', label: 'Street Food' },
  { value: 'gastronomique', label: 'Gastronomique' },
  { value: 'brunch', label: 'Brunch' },
]

const VIBES: { value: Vibe; label: string; emoji: string }[] = [
  { value: 'warm',      label: 'Chaleureux', emoji: '🌿' },
  { value: 'energetic', label: 'Énergique',  emoji: '⚡' },
  { value: 'premium',   label: 'Premium',    emoji: '✦' },
  { value: 'fun',       label: 'Fun',        emoji: '🎉' },
  { value: 'rustic',    label: 'Rustique',   emoji: '🪵' },
]

const FEATURES = [
  { icon: Sparkles, label: 'Vidéos IA', desc: 'Seedance image-to-video' },
  { icon: TrendingUp, label: 'Carrousels', desc: 'Optimisés Instagram & Reels' },
  { icon: Zap, label: 'Chat éditeur', desc: 'Modifiez en langage naturel' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [form, setForm] = useState({
    resto_name: '',
    resto_type: '',
    city: '',
    style: '',
    vibe: '' as Vibe | '',
  })

  useEffect(() => {
    const profileId = localStorage.getItem('plately_profile_id')
    if (profileId) {
      router.push('/new')
    } else {
      setChecking(false)
    }
  }, [router])

  const isValid = !!(form.resto_name && form.resto_type && form.city && form.style && form.vibe)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      localStorage.setItem('plately_profile_id', data.id)
      localStorage.setItem('plately_profile', JSON.stringify(data))
      router.push('/new')
    } catch {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-page">
        <Loader2 className="h-7 w-7 animate-spin text-brand" />
      </div>
    )
  }

  return (
    <main className="min-h-screen gradient-page flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col w-[420px] shrink-0 p-12 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full gradient-brand opacity-10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gold opacity-10 blur-3xl" />

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-brand/30">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">Plately</span>
          </div>

          {/* Headline */}
          <div className="py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-4">
              Contenu IA pour restaurants
            </p>
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight mb-6">
              Vos plats,{' '}
              <span className="text-gradient-gold">viraux.</span>
            </h1>
            <p className="text-muted-foreground leading-relaxed text-lg">
              Photo dans, vidéo TikTok et carrousel Instagram sortent. Sans équipe créative.
            </p>
          </div>

          {/* Feature pills */}
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-2xl bg-white/60 border border-border backdrop-blur-sm">
                <div className="w-9 h-9 rounded-xl gradient-brand-soft flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-in-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-brand/30">
              <ChefHat className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">Plately</span>
          </div>

          <div className="bg-card rounded-3xl border border-border shadow-elevated p-8">
            <div className="mb-7">
              <h2 className="text-2xl font-bold tracking-tight">Votre restaurant</h2>
              <p className="text-muted-foreground text-sm mt-1.5">
                On personnalise votre contenu selon votre identité.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Resto name */}
              <div className="space-y-1.5">
                <Label htmlFor="resto_name">Nom du restaurant</Label>
                <Input
                  id="resto_name"
                  placeholder="Le Petit Bistrot"
                  value={form.resto_name}
                  onChange={e => setForm(f => ({ ...f, resto_name: e.target.value }))}
                  required
                />
              </div>

              {/* Type + City */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={form.resto_type} onValueChange={v => setForm(f => ({ ...f, resto_type: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESTO_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    placeholder="Paris"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Style */}
              <div className="space-y-1.5">
                <Label>Style culinaire</Label>
                <Select value={form.style} onValueChange={v => setForm(f => ({ ...f, style: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir votre style" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Vibe — custom toggle pills */}
              <div className="space-y-2">
                <Label>Ambiance</Label>
                <div className="flex flex-wrap gap-2">
                  {VIBES.map(v => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, vibe: v.value }))}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-150',
                        form.vibe === v.value
                          ? 'bg-brand text-white border-brand shadow-sm shadow-brand/20'
                          : 'bg-background border-border hover:border-brand/40 hover:bg-accent text-foreground'
                      )}
                    >
                      <span className="text-base leading-none">{v.emoji}</span>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full gradient-brand border-0 text-white font-semibold shadow-md shadow-brand/25 hover:opacity-90 active:scale-[0.99] transition-all mt-2"
                disabled={loading || !isValid}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Création du profil…</>
                  : <>Commencer à créer <span className="ml-1">→</span></>
                }
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Vos données restent sur votre appareil — aucun compte requis.
          </p>
        </div>
      </div>
    </main>
  )
}
