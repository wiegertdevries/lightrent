import type { Gear } from './types'

type SeedItem = Omit<Gear, 'id'> & { accessories?: { naam: string; dagprijs: number }[] }

export const GEAR_SEED: SeedItem[] = [
  // HMI
  { naam: 'Arri M90 HMI 9kW', categorie: 'HMI', dagprijs: 395, weekprijs: 1185 },
  { naam: 'Arri M40 HMI 4kW', categorie: 'HMI', dagprijs: 170, weekprijs: 510 },
  { naam: 'ARRI D40 Fresnel', categorie: 'HMI', dagprijs: 150, weekprijs: 450 },
  { naam: 'Arri M18 HMI 1.8kW #1', categorie: 'HMI', dagprijs: 80, weekprijs: 240 },
  { naam: 'Arri M18 HMI 1.8kW #2', categorie: 'HMI', dagprijs: 80, weekprijs: 240 },
  // Tungsten
  { naam: 'Dino 12kW CP62 #1', categorie: 'Tungsten', dagprijs: 125, weekprijs: 375 },
  { naam: 'Dino 12kW CP62 #2', categorie: 'Tungsten', dagprijs: 125, weekprijs: 375 },
  { naam: 'Dino 12kW CP62 #3', categorie: 'Tungsten', dagprijs: 125, weekprijs: 375 },
  { naam: 'Jumbo 4kW #1', categorie: 'Tungsten', dagprijs: 60, weekprijs: 180 },
  { naam: 'Jumbo 4kW #2', categorie: 'Tungsten', dagprijs: 60, weekprijs: 180 },
  { naam: '5kW Fresnel #1', categorie: 'Tungsten', dagprijs: 45, weekprijs: 135 },
  { naam: '5kW Fresnel #2', categorie: 'Tungsten', dagprijs: 45, weekprijs: 135 },
  { naam: '2kW Fresnel #1', categorie: 'Tungsten', dagprijs: 25, weekprijs: 75 },
  { naam: '2kW Fresnel #2', categorie: 'Tungsten', dagprijs: 25, weekprijs: 75 },
  { naam: '2kW Fresnel #3', categorie: 'Tungsten', dagprijs: 25, weekprijs: 75 },
  { naam: '2kW Fresnel #4', categorie: 'Tungsten', dagprijs: 25, weekprijs: 75 },
  { naam: 'Par64 #1', categorie: 'Tungsten', dagprijs: 10, weekprijs: 30 },
  { naam: 'Par64 #2', categorie: 'Tungsten', dagprijs: 10, weekprijs: 30 },
  { naam: 'Par64 #3', categorie: 'Tungsten', dagprijs: 10, weekprijs: 30 },
  { naam: 'Par64 #4', categorie: 'Tungsten', dagprijs: 10, weekprijs: 30 },
  // LED
  {
    naam: 'Creamsource Vortex 8 #1', categorie: 'LED', dagprijs: 135, weekprijs: 405,
    accessories: [{ naam: 'Snapbag Vortex8', dagprijs: 15 }, { naam: 'Snapgrid Vortex8', dagprijs: 10 }]
  },
  {
    naam: 'Creamsource Vortex 8 #2', categorie: 'LED', dagprijs: 135, weekprijs: 405,
    accessories: [{ naam: 'Snapbag Vortex8', dagprijs: 15 }, { naam: 'Snapgrid Vortex8', dagprijs: 10 }]
  },
  {
    naam: 'Creamsource Vortex 8 #3', categorie: 'LED', dagprijs: 135, weekprijs: 405,
    accessories: [{ naam: 'Medium Chimera', dagprijs: 25 }, { naam: 'Snapgrid Vortex8', dagprijs: 10 }]
  },
  {
    naam: 'Creamsource Vortex 8 #4', categorie: 'LED', dagprijs: 135, weekprijs: 405,
    accessories: [{ naam: 'Medium Chimera', dagprijs: 25 }, { naam: 'Snapgrid Vortex8', dagprijs: 10 }]
  },
  { naam: 'Creamsource Vortex 8 #5', categorie: 'LED', dagprijs: 135, weekprijs: 405 },
  { naam: 'Creamsource Vortex 8 #6', categorie: 'LED', dagprijs: 135, weekprijs: 405 },
  {
    naam: 'Arri Skypanel S60 #1', categorie: 'LED', dagprijs: 100, weekprijs: 300,
    accessories: [{ naam: 'Snapbag S60', dagprijs: 15 }, { naam: 'Snapgrid S60', dagprijs: 10 }]
  },
  {
    naam: 'Arri Skypanel S60 #2', categorie: 'LED', dagprijs: 100, weekprijs: 300,
    accessories: [{ naam: "Octaplus 3' + Snapgrid", dagprijs: 35 }]
  },
  { naam: 'Astera AX9 #1', categorie: 'LED', dagprijs: 40, weekprijs: 120 },
  { naam: 'Astera AX9 #2', categorie: 'LED', dagprijs: 40, weekprijs: 120 },
  { naam: 'Astera AX9 #3', categorie: 'LED', dagprijs: 40, weekprijs: 120 },
  { naam: 'Astera AX9 #4', categorie: 'LED', dagprijs: 40, weekprijs: 120 },
  { naam: 'Astera AX9 #5', categorie: 'LED', dagprijs: 40, weekprijs: 120 },
  { naam: 'Astera AX9 #6', categorie: 'LED', dagprijs: 40, weekprijs: 120 },
  { naam: 'Astera AX9 #7', categorie: 'LED', dagprijs: 40, weekprijs: 120 },
  { naam: 'Astera AX9 #8', categorie: 'LED', dagprijs: 40, weekprijs: 120 },
  {
    naam: 'Aputure 1200x', categorie: 'LED', dagprijs: 200, weekprijs: 600,
    accessories: [{ naam: 'Reflector 1200x', dagprijs: 20 }]
  },
  {
    naam: 'Aputure 600C', categorie: 'LED', dagprijs: 95, weekprijs: 285,
    accessories: [
      { naam: 'Fresnel 600C', dagprijs: 20 },
      { naam: 'Profielspot 19° 600C', dagprijs: 25 },
      { naam: 'Softbox 600C', dagprijs: 20 }
    ]
  },
  {
    naam: 'Aputure 80C', categorie: 'LED', dagprijs: 35, weekprijs: 105,
    accessories: [{ naam: 'Fresnel 80C', dagprijs: 15 }]
  },
  { naam: 'Nanlite Pavoslim 120C #1', categorie: 'LED', dagprijs: 65, weekprijs: 195 },
  { naam: 'Nanlite Pavoslim 120C #2', categorie: 'LED', dagprijs: 65, weekprijs: 195 },
  { naam: 'Nanlite Pavoslim 120C #3', categorie: 'LED', dagprijs: 65, weekprijs: 195 },
  { naam: 'Nanlite Pavoslim 120C #4', categorie: 'LED', dagprijs: 65, weekprijs: 195 },
  { naam: 'Nanlite Pavoslim 240C', categorie: 'LED', dagprijs: 95, weekprijs: 285 },
  {
    naam: 'Astera Titan Tube #1', categorie: 'LED', dagprijs: 32, weekprijs: 95,
    accessories: [{ naam: 'Snapbag Titan (set 4)', dagprijs: 20 }]
  },
  {
    naam: 'Astera Titan Tube #2', categorie: 'LED', dagprijs: 32, weekprijs: 95,
    accessories: [{ naam: 'Snapbag Titan (set 4)', dagprijs: 20 }]
  },
  {
    naam: 'Astera Titan Tube #3', categorie: 'LED', dagprijs: 32, weekprijs: 95,
    accessories: [{ naam: 'Snapgrid Titan (op lamp)', dagprijs: 10 }]
  },
  {
    naam: 'Astera Titan Tube #4', categorie: 'LED', dagprijs: 32, weekprijs: 95,
    accessories: [{ naam: 'Snapgrid Titan (op lamp)', dagprijs: 10 }]
  },
  { naam: 'Astera Titan Tube #5', categorie: 'LED', dagprijs: 32, weekprijs: 95 },
  { naam: 'Astera Titan Tube #6', categorie: 'LED', dagprijs: 32, weekprijs: 95 },
  { naam: 'Astera Titan Tube #7', categorie: 'LED', dagprijs: 32, weekprijs: 95 },
  { naam: 'Astera Titan Tube #8', categorie: 'LED', dagprijs: 32, weekprijs: 95 },
  { naam: 'Astera Helios Tube #1', categorie: 'LED', dagprijs: 26, weekprijs: 78 },
  { naam: 'Astera Helios Tube #2', categorie: 'LED', dagprijs: 26, weekprijs: 78 },
  { naam: 'Astera Helios Tube #3', categorie: 'LED', dagprijs: 26, weekprijs: 78 },
  { naam: 'Astera Helios Tube #4', categorie: 'LED', dagprijs: 26, weekprijs: 78 },
  { naam: 'Astera Helios Tube #5', categorie: 'LED', dagprijs: 26, weekprijs: 78 },
  { naam: 'Astera Helios Tube #6', categorie: 'LED', dagprijs: 26, weekprijs: 78 },
  { naam: 'Astera Helios Tube #7', categorie: 'LED', dagprijs: 26, weekprijs: 78 },
  { naam: 'Astera Hydrapanel #1', categorie: 'LED', dagprijs: 19, weekprijs: 57 },
  { naam: 'Astera Hydrapanel #2', categorie: 'LED', dagprijs: 19, weekprijs: 57 },
  { naam: 'Astera Hydrapanel #3', categorie: 'LED', dagprijs: 19, weekprijs: 57 },
  { naam: 'Astera Hydrapanel #4', categorie: 'LED', dagprijs: 19, weekprijs: 57 },
  { naam: 'Astera Hydrapanel #5', categorie: 'LED', dagprijs: 19, weekprijs: 57 },
  { naam: 'Astera Hydrapanel #6', categorie: 'LED', dagprijs: 19, weekprijs: 57 },
  { naam: 'Astera Hydrapanel #7', categorie: 'LED', dagprijs: 19, weekprijs: 57 },
  { naam: 'Astera Hydrapanel #8', categorie: 'LED', dagprijs: 19, weekprijs: 57 },
  { naam: 'Astera NYX Bulb (set van 8)', categorie: 'LED', dagprijs: 35, weekprijs: 105 },
  { naam: 'Astera Luna Bulb (set van 8)', categorie: 'LED', dagprijs: 45, weekprijs: 135 },
  // Textile/Frame
  {
    naam: 'Steigerbuizen frame 20x12', categorie: 'Textile/Frame', dagprijs: 80, weekprijs: 240,
    accessories: [{ naam: 'Ultrabounce 20x12', dagprijs: 25 }, { naam: 'Hilite 20x12', dagprijs: 25 }]
  },
  {
    naam: 'Butterfly frame Avenger 12x12 #1', categorie: 'Textile/Frame', dagprijs: 50, weekprijs: 150,
    accessories: [
      { naam: 'Gridcloth 12x12', dagprijs: 20 }, { naam: 'Ultra Bounce 12x12', dagprijs: 20 },
      { naam: 'Checkerboard gold/silver 12x12', dagprijs: 35 }, { naam: 'Unbleached Muslin 12x12', dagprijs: 20 },
      { naam: 'Silk 12x12', dagprijs: 15 }, { naam: 'Zwart doek 12x12', dagprijs: 20 }
    ]
  },
  { naam: 'Butterfly frame Avenger 12x12 #2', categorie: 'Textile/Frame', dagprijs: 50, weekprijs: 150 },
  {
    naam: 'Butterfly frame 8x8', categorie: 'Textile/Frame', dagprijs: 35, weekprijs: 105,
    accessories: [
      { naam: '1/1 Gridcloth 8x8', dagprijs: 15 }, { naam: '1/4 Gridcloth 8x8', dagprijs: 15 },
      { naam: 'Ultra Bounce 8x8', dagprijs: 15 }, { naam: 'Unbleached Muslin 8x8', dagprijs: 15 },
      { naam: 'Hilite 8x8', dagprijs: 15 }
    ]
  },
  { naam: 'Spiegel 1x1', categorie: 'Textile/Frame', dagprijs: 20, weekprijs: 60 },
  { naam: 'Soft Silver 1x1', categorie: 'Textile/Frame', dagprijs: 20, weekprijs: 60 },
  { naam: 'CLRS Reflector set 25cm', categorie: 'Textile/Frame', dagprijs: 30, weekprijs: 90 },
  { naam: 'Zwartdoek 6x4m #1', categorie: 'Textile/Frame', dagprijs: 20, weekprijs: 60 },
  { naam: 'Zwartdoek 6x4m #2', categorie: 'Textile/Frame', dagprijs: 20, weekprijs: 60 },
  { naam: 'Zwartdoek 4x4m #1', categorie: 'Textile/Frame', dagprijs: 15, weekprijs: 45 },
  { naam: 'Zwartdoek 4x4m #2', categorie: 'Textile/Frame', dagprijs: 15, weekprijs: 45 },
  { naam: 'Zwartdoek 10x3m #1', categorie: 'Textile/Frame', dagprijs: 20, weekprijs: 60 },
  { naam: 'Zwartdoek 10x3m #2', categorie: 'Textile/Frame', dagprijs: 20, weekprijs: 60 },
  { naam: 'WD 1.20x1.20 (1/1–1/8)', categorie: 'Textile/Frame', dagprijs: 15, weekprijs: 45 },
  { naam: 'WD 0.9x0.9 (1/1–1/8)', categorie: 'Textile/Frame', dagprijs: 15, weekprijs: 45 },
  { naam: "Floppy's set", categorie: 'Textile/Frame', dagprijs: 15, weekprijs: 45 },
  { naam: 'Flags set', categorie: 'Textile/Frame', dagprijs: 10, weekprijs: 30 },
  { naam: 'Statieven set', categorie: 'Textile/Frame', dagprijs: 10, weekprijs: 30 },
  // Overig
  { naam: 'Bulbjes E27 set', categorie: 'Overig', dagprijs: 10, weekprijs: 30, notities: '10x15W 10x25W 10x40W 10x60W' },
  { naam: 'Ecoflow 2000Wh', categorie: 'Overig', dagprijs: 25, weekprijs: 75 },
  { naam: 'Oilcracker DF50', categorie: 'Overig', dagprijs: 75, weekprijs: 225 },
  { naam: 'Blackout wireless DMX set', categorie: 'Overig', dagprijs: 45, weekprijs: 135 },
  { naam: 'Heavy Duty Wind Up #1', categorie: 'Overig', dagprijs: 25, weekprijs: 75 },
  { naam: 'Heavy Duty Wind Up #2', categorie: 'Overig', dagprijs: 25, weekprijs: 75 },
  { naam: 'Heavy Duty Wind Up #3', categorie: 'Overig', dagprijs: 25, weekprijs: 75 },
  { naam: 'Heavy Duty Wind Up #4', categorie: 'Overig', dagprijs: 25, weekprijs: 75 },
  { naam: 'Heavy Duty Wind Up #5', categorie: 'Overig', dagprijs: 25, weekprijs: 75 },
  { naam: 'Heavy Duty Wind Up #6', categorie: 'Overig', dagprijs: 25, weekprijs: 75 },
  { naam: 'Long John Silver #1', categorie: 'Overig', dagprijs: 70, weekprijs: 210 },
  { naam: 'Long John Silver #2', categorie: 'Overig', dagprijs: 70, weekprijs: 210 },
  { naam: 'Trusspakket', categorie: 'Overig', dagprijs: 80, weekprijs: 240 },
  { naam: 'Krachtstroom pakket', categorie: 'Overig', dagprijs: 60, weekprijs: 180, notities: '4x63A 12m, 4x32A 25m' },
  { naam: 'Junior Boomarm', categorie: 'Overig', dagprijs: 20, weekprijs: 60 },
  { naam: 'Zandzakken set', categorie: 'Overig', dagprijs: 10, weekprijs: 30 },
  { naam: 'Grip / kabelshaspel', categorie: 'Overig', dagprijs: 15, weekprijs: 45 },
]

export const BUS_SEED = [
  { naam: 'Mercedes Atego 12 ton', kenteken: '', eigenaar: '', km_stand: 0, kosten_per_km: 0.45, dagprijs: 725 },
  { naam: 'Mercedes Sprinter 3,5 ton', kenteken: '', eigenaar: '', km_stand: 0, kosten_per_km: 0.45, dagprijs: 375 },
]
