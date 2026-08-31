import { Response } from 'express';

// In-memory SSE clients for product analytics real-time updates
type Client = { res: Response; productIds?: Set<string> };
const clients = new Set<Client>();

export function broadcastProductUpdate(payload: { type: 'view' | 'cart' | 'wishlist' | 'purchase' | 'stock'; productId: string }) {
  const data = JSON.stringify({ ...payload, ts: Date.now() });
  for (const c of clients) {
    // if client subscribed to specific productIds, filter; else broadcast all
    if (c.productIds && c.productIds.size > 0 && !c.productIds.has(payload.productId)) continue;
    try {
      c.res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(c);
    }
  }
}

export function addRealtimeClient(res: Response, productIds?: string[]) {
  const client: Client = { res, productIds: productIds ? new Set(productIds) : undefined };
  clients.add(client);
  return client;
}

export function removeRealtimeClient(client: Client) {
  clients.delete(client);
}

export function getRealtimeClientCount() {
  return clients.size;
}
