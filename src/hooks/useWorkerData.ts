import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../utils/gasClient';
import { TrabalhadorAvulso, ObraPessoal, SessaoTrabalho, Compartilhamento, ResumoDiario } from '../types';

export function useWorkerData(trabalhadorId: string | null) {
  const [trabalhador, setTrabalhador] = useState<TrabalhadorAvulso | null>(null);
  const [obras, setObras] = useState<ObraPessoal[]>([]);
  const [sessoes, setSessoes] = useState<SessaoTrabalho[]>([]);
  const [compartilhamentos, setCompartilhamentos] = useState<Compartilhamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!trabalhadorId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [t, o, s, c] = await Promise.all([
        dataService.loadTrabalhador(trabalhadorId),
        dataService.loadObrasPessoais(trabalhadorId),
        dataService.loadSessoesTrabalho(trabalhadorId),
        dataService.loadCompartilhamentos(trabalhadorId),
      ]);
      setTrabalhador(t);
      setObras(o);
      setSessoes(s);
      setCompartilhamentos(c);
    } catch (err) {
      console.error('Erro ao carregar dados do trabalhador:', err);
      setError('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [trabalhadorId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refresh = () => loadAll();

  // Computed: Resumo diário
  const getResumoDiario = useCallback((data: string): ResumoDiario => {
    const sessoesDia = sessoes.filter(s => s.data_hora.startsWith(data));
    let horasTrabalhadas = 0;
    let ganhoEstimado = 0;
    const obrasSet = new Set<string>();

    // Pair inicio/fim sessions
    const inicioSessions = sessoesDia.filter(s => s.tipo === 'inicio').sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
    const fimSessions = sessoesDia.filter(s => s.tipo === 'fim').sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

    inicioSessions.forEach((inicio, idx) => {
      const fim = fimSessions[idx];
      if (fim) {
        const diffMs = new Date(fim.data_hora).getTime() - new Date(inicio.data_hora).getTime();
        const horas = diffMs / (1000 * 60 * 60);
        horasTrabalhadas += horas;
        
        const obra = obras.find(o => o.id === inicio.obra_id);
        const valorHora = obra?.valor_hora || trabalhador?.valor_hora || 0;
        ganhoEstimado += horas * valorHora;
        
        obrasSet.add(inicio.obra_id);
      }
    });

    return {
      data,
      horas_trabalhadas: Math.round(horasTrabalhadas * 100) / 100,
      ganho_estimado: Math.round(ganhoEstimado * 100) / 100,
      obras: Array.from(obrasSet),
    };
  }, [sessoes, obras, trabalhador]);

  // Computed: Stats for dashboard
  const getStats = useCallback(() => {
    const hoje = new Date().toISOString().split('T')[0];
    const semanaInicio = new Date();
    semanaInicio.setDate(semanaInicio.getDate() - semanaInicio.getDay());
    const mesInicio = new Date();
    mesInicio.setDate(1);

    let horasSemana = 0;
    let ganhoSemana = 0;
    let horasMes = 0;
    let ganhoMes = 0;
    let diasTrabalhados = 0;
    let streak = 0;

    const sessoesSemana = sessoes.filter(s => new Date(s.data_hora) >= semanaInicio);
    const sessoesMes = sessoes.filter(s => new Date(s.data_hora) >= mesInicio);

    [sessoesSemana, sessoesMes].forEach((sess, idx) => {
      const inicioSess = sess.filter(s => s.tipo === 'inicio').sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
      const fimSess = sess.filter(s => s.tipo === 'fim').sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

      inicioSess.forEach((inicio, i) => {
        const fim = fimSess[i];
        if (fim) {
          const diffMs = new Date(fim.data_hora).getTime() - new Date(inicio.data_hora).getTime();
          const horas = diffMs / (1000 * 60 * 60);
          const obra = obras.find(o => o.id === inicio.obra_id);
          const valorHora = obra?.valor_hora || trabalhador?.valor_hora || 0;
          
          if (idx === 0) {
            horasSemana += horas;
            ganhoSemana += horas * valorHora;
          }
          horasMes += horas;
          ganhoMes += horas * valorHora;
        }
      });
    });

    // Dias trabalhados no mês
    const datasComTrabalho = new Set<string>();
    sessoesMes.filter(s => s.tipo === 'inicio').forEach(s => {
      datasComTrabalho.add(s.data_hora.split('T')[0]);
    });
    diasTrabalhados = datasComTrabalho.size;

    // Streak (dias consecutivos trabalhados até hoje)
    let checkDate = new Date();
    while (true) {
      const dataStr = checkDate.toISOString().split('T')[0];
      if (datasComTrabalho.has(dataStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // Se hoje não trabalhou, verifica ontem
        if (streak === 0) break;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    return {
      horasSemana: Math.round(horasSemana * 100) / 100,
      ganhoSemana: Math.round(ganhoSemana * 100) / 100,
      horasMes: Math.round(horasMes * 100) / 100,
      ganhoMes: Math.round(ganhoMes * 100) / 100,
      diasTrabalhados,
      streak,
    };
  }, [sessoes, obras, trabalhador]);

  // Computed: Chart data - últimos 30 dias
  const getHorasUltimos30Dias = useCallback(() => {
    const dados: { data: string; horas: number; ganho: number }[] = [];
    const hoje = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const dataStr = d.toISOString().split('T')[0];
      const resumo = getResumoDiario(dataStr);
      dados.push({ data: dataStr, horas: resumo.horas_trabalhadas, ganho: resumo.ganho_estimado });
    }
    return dados;
  }, [getResumoDiario]);

  // Computed: Ganhos por semana (últimas 12 semanas)
  const getGanhosPorSemana = useCallback(() => {
    const dados: { semana: string; ganho: number; horas: number }[] = [];
    const hoje = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const inicioSemana = new Date(hoje);
      inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay() - i * 7);
      const fimSemana = new Date(inicioSemana);
      fimSemana.setDate(fimSemana.getDate() + 6);
      
      let ganho = 0;
      let horas = 0;
      
      const sessoesSemana = sessoes.filter(s => {
        const data = new Date(s.data_hora);
        return data >= inicioSemana && data <= fimSemana;
      });
      
      const inicioSess = sessoesSemana.filter(s => s.tipo === 'inicio').sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
      const fimSess = sessoesSemana.filter(s => s.tipo === 'fim').sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
      
      inicioSess.forEach((inicio, idx) => {
        const fim = fimSess[idx];
        if (fim) {
          const diffMs = new Date(fim.data_hora).getTime() - new Date(inicio.data_hora).getTime();
          const h = diffMs / (1000 * 60 * 60);
          horas += h;
          const obra = obras.find(o => o.id === inicio.obra_id);
          const valorHora = obra?.valor_hora || trabalhador?.valor_hora || 0;
          ganho += h * valorHora;
        }
      });
      
      dados.push({ 
        semana: `${String(inicioSemana.getDate()).padStart(2, '0')}/${String(inicioSemana.getMonth() + 1).padStart(2, '0')}`, 
        ganho: Math.round(ganho * 100) / 100,
        horas: Math.round(horas * 100) / 100,
      });
    }
    return dados;
  }, [sessoes, obras, trabalhador]);

  // Computed: Distribuição por obra
  const getDistribuicaoPorObra = useCallback(() => {
    const mapa = new Map<string, { horas: number; ganho: number; nome: string }>();
    
    const inicioSess = sessoes.filter(s => s.tipo === 'inicio').sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
    const fimSess = sessoes.filter(s => s.tipo === 'fim').sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
    
    inicioSess.forEach((inicio, idx) => {
      const fim = fimSess[idx];
      if (fim) {
        const diffMs = new Date(fim.data_hora).getTime() - new Date(inicio.data_hora).getTime();
        const horas = diffMs / (1000 * 60 * 60);
        const obra = obras.find(o => o.id === inicio.obra_id);
        const nome = obra?.nome || 'Obra desconhecida';
        const valorHora = obra?.valor_hora || trabalhador?.valor_hora || 0;
        
        const atual = mapa.get(inicio.obra_id) || { horas: 0, ganho: 0, nome };
        atual.horas += horas;
        atual.ganho += horas * valorHora;
        mapa.set(inicio.obra_id, atual);
      }
    });
    
    return Array.from(mapa.entries()).map(([id, v]) => ({
      id,
      nome: v.nome,
      horas: Math.round(v.horas * 100) / 100,
      ganho: Math.round(v.ganho * 100) / 100,
    }));
  }, [sessoes, obras, trabalhador]);

  // Computed: Heatmap data para calendário
  const getHeatmapData = useCallback(() => {
    const dados: { data: string; horas: number }[] = [];
    const hoje = new Date();
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    
    for (let d = new Date(inicioAno); d <= hoje; d.setDate(d.getDate() + 1)) {
      const dataStr = d.toISOString().split('T')[0];
      const resumo = getResumoDiario(dataStr);
      if (resumo.horas_trabalhadas > 0) {
        dados.push({ data: dataStr, horas: resumo.horas_trabalhadas });
      }
    }
    return dados;
  }, [getResumoDiario]);

  return {
    trabalhador,
    obras,
    sessoes,
    compartilhamentos,
    loading,
    error,
    refresh,
    getResumoDiario,
    getStats,
    getHorasUltimos30Dias,
    getGanhosPorSemana,
    getDistribuicaoPorObra,
    getHeatmapData,
  };
}