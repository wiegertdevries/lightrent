export type Owner = 'Wiegert' | 'Gideon' | 'Julian'
export type GearCat = 'HMI' | 'Tungsten' | 'LED' | 'Textile/Frame' | 'Overig'
export type KlusStatus = 'gepland' | 'actief' | 'afgerond'
export type GearStatus = 'beschikbaar' | 'defect' | 'reparatie' | 'vermist'
export type Prioriteit = 'laag' | 'normaal' | 'hoog' | 'urgent'

export interface Profiel {
  id: string
  naam: string
  email?: string
  rol: 'admin' | 'medewerker'
  bedrijfsnaam?: string
  bedrijfsadres?: string
  bedrijfspostcode?: string
  bedrijfsplaats?: string
  kvk_nummer?: string
  btw_nummer?: string
  iban?: string
  telefoon?: string
  logo_url?: string
  kleur_primair?: string
}

export interface Gear {
  id: string
  naam: string
  categorie: GearCat
  eigenaar?: Owner | ''
  serienr?: string
  dagprijs: number
  weekprijs: number
  aankoopprijs?: number
  notities?: string
  stelling?: string
  plank?: string
  foto_url?: string
  status?: GearStatus
  defect_notitie?: string
  laatste_bus_id?: string
  barcode?: string
  accessories?: Accessory[]
}

export interface Accessory {
  id: string
  gear_id: string
  naam: string
  dagprijs: number
  weekprijs?: number
}

export interface Bus {
  id: string
  naam: string
  kenteken?: string
  eigenaar?: Owner | ''
  km_stand: number
  kosten_per_km: number
  dagprijs: number
}

export interface KmLog {
  id: string
  bus_id: string
  klus_id?: string
  datum: string
  km_van: number
  km_tot: number
  gereden: number
}

export interface Generator {
  id: string
  naam: string
  type: string
  eigenaar?: Owner | ''
}

export interface GeneratorLog {
  id: string
  generator_id: string
  klus_id?: string
  datum: string
  chauffeur?: string
  liters: number
  draaiuren: number
  prijs_per_liter: number
  notitie?: string
}

export interface Klant {
  id: string
  naam: string
  bedrijf?: string
  email?: string
  telefoon?: string
  adres?: string
  btw_nummer?: string
  kvk_nummer?: string
  postcode?: string
  stad?: string
  land?: string
  website?: string
  notities?: string
}

export interface Klus {
  id: string
  naam: string
  klant_id?: string
  verantwoordelijke?: Owner | ''
  start_datum?: string
  eind_datum?: string
  status: KlusStatus
  notities?: string
  interne_notities?: string
  locatie?: string
  referentie?: string
  generator_info: { generator_id: string; chauffeur: string }[]
  bus_ids: string[]
  gear_ids?: string[]
  accessory_ids?: string[]
  aangemaakt_door_naam?: string
  klant?: Klant
  bussen?: Bus[]
}

export interface DocRegel {
  naam: string
  dp: number
  dagen: number
  sub: number
  isAcc?: boolean
  korting_pct?: number
  korting_bedrag?: number
}

export interface Offerte {
  id: string
  nummer: string
  klant_id?: string
  klus_id?: string
  start_datum?: string
  eind_datum?: string
  bus_dagprijs: number
  generator_dagprijs: number
  korting_pct: number
  geldig_tot?: string
  notities?: string
  onderwerp?: string
  intro_tekst?: string
  footer_tekst?: string
  algemene_voorwaarden_url?: string
  status: string
  totaal_excl: number
  datum: string
  gear_ids: string[]
  accessory_ids: string[]
  online_acceptatie_token?: string
  geaccepteerd_op?: string
  geaccepteerd_door?: string
  aangemaakt_door_naam?: string
  bedrijfsnaam?: string
  bedrijfsadres?: string
  bedrijfsbtw?: string
  logo_url?: string
  klant?: Klant
}

export interface Factuur {
  id: string
  nummer: string
  klant_id?: string
  klus_id?: string
  offerte_id?: string
  start_datum?: string
  eind_datum?: string
  bus_dagprijs: number
  generator_dagprijs: number
  korting_pct: number
  vervaldatum?: string
  notities?: string
  onderwerp?: string
  intro_tekst?: string
  footer_tekst?: string
  algemene_voorwaarden_url?: string
  status: string
  totaal_excl: number
  betaald_bedrag?: number
  datum: string
  gear_ids: string[]
  accessory_ids: string[]
  aangemaakt_door_naam?: string
  bedrijfsnaam?: string
  bedrijfsadres?: string
  bedrijfsbtw?: string
  logo_url?: string
  referentie?: string
  klant?: Klant
}

export interface Notitie {
  id: string
  tekst: string
  prioriteit: Prioriteit
  gear_id?: string
  aangemaakt_door_naam?: string
  afgehandeld: boolean
  afgehandeld_op?: string
  created_at: string
  gear?: Gear
}

export interface PaklijstItem {
  id: string
  klus_id: string
  gear_id: string
  bus_id?: string
  ingepakt: boolean
  ingepakt_door?: string
  retour_ontvangen: boolean
  retour_staat?: string
  retour_notitie?: string
  gear?: Gear
}

export interface AuditLog {
  id: string
  user_naam?: string
  actie: string
  tabel: string
  record_id?: string
  omschrijving?: string
  created_at: string
}
