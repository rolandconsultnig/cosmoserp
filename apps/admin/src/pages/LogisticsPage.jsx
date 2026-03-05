import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Truck, Users, Package, MapPin, Phone, CheckCircle, XCircle,
  Clock, AlertTriangle, Search, Star, Navigation, Loader2,
  UserPlus, ToggleLeft, ToggleRight, ChevronRight, Eye,
  TrendingUp, Activity, ArrowRight, Bike, Car, Box,
  RefreshCw, Filter, Globe,
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
            { label: 'Rating',     value: agent.rating ? agent.rating.toFixed(1) : '—' },
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
  const [agentPage, setAgentPage]   = useState(1);
  const [deliveryPage, setDeliveryPage] = useState(1);
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

  const { data: deliveriesData, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['logistics-deliveries', deliveryPage, deliverySearch, deliveryStatus],
    queryFn: () =>
      api.get('/admin/logistics/deliveries', {
        params: { page: deliveryPage, limit: 25, search: deliverySearch || undefined, status: deliveryStatus || undefined },
      }).then((r) => r.data).catch(() => ({ data: [], pagination: {} })),
    keepPreviousData: true,
    refetchInterval: 20000,
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

  const s         = statsData || {};
  const agents    = agentsData?.data || [];
  const deliveries = deliveriesData?.data || [];

  const tabs = [
    { id: 'agents',     label: 'Logistics Agents',  icon: Users,  count: s.totalAgents || 0 },
    { id: 'deliveries', label: 'Delivery Orders',   icon: Package, count: s.totalDeliveries || 0 },
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
    </div>
  );
}
