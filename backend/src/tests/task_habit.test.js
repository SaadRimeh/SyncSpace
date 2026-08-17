import http from 'http';
import app from '../app.js';
import { closePool } from '../config/db.js';
import { closeRedis } from '../config/redis.js';

const TEST_PORT = 5057;
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
  console.log('\n🚀 Starting Day 4 Task Engine & Habit Matrix Test Suite...\n');

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
        email: `taskuser_a_${Date.now()}@syncspace.io`,
        password: 'Password123',
        full_name: 'Task User A',
      }),
    });
    const userAData = await userARes.json();
    const tokenA = userAData.data.token;

    const userBRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `taskuser_b_${Date.now()}@syncspace.io`,
        password: 'Password123',
        full_name: 'Task User B',
      }),
    });
    const userBData = await userBRes.json();
    const tokenB = userBData.data.token;

    assert(!!tokenA && !!tokenB, 'Created User A and User B');

    // ================= TASK ENGINE TESTS =================
    console.log('\n--- 2. Task Engine Validation ---');
    const invalidTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ title: '' }),
    });
    assert(invalidTaskRes.status === 400, 'Rejects task without title with 400');

    console.log('\n--- 3. Task Creation & Priority Scheduling ---');
    const todayStr = new Date().toISOString().split('T')[0];
    const task1Res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Complete PostgreSQL Query Tuning',
        description: 'Optimize index scans for 500+ users',
        priority: 'urgent',
        due_date: todayStr,
        due_time: '16:00',
      }),
    });
    const task1Data = await task1Res.json();
    assert(task1Res.status === 201, 'Creates scheduled task with 201 Created');
    assert(task1Data.data.task.priority === 'urgent', 'Task priority set to urgent');
    assert(task1Data.data.task.status === 'todo', 'Initial task status is todo');
    assert(task1Data.data.task.completed_at === null, 'Initial completed_at is null');
    const task1Id = task1Data.data.task.id;

    // Create a second task
    const task2Res = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Review System Metrics',
        priority: 'low',
        due_date: todayStr,
      }),
    });
    const task2Data = await task2Res.json();
    const task2Id = task2Data.data.task.id;
    assert(task2Res.status === 201, 'Creates second task');

    // 4. List Tasks & Filtering
    console.log('\n--- 4. List Tasks & Ordering ---');
    const listTasksRes = await fetch(`${BASE_URL}/api/tasks?due_date=${todayStr}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const listTasksData = await listTasksRes.json();
    assert(listTasksRes.status === 200, 'Lists tasks with 200 OK');
    assert(listTasksData.data.tasks.length === 2, 'Returns both tasks for today');
    assert(listTasksData.data.tasks[0].priority === 'urgent', 'Urgent priority task ordered first');

    // 5. Update Task Lifecycle Transitions
    console.log('\n--- 5. Task Status & Completed_at Transitions ---');
    const completeTaskRes = await fetch(`${BASE_URL}/api/tasks/${task1Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ status: 'completed' }),
    });
    const completeTaskData = await completeTaskRes.json();
    assert(completeTaskRes.status === 200, 'Marks task as completed');
    assert(completeTaskData.data.task.status === 'completed', 'Task status is completed');
    assert(!!completeTaskData.data.task.completed_at, 'Automatically populates completed_at timestamp');

    // Un-complete task
    const uncompleteRes = await fetch(`${BASE_URL}/api/tasks/${task1Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ status: 'in_progress' }),
    });
    const uncompleteData = await uncompleteRes.json();
    assert(uncompleteRes.status === 200, 'Transitions task to in_progress');
    assert(uncompleteData.data.task.status === 'in_progress', 'Task status is in_progress');
    assert(uncompleteData.data.task.completed_at === null, 'Clears completed_at when status is not completed');

    // 6. Summary Stats
    console.log('\n--- 6. Task Summary Stats ---');
    const statsRes = await fetch(`${BASE_URL}/api/tasks/stats/summary`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const statsData = await statsRes.json();
    assert(statsRes.status === 200, 'Fetches summary stats with 200 OK');
    assert(statsData.data.stats.total === 2, 'Total tasks counted accurately');
    assert(statsData.data.stats.in_progress === 1, 'In-progress count is 1');
    assert(statsData.data.stats.todo === 1, 'Todo count is 1');

    // ================= HABIT MATRIX TESTS =================
    console.log('\n--- 7. Habit Matrix Validation & Creation ---');
    const invalidHabitRes = await fetch(`${BASE_URL}/api/habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Drink Water',
        color_hex: 'invalid-hex',
        target_frequency_per_week: 10, // Exceeds 7
      }),
    });
    assert(invalidHabitRes.status === 400, 'Rejects invalid color & frequency with 400');

    const habit1Res = await fetch(`${BASE_URL}/api/habits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({
        title: 'Morning Deep Workout',
        description: '45 mins strength & cardio',
        category: 'fitness',
        color_hex: '#10B981',
        target_frequency_per_week: 6,
        reminder_time: '07:00',
      }),
    });
    const habit1Data = await habit1Res.json();
    assert(habit1Res.status === 201, 'Creates Habit definition with 201 Created');
    assert(habit1Data.data.habit.title === 'Morning Deep Workout', 'Preserves habit title');
    assert(habit1Data.data.habit.color_hex === '#10B981', 'Preserves hex color code');
    const habit1Id = habit1Data.data.habit.id;

    // 8. List Habits & Status
    console.log('\n--- 8. List Habits & Initial Streak State ---');
    const habitsListRes = await fetch(`${BASE_URL}/api/habits`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const habitsListData = await habitsListRes.json();
    assert(habitsListRes.status === 200, 'Lists habits with 200 OK');
    assert(habitsListData.data.habits.length === 1, 'Returns active habit');
    assert(habitsListData.data.habits[0].is_completed_today === false, 'is_completed_today is false initially');
    assert(habitsListData.data.habits[0].currentStreak === 0, 'currentStreak is 0 initially');

    // 9. Daily Check-in & Multi-Day Streak Calculation
    console.log('\n--- 9. Daily Check-in & Streak Calculation ---');
    // Log today
    const toggleTodayRes = await fetch(`${BASE_URL}/api/habits/${habit1Id}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ log_date: todayStr, status: 'completed' }),
    });
    const toggleTodayData = await toggleTodayRes.json();
    assert(toggleTodayRes.status === 200, 'Toggles habit check-in for today');
    assert(toggleTodayData.data.currentStreak === 1, 'Active streak is 1 day');
    assert(toggleTodayData.data.totalCompleted === 1, 'Total completed is 1');

    // Log yesterday (consecutive)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const toggleYestRes = await fetch(`${BASE_URL}/api/habits/${habit1Id}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ log_date: yesterdayStr, status: 'completed' }),
    });
    const toggleYestData = await toggleYestRes.json();
    assert(toggleYestRes.status === 200, 'Toggles habit check-in for yesterday');
    assert(toggleYestData.data.currentStreak === 2, 'Active streak increments to 2 consecutive days');

    // Log 2 days ago (consecutive)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

    const toggle2DaysRes = await fetch(`${BASE_URL}/api/habits/${habit1Id}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ log_date: twoDaysAgoStr, status: 'completed' }),
    });
    const toggle2DaysData = await toggle2DaysRes.json();
    assert(toggle2DaysData.data.currentStreak === 3, 'Active streak increments to 3 consecutive days');
    assert(toggle2DaysData.data.longestStreak === 3, 'Longest streak tracks maximum consecutive days');

    // 10. 2D GitHub-Style Contribution Heatmap
    console.log('\n--- 10. 2D GitHub Contribution Heatmap ---');
    const heatmapRes = await fetch(`${BASE_URL}/api/habits/${habit1Id}/heatmap`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const heatmapData = await heatmapRes.json();
    assert(heatmapRes.status === 200, 'Fetches heatmap data with 200 OK');
    assert(Array.isArray(heatmapData.data.logs), 'Returns logs array for 2D matrix');
    assert(heatmapData.data.logs.length === 3, 'Contains all 3 check-in entries');
    assert(heatmapData.data.logs.some((l) => l.date === todayStr && l.status === 'completed'), 'Today entry present in heatmap matrix');

    // 11. Multi-Tenant Security Isolation
    console.log('\n--- 11. Multi-Tenant Isolation ---');
    const crossTaskGet = await fetch(`${BASE_URL}/api/tasks/${task1Id}`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    assert(crossTaskGet.status === 404, 'User B cannot view User A tasks');

    const crossHabitToggle = await fetch(`${BASE_URL}/api/habits/${habit1Id}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ log_date: todayStr }),
    });
    assert(crossHabitToggle.status === 200, 'User B check-in does not affect User A habit logs');

    // 12. Cleanup & Deletion
    console.log('\n--- 12. Task & Habit Deletion ---');
    const deleteTaskRes = await fetch(`${BASE_URL}/api/tasks/${task1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(deleteTaskRes.status === 200, 'Deletes task with 200 OK');

    const deleteHabitRes = await fetch(`${BASE_URL}/api/habits/${habit1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    assert(deleteHabitRes.status === 200, 'Deletes habit with 200 OK');

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
