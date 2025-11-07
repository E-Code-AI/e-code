import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Mic, Clock, TrendingUp, Filter, Command } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SearchCategory {
  name: string;
  icon: React.ElementType;
  value: string;
}

const categories: SearchCategory[] = [
  { name: "All", icon: Search, value: "all" },
  { name: "Projects", icon: Command, value: "projects" },
  { name: "Templates", icon: TrendingUp, value: "templates" },
  { name: "Users", icon: Filter, value: "users" },
];

interface RecentSearch {
  query: string;
  category: string;
  timestamp: number;
}

interface SearchSuggestion {
  text: string;
  category: string;
  trending?: boolean;
}

interface MobileSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch?: (query: string, category: string) => void;
}

export function MobileSearch({ isOpen, onClose, onSearch }: MobileSearchProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isListening, setIsListening] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
      
      // Focus input when opened
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);

      // Generate suggestions
      setSuggestions([
        { text: "React hooks tutorial", category: "templates", trending: true },
        { text: "Python web scraper", category: "projects", trending: true },
        { text: "Node.js REST API", category: "templates" },
        { text: "Machine learning model", category: "projects" },
        { text: "TypeScript starter", category: "templates", trending: true },
      ]);
    }
  }, [isOpen]);

  const handleSearch = (searchQuery: string = query, category: string = activeCategory) => {
    if (!searchQuery.trim()) return;

    // Add to recent searches
    const newSearch: RecentSearch = {
      query: searchQuery,
      category,
      timestamp: Date.now(),
    };

    const updatedSearches = [
      newSearch,
      ...recentSearches.filter(s => s.query !== searchQuery).slice(0, 9),
    ];

    setRecentSearches(updatedSearches);
    localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));

    // Trigger search
    onSearch?.(searchQuery, category);
    setShowResults(true);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  const handleVoiceSearch = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser');
      return;
    }

    setIsListening(true);
    
    // Use proper type casting for SpeechRecognition API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.error('Speech recognition not supported');
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
      handleSearch(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();

    // Haptic feedback for voice start
    if ('vibrate' in navigator) {
      navigator.vibrate([20, 10, 20]);
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(5);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] bg-background md:hidden"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 400, damping: 40 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b">
            <button
              onClick={onClose}
              className="mobile-touch-target p-2 -m-2"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="search"
                placeholder="Search E-Code..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10 pr-10 h-10 bg-secondary/50 border-none text-base"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                inputMode="search"
              />
              
              {/* Voice search button */}
              <button
                onClick={handleVoiceSearch}
                className={cn(
                  "absolute right-3 top-1/2 -translate-y-1/2",
                  "mobile-touch-target p-1 -m-1",
                  isListening && "text-[#F26207] animate-pulse"
                )}
                aria-label="Voice search"
              >
                <Mic className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Category filters */}
          <div className="flex gap-2 p-4 overflow-x-auto no-scrollbar">
            {categories.map((category) => (
              <motion.button
                key={category.value}
                onClick={() => {
                  setActiveCategory(category.value);
                  if ('vibrate' in navigator) navigator.vibrate(5);
                }}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                  "mobile-touch-target",
                  activeCategory === category.value
                    ? "bg-[#F26207] text-white"
                    : "bg-secondary text-muted-foreground"
                )}
                whileTap={{ scale: 0.95 }}
              >
                {category.name}
              </motion.button>
            ))}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 px-4">
            {!showResults ? (
              <>
                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground">
                        Recent
                      </h3>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear
                      </button>
                    </div>
                    
                    {recentSearches.map((search, index) => (
                      <motion.button
                        key={`${search.query}-${index}`}
                        onClick={() => {
                          setQuery(search.query);
                          handleSearch(search.query, search.category);
                        }}
                        className="flex items-center gap-3 w-full p-3 -mx-3 hover:bg-secondary/50 rounded-lg text-left group"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">{search.query}</span>
                        <Badge variant="secondary" className="text-xs">
                          {search.category}
                        </Badge>
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">
                    Trending searches
                  </h3>
                  
                  {suggestions.map((suggestion, index) => (
                    <motion.button
                      key={suggestion.text}
                      onClick={() => {
                        setQuery(suggestion.text);
                        handleSearch(suggestion.text, suggestion.category);
                      }}
                      className="flex items-center gap-3 w-full p-3 -mx-3 hover:bg-secondary/50 rounded-lg text-left group"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 + 0.2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <TrendingUp className={cn(
                        "h-4 w-4",
                        suggestion.trending 
                          ? "text-[#F26207]" 
                          : "text-muted-foreground"
                      )} />
                      <span className="flex-1 text-sm">{suggestion.text}</span>
                      <Badge 
                        variant={suggestion.trending ? "default" : "secondary"}
                        className={cn(
                          "text-xs",
                          suggestion.trending && "bg-[#F26207]/10 text-[#F26207] border-[#F26207]/20"
                        )}
                      >
                        {suggestion.category}
                      </Badge>
                    </motion.button>
                  ))}
                </div>
              </>
            ) : (
              // Search results
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    Results for "{query}"
                  </h3>
                  <button
                    onClick={() => setShowResults(false)}
                    className="text-xs text-[#F26207]"
                  >
                    New search
                  </button>
                </div>
                
                {/* Placeholder results */}
                {[1, 2, 3, 4, 5].map((_, index) => (
                  <motion.div
                    key={index}
                    className="p-4 mb-3 bg-secondary/30 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="h-4 bg-secondary rounded w-3/4 mb-2" />
                    <div className="h-3 bg-secondary/50 rounded w-full mb-2" />
                    <div className="h-3 bg-secondary/50 rounded w-2/3" />
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  );
}