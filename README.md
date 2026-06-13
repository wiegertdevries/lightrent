# LightRent Pro

Professioneel verhuurbeheersysteem voor lichtgear, bussen en generatoren.

## Snelstart (5 minuten)

### 1. Supabase database opzetten (gratis)

1. Ga naar [supabase.com](https://supabase.com) en maak een gratis account aan
2. Maak een nieuw project aan (kies een naam, bijv. "lightrent")
3. Ga naar **SQL Editor** in het linkermenu
4. Kopieer de inhoud van `supabase/migrations/001_schema.sql`
5. Plak het in de SQL editor en klik **Run**

### 2. Vercel deployment (gratis)

1. Ga naar [vercel.com](https://vercel.com) en log in met je GitHub account
2. Importeer dit project (push het eerst naar een GitHub repo)
3. Voeg de environment variables toe:
   - `NEXT_PUBLIC_SUPABASE_URL` → te vinden in Supabase > Settings > API
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → te vinden in Supabase > Settings > API
4. Klik **Deploy** — je app is live!

### 3. Lokaal draaien

```bash
# Kopieer de environment template
cp .env.local.example .env.local
# Vul je Supabase URL en key in in .env.local

# Installeer dependencies
npm install

# Start de dev server
npm run dev
# Open http://localhost:3000
```

## Functies

- **Gear** — Complete inventarislijst met accessoires per item, eigenaar (Wiegert/Gideon/Julian), serienummer, dagprijzen
- **Klussen** — Aanmaken, beheren, gear toevoegen met live browser, meerdere bussen + generators per klus
- **Transport** — Mercedes Atego + Sprinter, kilometerregistratie per rit/klus
- **Generators** — 60KVA aanhanger + Honda EU70IS, diesel- en draaiurenregistratie
- **Planning** — Weekkalender met klikbare klussen
- **Klanten** — Adresboek met BTW-nummers
- **Offertes & Facturen** — Automatische berekening excl./incl. BTW, PDF-print

## Multi-user accounts

Alle drie eigenaren loggen in met hun eigen account via de ingebouwde Supabase authenticatie. 
Voeg toe door naar **Authentication > Users** te gaan in het Supabase dashboard.

## Technische stack

- **Next.js 14** — React framework
- **Supabase** — PostgreSQL database + authenticatie + realtime
- **Tailwind CSS** — Styling
- **Vercel** — Hosting

Kosten: **€0/maand** voor jullie gebruik (Supabase free tier: 500MB, Vercel free tier: ruim voldoende)
