import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ClipboardList,
  FolderKanban,
  Megaphone,
  ExternalLink,
  Palmtree,
} from 'lucide-react';
import {
  addMonths,
  subMonths,
  addDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
  parseISO,
  isValid,
  startOfDay,
} from 'date-fns';
import api from '../lib/api';
import { cn } from '../lib/utils';
import useAuthStore from '../store/authStore';

/** Local calendar day from yyyy-MM-dd (avoids UTC midnight shifts). */
function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDateKey(d) {
  if (!d) return null;
  const date = typeof d === 'string' ? parseISO(d) : new Date(d);
  if (!isValid(date)) return null;
  return format(date, 'yyyy-MM-dd');
}

function buildEventMap(tasks, projects, announcements, leaveRequests) {
  /** @type {Record<string, Array<{ id: string; kind: string; title: string; meta?: string; href: string; tone: string }>>} */
  const map = {};

  const push = (key, ev) => {
    if (!key) return;
    if (!map[key]) map[key] = [];
    map[key].push(ev);
  };

  (tasks || []).forEach((t) => {
    const key = toDateKey(t.dueDate);
    if (!key) return;
    push(key, {
      id: `task-${t.id}`,
      kind: 'task',
      title: t.title,
      meta: t.project?.name || t.project?.code || 'Task',
      href: '/tasks',
      tone: 'bg-blue-100 text-blue-800 border-blue-200',
    });
  });

  (projects || []).forEach((p) => {
    const start = toDateKey(p.startDate);
    const end = toDateKey(p.endDate);
    if (start) {
      push(start, {
        id: `proj-start-${p.id}`,
        kind: 'project',
        title: p.name,
        meta: p.code ? `Starts · ${p.code}` : 'Project starts',
        href: '/projects',
        tone: 'bg-violet-100 text-violet-800 border-violet-200',
      });
    }
    if (end && end !== start) {
      push(end, {
        id: `proj-end-${p.id}`,
        kind: 'project',
        title: p.name,
        meta: p.code ? `Ends · ${p.code}` : 'Project ends',
        href: '/projects',
        tone: 'bg-violet-100 text-violet-800 border-violet-200',
      });
    }
  });

  (announcements || []).forEach((a) => {
    const pub = toDateKey(a.publishAt);
    if (pub) {
      push(pub, {
        id: `ann-pub-${a.id}`,
        kind: 'announcement',
        title: a.title,
        meta: 'Published',
        href: '/announcements',
        tone: 'bg-amber-100 text-amber-900 border-amber-200',
      });
    }
    const exp = toDateKey(a.expiresAt);
    if (exp) {
      push(exp, {
        id: `ann-exp-${a.id}`,
        kind: 'announcement',
        title: a.title,
        meta: 'Expires',
        href: '/announcements',
        tone: 'bg-amber-50 text-amber-800 border-amber-200',
      });
    }
  });

  (leaveRequests || []).forEach((lr) => {
    if (lr.status === 'REJECTED' || lr.status === 'CANCELLED') return;
    const emp = lr.employee;
    const name = emp ? `${emp.firstName} ${emp.lastName}`.trim() : 'Staff';
    const tone =
      lr.status === 'APPROVED'
        ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
        : 'bg-amber-100 text-amber-900 border-amber-200';
    const start = startOfDay(
      typeof lr.startDate === 'string' ? parseISO(lr.startDate) : new Date(lr.startDate)
    );
    const end = startOfDay(
      typeof lr.endDate === 'string' ? parseISO(lr.endDate) : new Date(lr.endDate)
    );
    let d = start;
    while (d <= end) {
      const dayKey = format(d, 'yyyy-MM-dd');
      push(dayKey, {
        id: `leave-${lr.id}-${dayKey}`,
        kind: 'leave',
        title: lr.status === 'PENDING' ? `Leave (pending): ${name}` : `Leave: ${name}`,
        meta: lr.status === 'PENDING' ? 'Awaiting approval' : 'Approved',
        href: '/leave-management',
        tone,
      });
      d = addDays(d, 1);
    }
  });

  return map;
}

const HR_LEAVE_ROLES = new Set(['OWNER', 'ADMIN', 'HR']);

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const user = useAuthStore((s) => s.user);
  const canSeeLeaveOnCalendar = HR_LEAVE_ROLES.has(user?.role);

  const { data, isLoading, error } = useQuery({
    queryKey: ['calendar-feed', canSeeLeaveOnCalendar],
    queryFn: async () => {
      const [tasksRes, projectsRes, annRes] = await Promise.all([
        api.get('/tasks'),
        api.get('/projects'),
        api.get('/announcements?includeAll=true').catch(() => ({ data: { data: [] } })),
      ]);
      let leaves = [];
      if (canSeeLeaveOnCalendar) {
        try {
          const lr = await api.get('/leave-requests');
          leaves = lr.data?.data || [];
        } catch {
          leaves = [];
        }
      }
      return {
        tasks: tasksRes.data?.data || [],
        projects: projectsRes.data?.data || [],
        announcements: annRes.data?.data || [],
        leaves,
      };
    },
  });

  const eventMap = useMemo(
    () => buildEventMap(data?.tasks, data?.projects, data?.announcements, data?.leaves),
    [data]
  );

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const selectedEvents = eventMap[selectedKey] || [];

  if (error && error.response?.status !== 403) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 text-sm">
        Could not load calendar data. {error.response?.data?.error || error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl">
      <div className="page-header flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-sky-600" />
            Calendar
          </h1>
          <p className="page-subtitle">
            Task due dates, project milestones, announcements
            {canSeeLeaveOnCalendar ? ', and staff leave (pending & approved)' : ''} in one place.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setCursor(new Date())}
            className="text-sm font-medium px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            Today
          </button>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setCursor((d) => subMonths(d, 1))}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="min-w-[160px] text-center text-sm font-semibold text-slate-800 px-2">
              {format(cursor, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setCursor((d) => addMonths(d, 1))}
              className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 min-w-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-32 text-slate-500 gap-2">
              <Loader2 className="w-6 h-6 animate-spin" />
              Loading…
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="text-center text-xs font-semibold text-slate-500 py-2">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-fr">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const inMonth = isSameMonth(day, cursor);
                  const events = eventMap[key] || [];
                  const isSel = selectedKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedKey(key)}
                      className={cn(
                        'min-h-[88px] sm:min-h-[100px] border-b border-r border-slate-100 p-1.5 text-left transition-colors flex flex-col',
                        !inMonth && 'bg-slate-50/80 text-slate-400',
                        inMonth && 'bg-white hover:bg-slate-50/90',
                        isSel && 'ring-2 ring-inset ring-sky-400 bg-sky-50/40'
                      )}
                    >
                      <span
                        className={cn(
                          'text-xs font-semibold mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full',
                          isToday(day) && 'bg-sky-600 text-white',
                          !isToday(day) && inMonth && 'text-slate-800',
                          !isToday(day) && !inMonth && 'text-slate-400'
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      <div className="flex-1 flex flex-col gap-0.5 min-h-0 overflow-hidden">
                        {events.slice(0, 3).map((ev) => (
                          <span
                            key={ev.id}
                            className={cn(
                              'truncate rounded px-1 py-0.5 text-[10px] sm:text-xs font-medium border',
                              ev.tone
                            )}
                            title={`${ev.title} — ${ev.meta || ''}`}
                          >
                            {ev.title}
                          </span>
                        ))}
                        {events.length > 3 && (
                          <span className="text-[10px] text-slate-500 pl-0.5">
                            +{events.length - 3} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <aside className="w-full lg:w-80 flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-1">
              {format(parseDayKey(selectedKey), 'EEEE, MMM d, yyyy')}
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              {selectedEvents.length === 0
                ? 'No items on this day.'
                : `${selectedEvents.length} item(s)`}
            </p>
            <ul className="space-y-2 max-h-[420px] overflow-y-auto">
              {selectedEvents.map((ev) => (
                <li key={ev.id}>
                  <Link
                    to={ev.href}
                    className="flex items-start gap-2 rounded-lg border border-slate-100 p-2 hover:bg-slate-50 transition-colors group"
                  >
                    {ev.kind === 'task' && (
                      <ClipboardList className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    )}
                    {ev.kind === 'project' && (
                      <FolderKanban className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
                    )}
                    {ev.kind === 'announcement' && (
                      <Megaphone className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    )}
                    {ev.kind === 'leave' && (
                      <Palmtree className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 truncate">{ev.title}</div>
                      {ev.meta && <div className="text-xs text-slate-500">{ev.meta}</div>}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 flex-shrink-0 mt-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-600 space-y-2">
            <div className="font-semibold text-slate-700">What shows here</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>
                <span className="font-medium text-blue-800">Tasks</span> — due dates (
                <Link to="/tasks" className="text-blue-600 hover:underline">
                  Tasks
                </Link>
                )
              </li>
              <li>
                <span className="font-medium text-violet-800">Projects</span> — start &amp; end (
                <Link to="/projects" className="text-violet-700 hover:underline">
                  Projects
                </Link>
                )
              </li>
              <li>
                <span className="font-medium text-amber-800">Announcements</span> — publish &amp; expiry (
                <Link to="/announcements" className="text-amber-700 hover:underline">
                  Announcements
                </Link>
                )
              </li>
              {canSeeLeaveOnCalendar && (
                <li>
                  <span className="font-medium text-emerald-800">Leave</span> — staff leave spans (
                  <Link to="/leave-management" className="text-emerald-700 hover:underline">
                    Leave management
                  </Link>
                  )
                </li>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
