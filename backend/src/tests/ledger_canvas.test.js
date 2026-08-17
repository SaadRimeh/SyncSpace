import http from 'http';
import app from '../app.js';
import { closePool } from '../config/db.js';
import { closeRedis } from '../config/redis.js';

const TEST_PORT = 5058;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;
let passedTests = 0;
let totalTests = 0;

const assert = (condition, message) => {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
};

const runTests = async () => {
  console.log('\n🚀 Starting Day 5 Nano-Ledger & The Daily Canvas Test Suite...\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[Test Server] Listening on ${BASE_URL}`);

  try {
    // 1. Auth Setup
    console.log('\n--- 1. Auth Setup for Multi-User Testing ---');
    const userARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `canvas_user_a_${Date.now()}@syncspace.io`,
        password: 'Password123',
        full_name: 'Canvas User A',
        currency: 'USD',
        timezone: 'America/New_York',
      }),
    });
    const userAData = await userARes.json();
    const tokenA = userAData.data.token;

    const userBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `canvas_user_b_${Date.now()}@syncspace.io`,
        password: 'Password123',
        full_name: 'Canvas User B',
      }),
    });
    const userBData = await userBRes.json();
    const tokenB = userBData.data.token;

    assert(!!tokenA && !!tokenB, 'Created User A and User B');

    // ================= NANO-LEDGER CATEGORIES =================
    console.log('\n--- 2. Nano-Ledger Category Management ---');
    const invalidCatRes = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ name: '', type: 'expense' }),
    });
    assert(invalidCatRes.status === 400, 'Rejects empty category name with 400');

    // Create Expense Category
    const expenseCatRes = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Cloud Infrastructure',
        type: 'expense',
        color_hex: '#3B82F6',
        icon_name: 'server',
        monthly_budget_limit: 500,
      }),
    });
    const expenseCatData = await expenseCatRes.json();
    assert(expenseCatRes.status === 201, 'Creates Expense category with 201 Created');
    assert(expenseCatData.data.category.name === 'Cloud Infrastructure', 'Preserves category name');
    assert(expenseCatData.data.category.monthly_budget_limit === 500, 'Preserves monthly budget limit');
    const expenseCatId = expenseCatData.data.category.id;

    // Create Income Category
    const incomeCatRes = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Consulting Salary',
        type: 'income',
        color_hex: '#10B981',
        icon_name: 'briefcase',
      }),
    });
    const incomeCatData = await incomeCatRes.json();
    assert(incomeCatRes.status === 201, 'Creates Income category with 201 Created');
    const incomeCatId = incomeCatData.data.category.id;

    // Duplicate Prevention
    const duplicateCatRes = await fetch(`${BASE_URL}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        name: 'Cloud Infrastructure',
        type: 'expense',
      }),
    });
    assert(duplicateCatRes.status === 409, 'Rejects duplicate category with 409 Conflict');

    // List Categories
    const listCatRes = await fetch(`${BASE_URL}/api/categories`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listCatData = await listCatRes.json();
    assert(listCatRes.status === 200, 'Lists categories with 200 OK');
    assert(listCatData.data.categories.length === 2, 'Returns both created categories');

    // ================= TRANSACTIONS & ANALYTICS =================
    console.log('\n--- 3. Transactions & Financial Analytics ---');
    const todayStr = new Date().toISOString().split('T')[0];

    // Invalid negative amount
    const invalidTxRes = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        amount: -50,
        type: 'expense',
      }),
    });
    assert(invalidTxRes.status === 400, 'Rejects negative transaction amount with 400');

    // Record Income
    const incomeTxRes = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        amount: 4500,
        type: 'income',
        category_id: incomeCatId,
        transaction_date: todayStr,
        note: 'Monthly contract payout',
      }),
    });
    const incomeTxData = await incomeTxRes.json();
    assert(incomeTxRes.status === 201, 'Records Income transaction with 201 Created');
    assert(incomeTxData.data.transaction.amount === 4500, 'Preserves income amount');

    // Record Expense 1 (Cloud Infra)
    const expenseTx1Res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        amount: 120,
        type: 'expense',
        category_id: expenseCatId,
        transaction_date: todayStr,
        note: 'AWS Production instances',
      }),
    });
    const expenseTx1Data = await expenseTx1Res.json();
    assert(expenseTx1Res.status === 201, 'Records Expense transaction with 201 Created');
    const tx1Id = expenseTx1Data.data.transaction.id;

    // Record Expense 2 (Uncategorized)
    const expenseTx2Res = await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        amount: 80,
        type: 'expense',
        transaction_date: todayStr,
        note: 'Team lunch',
      }),
    });
    assert(expenseTx2Res.status === 201, 'Records second expense transaction');

    // List Transactions with Joins
    const listTxRes = await fetch(`${BASE_URL}/api/transactions`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listTxData = await listTxRes.json();
    assert(listTxRes.status === 200, 'Lists transactions with 200 OK');
    assert(listTxData.data.transactions.length === 3, 'Returns all 3 transactions');
    const cloudTx = listTxData.data.transactions.find((t) => t.id === tx1Id);
    assert(cloudTx.category_name === 'Cloud Infrastructure', 'Enriches transaction with joined category name');

    // Monthly Financial Summary
    console.log('\n--- 4. Monthly Financial Analytics ---');
    const monthlySummaryRes = await fetch(`${BASE_URL}/api/transactions/stats/monthly`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const monthlySummaryData = await monthlySummaryRes.json();
    assert(monthlySummaryRes.status === 200, 'Fetches monthly financial summary with 200 OK');
    assert(monthlySummaryData.data.summary.total_income === 4500, 'Total income is $4,500');
    assert(monthlySummaryData.data.summary.total_expense === 200, 'Total expense is $200');
    assert(monthlySummaryData.data.summary.net_savings === 4300, 'Net savings is $4,300');
    assert(monthlySummaryData.data.summary.category_breakdown.length >= 1, 'Includes spending breakdown by category');

    // ================= THE DAILY CANVAS AGGREGATOR =================
    console.log('\n--- 5. Setup Data for The Daily Canvas ---');
    // Create a note
    await fetch(`${BASE_URL}/api/synapses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Canvas Key Highlights',
        content: 'Unified dashboard architecture',
        is_pinned: true,
      }),
    });

    // Create a task for today
    await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Review High-Concurrency Benchmarks',
        priority: 'urgent',
        due_date: todayStr,
      }),
    });

    // Create a habit and check-in
    const habitRes = await fetch(`${BASE_URL}/api/habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Focus Hour',
        color_hex: '#6366F1',
      }),
    });
    const habitData = await habitRes.json();
    const habitId = habitData.data.habit.id;
    await fetch(`${BASE_URL}/api/habits/${habitId}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ log_date: todayStr }),
    });

    console.log('\n--- 6. The Daily Canvas Aggregator API ---');
    // First Call (Uncached compute)
    const canvasRes1 = await fetch(`${BASE_URL}/api/canvas/today`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const canvasData1 = await canvasRes1.json();
    assert(canvasRes1.status === 200, 'Fetches Daily Canvas with 200 OK');
    assert(canvasData1.data.canvas.user.full_name === 'Canvas User A', 'Includes user profile');
    assert(canvasData1.data.canvas.user.currency === 'USD', 'Includes user currency preference');
    assert(canvasData1.data.canvas.synapse.pinned_notes.length >= 1, 'Includes Synapse pinned notes');
    assert(canvasData1.data.canvas.tasks.today_tasks.length >= 1, 'Includes today scheduled tasks');
    assert(canvasData1.data.canvas.habits.today_habits.length >= 1, 'Includes today active habits');
    assert(canvasData1.data.canvas.habits.completed_habits === 1, 'Tracks habit completion for today');
    assert(canvasData1.data.canvas.ledger.today_spent === 200, 'Includes today spending total ($200)');
    assert(canvasData1.data.canvas.ledger.month_budget === 500, 'Includes monthly budget limit ($500)');
    assert(canvasData1.data.canvas._cached === false, 'First fetch is computed live (_cached: false)');

    // Second Call (Redis Cache Hit)
    const canvasRes2 = await fetch(`${BASE_URL}/api/canvas/today`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const canvasData2 = await canvasRes2.json();
    assert(canvasRes2.status === 200, 'Second fetch returns 200 OK');
    assert(canvasData2.data.canvas._cached === true, 'Second fetch served from Redis cache (_cached: true)');

    // Invalidation Test: Create another expense transaction
    console.log('\n--- 7. Reactive Cache Invalidation ---');
    await fetch(`${BASE_URL}/api/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        amount: 50,
        type: 'expense',
        transaction_date: todayStr,
      }),
    });

    // Fetch Canvas after mutation -> should be fresh
    const canvasRes3 = await fetch(`${BASE_URL}/api/canvas/today`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const canvasData3 = await canvasRes3.json();
    assert(canvasData3.data.canvas._cached === false, 'Cache invalidated on new transaction (_cached: false)');
    assert(canvasData3.data.canvas.ledger.today_spent === 250, 'Updated today spent reflects mutation ($250)');

    // ================= MULTI-TENANT ISOLATION =================
    console.log('\n--- 8. Multi-Tenant Security & Deletion ---');
    const crossCanvasRes = await fetch(`${BASE_URL}/api/canvas/today`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const crossCanvasData = await crossCanvasRes.json();
    assert(crossCanvasData.data.canvas.user.full_name === 'Canvas User B', 'User B receives isolated canvas');
    assert(crossCanvasData.data.canvas.ledger.today_spent === 0, 'User B has $0 spent');
    assert(crossCanvasData.data.canvas.tasks.today_tasks.length === 0, 'User B has 0 tasks');

    // Clean up
    const deleteCatRes = await fetch(`${BASE_URL}/api/categories/${expenseCatId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(deleteCatRes.status === 200, 'Deletes category with 200 OK');

    const deleteTxRes = await fetch(`${BASE_URL}/api/transactions/${tx1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(deleteTxRes.status === 200, 'Deletes transaction with 200 OK');

    console.log(`\n🎉 All ${passedTests}/${totalTests} tests passed successfully!\n`);
  } catch (err) {
    console.error('\n❌ Test suite failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await closePool();
    await closeRedis();
  }
};

runTests();
