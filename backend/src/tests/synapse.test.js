import http from 'http';
import app from '../app.js';
import { closePool } from '../config/db.js';
import { closeRedis } from '../config/redis.js';

const TEST_PORT = 5056;
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
  console.log('\n🚀 Starting Day 3 Synapse Notes & Binary Conversion Engine Test Suite...\n');

  server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[Test Server] Listening on ${BASE_URL}`);

  try {
    // 1. Setup User A and User B
    console.log('\n--- 1. Auth Setup for Multi-User Testing ---');
    const userARes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `usera_${Date.now()}@syncspace.io`,
        password: 'Password123',
        full_name: 'User A',
      }),
    });
    const userAData = await userARes.json();
    const tokenA = userAData.data.token;
    const userAId = userAData.data.user.id;

    const userBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `userb_${Date.now()}@syncspace.io`,
        password: 'Password123',
        full_name: 'User B',
      }),
    });
    const userBData = await userBRes.json();
    const tokenB = userBData.data.token;

    assert(!!tokenA && !!tokenB, 'Successfully created User A and User B');

    // 2. Note Creation Validation
    console.log('\n--- 2. Synapse Note Validation ---');
    const invalidNoteRes = await fetch(`${BASE_URL}/api/synapses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ title: '' }), // Missing required non-empty title
    });
    assert(invalidNoteRes.status === 400, 'Rejects empty title with 400 Validation Error');

    // 3. Create Rapid-Capture Markdown Notes
    console.log('\n--- 3. Synapse Note Creation ---');
    const note1Res = await fetch(`${BASE_URL}/api/synapses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Architectural Decisions for Redis Caching',
        content: '## Key Points\n- Multi-tier cache\n- 500+ concurrent throughput\n- Sub-50ms latency',
        tags: ['architecture', 'backend', 'performance'],
        is_pinned: false,
      }),
    });
    const note1Data = await note1Res.json();
    assert(note1Res.status === 201, 'Creates Markdown note with 201 Created');
    assert(note1Data.data.note.title === 'Architectural Decisions for Redis Caching', 'Preserves note title');
    assert(note1Data.data.note.tags.length === 3, 'Preserves note tags');
    assert(note1Data.data.note.converted_to_task_id === null, 'Initial converted_to_task_id is null');
    const note1Id = note1Data.data.note.id;

    // Create a second pinned note
    const note2Res = await fetch(`${BASE_URL}/api/synapses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Buy Groceries & Protein',
        content: '- Milk\n- Eggs\n- Chicken breast',
        tags: ['personal', 'shopping'],
        is_pinned: true,
      }),
    });
    const note2Data = await note2Res.json();
    const note2Id = note2Data.data.note.id;
    assert(note2Res.status === 201, 'Creates second pinned note');

    // 4. Fetch Single Note
    console.log('\n--- 4. Fetch Note by ID ---');
    const getSingleRes = await fetch(`${BASE_URL}/api/synapses/${note1Id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const singleData = await getSingleRes.json();
    assert(getSingleRes.status === 200, 'Fetches note by ID with 200 OK');
    assert(singleData.data.note.id === note1Id, 'Returned note ID matches');

    // 5. Fetch Notes List & Search
    console.log('\n--- 5. Note Listing, Sorting & Tags ---');
    const listRes = await fetch(`${BASE_URL}/api/synapses`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listData = await listRes.json();
    assert(listRes.status === 200, 'Lists notes with 200 OK');
    assert(listData.data.notes.length === 2, 'Lists both created notes');
    assert(listData.data.notes[0].is_pinned === true, 'Pinned notes sorted to the top');

    // 6. Filter by Tag
    const tagFilterRes = await fetch(`${BASE_URL}/api/synapses?tag=architecture`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const tagFilterData = await tagFilterRes.json();
    assert(tagFilterRes.status === 200, 'Filters notes by tag');
    assert(tagFilterData.data.notes.length === 1 && tagFilterData.data.notes[0].id === note1Id, 'Returns only architecture tagged note');

    // 7. Search Text
    const searchRes = await fetch(`${BASE_URL}/api/synapses?search=Groceries`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'Searches notes by text');
    assert(searchData.data.notes.length === 1 && searchData.data.notes[0].id === note2Id, 'Returns matched note');

    // 8. Distinct Tags
    console.log('\n--- 6. Tag Aggregation Cloud ---');
    const tagsRes = await fetch(`${BASE_URL}/api/synapses/tags`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const tagsData = await tagsRes.json();
    assert(tagsRes.status === 200, 'Fetches distinct tag list');
    assert(tagsData.data.tags.includes('architecture') && tagsData.data.tags.includes('shopping'), 'Returns all unique user tags');

    // 9. Update Note
    console.log('\n--- 7. Note Update ---');
    const updateRes = await fetch(`${BASE_URL}/api/synapses/${note1Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Architectural Decisions for Redis Caching v2',
        is_pinned: true,
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Updates note with 200 OK');
    assert(updateData.data.note.title === 'Architectural Decisions for Redis Caching v2', 'Updated title saved');
    assert(updateData.data.note.is_pinned === true, 'Updated pinned status saved');

    // 10. Atomic Binary Conversion Engine
    console.log('\n--- 8. Atomic Binary Conversion Engine ---');
    const convertRes = await fetch(`${BASE_URL}/api/synapses/${note2Id}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        due_date: '2026-08-25',
        due_time: '18:00',
        priority: 'high',
        archive_note: true,
      }),
    });
    const convertData = await convertRes.json();
    assert(convertRes.status === 201, 'Converts note to task with 201 Created');
    assert(!!convertData.data.task.id, 'Created new scheduled task');
    assert(convertData.data.task.synapse_id === note2Id, 'Task references synapse note ID');
    assert(convertData.data.task.priority === 'high', 'Task priority assigned correctly');
    assert(convertData.data.task.due_date === '2026-08-25', 'Task due date assigned correctly');
    assert(convertData.data.synapse.converted_to_task_id === convertData.data.task.id, 'Synapse note converted_to_task_id is populated');
    assert(convertData.data.synapse.is_archived === true, 'Synapse note archived upon conversion');

    // 11. Multi-User Access Isolation
    console.log('\n--- 9. Multi-Tenant Security & Isolation ---');
    const crossGetRes = await fetch(`${BASE_URL}/api/synapses/${note1Id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(crossGetRes.status === 404, 'User B cannot access User A notes');

    const crossConvertRes = await fetch(`${BASE_URL}/api/synapses/${note1Id}/convert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({
        due_date: '2026-08-26',
      }),
    });
    assert(crossConvertRes.status === 404, 'User B cannot convert User A notes');

    const crossDeleteRes = await fetch(`${BASE_URL}/api/synapses/${note1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(crossDeleteRes.status === 404, 'User B cannot delete User A notes');

    // 12. Delete Note
    console.log('\n--- 10. Note Deletion ---');
    const deleteRes = await fetch(`${BASE_URL}/api/synapses/${note1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(deleteRes.status === 200, 'Deletes note with 200 OK');

    const checkDeletedRes = await fetch(`${BASE_URL}/api/synapses/${note1Id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(checkDeletedRes.status === 404, 'Deleted note is no longer retrievable');

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
