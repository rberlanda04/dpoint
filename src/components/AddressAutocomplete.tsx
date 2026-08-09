import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, MapPin, X, Loader2, Check, Crosshair } from 'lucide-react';
import { useI18n } from '../i18n';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

interface AddressSuggestion {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
  boundingbox?: string[];
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    country?: string;
    road?: string;
    house_number?: string;
    neighbourhood?: string;
    suburb?: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (data: { lat: number; lng: number; address: string; city: string; boundingbox?: string[] }) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  }) as T;
}

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  onSelect, 
  placeholder = 'Buscar endereço...', 
  className = '',
  disabled = false 
}: AddressAutocompleteProps) {
  const { t } = useI18n();
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const searchAddress = useCallback(
    debounce(async (q: string) => {
      if (!q.trim() || q.length < 3) {
        setSuggestions([]);
        return;
      }
      setLoading(true);
      try {
        const resp = await fetch(
          `${NOMINATIM_BASE}/search?format=json&q=${encodeURIComponent(q)}&limit=8&addressdetails=1&countrycodes=br`
        );
        const data = await resp.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250),
    []
  );

  useEffect(() => {
    searchAddress(value);
    if (value.trim()) setShowDropdown(true);
  }, [value, searchAddress]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setSelectedIndex(-1);
    }
  };

  const handleSelect = (suggestion: AddressSuggestion) => {
    const lat = parseFloat(suggestion.lat);
    const lng = parseFloat(suggestion.lon);
    const address = suggestion.display_name;
    const city = suggestion.address?.city || 
                 suggestion.address?.town || 
                 suggestion.address?.village || 
                 suggestion.address?.municipality || 
                 suggestion.address?.suburb || 
                 suggestion.address?.neighbourhood || 
                 '';
    onSelect({ lat, lng, address, city, boundingbox: suggestion.boundingbox });
    onChange(address);
    setShowDropdown(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setSelectedIndex(-1);
  };

  const handleFocus = () => {
    if (value.trim().length >= 3) setShowDropdown(true);
  };

  const handleClear = () => {
    onChange('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert('Geolocalização não suportada pelo navegador.');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const resp = await fetch(
            `${NOMINATIM_BASE}/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&countrycodes=br`
          );
          const data = await resp.json();
          const address = data.display_name || '';
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.municipality || data.address?.suburb || data.address?.neighbourhood || '';
          onSelect({ lat, lng, address, city, boundingbox: data.boundingbox });
          onChange(address);
        } catch {
          onSelect({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, city: '' });
          onChange(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        alert('Não foi possível obter sua localização: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const extractCity = (addr: AddressSuggestion): string => {
    return addr.address?.city || 
           addr.address?.town || 
           addr.address?.village || 
           addr.address?.municipality || 
           addr.address?.suburb || 
           addr.address?.neighbourhood || 
           '';
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200 disabled:bg-slate-50"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer border-0 bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <button
          type="button"
          onClick={handleGeolocate}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 cursor-pointer border-0 bg-transparent"
          title="Usar minha localização"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        {loading && (
          <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 animate-spin" />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-96 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.place_id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                index === selectedIndex
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${index === selectedIndex ? 'text-indigo-500' : 'text-slate-400'}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{suggestion.display_name}</p>
                  {extractCity(suggestion) && (
                    <p className="text-[10px] text-slate-500 truncate">
                      {extractCity(suggestion)}
                    </p>
                  )}
                </div>
                {index === selectedIndex && (
                  <Check className="w-4 h-4 text-indigo-500 shrink-0" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && suggestions.length === 0 && value.length >= 3 && !loading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-center">
          <p className="text-sm text-slate-500">Nenhum endereço encontrado para "{value}"</p>
        </div>
      )}
    </div>
  );
}