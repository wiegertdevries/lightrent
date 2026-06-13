export type Owner = 'Wiegert' | 'Gideon' | 'Julian'
export type GearCat = 'HMI' | 'Tungsten' | 'LED' | 'Textile/Frame' | 'Overig'
export type KlusStatus = 'gepland' | 'actief' | 'afgerond'

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
  generator_info: { generator_id: string; chauffeur: string }[]
  bus_ids: string[]
  gear_ids?: string[]
  accessory_ids?: string[]
  // joined
  klant?: Klant
  bussen?: Bus[]
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
  status: string
  totaal_excl: number
  datum: string
  gear_ids: string[]
  accessory_ids: string[]
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
  status: string
  totaal_excl: number
  datum: string
  gear_ids: string[]
  accessory_ids: string[]
  klant?: Klant
}
