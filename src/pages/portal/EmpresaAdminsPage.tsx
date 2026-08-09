import React, { useState, useEffect } from 'react';
import { Plus, Shield, Trash2, RefreshCw, AlertCircle, UserPlus, Building2, Copy, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { Card, Badge, SearchInput, Button, EmptyState } from '../../components/ui';
import PageHeader from '../../components/layouts/PageHeader';
import { dataService } from '../../utils/gasClient';
import { generateSecureToken } from '../../utils/crypto';
import { useI18n } from '../../i18n';
import { Empresa, EmpresaAdmin, Invitation } from '../../types';

export default function EmpresaAdminsPage() {
  const { t, lang } = useI18n();
  const [admins, setAdmins] = useState<EmpresaAdmin[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    email: '', nome: '', empresa_id: ''
  });

  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [a, e, inv] = await Promise.all([
        dataService.loadEmpresaAdmins(),
        dataService.loadEmpresas(),
        dataService.loadInvitations(),
      ]);
      setAdmins(a);
      setEmpresas(e);
      setInvitations(inv.filter(i => i.role === 'empresa_admin'));
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(t('portal.admins.loadError'));
    }
    setLoading(false);
  };

  const filteredAdmins = admins.filter(a =>
    a.nome.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.empresa_id.includes(search)
  );

  const filteredInvitations = invitations.filter(i =>
    i.status === 'pending' && (
      i.email.toLowerCase().includes(search.toLowerCase()) ||
      i.empresa_id.includes(search)
    )
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const empresa = empresas.find(emp => emp.id === newAdmin.empresa_id);
    const token = generateSecureToken();
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const invitation: Invitation = {
      id: token,
      token,
      email: newAdmin.email,
      nome: newAdmin.nome,
      empresa_id: newAdmin.empresa_id,
      empresa_nome: empresa?.nome,
      role: 'empresa_admin',
      status: 'pending',
      created_at: now.toISOString(),
      expires_at: expires.toISOString(),
      created_by: 'super_admin',
    };

    try {
      await dataService.saveInvitation(invitation);
      setInvitations(prev => [invitation, ...prev]);
      setNewAdmin({ email: '', nome: '', empresa_id: '' });
      setShowAdd(false);
    } catch (err: any) {
      console.error('Erro ao salvar convite:', err);
      setError(t('portal.admins.createError'));
    }
    setSaving(false);
  };

  const handleDeleteAdmin = async (uid: string) => {
    if (!confirm(t('portal.admins.deleteConfirm'))) return;
    try {
      await dataService.deleteEmpresaAdmin(uid);
      setAdmins(prev => prev.filter(a => a.uid !== uid));
    } catch (err) {
      setError(t('portal.admins.deleteError'));
    }
  };

  const handleRevokeInvitation = async (token: string) => {
    if (!confirm(t('portal.inv.revokeConfirm'))) return;
    try {
      await dataService.updateInvitation(token, { status: 'expired' });
      setInvitations(prev => prev.map(i => i.token === token ? { ...i, status: 'expired' } : i));
    } catch (err) {
      setError(t('portal.inv.revokeError'));
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('portal.admins.title')}
        subtitle={t('portal.admins.subtitle', { count: admins.length, pending: filteredInvitations.length })}
        action={
          <div className="flex gap-2">
            <Button variant="secondary" icon={<RefreshCw className="w-4 h-4" />} onClick={loadData} disabled={loading}>
              {t('common.refresh')}
            </Button>
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
              {t('portal.admins.new')}
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

      <SearchInput value={search} onChange={setSearch} placeholder={t('portal.admins.search')} className="mb-6" />

      {showAdd && (
        <Card className="mb-6 border-indigo-200 bg-indigo-50/30">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-slate-800">{t('portal.admins.inviteTitle')}</h3>
            </div>
            <p className="text-xs text-slate-500">
              {t('portal.admins.inviteDesc')}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder={t('portal.admins.fullName')}
                value={newAdmin.nome}
                onChange={(e) => setNewAdmin({ ...newAdmin, nome: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="email"
                placeholder={t('portal.admins.emailPlaceholder')}
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <select
                value={newAdmin.empresa_id}
                onChange={(e) => setNewAdmin({ ...newAdmin, empresa_id: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">{t('portal.admins.selectCompany')}</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? t('portal.admins.generating') : t('portal.admins.generate')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAdd(false); setError(''); }}>{t('common.cancel')}</Button>
            </div>
          </form>
        </Card>
      )}

      {filteredInvitations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('portal.admins.pendingInvites')}</h3>
          <div className="space-y-2">
            {filteredInvitations.map((inv) => {
              const empresa = empresas.find(e => e.id === inv.empresa_id);
              const isCopied = copiedId === inv.token;
              return (
                <Card key={inv.token} padding="sm" className="border-amber-200 bg-amber-50/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <LinkIcon className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{inv.nome || inv.email}</p>
                        <p className="text-xs text-slate-400">{empresa?.nome || inv.empresa_id} · {t('func.expiresOn', { date: new Date(inv.expires_at).toLocaleDateString(locale) })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={isCopied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        onClick={() => copyInviteLink(inv.token)}
                      >
                        {isCopied ? t('common.copied') : t('common.copyLink')}
                      </Button>
                      <button
                        onClick={() => handleRevokeInvitation(inv.token)}
                        className="text-xs text-red-500 hover:text-red-700 cursor-pointer border-0 bg-transparent font-semibold"
                      >
                        {t('func.revoke')}
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-40" />
                  <div className="h-3 bg-slate-100 rounded w-60" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : admins.length === 0 && filteredInvitations.length === 0 ? (
        <EmptyState
          icon={<Shield className="w-8 h-8" />}
          title={t('portal.admins.notFound')}
          description={t('portal.admins.notFoundDesc')}
          action={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
              {t('portal.admins.new')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('portal.admins.activeAdmins')}</h3>
          {filteredAdmins.map((admin) => {
            const empresa = empresas.find(e => e.id === admin.empresa_id);
            return (
              <Card key={admin.uid} padding="sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      admin.ativo ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
                    }`}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{admin.nome}</p>
                      <p className="text-xs text-slate-400">{admin.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Building2 className="w-3 h-3" />
                          {empresa?.nome || admin.empresa_id}
                        </div>
                        <span className="text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400">{t('common.since')} {admin.data_criacao}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={admin.ativo ? 'success' : 'default'}>
                      {admin.ativo ? t('common.active') : t('common.inactive')}
                    </Badge>
                    <button
                      onClick={() => handleDeleteAdmin(admin.uid)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
