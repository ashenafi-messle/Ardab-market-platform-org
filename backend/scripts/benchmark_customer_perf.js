import http from 'http';
import { prisma } from '../src/shared/config/database.js';
import { listCustomerProducts } from '../src/customer/services/customerCatalog.service.js';

function requestApi(path) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path,
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const durationMs = performance.now() - startTime;
        resolve({
          status: res.statusCode,
          durationMs,
          sizeBytes: Buffer.byteLength(data, 'utf8'),
          headers: res.headers,
          data: data.length > 0 ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('🚀 ARDAB MARKET PERFORMANCE BENCHMARK SUITE');
  console.log('====================================================\n');

  // Test 1: Direct Database Query Comparison (Old full include vs New slim select)
  console.log('--- TEST 1: Database Query Performance ---');
  
  // Benchmark Slim Select
  const t0 = performance.now();
  const slimResult = await listCustomerProducts({ page: 1, limit: 12 });
  const slimDuration = performance.now() - t0;
  const slimPayloadBytes = Buffer.byteLength(JSON.stringify(slimResult), 'utf8');

  // Benchmark Legacy-style Heavy Include
  const t1 = performance.now();
  const heavyProducts = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    take: 12,
    orderBy: { createdAt: 'desc' },
    include: {
      category: true,
      seller: true,
      images: true,
      orderItems: true,
      feedbacks: true,
    }
  });
  const heavyDuration = performance.now() - t1;
  const heavyPayloadBytes = Buffer.byteLength(JSON.stringify(heavyProducts), 'utf8');

  console.log(`- Heavy Query (all relations + admin fields): ${heavyDuration.toFixed(2)}ms | Payload: ${(heavyPayloadBytes / 1024).toFixed(2)} KB`);
  console.log(`- Slim Select Query (customer catalog service): ${slimDuration.toFixed(2)}ms | Payload: ${(slimPayloadBytes / 1024).toFixed(2)} KB`);
  console.log(`- DB Payload Reduction: ${(((heavyPayloadBytes - slimPayloadBytes) / heavyPayloadBytes) * 100).toFixed(1)}%\n`);

  // Test 2: HTTP API Endpoints & In-Memory Cache
  console.log('--- TEST 2: HTTP API Latency & In-Memory Caching ---');

  const endpoints = [
    { name: 'Category Tree', path: '/api/v1/customer/catalog/categories/tree' },
    { name: 'Operational Cities', path: '/api/v1/customer/catalog/cities' },
    { name: 'Products Catalog (Page 1)', path: '/api/v1/customer/catalog/products?page=1&limit=12' },
  ];

  for (const ep of endpoints) {
    try {
      // First Request (Cache Miss / Direct)
      const res1 = await requestApi(ep.path);
      // Second Request (Cache Hit)
      const res2 = await requestApi(ep.path);

      console.log(`[${ep.name}]`);
      console.log(`  - 1st Call (Network/DB): ${res1.durationMs.toFixed(2)}ms (${(res1.sizeBytes / 1024).toFixed(2)} KB) Cache-Control: ${res1.headers['cache-control'] || 'none'}`);
      console.log(`  - 2nd Call (In-Memory Cache): ${res2.durationMs.toFixed(2)}ms`);
      const speedup = (res1.durationMs / Math.max(res2.durationMs, 0.1)).toFixed(1);
      console.log(`  - Cache Speedup: ~${speedup}x faster\n`);
    } catch (err) {
      console.log(`  - Skipped / Backend error on ${ep.path}: ${err.message}`);
    }
  }

  console.log('====================================================');
  console.log('✅ BENCHMARK COMPLETE');
  console.log('====================================================');

  await prisma.$disconnect();
  process.exit(0);
}

runBenchmark().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
