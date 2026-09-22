# Search Architecture — Enterprise Search System

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                              │
│                                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐  │
│  │ SearchBar    │  │ Autocomplete │  │ Voice      │  │ Search    │  │
│  │ (Header)     │  │ Dropdown     │  │ Search     │  │ Results   │  │
│  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  └─────┬─────┘  │
│         │                 │                │               │         │
│  ┌──────┴─────────────────┴────────────────┴───────────────┴──────┐  │
│  │                    Search Context / Hooks                       │  │
│  │  useDebounce(200ms)  →  useSearch  →  useAutocomplete           │  │
│  └────────────────────────────┬────────────────────────────────────┘  │
│                               │                                       │
└───────────────────────────────┼───────────────────────────────────────┘
                                │ HTTP / WebSocket
┌───────────────────────────────┼───────────────────────────────────────┐
│                     BACKEND (Express)                                 │
│                               │                                       │
│  ┌────────────────────────────┴────────────────────────────────────┐  │
│  │                      Search Controller                          │  │
│  │  /api/search  →  Meilisearch client .search()                   │  │
│  │  /api/autocomplete  →  Meilisearch .search({limit: 8})          │  │
│  │  /api/search/filters  →  Faceted distribution from Meilisearch  │  │
│  │  /api/search/trending  →  Top queries from analytics            │  │
│  └────────────────────────────┬────────────────────────────────────┘  │
│                               │                                       │
│  ┌────────────────────────────┴────────────────────────────────────┐  │
│  │                     Meilisearch Server                           │  │
│  │  ┌──────────────────────────────────────────────────────────┐   │  │
│  │  │  products Index                                          │   │  │
│  │  │  - 10000+ documents                                      │   │  │
│  │  │  - Searchable: name, brand, category, tags, description  │   │  │
│  │  │  - Filterable: price, rating, stock, category, brand     │   │  │
│  │  │  - Sortable: price, rating, sales, date, discount        │   │  │
│  │  │  - Synonyms: food-specific                               │   │  │
│  │  │  - Typo tolerance: 1 typo for 5+ chars, 2 for 9+        │   │  │
│  │  └──────────────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                               │                                       │
└───────────────────────────────┼───────────────────────────────────────┘
                                │
┌───────────────────────────────┼───────────────────────────────────────┐
│                     DATA LAYER                                        │
│                               │                                       │
│  ┌────────────────────────────┴────────────────────────────────────┐  │
│  │                     MongoDB (Source of Truth)                     │  │
│  │  Product collection  →  Update triggers  →  Sync to Meilisearch  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Redis Cache (Optional)                        │  │
│  │  - Trending searches (TTL: 1 hour)                                │  │
│  │  - Recent searches per user (TTL: 7 days)                         │  │
│  │  - Autocomplete cache (TTL: 5 minutes)                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                     Search Analytics (MongoDB)                    │  │
│  │  search_events collection                                         │  │
│  │  - query, results_count, click_position, filters, timestamp       │  │
│  └──────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Search Flow

### User Types "organic rice"
```
1. User types "org" in SearchBar
2. 200ms debounce
3. Frontend calls GET /api/autocomplete?q=org
4. Meilisearch returns:
   - "Organic Brown Rice"
   - "Organic Basmati Rice"
   - "Organic Rice Flour"
   Each with: id, name, slug, imageUrl, sellingPrice, categoryName
5. Dropdown renders suggestions with images + prices
6. User selects "Organic Brown Rice"
7. Frontend navigates to /product?search=organic+brown+rice
8. ProductListing calls GET /api/search?q=organic+brown+rice&page=1&limit=20
9. Meilisearch returns paginated results with facet distribution
10. Results render in ProductGrid

Alternative: User presses Enter on partial query
→ Same flow but with full search results page
```

---

## 3. Search Bar Design (Home Page)

### Desktop Hero Search
```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│         FLAT 20% OFF on Stone-Ground Atta                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ 🔍 Search organic rice, dry fruits, oils...   🎤 │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [SHOP NOW]                                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Sticky Header Search (Desktop)
```
┌──────────────────────────────────────────────────────────┐
│  Logo  │  Home  About  Categories  Products  Bulk  │ 🔍│
│        │                                     Search...  │
└──────────────────────────────────────────────────────────┘
```

### Mobile Search
```
┌──────────────────────────────────────────────────┐
│ ← │ 🔍 Search products...                    │ ♡ │
└──────────────────────────────────────────────────┘
```

---

## 4. Search Results Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ ← Back    "organic rice"    1,245 results  (0.3 seconds)    │
├──────────────────┬──────────────────────────────────────────┤
│ Filters          │  Sort: [Relevance ▼]   [Grid/List]      │
│                  │                                          │
│ ☑ Category       │  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│   ☑ Grains (345) │  │Card│ │Card│ │Card│ │Card│           │
│   ☐ Nuts (234)   │  └────┘ └────┘ └────┘ └────┘           │
│   ☐ Dryfruit(123)│                                          │
│                  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│ ☑ Price          │  │Card│ │Card│ │Card│ │Card│           │
│   Range: ₹99-2500│  └────┘ └────┘ └────┘ └────┘           │
│                  │                                          │
│ ☑ Rating         │  ┌────┐ ┌────┐ ┌────┐ ┌────┐           │
│   ★★★★ & up     │  │Card│ │Card│ │Card│ │Card│           │
│                  │  └────┘ └────┘ └────┘ └────┘           │
│ ☑ Brand          │                                          │
│   ☑ Machinichi   │  Page 1 of 62  ◀ 1 2 3 ... 62 ▶       │
│                  │                                          │
│ [CLEAR ALL]      │                                          │
└──────────────────┴──────────────────────────────────────────┘
```

---

## 5. Search States

### Empty State (fresh page load)
- Show trending products
- Show popular categories
- "What are you looking for?" prompt

### No Results State
```
┌──────────────────────────────────────────────────┐
│                                                  │
│          🔍 No results for "xyz"                 │
│                                                  │
│  Try searching for:                              │
│  • Rice  •  Atta  •  Oil  •  Honey  •  Nuts     │
│                                                  │
│  Or browse:                                      │
│  [All Categories]  [Best Sellers]  [New Arrivals]│
│                                                  │
└──────────────────────────────────────────────────┘
```

### Loading State
- Skeleton shimmer for search results
- Spinning indicator in search bar while typing
- Debounce prevents flash-loading

### Error State
- "Search is temporarily unavailable"
- Fallback to MongoDB regex search
- Retry button

---

## 6. Search Indexing Strategy

### Initial Index
| Step | Action | Duration |
|------|--------|----------|
| 1 | Configure index settings | Instant |
| 2 | Export all Products from MongoDB | 2-5s per 1000 |
| 3 | Transform to search document format | 1-2s per 1000 |
| 4 | Add documents to Meilisearch (batch 1000) | 2-3s per batch |
| 5 | Verify index count matches MongoDB | Instant |

### Incremental Sync
| Event | Trigger | Action |
|-------|---------|--------|
| Product created | POST /api/admin/products | Add to index |
| Product updated | PUT /api/admin/products/:id | Update in index |
| Product deleted | DELETE /api/admin/products/:id | Remove from index |
| Stock changed | Order placed | Update quantity in index |
| Price changed | Admin update | Update price in index |
| Re-sync | CRON (every 5 min) | Full re-index |

---

## 7. Analytics & Monitoring

### Events to Track
```typescript
interface SearchAnalytics {
  // Query tracking
  search_query: string;
  search_results_count: number;
  search_duration_ms: number;
  search_filters_applied: Record<string, string>;

  // Click tracking
  clicked_product_id: string;
  clicked_position: number;  // 0-indexed position in results
  click_query: string;

  // Conversion tracking
  added_to_cart_from_search: boolean;
  purchased_from_search: boolean;

  // Session
  session_id: string;
  user_id?: string;
  timestamp: Date;
}
```

### Dashboard Metrics
- Top 100 search queries (daily/weekly/monthly)
- Zero-result queries (find content gaps)
- Search-to-click rate
- Search-to-cart rate
- Average search response time
- Most clicked products per query
- Trending queries (hourly)

---

## 8. Performance Targets

| Metric | Target |
|--------|--------|
| Search response time (P95) | <100ms |
| Autocomplete response time | <50ms |
| Index sync delay | <5 minutes |
| Search availability | 99.9% |
| Typo tolerance accuracy | 95%+ |
| First meaningful paint (search) | <1.5s |

---

## 9. Fallback Strategy

When Meilisearch is unavailable:

```typescript
// backend/src/controllers/search.controller.ts
export async function searchProducts(req, res) {
  try {
    // Try Meilisearch first
    const result = await searchWithMeilisearch(req.query);
    return res.json(result);
  } catch (meiliError) {
    console.warn('Meilisearch failed, falling back to MongoDB:', meiliError.message);

    // Fallback to MongoDB text search
    const result = await searchWithMongoDB(req.query);
    return res.json(result);
  }
}
```

---

## 10. Search Relevance Tuning

### Boosting Rules
- Exact phrase match in name: +10 score
- Match in name: +5 score
- Match in brand: +3 score
- Match in tags: +2 score
- Match in description: +1 score
- Higher selling products: boost by totalSales * 0.01
- Higher rated products: boost by averageRating * 0.1
- Featured products: +2 score

### Negative Patterns
- "cheap" → return lower-priced products
- "premium" → return higher-priced products
- "organic" → filter by organic certification
- "bulk" → return larger variant sizes
