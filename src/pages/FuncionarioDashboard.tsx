import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Calendar, TrendingUp, DollarSign, LogOut, Loader2, ArrowRight } from 'lucide-react';
import { Card, Button, EmptyState } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { dataService } from '../utils/gasClient';
import { RegistroPonto, Funcionario } from '../types';

export default function FuncionarioDashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!user?.email) return;
      
      const normalizedEmail = user.email.trim().toLowerCase();
      const db = await dataService.loadAllData();
      const loggedFunc = db.funcionarios.find((f: any) => 
        f.email && f.email.trim().toLowerCase() === normalizedEmail
      );
      
      if (loggedFunc) {
        setFuncionario(loggedFunc);
        const myRecords = db.registros.filter((r: any) => r.id_funcionario === loggedFunc.id_funcionario);
        setRegistros(myRecords);
      }
      setLoading(false);
    }
    
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!funcionario) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="Funcionário não encontrado"
          description="Sua conta não está vinculada a um perfil de funcionário."
        />
      </div>
    );
  }

  // Calculate stats
  const today = new Date().toISOString().split('T')[0];
  const todaysRecords = registros.filter(r => r.data_hora && r.data_hora.startsWith(today)).sort((a, b) => a.data_hora.localeCompare(b.data_hora));
  
  // A simple heuristic for hours: 
  let horasHoje = 0;
  let currentIn: Date | null = null;
  
  todaysRecords.forEach(r => {
    if (r.tipo === 'Check-in') {
      currentIn = new Date(r.data_hora);
    } else if (r.tipo === 'Check-out' && currentIn) {
      const out = new Date(r.data_hora);
      horasHoje += (out.getTime() - currentIn.getTime()) / 3600000;
      currentIn = null;
    }
  });

  // Se tem check-in aberto, soma o tempo até agora
  if (currentIn) {
     horasHoje += (new Date().getTime() - currentIn.getTime()) / 3600000;
  }

  const isWorking = todaysRecords.length > 0 && todaysRecords[todaysRecords.length - 1].tipo === 'Check-in';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg">
            {funcionario.nome.charAt(0)}
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">{funcionario.nome}</h1>
            <p className="text-xs text-slate-500">{funcionario.cargo} · Mat: {funcionario.id_funcionario}</p>
          </div>
        </div>
        <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border-0">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6 max-w-4xl mx-auto w-full flex-1">
        
        {/* Main Tracker Action Card */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 shadow-xl shadow-emerald-500/20 text-white relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isWorking ? 'bg-white animate-pulse' : 'bg-white/50'}`} />
              <span className="text-xs font-bold uppercase tracking-wider text-white/90">
                {isWorking ? 'Turno em Andamento' : 'Fora de Turno'}
              </span>
            </div>

            <div className="mt-4">
              <p className="text-xs text-white/70 font-semibold uppercase mb-1">Horas Hoje</p>
              <div className="text-5xl font-black font-mono tracking-tight">
                {Math.floor(horasHoje)}h {Math.floor((horasHoje % 1) * 60)}m
              </div>
            </div>

            <div className="mt-8">
              <button 
                onClick={() => navigate('/checkin')}
                className="w-full bg-white text-emerald-700 font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer border-0"
              >
                <MapPin className="w-5 h-5" />
                {isWorking ? 'Fazer Check-out' : 'Fazer Check-in (Começar)'}
                <ArrowRight className="w-5 h-5 opacity-50" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase">Dias Trab. (Mês)</h3>
            </div>
            <p className="text-2xl font-black text-slate-800">
              {new Set(registros.filter(r => r.data_hora && r.data_hora.startsWith(today.substring(0, 7))).map(r => r.data_hora.split('T')[0])).size}
            </p>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-amber-600" />
              </div>
              <h3 className="text-[11px] font-bold text-slate-500 uppercase">Registros Totais</h3>
            </div>
            <p className="text-2xl font-black text-slate-800">{registros.length}</p>
          </Card>
        </div>

        {/* History */}
        <div>
          <h3 className="text-sm font-bold text-slate-800 mb-4 px-1">Seus Últimos Registros</h3>
          <div className="space-y-3">
            {registros.slice(-10).reverse().map((r, i) => (
              <Card key={i} className="p-4 border-slate-200 shadow-sm hover:border-emerald-200 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.tipo === 'Check-in' ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                      <Clock className={`w-5 h-5 ${r.tipo === 'Check-in' ? 'text-emerald-600' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{r.tipo}</p>
                      <p className="text-xs text-slate-500">{r.data_hora ? new Date(r.data_hora).toLocaleString('pt-BR') : 'Data inválida'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md uppercase">
                      Local: {r.id_local}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
            {registros.length === 0 && (
              <EmptyState title="Nenhum registro" description="Você ainda não bateu o ponto." icon={<Clock className="w-6 h-6" />} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
