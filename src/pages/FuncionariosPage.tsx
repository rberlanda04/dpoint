import React, { useState, useEffect } from 'react';
import { Plus, ToggleLeft, ToggleRight, Users, Copy, CheckCircle, Link as LinkIcon, Trash2 } from 'lucide-react';
import { Card, Badge, Avatar, SearchInput, Button, EmptyState, Dialog } from '../components/ui';
import { useToast } from '../components/ui/Toast';
import PageHeader from '../components/layouts/PageHeader';
import { dataService } from '../utils/gasClient';
import { generateSecureToken } from '../utils/crypto';
import { useAuth } from '../hooks/useAuth';
import { useI18n } from '../i18n';
import { Funcionario, Invitation } from '../types';

export default function FuncionariosPage() {
  const { empresaAdmin, isSuperAdmin } = useAuth();
  const { t, lang } = useI18n();
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newFunc, setNewFunc] = useState({ id: '', nome: '', cargo: '', email: '' });
  const [deleteTarget, setDeleteTarget] = useState<Funcionario | null>(null);
  const [revokeToken, setRevokeToken] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const locale = lang === 'pt' ? 'pt-BR' : 'en-US';
  const empresaId = isSuperAdmin ? undefined : empresaAdmin?.empresa_id || undefined;

  useEffect(() => {
    loadData();
  }, [empresaId]);

  const loadData = async () => {
    setLoading(true);
    const db = await dataService.loadAllData(empresaId);
    setFuncionarios(db.funcionarios);
    const inv = await dataService.loadInvitations(empresaId);
    setInvitations(inv.filter(i => i.role === 'funcionario'));
    setLoading(false);
  };

  const filtered = funcionarios.filter(f =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    f.id_funcionario.includes(search) ||
    f.cargo.toLowerCase().includes(search.toLowerCase()) ||
    (f.email && f.email.toLowerCase().includes(search.toLowerCase()))
  );

  const filteredInvitations = invitations.filter(i =>
    i.status === 'pending' && (
      i.email.toLowerCase().includes(search.toLowerCase()) ||
      (i.nome && i.nome.toLowerCase().includes(search.toLowerCase()))
    )
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();

    const id = newFunc.id.trim().toUpperCase();
    if (funcionarios.some(f => f.id_funcionario.toUpperCase() === id)) {
      toast.warning(t('func.duplicateId'));
      return;
    }

    setSaving(true);

    try {
      const func: Funcionario = {
        id_funcionario: id,
        nome: newFunc.nome.trim(),
        cargo: newFunc.cargo.trim(),
        email: newFunc.email.trim() || undefined,
        empresa_id: empresaAdmin?.empresa_id || '',
        status: 'Ativo',
      };

      await dataService.cadastrarFuncionario(func);
      setFuncionarios(prev => [...prev, func]);

      if (newFunc.email.trim()) {
        const token = generateSecureToken();
        const now = new Date();
        const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const invitation: Invitation = {
          id: token,
          token,
          email: newFunc.email.trim(),
          nome: newFunc.nome.trim(),
          empresa_id: empresaAdmin?.empresa_id || '',
          empresa_nome: empresaAdmin?.empresa_nome,
          role: 'funcionario',
          status: 'pending',
          created_at: now.toISOString(),
          expires_at: expires.toISOString(),
          created_by: 'empresa_admin',
        };
        await dataService.saveInvitation(invitation);
        setInvitations(prev => [invitation, ...prev]);
      }

      toast.success(t('func.saveSuccess') || `${newFunc.nome.trim()} cadastrado com sucesso!`);
      setNewFunc({ id: '', nome: '', cargo: '', email: '' });
      setShowAdd(false);
    } catch (err) {
      toast.error(t('func.saveError'));
    }
    setSaving(false);
  };

  const handleToggle = async (id: string, current: 'Ativo' | 'Inativo') => {
    const next = current === 'Ativo' ? 'Inativo' : 'Ativo';
    setFuncionarios(prev => prev.map(f => f.id_funcionario === id ? { ...f, status: next } : f));
    try {
      await dataService.toggleFuncionarioStatus(id, next, empresaId);
    } catch (err) {
      console.error('Erro ao alternar status:', err);
      setFuncionarios(prev => prev.map(f => f.id_funcionario === id ? { ...f, status: current } : f));
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dataService.excluirFuncionario(deleteTarget.id_funcionario, empresaId);
      setFuncionarios(prev => prev.filter(f => f.id_funcionario !== deleteTarget.id_funcionario));
      toast.success(`${deleteTarget.nome} removido com sucesso.`);
    } catch (err) {
      toast.error(t('func.deleteError'));
    }
    setDeleting(false);
    setDeleteTarget(null);
  };

  const handleRevokeConfirm = async () => {
    if (!revokeToken) return;
    await dataService.updateInvitation(revokeToken, { status: 'expired' });
    setInvitations(prev => prev.map(i => i.token === revokeToken ? { ...i, status: 'expired' } : i));
    toast.success(lang === 'pt' ? 'Convite revogado.' : 'Invitation revoked.');
    setRevokeToken(null);
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
        title={t('func.title')}
        subtitle={t('func.subtitle', { count: funcionarios.length, pending: filteredInvitations.length })}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            {t('func.new')}
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder={t('func.searchPlaceholder')} className="mb-6" />

      {showAdd && (
        <Card className="mb-6 border-indigo-200 bg-indigo-50/30">
          <form onSubmit={handleAdd} className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">{t('func.new')}</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder={t('func.registration')}
                value={newFunc.id}
                onChange={(e) => setNewFunc({ ...newFunc, id: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder={t('func.fullName')}
                value={newFunc.nome}
                onChange={(e) => setNewFunc({ ...newFunc, nome: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="text"
                placeholder={t('func.role')}
                value={newFunc.cargo}
                onChange={(e) => setNewFunc({ ...newFunc, cargo: e.target.value })}
                required
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
              <input
                type="email"
                placeholder={t('func.emailPlaceholder')}
                value={newFunc.email}
                onChange={(e) => setNewFunc({ ...newFunc, email: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            {newFunc.email && (
              <p className="text-[10px] text-indigo-600">
                {t('func.inviteWillGenerate', { email: newFunc.email })}
              </p>
            )}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? t('common.saving') : t('common.save')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
            </div>
          </form>
        </Card>
      )}

      {filteredInvitations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{t('func.pendingInvites')}</h3>
          <div className="space-y-2">
            {filteredInvitations.map((inv) => {
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
                        <p className="text-xs text-slate-400">{t('func.expiresOn', { date: new Date(inv.expires_at).toLocaleDateString(locale) })}</p>
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
                        onClick={() => setRevokeToken(inv.token)}
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

      {filtered.length === 0 && filteredInvitations.length === 0 ? (
        <EmptyState
          icon={<Users className="w-8 h-8" />}
          title={t('func.notFound')}
          description={t('func.notFoundDesc')}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((func) => (
            <Card key={func.id_funcionario} padding="sm" hover>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={func.nome} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{func.nome}</p>
                    <p className="text-xs text-slate-400">{func.cargo} · {t('checkin.mat')} {func.id_funcionario}</p>
                    {func.email && (
                      <p className="text-xs text-slate-400">{func.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={func.status === 'Ativo' ? 'success' : 'default'}>
                    {func.status}
                  </Badge>
                  <button
                    onClick={() => handleToggle(func.id_funcionario, func.status)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
                    title={func.status === 'Ativo' ? t('func.setInactive') : t('func.setActive')}
                  >
                    {func.status === 'Ativo' ? (
                      <ToggleRight className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-slate-300" />
                    )}
                  </button>
                  <button
                    onClick={() => setDeleteTarget(func)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer border-0 bg-transparent"
                    title={t('common.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={t('func.deleteConfirmTitle') || 'Excluir funcionário?'}
        description={deleteTarget ? (t('func.deleteConfirm', { name: deleteTarget.nome }) || `Tem certeza que deseja excluir ${deleteTarget.nome}? Esta ação não pode ser desfeita.`) : ''}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        loading={deleting}
      />

      {/* Revoke Invitation Dialog */}
      <Dialog
        open={!!revokeToken}
        onClose={() => setRevokeToken(null)}
        onConfirm={handleRevokeConfirm}
        title={t('func.revokeConfirmTitle') || 'Revogar convite?'}
        description={t('func.revokeConfirm') || 'O funcionário não poderá mais usar este link para acessar o sistema.'}
        confirmLabel={t('func.revoke')}
        cancelLabel={t('common.cancel')}
        variant="danger"
      />
    </div>
  );
}
