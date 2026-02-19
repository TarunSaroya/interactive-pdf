import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { PLOTS, LAYOUT } from './constants';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, ZoomIn, ZoomOut, Layers, Info, X, Lock, User, FileText, CheckCircle } from 'lucide-react';

interface PlotStatus {
  plot_id: string;
  status: 'available' | 'sold' | 'reserved';
  owner_name?: string;
  notes?: string;
}

export default function App() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedPlot, setSelectedPlot] = useState<string | null>(null);
  const [plotStatuses, setPlotStatuses] = useState<Record<string, PlotStatus>>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch plot statuses
  useEffect(() => {
    fetch('/api/plots')
      .then(res => res.json())
      .then(data => {
        const statusMap: Record<string, PlotStatus> = {};
        data.forEach((p: PlotStatus) => {
          statusMap[p.plot_id] = p;
        });
        setPlotStatuses(statusMap);
      });
  }, []);

  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
    });

    loader.load().then(() => {
      if (mapRef.current) {
        const newMap = new google.maps.Map(mapRef.current, {
          center: LAYOUT.center,
          zoom: 19,
          mapTypeId: 'satellite',
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
          ],
          disableDefaultUI: true,
          zoomControl: true,
        });
        setMap(newMap);
      }
    });
  }, []);

  useEffect(() => {
    if (!map) return;

    // Clear existing polygons (simplified for this demo, in real app keep track of them)
    // Draw plots
    const polygons: google.maps.Polygon[] = [];

    const drawBlock = (type: 'A' | 'B' | 'C' | 'D', startX: number, startY: number, isRight: boolean) => {
      const blockPlots = PLOTS.filter(p => p.type === type);
      let currentX = startX;

      blockPlots.forEach((plot) => {
        const x = currentX;
        const y = startY;

        const coords = getPlotCoords(x, y, plot.width, plot.height);
        const status = plotStatuses[plot.id]?.status || 'available';
        
        const polygon = new google.maps.Polygon({
          paths: coords,
          strokeColor: status === 'sold' ? '#f43f5e' : status === 'reserved' ? '#f59e0b' : '#10b981',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: status === 'sold' ? '#f43f5e' : status === 'reserved' ? '#f59e0b' : '#10b981',
          fillOpacity: 0.35,
          map: map,
        });

        polygon.addListener('click', () => {
          setSelectedPlot(plot.id);
          map.panTo(coords[0]);
        });

        polygon.addListener('mouseover', () => {
          polygon.setOptions({ fillOpacity: 0.6 });
        });

        polygon.addListener('mouseout', () => {
          polygon.setOptions({ fillOpacity: 0.35 });
        });

        polygons.push(polygon);

        // Advance currentX for the next plot
        currentX += (isRight ? -plot.width : plot.width);
      });
    };

    // Layout blocks based on the PDF structure
    // Road 30ft separates C/D from A/B
    // Road 25ft separates left blocks from right blocks
    
    // Top Left (D20-D12, C20-C12)
    drawBlock('D', -300, 60, false); 
    drawBlock('C', -300, 20, false); 

    // Top Right (D11-D1, C11-C1)
    drawBlock('D', 50, 60, false);
    drawBlock('C', 50, 20, false);

    // Bottom Left (B21-B13, A21-A13)
    drawBlock('B', -300, -60, false);
    drawBlock('A', -300, -105, false);

    // Bottom Right (B12-B1, A12-A1)
    drawBlock('B', 50, -60, false);
    drawBlock('A', 50, -105, false);

    return () => {
      polygons.forEach(p => p.setMap(null));
    };
  }, [map, plotStatuses]);

  const getPlotCoords = (offsetX: number, offsetY: number, width: number, height: number) => {
    const { center, rotation, feetToLat, feetToLng } = LAYOUT;
    const angle = (rotation * Math.PI) / 180;

    const corners = [
      { x: offsetX, y: offsetY },
      { x: offsetX + width, y: offsetY },
      { x: offsetX + width, y: offsetY + height },
      { x: offsetX, y: offsetY + height },
    ];

    return corners.map(c => {
      const rx = c.x * Math.cos(angle) - c.y * Math.sin(angle);
      const ry = c.x * Math.sin(angle) + c.y * Math.cos(angle);
      return {
        lat: center.lat + ry * feetToLat,
        lng: center.lng + rx * feetToLng,
      };
    });
  };

  const handleAdminLogin = () => {
    if (password === 'tarun@123') {
      setIsAdmin(true);
      setShowAdminLogin(false);
      setPassword('');
    } else {
      alert('Incorrect password');
    }
  };

  const updatePlotStatus = async (id: string, updates: Partial<PlotStatus>) => {
    const current = plotStatuses[id] || { plot_id: id, status: 'available' };
    const payload = { ...current, ...updates };
    
    const res = await fetch(`/api/plots/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setPlotStatuses(prev => ({ ...prev, [id]: payload }));
      setIsEditing(false);
    }
  };

  const currentPlotData = PLOTS.find(p => p.id === selectedPlot);
  const currentPlotStatus = selectedPlot ? plotStatuses[selectedPlot] : null;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-background">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 p-6 pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass p-4 rounded-2xl pointer-events-auto"
          >
            <h1 className="text-2xl font-bold tracking-tight text-emerald-500">BALAJI VIHAR</h1>
            <p className="text-xs text-white/60 font-mono uppercase tracking-widest">Property Plotting System</p>
          </motion.div>

          <div className="flex gap-3 pointer-events-auto">
            <button 
              onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminLogin(true)}
              className="glass p-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              {isAdmin ? <Lock className="w-5 h-5 text-emerald-500" /> : <Lock className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Map Container */}
      <div ref={mapRef} className="h-full w-full" />

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-10">
        <div className="glass p-4 rounded-2xl flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs font-medium">Available</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="text-xs font-medium">Sold</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="text-xs font-medium">Reserved</span>
          </div>
        </div>
      </div>

      {/* Plot Details Panel */}
      <AnimatePresence>
        {selectedPlot && currentPlotData && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute top-0 right-0 h-full w-full max-w-md z-20 glass border-l border-white/10 p-8 overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-bold">Plot {selectedPlot}</h2>
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mt-2 ${
                  (currentPlotStatus?.status || 'available') === 'available' ? 'bg-emerald-500/20 text-emerald-500' :
                  currentPlotStatus?.status === 'sold' ? 'bg-rose-500/20 text-rose-500' : 'bg-amber-500/20 text-amber-500'
                }`}>
                  {currentPlotStatus?.status || 'available'}
                </span>
              </div>
              <button 
                onClick={() => { setSelectedPlot(null); setIsEditing(false); }}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Dimensions</p>
                <p className="text-xl font-mono">{currentPlotData.width}' × {currentPlotData.height}'</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-white/40 uppercase font-bold mb-1">Total Area</p>
                <p className="text-xl font-mono">{currentPlotData.area || (currentPlotData.width * currentPlotData.height)} <span className="text-xs">sq.ft</span></p>
              </div>
            </div>

            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Info className="w-4 h-4" /> Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-white/80">
                    <User className="w-5 h-5 text-white/40" />
                    <span>{currentPlotStatus?.owner_name || 'No owner assigned'}</span>
                  </div>
                  <div className="flex items-start gap-3 text-white/80">
                    <FileText className="w-5 h-5 text-white/40 mt-1" />
                    <p className="text-sm leading-relaxed">
                      {currentPlotStatus?.notes || 'No additional notes for this plot.'}
                    </p>
                  </div>
                </div>
              </section>

              {isAdmin && (
                <section className="pt-6 border-t border-white/10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Admin Controls
                    </h3>
                    {!isEditing && (
                      <button 
                        onClick={() => setIsEditing(true)}
                        className="text-xs font-bold hover:underline"
                      >
                        Edit Details
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4 bg-emerald-500/5 p-6 rounded-2xl border border-emerald-500/20">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-white/40 mb-2">Status</label>
                        <select 
                          className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500"
                          value={currentPlotStatus?.status || 'available'}
                          onChange={(e) => updatePlotStatus(selectedPlot, { status: e.target.value as any })}
                        >
                          <option value="available">Available</option>
                          <option value="sold">Sold</option>
                          <option value="reserved">Reserved</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-white/40 mb-2">Owner Name</label>
                        <input 
                          type="text"
                          className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500"
                          defaultValue={currentPlotStatus?.owner_name}
                          onBlur={(e) => updatePlotStatus(selectedPlot, { owner_name: e.target.value })}
                          placeholder="Enter owner name"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-white/40 mb-2">Notes</label>
                        <textarea 
                          className="w-full bg-background border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:border-emerald-500 h-24"
                          defaultValue={currentPlotStatus?.notes}
                          onBlur={(e) => updatePlotStatus(selectedPlot, { notes: e.target.value })}
                          placeholder="Enter plot notes"
                        />
                      </div>
                      <button 
                        onClick={() => setIsEditing(false)}
                        className="w-full bg-emerald-500 text-background font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Save Changes
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                      <p className="text-xs text-white/40">Plot details are currently locked. Click edit to modify.</p>
                    </div>
                  )}
                </section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-background/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="glass p-8 rounded-3xl w-full max-w-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-500" /> Admin Access
                </h2>
                <button onClick={() => setShowAdminLogin(false)}>
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-white/60 mb-6">Please enter the administrator password to enable editing mode.</p>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                placeholder="Enter password"
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 mb-4 focus:outline-none focus:border-emerald-500 transition-colors"
                autoFocus
              />
              <button 
                onClick={handleAdminLogin}
                className="w-full bg-emerald-500 text-background font-bold py-4 rounded-xl hover:bg-emerald-400 transition-colors"
              >
                Login
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
