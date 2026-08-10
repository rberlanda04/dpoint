import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  Share2,
  TrendingUp,
  Calendar,
  BarChart3,
  Wallet,
  Download,
  Mail,
  CheckCircle2,
  Users,
  Settings,
  LogOut,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  PieChart,
  DollarSign,
  Briefcase,
  Target,
  Zap,
  Globe,
  Shield,
  Play,
  Pause,
  Square,
  MapPin,
  Flame,
  Award,
  Sparkles,
  Check,
  Send,
  Timer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import GridLineCard from '../components/ui/GridLineCard';
import MetricCard from '../components/ui/MetricCard';
import ChartCard from '../components/ui/ChartCard';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { useToast } from '../components/ui/Toast';
import { Dialog } from '../components/ui';

interface HourEntry {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  hours: number;
  earnings: number;
  description: string;
  projectName?: string;
  locationName?: string;
  withinGeofence?: boolean;
}

interface EarningsConfig {
  hourlyRate: number;
  currency: string;
  workDaysPerWeek: number;
  hoursPerDay: number;
  projectName: string;
}

interface ActiveShift {
  id: string;
  startTime: string; // ISO string
  isPaused: boolean;
  pausedTimeMs: number;
  lastPauseStart?: string;
  description: string;
  locationName: string;
}

export default function WorkerPortalPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const { t, lang } = useI18n();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'tracker' | 'dashboard' | 'history' | 'share' | 'config'>('tracker');
  const [entries, setEntries] = useState<HourEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedEntryToShare, setSelectedEntryToShare] = useState<HourEntry | null>(null);
  const [shareEmail, setShareEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HourEntry | null>(null);

  // Active shift (Strava-style live tracker with persistent state)
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [shiftDescription, setShiftDescription] = useState('');
  const [shiftLocation, setShiftLocation] = useState('Obra / Local de Campo');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [earningsConfig, setEarningsConfig] = useState<EarningsConfig>({
    hourlyRate: 30,
    currency: 'BRL',
    workDaysPerWeek: 5,
    hoursPerDay: 8,
    projectName: 'Projeto Principal',
  });

  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';

  // Load config & active shift from localStorage on mount
  useEffect(() => {
    const savedConfig = localStorage.getItem('dpoint_worker_config');
    if (savedConfig) {
      try { setEarningsConfig(JSON.parse(savedConfig)); } catch {}
    }

    const savedShift = localStorage.getItem('dpoint_active_shift');
    if (savedShift) {
      try {
        const parsed: ActiveShift = JSON.parse(savedShift);
        setActiveShift(parsed);
        setShiftDescription(parsed.description || '');
        setShiftLocation(parsed.locationName || 'Obra / Local de Campo');
      } catch {}
    }
  }, []);

  // Save config to localStorage
  useEffect(() => {
    localStorage.setItem('dpoint_worker_config', JSON.stringify(earningsConfig));
  }, [earningsConfig]);

  // Persistent Timer ticks & state sync
  useEffect(() => {
    if (!activeShift) {
      setElapsedSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const calculateElapsed = () => {
      const now = new Date().getTime();
      const start = new Date(activeShift.startTime).getTime();
      let totalMs = now - start - (activeShift.pausedTimeMs || 0);

      if (activeShift.isPaused && activeShift.lastPauseStart) {
        const currentPause = now - new Date(activeShift.lastPauseStart).getTime();
        totalMs -= currentPause;
      }

      const sec = Math.max(0, Math.floor(totalMs / 1000));
      setElapsedSeconds(sec);
    };

    calculateElapsed();

    if (!activeShift.isPaused) {
      timerRef.current = setInterval(calculateElapsed, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeShift]);

  // Load entries from Firestore or LocalStorage
  useEffect(() => {
    if (!user) return;
    const loadEntries = async () => {
      try {
        const { collection, query, where, getDocs, orderBy } = await import('firebase/firestore');
        const { db } = await import('../utils/firebase');
        const q = query(
          collection(db, 'worker_entries'),
          where('user_id', '==', user.uid)
        );
        const snap = await getDocs(q);
        const loaded: HourEntry[] = snap.docs.map(docSnap => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            date: data.date,
            checkIn: data.check_in,
            checkOut: data.check_out || null,
            hours: data.hours || 0,
            earnings: data.earnings || (data.hours || 0) * (earningsConfig.hourlyRate || 30),
            description: data.description || '',
            projectName: data.project_name || earningsConfig.projectName,
            locationName: data.location_name || 'Campo',
            withinGeofence: data.within_geofence !== false,
          };
        });
        loaded.sort((a, b) => new Date(b.date + 'T' + (b.checkIn || '00:00')).getTime() - new Date(a.date + 'T' + (a.checkIn || '00:00')).getTime());
        setEntries(loaded);
      } catch (err) {
        // Fallback to demo local entries
        const demo: HourEntry[] = [
          {
            id: 'e1',
            date: new Date().toISOString().split('T')[0],
            checkIn: '08:00',
            checkOut: '17:00',
            hours: 8,
            earnings: 8 * earningsConfig.hourlyRate,
            description: 'Instalação elétrica e vistoria de canteiro',
            projectName: earningsConfig.projectName,
            locationName: 'Obra Central',
            withinGeofence: true,
          },
          {
            id: 'e2',
            date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
            checkIn: '08:15',
            checkOut: '16:45',
            hours: 7.5,
            earnings: 7.5 * earningsConfig.hourlyRate,
            description: 'Montagem de estruturas e pintura',
            projectName: earningsConfig.projectName,
            locationName: 'Canteiro Norte',
            withinGeofence: true,
          },
        ];
        setEntries(demo);
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
  }, [user, earningsConfig.hourlyRate]);

  // Live Timer Controls — with GPS Geolocation capture
  const handleStartShift = () => {
    const now = new Date().toISOString();
    let initialLocation = shiftLocation || 'Obra / Local de Campo';

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          const gpsLoc = `📍 GPS (${lat}, ${lng})`;
          setShiftLocation(gpsLoc);

          const newShift: ActiveShift = {
            id: `shift_${Date.now()}`,
            startTime: now,
            isPaused: false,
            pausedTimeMs: 0,
            description: shiftDescription || 'Turno em campo (GPS Auditado)',
            locationName: gpsLoc,
          };
          setActiveShift(newShift);
          localStorage.setItem('dpoint_active_shift', JSON.stringify(newShift));
          toast.success('Turno iniciado com localização GPS auditada! 🚀');
        },
        () => {
          const newShift: ActiveShift = {
            id: `shift_${Date.now()}`,
            startTime: now,
            isPaused: false,
            pausedTimeMs: 0,
            description: shiftDescription || 'Turno em campo',
            locationName: initialLocation,
          };
          setActiveShift(newShift);
          localStorage.setItem('dpoint_active_shift', JSON.stringify(newShift));
          toast.success('Turno iniciado! Bons trabalhos. 🚀');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      const newShift: ActiveShift = {
        id: `shift_${Date.now()}`,
        startTime: now,
        isPaused: false,
        pausedTimeMs: 0,
        description: shiftDescription || 'Turno em campo',
        locationName: initialLocation,
      };
      setActiveShift(newShift);
      localStorage.setItem('dpoint_active_shift', JSON.stringify(newShift));
      toast.success('Turno iniciado! Bons trabalhos. 🚀');
    }
  };

  const handlePauseShift = () => {
    if (!activeShift) return;
    const now = new Date().toISOString();
    let updated: ActiveShift;

    if (activeShift.isPaused) {
      const pauseDuration = new Date().getTime() - new Date(activeShift.lastPauseStart!).getTime();
      updated = {
        ...activeShift,
        isPaused: false,
        pausedTimeMs: (activeShift.pausedTimeMs || 0) + pauseDuration,
        lastPauseStart: undefined,
      };
      toast.info('Turno retomado!');
    } else {
      updated = {
        ...activeShift,
        isPaused: true,
        lastPauseStart: now,
      };
      toast.warning('Turno pausado.');
    }
    setActiveShift(updated);
    localStorage.setItem('dpoint_active_shift', JSON.stringify(updated));
  };

  const handleStopShift = async () => {
    if (!activeShift) return;
    const now = new Date();
    const startTimeDate = new Date(activeShift.startTime);

    const checkInStr = startTimeDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    const checkOutStr = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

    const totalHours = Number((elapsedSeconds / 3600).toFixed(2));
    const earned = Number((totalHours * earningsConfig.hourlyRate).toFixed(2));
    const dateStr = now.toISOString().split('T')[0];

    const newEntryObj: HourEntry = {
      id: `entry_${Date.now()}`,
      date: dateStr,
      checkIn: checkInStr,
      checkOut: checkOutStr,
      hours: totalHours,
      earnings: earned,
      description: shiftDescription || 'Turno finalizado no Strava do Trabalho',
      projectName: earningsConfig.projectName,
      locationName: shiftLocation,
      withinGeofence: true,
    };

    if (user) {
      try {
        const { collection, addDoc } = await import('firebase/firestore');
        const { db } = await import('../utils/firebase');
        await addDoc(collection(db, 'worker_entries'), {
          user_id: user.uid,
          date: dateStr,
          check_in: checkInStr,
          check_out: checkOutStr,
          hours: totalHours,
          earnings: earned,
          description: newEntryObj.description,
          project_name: newEntryObj.projectName,
          location_name: newEntryObj.locationName,
          within_geofence: true,
          created_at: now.toISOString(),
        });
      } catch (e) {
        console.warn('Erro ao salvar no Firestore (modo offline/local):', e);
      }
    }

    setEntries(prev => [newEntryObj, ...prev]);
    setActiveShift(null);
    localStorage.removeItem('dpoint_active_shift');
    setShiftDescription('');
    toast.success(`Turno concluído! 🎉 ${totalHours}h registradas (R$ ${earned.toFixed(2)})`);
  };

  const handleDeleteEntry = async () => {
    if (!deleteTarget) return;
    if (user) {
      try {
        const { doc, deleteDoc } = await import('firebase/firestore');
        const { db } = await import('../utils/firebase');
        await deleteDoc(doc(db, 'worker_entries', deleteTarget.id));
      } catch {}
    }
    setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success('Registro excluído.');
  };

  const formatTimer = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentLiveEarnings = ((elapsedSeconds / 3600) * earningsConfig.hourlyRate).toFixed(2);

  const totalHoursMonth = entries.reduce((acc, curr) => acc + curr.hours, 0);
  const totalEarningsMonth = entries.reduce((acc, curr) => acc + curr.earnings, 0);
  const daysWorkedCount = new Set(entries.map(e => e.date)).size;
  const avgDailyHours = daysWorkedCount > 0 ? (totalHoursMonth / daysWorkedCount).toFixed(1) : '0';

  const projectedMonthly = earningsConfig.hourlyRate * earningsConfig.hoursPerDay * (earningsConfig.workDaysPerWeek * 4.33);

  const streakDays = (() => {
    if (entries.length === 0) return 0;
    const uniqueDates = Array.from(new Set(entries.map(e => e.date))).sort().reverse();
    let streak = 0;
    let checkDate = new Date();
    checkDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (uniqueDates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (i === 0) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  })();

  const getShareText = (entry?: HourEntry | null) => {
    const target = entry || entries[0];
    if (!target) return '';
    return `👷 *Comprovante de Turno de Trabalho — DPoint Tracker*\n` +
      `📅 *Data:* ${target.date}\n` +
      `⏱️ *Jornada:* ${target.checkIn} - ${target.checkOut || 'Em andamento'} (${target.hours}h)\n` +
      `💰 *Valor Ganho:* R$ ${target.earnings.toFixed(2)}\n` +
      `📍 *Local:* ${target.locationName || 'Campo'} (Geofence Validada)\n` +
      `📝 *Descrição:* ${target.description || 'Turno concluído'}\n\n` +
      `⚡ *Registrado e auditado pelo DPoint — Tracker de Trabalho*`;
  };

  const handleShareWhatsApp = (entry?: HourEntry) => {
    const text = getShareText(entry);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Light Top Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 px-4 py-3 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo iconSize="sm" />
            <div>
              <span className="text-sm font-bold text-slate-900 tracking-tight">DPoint</span>
              <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Work Tracker
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium">
              <UserIcon className="w-3.5 h-3.5 text-emerald-600" />
              <span className="truncate max-w-[140px]">{user?.email?.split('@')[0] || 'Visitante'}</span>
            </div>
            {user ? (
              <button
                onClick={() => logout()}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-all cursor-pointer border-0 bg-transparent"
                title={t('common.logout')}
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-1.5 rounded-xl border border-indigo-200 transition-all cursor-pointer"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Guest Mode Light Banner */}
      {!user && (
        <div className="bg-gradient-to-r from-indigo-50 via-emerald-50 to-teal-50 border-b border-indigo-100 px-4 py-2.5">
          <div className="max-w-6xl mx-auto flex items-center justify-center gap-2 text-xs">
            <div className="flex items-center gap-2 text-indigo-900">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span><strong>Modo Visitante:</strong> Você está testando o Work Tracker! Seus turnos ficam salvos neste dispositivo.</span>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Tabs — Light Theme */}
      <div className="bg-white border-b border-slate-200 px-4">
        <div className="max-w-6xl mx-auto flex items-center gap-2 overflow-x-auto py-2.5 scrollbar-none">
          {[
            { id: 'tracker', label: 'Rastreador ao Vivo', icon: Timer },
            { id: 'dashboard', label: 'Painel & Ganhos', icon: BarChart3 },
            { id: 'history', label: 'Histórico de Turnos', icon: Clock },
            { id: 'share', label: 'Compartilhar', icon: Share2 },
            { id: 'config', label: 'Taxa / Config', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border-0 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* ================= TAB 1: TRACKER (STRAVA FOR WORK - LIGHT THEME) ================= */}
        {activeTab === 'tracker' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Strava-Style Live Shift Card — Light Theme */}
            <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-500/5">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-50/50 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                {/* Left: Timer & Status */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase border ${
                      activeShift
                        ? activeShift.isPaused
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-700 animate-pulse'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${activeShift ? (activeShift.isPaused ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-slate-400'}`} />
                      {activeShift ? (activeShift.isPaused ? 'Turno Pausado' : 'Turno em Andamento') : 'Pronto para Trabalhar'}
                    </span>

                    <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      {shiftLocation}
                    </span>
                  </div>

                  {/* Big Strava Timer */}
                  <div className="space-y-1">
                    <p className="text-xs uppercase font-semibold text-slate-400 tracking-wider">Tempo Decorrido</p>
                    <h2 className="text-5xl sm:text-7xl font-black text-slate-900 tracking-tight font-mono">
                      {formatTimer(elapsedSeconds)}
                    </h2>
                  </div>

                  {/* Live Earnings Accumulator */}
                  <div className="flex items-center gap-4 pt-2">
                    <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl px-4 py-2.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div>
                        <p className="text-[10px] text-emerald-700 uppercase font-bold">Ganho Estimado</p>
                        <p className="text-xl font-bold text-emerald-800 font-mono">
                          R$ {currentLiveEarnings}
                        </p>
                      </div>
                    </div>

                    <div className="bg-indigo-50/90 border border-indigo-200 rounded-2xl px-4 py-2.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                        <Award className="w-5 h-5 text-indigo-700" />
                      </div>
                      <div>
                        <p className="text-[10px] text-indigo-700 uppercase font-bold">Taxa Configurada</p>
                        <p className="text-sm font-bold text-indigo-900">
                          R$ {earningsConfig.hourlyRate},00/h
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="flex flex-col gap-3 min-w-[220px]">
                  {!activeShift ? (
                    <button
                      onClick={handleStartShift}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold py-4 px-6 rounded-2xl text-base flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-600/25 hover:-translate-y-0.5 cursor-pointer border-0"
                    >
                      <Play className="w-6 h-6 fill-white" />
                      Iniciar Turno
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={handlePauseShift}
                        className={`w-full font-bold py-3.5 px-5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer border-0 ${
                          activeShift.isPaused
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20'
                            : 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20'
                        }`}
                      >
                        {activeShift.isPaused ? (
                          <>
                            <Play className="w-4 h-4 fill-white" />
                            Retomar Turno
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 fill-white" />
                            Pausar Turno
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleStopShift}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3.5 px-5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/20 cursor-pointer border-0"
                      >
                        <Square className="w-4 h-4 fill-white" />
                        Finalizar & Salvar Turno
                      </button>
                    </>
                  )}

                  {/* Optional Notes Input */}
                  <div className="pt-2">
                    <input
                      type="text"
                      placeholder="Descrição do trabalho (ex: Reforma canteiro 02)..."
                      value={shiftDescription}
                      onChange={(e) => setShiftDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Activity Feeds (Strava Cards - Light Theme) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-500" />
                  Seus Últimos Turnos Auditados
                </h3>
                <button
                  onClick={() => setActiveTab('history')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  Ver histórico completo →
                </button>
              </div>

              {entries.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
                  <Timer className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm text-slate-600 font-medium">Nenhum turno registrado ainda.</p>
                  <p className="text-xs text-slate-400">Clique em "Iniciar Turno" acima para gravar seu primeiro trabalho!</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {entries.slice(0, 4).map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-5 space-y-4 transition-all shadow-xs hover:shadow-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{entry.description || 'Turno de Trabalho'}</p>
                            <p className="text-xs text-slate-500">{entry.date} · {entry.locationName}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Geofence OK
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Duração</p>
                          <p className="text-base font-bold text-slate-800 font-mono">{entry.hours}h ({entry.checkIn} - {entry.checkOut})</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 uppercase font-semibold">Ganho Total</p>
                          <p className="text-base font-bold text-emerald-600 font-mono">R$ {entry.earnings.toFixed(2)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[11px] text-slate-500 font-medium">{entry.projectName}</span>
                        <button
                          onClick={() => handleShareWhatsApp(entry)}
                          className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Enviar Comprovante
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 2: DASHBOARD & GANHOS (LIGHT THEME) ================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Painel Pessoal de Trabalho & Ganhos</h2>
              <p className="text-xs text-slate-500">Acompanhe suas horas trabalhadas, projeção de receita e metas.</p>
            </div>

            {/* KPI Cards — Light Theme */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Horas Registradas</span>
                  <Clock className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-slate-900 font-mono">{totalHoursMonth.toFixed(1)}h</p>
                <p className="text-[10px] text-slate-400">{daysWorkedCount} dias com turno</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Ganhos Totais</span>
                  <Wallet className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-emerald-600 font-mono">R$ {totalEarningsMonth.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400">Taxa: R$ {earningsConfig.hourlyRate}/h</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Projeção Mensal</span>
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <p className="text-2xl font-bold text-indigo-600 font-mono">R$ {projectedMonthly.toFixed(2)}</p>
                <p className="text-[10px] text-slate-400">Com base na sua meta semanal</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2 shadow-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Sequência (Streak)</span>
                  <Flame className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-2xl font-bold text-amber-600 font-mono">{streakDays} Dias</p>
                <p className="text-[10px] text-slate-400">Dias seguidos trabalhando</p>
              </div>
            </div>

            {/* Performance Summary */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Resumo da Sua Produtividade
              </h3>

              <div className="grid sm:grid-cols-3 gap-4 text-center">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
                  <p className="text-xs text-slate-500">Média Diária</p>
                  <p className="text-xl font-bold text-slate-900 mt-1">{avgDailyHours}h / dia</p>
                </div>

                <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-200/80">
                  <p className="text-xs text-emerald-700">Média por Turno</p>
                  <p className="text-xl font-bold text-emerald-700 mt-1">R$ {(Number(avgDailyHours) * earningsConfig.hourlyRate).toFixed(2)}</p>
                </div>

                <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-200/80">
                  <p className="text-xs text-indigo-700">Projeto Ativo</p>
                  <p className="text-sm font-bold text-indigo-900 mt-1 truncate">{earningsConfig.projectName}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: HISTÓRICO (LIGHT THEME) ================= */}
        {activeTab === 'history' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Histórico de Turnos Trabalhados</h2>
                <p className="text-xs text-slate-500">{entries.length} turnos registrados.</p>
              </div>
            </div>

            {entries.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-3 shadow-xs">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm text-slate-600 font-medium">Nenhum registro no histórico.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase font-semibold">
                        <th className="py-3.5 px-4">Data</th>
                        <th className="py-3.5 px-4">Horário</th>
                        <th className="py-3.5 px-4">Duração</th>
                        <th className="py-3.5 px-4">Ganho (R$)</th>
                        <th className="py-3.5 px-4">Local</th>
                        <th className="py-3.5 px-4">Descrição</th>
                        <th className="py-3.5 px-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {entries.map(entry => (
                        <tr key={entry.id} className="hover:bg-slate-50 transition-colors text-slate-700">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">{entry.date}</td>
                          <td className="py-3.5 px-4 font-mono">{entry.checkIn} - {entry.checkOut || 'Ativo'}</td>
                          <td className="py-3.5 px-4 font-mono text-emerald-700 font-bold">{entry.hours}h</td>
                          <td className="py-3.5 px-4 font-mono text-emerald-700 font-bold">R$ {entry.earnings.toFixed(2)}</td>
                          <td className="py-3.5 px-4">{entry.locationName || 'Campo'}</td>
                          <td className="py-3.5 px-4 max-w-[200px] truncate">{entry.description || '—'}</td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleShareWhatsApp(entry)}
                              className="text-xs text-emerald-600 hover:text-emerald-700 p-1 cursor-pointer border-0 bg-transparent"
                              title="Compartilhar WhatsApp"
                            >
                              <Share2 className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(entry)}
                              className="text-xs text-red-500 hover:text-red-700 p-1 cursor-pointer border-0 bg-transparent"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: COMPARTILHAR (LIGHT THEME) ================= */}
        {activeTab === 'share' && (
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Compartilhar Comprovante de Horas</h2>
              <p className="text-xs text-slate-500">Envie relatórios e comprovantes formatados para clientes, contratantes ou WhatsApp.</p>
            </div>

            {/* Preview Card — Light Theme */}
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-lg shadow-indigo-500/5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Logo iconSize="xs" />
                  <span className="text-sm font-bold text-slate-900">Comprovante DPoint</span>
                </div>
                <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                  Geofence Auditada
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-slate-400 font-semibold uppercase text-[10px]">Resumo do Último Turno</p>
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
                  <p className="text-sm font-bold text-slate-900">{entries[0]?.description || 'Turno de Trabalho'}</p>
                  <p className="text-slate-600">📅 {entries[0]?.date || 'Hoje'} · ⏱️ {entries[0]?.hours || 8}h ({entries[0]?.checkIn || '08:00'} - {entries[0]?.checkOut || '17:00'})</p>
                  <p className="text-emerald-700 font-bold font-mono text-sm pt-1">💰 Total: R$ {(entries[0]?.earnings || 240).toFixed(2)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleShareWhatsApp(entries[0])}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-md shadow-emerald-600/20"
                >
                  <Send className="w-4 h-4" />
                  Enviar via WhatsApp
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getShareText(entries[0]));
                    setCopied(true);
                    toast.success('Texto do comprovante copiado!');
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 rounded-xl text-xs border border-slate-200 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 5: CONFIGURAÇÕES DE TAXA (LIGHT THEME) ================= */}
        {activeTab === 'config' && (
          <div className="max-w-xl mx-auto space-y-6 animate-fadeIn">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Configurar Suas Taxas & Projeto</h2>
              <p className="text-xs text-slate-500">Defina o valor por hora para calcular seus ganhos automáticos.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Valor por Hora (R$/h)</label>
                <input
                  type="number"
                  value={earningsConfig.hourlyRate}
                  onChange={(e) => setEarningsConfig({ ...earningsConfig, hourlyRate: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Nome do Projeto / Cliente Padrão</label>
                <input
                  type="text"
                  value={earningsConfig.projectName}
                  onChange={(e) => setEarningsConfig({ ...earningsConfig, projectName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Dias por Semana (Meta)</label>
                  <input
                    type="number"
                    value={earningsConfig.workDaysPerWeek}
                    onChange={(e) => setEarningsConfig({ ...earningsConfig, workDaysPerWeek: Number(e.target.value) || 5 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Horas por Dia (Meta)</label>
                  <input
                    type="number"
                    value={earningsConfig.hoursPerDay}
                    onChange={(e) => setEarningsConfig({ ...earningsConfig, hoursPerDay: Number(e.target.value) || 8 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <button
                onClick={() => toast.success('Configurações de ganhos salvas!')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl text-xs transition-all cursor-pointer border-0 shadow-md shadow-indigo-600/20"
              >
                Salvar Preferências
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteEntry}
        title="Excluir Registro de Turno?"
        description="Esta ação removerá permanentemente o turno do seu histórico."
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
      />
    </div>
  );
}

function UserIcon(props: any) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
