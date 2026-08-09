import React, { useState, useEffect } from 'react';
import { Save, Loader2, User, Phone, Briefcase, DollarSign, LogOut } from 'lucide-react';
import { Card, Button, EmptyState } from '../../components/ui';
import PageHeader from '../../components/layouts/PageHeader';
import { useWorkerAuth } from '../../hooks/useWorkerAuth';
import { useI18n } from '../../i18n';
import { TrabalhadorAvulso } from '../../types';
import { useNavigate } from 'react-router-dom';

export default function WorkerPerfilPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { trabalhador, loading: authLoading, updateTrabalhador, logout } = useWorkerAuth();
  const [form, setForm] = useState<Partial<TrabalhadorAvulso>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (trabalhador) {
      setForm({
        nome: trabalhador.nome,
        profissao: trabalhador.profissao,
        valor_hora: trabalhador.valor_hora,
        telefone: trabalhador.telefone,
      });
    }
  }, [trabalhador]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateTrabalhador(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(t('worker.perfil.erroSalvar'));
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/worker');
  };

  if (authLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!trabalhador) {
    return (
      <div className="p-6 lg:p-8">
        <EmptyState
          icon={<User className="w-8 h-8" />}
          title={t('worker.perfil.notFound')}
          description="Carregue sua informação de trabalhador."
        />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('worker.perfil.title')}
        subtitle={trabalhador.email || trabalhador.nome}
        action={
          <Button variant="danger" icon={<LogOut className="w-4 h-4" />} onClick={handleLogout}>
            {t('worker.perfil.logout')}
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" />
            {t('worker.perfil.nome')}
          </h3>
          <input
            type="text"
            value={form.nome || ''}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-indigo-500" />
            {t('worker.perfil.profissao')}
          </h3>
          <input
            type="text"
            value={form.profissao || ''}
            onChange={(e) => setForm({ ...form, profissao: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            {t('worker.perfil.valorHora')}
          </h3>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">R$</span>
            <input
              type="number"
              value={form.valor_hora || ''}
              onChange={(e) => setForm({ ...form, valor_hora: e.target.value ? parseFloat(e.target.value) : undefined })}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              min="0"
              step="0.01"
            />
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Phone className="w-4 h-4 text-indigo-500" />
            {t('worker.perfil.telefone')}
          </h3>
          <input
            type="tel"
            value={form.telefone || ''}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => { if (trabalhador) setForm({ nome: trabalhador.nome, profissao: trabalhador.profissao, valor_hora: trabalhador.valor_hora, telefone: trabalhador.telefone }); }}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (saved ? t('worker.perfil.salvo') : t('worker.perfil.salvar'))}
          </Button>
        </div>
      </div>
    </div>
  );
}
