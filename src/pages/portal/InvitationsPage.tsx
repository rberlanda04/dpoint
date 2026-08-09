import React, { useState, useEffect } from 'react';
import { Mail, Copy, CheckCircle, Trash2, RefreshCw, AlertCircle } from 'lucide-react';
import { Card, Badge, SearchInput, Button, EmptyState } from '../../components/ui';
import PageHeader from '../../components/layouts/PageHeader';
import { dataService } from '../../utils/gasClient';
import { generateSecureToken } from '../../utils/crypto';
import { useI18n } from '../../i18n';
import { Invitation, Empresa } from '../../types';

export default function InvitationsPage() {
  const { t } = useI18n();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'used' | 'expired'>('all');
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [inv, emp] = await Promise.all([
        dataService.loadInvitations(),
        dataService.loadEmpresas(),
      ]);
      setInvitations(inv);
      setEmpresas(emp);
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(t('portal.inv.loadError'));
    }
    setLoading(false);
  };

  const filtered = invitations.filter(inv => {
    const matchesSearch = inv.email.toLowerCase().includes(search.toLowerCase()) ||
      (inv.nome && inv.nome.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (token: string) => {
    if (!confirm(t('portal.inv.revokeConfirm'))) return;
    try {
      await dataService.updateInvitation(token, { status: 'expired' });
      setInvitations(prev => prev.map(i => i.token === token ? { ...i, status: 'expired' } : i));
    } catch (err) {
      setError(t('portal.inv.revokeError'));
    }
  };

  const handleDelete = async (token: string) => {
    if (!confirm(t('portal.inv.deleteConfirm'))) return;
    try {
      await dataService.deleteInvitation(token);
      setInvitations(prev => prev.filter(i => i.token !== token));
    } catch (err) {
      setError(t('portal.inv.deleteError'));
    }
  };

  const handleResend = async (inv: Invitation) => {
    try {
      const newToken = generateSecureToken();
      const now = new Date();
      const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      await dataService.updateInvitation(inv.token, {
        token: newToken,
        status: 'pending',
        created_at: now.toISOString(),
        expires_at: expires.toISOString(),
      });
      setInvitations(prev => prev.map(i => i.token === inv.token ? {
        ...i,
        id: newToken,
        token: newToken,
        status: 'pending',
        created_at: now.toISOString(),
        expires_at: expires.toISOString(),
      } : i));
    } catch (err) {
      setError(t('portal.inv.resendError'));
    }
  };

  const statusCounts = {
    all: invitations.length,
    pending: invitations.filter(i => i.status === 'pending').length,
    used: invitations.filter(i => i.status === 'used').length,
    expired: invitations.filter(i => i.status === 'expired').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="warning">{t('portal.inv.pending')}</Badge>;
      case 'used': return <Badge variant="success">{t('portal.inv.used')}</Badge>;
      case 'expired': return <Badge variant="default">{t('portal.inv.expired')}</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  const statusLabels: Record<string, string> = {
    all: t('common.all'),
    pending: t('portal.inv.pendings'),
    used: t('portal.inv.useds'),
    expired: t('portal.inv.expireds'),
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('portal.inv.title')}
        subtitle={t('portal.inv.subtitle', { count: invitations.length })}
        action={
          <Button variant="secondary" icon={<RefreshCw className="w-4 h-4" />} onClick={loadData} disabled={loading}>
            {t('common.refresh')}
          </Button>
        }
      />

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700 cursor-pointer border-0 bg-transparent text-xs font-semibold">{t('common.close')}</button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'pending', 'used', 'expired'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border-0 transition-colors ${
              filterStatus === status
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {statusLabels[status]}
            <span className="ml-1.5 text-[10px]">({statusCounts[status]})</span>
          </button>
        ))}
      </div>

      <SearchInput value={search} onChange={setSearch} placeholder={t('portal.inv.search')} className="mb-6" />

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
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Mail className="w-8 h-8" />}
          title={t('portal.inv.notFound')}
          description={t('portal.inv.notFoundDesc')}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const empresa = empresas.find(e => e.id === inv.empresa_id);
            const isCopied = copiedId === inv.token;
            const isExpired = new Date(inv.expires_at) < new Date();
            return (
              <Card key={inv.token} padding="sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      inv.status === 'used' ? 'bg-emerald-50 text-emerald-600' :
                      inv.status === 'expired' || isExpired ? 'bg-slate-100 text-slate-400' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{inv.nome || inv.email}</p>
                      <p className="text-xs text-slate-400">{inv.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {empresa && (
                          <span className="text-[10px] text-slate-400">{empresa.nome}</span>
                        )}
                        <Badge variant={inv.role === 'empresa_admin' ? 'info' : 'default'} className="text-[9px]">
                          {inv.role === 'empresa_admin' ? t('portal.inv.admin') : t('portal.inv.employee')}
                        </Badge>
                        {getStatusBadge(inv.status)}
                        {isExpired && inv.status !== 'expired' && (
                          <Badge variant="default" className="text-[9px]">{t('portal.inv.expired')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {inv.status === 'pending' && !isExpired && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={isCopied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          onClick={() => copyInviteLink(inv.token)}
                        >
                          {isCopied ? t('common.copied') : t('common.copyLink')}
                        </Button>
                        <button
                          onClick={() => handleResend(inv)}
                          className="text-xs text-slate-500 hover:text-slate-700 cursor-pointer border-0 bg-transparent font-semibold"
                        >
                          {t('portal.inv.resend')}
                        </button>
                        <button
                          onClick={() => handleRevoke(inv.token)}
                          className="text-xs text-red-500 hover:text-red-700 cursor-pointer border-0 bg-transparent font-semibold"
                        >
                          {t('func.revoke')}
                        </button>
                      </>
                    )}
                    {(inv.status === 'expired' || isExpired) && (
                      <button
                        onClick={() => handleDelete(inv.token)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer border-0 bg-transparent"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
