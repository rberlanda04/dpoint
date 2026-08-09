import React, { useState, useEffect } from 'react';
import { Plus, Key, Eye, EyeOff, Trash2, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card, Badge, Button, EmptyState, SearchInput } from '../../components/ui';
import PageHeader from '../../components/layouts/PageHeader';
import { dataService } from '../../utils/gasClient';
import { generateSecureToken, generateId } from '../../utils/crypto';
import { useI18n } from '../../i18n';
import { TranslationKey } from '../../i18n/pt';
import { Empresa, AccessKey } from '../../types';

const generateKey = () => 'dk_live_' + generateSecureToken(48);

const PERM_LABELS: Record<AccessKey['permissoes'][number], TranslationKey> = {
  registros: 'nav.records',
  funcionarios: 'nav.employees',
  locais: 'nav.sites',
  relatorios: 'portal.keys.perm.relatorios',
};

export default function AccessKeysPage() {
  const { t } = useI18n();
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState({ empresa_id: '', nome: '', permissoes: ['registros'] as AccessKey['permissoes'] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [e, k] = await Promise.all([
        dataService.loadEmpresas(),
        dataService.loadAccessKeys(),
      ]);
      setEmpresas(e);
      setKeys(k);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const filtered = keys.filter(k =>
    k.nome.toLowerCase().includes(search.toLowerCase()) ||
    k.empresa_id.includes(search) ||
    k.chave.includes(search)
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const empresa = empresas.find(emp => emp.id === newKey.empresa_id);
    const key: AccessKey = {
      id: generateId('key'),
      empresa_id: newKey.empresa_id,
      empresa_nome: empresa?.nome,
      chave: generateKey(),
      nome: newKey.nome,
      ativa: true,
      data_criacao: new Date().toISOString().split('T')[0],
      permissoes: newKey.permissoes,
    };
    await dataService.saveAccessKey(key);
    setKeys(prev => [...prev, key]);
    setNewKey({ empresa_id: '', nome: '', permissoes: ['registros'] });
    setShowAdd(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('portal.keys.deleteConfirm'))) return;
    await dataService.deleteAccessKey(id);
    setKeys(prev => prev.filter(k => k.id !== id));
  };

  const handleToggle = async (id: string, current: boolean) => {
    const key = keys.find(k => k.id === id);
    if (!key) return;
    const updated = { ...key, ativa: !current };
    await dataService.saveAccessKey(updated);
    setKeys(prev => prev.map(k => k.id === id ? updated : k));
  };

  const copyKey = (chave: string) => {
    navigator.clipboard.writeText(chave);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('portal.keys.title')}
        subtitle={t('portal.keys.subtitle', { count: keys.filter(k => k.ativa).length })}
        action={
          <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
            {t('portal.keys.new')}
          </Button>
        }
      />

      <SearchInput value={search} onChange={setSearch} placeholder={t('portal.keys.search')} className="mb-6" />

      {showAdd && (
        <Card className="mb-6 border-indigo-200 bg-indigo-50/30">
          <form onSubmit={handleAdd} className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-500" />
              {t('portal.keys.generateTitle')}
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <select value={newKey.empresa_id} onChange={(e) => setNewKey({ ...newKey, empresa_id: e.target.value })} required className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
                <option value="">{t('portal.keys.selectCompany')}</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nome}</option>
                ))}
              </select>
              <input type="text" placeholder={t('portal.keys.namePlaceholder')} value={newKey.nome} onChange={(e) => setNewKey({ ...newKey, nome: e.target.value })} required className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">{t('portal.keys.permissions')}</p>
              <div className="flex flex-wrap gap-2">
                {(['registros', 'funcionarios', 'locais', 'relatorios'] as const).map(perm => (
                  <label key={perm} className="flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={newKey.permissoes.includes(perm)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewKey({ ...newKey, permissoes: [...newKey.permissoes, perm] });
                        } else {
                          setNewKey({ ...newKey, permissoes: newKey.permissoes.filter(p => p !== perm) });
                        }
                      }}
                      className="rounded"
                    />
                    {t(PERM_LABELS[perm])}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm">{t('portal.keys.generate')}</Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)}>{t('common.cancel')}</Button>
            </div>
          </form>
        </Card>
      )}

      {keys.length === 0 && !loading ? (
        <EmptyState
          icon={<Key className="w-8 h-8" />}
          title={t('portal.keys.notFound')}
          description={t('portal.keys.notFoundDesc')}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((key) => (
            <Card key={key.id} padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    key.ativa ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{key.nome}</p>
                    <p className="text-xs text-slate-400">{key.empresa_nome || key.empresa_id}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <code className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                        {visibleKey === key.id ? key.chave : key.chave.substring(0, 12) + '••••••••••••'}
                      </code>
                      <button
                        onClick={() => setVisibleKey(visibleKey === key.id ? null : key.id)}
                        className="p-1 rounded hover:bg-slate-100 cursor-pointer border-0 bg-transparent text-slate-400"
                      >
                        {visibleKey === key.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => copyKey(key.chave)}
                        className="p-1 rounded hover:bg-slate-100 cursor-pointer border-0 bg-transparent text-slate-400"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {key.permissoes.map(p => (
                      <Badge key={p} variant="info" className="text-[9px]">{t(PERM_LABELS[p])}</Badge>
                    ))}
                  </div>
                  <Badge variant={key.ativa ? 'success' : 'default'}>
                    {key.ativa ? t('common.activeFem') : t('common.inactiveFem')}
                  </Badge>
                  <button
                    onClick={() => handleToggle(key.id, key.ativa)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    {key.ativa ? (
                      <ToggleRight className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-slate-300" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(key.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
