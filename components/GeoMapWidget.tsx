import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import { CampaignData } from '../types';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';

interface Props {
  ads: CampaignData[];
}

interface LocationMetric {
    name: string;
    coords: [number, number]; // Lat, Long
    spend: number;
    leads: number;
    impressions: number;
    cpl: number;
}

// Coordinate Lookup for Known Cities (Fallback)
const CITY_COORDS: Record<string, [number, number]> = {
    'Patrocínio': [-18.9439, -46.9933],
    'Goiânia': [-16.6869, -49.2648],
    'Uberlândia': [-18.9113, -48.2622],
    'Belo Horizonte': [-19.9167, -43.9345],
    'São Paulo': [-23.5505, -46.6333],
    'Brasília': [-15.7975, -47.8919],
    // Add more as needed
};

// Helper: Get Coords
const getCoordinates = (locString: string | undefined): [number, number] | null => {
    if (!locString) return null;

    // Case A: Explicit Lat/Long string
    // e.g. "Lat: -18.923 Long: -46.992"
    if (locString.includes('Lat') || locString.includes('Lat:')) {
        const matches = locString.match(/Lat:?\s*([-0-9.]+).*Long:?\s*([-0-9.]+)/i);
        if (matches && matches.length >= 3) {
            return [parseFloat(matches[1]), parseFloat(matches[2])];
        }
    }

    // Case B: City Name Lookup
    // Clean string first: "Patrocínio, Minas Gerais (+20km)" -> "Patrocínio"
    const cleaned = locString.split('(')[0].split(',')[0].trim();
    
    if (CITY_COORDS[cleaned]) {
        return CITY_COORDS[cleaned];
    }
    
    // Fallback: Check if cleaned string keys partially match? 
    // For now strict match on cleaned name.
    
    return null;
};

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);

export const GeoMapWidget: React.FC<Props> = ({ ads }) => {

  const mapData = useMemo(() => {
     const map = new Map<string, LocationMetric>();

     ads.forEach(ad => {
         const rawLoc = ad.target_local_1;
         const coords = getCoordinates(rawLoc);

         if (coords) {
             const key = coords.join(','); // Use coords as unique key
             const current = map.get(key);
             
             // Determine Name (use cleaned rawLoc or existing)
             let name = current?.name || (rawLoc ? rawLoc.split('(')[0].split(',')[0].trim() : 'Local');
             if (name === 'Pin (Coords)') name = `Lat: ${coords[0].toFixed(1)}`; // Fallback for pure coords

             const spend = (current?.spend || 0) + (ad.valor_gasto || 0);
             const leads = (current?.leads || 0) + (ad.msgs_iniciadas || 0); // Using msgs_iniciadas as Leads
             const impressions = (current?.impressions || 0) + (ad.impressoes || 0);

             map.set(key, {
                 name,
                 coords,
                 spend,
                 leads,
                 impressions,
                 cpl: 0 // calc later
             });
         }
     });

     return Array.from(map.values()).map(d => ({
         ...d,
         cpl: d.leads > 0 ? d.spend / d.leads : 0
     }));
  }, [ads]);

  // Metric Calculation for Visuals
  const maxLeads = Math.max(...mapData.map(d => d.leads), 1);
  const minCpl = Math.min(...mapData.map(d => d.cpl));
  const maxCpl = Math.max(...mapData.map(d => d.cpl));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 h-[500px] flex flex-col relative z-0">
       
       <div className="flex items-center justify-between mb-4 relative z-10 pointer-events-none">
          <div className="flex items-center gap-2 pointer-events-auto">
             <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <MapPin size={20} />
             </div>
             <div>
                <h3 className="text-lg font-bold text-slate-800">Mapa de Alcance</h3>
                <p className="text-xs text-slate-500">Distribuição geográfica de leads</p>
             </div>
          </div>
          {/* Legend or Toggles could go here */}
       </div>

       <div className="flex-1 rounded-xl overflow-hidden border border-slate-100 relative z-0">
          <MapContainer 
            center={[-14.2350, -51.9253]} 
            zoom={4} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%' }}
            attributionControl={false}
          >
            {/* CartoDB Positron - Light Grayscale */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {mapData.map((loc, idx) => {
                // Radius Logic: Volume based (Leads)
                // Linear scale: 5px to 25px
                const radius = 5 + ((loc.leads / maxLeads) * 20);

                // Color Logic: CPL based
                // Low CPL (Better) = Darker Blue/Indigo (#4f46e5)
                // High CPL (Worse) = Lighter/Cyan (#22d3ee)
                // Simple threshold or interpolation?
                // Let's use simple conditional for now or 3 tiers.
                
                // Interpolation range check
                const cplRange = maxCpl - minCpl || 1;
                const cplRatio = (loc.cpl - minCpl) / cplRange; // 0 (Good) to 1 (Bad)
                
                // Color hexes
                // Good (Low CPL) -> Indigo 700 (#4338ca)
                // Bad (High CPL) -> Cyan 400 (#22d3ee)
                const isEfficient = cplRatio < 0.4;
                const isAvg = cplRatio >= 0.4 && cplRatio < 0.7;
                
                let fillColor = '#4338ca'; // efficient
                if (isAvg) fillColor = '#6366f1'; // mid
                if (!isEfficient && !isAvg) fillColor = '#22d3ee'; // expensive

                return (
                    <CircleMarker 
                        key={idx} 
                        center={loc.coords}
                        pathOptions={{ 
                            fillColor: fillColor, 
                            color: fillColor, 
                            weight: 1, 
                            opacity: 0.8, 
                            fillOpacity: 0.6 
                        }}
                        radius={radius}
                    >
                        <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                            <div className="text-xs font-sans">
                                <strong className="block mb-1 text-sm text-slate-800 border-b border-slate-200 pb-1">{loc.name}</strong>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
                                    <span className="text-slate-500">Invest:</span> <span>{formatCurrency(loc.spend)}</span>
                                    <span className="text-slate-500">Leads:</span> <span className="font-bold text-indigo-600">{formatNumber(loc.leads)}</span>
                                    <span className="text-slate-500">CPL:</span> <span>{formatCurrency(loc.cpl)}</span>
                                </div>
                            </div>
                        </Tooltip>
                    </CircleMarker>
                )
            })}
          </MapContainer>
       </div>
    </div>
  );
};
