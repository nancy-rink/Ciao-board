// Ciao Board's relay: the small part of ntfy.sh's API the board uses, on Cloudflare Workers.
//   POST /<topic>                        store a message and pass it to anyone listening
//   GET  /<topic>/json?poll=1&since=…    the messages since an id, one JSON object per line
//   GET  /<topic>/ws?since=…             a WebSocket: the messages since an id, then each new one as it arrives
//   GET  /news                           BBC headlines, the same shape as news.json on the news-data branch, kept for 10 minutes
// Messages look like ntfy's ({id,time,event:'message',topic,message}) and are kept for 12 hours. The relay never sees
// what boards say to each other: everything a board sends is already encrypted.
// Each topic is a Durable Object. Listeners use hibernating WebSockets, so an idle connection (a TV left on all day)
// costs nothing; pings are answered without waking the object.
import {DurableObject} from 'cloudflare:workers';

const KEEP_MS = 12 * 3600e3, KEEP_MAX = 300, MAX_BYTES = 16384;
const TOPIC = /^[A-Za-z0-9_-]{1,64}$/;
const CORS = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': '*'};
const json = (body, status = 200) => new Response(JSON.stringify(body), {status, headers: {...CORS, 'Content-Type': 'application/json'}});

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, {headers: CORS});
    const url = new URL(req.url), [topic, action] = url.pathname.split('/').filter(Boolean);
    if (topic === 'health' && !action) return new Response('ok', {headers: CORS});
    if (topic === 'news' && !action && req.method === 'GET') return news(req.url);
    if (!topic || !TOPIC.test(topic)) return json({error: 'not found'}, 404);
    if (req.method === 'POST' && !action) {
      const len = +(req.headers.get('Content-Length') || 0);
      if (len > MAX_BYTES) return json({error: 'message too large'}, 413);
    } else if (!(req.method === 'GET' && (action === 'json' || action === 'ws'))) return json({error: 'not found'}, 404);
    return env.TOPIC.get(env.TOPIC.idFromName(topic)).fetch(req);
  }
};

// News: BBC's feeds can't be read from a web page, so the relay reads them and passes the headlines on.
// One copy is kept in Cloudflare's cache for 10 minutes, so however many boards ask, the BBC sees a few requests an hour.
const FEEDS = {
  top: ['Top stories', 'https://feeds.bbci.co.uk/news/rss.xml'],
  world: ['World', 'https://feeds.bbci.co.uk/news/world/rss.xml'],
  uk: ['UK', 'https://feeds.bbci.co.uk/news/uk/rss.xml'],
  business: ['Business', 'https://feeds.bbci.co.uk/news/business/rss.xml'],
  technology: ['Technology', 'https://feeds.bbci.co.uk/news/technology/rss.xml'],
  science: ['Science', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml'],
  sport: ['Sport', 'https://feeds.bbci.co.uk/sport/rss.xml'],
};
const NEWS_KEEP = 600, PER_SECTION = 15;
const ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '};
const unescape = t => t.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENTITIES[e.toLowerCase()] ?? m);
function headlines(xml) {
  const seen = new Set(), out = [];
  for (const [, item] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/g)) {
    const m = item.match(/<title\b[^>]*>([\s\S]*?)<\/title>/), title = m ? unescape(m[1]).replace(/\s+/g, ' ').trim() : '';
    if (title && !seen.has(title.toLowerCase())) { seen.add(title.toLowerCase()); out.push(title); }
    if (out.length >= PER_SECTION) break;
  }
  return out;
}
async function news(url) {
  const cache = caches.default, key = new Request(new URL('/news', url).href);
  const hit = await cache.match(key);
  if (hit) return hit;
  const sections = {};
  await Promise.all(Object.entries(FEEDS).map(async ([id, [name, feed]]) => {
    try {
      const r = await fetch(feed, {headers: {'User-Agent': 'CiaoBoard/1.0 (+https://github.com/nancy-rink/Ciao-board)'}});
      if (!r.ok) return;
      const items = headlines(await r.text());
      if (items.length) sections[id] = {name, items};
    } catch (e) {}   // keep the other sections if one feed fails
  }));
  if (!sections.top) return json({error: 'the BBC feeds could not be read'}, 502);
  const ordered = Object.fromEntries(Object.keys(FEEDS).filter(id => sections[id]).map(id => [id, sections[id]]));
  const res = new Response(JSON.stringify({source: 'BBC News', updated: new Date().toISOString().replace(/\.\d+Z$/, '+00:00'), sections: ordered}),
    {headers: {...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=' + NEWS_KEEP}});
  await cache.put(key, res.clone());
  return res;
}

export class Topic extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec('CREATE TABLE IF NOT EXISTS msgs (seq INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT UNIQUE, time INTEGER, body TEXT)');
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }
  async fetch(req) {
    const url = new URL(req.url), [topic, action] = url.pathname.split('/').filter(Boolean), since = url.searchParams.get('since');
    if (req.method === 'POST') {
      const body = await req.text();
      if (body.length > MAX_BYTES) return json({error: 'message too large'}, 413);
      const now = Date.now(), m = {id: 'c' + crypto.randomUUID().replace(/-/g, '').slice(0, 15), time: Math.floor(now / 1000), event: 'message', topic, message: body};
      this.sql.exec('INSERT INTO msgs (id, time, body) VALUES (?, ?, ?)', m.id, now, body);
      this.prune(now);
      const line = JSON.stringify(m);
      for (const ws of this.ctx.getWebSockets()) { try { ws.send(line); } catch (e) {} }
      return json(m);
    }
    const backlog = this.since(topic, since);
    if (action === 'ws') {
      if (req.headers.get('Upgrade') !== 'websocket') return json({error: 'expected a WebSocket'}, 426);
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server);
      server.send(JSON.stringify({event: 'open', topic}));
      for (const m of backlog) server.send(JSON.stringify(m));
      return new Response(null, {status: 101, webSocket: client});
    }
    return new Response(backlog.map(m => JSON.stringify(m)).join('\n') + (backlog.length ? '\n' : ''), {headers: {...CORS, 'Content-Type': 'application/x-ndjson'}});
  }
  // Messages after the one with this id; everything kept if the id is unknown, missing, or a duration like "12h"
  since(topic, since) {
    let rows;
    const at = since && !/^\d+h$|^all$/.test(since) ? this.sql.exec('SELECT seq FROM msgs WHERE id = ?', since).toArray()[0] : null;
    rows = at ? this.sql.exec('SELECT id, time, body FROM msgs WHERE seq > ? ORDER BY seq', at.seq).toArray()
              : this.sql.exec('SELECT id, time, body FROM msgs WHERE time > ? ORDER BY seq', Date.now() - KEEP_MS).toArray();
    return rows.map(r => ({id: r.id, time: Math.floor(r.time / 1000), event: 'message', topic, message: r.body}));
  }
  prune(now) {
    this.sql.exec('DELETE FROM msgs WHERE time < ?', now - KEEP_MS);
    this.sql.exec('DELETE FROM msgs WHERE seq <= (SELECT seq FROM msgs ORDER BY seq DESC LIMIT 1 OFFSET ?)', KEEP_MAX);
  }
  webSocketMessage() {}            // listeners only listen; 'ping' is answered automatically
  webSocketClose(ws, code) { try { ws.close(code, 'bye'); } catch (e) {} }
}
