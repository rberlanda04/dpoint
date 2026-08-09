import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Loader2, MapPin, Clock, AlertTriangle, CheckCircle2, Image } from 'lucide-react';
import { Button, Card, Badge } from '../components/ui';
import { useI18n } from '../i18n';
import { LocalServico } from '../types';

interface AutoCheckinPromptProps {
  isOpen: boolean;
  onClose: () => void;
  local: LocalServico | null;
  eventType: 'enter' | 'exit';
  position: { lat: number; lng: number; accuracy: number };
  selectedFunc: { id_funcionario: string; nome: string } | null;
  onConfirm: (data: { observacao: string; photoUrl: string | null; tipo: 'Check-in' | 'Check-out' }) => void;
  onDismiss: (tipo: 'Check-in' | 'Check-out') => void;
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

export default function AutoCheckinPrompt({
  isOpen,
  onClose,
  local,
  eventType,
  position,
  selectedFunc,
  onConfirm,
  onDismiss,
}: AutoCheckinPromptProps) {
  const { t } = useI18n();
  const [observacao, setObservacao] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tipo = eventType === 'enter' ? 'Check-in' : 'Check-out';
  const tipoLabel = eventType === 'enter' ? 'entrada' : 'saída';

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen || !local) return null;

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Foto muito grande. Máximo 10MB.');
        return;
      }
      const compressed = await compressImage(file, 800, 0.6);
      setPhotoUrl(compressed);
    }
  };

  const handleSubmit = (customTipo?: 'Check-in' | 'Check-out') => {
    setSubmitting(true);
    onConfirm({
      observacao,
      photoUrl,
      tipo: customTipo || tipo,
    });
  };

  const handleDismiss = () => {
    onDismiss(tipo);
    onClose();
  };

  const getIconForType = () => {
    if (eventType === 'enter') {
      return <CheckCircle2 className="w-8 h-8 text-emerald-500" />;
    }
    return <Clock className="w-8 h-8 text-slate-500" />;
  };

  const getGradientForType = () => {
    if (eventType === 'enter') return 'from-emerald-500 to-emerald-600';
    return 'from-slate-500 to-slate-600';
  };

  const handlePhotoInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Foto muito grande. Máximo 10MB.');
        return;
      }
      const compressed = await compressImage(file, 800, 0.6);
      setPhotoUrl(compressed);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full animate-slideUp overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${getGradientForType()} px-6 py-5 relative`}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              {getIconForType()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {eventType === 'enter' ? t('autoCheckin.enterTitle') : t('autoCheckin.exitTitle')}
              </h2>
              <p className="text-white/90 text-sm">
                {local.nome_empresa} • {tipoLabel} automática detectada
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Local info */}
          <Card className="bg-slate-50 border-slate-200">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{local.nome_empresa}</p>
                <p className="text-xs text-slate-500">{local.cidade}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="bg-white px-2 py-0.5 rounded">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</span>
              <span className="text-slate-300">|</span>
              <span className="bg-white px-2 py-0.5 rounded">±{Math.round(position.accuracy)}m</span>
              <span className="text-slate-300">|</span>
              <span className="bg-white px-2 py-0.5 rounded">{local.raio_auto_checkin}m</span>
            </div>
          </Card>

          {/* Funcionário */}
          {selectedFunc && (
            <Card className="bg-indigo-50 border-indigo-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-indigo-700">
                    {selectedFunc.nome.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{selectedFunc.nome}</p>
                  <p className="text-xs text-slate-500">{t('autoCheckin.funcionarioDetected')}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Tipo de ponto */}
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${eventType === 'enter' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                {eventType === 'enter' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <Clock className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('autoCheckin.suggestedType')}
                </p>
                <p className="text-lg font-bold text-slate-800">{tipo}</p>
              </div>
            </div>
          </div>

          {/* Foto */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">{t('autoCheckin.photo')}</label>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoInput} className="hidden" ref={fileInputRef} />
            {photoUrl ? (
              <div className="relative">
                <img src={photoUrl} alt="Evidência" className="w-full h-40 object-cover rounded-xl border border-slate-200" />
                <button onClick={() => setPhotoUrl(null)} className="absolute top-2 right-2 bg-black/50 text-white px-3 py-1 text-xs rounded-lg">
                  {t('checkin.remove')}
                </button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-300 hover:bg-indigo-50/30 transition-colors">
                <Camera className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-600">{t('autoCheckin.addPhoto')}</p>
              </button>
            )}
          </div>

          {/* Observação */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">{t('checkin.observation')}</label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder={t('autoCheckin.obsPlaceholder')}
              rows={2}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              className="w-full"
              size="lg"
              onClick={() => handleSubmit()}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : t('autoCheckin.registerNow')}
            </Button>

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={handleDismiss}>
                {t('autoCheckin.skip')}
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => handleSubmit(eventType === 'enter' ? 'Check-out' : 'Check-in')}>
                {eventType === 'enter' ? 'Registrar Check-out' : 'Registrar Check-in'}
              </Button>
            </div>

            <p className="text-center text-[10px] text-slate-500">
              {t('autoCheckin.autoFallbackNote')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}