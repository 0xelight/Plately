'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Utensils, Loader2 } from 'lucide-react'
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

const VIBES: { value: Vibe; label: string }[] = [
  { value: 'warm', label: 'Chaleureux' },
  { value: 'energetic', label: 'Énergique' },
  { value: 'premium', label: 'Premium' },
  { value: 'fun', label: 'Fun' },
  { value: 'rustic', label: 'Rustique' },
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.resto_name || !form.resto_type || !form.city || !form.style || !form.vibe) return

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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand mb-4 shadow-lg">
            <Utensils className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Plately</h1>
          <p className="text-muted-foreground mt-1 text-sm">Contenu IA pour votre restaurant</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-black/5 border border-border p-8">
          <h2 className="text-xl font-semibold mb-1">Bienvenue</h2>
          <p className="text-sm text-muted-foreground mb-6">Dites-nous qui vous êtes pour personnaliser votre contenu.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.resto_type} onValueChange={v => setForm(f => ({ ...f, resto_type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {RESTO_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Style</Label>
                <Select value={form.style} onValueChange={v => setForm(f => ({ ...f, style: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Ambiance</Label>
                <Select value={form.vibe} onValueChange={v => setForm(f => ({ ...f, vibe: v as Vibe }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    {VIBES.map(v => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full gradient-brand border-0 text-white shadow-md hover:opacity-90 transition-opacity"
              disabled={loading || !form.resto_name || !form.resto_type || !form.city || !form.style || !form.vibe}
            >
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Création...</> : 'Commencer →'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
