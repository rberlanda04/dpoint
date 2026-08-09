import React, { useState, useEffect } from 'react';
import { Plus, Building2, Trash2, RefreshCw, AlertCircle, Copy, CheckCircle } from 'lucide-react';
import { Card, Badge, SearchInput, Button, EmptyState, Input } from '../../components/ui';
import PageHeader from '../../components/layouts/PageHeader';
import { dataService } from '../../utils/gasClient';
import { generateSecureToken } from '../../utils/crypto';
import { useI18n } from '../../i18n';
import { Empresa, Venda, Invitation } from '../../types';
import { PLANS } from '../../data/saasData';
import LanguageSwitcher from '../../components/LanguageSwitcher';

function formatCNPJ(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 14);
  if (nums.length <= 2) return nums;
  if (nums.length <= 5) return `${nums.slice(0, 2)}.${nums.slice(2)}`;
  if (nums.length <= 8) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5)}`;
  if (nums.length <= 12) return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}`;
  return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12, 14)}`;
}

function isValidCNPJ(cnpj: string): boolean {
  const nums = cnpj.replace(/\D/g, '');
  if (nums.length !== 14) return false;
  if (/^(\d)\1+$/.test(nums)) return false;
  let sum = 0;
  let weight = 2;
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(nums[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let digit1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (parseInt(nums[12]) !== digit1) return false;
  sum = 0;
  weight = 2;
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(nums[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let digit2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return parseInt(nums[13]) === digit2;
}

export default function CompaniesPage() {
  const { t, lang } = useI18n();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newEmpresa, setNewEmpresa] = useState({
    nome: '', cnpj: '', plano: 'bronze' as 'bronze' | 'prata' | 'ouro', adminEmail: '', adminNome: ''
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';

  useEffect(() => {
    loadSaaSData();
  }, []);

  const loadSaaSData = async () => {
    setLoading(true);
    setError('');
    try {
      const [e, v] = await Promise.all([
        dataService.loadEmpresas(),
        dataService.loadVendas(),
      ]);
      setEmpresas(e);
      setVendas(v);
    } catch (err: any) {
      console.error('Erro ao carregar SaaS data:', err);
      setError(t('portal.companies.loadError'));
    }
    setLoading(false);
  };

  const filtered = empresas.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.id.includes(search) ||
    e.cnpj.includes(search)
  );

  const generateId = () => {
    const num = empresas.length + 1;
    return `EMP-${String(num).padStart(3, '0')}`;
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const cleanCnpj = newEmpresa.cnpj.replace(/\D/g, '');
    if (!isValidCNPJ(cleanCnpj)) {
      setError(t('portal.companies.invalidCnpj'));
      setSaving(false);
      return;
    }

    const id = generateId();
    const empresa: Empresa = {
      id,
      nome: newEmpresa.nome,
      cnpj: cleanCnpj,
      plano: newEmpresa.plano,
      status: 'ativo',
      data_contratacao: new Date().toISOString().split('T')[0],
      empresa_pai: 'dpoint',
    };

    try {
      await dataService.saveEmpresa(empresa);

      if (newEmpresa.adminEmail) {
        const token = generateSecureToken();
        const now = new Date();
        const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const invitation: Invitation = {
          id: token,
          token,
          email: newEmpresa.adminEmail,
          nome: newEmpresa.adminNome,
          empresa_id: id,
          empresa_nome: newEmpresa.nome,
          role: 'empresa_admin',
          status: 'pending',
          created_at: now.toISOString(),
          expires_at: expires.toISOString(),
          created_by: 'super_admin',
        };
        await dataService.saveInvitation(invitation);
      }

      setEmpresas(prev => [...prev, empresa]);
      setNewEmpresa({ nome: '', cnpj: '', plano: 'bronze', adminEmail: '', adminNome: '' });
      setShowAdd(false);
    } catch (err: any) {
      console.error('Erro ao salvar empresa:', err);
      setError(t('portal.companies.saveError'));
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('portal.companies.deleteConfirm'))) return;
    try {
      await dataService.deleteEmpresa(id);
      setEmpresas(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      console.error('Erro ao excluir empresa:', err);
      setError(t('portal.companies.deleteError'));
    }
  };

  const getVendasByEmpresa = (empresaId: string) => vendas.filter(v => v.empresa_id === empresaId);

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('portal.companies.title')}
        subtitle={t('portal.companies.subtitle', { count: empresas.length })}
        action={
          <div className="flex items-center gap-2">
            <LanguageSwitcher variant="dark" />
            <Button variant="secondary" icon={<RefreshCw className="w-4 h-4" />} onClick={loadSaaSData} disabled={loading}>
              {t('common.refresh')}
            </Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
              {t('portal.companies.new')}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700 cursor-pointer border-0 bg-transparent text-xs font-semibold">{t('common.close')}</button>
        </div>
      )}

      <SearchInput value={search} onChange={setSearch} placeholder={t('portal.companies.search')} className="mb-6" />

      {showAdd && (
        <Card className="mb-6 border-indigo-200 bg-indigo-50/30">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{t('portal.companies.new')}</h3>
              <span className="text-xs text-slate-400">{t('portal.companies.idPreview', { id: generateId() })}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder={t('portal.companies.legalName')}
                value={newEmpresa.nome}
                onChange={(e) => setNewEmpresa({ ...newEmpresa, nome: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <Input
                type="text"
                placeholder={t('portal.companies.cnpjPlaceholder')}
                value={formatCNPJ(newEmpresa.cnpj)}
                onChange={(e) => setNewEmpresa({ ...newEmpresa, cnpj: e.target.value })}
                required
                icon={<span>CNPJ</span>}
              />
              <select
                value={newEmpresa.plano}
                onChange={(e) => setNewEmpresa({ ...newEmpresa, plano: e.target.value as any })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {Object.entries(PLANS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name} — {v.price}</option>
                ))}
              </select>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-xs font-semibold text-slate-600 mb-3">{t('portal.companies.adminInvite')}</h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder={t('portal.companies.adminName')}
                  value={newEmpresa.adminNome}
                  onChange={(e) => setNewEmpresa({ ...newEmpresa, adminNome: e.target.value })}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <input
                  type="email"
                  placeholder={t('portal.companies.adminEmail')}
                  value={newEmpresa.adminEmail}
                  onChange={(e) => setNewEmpresa({ ...newEmpresa, adminEmail: e.target.value })}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                {t('portal.companies.inviteNote')}
              </p>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? t('common.saving') : t('portal.companies.create')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setError(''); }}>{t('common.cancel')}</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-40" />
                  <div className="h-3 bg-slate-100 rounded w-60" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : empresas.length === 0 ? (
        <EmptyState
          icon={<Building2 className="w-8 h-8" />}
          title={t('portal.companies.notFound')}
          description={t('portal.companies.notFoundDesc')}
          action={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
              {t('portal.companies.add')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {filtered.map((empresa) => {
            const plan = PLANS[empresa.plano];
            const vendasEmpresa = getVendasByEmpresa(empresa.id);
            return (
              <Card key={empresa.id} hover>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800">{empresa.nome}</h3>
                      <p className="text-xs text-slate-400">CNPJ {empresa.cnpj} · ID {empresa.id}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant={plan?.color as any || 'default'}>{plan?.name || empresa.plano}</Badge>
                        <Badge variant={empresa.status === 'ativo' ? 'success' : 'default'}>
                          {empresa.status}
                        </Badge>
                        <span className="text-[10px] text-slate-400">{t('common.since')} {empresa.data_contratacao}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(empresa.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {vendasEmpresa.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-400">{t('portal.companies.totalSales')}</p>
                      <p className="text-sm font-bold text-slate-700">{vendasEmpresa.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">{t('portal.companies.totalRevenue')}</p>
                      <p className="text-sm font-bold text-emerald-600">
                        R$ {vendasEmpresa.reduce((sum, v) => sum + v.valor_total, 0).toLocaleString(locale)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">{t('portal.companies.commission')}</p>
                      <p className="text-sm font-bold text-indigo-600">
                        R$ {vendasEmpresa.reduce((sum, v) => sum + v.comissao_dpoint, 0).toLocaleString(locale)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400">{t('portal.companies.avgTicket')}</p>
                      <p className="text-sm font-bold text-slate-700">
                        R$ {(vendasEmpresa.reduce((sum, v) => sum + v.valor_total, 0) / vendasEmpresa.length).toLocaleString(locale, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
