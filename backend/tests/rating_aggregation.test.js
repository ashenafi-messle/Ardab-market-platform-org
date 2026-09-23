import test from 'node:test';
import assert from 'node:assert/strict';
import { getPublicProductRatingSummaries } from '../src/customer/services/review.service.js';

function fakeDb(groups) {
  return {
    feedback: {
      async groupBy(args) {
        assert.deepEqual(args.by, ['productId']);
        assert.deepEqual(args.where.type, 'PRODUCT');
        assert.deepEqual(args.where.status, { in: ['PUBLISHED', 'REVIEWED', 'RESOLVED'] });
        assert.equal(args.where.visibility, 'PUBLIC');
        assert.deepEqual(args._sum, { rating: true });
        assert.deepEqual(args._count, { rating: true });
        return groups;
      },
    },
  };
}

test('public product ratings calculate sum divided by actual valid review count', async () => {
  const summaries = await getPublicProductRatingSummaries(
    ['one', 'two', 'three', 'four', 'five'],
    fakeDb([
      { productId: 'one', _sum: { rating: 5 }, _count: { rating: 1 } },
      { productId: 'two', _sum: { rating: 9 }, _count: { rating: 2 } },
      { productId: 'three', _sum: { rating: 12 }, _count: { rating: 3 } },
      { productId: 'four', _sum: { rating: 18 }, _count: { rating: 4 } },
      { productId: 'five', _sum: { rating: 21 }, _count: { rating: 5 } },
    ])
  );

  assert.deepEqual(summaries.get('one'), { average: 5, count: 1 });
  assert.deepEqual(summaries.get('two'), { average: 4.5, count: 2 });
  assert.deepEqual(summaries.get('three'), { average: 4, count: 3 });
  assert.deepEqual(summaries.get('four'), { average: 4.5, count: 4 });
  assert.deepEqual(summaries.get('five'), { average: 4.2, count: 5 });
  assert.equal(summaries.has('none'), false);
});

test('products with no grouped public reviews have an empty summary at the API mapping boundary', async () => {
  const summaries = await getPublicProductRatingSummaries(['none'], fakeDb([]));
  assert.equal(summaries.has('none'), false);
});