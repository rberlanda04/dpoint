import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import jsQR from 'jsqr';
import { useI18n } from '../i18n';

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

export default function QRCodeScanner({ onScan, onClose }: QRCodeScannerProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'error'>('initializing');
  const [errorMsg, setErrorMsg] = useState('');

  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });

        if (!mounted) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setStatus('scanning');
        scanFrame();
      } catch (err: any) {
        if (mounted) {
          setStatus('error');
          setErrorMsg(err.name === 'NotAllowedError'
            ? t('scanner.notAllowed')
            : err.name === 'NotFoundError'
            ? t('scanner.notFound')
            : t('scanner.error'));
        }
      }
    };

    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current || !mounted) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          onScan(code.data);
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    startCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [onScan, stopCamera]);

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-white" />
          <span className="text-sm font-semibold text-white">{t('scanner.title')}</span>
        </div>
        <button
          onClick={() => { stopCamera(); onClose(); }}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer border-0"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Scan Overlay */}
        {status === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-64 relative">
              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-white rounded-br-lg" />
              {/* Scan line animation */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-indigo-400 to-transparent animate-scan" />
            </div>
            <p className="absolute bottom-8 left-0 right-0 text-center text-sm text-white/80">
              {t('scanner.hint')}
            </p>
          </div>
        )}

        {status === 'initializing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
            <Loader2 className="w-10 h-10 text-white animate-spin mb-3" />
            <p className="text-sm text-white">{t('scanner.starting')}</p>
          </div>
        )}

        {status === 'error' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-8">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
              <Camera className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-sm text-white text-center mb-4">{errorMsg}</p>
            <button
              onClick={() => { stopCamera(); onClose(); }}
              className="px-6 py-2.5 bg-white/10 text-white rounded-xl text-sm font-semibold hover:bg-white/20 cursor-pointer border-0"
            >
              {t('common.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
