'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, ChefHat, Sparkles, TrendingUp, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'login' | 'register'

const FEATURES = [
  { icon: Sparkles, label: 'Vidéos IA', desc: 'Seedance image-to-video' },
  { icon: TrendingUp, label: 'Carrousels', desc: 'Optimisés Instagram & Reels' },
  { icon: Zap, label: 'Chat éditeur', desc: 'Modifiez en langage naturel' },
]

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register'

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Une erreur est survenue')
        setLoading(false)
        return
      }

      router.push('/')
      router.refresh()
    } catch {
      setError('Une erreur est survenue')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen gradient-page flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col w-[420px] shrink-0 p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-dots opacity-40" />
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full gradient-brand opacity-10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-gold opacity-10 blur-3xl" />

        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-auto">
            <div className="w-10 h-10 rounded-2xl gradient-brand flex items-center justify-center shadow-md shadow-brand/30">
              <ChefHat className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight">Plately</span>
          </div>

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

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md animate-in-up">

          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-brand/30">
              <ChefHat className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">Plately</span>
          </div>

          <div className="bg-card rounded-3xl border border-border shadow-elevated p-8">
            {/* Tab toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-2xl mb-7">
              {(['login', 'register'] as Tab[]).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null) }}
                  className={cn(
                    'flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-150',
                    tab === t
                      ? 'bg-white shadow-sm text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t === 'login' ? 'Connexion' : 'Créer un compte'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="chef@restaurant.fr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={tab === 'register' ? 'Min. 8 caractères' : '••••••••'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-xl px-3.5 py-2.5">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                size="lg"
                className="w-full gradient-brand border-0 text-white font-semibold shadow-md shadow-brand/25 hover:opacity-90 active:scale-[0.99] transition-all mt-2"
                disabled={loading}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Chargement…</>
                  : tab === 'login' ? 'Se connecter →' : 'Créer mon compte →'
                }
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Vos contenus sont sauvegardés et accessibles à tout moment.
          </p>
        </div>
      </div>
    </main>
  )
}
