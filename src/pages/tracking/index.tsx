import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import {
  IconArrowLeft,
  IconRefresh,
  IconTruck,
  IconPhone,
  IconUser,
  IconAlertCircle,
  IconCircleCheck,
  IconRoute,
  IconClock,
  IconBrandWhatsapp,
  IconGps,
  IconChevronDown,
  IconMoon,
  IconSun,
  IconSatellite,
  IconTrafficLights,
  IconMaximize,
  IconMinimize,
  IconGauge,
} from '@tabler/icons-react';
import client from '@/api/client';
import { Button } from '@/components/custom/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow, format } from 'date-fns';

// ---------- Types ----------
interface LiveLocation {
  lat: number;
  lng: number;
  timestamp: string;
  address: string;
  speed?: number;
}

interface LocationPoint {
  lat: number;
  lng: number;
  timestamp: string;
  address: string;
  speed?: number;
}

interface TrackingData {
  success: boolean;
  trackingEnabled: boolean;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  status?: 'ACTIVE' | 'IDLE' | 'OFFLINE' | 'COMPLETED';
  fromDestination?: string;
  toDestination?: string;
  consentStatus?: 'ALLOWED' | 'DENIED' | 'PENDING' | 'EXPIRED';
  liveLocation?: LiveLocation | null;
  history?: LocationPoint[];
  distanceCovered?: number;
  remainingDistance?: number;
}

declare const google: any;

const REFRESH_INTERVAL = 15000;
const MAX_HISTORY_POINTS = 100;

// Status → Tailwind classes (static map so Tailwind's compiler can see every class)
const STATUS_STYLES: Record<string, { badge: string; dot: string; hex: string }> = {
  ACTIVE: { badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500', hex: '#10b981' },
  IDLE: { badge: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500', hex: '#f59e0b' },
  OFFLINE: { badge: 'bg-slate-100 border-slate-200 text-slate-600', dot: 'bg-slate-400', hex: '#94a3b8' },
  COMPLETED: { badge: 'bg-blue-50 border-blue-200 text-blue-700', dot: 'bg-blue-500', hex: '#3b82f6' },
};

type MapMode = 'light' | 'dark' | 'satellite';

const LIGHT_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#f5f5f5' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#333333' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#e3f2fd' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e8f5e9' }] },
];

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1f2b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8a93a6' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1f2b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a3040' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1f2b' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#33394a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f1520' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#222836' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ color: '#3a4152' }] },
];

// A small rotated arrow-in-circle marker so the vehicle icon points the way it's heading.
function vehicleIconUrl(headingDeg: number, colorHex: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40">
    <g transform="rotate(${Math.round(headingDeg)} 20 20)">
      <circle cx="20" cy="20" r="15" fill="${colorHex}" stroke="white" stroke-width="3"/>
      <path d="M20 9 L27 25 L20 20.5 L13 25 Z" fill="white"/>
    </g>
  </svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Glides a marker between two points with easing, instead of snapping on each refresh.
function animateMarker(marker: any, from: any, to: any, token: { id: number }, myId: number, durationMs = 900) {
  const start = performance.now();
  const fromLat = from.lat();
  const fromLng = from.lng();
  const toLat = to.lat();
  const toLng = to.lng();
  const step = (now: number) => {
    if (token.id !== myId) return; // a newer animation superseded this one
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3);
    marker.setPosition(new google.maps.LatLng(fromLat + (toLat - fromLat) * eased, fromLng + (toLng - fromLng) * eased));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function LiveTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mapMode, setMapMode] = useState<MapMode>('light');
  const [trafficOn, setTrafficOn] = useState(false);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [routeOptions, setRouteOptions] = useState<{ distance: string; duration: string; path: any[] }[]>([]);
  const [selectedRoute, setSelectedRoute] = useState(0);

  const mapWrapperRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const infoWindowRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trafficLayerRef = useRef<any>(null);
  const vehicleMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const prevPosRef = useRef<any>(null);
  const headingRef = useRef<number>(0);
  const animTokenRef = useRef({ id: 0 });
  const hasFitOnceRef = useRef(false);
  const directionsServiceRef = useRef<any>(null);
  const routePolylinesRef = useRef<any[]>([]);
  const lastRouteKeyRef = useRef<string | null>(null);

  // ---------- Data fetching ----------
  const fetchTrackingData = useCallback(async (showToast = false) => {
    if (!id) return;
    try {
      if (showToast) setRefreshing(true);
      const res = await client.get<TrackingData>(`/movements/${id}/tracking`);
      if (res.data.history && res.data.history.length > MAX_HISTORY_POINTS) {
        res.data.history = res.data.history.slice(-MAX_HISTORY_POINTS);
      }
      setData(res.data);
      setLastUpdate(new Date());
      if (showToast) {
        toast({ title: 'Location updated', description: `Refreshed at ${format(new Date(), 'hh:mm a')}` });
      }
    } catch (err: any) {
      toast({
        title: 'Couldn\u2019t refresh location',
        description: err?.message || 'Please try again in a moment.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchTrackingData();
    intervalRef.current = setInterval(() => isLive && fetchTrackingData(false), REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, fetchTrackingData, isLive]);

  // ---------- Google Maps loading ----------
  useEffect(() => {
    // Already loaded (e.g. from a previous mount) — use it directly.
    if (window.google?.maps) {
      setGoogleReady(true);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setMapError('Google Maps API key is not configured.');
      setLoading(false);
      return;
    }

    let cancelled = false;

    setOptions({
      key: apiKey,
      v: 'weekly',
      libraries: ['geometry'],
    });

    Promise.all([importLibrary('maps'), importLibrary('geometry')])
      .then(() => {
        if (!cancelled) {
          setGoogleReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMapError('Failed to load Google Maps. Check your connection.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };

    const scriptId = 'google-maps-script';
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

    // A script tag is already in the document (e.g. mounted elsewhere) —
    // poll briefly instead of assuming `onload` will fire again.
    if (existing) {
      const check = setInterval(() => {
        if (window.google?.maps) {
          clearInterval(check);
          setGoogleReady(true);
        }
      }, 100);
      return () => clearInterval(check);
    }

    // `loading=async` fires the script's `onload` as soon as the bootstrap
    // loader downloads — not once `google.maps` is actually ready — so we
    // use Maps' own `callback` param instead, which only fires when the
    // API is fully initialized.
    const callbackName = '__googleMapsTrackingReady';
    (window as any)[callbackName] = () => setGoogleReady(true);

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      setMapError('Failed to load Google Maps. Check your connection.');
      setLoading(false);
    };
    document.head.appendChild(script);

    return () => {
      delete (window as any)[callbackName];
    };
  }, []);

  // ---------- Map init ----------
  useEffect(() => {
    if (!googleReady || !mapRef.current || mapInstanceRef.current) return;
    try {
      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: { lat: 21.1702, lng: 72.8311 },
        zoom: 12,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
        styles: LIGHT_MAP_STYLE,
      });
      infoWindowRef.current = new google.maps.InfoWindow();
      geocoderRef.current = new google.maps.Geocoder();

      // If the person drags the map themselves, stop auto-recentering on the vehicle
      // until they explicitly ask to follow again via the locate button.
      mapInstanceRef.current.addListener('dragstart', () => setFollowVehicle(false));
    } catch {
      setMapError('Failed to initialize the map.');
    }
  }, [googleReady]);

  // ---------- Map style / type switching ----------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (mapMode === 'satellite') {
      map.setMapTypeId('hybrid');
    } else {
      map.setMapTypeId('roadmap');
      map.setOptions({ styles: mapMode === 'dark' ? DARK_MAP_STYLE : LIGHT_MAP_STYLE });
    }
  }, [mapMode, googleReady]);

  // ---------- Traffic layer ----------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !googleReady) return;
    if (!trafficLayerRef.current) trafficLayerRef.current = new google.maps.TrafficLayer();
    trafficLayerRef.current.setMap(trafficOn ? map : null);
  }, [trafficOn, googleReady]);

  // ---------- Route alternatives (pickup → delivery) ----------
  useEffect(() => {
    if (!googleReady || !data?.fromDestination || !data?.toDestination) return;
    const key = `${data.fromDestination}|${data.toDestination}`;
    if (lastRouteKeyRef.current === key) return;
    lastRouteKeyRef.current = key;

    if (!directionsServiceRef.current) directionsServiceRef.current = new google.maps.DirectionsService();
    directionsServiceRef.current.route(
      {
        origin: data.fromDestination,
        destination: data.toDestination,
        travelMode: google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
      },
      (result: any, status: any) => {
        if (status !== 'OK' || !result?.routes?.length) return;
        setRouteOptions(
          result.routes.map((r: any) => ({
            path: r.overview_path,
            distance: r.legs?.[0]?.distance?.text || '',
            duration: r.legs?.[0]?.duration?.text || '',
          }))
        );
        setSelectedRoute(0);
      }
    );
  }, [googleReady, data?.fromDestination, data?.toDestination]);

  // Draw the route options — the picked one bold and blue, the rest quiet and
  // clickable so tapping any line on the map also switches to it.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    routePolylinesRef.current.forEach((p) => p.setMap(null));
    routePolylinesRef.current = routeOptions.map((opt, i) => {
      const isSelected = i === selectedRoute;
      const poly = new google.maps.Polyline({
        path: opt.path,
        map,
        strokeColor: isSelected ? '#2563eb' : '#94a3b8',
        strokeOpacity: isSelected ? 0.9 : 0.55,
        strokeWeight: isSelected ? 5 : 3,
        zIndex: isSelected ? 10 : 1,
      });
      poly.addListener('click', () => setSelectedRoute(i));
      return poly;
    });
    return () => {
      routePolylinesRef.current.forEach((p) => p.setMap(null));
    };
  }, [routeOptions, selectedRoute]);

  // ---------- Fullscreen ----------
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!mapWrapperRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      mapWrapperRef.current.requestFullscreen?.();
    }
  }, []);

  // ---------- Map update ----------
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !data || !googleReady) return;

    markersRef.current.forEach((m) => m.setMap?.(null));
    markersRef.current = [];
    polylineRef.current?.setMap(null);
    polylineRef.current = null;

    const bounds = new google.maps.LatLngBounds();
    const history = data.history || [];
    const live = data.liveLocation;

    const addPin = (loc: any, label: string, color: string) => {
      const marker = new google.maps.Marker({
        map,
        position: loc,
        label: { text: label, color: 'white', fontWeight: 'bold', fontSize: '11px' },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          scale: 12,
        },
      });
      markersRef.current.push(marker);
      bounds.extend(loc);
    };

    if (geocoderRef.current) {
      if (data.fromDestination) {
        geocoderRef.current.geocode({ address: data.fromDestination }, (r: any, s: any) => {
          if (s === 'OK' && r?.[0]) addPin(r[0].geometry.location, 'O', '#22c55e');
        });
      }
      if (data.toDestination) {
        geocoderRef.current.geocode({ address: data.toDestination }, (r: any, s: any) => {
          if (s === 'OK' && r?.[0]) addPin(r[0].geometry.location, 'D', '#ef4444');
        });
      }
    }

    if (history.length > 0) {
      const path = history.map((p) => new google.maps.LatLng(p.lat, p.lng));
      path.forEach((p) => bounds.extend(p));
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        map,
      });
    }

    if (live) {
      const newPos = new google.maps.LatLng(live.lat, live.lng);
      bounds.extend(newPos);
      const prevPos = prevPosRef.current;
      const colorHex = STATUS_STYLES[data.status || 'OFFLINE']?.hex || STATUS_STYLES.OFFLINE.hex;

      // Point the marker the way it's actually moving.
      if (prevPos && (prevPos.lat() !== newPos.lat() || prevPos.lng() !== newPos.lng())) {
        if (google.maps.geometry?.spherical) {
          headingRef.current = google.maps.geometry.spherical.computeHeading(prevPos, newPos);
        } else {
          // Manual fallback calculation in degrees
          const dLat = newPos.lat() - prevPos.lat();
          const dLng = newPos.lng() - prevPos.lng();
          headingRef.current = (Math.atan2(dLng, dLat) * 180) / Math.PI;
        }
      }
      const icon = {
        url: vehicleIconUrl(headingRef.current, colorHex),
        scaledSize: new google.maps.Size(40, 40),
        anchor: new google.maps.Point(20, 20),
      };

      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = new google.maps.Circle({
          strokeColor: colorHex,
          strokeOpacity: 0.25,
          strokeWeight: 2,
          fillColor: colorHex,
          fillOpacity: 0.08,
          map,
          center: newPos,
          radius: 180,
        });
      } else {
        accuracyCircleRef.current.setCenter(newPos);
        accuracyCircleRef.current.setOptions({ strokeColor: colorHex, fillColor: colorHex });
      }

      if (!vehicleMarkerRef.current) {
        vehicleMarkerRef.current = new google.maps.Marker({ map, position: newPos, icon, zIndex: 999 });
        vehicleMarkerRef.current.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="padding:6px;max-width:220px;font-family:inherit">
              <p style="font-weight:600;font-size:13px;margin:0 0 4px">${live.address || 'Current location'}</p>
              <p style="font-size:11px;color:#777;margin:0">${format(new Date(live.timestamp), 'hh:mm a')}${live.speed ? ` \u2022 ${live.speed} km/h` : ''}</p>
            </div>
          `);
          infoWindowRef.current.open(map, vehicleMarkerRef.current);
        });
      } else {
        vehicleMarkerRef.current.setIcon(icon);
        if (prevPos) {
          animTokenRef.current.id += 1;
          animateMarker(vehicleMarkerRef.current, prevPos, newPos, animTokenRef.current, animTokenRef.current.id);
        } else {
          vehicleMarkerRef.current.setPosition(newPos);
        }
      }

      prevPosRef.current = newPos;
      if (followVehicle) map.panTo(newPos);
    }

    // Only auto-fit the whole route once, on first load — after that, the
    // vehicle marker's own smooth panning takes over so the view doesn't
    // jump or re-zoom on every refresh.
    if (!bounds.isEmpty() && !hasFitOnceRef.current) {
      map.fitBounds(bounds, 60);
      hasFitOnceRef.current = true;
      google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        if (map.getZoom() > 15) map.setZoom(15);
      });
    }
  }, [data, googleReady, followVehicle]);

  const status = data?.status || 'OFFLINE';
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.OFFLINE;
  const consentApproved = data?.consentStatus === 'ALLOWED';

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="flex h-screen w-full flex-col bg-slate-50">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/transport-requests/outbound")} className="h-8 w-8 rounded-full p-0 text-slate-600 hover:bg-slate-100">
            <IconArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <IconTruck className="h-4 w-4 shrink-0 text-blue-600" />
              <h1 className="truncate text-sm font-semibold text-slate-900">{data?.vehicleNumber || 'Vehicle'}</h1>
              <Badge variant="outline" className={`shrink-0 text-[10px] ${statusStyle.badge}`}>
                <span className={`mr-1 h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                {status}
              </Badge>
            </div>
            <p className="truncate text-xs text-slate-500">
              {data?.fromDestination && data?.toDestination ? `${data.fromDestination} → ${data.toDestination}` : 'No route assigned'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {lastUpdate && (
            <span className="hidden text-[10px] text-slate-400 sm:inline">Updated {formatDistanceToNow(lastUpdate, { addSuffix: true })}</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className={`h-8 gap-1.5 text-xs ${isLive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-600'}`}
          >
            <IconCircleCheck className="h-3.5 w-3.5" />
            {isLive ? 'Live' : 'Paused'}
          </Button>
          <Button size="sm" onClick={() => fetchTrackingData(true)} disabled={refreshing} className="h-8 gap-1.5 border border-slate-200 bg-white text-xs text-slate-700 hover:bg-slate-50">
            <IconRefresh className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Sidebar */}
        <aside className="w-full overflow-y-auto border-r border-slate-200 bg-white p-4 lg:w-96">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-4 p-4">
              {/* Driver */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                  <IconUser className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">{data?.driverName || 'Driver not assigned'}</p>
                  <p className="text-xs text-slate-500">{data?.driverPhone || 'No phone on file'}</p>
                </div>
                {data?.driverPhone && (
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 hover:bg-slate-100" onClick={() => window.open(`tel:${data.driverPhone}`)}>
                      <IconPhone className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0 hover:bg-slate-100" onClick={() => window.open(`https://wa.me/${data.driverPhone}`)}>
                      <IconBrandWhatsapp className="h-4 w-4 text-emerald-600" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Consent */}
              {!consentApproved && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-700">
                  <IconAlertCircle className="mr-1 inline h-3.5 w-3.5" />
                  Awaiting driver consent — reply <strong>Y</strong> to the SMS from <strong>51712032</strong>.
                </div>
              )}

              {/* Route */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <IconRoute className="h-3.5 w-3.5" /> Route
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-4 w-0.5 shrink-0 rounded bg-green-500" />
                  <p className="min-w-0 flex-1 truncate text-sm text-slate-800">{data?.fromDestination || 'N/A'}</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-4 w-0.5 shrink-0 rounded bg-red-500" />
                  <p className="min-w-0 flex-1 truncate text-sm text-slate-800">{data?.toDestination || 'N/A'}</p>
                </div>
                {(data?.distanceCovered !== undefined || data?.remainingDistance !== undefined) && (
                  <div className="flex justify-between pt-1 text-xs text-slate-500">
                    <span>{data?.distanceCovered ?? 0} km covered</span>
                    <span>{data?.remainingDistance ?? 0} km left</span>
                  </div>
                )}
              </div>

              {/* Live info */}
              {data?.liveLocation && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <span>Last seen {formatDistanceToNow(new Date(data.liveLocation.timestamp), { addSuffix: true })}</span>
                  {data.liveLocation.speed !== undefined && <span>{data.liveLocation.speed} km/h</span>}
                </div>
              )}

              {/* History (collapsible) */}
              {data?.history && data.history.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setHistoryOpen(!historyOpen)}
                    className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500"
                  >
                    <span className="flex items-center gap-2">
                      <IconClock className="h-3.5 w-3.5" /> History ({data.history.length})
                    </span>
                    <IconChevronDown className={`h-3.5 w-3.5 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {historyOpen && (
                    <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                      {data.history.slice(-5).reverse().map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-slate-600">
                          <span className="truncate">{p.address || 'Location point'}</span>
                          <span className="shrink-0 text-slate-400">{format(new Date(p.timestamp), 'hh:mm a')}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Map */}
        <main ref={mapWrapperRef} className="relative flex-1 bg-slate-100">
          {mapError ? (
            <MapMessage icon={<IconAlertCircle className="mx-auto h-10 w-10 text-rose-500" />} title="Map unavailable" text={mapError} onRetry={() => window.location.reload()} />
          ) : !googleReady ? (
            <MapMessage icon={<IconRefresh className="mx-auto h-8 w-8 animate-spin text-blue-600" />} title="Loading map" text="Just a moment…" />
          ) : (
            <>
              <div ref={mapRef} className="h-full w-full min-h-[400px]" />

              {/* Style switcher — top left */}
              <div className="absolute left-3 top-3 flex gap-0.5 rounded-full bg-white/95 p-1 shadow-lg backdrop-blur">
                {(
                  [
                    { mode: 'light' as MapMode, icon: IconSun, label: 'Light' },
                    { mode: 'dark' as MapMode, icon: IconMoon, label: 'Dark' },
                    { mode: 'satellite' as MapMode, icon: IconSatellite, label: 'Satellite' },
                  ]
                ).map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    title={label}
                    onClick={() => setMapMode(mode)}
                    className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                      mapMode === mode ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>

              {/* Traffic + fullscreen — top right */}
              <div className="absolute right-3 top-3 flex gap-2">
                <button
                  title="Toggle live traffic"
                  onClick={() => setTrafficOn(!trafficOn)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full shadow-lg backdrop-blur transition-colors ${
                    trafficOn ? 'bg-blue-600 text-white' : 'bg-white/95 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <IconTrafficLights className="h-4 w-4" />
                </button>
                <button
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  onClick={toggleFullscreen}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-lg backdrop-blur hover:bg-slate-50"
                >
                  {isFullscreen ? <IconMinimize className="h-4 w-4" /> : <IconMaximize className="h-4 w-4" />}
                </button>
              </div>

              {/* Route alternatives — pick a route, above the stats pill */}
              {routeOptions.length > 1 && (
                <div className="absolute bottom-16 left-3 right-3 flex gap-2 overflow-x-auto pb-1 sm:right-auto">
                  {routeOptions.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedRoute(i)}
                      className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg backdrop-blur transition-colors ${
                        i === selectedRoute ? 'bg-blue-600 text-white' : 'bg-white/95 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <IconRoute className="h-3.5 w-3.5" />
                      Route {i + 1} · {opt.distance} · {opt.duration}
                    </button>
                  ))}
                </div>
              )}

              {/* Live stats — bottom left */}
              {data?.liveLocation && (
                <div className="absolute bottom-4 left-3 flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-2.5 shadow-lg backdrop-blur">
                  <div className="flex items-center gap-1.5">
                    <IconGauge className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-900">{data.liveLocation.speed ?? 0}</span>
                    <span className="text-[10px] text-slate-400">km/h</span>
                  </div>
                  {data.remainingDistance !== undefined && (
                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                      <IconRoute className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-900">{data.remainingDistance}</span>
                      <span className="text-[10px] text-slate-400">km left</span>
                    </div>
                  )}
                  {!!data.liveLocation.speed && data.remainingDistance !== undefined && (
                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                      <IconClock className="h-4 w-4 text-slate-500" />
                      <span className="text-sm font-semibold text-slate-900">
                        {(data.remainingDistance / data.liveLocation.speed).toFixed(1)}
                      </span>
                      <span className="text-[10px] text-slate-400">hr ETA</span>
                    </div>
                  )}
                </div>
              )}

              {/* Locate / follow — bottom right */}
              {data?.liveLocation && (
                <Button
                  variant="secondary"
                  size="sm"
                  title={followVehicle ? 'Following vehicle' : 'Recenter and follow'}
                  className={`absolute bottom-4 right-4 h-9 w-9 rounded-full p-0 shadow-lg ${
                    followVehicle ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  onClick={() => {
                    if (!data.liveLocation || !mapInstanceRef.current) return;
                    setFollowVehicle(true);
                    mapInstanceRef.current.panTo({ lat: data.liveLocation.lat, lng: data.liveLocation.lng });
                    mapInstanceRef.current.setZoom(14);
                  }}
                >
                  <IconGps className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------- Small presentational helpers ----------
function LoadingSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-white">
      <div className="border-b p-4">
        <Skeleton className="h-8 w-40" />
      </div>
      <div className="flex-1 space-y-4 p-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}

function MapMessage({ icon, title, text, onRetry }: { icon: React.ReactNode; title: string; text: string; onRetry?: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white p-6">
      <div className="max-w-sm text-center">
        {icon}
        <h3 className="mt-3 text-base font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{text}</p>
        {onRetry && (
          <Button className="mt-4" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
