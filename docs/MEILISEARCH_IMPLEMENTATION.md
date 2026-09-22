# Meilisearch Implementation Guide

## Overview

Meilisearch is an open-source, fast, and relevant search engine designed for modern web applications. It provides instant search-as-you-type, typo tolerance, filtering, sorting, and faceted search out of the box.

---

## 1. Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   Frontend   │─────▶│   Backend API    │─────▶│   Meilisearch    │
│  (React)     │      │  (Express/Node)  │      │   (Search Index) │
│              │◀────│                  │◀────│                  │
│  meilisearch │      │  meilisearch     │      │  Documents       │
│  browser lib │      │  node client     │      │  + Filters       │
└─────────────┘      └──────────────────┘      └─────────────────┘
                            │
                            ▼
                     ┌──────────────┐
                     │   MongoDB     │
                     │  (Source of   │
                     │   Truth)      │
                     └──────────────┘
```

### Data Flow
1. **Write**: Products are created/updated in MongoDB → backend syncs to Meilisearch
2. **Search**: Frontend queries Meilisearch directly (for speed) or via backend proxy
3. **Sync**: Webhook/CRON keeps Meilisearch index in sync with MongoDB

---

## 2. Installation

### Backend
```bash
cd backend
npm install meilisearch
```

### Frontend
```bash
npm install @meilisearch/instant-meilisearch
# OR for direct browser usage:
npm install meilisearch
```

### Meilisearch Server
```bash
# Docker (recommended for production)
docker run -d \
  --name meilisearch \
  -p 7700:7700 \
  -v $(pwd)/meili_data:/meili_data \
  -e MEILI_MASTER_KEY=your_master_key_here \
  getmeili/meilisearch:v1.12

# Or download from https://github.com/meilisearch/meilisearch/releases
```

---

## 3. Environment Configuration

### Backend `.env` (already partially configured)
```env
# Meilisearch
MEILISEARCH_HOST=http://localhost:7700
MEILISEARCH_API_KEY=your_meilisearch_api_key
MEILISEARCH_INDEX_NAME=products
MEILISEARCH_UPDATE_INTERVAL=300000  # 5 minutes
```

---

## 4. Indexing Strategy

### Index Configuration
```typescript
// backend/src/services/search.service.ts
import { MeiliSearch } from 'meilisearch';

const client = new MeiliSearch({
  host: process.env.MEILISEARCH_HOST || 'http://localhost:7700',
  apiKey: process.env.MEILISEARCH_API_KEY,
});

const INDEX_NAME = process.env.MEILISEARCH_INDEX_NAME || 'products';

export const searchClient = client;

export const getSearchIndex = () => client.index(INDEX_NAME);
```

### Document Structure (what gets indexed)
```typescript
interface SearchProductDocument {
  id: string;                    // MongoDB _id as string
  name: string;                  // Product name (searchable)
  slug: string;                  // URL slug
  subtitle: string;              // Short subtitle
  description: string;           // Full description (searchable)
  brand: string;                 // Brand name (searchable)
  category: string;              // Category ObjectId
  categoryName: string;          // Category name (searchable)
  categorySlug: string;
  tags: string[];                // Tags (searchable)
  hsnCode: string;               // HSN Code (searchable)
  sku: string;                   // SKU (searchable)
  sellingPrice: number;          // Current price
  mrpPrice: number;              // MRP
  discountPercent: number;       // Discount %
  averageRating: number;         // Rating
  reviewCount: number;           // Review count
  imageUrl: string;              // Primary image URL (Cloudinary)
  variants: {                    // Variant info
    size: string;
    sellingPrice: number;
    quantity: number;
  }[];
  isActive: boolean;
  isFeatured: boolean;
  inStock: boolean;              // Computed stock status
  countryOfOrigin: string;       // Origin (searchable)
  organicCertification: string;  // Certification
  totalSales: number;            // For popularity sorting
  createdAt: number;             // Unix timestamp
}
```

### Settings Configuration
```typescript
export async function configureSearchIndex() {
  const index = getSearchIndex();

  // Searchable attributes (in priority order)
  await index.updateSearchableAttributes([
    'name',
    'brand',
    'categoryName',
    'tags',
    'description',
    'subtitle',
    'hsnCode',
    'sku',
    'countryOfOrigin',
    'organicCertification',
  ]);

  // Filterable attributes
  await index.updateFilterableAttributes([
    'category',
    'brand',
    'sellingPrice',
    'mrpPrice',
    'discountPercent',
    'averageRating',
    'inStock',
    'tags',
    'isFeatured',
    'countryOfOrigin',
    'organicCertification',
  ]);

  // Sortable attributes
  await index.updateSortableAttributes([
    'sellingPrice',
    'createdAt',
    'averageRating',
    'totalSales',
    'discountPercent',
  ]);

  // Ranking rules
  await index.updateRankingRules([
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ]);

  // Typo tolerance
  await index.updateTypoTolerance({
    enabled: true,
    minWordSizeForTypos: {
      oneTypo: 5,
      twoTypos: 9,
    },
    disableOnAttributes: [],
    disableOnWords: [],
  });

  // Synonyms (food-specific)
  await index.updateSynonyms({
    'rice': ['basmati', 'brown rice', 'white rice', 'parboiled'],
    'atta': ['flour', 'wheat flour', 'whole wheat'],
    'dal': ['lentil', 'pulses', 'legume'],
    'oil': ['cold pressed', 'cooking oil', 'edible oil'],
    'organic': ['natural', 'chemical free', 'pure'],
    'dry fruit': ['nuts', 'almonds', 'cashews', 'walnuts', 'raisins'],
    'sugar': ['jaggery', 'honey', 'sweetener'],
    'spice': ['masala', 'seasoning', 'herb'],
  });

  // Stop words
  await index.updateStopWords([
    'a', 'an', 'the', 'and', 'or', 'in', 'of', 'for', 'to', 'with',
    'is', 'it', 'at', 'by', 'on', 'as', 'per', 'each', 'all',
  ]);

  // Pagination
  await index.updatePagination({
    maxTotalHits: 10000,
  });
}
```

---

## 5. Sync Service

### Initial Full Sync
```typescript
// backend/src/services/sync.service.ts
import { Product } from '../models/Product';
import { getSearchIndex } from './search.service';

export async function syncAllProductsToSearch() {
  const index = getSearchIndex();
  const products = await Product.find({ isDeleted: false, isActive: true })
    .populate('category', 'name slug')
    .lean();

  const documents = products.map(formatProductForSearch);

  // Batch in chunks of 1000
  const BATCH_SIZE = 1000;
  for (let i = 0; i < documents.length; i += BATCH_SIZE) {
    const batch = documents.slice(i, i + BATCH_SIZE);
    await index.addDocuments(batch);
  }

  console.log(`Synced ${documents.length} products to Meilisearch`);
}
```

### Real-time Sync on Save
```typescript
// Add after product save in admin/product.controller.ts
import { getSearchIndex } from '../../services/search.service';

async function syncProductToSearch(product: any) {
  const index = getSearchIndex();
  const doc = formatProductForSearch(product);
  await index.addDocuments([doc]);
}

async function removeProductFromSearch(productId: string) {
  const index = getSearchIndex();
  await index.deleteDocument(productId);
}
```

### Background Sync Job (CRON)
```typescript
// Option A: setInterval in server startup
setInterval(syncAllProductsToSearch, 5 * 60 * 1000);

// Option B: node-cron (preferred for production)
import cron from 'node-cron';
cron.schedule('*/5 * * * *', syncAllProductsToSearch);
```

---

## 6. Search API

### Backend Search Endpoint
```typescript
// backend/src/routes/search.routes.ts
import { Router } from 'express';
import { getSearchIndex } from '../services/search.service';

const router = Router();

// Search with filters
router.get('/search', async (req, res) => {
  const {
    q,
    page = '1',
    limit = '20',
    sort,
    category,
    minPrice,
    maxPrice,
    rating,
    inStock,
    brand,
  } = req.query;

  const index = getSearchIndex();
  const filterParts = [];

  if (category) filterParts.push(`category = ${category}`);
  if (minPrice) filterParts.push(`sellingPrice >= ${Number(minPrice)}`);
  if (maxPrice) filterParts.push(`sellingPrice <= ${Number(maxPrice)}`);
  if (rating) filterParts.push(`averageRating >= ${Number(rating)}`);
  if (inStock === 'true') filterParts.push('inStock = true');
  if (brand) filterParts.push(`brand = "${brand}"`);

  const searchParams: any = {
    page: Number(page),
    hitsPerPage: Number(limit),
    filter: filterParts.length > 0 ? filterParts.join(' AND ') : undefined,
  };

  if (sort) {
    const [field, order] = (sort as string).split(':');
    searchParams.sort = [`${field}:${order || 'desc'}`];
  }

  const result = await index.search(q as string || '', searchParams);

  res.json({
    success: true,
    data: result.hits,
    pagination: {
      page: result.page,
      limit: result.hitsPerPage,
      total: result.totalHits,
      totalPages: result.totalPages,
      hasNextPage: result.page < result.totalPages,
    },
    facetDistribution: result.facetDistribution,
  });
});

// Autocomplete (lightweight)
router.get('/autocomplete', async (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') return res.json({ success: true, data: [] });

  const index = getSearchIndex();
  const result = await index.search(q, {
    limit: 8,
    attributesToRetrieve: ['id', 'name', 'slug', 'imageUrl', 'sellingPrice', 'categoryName'],
    showMatchesPosition: true,
  });

  res.json({ success: true, data: result.hits });
});

export default router;
```

### Frontend Search Service
```javascript
// src/services/searchService.js
import { instantMeiliSearch } from '@meilisearch/instant-meilisearch';

const searchClient = instantMeiliSearch(
  import.meta.env.VITE_MEILISEARCH_HOST || 'http://localhost:7700',
  import.meta.env.VITE_MEILISEARCH_API_KEY || '',
);

export { searchClient };

// OR direct search via backend proxy
import api from './api';

export async function searchProducts(query, params = {}) {
  const { data } = await api.get('/search', {
    params: { q: query, ...params },
  });
  return data;
}

export async function autocomplete(query) {
  const { data } = await api.get('/autocomplete', {
    params: { q: query },
  });
  return data.data;
}
```

---

## 7. Frontend SearchBar Component

```jsx
// src/components/search/SearchBar.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Mic, X, Clock, TrendingUp } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';
import { autocomplete } from '../../services/searchService';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from '../../hooks/useLocalStorage';

export default function SearchBar({ variant = 'default', placeholder = 'Search organic products...' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useLocalStorage('recentSearches', []);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 200);

  // Trending searches (could come from API)
  const trendingSearches = ['Organic Rice', 'Cold Pressed Oil', 'Dry Fruits', 'Wheat Atta', 'Honey'];

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      autocomplete(debouncedQuery).then(setSuggestions).catch(() => setSuggestions([]));
      setSelectedIndex(-1);
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  const handleSearch = useCallback((searchQuery) => {
    if (!searchQuery?.trim()) return;
    setRecentSearches(prev => {
      const updated = [searchQuery, ...prev.filter(s => s !== searchQuery)].slice(0, 10);
      return updated;
    });
    navigate(`/product?search=${encodeURIComponent(searchQuery)}`);
    setIsFocused(false);
    inputRef.current?.blur();
  }, [navigate, setRecentSearches]);

  const handleKeyDown = (e) => {
    const items = getSuggestionItems();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
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
    setRecentSearches(prev => prev.filter(s => s !== search));
  };

  const getSuggestionItems = () => {
    if (suggestions.length > 0) return suggestions;
    if (query.length === 0) return [];
    return [];
  };

  const showDropdown = isFocused && (query.length > 0 || recentSearches.length > 0);

  return (
    <div className="relative w-full">
      <div className={`relative flex items-center ${
        variant === 'hero'
          ? 'h-14 rounded-2xl bg-white shadow-lg'
          : variant === 'sticky'
          ? 'h-12 rounded-xl bg-gray-100'
          : 'h-11 rounded-lg bg-gray-100'
      }`}>
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
          className="h-full flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-gray-400"
          aria-label="Search products"
          aria-expanded={showDropdown}
          aria-autocomplete="list"
          role="combobox"
        />
        {query && (
          <button onClick={clearSearch} className="mr-2 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        )}
        <VoiceSearchButton />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-popover">
          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <div className="py-2">
              <p className="px-4 py-1 text-xs font-semibold uppercase text-gray-400">Suggestions</p>
              {suggestions.map((item, i) => (
                <button
                  key={item.id}
                  onMouseDown={() => handleSearch(item.name)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                    selectedIndex === i ? 'bg-brand-light text-brand' : 'hover:bg-gray-50'
                  }`}
                >
                  <Search size={16} className="shrink-0 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="text-xs text-gray-500">{item.categoryName}</span>
                  </div>
                  {item.sellingPrice && (
                    <span className="shrink-0 font-semibold text-gray-900">₹{item.sellingPrice}</span>
                  )}
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Recent Searches */}
          {query.length === 0 && recentSearches.length > 0 && (
            <div className="py-2">
              <p className="flex items-center justify-between px-4 py-1 text-xs font-semibold uppercase text-gray-400">
                <span>Recent Searches</span>
                <button
                  onMouseDown={() => setRecentSearches([])}
                  className="text-brand hover:underline"
                >
                  Clear
                </button>
              </p>
              {recentSearches.map((search, i) => (
                <button
                  key={search}
                  onMouseDown={() => handleSearch(search)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50"
                >
                  <Clock size={16} className="shrink-0 text-gray-400" />
                  <span className="flex-1">{search}</span>
                  <button
                    onMouseDown={(e) => removeRecentSearch(e, search)}
                    className="text-gray-300 hover:text-gray-500"
                  >
                    <X size={14} />
                  </button>
                </button>
              ))}
            </div>
          )}

          {/* Trending Searches */}
          {query.length === 0 && recentSearches.length === 0 && trendingSearches.length > 0 && (
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
```

---

## 8. Voice Search

```jsx
// src/hooks/useVoiceSearch.js
export function useVoiceSearch() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported] = useState(() => 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
  const recognitionRef = useRef(null);

  const startListening = useCallback(() => {
    if (!supported) {
      alert('Voice search is not supported in your browser. Try Chrome or Edge.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.start();
    setIsListening(true);
    recognitionRef.current = recognition;
  }, [supported]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, transcript, startListening, stopListening, supported };
}
```

---

## 9. Search Ranking & Relevance

### Order of Ranking Rules
1. **Words**: Number of matched words (more = higher rank)
2. **Typo**: Fewer typos = higher rank
3. **Proximity**: Words closer together = higher
4. **Attribute**: Matches in `name` > `brand` > `tags` > `description`
5. **Sort**: Applied sort order
6. **Exactness**: Exact phrase matches boosted

### Custom Ranking
- Boost products with higher `totalSales` (popularity)
- Boost products with higher `averageRating`
- Boost featured products

---

## 10. Search Analytics

```typescript
// Track search events
interface SearchEvent {
  query: string;
  resultsCount: number;
  clickPosition?: number;
  clickedProductId?: string;
  filters: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId: string;
}

// Store in MongoDB collection for analytics
const searchEventSchema = new Schema({
  query: String,
  resultsCount: Number,
  clickPosition: Number,
  clickedProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
  filters: Schema.Types.Mixed,
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  sessionId: String,
  timestamp: { type: Date, default: Date.now },
});
```

---

## 11. Performance Considerations

| Strategy | Implementation |
|----------|---------------|
| **Search Speed** | Meilisearch typically responds in <50ms |
| **Debounce** | 200ms debounce on input before API call |
| **Caching** | Browser caching for trending/recent searches |
| **Limit results** | Max 20 hits per page, 10000 total |
| **Index size** | Keep document size under 100KB |
| **Pre-indexing** | Full index on deploy, incremental thereafter |
| **CDN** | Frontend queries via CDN if using instant-meilisearch |

---

## 12. Testing Search

```typescript
// Expected search results behavior
describe('Search', () => {
  test('typo tolerance: "basmati rise" returns "Basmati Rice"', async () => {});
  test('partial match: "ric" returns "Rice", "Brown Rice", "Wild Rice"', async () => {});
  test('synonym expansion: "dal" also returns "lentil" products', async () => {});
  test('faceted filter: category + price range works correctly', async () => {});
  test('sort: price ascending returns cheapest first', async () => {});
  test('empty query: returns trending/popular products', async () => {});
  test('no results: returns suggestions and "did you mean?"', async () => {});
});
```

---

## 13. Rollout Plan

1. Install Meilisearch server (Docker)
2. Configure index settings (searchable/filterable/sortable attrs)
3. Run initial full sync from MongoDB
4. Update `searchProducts` controller to use Meilisearch
5. Build SearchBar component with autocomplete
6. Build SearchSuggestions dropdown
7. Implement voice search
8. Add search analytics
9. Configure background sync (CRON)
10. Monitor search relevance and adjust ranking rules
