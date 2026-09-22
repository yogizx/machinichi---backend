import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Mic, X, Clock, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import { useLocalStorage } from '../../hooks/useLocalStorage';

const trendingSearches = ['Organic Rice', 'Cold Pressed Oil', 'Dry Fruits', 'Wheat Atta', 'Honey'];

function VoiceSearchButton({ onTranscript }) {
  const [isListening, setIsListening] = useState(false);
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const recognitionRef = useRef(null);

  const toggleListening = () => {
    if (!supported) { return; }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      const text = event.results[event.resultIndex][0].transcript;
      onTranscript(text);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    setIsListening(true);
    recognitionRef.current = recognition;
  };

  if (!supported) return null;
  return (
    <button
      onClick={toggleListening}
      className={`mr-2 rounded-full p-1.5 transition ${
        isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600'
      }`}
      aria-label={isListening ? 'Listening...' : 'Voice search'}
    >
      <Mic size={18} />
    </button>
  );
}

export default function SearchBar({ variant = 'default', placeholder = 'Search organic products...', onSearch }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useLocalStorage('recentSearches', []);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setSuggestions([]);
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  const handleSearch = useCallback((searchQuery) => {
    if (!searchQuery?.trim()) return;
    setRecentSearches((prev) => [searchQuery, ...prev.filter((s) => s !== searchQuery)].slice(0, 10));
    if (onSearch) {
      onSearch(searchQuery);
    } else {
      navigate(`/product?search=${encodeURIComponent(searchQuery)}`);
    }
    setIsFocused(false);
    inputRef.current?.blur();
  }, [navigate, onSearch, setRecentSearches]);

  const handleVoiceTranscript = (text) => {
    setQuery(text);
    handleSearch(text);
  };

  const handleKeyDown = (e) => {
    const items = suggestions.length > 0 ? suggestions : [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && items[selectedIndex]) {
        handleSearch(items[selectedIndex].name || items[selectedIndex]);
      } else {
        handleSearch(query);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const removeRecentSearch = (e, search) => {
    e.stopPropagation();
    setRecentSearches((prev) => prev.filter((s) => s !== search));
  };

  const showDropdown = isFocused && (query.length > 0 || recentSearches.length > 0);

  return (
    <div className="relative w-full">
      <div
        className={`relative flex items-center ${
          variant === 'hero'
            ? 'h-14 rounded-2xl bg-white shadow-lg'
            : variant === 'sticky'
            ? 'h-12 rounded-xl bg-gray-100'
            : 'h-11 rounded-lg bg-gray-100'
        }`}
      >
        <Search className="ml-4 h-5 w-5 shrink-0 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="h-full flex-1 bg-transparent px-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          role="combobox"
        />
        {query && (
          <button onClick={clearSearch} className="mr-1 text-gray-400 hover:text-gray-600" aria-label="Clear search">
            <X size={18} />
          </button>
        )}
        <VoiceSearchButton onTranscript={handleVoiceTranscript} />
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-popover">
          {/* Recent Searches */}
          {query.length === 0 && recentSearches.length > 0 && (
            <div className="py-2">
              <p className="flex items-center justify-between px-4 py-1 text-xs font-semibold uppercase text-gray-400">
                <span>Recent Searches</span>
                <button onMouseDown={() => setRecentSearches([])} className="text-brand hover:underline">
                  Clear
                </button>
              </p>
              {recentSearches.map((search) => (
                <button
                  key={search}
                  onMouseDown={() => handleSearch(search)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50"
                >
                  <Clock size={16} className="shrink-0 text-gray-400" />
                  <span className="flex-1">{search}</span>
                  <button onMouseDown={(e) => removeRecentSearch(e, search)} className="text-gray-300 hover:text-gray-500">
                    <X size={14} />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {query.length === 0 && recentSearches.length === 0 && (
            <div className="py-2">
              <p className="flex items-center gap-2 px-4 py-1 text-xs font-semibold uppercase text-gray-400">
                <TrendingUp size={14} />
                <span>Trending Searches</span>
              </p>
              {trendingSearches.map((search) => (
                <button
                  key={search}
                  onMouseDown={() => handleSearch(search)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50"
                >
                  <TrendingUp size={16} className="shrink-0 text-brand" />
                  <span>{search}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
