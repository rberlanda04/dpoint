import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Loader2, MapPin, Clock, AlertTriangle, CheckCircle2, PlayCircle, PauseCircle } from 'lucide-react';
import { Button, Card } from '../ui';
import { useI18n } from '../../i18n';
import { ObraPessoal } from '../../types';

interface WorkerAutoCheckinOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  obra: ObraPessoal | null;
  eventType: 'enter' | 'exit';
  position: { lat: number; lng: number; accuracy: number };
  workerName: string;
  onConfirm: (data: { observacao: string; photoUrl: string | null; tipo: 'inicio' | 'fim' }) => void;
  onDismiss: () => void;
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

export default function WorkerAutoCheckinOverlay({
  isOpen,
  onClose,
  obra,
  eventType,
  position,
  workerName,
  onConfirm,
  onDismiss,
}: WorkerAutoCheckinOverlayProps) {
  const { t } = useI18n();
  const [observacao, setObservacao] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCheckout = eventType === 'exit';
  const tipoSessao = isCheckout ? 'fim' : 'inicio';
  const canDismiss = !isCheckout;
  const canSubmit = !!photoUrl && observacao.trim().length > 0;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setObservacao('');
      setPhotoUrl(null);
    }
  }, [isOpen]);

  if (!isOpen || !obra) return null;

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

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitting(true);
    onConfirm({
      observacao,
      photoUrl,
      tipo: tipoSessao,
    });
  };

  const handleDismiss = () => {
    if (!canDismiss) return;
    onDismiss();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full animate-slideUp overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${isCheckout ? 'from-amber-500 to-orange-500' : 'from-emerald-500 to-teal-500'} px-6 py-5 relative`}>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              {isCheckout ? (
                <PauseCircle className="w-8 h-8 text-white" />
              ) : (
                <PlayCircle className="w-8 h-8 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {isCheckout ? t('autoCheckin.exitTitle') : t('autoCheckin.enterTitle')}
              </h2>
              <p className="text-white/90 text-sm">
                {obra.nome} • {isCheckout ? 'saída' : 'entrada'} automática detectada
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Mandatory warning for checkout */}
          {isCheckout && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 font-medium">
                {t('autoCheckin.exitWarning')}
              </p>
            </div>
          )}

          {/* Local info */}
          <Card className="bg-slate-50 border-slate-200">
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-sm font-semibold text-slate-800">{obra.nome}</p>
                <p className="text-xs text-slate-500">{obra.endereco}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <span className="bg-white px-2 py-0.5 rounded">{position.lat.toFixed(6)}, {position.lng.toFixed(6)}</span>
              <span className="text-slate-300">|</span>
              <span className="bg-white px-2 py-0.5 rounded">±{Math.round(position.accuracy)}m</span>
              <span className="text-slate-300">|</span>
              <span className="bg-white px-2 py-0.5 rounded">{obra.raio_metros}m</span>
            </div>
          </Card>

          {/* Worker info */}
          <Card className="bg-indigo-50 border-indigo-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-bold text-indigo-700">
                  {workerName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{workerName}</p>
                <p className="text-xs text-slate-500">{t('autoCheckin.funcionarioDetected')}</p>
              </div>
            </div>
          </Card>

          {/* Tipo de ponto */}
          <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
            <div className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isCheckout ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                {isCheckout ? (
                  <PauseCircle className="w-5 h-5 text-amber-600" />
                ) : (
                  <PlayCircle className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('autoCheckin.suggestedType')}
                </p>
                <p className="text-lg font-bold text-slate-800">{isCheckout ? 'Saída' : 'Entrada'}</p>
              </div>
            </div>
          </div>

          {/* Foto - OBRIGATÓRIA */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-2 block">
              {t('autoCheckin.photo')} <span className="text-red-500">*</span>
            </label>
            <input type="file" accept="image/*" capture="environment" onChange={handlePhoto} className="hidden" ref={fileInputRef} />
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
                <p className="text-[10px] text-red-500 mt-1">Obrigatório para validação de saída</p>
              </button>
            )}
          </div>

          {/* Observação - OBRIGATÓRIA */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">
              {t('checkin.observation')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva o que foi feito durante o período..."
              rows={2}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button
              className="w-full"
              size="lg"
              onClick={handleSubmit}
              disabled={submitting || !canSubmit}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isCheckout ? t('autoCheckin.confirmExit') : t('autoCheckin.confirmEntry')}
            </Button>

            {canDismiss && (
              <Button variant="secondary" className="w-full" onClick={handleDismiss}>
                {t('autoCheckin.skip')}
              </Button>
            )}

            {!canSubmit && (
              <p className="text-center text-[10px] text-amber-600 font-medium">
                Foto e observação são obrigatórias para validação de saída.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
