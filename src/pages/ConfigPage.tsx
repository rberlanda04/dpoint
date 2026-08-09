import React, { useState, useEffect } from 'react';
import { Save, Globe, Database, Shield, AlertTriangle, Languages, Loader2 } from 'lucide-react';
import { Card, Badge, Button, Toggle } from '../components/ui';
import PageHeader from '../components/layouts/PageHeader';
import { dataService } from '../utils/gasClient';
import { useI18n, Language } from '../i18n';
import { SystemConfig } from '../types';

export default function ConfigPage() {
  const { t, lang, setLang } = useI18n();
  const [config, setConfig] = useState<SystemConfig>({
    id: 'app_config',
    use_geolocation: true,
    use_qr_code: true,
    use_camera_photo: false,
    use_online_api: true,
    mode: 'firebase',
    gas_web_app_url: '',
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    dataService.loadConfig().then(c => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await dataService.saveConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClearRecords = async () => {
    if (!confirm(t('config.clearConfirm'))) return;
    setClearing(true);
    try {
      await dataService.clearAllRegistros();
      alert(t('config.clearDone'));
    } catch (err) {
      console.error('Erro ao limpar registros:', err);
      alert(t('config.clearError'));
    }
    setClearing(false);
  };

  return (
    <div className="p-6 lg:p-8">
      <PageHeader
        title={t('config.title')}
        subtitle={t('config.subtitle')}
        action={
          <Button icon={<Save className="w-4 h-4" />} onClick={handleSave} disabled={loading}>
            {saved ? t('config.saved') : t('config.saveChanges')}
          </Button>
        }
      />

      <div className="max-w-2xl space-y-6">
        {/* Language */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Languages className="w-4 h-4 text-indigo-500" />
            {t('config.language')}
          </h3>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-slate-700">{t('config.language')}</p>
              <p className="text-xs text-slate-400">{t('config.languageDesc')}</p>
            </div>
            <div className="flex bg-slate-100 rounded-xl p-1">
              {(['pt', 'en'] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer border-0 transition-all ${
                    lang === l ? 'bg-white text-indigo-600 shadow-sm' : 'bg-transparent text-slate-500'
                  }`}
                >
                  {l === 'pt' ? 'Português' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Data Source */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-500" />
            {t('config.dataSource')}
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-700">{t('config.opMode')}</p>
                <p className="text-xs text-slate-400">{t('config.opModeDesc')}</p>
              </div>
              <Badge variant="success">{config.mode}</Badge>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-700">{t('config.gasUrl')}</p>
                <p className="text-xs text-slate-400">{t('config.gasUrlDesc')}</p>
              </div>
              <input
                type="text"
                placeholder="https://script.google.com/macros/..."
                value={config.gas_web_app_url}
                onChange={(e) => setConfig({ ...config, gas_web_app_url: e.target.value })}
                className="w-72 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>
        </Card>

        {/* Check-in Methods */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-500" />
            {t('config.methods')}
          </h3>
          <div className="space-y-4">
            {[
              { key: 'use_geolocation' as const, label: t('config.geolocation'), desc: t('config.geolocationDesc'), icon: '📍' },
              { key: 'use_qr_code' as const, label: t('config.qrCode'), desc: t('config.qrCodeDesc'), icon: '📷' },
              { key: 'use_camera_photo' as const, label: t('config.camera'), desc: t('config.cameraDesc'), icon: '📸' },
            ].map(({ key, label, desc, icon }) => (
              <div key={key} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-700">{label}</p>
                    <p className="text-xs text-slate-400">{desc}</p>
                  </div>
                </div>
                <Toggle
                  checked={config[key]}
                  onChange={(checked) => setConfig({ ...config, [key]: checked })}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* System Info */}
        <Card>
          <h3 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-500" />
            {t('config.sysInfo')}
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">{t('config.version')}</span>
              <span className="font-mono text-slate-700">1.1.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Firebase</span>
              <Badge variant="info">dpoint-d138c</Badge>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">{t('config.environment')}</span>
              <Badge variant="success">{t('config.production')}</Badge>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">{t('config.mode')}</span>
              <Badge variant="default">{config.mode}</Badge>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="border-red-100 bg-red-50/30">
          <h3 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {t('config.dangerZone')}
          </h3>
          <p className="text-xs text-red-600/70 mb-3">{t('config.dangerDesc')}</p>
          <Button variant="danger" size="sm" onClick={handleClearRecords} disabled={clearing}>
            {clearing ? <Loader2 className="w-4 h-4 animate-spin" /> : t('config.clearRecords')}
          </Button>
        </Card>
      </div>
    </div>
  );
}
