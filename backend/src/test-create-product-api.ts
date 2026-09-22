import axios from 'axios';

async function testCreateProductFlow() {
  const BASE_URL = 'http://localhost:3000/api';
  console.log('=== TESTING PRODUCT CREATION & RETRIEVAL API FLOW ===\n');

  // 1. Admin Login
  console.log('1. Admin Login...');
  let accessToken = '';
  try {
    const loginRes = await axios.post(`${BASE_URL}/admin/auth/login`, {
      email: 'admin@machinichi.com',
      password: 'Admin@123',
    });
    accessToken = loginRes.data.accessToken;
    console.log('   [SUCCESS] Login 200 OK. Token:', !!accessToken);
  } catch (err: any) {
    console.error('   [FAILED] Login error:', err.response?.status, err.response?.data || err.message);
    return;
  }

  // 2. Fetch Category ID
  console.log('\n2. Fetching Category...');
  let categoryId = '';
  try {
    const catRes = await axios.get(`${BASE_URL}/categories`);
    categoryId = catRes.data.data?.[0]?._id;
    console.log('   [SUCCESS] Category ID:', categoryId);
  } catch (err: any) {
    console.error('   [FAILED] Category fetch error:', err.response?.status, err.response?.data || err.message);
    return;
  }

  // 3. Create Product
  console.log('\n3. Creating New Product...');
  const testSku = `TEST-SKU-${Date.now()}`;
  let createdProductId = '';
  try {
    const createRes = await axios.post(
      `${BASE_URL}/admin/products`,
      {
        name: `TEST AUTOMATED PRODUCT ${Date.now()}`,
        brand: 'Machinichi Test',
        category: categoryId,
        sku: testSku,
        hsnCode: '1905',
        mrpPrice: 100,
        sellingPrice: 80,
        costPrice: 50,
        quantity: 50,
        description: 'Automated end-to-end data flow test product.',
        thumbnail: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        images: [{ url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', alt: 'Test' }],
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log('   [SUCCESS] Status:', createRes.status);
    createdProductId = createRes.data.data?._id;
    console.log('   [SUCCESS] Created Product ID:', createdProductId);
    console.log('   [SUCCESS] Created Product PublishStatus:', createRes.data.data?.publishStatus);
  } catch (err: any) {
    console.error('   [FAILED] Create product error:', err.response?.status, err.response?.data || err.message);
    return;
  }

  // 4. Update/Configure Product
  console.log('\n4. Updating/Configuring Product...');
  try {
    const updateRes = await axios.put(
      `${BASE_URL}/admin/products/${createdProductId}`,
      {
        name: `TEST AUTOMATED PRODUCT UPDATED ${Date.now()}`,
        sellingPrice: 85,
        brand: 'Machinichi Premium',
      },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log('   [SUCCESS] Status:', updateRes.status);
    console.log('   [SUCCESS] Updated Product Name:', updateRes.data.data?.name);
    console.log('   [SUCCESS] Updated Product SellingPrice:', updateRes.data.data?.sellingPrice);
  } catch (err: any) {
    console.error('   [FAILED] Update product error:', err.response?.status, err.response?.data || err.message);
  }

  // 5. Publish Product
  console.log('\n5. Publishing Product Live...');
  try {
    const listRes = await axios.post(
      `${BASE_URL}/admin/products/${createdProductId}/list`,
      {},
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log('   [SUCCESS] Status:', listRes.status);
    console.log('   [SUCCESS] Product PublishStatus:', listRes.data.data?.publishStatus);
  } catch (err: any) {
    console.error('   [FAILED] Publish product error:', err.response?.status, err.response?.data || err.message);
  }

  // 6. Verify in Admin Products API
  console.log('\n6. Verifying in Admin Products API (GET /api/admin/products)...');
  try {
    const adminProdRes = await axios.get(`${BASE_URL}/admin/products?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const found = adminProdRes.data.data?.some((p: any) => p._id === createdProductId);
    console.log('   [SUCCESS] Status:', adminProdRes.status);
    console.log('   [SUCCESS] Found newly created product in Admin Products:', found);
  } catch (err: any) {
    console.error('   [FAILED] Admin Products API error:', err.response?.status, err.response?.data || err.message);
  }

  // 7. Verify in Admin Inventory API
  console.log('\n7. Verifying in Admin Inventory API (GET /api/admin/inventory)...');
  try {
    const invRes = await axios.get(`${BASE_URL}/admin/inventory?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const found = invRes.data.data?.some((p: any) => p._id === createdProductId);
    console.log('   [SUCCESS] Status:', invRes.status);
    console.log('   [SUCCESS] Found newly created product in Admin Inventory:', found);
  } catch (err: any) {
    console.error('   [FAILED] Admin Inventory API error:', err.response?.status, err.response?.data || err.message);
  }

  // 8. Verify in Customer Storefront Products API
  console.log('\n8. Verifying in Customer Storefront Products API (GET /api/products)...');
  try {
    const pubRes = await axios.get(`${BASE_URL}/products?page=1&limit=20`);
    const found = pubRes.data.data?.some((p: any) => p._id === createdProductId);
    console.log('   [SUCCESS] Status:', pubRes.status);
    console.log('   [SUCCESS] Found published product in Customer Storefront:', found);
  } catch (err: any) {
    console.error('   [FAILED] Customer Storefront API error:', err.response?.status, err.response?.data || err.message);
  }

  console.log('\n=== END-TO-END FLOW TEST COMPLETE ===');
}

testCreateProductFlow();
