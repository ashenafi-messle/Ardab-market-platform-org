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
    ['one', 'two', 'three', 'four', 'five', 'single_4', 'three_unrounded', 'four_even'],
    fakeDb([
      { productId: 'one', _sum: { rating: 5 }, _count: { rating: 1 } },
      { productId: 'two', _sum: { rating: 9 }, _count: { rating: 2 } },
      { productId: 'three', _sum: { rating: 12 }, _count: { rating: 3 } },
      { productId: 'four', _sum: { rating: 18 }, _count: { rating: 4 } },
      { productId: 'five', _sum: { rating: 21 }, _count: { rating: 5 } },
      { productId: 'single_4', _sum: { rating: 4 }, _count: { rating: 1 } },
      { productId: 'three_unrounded', _sum: { rating: 14 }, _count: { rating: 3 } },
      { productId: 'four_even', _sum: { rating: 16 }, _count: { rating: 4 } },
    ])
  );

  // 1 review: 5 -> 5.0 (1)
  assert.deepEqual(summaries.get('one'), { average: 5, count: 1 });
  assert.equal(summaries.get('one').average.toFixed(1), '5.0');

  // 2 reviews: 4, 5 -> 4.5 (2)
  assert.deepEqual(summaries.get('two'), { average: 4.5, count: 2 });
  assert.equal(summaries.get('two').average.toFixed(1), '4.5');

  // 3 reviews: 3, 4, 5 -> 4.0 (3)
  assert.deepEqual(summaries.get('three'), { average: 4, count: 3 });
  assert.equal(summaries.get('three').average.toFixed(1), '4.0');

  // 4 reviews: 5, 5, 4, 4 -> 4.5 (4)
  assert.deepEqual(summaries.get('four'), { average: 4.5, count: 4 });
  assert.equal(summaries.get('four').average.toFixed(1), '4.5');

  // 5 reviews: 5, 4, 3, 5, 4 -> 4.2 (5)
  assert.deepEqual(summaries.get('five'), { average: 4.2, count: 5 });
  assert.equal(summaries.get('five').average.toFixed(1), '4.2');

  // 1 review: 4 -> 4.0 (1)
  assert.deepEqual(summaries.get('single_4'), { average: 4, count: 1 });
  assert.equal(summaries.get('single_4').average.toFixed(1), '4.0');

  // 3 reviews: 4, 5, 5 -> 14/3 = 4.666... -> display 4.7 (3)
  const threeUnrounded = summaries.get('three_unrounded');
  assert.equal(threeUnrounded.count, 3);
  assert.equal(threeUnrounded.average, 14 / 3);
  assert.equal(threeUnrounded.average.toFixed(1), '4.7');

  // 4 reviews: 2, 4, 5, 5 -> 16/4 = 4.0 (4)
  const fourEven = summaries.get('four_even');
  assert.equal(fourEven.count, 4);
  assert.equal(fourEven.average, 4);
  assert.equal(fourEven.average.toFixed(1), '4.0');

  assert.equal(summaries.has('none'), false);
});

test('products with no grouped public reviews have an empty summary at the API mapping boundary', async () => {
  const summaries = await getPublicProductRatingSummaries(['none'], fakeDb([]));
  assert.equal(summaries.has('none'), false);
});