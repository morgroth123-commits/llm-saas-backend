# Performance improvements — scan and quick wins

This document lists 10 high-impact performance improvement opportunities for the project and implements the top pick as an actionable checklist/proposal.

1. Enable HTTP response compression (gzip/brotli) and caching headers — reduces bandwidth and latency for nearly all responses.
2. Add caching layer (Redis or in-process) for frequently-read data and rate-limited resources.
3. Optimize database queries and add missing indexes for slow queries.
4. Use pagination and streaming for large result sets instead of loading all at once.
5. Serve static assets via CDN and set long cache lifetimes with fingerprinting.
6. Avoid N+1 queries by eager-loading relations and query batching.
7. Add connection pooling and tune pool sizes for database and external APIs.
8. Use asynchronous, non-blocking I/O for long-running tasks; offload heavy work to background jobs.
9. Reduce dependency bloat and upgrade to lighter/smaller libraries where possible.
10. Add automated performance regression tests (benchmarking, lightweight load tests) to CI.

---

Selected highest-impact, lowest-effort: Enable HTTP response compression + caching headers

Why: Compression reduces payload sizes dramatically (often 60–90% for text), and proper caching eliminates repeat fetches. Both are low-effort changes in most web frameworks and reverse proxies, but yield immediate latency and cost savings. Take care to scope compression: avoid compressing responses that contain secrets, authentication tokens, or per-user sensitive data to mitigate BREACH-style attacks.

Implementation notes (apply in app or reverse proxy):

- Node/Express (npm):

```js
const compression = require('compression');
app.use(compression());
// set caching headers for static assets
// NOTE: use long maxAge only for content-fingerprinted filenames; use a shorter TTL for mutable paths
app.use('/static', express.static(path.join(__dirname,'public'), { maxAge: '30d' }));
```

- Nginx (reverse proxy):

```nginx
http {
    gzip on;
    gzip_vary on;  # ensure caches vary by Accept-Encoding
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Example proxy cache (storage + keys_zone); apply `proxy_cache my_cache;` in a location to enable
    proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m inactive=60m max_size=1g;
}

# In a server/location block:
# location /api/ {
#     proxy_cache my_cache;
#     proxy_cache_valid 200 302 10m;
#     proxy_cache_valid 404 1m;
# }
```

Verification:
- Test separately for gzip, brotli, and identity encodings so the response encoding is observable (do not use `--compressed` when asserting headers). Example checks:

```bash
# gzip
curl -sS -H "Accept-Encoding: gzip" -D - https://your.site/api/hello -o /dev/null | grep -i "Content-Encoding\|Vary\|Cache-Control"
# brotli
curl -sS -H "Accept-Encoding: br" -D - https://your.site/api/hello -o /dev/null | grep -i "Content-Encoding\|Vary\|Cache-Control"
# identity (no compression)
curl -sS -H "Accept-Encoding: identity" -D - https://your.site/api/hello -o /dev/null | grep -i "Content-Encoding\|Vary\|Cache-Control"
```

- For static assets, assert long-lived Cache-Control only applies to fingerprinted assets and that `Vary: Accept-Encoding` is present when responses are compressed.
- Measure before/after bandwidth and latency with `curl --compressed -w "%{size_download} bytes\n"` or Lighthouse for broader metrics.

Next steps to implement in codebase:
1. Add compression middleware or reverse-proxy config.
2. Add CI smoke check to validate compression and cache headers on key endpoints.
3. Deploy and measure improvements (p95 latency, bandwidth).

---

If this plan looks good, apply actual code changes to the application server or deployment config. This PR only adds the checklist and implementation notes as a starting point.
