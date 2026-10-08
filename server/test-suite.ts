import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = 'http://localhost:5001';
const PROXY_BASE = 'http://localhost:3000';

interface TestResult {
  category: 'DATABASE' | 'CONNECTION' | 'API' | 'UI_PROXY';
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function recordTest(category: TestResult['category'], name: string, passed: boolean, details?: string, error?: string) {
  results.push({ category, name, passed, details, error });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [${category}] ${name}${details ? ` -> ${details}` : ''}${error ? ` (Error: ${error})` : ''}`);
}

async function runAllTests() {
  console.log('===========================================================');
  console.log('🧪 Starting Full System Test Suite: DB, API & UI Proxy');
  console.log('===========================================================');

  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '3306', 10);
  const dbUser = process.env.DB_USER || 'root';
  const dbPassword = process.env.DB_PASSWORD || '12345678';
  const dbName = process.env.DB_NAME || 'db_system_ap';

  // 1. Direct MySQL Connection Test
  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
      database: dbName,
    });
    recordTest('CONNECTION', 'MySQL Socket Connection', true, `Connected to ${dbUser}@${dbHost}:${dbPort}/${dbName}`);
  } catch (err: any) {
    recordTest('CONNECTION', 'MySQL Socket Connection', false, undefined, err.message);
  }

  // 2. Database Tables & Schema Test
  if (conn) {
    const requiredTables = [
      'vendors',
      'invoices',
      'invoice_line_items',
      'partial_payments',
      'daily_payments',
      'audit_logs'
    ];

    try {
      const [rows]: any = await conn.query('SHOW TABLES');
      const tableNames = rows.map((r: any) => Object.values(r)[0]);
      
      for (const t of requiredTables) {
        if (tableNames.includes(t)) {
          recordTest('DATABASE', `Table exists: ${t}`, true);
        } else {
          recordTest('DATABASE', `Table exists: ${t}`, false, undefined, `Missing table ${t}`);
        }
      }
    } catch (err: any) {
      recordTest('DATABASE', 'Check Tables Query', false, undefined, err.message);
    }
    await conn.end();
  }

  // 3. API Health Endpoint Test
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    if (res.ok && data.status === 'ok' && data.database?.connected) {
      recordTest('API', 'GET /api/health (Server & DB Status)', true, `Connected DB: ${data.database.name}`);
    } else {
      recordTest('API', 'GET /api/health', false, undefined, JSON.stringify(data));
    }
  } catch (err: any) {
    recordTest('API', 'GET /api/health', false, undefined, err.message);
  }

  // 4. Vendors API Flow: CREATE, READ, DELETE
  const testVendorId = `test_vnd_${Date.now()}`;
  try {
    // POST /api/vendors
    const postRes = await fetch(`${API_BASE}/api/vendors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testVendorId,
        name: 'Unit Test Supplier Inc',
        category: 'Electronics',
        taxId: 'TAX-UT-999',
        email: 'test@unittest.com',
        phone: '+85512999888',
        address: 'Test Street 101',
        bankName: 'ABA Bank',
        bankRoutingNumber: 'ABA001',
        bankAccountNumber: '123456789',
        defaultPaymentMethod: 'aba_pay',
        defaultPaymentTerms: 'Net 30',
        rating: 5,
        status: 'active',
        contactPerson: 'Unit Tester',
      }),
    });
    const postData = await postRes.json();
    recordTest('API', 'POST /api/vendors (Create Vendor)', postRes.ok && postData.success, `ID: ${testVendorId}`);

    // GET /api/vendors
    const getRes = await fetch(`${API_BASE}/api/vendors`);
    const vendors = await getRes.json();
    const foundVendor = Array.isArray(vendors) && vendors.some((v: any) => v.id === testVendorId);
    recordTest('API', 'GET /api/vendors (Read Vendors)', foundVendor, `Found created vendor in ${vendors.length} vendors`);

    // DELETE /api/vendors/:id
    const delRes = await fetch(`${API_BASE}/api/vendors/${testVendorId}`, { method: 'DELETE' });
    const delData = await delRes.json();
    recordTest('API', 'DELETE /api/vendors/:id (Delete Vendor)', delRes.ok && delData.success);
  } catch (err: any) {
    recordTest('API', 'Vendors CRUD Flow', false, undefined, err.message);
  }

  // 5. Invoices API Flow: CREATE, READ, RECORD PAYMENT, DELETE
  const testInvId = `test_inv_${Date.now()}`;
  const testInvNumber = `INV-UT-${Date.now().toString().slice(-6)}`;
  try {
    // POST /api/invoices
    const postRes = await fetch(`${API_BASE}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testInvId,
        invoiceNumber: testInvNumber,
        vendorId: 'vnd_sample_01',
        vendorName: 'Unit Test Supplier',
        vendorCategory: 'Food',
        issueDate: '2026-10-01',
        dueDate: '2026-10-31',
        currency: 'USD',
        subtotal: 500,
        taxAmount: 50,
        totalAmount: 550,
        baseAmountUSD: 550,
        status: 'approved',
        paymentTerms: 'Net 30',
        department: 'Operations',
        assignedApproverRole: 'cfo',
        threeWayMatched: true,
        lineItems: [
          {
            id: `li_${Date.now()}`,
            description: 'Item A',
            quantity: 5,
            unitPrice: 100,
            taxRate: 10,
            totalPrice: 500,
          },
        ],
      }),
    });
    const postData = await postRes.json();
    recordTest('API', 'POST /api/invoices (Create Invoice)', postRes.ok && postData.success, `Number: ${testInvNumber}`);

    // GET /api/invoices
    const getRes = await fetch(`${API_BASE}/api/invoices`);
    const invoices = await getRes.json();
    const foundInv = Array.isArray(invoices) && invoices.find((i: any) => i.id === testInvId);
    recordTest('API', 'GET /api/invoices (Read Invoices & Line Items)', !!foundInv && foundInv.lineItems?.length === 1, `Items: ${foundInv?.lineItems?.length}`);

    // POST /api/invoices/:id/payments
    const payRes = await fetch(`${API_BASE}/api/invoices/${testInvId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 250,
        amountUSD: 250,
        paymentDate: '2026-10-04',
        paymentMethod: 'aba_pay',
        reference: 'ABA-REF-12345',
        notes: 'Partial payment 1',
        recordedBy: 'Tester',
      }),
    });
    const payData = await payRes.json();
    recordTest(
      'API',
      'POST /api/invoices/:id/payments (Record Payment & Calc Balance)',
      payRes.ok && payData.remainingBalance === 300 && payData.status === 'partially_paid',
      `Remaining balance: $${payData.remainingBalance}, Status: ${payData.status}`
    );

    // DELETE /api/invoices/:id
    const delRes = await fetch(`${API_BASE}/api/invoices/${testInvId}`, { method: 'DELETE' });
    const delData = await delRes.json();
    recordTest('API', 'DELETE /api/invoices/:id (Delete Invoice & Cascade)', delRes.ok && delData.success);
  } catch (err: any) {
    recordTest('API', 'Invoices CRUD Flow', false, undefined, err.message);
  }

  // 6. Daily Payments API Flow: CREATE, READ, DELETE
  const testDpId = `test_dp_${Date.now()}`;
  try {
    // POST /api/daily-payments
    const postRes = await fetch(`${API_BASE}/api/daily-payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: testDpId,
        date: '2026-10-04',
        supplier: 'Daily Test Supplier',
        amount: 120.50,
        paymentMethod: 'cash',
        reference: 'RCPT-0099',
        notes: 'Testing daily payment',
      }),
    });
    const postData = await postRes.json();
    recordTest('API', 'POST /api/daily-payments (Create Daily Payment)', postRes.ok && postData.success);

    // GET /api/daily-payments
    const getRes = await fetch(`${API_BASE}/api/daily-payments`);
    const dailyPayments = await getRes.json();
    const foundDp = Array.isArray(dailyPayments) && dailyPayments.some((dp: any) => dp.id === testDpId);
    recordTest('API', 'GET /api/daily-payments (Read Daily Payments)', foundDp);

    // DELETE /api/daily-payments/:id
    const delRes = await fetch(`${API_BASE}/api/daily-payments/${testDpId}`, { method: 'DELETE' });
    const delData = await delRes.json();
    recordTest('API', 'DELETE /api/daily-payments/:id (Delete Daily Payment)', delRes.ok && delData.success);
  } catch (err: any) {
    recordTest('API', 'Daily Payments CRUD Flow', false, undefined, err.message);
  }

  // 7. UI Proxy Test (Frontend Port 3000 -> Backend Port 5001)
  try {
    const proxyRes = await fetch(`${PROXY_BASE}/api/health`);
    const proxyData = await proxyRes.json();
    recordTest(
      'UI_PROXY',
      'Vite Dev Proxy (:3000/api -> :5001/api)',
      proxyRes.ok && proxyData.status === 'ok',
      'UI successfully proxies API requests to backend'
    );
  } catch (err: any) {
    recordTest('UI_PROXY', 'Vite Dev Proxy (:3000/api)', false, undefined, err.message);
  }

  console.log('===========================================================');
  console.log('📊 Test Summary');
  console.log('===========================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total Tests : ${results.length}`);
  console.log(`Passed      : ${passedCount}`);
  console.log(`Failed      : ${failedCount}`);
  console.log('===========================================================');

  if (failedCount > 0) {
    console.log('❌ Issues Found:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`- [${r.category}] ${r.name}: ${r.error || 'Check details'}`);
    });
  } else {
    console.log('🎉 ALL TESTS PASSED! No issues found.');
  }
}

runAllTests();
