'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Flame, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [toonWw, setToonWw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [fout, setFout] = useState('')

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFout('')
    const { error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord })
    if (error) {
      setFout('E-mailadres of wachtwoord klopt niet.')
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ink-800 to-ink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-brand-500 flex items-center justify-center mx-auto mb-4">
            <Flame size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-white">LightRent Pro</h1>
          <p className="text-ink-400 text-sm mt-1">Inloggen om door te gaan</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="label">E-mailadres</label>
              <input type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jij@lightrent.nl" required autoFocus />
            </div>
            <div>
              <label className="label">Wachtwoord</label>
              <div className="relative">
                <input type={toonWw ? 'text' : 'password'} className="input pr-10"
                  value={wachtwoord} onChange={e => setWachtwoord(e.target.value)}
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setToonWw(!toonWw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                  {toonWw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {fout && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg border border-red-200">
                {fout}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5 text-base">
              {loading ? 'Inloggen…' : 'Inloggen'}
            </button>
          </form>
        </div>
        <p className="text-center text-ink-500 text-xs mt-4">
          Geen account? Vraag de beheerder om er een aan te maken.
        </p>
      </div>
    </div>
  )
}
