import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

// DADATA API KEY (Normally stored in .env)
// NOTE: You need a FREE API Key from dadata.ru to use this feature fully.
// If not provided, it falls back to a normal input.
const DADATA_API_KEY: string = "3239a2d6776999335f6ce22a6320076a44c9b90c"; // Replace this if you have your own key

interface Suggestion {
  value: string;
  unrestricted_value: string;
  data: {
    city: string;
    postal_code: string;
    // other fields available
  };
}

interface AddressInputProps {
  value: string;
  onChange: (value: string, city?: string) => void;
  className?: string;
  placeholder?: string;
  name?: string;
  required?: boolean;
}

const AddressInput: React.FC<AddressInputProps> = ({ 
  value, 
  onChange, 
  className, 
  placeholder = "АДРЕС",
  name,
  required
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 3) {
        setSuggestions([]);
        return;
    }
    
    // If no API key configured, skip
    if (!DADATA_API_KEY || DADATA_API_KEY === 'YOUR_DADATA_API_KEY') return;

    setLoading(true);
    try {
      const response = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address", {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": "Token " + DADATA_API_KEY
        },
        body: JSON.stringify({ query: query, count: 5 })
      });
      
      const result = await response.json();
      setSuggestions(result.suggestions || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error("DaData Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val); // Propagate change immediately
    
    // Debounce fetch
    const timeoutId = setTimeout(() => fetchSuggestions(val), 500);
    return () => clearTimeout(timeoutId);
  };

  const handleSelect = (suggestion: Suggestion) => {
    // Send full address string and city to parent
    onChange(suggestion.value, suggestion.data.city); 
    setShowSuggestions(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input 
            type="text"
            name={name}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            required={required}
            autoComplete="off"
            className={`${className} pr-10`} // Make room for icon
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
            {loading ? <Loader2 className="animate-spin" size={16}/> : <MapPin size={16}/>}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-black shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((s, idx) => (
            <div 
              key={idx}
              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-zinc-100 last:border-0 text-sm font-mono flex flex-col"
              onClick={() => handleSelect(s)}
            >
              <span className="font-bold text-black">{s.value}</span>
              {s.data.city && <span className="text-[10px] text-zinc-500">{s.data.city}</span>}
            </div>
          ))}
          <div className="p-1 bg-zinc-50 text-[9px] text-center text-zinc-400 font-mono">
            POWERED BY DADATA
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressInput;