import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapPin, QrCode, Camera, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, ScanLine, LogOut } from 'lucide-react';
import { Button, Card, Badge, EmptyState } from '../components/ui';
import QRCodeScanner from '../components/QRCodeScanner';
import LanguageSwitcher from '../components/LanguageSwitcher';
import Logo from '../components/Logo';
import { dataService } from '../utils/gasClient';
import { uploadPhotoEvidence } from '../utils/storage';
import { generateId } from '../utils/crypto';
import { isWithinRadius } from '../utils/geo';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { Funcionario, LocalServico, RegistroPonto, SystemConfig } from '../types';

type Step = 'scan' | 'location' | 'photo' | 'confirm' | 'success';

interface GeoPosition {
  lat: number;
  lng: number;
  accuracy: number;
}

function compressImage(file: File, maxWidth = 800, quality = 0.6): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(reader.result as string);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function CheckInPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, userRole, logout } = useAuth();
  const [step, setStep] = useState<Step>('scan');
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [locais, setLocais] = useState<LocalServico[]>([]);
  const [registros, setRegistros] = useState<RegistroPonto[]>([]);
  const [selectedFunc, setSelectedFunc] = useState<Funcionario | null>(null);
  const [selectedLocal, setSelectedLocal] = useState<LocalServico | null>(null);
  const [geoPosition, setGeoPosition] = useState<GeoPosition | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [locationError, setLocationError] = useState('');
  const [tipo, setTipo] = useState<'Check-in' | 'Check-out'>('Check-in');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [observacao, setObservacao] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrScan, setQrScan] = useState('');
  const [searchLocal, setSearchLocal] = useState('');
  const [searchFunc, setSearchFunc] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({ mode: 'firebase' });
  const [pairWarning, setPairWarning] = useState('');

  useEffect(() => {
    Promise.all([
      dataService.loadAllData(),
      dataService.loadConfig(),
    ]).then(([db, cfg]) => {
      setFuncionarios(db.funcionarios.filter((f: any) => f.status === 'Ativo'));
      setLocais(db.locais);
      setRegistros(db.registros);
      setConfig(cfg);
      setLoading(false);

      // Auto-detect logged-in employee if user is authenticated
      if (user?.email) {
        const loggedFunc = db.funcionarios.find((f: any) => f.email === user.email);
        if (loggedFunc) {
          setSelectedFunc(loggedFunc);
          
          // Helper is defined later, so we find the last record manually here
          const todayStr = new Date().toISOString().split('T')[0];
          const funcRecords = db.registros
            .filter((r: any) => r.data_hora && r.id_funcionario === loggedFunc.id_funcionario && r.data_hora.startsWith(todayStr))
            .sort((a: any, b: any) => a.data_hora.localeCompare(b.data_hora));
            
          if (funcRecords.length > 0) {
            const last = funcRecords[funcRecords.length - 1];
            setTipo(last.tipo === 'Check-in' ? 'Check-out' : 'Check-in');
          } else {
            setTipo('Check-in');
          }
        }
      }

      const localParam = searchParams.get('local');
      const latParam = searchParams.get('lat');
      const lngParam = searchParams.get('lng');
      const raioParam = searchParams.get('raio');
      if (localParam) {
        const found = db.locais.find((l: LocalServico) => l.id_local === localParam.toUpperCase());
        if (found) {
          setSelectedLocal(found);
          setStep('location');
        } else if (latParam && lngParam) {
          const tempLocal: LocalServico = {
            id_local: localParam.toUpperCase(),
            nome_empresa: localParam.toUpperCase(),
            cidade: '',
            latitude: parseFloat(latParam),
            longitude: parseFloat(lngParam),
            raio_metros: raioParam ? parseInt(raioParam) : 100,
          };
          setSelectedLocal(tempLocal);
          setStep('location');
        }
      }
    });

    handleGetLocation();
  }, [user]);

  const handleGetLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      setLocationError(t('checkin.geoNotSupported'));
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoPosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setLocationStatus('success');
      },
      (err) => {
        setLocationStatus('error');
        setLocationError(err.message);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [t]);

  const handleQrScan = () => {
    if (!qrScan.trim()) return;
    const input = qrScan.trim();
    let localId = input;
    let latParam = '';
    let lngParam = '';

    // Aceita URL completa do QR Code além do ID puro
    try {
      const url = new URL(input);
      localId = url.searchParams.get('local') || input;
      latParam = url.searchParams.get('lat') || '';
      lngParam = url.searchParams.get('lng') || '';
    } catch {
      const match = input.match(/[A-Z]{2,3}-\d+/i);
      if (match) localId = match[0];
    }

    const local = locais.find(l => l.id_local === localId.toUpperCase());
    if (local) {
      setSelectedLocal(local);
      setStep('location');
    } else if (latParam && lngParam) {
      setSelectedLocal({
        id_local: localId.toUpperCase(),
        nome_empresa: localId.toUpperCase(),
        cidade: '',
        latitude: parseFloat(latParam),
        longitude: parseFloat(lngParam),
        raio_metros: 100,
      });
      setStep('location');
    } else {
      alert(t('checkin.siteNotFound'));
    }
  };

  const handleCameraScan = (data: string) => {
    setShowScanner(false);
    let localId = '';
    let latParam = '';
    let lngParam = '';

    try {
      const url = new URL(data);
      localId = url.searchParams.get('local') || '';
      latParam = url.searchParams.get('lat') || '';
      lngParam = url.searchParams.get('lng') || '';
    } catch {
      localId = data.trim();
    }

    if (!localId) {
      const match = data.match(/[A-Z]{2,3}-\d+/i);
      if (match) localId = match[0].toUpperCase();
    }

    if (localId) {
      const local = locais.find(l => l.id_local === localId.toUpperCase());
      if (local) {
        setSelectedLocal(local);
        setStep('location');
        return;
      }
      // Fallback: local não cadastrado, mas o QR traz as coordenadas
      if (latParam && lngParam) {
        setSelectedLocal({
          id_local: localId.toUpperCase(),
          nome_empresa: localId.toUpperCase(),
          cidade: '',
          latitude: parseFloat(latParam),
          longitude: parseFloat(lngParam),
          raio_metros: 100,
        });
        setStep('location');
        return;
      }
    }

    alert(`${t('checkin.invalidQr')}\n${data}`);
  };

  const checkPairing = (funcId: string, tipoRegistro: 'Check-in' | 'Check-out'): string => {
    const today = new Date().toLocaleDateString('pt-BR');
    const todayRecords = registros.filter(r => {
      const recordDate = new Date(r.data_hora).toLocaleDateString('pt-BR');
      return r.id_funcionario === funcId && recordDate === today;
    });

    const lastRecord = todayRecords.sort((a, b) =>
      new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
    )[0];

    if (tipoRegistro === 'Check-in' && lastRecord?.tipo === 'Check-in') {
      return t('checkin.warnDoubleIn');
    }
    if (tipoRegistro === 'Check-out' && lastRecord?.tipo === 'Check-out') {
      return t('checkin.warnDoubleOut');
    }
    return '';
  };

  const getSuggestedTipo = (funcId: string): 'Check-in' | 'Check-out' => {
    const today = new Date().toLocaleDateString('pt-BR');
    const todayRecords = registros.filter(r => {
      const recordDate = new Date(r.data_hora).toLocaleDateString('pt-BR');
      return r.id_funcionario === funcId && recordDate === today;
    });

    const lastRecord = todayRecords.sort((a, b) =>
      new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()
    )[0];

    // Se último registro foi Check-in, sugerir Check-out e vice-versa
    if (!lastRecord) return 'Check-in';
    return lastRecord.tipo === 'Check-in' ? 'Check-out' : 'Check-in';
  };

  const isWithinGeofence = (): boolean => {
    if (!geoPosition || !selectedLocal) return false;
    return isWithinRadius(
      geoPosition.lat,
      geoPosition.lng,
      selectedLocal.latitude,
      selectedLocal.longitude,
      selectedLocal.raio_metros,
      geoPosition.accuracy
    );
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert(t('checkin.photoTooBig'));
        return;
      }
      const compressed = await compressImage(file, 800, 0.6);
      setPhotoUrl(compressed);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFunc || !selectedLocal || !geoPosition) return;
    setSubmitting(true);
    setSubmitError('');

    try {
      const idRegistro = generateId('REG');

      // Upload da foto para o Firebase Storage (fallback: data URL)
      let fotoFinal: string | undefined;
      if (photoUrl) {
        fotoFinal = await uploadPhotoEvidence(photoUrl, idRegistro);
      }

      const registro: RegistroPonto = {
        id_registro: idRegistro,
        id_funcionario: selectedFunc.id_funcionario,
        id_local: selectedLocal.id_local,
        empresa_id: selectedLocal.empresa_id || selectedFunc.empresa_id || '',
        tipo,
        data_hora: new Date().toISOString(),
        latitude_registro: geoPosition.lat,
        longitude_registro: geoPosition.lng,
        precisao_gps: Math.round(geoPosition.accuracy),
        observacao,
        nome_funcionario: selectedFunc.nome,
        nome_local: selectedLocal.nome_empresa,
        dentro_geofence: isWithinGeofence(),
        tipo_verificacao: geoPosition ? 'GPS' : 'Nenhum',
        foto_url: fotoFinal,
      };

      await dataService.registrarPonto(registro);
      setRegistros(prev => [registro, ...prev]);
      setStep('success');
    } catch (error) {
      console.error('Falha ao registrar ponto:', error);
      setSubmitError(t('checkin.saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep('scan');
    setSelectedFunc(null);
    setSelectedLocal(null);
    setPhotoUrl(null);
    setObservacao('');
    setQrScan('');
    setPairWarning('');
    setSubmitError('');
    setTipo('Check-in');
  };

  const filteredLocais = locais.filter(l =>
    l.nome_empresa.toLowerCase().includes(searchLocal.toLowerCase()) ||
    l.id_local.toLowerCase().includes(searchLocal.toLowerCase())
  );

  const filteredFuncs = funcionarios.filter(f =>
    f.nome.toLowerCase().includes(searchFunc.toLowerCase()) ||
    f.id_funcionario.includes(searchFunc)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {showScanner && (
        <QRCodeScanner onScan={handleCameraScan} onClose={() => setShowScanner(false)} />
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Logo iconSize="xs" />
          <div>
            <h1 className="text-sm font-bold text-slate-800">{t('checkin.title')}</h1>
            <p className="text-[10px] text-slate-400">{t('checkin.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {locationStatus === 'success' && (
            <Badge variant="success" className="text-[10px]">{t('checkin.gpsOk')}</Badge>
          )}
          {locationStatus === 'error' && (
            <button onClick={handleGetLocation} className="text-[10px] text-red-500 cursor-pointer border-0 bg-transparent">
              {t('common.tryAgain')}
            </button>
          )}
          <LanguageSwitcher />
          {user && (
            <button
              onClick={async () => { await logout(); navigate('/login'); }}
              className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-all cursor-pointer border-0 bg-transparent"
              title={t('common.logout')}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-4 py-3 flex items-center gap-2">
        {(['scan', 'location', config.use_camera_photo ? 'photo' : null, 'confirm'].filter(Boolean) as Step[]).map((s, i, arr) => {
          const idx = arr.indexOf(s);
          const currentIdx = arr.indexOf(step);
          const done = idx < currentIdx;
          const current = idx === currentIdx;
          return (
            <React.Fragment key={s}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? 'bg-emerald-500 text-white' :
                current ? 'bg-brand-gradient text-white ring-4 ring-indigo-500/20' :
                'bg-slate-100 text-slate-400'
              }`}>
                {done ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
              </div>
              {i < arr.length - 1 && <div className={`flex-1 h-0.5 rounded ${done || current ? 'bg-indigo-300' : 'bg-slate-200'}`} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Content */}
      <div className="px-4 pb-24">
        {/* Step: Select Location */}
        {step === 'scan' && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-800">{t('checkin.selectSite')}</h2>

            {/* QR Code Actions */}
            <Card>
              <div className="space-y-3">
                {config.use_qr_code !== false && (
                  <button
                    onClick={() => setShowScanner(true)}
                    className="w-full flex items-center justify-center gap-2 bg-brand-gradient text-white rounded-xl py-3 text-sm font-semibold hover:opacity-90 transition-all cursor-pointer border-0 shadow-md shadow-indigo-600/20"
                  >
                    <ScanLine className="w-5 h-5" />
                    {t('checkin.scanQr')}
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder={t('checkin.orTypeId')}
                    value={qrScan}
                    onChange={(e) => setQrScan(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleQrScan()}
                    className="flex-1 bg-transparent text-sm focus:outline-none"
                  />
                  <Button size="sm" onClick={handleQrScan} disabled={!qrScan.trim()}>
                    OK
                  </Button>
                </div>
              </div>
            </Card>

            <p className="text-xs text-slate-400 text-center">{t('checkin.orSelectManual')}</p>

            <input
              type="text"
              placeholder={t('checkin.searchSite')}
              value={searchLocal}
              onChange={(e) => setSearchLocal(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />

            <div className="space-y-2">
              {filteredLocais.map(local => (
                <button
                  key={local.id_local}
                  onClick={() => { setSelectedLocal(local); setStep('location'); }}
                  className="w-full text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer"
                >
                  <p className="text-sm font-semibold text-slate-800">{local.nome_empresa}</p>
                  <p className="text-xs text-slate-400">{local.cidade} · {local.id_local}</p>
                </button>
              ))}
              {filteredLocais.length === 0 && (
                <EmptyState icon={<MapPin className="w-6 h-6" />} title={t('checkin.noSiteFound')} description={t('checkin.noSiteDesc')} />
              )}
            </div>
          </div>
        )}

        {/* Step: Location + Employee */}
        {step === 'location' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => setStep('scan')} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer border-0 bg-transparent">
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                </button>
                <h2 className="text-base font-bold text-slate-800">{t('checkin.confirmLocation')}</h2>
              </div>
              <button onClick={() => setStep('scan')} className="text-xs text-indigo-600 cursor-pointer border-0 bg-transparent">{t('checkin.changeSite')}</button>
            </div>

            <Card className="border-indigo-200 bg-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-gradient flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">{selectedLocal?.nome_empresa}</p>
                  <p className="text-xs text-slate-400">{selectedLocal?.cidade} · {t('checkin.radius')} {selectedLocal?.raio_metros}m</p>
                </div>
              </div>
            </Card>

            {/* Location Status */}
            <Card>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {locationStatus === 'loading' && <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />}
                  {locationStatus === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  {locationStatus === 'error' && <AlertTriangle className="w-4 h-4 text-red-500" />}
                  <span className="text-sm text-slate-600">
                    {locationStatus === 'loading' && t('checkin.gettingLocation')}
                    {locationStatus === 'success' && `${t('checkin.accuracy')}: ${geoPosition ? Math.round(geoPosition.accuracy) : '?'}m`}
                    {locationStatus === 'error' && locationError}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleGetLocation}>
                  {t('checkin.update')}
                </Button>
              </div>
              {geoPosition && selectedLocal && (
                <div className={`mt-2 p-2 rounded-lg text-xs font-medium text-center ${
                  isWithinGeofence() ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {isWithinGeofence() ? t('checkin.insideFence') : t('checkin.outsideFence')}
                </div>
              )}
            </Card>

            {/* Employee Select */}
            <h3 className="text-sm font-semibold text-slate-700 mt-4">{t('checkin.whoRegistering')}</h3>
            
            {userRole === 'funcionario' && selectedFunc ? (
              <div className="mt-2 p-3 rounded-xl border border-indigo-500 bg-indigo-50 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-sm font-bold text-indigo-900">{selectedFunc.nome}</p>
                  <p className="text-xs text-indigo-600/80">{selectedFunc.cargo} · {t('checkin.mat')} {selectedFunc.id_funcionario}</p>
                </div>
                <Badge variant="success">Seu Perfil</Badge>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder={t('checkin.searchEmployee')}
                  value={searchFunc}
                  onChange={(e) => setSearchFunc(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mt-2"
                />
                <div className="space-y-2 max-h-60 overflow-y-auto mt-2">
                  {filteredFuncs.map(func => (
                    <button
                      key={func.id_funcionario}
                      onClick={() => {
                        setSelectedFunc(func);
                        // Auto-suggest Check-in/Check-out based on last record
                        const suggested = getSuggestedTipo(func.id_funcionario);
                        setTipo(suggested);
                        const warning = checkPairing(func.id_funcionario, suggested);
                        setPairWarning(warning);
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                        selectedFunc?.id_funcionario === func.id_funcionario
                          ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-800">{func.nome}</p>
                      <p className="text-xs text-slate-400">{func.cargo} · {t('checkin.mat')} {func.id_funcionario}</p>
                    </button>
                  ))}
                  {filteredFuncs.length === 0 && (
                    <EmptyState icon={<MapPin className="w-6 h-6" />} title={t('checkin.noEmployeeFound')} description={t('checkin.noEmployeeDesc')} />
                  )}
                </div>
              </>
            )}

            {/* Type Toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1 mt-4">
              <button
                onClick={() => { setTipo('Check-in'); if (selectedFunc) setPairWarning(checkPairing(selectedFunc.id_funcionario, 'Check-in')); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer border-0 ${
                  tipo === 'Check-in' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-transparent text-slate-500'
                }`}
              >
                Check-in
              </button>
              <button
                onClick={() => { setTipo('Check-out'); if (selectedFunc) setPairWarning(checkPairing(selectedFunc.id_funcionario, 'Check-out')); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer border-0 ${
                  tipo === 'Check-out' ? 'bg-slate-600 text-white shadow-sm' : 'bg-transparent text-slate-500'
                }`}
              >
                Check-out
              </button>
            </div>

            {pairWarning && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-xs text-amber-700 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {pairWarning}
              </div>
            )}

            <Button
              className="w-full mt-4"
              size="lg"
              onClick={() => {
                if (config.use_camera_photo === false) {
                  setStep('confirm');
                } else {
                  setStep('photo');
                }
              }}
              disabled={!selectedFunc || !selectedLocal}
            >
              {t('common.continue')}
            </Button>
          </div>
        )}

        {/* Step: Photo */}
        {step === 'photo' && config.use_camera_photo !== false && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep('location')} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer border-0 bg-transparent">
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
              <h2 className="text-base font-bold text-slate-800">{t('checkin.photoOptional')}</h2>
            </div>
            <p className="text-sm text-slate-500">{t('checkin.photoDesc')}</p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
              className="hidden"
            />

            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="Evidência" className="w-full h-48 object-cover rounded-xl border border-slate-200" />
                <button
                  onClick={() => setPhotoUrl(null)}
                  className="absolute top-2 right-2 bg-black/50 text-white px-3 py-2 text-xs rounded-lg cursor-pointer border-0"
                >
                  {t('checkin.remove')}
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-all cursor-pointer bg-transparent"
              >
                <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">{t('checkin.takePhoto')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('checkin.photoCompressed')}</p>
              </button>
            )}

            <div className="flex gap-2 mt-6">
              <Button variant="secondary" className="flex-1" onClick={() => setStep('location')}>{t('common.back')}</Button>
              <Button className="flex-1" onClick={() => setStep('confirm')}>{t('common.continue')}</Button>
            </div>
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep(config.use_camera_photo !== false ? 'photo' : 'location')} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer border-0 bg-transparent">
                <ArrowLeft className="w-4 h-4 text-slate-600" />
              </button>
              <h2 className="text-base font-bold text-slate-800">{t('checkin.confirmTitle')}</h2>
            </div>

            {submitError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {submitError}
              </div>
            )}

            <Card>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('checkin.type')}</span>
                  <Badge variant={tipo === 'Check-in' ? 'success' : 'default'}>{tipo}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('checkin.employee')}</span>
                  <span className="font-medium text-slate-700">{selectedFunc?.nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('checkin.site')}</span>
                  <span className="font-medium text-slate-700">{selectedLocal?.nome_empresa}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('checkin.dateTime')}</span>
                  <span className="font-medium text-slate-700 font-mono text-xs">
                    {new Date().toLocaleString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">GPS</span>
                  <span className="font-medium text-slate-700 font-mono text-xs">
                    {geoPosition ? `${geoPosition.lat.toFixed(6)}, ${geoPosition.lng.toFixed(6)}` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">{t('checkin.geofence')}</span>
                  <Badge variant={isWithinGeofence() ? 'success' : 'warning'}>
                    {isWithinGeofence() ? t('checkin.inside') : t('checkin.outside')}
                  </Badge>
                </div>
                {photoUrl && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">{t('checkin.photo')}</span>
                    <Badge variant="info">{t('checkin.attached')}</Badge>
                  </div>
                )}
              </div>
            </Card>

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">{t('checkin.observation')}</label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder={t('checkin.obsPlaceholder')}
                rows={2}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(config.use_camera_photo !== false ? 'photo' : 'location')} disabled={submitting}>{t('common.back')}</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting || locationStatus !== 'success'}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('checkin.confirmRecord')}
              </Button>
            </div>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center animate-pulseGlow">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{tipo} {t('checkin.registered')}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {selectedFunc?.nome} · {selectedLocal?.nome_empresa}
              </p>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {new Date().toLocaleString('pt-BR')}
              </p>
              {!isWithinGeofence() && (
                <p className="text-xs text-amber-600 mt-2">{t('checkin.outsideNote')}</p>
              )}
            </div>
            <Button onClick={handleReset} className="mt-4">{t('checkin.newRecord')}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
