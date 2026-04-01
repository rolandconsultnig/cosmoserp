import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Users, Package, MapPin, Phone, CheckCircle, XCircle,
  Clock, AlertTriangle, Search, Star, Navigation, Loader2,
  UserPlus, ToggleLeft, ToggleRight, ChevronRight, Eye,
  TrendingUp, Activity, ArrowRight, Bike, Car, Box,
  RefreshCw, Filter, Globe, Building2, X, Mic, Volume2, VolumeX,
  ZoomIn, ZoomOut, Route,
} from 'lucide-react';
import api from '../lib/api';
import { formatDate, formatDateTime, formatCurrency, getStatusColor, cn } from '../lib/utils';

/* ── Design tokens ───────────────────────────────────────── */
const LG = {
  blue:       '#0052CC',
  blueMid:    '#0066FF',
  blueLight:  '#EBF2FF',
  teal:       '#00875A',
  tealLight:  '#E3FCEF',
  amber:      '#FF8B00',
  amberLight: '#FFF7E6',
  red:        '#DE350B',
  redLight:   '#FFEBE6',
  navy:       '#091E42',
  navyMid:    '#172B4D',
  grey:       '#F4F5F7',
  slate:      '#6B778C',
};

const BOLT_UI = {
  green: '#34D058',
  greenSoft: '#86EFAC',
  mapDark: '#0B1220',
  mapDarkMid: '#101A2C',
  mapDarkLight: '#1A2740',
};

/* ── Delivery status config ───────────────────────────────── */
const DELIVERY_STATUS = {
  PENDING_PICKUP: { label: 'Pending Pickup', bg: LG.amberLight, text: LG.amber,     border: '#FFE0A3', dot: LG.amber },
  IN_TRANSIT:     { label: 'In Transit',     bg: LG.blueLight,  text: LG.blue,      border: '#A4CDFF', dot: LG.blueMid },
  OUT_FOR_DELIVERY:{ label: 'Out for Delivery',bg: '#F3E8FF',   text: '#5B21B6',    border: '#DDD6FE', dot: '#8B5CF6' },
  DELIVERED:      { label: 'Delivered',      bg: LG.tealLight,  text: LG.teal,      border: '#ABF5D1', dot: LG.teal },
  FAILED:         { label: 'Failed',         bg: LG.redLight,   text: LG.red,       border: '#FFC3B2', dot: LG.red },
  RETURNED:       { label: 'Returned',       bg: '#F1F5F9',     text: '#475569',    border: '#CBD5E1', dot: '#94A3B8' },
};

/* ── Agent status config ──────────────────────────────────── */
const AGENT_STATUS = {
  ACTIVE:    { label: 'Active',    bg: LG.tealLight,  text: LG.teal,  dot: LG.teal },
  PENDING:   { label: 'Pending',   bg: LG.amberLight, text: LG.amber, dot: LG.amber },
  SUSPENDED: { label: 'Suspended', bg: LG.redLight,   text: LG.red,   dot: LG.red },
  OFFLINE:   { label: 'Offline',   bg: '#F1F5F9',     text: '#475569', dot: '#94A3B8' },
};

const VEHICLE_ICONS = { BIKE: Bike, MOTORCYCLE: Bike, CAR: Car, VAN: Truck, TRUCK: Truck };

const MAP_BOUNDS = { minLat: 4.0, maxLat: 14.5, minLng: 2.5, maxLng: 14.8 };
const STATE_COORDS = {
  abia: { lat: 5.45, lng: 7.52 },
  adamawa: { lat: 9.33, lng: 12.39 },
  akwaibom: { lat: 5.0, lng: 7.85 },
  lagos: { lat: 6.52, lng: 3.37 },
  anambra: { lat: 6.22, lng: 6.93 },
  bauchi: { lat: 10.31, lng: 9.84 },
  bayelsa: { lat: 4.92, lng: 6.26 },
  benue: { lat: 7.19, lng: 8.74 },
  borno: { lat: 11.84, lng: 13.15 },
  crossriver: { lat: 4.95, lng: 8.32 },
  delta: { lat: 5.53, lng: 5.75 },
  ebonyi: { lat: 6.26, lng: 8.11 },
  edo: { lat: 6.34, lng: 5.62 },
  ekiti: { lat: 7.67, lng: 5.22 },
  enugu: { lat: 6.45, lng: 7.51 },
  fct: { lat: 9.08, lng: 7.4 },
  gombe: { lat: 10.29, lng: 11.17 },
  imo: { lat: 5.48, lng: 7.03 },
  jigawa: { lat: 12.23, lng: 9.56 },
  kaduna: { lat: 10.52, lng: 7.44 },
  kano: { lat: 12.0, lng: 8.52 },
  katsina: { lat: 12.99, lng: 7.6 },
  kebbi: { lat: 12.45, lng: 4.2 },
  kogi: { lat: 7.8, lng: 6.74 },
  kwara: { lat: 8.96, lng: 4.56 },
  nasarawa: { lat: 8.54, lng: 8.32 },
  niger: { lat: 9.61, lng: 6.56 },
  ogun: { lat: 7.16, lng: 3.35 },
  ondo: { lat: 7.25, lng: 5.2 },
  osun: { lat: 7.77, lng: 4.56 },
  oyo: { lat: 7.38, lng: 3.93 },
  plateau: { lat: 9.93, lng: 8.89 },
  rivers: { lat: 4.81, lng: 7.01 },
  sokoto: { lat: 13.06, lng: 5.24 },
  taraba: { lat: 8.89, lng: 11.36 },
  yobe: { lat: 12.0, lng: 11.5 },
  zamfara: { lat: 12.17, lng: 6.66 },
};

const STATE_LABELS = {
  abia: 'Abia', adamawa: 'Adamawa', akwaibom: 'Akwa Ibom', anambra: 'Anambra',
  bauchi: 'Bauchi', bayelsa: 'Bayelsa', benue: 'Benue', borno: 'Borno',
  crossriver: 'Cross River', delta: 'Delta', ebonyi: 'Ebonyi', edo: 'Edo',
  ekiti: 'Ekiti', enugu: 'Enugu', fct: 'FCT Abuja', gombe: 'Gombe',
  imo: 'Imo', jigawa: 'Jigawa', kaduna: 'Kaduna', kano: 'Kano',
  katsina: 'Katsina', kebbi: 'Kebbi', kogi: 'Kogi', kwara: 'Kwara',
  lagos: 'Lagos', nasarawa: 'Nasarawa', niger: 'Niger', ogun: 'Ogun',
  ondo: 'Ondo', osun: 'Osun', oyo: 'Oyo', plateau: 'Plateau',
  rivers: 'Rivers', sokoto: 'Sokoto', taraba: 'Taraba', yobe: 'Yobe', zamfara: 'Zamfara',
};

const CITY_COORDS = {
  lagos: { lat: 6.52, lng: 3.37 },
  abuja: { lat: 9.08, lng: 7.4 },
  ibadan: { lat: 7.38, lng: 3.93 },
  portharcourt: { lat: 4.81, lng: 7.01 },
  kano: { lat: 12.0, lng: 8.52 },
  kaduna: { lat: 10.52, lng: 7.44 },
  enugu: { lat: 6.45, lng: 7.51 },
  warri: { lat: 5.52, lng: 5.75 },
  benin: { lat: 6.34, lng: 5.62 },
  calabar: { lat: 4.95, lng: 8.32 },
  owerri: { lat: 5.48, lng: 7.03 },
  maiduguri: { lat: 11.84, lng: 13.15 },
  sokoto: { lat: 13.06, lng: 5.24 },
  jos: { lat: 9.93, lng: 8.89 },
};

function normalizeGeoKey(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '');
}

function resolveCoords({ city, state }) {
  const cityKey = normalizeGeoKey(city);
  const stateKey = normalizeGeoKey(state);
  if (cityKey && CITY_COORDS[cityKey]) return CITY_COORDS[cityKey];
  if (stateKey && STATE_COORDS[stateKey]) return STATE_COORDS[stateKey];
  return null;
}

function resolveStateKey(value) {
  const key = normalizeGeoKey(value);
  if (key === 'abuja') return 'fct';
  return STATE_COORDS[key] ? key : null;
}

function inferCoordsFromText(...values) {
  const combined = normalizeGeoKey(values.filter(Boolean).join(' '));
  if (!combined) return null;

  for (const [cityKey, coords] of Object.entries(CITY_COORDS)) {
    if (combined.includes(cityKey)) return coords;
  }
  for (const [stateKey, coords] of Object.entries(STATE_COORDS)) {
    if (combined.includes(stateKey)) return coords;
  }
  return null;
}

function hashString(input) {
  const value = String(input || 'seed');
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function fallbackCoords(seed) {
  const hash = hashString(seed);
  const latRange = MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat;
  const lngRange = MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng;
  const lat = MAP_BOUNDS.minLat + ((hash % 1000) / 1000) * latRange;
  const lng = MAP_BOUNDS.minLng + (((Math.floor(hash / 1000)) % 1000) / 1000) * lngRange;
  return { lat, lng };
}

function resolveCoordsWithFallback(item, seed) {
  const exact = resolveCoords(item);
  if (exact) return { coords: exact, quality: 'exact' };

  const inferred = inferCoordsFromText(
    item?.pickupAddress,
    item?.deliveryAddress,
    item?.coverageZone,
    item?.city,
    item?.state,
    item?.vendorName,
    item?.companyName,
  );
  if (inferred) return { coords: inferred, quality: 'inferred' };

  return { coords: fallbackCoords(seed), quality: 'fallback' };
}

function projectPoint({ lat, lng }) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
  const y = (1 - ((lat - MAP_BOUNDS.minLat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat))) * 100;
  return {
    x: Math.max(2, Math.min(98, x)),
    y: Math.max(2, Math.min(98, y)),
  };
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(from, to) {
  const earthRadiusKm = 6371;
  const dLat = toRadians((to.lat || 0) - (from.lat || 0));
  const dLng = toRadians((to.lng || 0) - (from.lng || 0));
  const lat1 = toRadians(from.lat || 0);
  const lat2 = toRadians(to.lat || 0);

  const a = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function headingFromTo(from, to) {
  const y = Math.sin(toRadians(to.lng - from.lng)) * Math.cos(toRadians(to.lat));
  const x = Math.cos(toRadians(from.lat)) * Math.sin(toRadians(to.lat))
    - Math.sin(toRadians(from.lat)) * Math.cos(toRadians(to.lat)) * Math.cos(toRadians(to.lng - from.lng));
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  const normalized = (bearing + 360) % 360;
  const directions = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function markerLabel(item) {
  if (item.type === 'driver') return item.name || item.agentCode || 'Driver';
  if (item.type === 'transit') return item.trackingNumber || 'Transit Shipment';
  if (item.type === 'pickup') return item.vendorName || 'Pickup Vendor';
  return item.label || 'Map Point';
}

function markerTypeLabel(type) {
  if (type === 'driver') return 'Driver';
  if (type === 'transit') return 'In Transit';
  if (type === 'pickup') return 'Pickup';
  return 'Map Point';
}

function qualityText(value) {
  if (value === 'exact') return 'Exact';
  if (value === 'inferred') return 'Inferred';
  return 'Fallback';
}

function qualityClass(value) {
  if (value === 'exact') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (value === 'inferred') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-slate-200 text-slate-700 border-slate-300';
}

/* ── Overview stat card ───────────────────────────────────── */
function KpiTile({ label, value, sub, icon: Icon, gradient, pulse }) {
  return (
    <div
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)',
      }}
    >
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-[0.08] blur-2xl pointer-events-none"
        style={{ background: gradient }} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
          <p className="text-[28px] font-black text-slate-900 tracking-tight leading-none">{value}</p>
          {sub && <p className="text-[12px] text-slate-500 mt-1.5">{sub}</p>}
        </div>
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: gradient }}
        >
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
          {pulse && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Agent card ───────────────────────────────────────────── */
function AgentCard({ agent, onStatusChange, isPending }) {
  const cfg         = AGENT_STATUS[agent.status] || AGENT_STATUS.OFFLINE;
  const VehicleIcon = VEHICLE_ICONS[agent.vehicleType] || Truck;
  const initials    = `${agent.firstName?.[0] || ''}${agent.lastName?.[0] || ''}`.toUpperCase();
  const ratingValue = Number(agent.rating);

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        border: '1.5px solid #E2E8F0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Card header strip ── */}
      <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${LG.blueMid}, #6366f1)` }} />

      <div className="p-5">
        {/* Avatar + name + status */}
        <div className="flex items-start gap-3 mb-4">
          <div className="relative flex-shrink-0">
            {agent.avatarUrl ? (
              <img src={agent.avatarUrl} alt="" className="w-12 h-12 rounded-xl object-cover" />
            ) : (
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black text-[15px]"
                style={{ background: `linear-gradient(135deg, ${LG.blue}, #6366f1)` }}
              >
                {initials}
              </div>
            )}
            {/* Online dot */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
              style={{ background: cfg.dot }}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-[14px] font-bold text-slate-900 truncate">
                  {agent.firstName} {agent.lastName}
                </h3>
                <p className="text-[12px] text-slate-500">{agent.agentCode || `AGT-${agent.id?.slice(-6).toUpperCase()}`}</p>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black flex-shrink-0"
                style={{ background: cfg.bg, color: cfg.text }}
              >
                {cfg.label}
              </span>
            </div>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-2 text-[12px] mb-4">
          <div className="flex items-center gap-2 text-slate-600">
            <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {agent.phone || '—'}
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{agent.coverageZone || agent.city || 'Zone not assigned'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <VehicleIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            {agent.vehicleType || 'Vehicle not specified'}
            {agent.vehiclePlate && <span className="font-mono ml-1 text-slate-400">· {agent.vehiclePlate}</span>}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          {[
            { label: 'Deliveries', value: agent.totalDeliveries || 0 },
            { label: 'Success %',  value: agent.successRate ? `${agent.successRate}%` : '—' },
            { label: 'Rating',     value: Number.isFinite(ratingValue) ? ratingValue.toFixed(1) : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl py-2" style={{ background: LG.grey }}>
              <div className="text-[14px] font-black text-slate-900">{value}</div>
              <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Tenant/operator */}
        {agent.tenant && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-[12px] font-semibold"
            style={{ background: LG.blueLight, color: LG.blue }}
          >
            <Globe className="w-3.5 h-3.5" />
            {agent.tenant?.tradingName || agent.tenant?.businessName}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {agent.status === 'PENDING' && (
            <button
              onClick={() => onStatusChange(agent.id, 'ACTIVE')}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-black text-white transition-all"
              style={{ background: `linear-gradient(135deg, ${LG.teal}, #059669)` }}
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
              Activate
            </button>
          )}
          {agent.status === 'ACTIVE' && (
            <button
              onClick={() => onStatusChange(agent.id, 'SUSPENDED')}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background: LG.redLight, color: LG.red, border: `1px solid #FFC3B2` }}
            >
              <ToggleLeft className="w-3.5 h-3.5" />
              Suspend
            </button>
          )}
          {agent.status === 'SUSPENDED' && (
            <button
              onClick={() => onStatusChange(agent.id, 'ACTIVE')}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-semibold transition-all"
              style={{ background: LG.tealLight, color: LG.teal, border: `1px solid #ABF5D1` }}
            >
              <ToggleRight className="w-3.5 h-3.5" />
              Reactivate
            </button>
          )}
          <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all"
            style={{ border: '1.5px solid #E2E8F0' }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delivery status badge ────────────────────────────────── */
function DeliveryBadge({ status }) {
  const cfg = DELIVERY_STATUS[status] || DELIVERY_STATUS.PENDING_PICKUP;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ════════════════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════════════════ */
export default function LogisticsPage() {
  const [tab, setTab]               = useState('agents');
  const [agentSearch, setAgentSearch] = useState('');
  const [agentStatus, setAgentStatus] = useState('');
  const [deliverySearch, setDeliverySearch] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [companyStatus, setCompanyStatus] = useState('');
  const [agentPage, setAgentPage]   = useState(1);
  const [deliveryPage, setDeliveryPage] = useState(1);
  const [companyPage, setCompanyPage] = useState(1);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [selectedMapItem, setSelectedMapItem] = useState(null);
  const [routeFromId, setRouteFromId] = useState('');
  const [routeToId, setRouteToId] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [followSelectedMarker, setFollowSelectedMarker] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isMapDragging, setIsMapDragging] = useState(false);
  const dragStartRef = useRef(null);
  const mapViewportRef = useRef(null);
  const qc = useQueryClient();

  /* ── Data fetches ── */
  const { data: statsData } = useQuery({
    queryKey: ['logistics-stats'],
    queryFn: () => api.get('/admin/logistics/stats').then((r) => r.data.data).catch(() => ({})),
    refetchInterval: 30000,
  });

  const { data: agentsData, isLoading: agentsLoading } = useQuery({
    queryKey: ['logistics-agents', agentPage, agentSearch, agentStatus],
    queryFn: () =>
      api.get('/admin/logistics/agents', {
        params: { page: agentPage, limit: 12, search: agentSearch || undefined, status: agentStatus || undefined },
      }).then((r) => r.data).catch(() => ({ data: [], pagination: {} })),
    keepPreviousData: true,
  });

  const { data: mapDataRaw, isLoading: mapLoading } = useQuery({
    queryKey: ['logistics-map-data'],
    queryFn: () =>
      api.get('/admin/logistics/map-data').then((r) => r.data?.data || {
        drivers: [], goodsInTransit: [], vendorsWaitingPickup: [], totals: { drivers: 0, inTransit: 0, waitingPickup: 0 },
      }).catch(() => ({
        drivers: [], goodsInTransit: [], vendorsWaitingPickup: [], totals: { drivers: 0, inTransit: 0, waitingPickup: 0 },
      })),
    refetchInterval: 30000,
  });

  const { data: deliveriesData, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['logistics-deliveries', deliveryPage, deliverySearch, deliveryStatus],
    queryFn: () =>
      api.get('/admin/logistics/deliveries', {
        params: { page: deliveryPage, limit: 25, search: deliverySearch || undefined, status: deliveryStatus || undefined },
      }).then((r) => r.data).catch(() => ({ data: [], pagination: {} })),
    keepPreviousData: true,
    refetchInterval: 20000,
  });

  const { data: companiesData, isLoading: companiesLoading } = useQuery({
    queryKey: ['logistics-companies', companyPage, companyStatus],
    queryFn: () =>
      api.get('/admin/logistics/companies', {
        params: { page: companyPage, limit: 12, status: companyStatus || undefined },
      }).then((r) => r.data).catch(() => ({ data: [], total: 0 })),
    keepPreviousData: true,
  });

  const agentStatusMutation = useMutation({
    mutationFn: ({ agentId, status }) => api.patch(`/admin/logistics/agents/${agentId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries(['logistics-agents']);
      qc.invalidateQueries(['logistics-stats']);
    },
  });

  const assignMutation = useMutation({
    mutationFn: ({ deliveryId, agentId }) => api.patch(`/admin/logistics/deliveries/${deliveryId}/assign`, { agentId }),
    onSuccess: () => qc.invalidateQueries(['logistics-deliveries']),
  });

  const companyStatusMutation = useMutation({
    mutationFn: ({ companyId, status }) => api.patch(`/admin/logistics/companies/${companyId}/status`, { status }),
    onSuccess: (response, variables) => {
      qc.invalidateQueries(['logistics-companies']);
      qc.invalidateQueries(['logistics-stats']);
      setSelectedCompany((prev) => {
        if (!prev || prev.id !== variables.companyId) return prev;
        return {
          ...prev,
          ...(response?.data?.data || {}),
          status: variables.status,
        };
      });
    },
  });

  const s         = statsData || {};
  const agents    = agentsData?.data || [];
  const deliveries = deliveriesData?.data || [];
  const companies = companiesData?.data || [];
  const mapData = mapDataRaw || { drivers: [], goodsInTransit: [], vendorsWaitingPickup: [], totals: {} };

  const driverMarkers = (mapData.drivers || []).map((driver, index) => {
    const { coords, quality } = resolveCoordsWithFallback(driver, driver.id || driver.agentCode || `driver-${index}`);
    const idPart = driver.id || driver.agentCode || index;
    return {
      ...driver,
      id: driver.id || idPart,
      type: 'driver',
      routeId: `driver-${idPart}`,
      coords,
      point: projectPoint(coords),
      markerLabel: driver.name || driver.agentCode || 'Driver',
      locationQuality: quality,
    };
  });

  const transitMarkers = (mapData.goodsInTransit || []).map((goods, index) => {
    const { coords, quality } = resolveCoordsWithFallback(goods, goods.id || goods.trackingNumber || `transit-${index}`);
    const idPart = goods.id || goods.trackingNumber || index;
    return {
      ...goods,
      id: goods.id || idPart,
      type: 'transit',
      routeId: `transit-${idPart}`,
      coords,
      point: projectPoint(coords),
      markerLabel: goods.trackingNumber || 'Transit',
      locationQuality: quality,
    };
  });

  const pickupMarkers = (mapData.vendorsWaitingPickup || []).map((pickup, index) => {
    const { coords, quality } = resolveCoordsWithFallback(pickup, pickup.id || pickup.trackingNumber || `pickup-${index}`);
    const idPart = pickup.id || pickup.trackingNumber || index;
    return {
      ...pickup,
      id: pickup.id || idPart,
      type: 'pickup',
      routeId: `pickup-${idPart}`,
      coords,
      point: projectPoint(coords),
      markerLabel: pickup.vendorName || pickup.trackingNumber || 'Pickup',
      locationQuality: quality,
    };
  });

  const mapMarkers = [...driverMarkers, ...transitMarkers, ...pickupMarkers];
  const routeOptions = mapMarkers.map((item) => ({
    id: item.routeId,
    label: `${item.markerLabel} · ${item.type}`,
  }));
  const routeFrom = mapMarkers.find((item) => item.routeId === routeFromId) || null;
  const routeTo = mapMarkers.find((item) => item.routeId === routeToId) || null;
  const routeDistanceKm = routeFrom && routeTo ? haversineKm(routeFrom.coords, routeTo.coords) : 0;
  const routeEtaMinutes = Math.max(3, Math.round((routeDistanceKm / 35) * 60));
  const routeHeading = routeFrom && routeTo ? headingFromTo(routeFrom.coords, routeTo.coords) : '';
  const hasValidRoute = Boolean(routeFrom && routeTo && routeFrom.routeId !== routeTo.routeId);
  const liveFocusMarker = selectedMapItem?.routeId
    ? (mapMarkers.find((item) => item.routeId === selectedMapItem.routeId) || selectedMapItem)
    : null;
  const stateRollup = {};
  Object.keys(STATE_COORDS).forEach((key) => {
    stateRollup[key] = { drivers: 0, inTransit: 0, waitingPickup: 0 };
  });

  (mapData.drivers || []).forEach((driver) => {
    const key = resolveStateKey(driver.state) || resolveStateKey(driver.city);
    if (key && stateRollup[key]) stateRollup[key].drivers += 1;
  });
  (mapData.goodsInTransit || []).forEach((goods) => {
    const key = resolveStateKey(goods.state) || resolveStateKey(goods.city);
    if (key && stateRollup[key]) stateRollup[key].inTransit += 1;
  });
  (mapData.vendorsWaitingPickup || []).forEach((pickup) => {
    const key = resolveStateKey(pickup.state) || resolveStateKey(pickup.city);
    if (key && stateRollup[key]) stateRollup[key].waitingPickup += 1;
  });

  const stateSummary = Object.entries(STATE_COORDS).map(([key, coords]) => {
    const c = stateRollup[key] || { drivers: 0, inTransit: 0, waitingPickup: 0 };
    return {
      key,
      label: STATE_LABELS[key] || key,
      coords,
      point: projectPoint(coords),
      ...c,
      total: c.drivers + c.inTransit + c.waitingPickup,
    };
  }).sort((a, b) => (b.total - a.total) || a.label.localeCompare(b.label));
  const companyLimit = 12;
  const companyTotal = companiesData?.total || 0;
  const companyTotalPages = Math.max(1, Math.ceil(companyTotal / companyLimit));

  const speakText = (text) => {
    if (!voiceEnabled || !text || typeof window === 'undefined' || !window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const speakSelectedMarker = () => {
    if (!selectedMapItem) return;
    const name = markerLabel(selectedMapItem);
    const location = [selectedMapItem.city, selectedMapItem.state].filter(Boolean).join(', ') || 'unknown location';
    const quality = qualityText(selectedMapItem.locationQuality);
    speakText(`${name}. Type ${selectedMapItem.type}. Location ${location}. Data quality ${quality}.`);
  };

  const speakRoute = () => {
    if (!hasValidRoute) return;
    const fromLabel = markerLabel(routeFrom);
    const toLabel = markerLabel(routeTo);
    speakText(`Route from ${fromLabel} to ${toLabel}. Head ${routeHeading} for approximately ${routeDistanceKm.toFixed(1)} kilometers. Estimated travel time is ${routeEtaMinutes} minutes.`);
  };

  const handleMapWheel = (event) => {
    event.preventDefault();
    const zoomDelta = event.deltaY < 0 ? 0.12 : -0.12;
    setMapZoom((prev) => clamp(Number((prev + zoomDelta).toFixed(2)), 1, 2.4));
  };

  const handleMapMouseDown = (event) => {
    if (event.button !== 0) return;
    setIsMapDragging(true);
    dragStartRef.current = { x: event.clientX, y: event.clientY };
  };

  const handleMapMouseMove = (event) => {
    if (!isMapDragging || !dragStartRef.current) return;
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    setMapPan((prev) => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
  };

  const handleMapMouseUp = () => {
    setIsMapDragging(false);
    dragStartRef.current = null;
  };

  const centerMapOnMarker = (marker) => {
    if (!marker?.point || !mapViewportRef.current) return;
    const rect = mapViewportRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const markerX = (marker.point.x / 100) * rect.width;
    const markerY = (marker.point.y / 100) * rect.height;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setMapPan({
      x: Number(((centerX - markerX) * mapZoom).toFixed(2)),
      y: Number(((centerY - markerY) * mapZoom).toFixed(2)),
    });
  };

  useEffect(() => {
    if (!selectedMapItem?.routeId) return;
    const refreshedMarker = mapMarkers.find((item) => item.routeId === selectedMapItem.routeId);
    if (!refreshedMarker) return;

    const hasChanged =
      selectedMapItem.point?.x !== refreshedMarker.point?.x ||
      selectedMapItem.point?.y !== refreshedMarker.point?.y ||
      selectedMapItem.locationQuality !== refreshedMarker.locationQuality;

    if (hasChanged) {
      setSelectedMapItem(refreshedMarker);
    }

    if (followSelectedMarker) {
      centerMapOnMarker(refreshedMarker);
    }
  }, [
    mapMarkers,
    selectedMapItem?.routeId,
    selectedMapItem?.point?.x,
    selectedMapItem?.point?.y,
    selectedMapItem?.locationQuality,
    followSelectedMarker,
    mapZoom,
  ]);

  useEffect(() => {
    if (followSelectedMarker && !selectedMapItem?.routeId) {
      setFollowSelectedMarker(false);
    }
  }, [followSelectedMarker, selectedMapItem?.routeId]);

  const tabs = [
    { id: 'agents',     label: 'Logistics Agents',  icon: Users,  count: s.totalAgents || 0 },
    { id: 'deliveries', label: 'Delivery Orders',   icon: Package, count: s.totalDeliveries || 0 },
    { id: 'map',        label: 'Live Map',          icon: MapPin, count: mapData?.totals?.inTransit || 0 },
    { id: 'companies',  label: 'Companies',         icon: Building2, count: s.totalCompanies || 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ════════════════════════════════════════════════════
          Page header — dark logistics theme
      ════════════════════════════════════════════════════ */}
      <div
        className="-mx-6 -mt-6 px-6 pt-6 pb-5 mb-2"
        style={{ background: `linear-gradient(160deg, ${LG.navy} 0%, ${LG.navyMid} 100%)` }}
      >
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
            style={{ background: `linear-gradient(135deg, ${LG.blueMid}, #6366f1)` }}
          >
            <Truck className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[21px] font-black text-white tracking-tight leading-tight">
              Logistics Portal
            </h1>
            <p className="text-[12px] font-medium" style={{ color: 'rgba(255,255,255,0.45)' }}>
              Manage delivery agents, onboarding &amp; shipment tracking across all tenants
            </p>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-[12px] font-bold text-emerald-400 bg-emerald-900/30 border border-emerald-700/50 px-3 py-1.5 rounded-full">
            <Activity className="w-3.5 h-3.5" />
            Live Tracking
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total Agents',      value: s.totalAgents || 0,         color: '#93C5FD', icon: Users },
            { label: 'Active Agents',     value: s.activeAgents || 0,        color: '#6EE7B7', icon: Activity },
            { label: 'Pending Onboard',   value: s.pendingAgents || 0,       color: '#FCD34D', icon: UserPlus },
            { label: 'Total Deliveries',  value: (s.totalDeliveries || 0).toLocaleString(), color: '#C4B5FD', icon: Package },
            { label: 'In Transit',        value: (s.inTransit || 0).toLocaleString(),       color: '#93C5FD', icon: Navigation },
            { label: 'Delivered Today',   value: (s.deliveredToday || 0).toLocaleString(),  color: '#6EE7B7', icon: CheckCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl px-3 py-3 text-center"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color }} />
              <div className="text-[18px] font-black leading-none" style={{ color }}>
                {value}
              </div>
              <div className="text-[10px] font-semibold mt-1 leading-tight" style={{ color: 'rgba(255,255,255,0.40)' }}>
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════
          Tab switcher
      ════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-2xl p-1 w-fit"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {tabs.map(({ id, label, icon: Icon, count }) => {
          const isActive = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150"
              style={isActive
                ? { background: `linear-gradient(135deg, ${LG.navy}, ${LG.navyMid})`, color: '#fff', boxShadow: '0 2px 10px rgba(9,30,66,0.30)' }
                : { color: '#64748b' }}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-black"
                style={isActive
                  ? { background: 'rgba(255,255,255,0.15)', color: '#fff' }
                  : { background: '#F1F5F9', color: '#64748b' }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════
          AGENTS TAB
      ════════════════════════════════════════════════════ */}
      {tab === 'agents' && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={agentSearch}
                onChange={(e) => { setAgentSearch(e.target.value); setAgentPage(1); }}
                placeholder="Search agents by name, phone, zone…"
                className="input-field pl-10"
              />
            </div>
            <select
              value={agentStatus}
              onChange={(e) => { setAgentStatus(e.target.value); setAgentPage(1); }}
              className="select-field"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending Onboarding</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="OFFLINE">Offline</option>
            </select>

            {/* Pending onboarding alert */}
            {(s.pendingAgents || 0) > 0 && (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold"
                style={{ background: LG.amberLight, color: LG.amber, border: `1px solid #FFD48A` }}
              >
                <AlertTriangle className="w-4 h-4" />
                {s.pendingAgents} agent{s.pendingAgents > 1 ? 's' : ''} pending approval
              </div>
            )}
          </div>

          {/* Agent cards grid */}
          {agentsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse border border-slate-100">
                  <div className="h-1.5 bg-slate-200 w-full" />
                  <div className="p-5 space-y-3">
                    <div className="flex gap-3">
                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
                        <div className="h-3 bg-slate-100 rounded-lg w-1/2" />
                      </div>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-lg" />
                    <div className="h-3 bg-slate-100 rounded-lg w-3/4" />
                    <div className="grid grid-cols-3 gap-2">
                      {[...Array(3)].map((_, j) => <div key={j} className="h-12 bg-slate-100 rounded-xl" />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: LG.blueLight }}
              >
                <Users className="w-8 h-8" style={{ color: LG.blue }} />
              </div>
              <p className="text-[16px] font-bold text-slate-600">No logistics agents found</p>
              <p className="text-[13px] text-slate-400 mt-1">
                {agentStatus ? 'Try a different status filter' : 'Agents will appear here once they register'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {agents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onStatusChange={(agentId, status) => agentStatusMutation.mutate({ agentId, status })}
                  isPending={agentStatusMutation.isPending}
                />
              ))}
            </div>
          )}

          {/* Agents pagination */}
          {agentsData?.pagination?.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500">
                Page <strong className="text-slate-800">{agentPage}</strong> of{' '}
                <strong className="text-slate-800">{agentsData.pagination.totalPages}</strong>
              </span>
              <div className="flex gap-2">
                <button disabled={agentPage === 1} onClick={() => setAgentPage((p) => p - 1)} className="page-btn">← Prev</button>
                <button disabled={!agentsData.pagination.hasMore} onClick={() => setAgentPage((p) => p + 1)} className="page-btn">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          DELIVERIES TAB
      ════════════════════════════════════════════════════ */}
      {tab === 'deliveries' && (
        <div className="space-y-5">
          {/* Status quick-filter pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: '',                label: 'All',           count: s.totalDeliveries },
              { value: 'PENDING_PICKUP',  label: 'Pending',       count: s.pendingPickup },
              { value: 'IN_TRANSIT',      label: 'In Transit',    count: s.inTransit },
              { value: 'OUT_FOR_DELIVERY',label: 'Out for Del.',  count: s.outForDelivery },
              { value: 'DELIVERED',       label: 'Delivered',     count: s.delivered },
              { value: 'FAILED',          label: 'Failed',        count: s.failed },
              { value: 'RETURNED',        label: 'Returned',      count: s.returned },
            ].map(({ value, label, count }) => {
              const cfg    = DELIVERY_STATUS[value] || { text: '#475569', bg: '#F1F5F9', border: '#CBD5E1' };
              const active = deliveryStatus === value;
              return (
                <button
                  key={value}
                  onClick={() => { setDeliveryStatus(value); setDeliveryPage(1); }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition-all duration-150"
                  style={active
                    ? { background: LG.navy, color: '#fff', boxShadow: '0 2px 8px rgba(9,30,66,0.25)' }
                    : { background: value ? cfg.bg : '#F1F5F9', color: value ? cfg.text : '#475569', border: `1px solid ${value ? cfg.border : '#CBD5E1'}` }}
                >
                  {label}
                  {count !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: active ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }}>
                      {(count || 0).toLocaleString()}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={deliverySearch}
              onChange={(e) => { setDeliverySearch(e.target.value); setDeliveryPage(1); }}
              placeholder="Search order ref, customer, agent…"
              className="input-field pl-10"
            />
          </div>

          {/* Deliveries table */}
          <div className="bg-white rounded-2xl overflow-hidden border border-slate-200"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div
              className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"
              style={{ background: LG.grey }}
            >
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: LG.blue }} />
                <span className="text-[13px] font-bold text-slate-700">
                  {deliveriesData?.pagination?.total?.toLocaleString() || 0} Delivery Orders
                </span>
              </div>
              <button
                onClick={() => qc.invalidateQueries(['logistics-deliveries'])}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100"
                    style={{ background: '#FAFBFC' }}>
                    {['Order Ref', 'Tenant / Seller', 'Customer', 'Assigned Agent', 'Status', 'Created', 'ETA', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-[11px] font-black uppercase tracking-wider text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deliveriesLoading && [...Array(10)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-50 animate-pulse">
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-5 py-4"><div className="h-3 bg-slate-100 rounded-full" /></td>
                      ))}
                    </tr>
                  ))}

                  {!deliveriesLoading && deliveries.length === 0 && (
                    <tr>
                      <td colSpan={8} className="text-center py-16">
                        <Truck className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-[14px] font-semibold text-slate-400">No delivery orders found</p>
                        <p className="text-[12px] text-slate-300 mt-1">
                          {deliveryStatus ? 'Try a different status filter' : 'Orders will appear once created'}
                        </p>
                      </td>
                    </tr>
                  )}

                  {deliveries.map((d) => {
                    const cfg = DELIVERY_STATUS[d.status] || DELIVERY_STATUS.PENDING_PICKUP;
                    const VIcon = VEHICLE_ICONS[d.agent?.vehicleType] || Truck;
                    return (
                      <tr
                        key={d.id}
                        className="border-b border-slate-50 transition-colors"
                        onMouseEnter={(e) => { e.currentTarget.style.background = LG.blueLight + '55'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
                      >
                        {/* Order ref */}
                        <td className="px-5 py-3.5">
                          <div className="font-black text-[13px]" style={{ color: LG.blue }}>
                            #{d.orderRef || d.id?.slice(-8).toUpperCase()}
                          </div>
                          {d.trackingNumber && (
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{d.trackingNumber}</div>
                          )}
                        </td>

                        {/* Tenant */}
                        <td className="px-5 py-3.5">
                          <div className="text-[13px] font-semibold text-slate-700 truncate max-w-[130px]">
                            {d.tenant?.tradingName || d.tenant?.businessName || '—'}
                          </div>
                          {d.invoiceRef && (
                            <div className="text-[11px] text-slate-400 font-mono">Inv: {d.invoiceRef}</div>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-5 py-3.5">
                          <div className="text-[13px] font-semibold text-slate-900">
                            {d.customerName || d.customer?.name || '—'}
                          </div>
                          {(d.deliveryAddress || d.customer?.address) && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 max-w-[150px]">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{d.deliveryAddress || d.customer?.address}</span>
                            </div>
                          )}
                        </td>

                        {/* Agent */}
                        <td className="px-5 py-3.5">
                          {d.agent ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
                                style={{ background: `linear-gradient(135deg, ${LG.blue}, #6366f1)` }}
                              >
                                {d.agent.firstName?.[0]}{d.agent.lastName?.[0]}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[12px] font-semibold text-slate-800 truncate max-w-[100px]">
                                  {d.agent.firstName} {d.agent.lastName}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                  <VIcon className="w-3 h-3" />
                                  {d.agent.vehicleType || 'Agent'}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[12px] text-slate-300 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <DeliveryBadge status={d.status} />
                        </td>

                        {/* Created */}
                        <td className="px-5 py-3.5 text-[12px] text-slate-500 whitespace-nowrap">
                          {formatDate(d.createdAt)}
                        </td>

                        {/* ETA */}
                        <td className="px-5 py-3.5">
                          {d.expectedDeliveryDate ? (
                            <div className="text-[12px] font-semibold text-slate-700">
                              {formatDate(d.expectedDeliveryDate)}
                            </div>
                          ) : (
                            <span className="text-[12px] text-slate-300 italic">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {!d.agent && d.status === 'PENDING_PICKUP' && (
                              <button
                                onClick={() => {
                                  const agentId = window.prompt('Enter Agent ID to assign:');
                                  if (agentId) assignMutation.mutate({ deliveryId: d.id, agentId });
                                }}
                                disabled={assignMutation.isPending}
                                className="flex items-center gap-1 text-[12px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                                style={{ background: LG.blueLight, color: LG.blue, border: `1px solid #A4CDFF` }}
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                Assign
                              </button>
                            )}
                            {d.status === 'FAILED' && (
                              <button
                                className="flex items-center gap-1 text-[12px] font-bold px-2.5 py-1.5 rounded-lg transition-all"
                                style={{ background: LG.amberLight, color: LG.amber, border: `1px solid #FFD48A` }}
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Retry
                              </button>
                            )}
                            <button className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Deliveries pagination */}
            {deliveriesData?.pagination?.totalPages > 1 && (
              <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/60 text-[13px] text-slate-500">
                <span>
                  Page <strong className="text-slate-800">{deliveryPage}</strong> of{' '}
                  <strong className="text-slate-800">{deliveriesData.pagination.totalPages}</strong>
                  {' '}· {deliveriesData.pagination.total?.toLocaleString()} orders
                </span>
                <div className="flex gap-2">
                  <button disabled={deliveryPage === 1} onClick={() => setDeliveryPage((p) => p - 1)} className="page-btn">← Prev</button>
                  <button disabled={!deliveriesData.pagination.hasMore} onClick={() => setDeliveryPage((p) => p + 1)} className="page-btn">Next →</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'map' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KpiTile label="Drivers" value={mapData?.totals?.drivers || 0} icon={Truck} gradient="linear-gradient(135deg,#0052CC,#6366F1)" />
            <KpiTile label="Goods in Transit" value={mapData?.totals?.inTransit || 0} icon={Navigation} gradient="linear-gradient(135deg,#7C3AED,#2563EB)" />
            <KpiTile label="Waiting Pickup" value={mapData?.totals?.waitingPickup || 0} icon={Building2} gradient="linear-gradient(135deg,#F59E0B,#FB923C)" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-black text-slate-900">Logistics Coverage Map</h3>
                <p className="text-[11px] text-slate-500">Bolt-style dispatch view for drivers, in-transit shipments, and pickups</p>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Drivers</span>
                <span className="inline-flex items-center gap-1 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-violet-600" /> In transit</span>
                <span className="inline-flex items-center gap-1 text-slate-600"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pickup</span>
                <button
                  type="button"
                  onClick={() => setVoiceEnabled((prev) => !prev)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-700"
                  title="Toggle voice narration"
                >
                  {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                  Voice
                </button>
              </div>
            </div>

            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center gap-2">
              <div className="text-[11px] font-bold text-slate-600 inline-flex items-center gap-1"><Route className="w-3.5 h-3.5" /> Directions</div>
              <select
                value={routeFromId}
                onChange={(e) => setRouteFromId(e.target.value)}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700"
              >
                <option value="">From marker</option>
                {routeOptions.map((opt) => (
                  <option key={`from-${opt.id}`} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={routeToId}
                onChange={(e) => setRouteToId(e.target.value)}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-700"
              >
                <option value="">To marker</option>
                {routeOptions.map((opt) => (
                  <option key={`to-${opt.id}`} value={opt.id}>{opt.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  setRouteFromId('');
                  setRouteToId('');
                }}
                className="h-8 px-2 rounded-lg border border-slate-200 bg-white text-[11px] text-slate-600"
              >
                Clear route
              </button>
              {hasValidRoute && (
                <div className="ml-auto text-[11px] text-slate-600 font-semibold">
                  {routeDistanceKm.toFixed(1)} km · {routeEtaMinutes} min · heading {routeHeading}
                </div>
              )}
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
              <div className="relative rounded-2xl border border-slate-200 min-h-[420px] overflow-hidden"
                ref={mapViewportRef}
                style={{
                  background: `radial-gradient(circle at 20% 10%, ${BOLT_UI.mapDarkLight} 0%, ${BOLT_UI.mapDarkMid} 35%, ${BOLT_UI.mapDark} 100%)`,
                }}
                onWheel={handleMapWheel}
                onMouseDown={handleMapMouseDown}
                onMouseMove={handleMapMouseMove}
                onMouseUp={handleMapMouseUp}
                onMouseLeave={handleMapMouseUp}
              >
                <div
                  className={cn('absolute inset-0', isMapDragging ? 'cursor-grabbing' : 'cursor-grab')}
                  style={{
                    transform: `translate(${mapPan.x}px, ${mapPan.y}px) scale(${mapZoom})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <div className="absolute inset-0 opacity-30"
                    style={{ backgroundImage: 'linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

                  <div className="absolute top-3 left-3 flex items-center gap-2 z-[1]">
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold text-white/90 border border-white/20 bg-white/10 backdrop-blur">Dispatch Mode</span>
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold border border-emerald-300/40 text-emerald-200 bg-emerald-500/15">Live</span>
                  </div>

                  {hasValidRoute && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <line
                        x1={`${routeFrom.point.x}%`}
                        y1={`${routeFrom.point.y}%`}
                        x2={`${routeTo.point.x}%`}
                        y2={`${routeTo.point.y}%`}
                        stroke={BOLT_UI.greenSoft}
                        strokeWidth="8"
                        opacity="0.25"
                      />
                      <line
                        x1={`${routeFrom.point.x}%`}
                        y1={`${routeFrom.point.y}%`}
                        x2={`${routeTo.point.x}%`}
                        y2={`${routeTo.point.y}%`}
                        stroke={BOLT_UI.green}
                        strokeWidth="3"
                        strokeDasharray="8 6"
                        opacity="0.95"
                      />
                    </svg>
                  )}

                  {stateSummary.map((state) => (
                    <button
                      key={`state-${state.key}`}
                      type="button"
                      onClick={() => setSelectedMapItem({ type: 'state', ...state })}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${state.point.x}%`, top: `${state.point.y}%` }}
                    >
                      <span className={cn(
                        'px-1.5 py-0.5 rounded border text-[10px] font-bold shadow-sm backdrop-blur',
                        state.total > 0
                          ? 'bg-slate-950/70 border-slate-500/60 text-slate-100'
                          : 'bg-slate-900/50 border-slate-700/70 text-slate-400',
                      )}>
                        {state.label.split(' ')[0]}{state.total > 0 ? ` · ${state.total}` : ''}
                      </span>
                    </button>
                  ))}

                  {mapMarkers.map((item) => {
                    const color = item.type === 'driver' ? '#2563EB' : item.type === 'transit' ? '#7C3AED' : '#F59E0B';
                    const label = markerLabel(item);
                    const qualityLabel = qualityText(item.locationQuality);
                    const qualityBadgeClass = qualityClass(item.locationQuality);
                    const isFocused = liveFocusMarker?.routeId && liveFocusMarker.routeId === item.routeId;
                    return (
                      <button
                        key={item.routeId}
                        type="button"
                        onClick={(event) => {
                          if (event.shiftKey) {
                            setRouteFromId(item.routeId);
                          } else if (event.altKey) {
                            setRouteToId(item.routeId);
                          }
                          setSelectedMapItem(item);
                        }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group"
                        style={{ left: `${item.point.x}%`, top: `${item.point.y}%` }}
                        title="Shift+Click sets route start, Alt+Click sets route destination"
                      >
                        <span
                          className={cn('block rounded-full border-2 border-white shadow', isFocused ? 'w-4 h-4 ring-4 ring-emerald-300/40' : 'w-3 h-3')}
                          style={{ background: color }}
                        />
                        {item.type === 'driver' && (
                          <span className="absolute inset-0 -m-1 rounded-full border border-emerald-300/60 animate-ping pointer-events-none" />
                        )}
                        <span className="absolute left-1/2 -translate-x-1/2 mt-1 opacity-0 group-hover:opacity-100 pointer-events-none px-1.5 py-1 rounded bg-slate-900 text-white text-[10px] whitespace-nowrap inline-flex items-center gap-1">
                          <span>{label}</span>
                          <span className={cn('px-1 py-[1px] rounded border text-[9px] font-bold', qualityBadgeClass)}>{qualityLabel}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {mapLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading map data…
                  </div>
                ) : null}
                <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMapZoom((prev) => clamp(Number((prev + 0.15).toFixed(2)), 1, 2.4))}
                    className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 flex items-center justify-center"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapZoom((prev) => clamp(Number((prev - 0.15).toFixed(2)), 1, 2.4))}
                    className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 flex items-center justify-center"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMapZoom(1);
                      setMapPan({ x: 0, y: 0 });
                    }}
                    className="px-1.5 h-7 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-700"
                    title="Reset view"
                  >
                    Reset
                  </button>
                </div>

                {(hasValidRoute || liveFocusMarker?.routeId) && (
                  <div className="absolute left-3 right-3 bottom-3 rounded-xl border border-white/20 bg-slate-950/80 backdrop-blur p-3 text-white shadow-lg">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-slate-300 font-bold">Live Trip Focus</p>
                        {hasValidRoute ? (
                          <p className="text-[12px] font-semibold text-white">
                            {markerLabel(routeFrom)} <ArrowRight className="inline w-3.5 h-3.5 mx-0.5" /> {markerLabel(routeTo)}
                          </p>
                        ) : (
                          <p className="text-[12px] font-semibold text-white">
                            {markerLabel(liveFocusMarker)} · {markerTypeLabel(liveFocusMarker?.type)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold text-emerald-300">
                          {hasValidRoute ? `${routeDistanceKm.toFixed(1)} km` : 'Tracking'}
                        </p>
                        <p className="text-[10px] text-slate-300">
                          {hasValidRoute ? `${routeEtaMinutes} min · ${routeHeading}` : qualityText(liveFocusMarker?.locationQuality)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 bg-slate-50">
                <div className="mb-3 pb-3 border-b border-slate-200 space-y-2">
                  <h4 className="text-[13px] font-black text-slate-900">Directions</h4>
                  {hasValidRoute ? (
                    <>
                      <div className="text-[12px] text-slate-700">
                        <span className="font-semibold">From:</span> {markerLabel(routeFrom)}
                      </div>
                      <div className="text-[12px] text-slate-700">
                        <span className="font-semibold">To:</span> {markerLabel(routeTo)}
                      </div>
                      <div className="text-[12px] text-slate-700">
                        Head <span className="font-semibold">{routeHeading}</span> for approximately{' '}
                        <span className="font-semibold">{routeDistanceKm.toFixed(1)} km</span> ({routeEtaMinutes} mins)
                      </div>
                      <button
                        type="button"
                        onClick={speakRoute}
                        disabled={!voiceEnabled}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
                      >
                        <Mic className="w-3.5 h-3.5" /> Voice directions
                      </button>
                    </>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      Select route start and destination from the controls above, or use Shift+Click and Alt+Click on markers.
                    </p>
                  )}
                </div>

                <h4 className="text-[13px] font-black text-slate-900 mb-2">Selected Marker</h4>
                {!selectedMapItem ? (
                  <p className="text-[12px] text-slate-500">Click any marker to view details.</p>
                ) : (
                  <div className="space-y-2 text-[12px]">
                    <div><span className="text-slate-400">Type:</span> <span className="font-bold text-slate-700 uppercase">{selectedMapItem.type}</span></div>
                    {'locationQuality' in selectedMapItem && (
                      <div>
                        <span className="text-slate-400">Location quality:</span>{' '}
                        <span className={cn(
                          'inline-flex px-2 py-[2px] rounded border text-[10px] font-bold uppercase',
                          qualityClass(selectedMapItem.locationQuality),
                        )}>
                          {qualityText(selectedMapItem.locationQuality)}
                        </span>
                      </div>
                    )}
                    {'name' in selectedMapItem && <div><span className="text-slate-400">Driver:</span> <span className="font-semibold text-slate-800">{selectedMapItem.name || '—'}</span></div>}
                    {'trackingNumber' in selectedMapItem && <div><span className="text-slate-400">Tracking:</span> <span className="font-semibold text-slate-800">{selectedMapItem.trackingNumber || '—'}</span></div>}
                    {'vendorName' in selectedMapItem && <div><span className="text-slate-400">Vendor:</span> <span className="font-semibold text-slate-800">{selectedMapItem.vendorName || '—'}</span></div>}
                    {'companyName' in selectedMapItem && <div><span className="text-slate-400">Company:</span> <span className="font-semibold text-slate-800">{selectedMapItem.companyName || '—'}</span></div>}
                    <div><span className="text-slate-400">Location:</span> <span className="font-semibold text-slate-800">{[selectedMapItem.city, selectedMapItem.state].filter(Boolean).join(', ') || 'Unknown'}</span></div>
                    {'deliveryAddress' in selectedMapItem && selectedMapItem.deliveryAddress && (
                      <div><span className="text-slate-400">Address:</span> <span className="font-semibold text-slate-800">{selectedMapItem.deliveryAddress}</span></div>
                    )}
                    {'pickupAddress' in selectedMapItem && selectedMapItem.pickupAddress && (
                      <div><span className="text-slate-400">Pickup:</span> <span className="font-semibold text-slate-800">{selectedMapItem.pickupAddress}</span></div>
                    )}
                    {'drivers' in selectedMapItem && (
                      <>
                        <div><span className="text-slate-400">Drivers:</span> <span className="font-semibold text-slate-800">{selectedMapItem.drivers}</span></div>
                        <div><span className="text-slate-400">In transit:</span> <span className="font-semibold text-slate-800">{selectedMapItem.inTransit}</span></div>
                        <div><span className="text-slate-400">Waiting pickup:</span> <span className="font-semibold text-slate-800">{selectedMapItem.waitingPickup}</span></div>
                      </>
                    )}
                    {'locationQuality' in selectedMapItem && (
                      <button
                        type="button"
                        onClick={speakSelectedMarker}
                        disabled={!voiceEnabled}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
                      >
                        <Mic className="w-3.5 h-3.5" /> Speak marker
                      </button>
                    )}
                    {'routeId' in selectedMapItem && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = !followSelectedMarker;
                          setFollowSelectedMarker(next);
                          if (next) {
                            centerMapOnMarker(selectedMapItem);
                          }
                        }}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border',
                          followSelectedMarker
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-white text-slate-700 border-slate-200',
                        )}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        {followSelectedMarker ? 'Following marker' : 'Follow selected marker'}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h5 className="text-[12px] font-black text-slate-800 mb-2">State-by-State</h5>
                  <div className="max-h-[260px] overflow-auto space-y-1.5 pr-1">
                    {stateSummary.map((state) => (
                      <button
                        key={`state-row-${state.key}`}
                        type="button"
                        onClick={() => setSelectedMapItem({ type: 'state', ...state })}
                        className="w-full flex items-center justify-between text-left px-2.5 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                      >
                        <span className="text-[11px] font-semibold text-slate-700">{state.label}</span>
                        <span className="text-[10px] text-slate-500">
                          D:{state.drivers} · T:{state.inTransit} · P:{state.waitingPickup}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          COMPANIES TAB
      ════════════════════════════════════════════════════ */}
      {tab === 'companies' && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              value={companyStatus}
              onChange={(e) => { setCompanyStatus(e.target.value); setCompanyPage(1); }}
              className="select-field"
            >
              <option value="">All Companies</option>
              <option value="PENDING">Pending Approval</option>
              <option value="APPROVED">Approved</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {(s.pendingCompanies || 0) > 0 && (
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold"
                style={{ background: LG.amberLight, color: LG.amber, border: '1px solid #FFD48A' }}
              >
                <AlertTriangle className="w-4 h-4" />
                {s.pendingCompanies} compan{s.pendingCompanies > 1 ? 'ies' : 'y'} pending approval
              </div>
            )}
          </div>

          {companiesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 animate-pulse space-y-3">
                  <div className="h-4 bg-slate-100 rounded w-2/3" />
                  <div className="h-3 bg-slate-100 rounded" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-10 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
              <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-[16px] font-bold text-slate-600">No logistics companies found</p>
              <p className="text-[13px] text-slate-400 mt-1">Try another status filter or wait for new registrations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {companies.map((c) => {
                const statusColor = c.status === 'APPROVED'
                  ? { bg: LG.tealLight, text: LG.teal }
                  : c.status === 'PENDING'
                    ? { bg: LG.amberLight, text: LG.amber }
                    : c.status === 'SUSPENDED'
                      ? { bg: LG.redLight, text: LG.red }
                      : { bg: '#F1F5F9', text: '#64748B' };

                return (
                  <div key={c.id} className="bg-white rounded-2xl border border-slate-200 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-black text-slate-900 truncate">{c.name}</h3>
                        <p className="text-[12px] text-slate-500 truncate">{c.email}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: statusColor.bg, color: statusColor.text }}>
                        {c.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[12px] text-slate-600 mb-4">
                      <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" />{c.phone || '—'}</div>
                      <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" />{[c.city, c.state].filter(Boolean).join(', ') || 'Location not set'}</div>
                      <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5 text-slate-400" />{c._count?.agents || 0} agents · {c._count?.deliveries || 0} deliveries</div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedCompany(c)}
                        className="px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1.5"
                        style={{ background: LG.blueLight, color: LG.blue, border: '1px solid #A4CDFF' }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View details
                      </button>

                      {c.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => companyStatusMutation.mutate({ companyId: c.id, status: 'APPROVED' })}
                            disabled={companyStatusMutation.isPending}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white"
                            style={{ background: `linear-gradient(135deg, ${LG.teal}, #059669)` }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => companyStatusMutation.mutate({ companyId: c.id, status: 'REJECTED' })}
                            disabled={companyStatusMutation.isPending}
                            className="px-3 py-1.5 rounded-lg text-[12px] font-bold"
                            style={{ background: LG.redLight, color: LG.red, border: '1px solid #FFC3B2' }}
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {c.status === 'APPROVED' && (
                        <button
                          onClick={() => companyStatusMutation.mutate({ companyId: c.id, status: 'SUSPENDED' })}
                          disabled={companyStatusMutation.isPending}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-bold"
                          style={{ background: LG.redLight, color: LG.red, border: '1px solid #FFC3B2' }}
                        >
                          Suspend
                        </button>
                      )}

                      {(c.status === 'SUSPENDED' || c.status === 'REJECTED') && (
                        <button
                          onClick={() => companyStatusMutation.mutate({ companyId: c.id, status: 'APPROVED' })}
                          disabled={companyStatusMutation.isPending}
                          className="px-3 py-1.5 rounded-lg text-[12px] font-bold"
                          style={{ background: LG.tealLight, color: LG.teal, border: '1px solid #ABF5D1' }}
                        >
                          Reactivate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {companyTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-slate-500">
                Page <strong className="text-slate-800">{companyPage}</strong> of <strong className="text-slate-800">{companyTotalPages}</strong>
                {' '}· {companyTotal.toLocaleString()} companies
              </span>
              <div className="flex gap-2">
                <button disabled={companyPage === 1} onClick={() => setCompanyPage((p) => p - 1)} className="page-btn">← Prev</button>
                <button disabled={companyPage >= companyTotalPages} onClick={() => setCompanyPage((p) => p + 1)} className="page-btn">Next →</button>
              </div>
            </div>
          )}
        </div>
      )}

      {selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/45" onClick={() => setSelectedCompany(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[18px] font-black text-slate-900">{selectedCompany.name}</h3>
                <p className="text-[12px] text-slate-500">Detailed logistics company profile for admin review</p>
              </div>
              <button
                onClick={() => setSelectedCompany(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Email</div>
                  <div className="text-slate-800 font-semibold break-all">{selectedCompany.email || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Phone</div>
                  <div className="text-slate-800 font-semibold">{selectedCompany.phone || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Contact Person</div>
                  <div className="text-slate-800 font-semibold">{selectedCompany.contactPerson || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">CAC Number</div>
                  <div className="text-slate-800 font-semibold">{selectedCompany.cacNumber || '—'}</div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Address</div>
                  <div className="text-slate-800 font-semibold">{selectedCompany.address || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Location</div>
                  <div className="text-slate-800 font-semibold">{[selectedCompany.city, selectedCompany.state].filter(Boolean).join(', ') || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Created</div>
                  <div className="text-slate-800 font-semibold">{selectedCompany.createdAt ? formatDateTime(selectedCompany.createdAt) : '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Approved At</div>
                  <div className="text-slate-800 font-semibold">{selectedCompany.approvedAt ? formatDateTime(selectedCompany.approvedAt) : '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Last Updated</div>
                  <div className="text-slate-800 font-semibold">{selectedCompany.updatedAt ? formatDateTime(selectedCompany.updatedAt) : '—'}</div>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="text-[11px] font-bold text-slate-400 uppercase mb-2">Coverage Areas</div>
              {Array.isArray(selectedCompany.coverageAreas) && selectedCompany.coverageAreas.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedCompany.coverageAreas.map((area, idx) => (
                    <span key={`${area}-${idx}`} className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700">
                      {area}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-slate-500">No coverage areas specified.</p>
              )}
            </div>

            <div className="px-5 pb-5 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[12px] text-slate-500">
                Current status: <span className="font-bold text-slate-800">{selectedCompany.status}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedCompany.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => companyStatusMutation.mutate({ companyId: selectedCompany.id, status: 'APPROVED' })}
                      disabled={companyStatusMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${LG.teal}, #059669)` }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => companyStatusMutation.mutate({ companyId: selectedCompany.id, status: 'REJECTED' })}
                      disabled={companyStatusMutation.isPending}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold"
                      style={{ background: LG.redLight, color: LG.red, border: '1px solid #FFC3B2' }}
                    >
                      Reject
                    </button>
                  </>
                )}

                {selectedCompany.status === 'APPROVED' && (
                  <button
                    onClick={() => companyStatusMutation.mutate({ companyId: selectedCompany.id, status: 'SUSPENDED' })}
                    disabled={companyStatusMutation.isPending}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold"
                    style={{ background: LG.redLight, color: LG.red, border: '1px solid #FFC3B2' }}
                  >
                    Suspend
                  </button>
                )}

                {(selectedCompany.status === 'SUSPENDED' || selectedCompany.status === 'REJECTED') && (
                  <button
                    onClick={() => companyStatusMutation.mutate({ companyId: selectedCompany.id, status: 'APPROVED' })}
                    disabled={companyStatusMutation.isPending}
                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold"
                    style={{ background: LG.tealLight, color: LG.teal, border: '1px solid #ABF5D1' }}
                  >
                    Reactivate
                  </button>
                )}

                <button
                  onClick={() => setSelectedCompany(null)}
                  className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-600 border border-slate-200 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
