// ==============================================================================
// Ardab Market - Dynamic Category-Based Product Attributes Integration Test Suite
// ==============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma } from '../src/shared/config/database.js';
import { generateAdminToken } from '../src/admin/services/auth.service.js';
import { ADMIN_ROLES } from '../src/admin/constants/adminRoles.js';

const app = createApp();

let superAdminToken = '';
let subAdminToken = '';

test('Dynamic Category-Based Product Attributes Suite', async (suite) => {
  let rootFashion = null;
  let childApparel = null;
  let leafShirts = null;
  let testSupplier = null;
  let createdProductNoWeight = null;
  let createdProductWithAttrs = null;
  let brandAttr = null;
  let sizeAttr = null;
  let warrantyAttr = null;

  suite.before(async () => {
    // Generate admin tokens
    const seededSuperAdmin = await prisma.adminUser.findUnique({
      where: { email: 'admin@ardabmarket.com' },
    });
    const seededSubAdmin = await prisma.adminUser.findUnique({
      where: { email: 'ashurack664@gmail.com' },
    });

    superAdminToken = generateAdminToken({
      id: seededSuperAdmin ? seededSuperAdmin.id : 'superadmin-test-id',
      email: 'admin@ardabmarket.com',
      name: 'Super Admin',
      role: ADMIN_ROLES.SUPER_ADMIN,
    });

    subAdminToken = generateAdminToken({
      id: seededSubAdmin ? seededSubAdmin.id : 'subadmin-test-id',
      email: 'ashurack664@gmail.com',
      name: 'Sub Admin',
      role: ADMIN_ROLES.SUB_ADMIN,
    });

    // Create a temporary active supplier
    testSupplier = await prisma.supplier.create({
      data: {
        companyName: 'Attr Integration Supplier PLC',
        name: 'Test Supplier Rep',
        phone: '+251911998877',
        email: 'attr.supplier@example.com',
        city: 'Gondar',
        address: 'Piazza Mall #12',
        status: 'ACTIVE',
      },
    });

    // Create a 3-level taxonomy via API
    const rootRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        name: 'Test Fashion Taxonomy',
        slug: `test-fashion-${Date.now()}`,
        icon: 'bi-gem',
        description: 'Root fashion category',
      });
    rootFashion = rootRes.body.data;

    const childRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        name: 'Test Men Apparel',
        slug: `test-men-apparel-${Date.now()}`,
        parentId: rootFashion.id,
        icon: 'bi-tag',
      });
    childApparel = childRes.body.data;

    const leafRes = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        name: 'Test Formal Shirts',
        slug: `test-formal-shirts-${Date.now()}`,
        parentId: childApparel.id,
        icon: 'bi-bag',
      });
    leafShirts = leafRes.body.data;

    // Assign categories to testSupplier so product creation passes seller-category relationship check
    await prisma.sellerMarketplaceCategory.createMany({
      data: [
        { sellerId: testSupplier.id, categoryId: rootFashion.id },
        { sellerId: testSupplier.id, categoryId: childApparel.id },
        { sellerId: testSupplier.id, categoryId: leafShirts.id },
      ],
      skipDuplicates: true,
    });
  });

  suite.after(async () => {
    try {
      if (createdProductNoWeight) {
        await prisma.productAttributeValue.deleteMany({ where: { productId: createdProductNoWeight.id } });
        await prisma.product.deleteMany({ where: { id: createdProductNoWeight.id } });
      }
      if (createdProductWithAttrs) {
        await prisma.productAttributeValue.deleteMany({ where: { productId: createdProductWithAttrs.id } });
        await prisma.product.deleteMany({ where: { id: createdProductWithAttrs.id } });
      }
      if (brandAttr) {
        await prisma.categoryAttribute.deleteMany({ where: { attributeDefinitionId: brandAttr.id } });
        await prisma.attributeOption.deleteMany({ where: { attributeDefinitionId: brandAttr.id } });
        await prisma.attributeDefinition.deleteMany({ where: { id: brandAttr.id } });
      }
      if (sizeAttr) {
        await prisma.categoryAttribute.deleteMany({ where: { attributeDefinitionId: sizeAttr.id } });
        await prisma.attributeOption.deleteMany({ where: { attributeDefinitionId: sizeAttr.id } });
        await prisma.attributeDefinition.deleteMany({ where: { id: sizeAttr.id } });
      }
      if (warrantyAttr) {
        await prisma.categoryAttribute.deleteMany({ where: { attributeDefinitionId: warrantyAttr.id } });
        await prisma.attributeDefinition.deleteMany({ where: { id: warrantyAttr.id } });
      }
      if (leafShirts) {
        await prisma.categoryLogisticsConfig.deleteMany({ where: { categoryId: leafShirts.id } });
        await prisma.marketplaceCategory.deleteMany({ where: { id: leafShirts.id } });
      }
      if (childApparel) {
        await prisma.categoryLogisticsConfig.deleteMany({ where: { categoryId: childApparel.id } });
        await prisma.marketplaceCategory.deleteMany({ where: { id: childApparel.id } });
      }
      if (rootFashion) {
        await prisma.categoryLogisticsConfig.deleteMany({ where: { categoryId: rootFashion.id } });
        await prisma.marketplaceCategory.deleteMany({ where: { id: rootFashion.id } });
      }
      if (testSupplier) {
        await prisma.sellerMarketplaceCategory.deleteMany({ where: { sellerId: testSupplier.id } });
        await prisma.supplier.deleteMany({ where: { id: testSupplier.id } });
      }
    } catch (e) {
      console.warn('Cleanup error:', e.message);
    }
  });

  await suite.test('1. Create Attribute Definitions & Options via Library API', async () => {
    // 1a. Create a Brand attribute (TEXT)
    const brandRes = await request(app)
      .post('/api/attributes')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        name: 'Brand Name',
        slug: `brand-name-${Date.now()}`,
        type: 'TEXT',
        description: 'Manufacturer brand name',
      });

    assert.equal(brandRes.status, 201);
    assert.equal(brandRes.body.success, true);
    brandAttr = brandRes.body.data;
    assert.equal(brandAttr.type, 'TEXT');

    // 1b. Create a Size attribute (SELECT with options)
    const sizeRes = await request(app)
      .post('/api/attributes')
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        name: 'Apparel Size',
        slug: `apparel-size-${Date.now()}`,
        type: 'SELECT',
        description: 'Standard garment sizing',
        options: [
          { label: 'Medium', value: 'M', sortOrder: 1 },
          { label: 'Large', value: 'L', sortOrder: 2 },
          { label: 'Extra Large', value: 'XL', sortOrder: 3 },
        ],
      });

    assert.equal(sizeRes.status, 201);
    assert.equal(sizeRes.body.success, true);
    sizeAttr = sizeRes.body.data;
    assert.equal(sizeAttr.options.length, 3);
  });

  await suite.test('2. Configure Root Category Logistics and Attributes', async () => {
    // Assign Brand attribute to rootFashion as REQUIRED
    // Configure logistics: weightMode = NOT_USED, unitOfMeasureMode = NOT_USED
    const updateRes = await request(app)
      .put(`/api/categories/${rootFashion.id}/attributes`)
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        logistics: {
          weightMode: 'NOT_USED',
          unitOfMeasureMode: 'NOT_USED',
          defaultUnit: null,
        },
        attributes: [
          {
            attributeDefinitionId: brandAttr.id,
            isRequired: true,
            isVisible: true,
            sortOrder: 1,
          },
        ],
      });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.success, true);
    assert.equal(updateRes.body.data.logistics.weightMode, 'NOT_USED');
    assert.equal(updateRes.body.data.attributes.length, 1);
  });

  await suite.test('3. Assign Size attribute to childApparel and verify inheritance down to leafShirts', async () => {
    // Assign Size attribute to childApparel
    const childRes = await request(app)
      .put(`/api/categories/${childApparel.id}/attributes`)
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        attributes: [
          {
            attributeDefinitionId: sizeAttr.id,
            isRequired: false,
            isVisible: true,
            sortOrder: 2,
          },
        ],
      });

    assert.equal(childRes.status, 200);
    assert.equal(childRes.body.data.attributes.length, 1);

    // Fetch effective attributes for leafShirts (which has no local attributes defined)
    const effectiveRes = await request(app)
      .get(`/api/categories/${leafShirts.id}/effective-attributes`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(effectiveRes.status, 200);
    assert.equal(effectiveRes.body.success, true);

    const data = effectiveRes.body.data;
    // Verify logistics inherited from root
    assert.equal(data.logistics.weightMode, 'NOT_USED');
    assert.equal(data.logistics.unitOfMeasureMode, 'NOT_USED');

    // Verify both Brand (inherited from Root) and Size (inherited from Child) are resolved
    assert.equal(data.attributes.length, 2);
    const attrIds = data.attributes.map((a) => a.attributeDefinitionId);
    assert.ok(attrIds.includes(brandAttr.id));
    assert.ok(attrIds.includes(sizeAttr.id));

    const brandItem = data.attributes.find((a) => a.attributeDefinitionId === brandAttr.id);
    assert.equal(brandItem.source, 'INHERITED');
    assert.equal(brandItem.originCategoryId, rootFashion.id);
    assert.equal(brandItem.isRequired, true);

    const sizeItem = data.attributes.find((a) => a.attributeDefinitionId === sizeAttr.id);
    assert.equal(sizeItem.source, 'INHERITED');
    assert.equal(sizeItem.originCategoryId, childApparel.id);
    assert.equal(sizeItem.isRequired, false);
  });

  await suite.test('4. Product Creation Validation: Rejects missing required attribute', async () => {
    // Attempt creating product under leafShirts without required Brand attribute
    const failRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Formal White Shirt',
        sellerId: testSupplier.id,
        marketplaceCategoryId: leafShirts.id,
        sellingPrice: 1200,
        // Brand attribute is omitted
        attributeValues: [],
      });

    assert.equal(failRes.status, 400);
    assert.equal(failRes.body.success, false);
    const errMsg = failRes.body.error ? failRes.body.error.message : failRes.body.message;
    assert.match(errMsg, /Brand Name/);
  });

  await suite.test('5. Product Creation Success: Null weight/unit for NOT_USED mode and stores attribute values', async () => {
    const selectedSizeOption = sizeAttr.options[0]; // Medium

    const createRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Formal White Shirt Premium',
        sellerId: testSupplier.id,
        marketplaceCategoryId: leafShirts.id,
        sellingPrice: 1500,
        costPrice: 900,
        // weight and unit omitted because logistics is NOT_USED
        attributeValues: [
          {
            attributeDefinitionId: brandAttr.id,
            valueText: 'Giorgio Armani',
          },
          {
            attributeDefinitionId: sizeAttr.id,
            optionId: selectedSizeOption.id,
          },
        ],
      });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.success, true);
    createdProductWithAttrs = createRes.body.data;

    // Verify weight and unit are null
    assert.equal(createdProductWithAttrs.weight, null);
    assert.equal(createdProductWithAttrs.unit, null);

    // Verify attributes returned on product
    assert.equal(createdProductWithAttrs.attributeValues.length, 2);

    // Fetch product by ID to test full retrieval
    const getRes = await request(app)
      .get(`/api/products/${createdProductWithAttrs.id}`)
      .set('Authorization', `Bearer ${superAdminToken}`);

    assert.equal(getRes.status, 200);
    const fetchedProduct = getRes.body.data;
    assert.equal(fetchedProduct.weight, null);
    assert.equal(fetchedProduct.unit, null);
    assert.equal(fetchedProduct.attributeValues.length, 2);

    const brandVal = fetchedProduct.attributeValues.find((v) => v.attributeDefinitionId === brandAttr.id);
    assert.equal(brandVal.valueText, 'Giorgio Armani');

    const sizeVal = fetchedProduct.attributeValues.find((v) => v.attributeDefinitionId === sizeAttr.id);
    assert.equal(sizeVal.optionId, selectedSizeOption.id);
    assert.equal(sizeVal.optionValue, 'M');
  });

  await suite.test('6. Overriding logistics at leaf level: REQUIRED weight and unit', async () => {
    // Configure leaf category to REQUIRE weight and unit
    await request(app)
      .put(`/api/categories/${leafShirts.id}/attributes`)
      .set('Authorization', `Bearer ${subAdminToken}`)
      .send({
        logistics: {
          weightMode: 'REQUIRED',
          unitOfMeasureMode: 'REQUIRED',
          defaultUnit: 'piece',
        },
      });

    // Attempt creating product without weight and unit
    const failRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Packaged Heavy Garment',
        sellerId: testSupplier.id,
        marketplaceCategoryId: leafShirts.id,
        sellingPrice: 800,
        attributeValues: [
          { attributeDefinitionId: brandAttr.id, valueText: 'Zara' },
        ],
      });

    assert.equal(failRes.status, 400);
    const errMsg = failRes.body.error ? failRes.body.error.message : failRes.body.message;
    assert.match(errMsg, /(Unit of measure|weight)/i);

    // Provide weight and unit
    const successRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        name: 'Packaged Heavy Garment',
        sellerId: testSupplier.id,
        marketplaceCategoryId: leafShirts.id,
        sellingPrice: 800,
        weight: 0.45,
        unit: 'piece',
        attributeValues: [
          { attributeDefinitionId: brandAttr.id, valueText: 'Zara' },
        ],
      });

    assert.equal(successRes.status, 201);
    createdProductNoWeight = successRes.body.data;
    assert.equal(createdProductNoWeight.weight, 0.45);
    assert.equal(createdProductNoWeight.unit, 'piece');
  });
});
