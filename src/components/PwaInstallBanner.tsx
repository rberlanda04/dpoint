import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

export default function PwaInstallBanner() {
  const { isInstallable, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOS, setShowIOS] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('pwa_install_dismissed')) setDismissed(true);
    } catch {}
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try { localStorage.setItem('pwa_install_dismissed', '1'); } catch {}
  };

  if (dismissed || isStandalone()) return null;

  if (isInstallable) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-white border border-emerald-200 rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">Instalar DPoint</p>
          <p className="text-xs text-slate-500">Acesso rápido na tela inicial</p>
        </div>
        <button
          onClick={promptInstall}
          className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-2 rounded-xl cursor-pointer border-0 shrink-0"
        >
          Instalar
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-0 bg-transparent shrink-0"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    );
  }

  if (isIOS() && !showIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 bg-white border border-blue-200 rounded-2xl shadow-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <Share className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800">Instalar DPoint</p>
          <p className="text-xs text-slate-500">Toque em <strong>Compartilhar</strong> e depois <strong>Adicionar à Tela de Início</strong></p>
        </div>
        <button
          onClick={() => setShowIOS(true)}
          className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-xl cursor-pointer border-0 shrink-0"
        >
          Ver
        </button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-0 bg-transparent shrink-0"
        >
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    );
  }

  if (isIOS() && showIOS) {
    return (
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50 bg-white border border-blue-200 rounded-2xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800">Como instalar no iOS</h3>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer border-0 bg-transparent"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <ol className="text-xs text-slate-600 space-y-2 list-decimal list-inside">
          <li>Toque no botão <strong>Compartilhar</strong> (ícone de caixa com seta) na barra inferior do Safari</li>
          <li>Role para baixo e toque em <strong>Adicionar à Tela de Início</strong></li>
          <li>Toque em <strong>Adicionar</strong> no canto superior direito</li>
        </ol>
      </div>
    );
  }

  return null;
}
