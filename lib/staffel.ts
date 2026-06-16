// Staffelkorting op basis van draaidagen
export function getStaffelkorting(dagen: number): number {
  if (dagen >= 14) return 35
  if (dagen >= 7)  return 30
  if (dagen >= 5)  return 25
  if (dagen >= 4)  return 20
  if (dagen >= 3)  return 15
  if (dagen >= 2)  return 10
  return 0
}

export function staffelLabel(pct: number): string {
  if (pct === 0) return ''
  return `Staffelkorting ${pct}%`
}
