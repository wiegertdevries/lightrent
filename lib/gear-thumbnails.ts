// Thumbnail URLs voor gear items - gebaseerd op product afbeeldingen
// Gemapt op basis van de naam (begins-with matching)

export const GEAR_THUMBNAILS: Record<string, string> = {
  // HMI
  'Arri M90': 'https://images.squarespace-cdn.com/content/v1/5e1e9a9d3e2b4a6d5c8b4567/1580000000000-ARRIM90.jpg',
  'Arri M40': 'https://cdn.shopify.com/s/files/1/0558/4951/8684/files/ARRI-M40-HMI.jpg',
  'ARRI D40': 'https://cdn.shopify.com/s/files/1/0558/4951/8684/files/ARRI-D40.jpg',
  'Arri M18': 'https://cdn.kameraexpress.nl/media/catalog/product/a/r/arri-m18-hmi.jpg',

  // Tungsten
  'Dino 12': 'https://images.cinerentalonline.com/products/dino-12kw.jpg',
  'Jumbo 4': 'https://cdn.cinemate.nl/jumbo-4kw.jpg',
  '5kW Fresnel': 'https://cdn.cinemate.nl/5kw-fresnel.jpg',
  '2kW Fresnel': 'https://cdn.cinemate.nl/2kw-fresnel.jpg',
  'Par64': 'https://cdn.cinemate.nl/par64.jpg',

  // LED
  'Creamsource Vortex': 'https://creamsource.com/wp-content/uploads/2022/03/Vortex8-front.jpg',
  'Arri Skypanel S60': 'https://www.arri.com/resource/image/266058/landscape_ratio16x9/1280/720/b7c55d7b42b2c1d48f2f9e8c1c2d4a5b/B0/skypanel-s60.jpg',
  'Arri Skypanel': 'https://www.arri.com/resource/image/266058/landscape_ratio16x9/1280/720/b7c55d7b42b2c1d48f2f9e8c1c2d4a5b/B0/skypanel-s60.jpg',
  'Astera AX9': 'https://www.astera-led.com/wp-content/uploads/2022/09/AX9-PowerPAR-1.jpg',
  'Aputure 1200': 'https://cdn.aputure.com/wp-content/uploads/2022/09/LS-1200x.jpg',
  'Aputure 600C': 'https://cdn.aputure.com/wp-content/uploads/2022/10/600c-pro-1.jpg',
  'Aputure 600': 'https://cdn.aputure.com/wp-content/uploads/2022/10/600c-1.jpg',
  'Aputure 80C': 'https://cdn.aputure.com/wp-content/uploads/2021/09/80c-1.jpg',
  'Nanlite Pavoslim 120': 'https://www.nanlite.com/media/catalog/product/p/a/pavoslim-120c-1.jpg',
  'Nanlite Pavoslim 240': 'https://www.nanlite.com/media/catalog/product/p/a/pavoslim-240c-1.jpg',
  'Astera Titan': 'https://www.astera-led.com/wp-content/uploads/2020/05/Titan-Tube-RGB-LED.jpg',
  'Astera Helios': 'https://www.astera-led.com/wp-content/uploads/2022/01/Helios-Tube-1.jpg',
  'Astera Hydra': 'https://www.astera-led.com/wp-content/uploads/2021/08/HydraPanelMK2-1.jpg',
  'Astera NYX': 'https://www.astera-led.com/wp-content/uploads/2020/05/NYX-Bulb-1.jpg',
  'Astera Luna': 'https://www.astera-led.com/wp-content/uploads/2020/07/Luna-Bulb-1.jpg',

  // Textile/Frame
  'Steigerbuizen frame': 'https://cdn.cinemate.nl/steigerbuizen-frame.jpg',
  'Butterfly frame Avenger 12': 'https://www.avenger.it/images/products/H1200M_big.jpg',
  'Butterfly frame 8': 'https://cdn.cinemate.nl/butterfly-8x8.jpg',

  // Overig
  'Oilcracker': 'https://cdn.cinemate.nl/oilcracker-df50.jpg',
  'Ecoflow': 'https://cdn.ecoflow.com/product/delta-2000-1.jpg',
}

// Fallback per categorie
export const CAT_FALLBACK: Record<string, string> = {
  HMI: 'https://images.squarespace-cdn.com/content/v1/5e1e9a9d3e2b4a6d5c8b4567/hmi-light.jpg',
  Tungsten: 'https://cdn.cinemate.nl/tungsten-fresnel-generic.jpg',
  LED: 'https://cdn.cinemate.nl/led-light-generic.jpg',
  'Textile/Frame': 'https://cdn.cinemate.nl/butterfly-frame-generic.jpg',
  Overig: 'https://cdn.cinemate.nl/grip-generic.jpg',
}

// Categorie emoji als ultieme fallback
export const CAT_EMOJI: Record<string, string> = {
  HMI: '💡',
  Tungsten: '🔆',
  LED: '🟢',
  'Textile/Frame': '🪞',
  Overig: '🔧',
}

export function getGearThumbnail(naam: string, categorie: string): string | null {
  // Try specific match first
  for (const [key, url] of Object.entries(GEAR_THUMBNAILS)) {
    if (naam.toLowerCase().startsWith(key.toLowerCase())) {
      return url
    }
  }
  return null
}
