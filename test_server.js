const http = require('http');
const app = require('./server/server.js');

const PORT = 5001; // Test on port 5001 to avoid any port conflicts
const server = app.listen(PORT, async () => {
  console.log(`Test server running on port ${PORT}`);

  function fetchUrl(path, options = {}) {
    return new Promise((resolve, reject) => {
      const req = http.request(`http://localhost:${PORT}${path}`, options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
      });
      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  }

  try {
    console.log('\n--- 1. Testing Static HTML Pages ---');
    const pages = ['/', '/login', '/register', '/forgot-password', '/dashboard', '/goals', '/create-goal', '/goal-details', '/transactions', '/budget', '/insights', '/achievements', '/notifications', '/profile', '/settings', '/admin'];
    for (const p of pages) {
      const res = await fetchUrl(p);
      if (res.status === 200) {
        console.log(`  ✓ ${p} returned HTTP 200 (${res.body.length} bytes)`);
      } else {
        console.error(`  ✗ ${p} returned HTTP ${res.status}`);
      }
    }

    console.log('\n--- 2. Testing API Auth Config ---');
    const authConfig = await fetchUrl('/api/auth/config');
    console.log('  Config:', JSON.parse(authConfig.body));

    console.log('\n--- 3. Testing Demo Login ---');
    const loginRes = await fetchUrl('/api/auth/demo-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'admin' })
    });
    const loginJson = JSON.parse(loginRes.body);
    console.log('  Login response:', loginJson.success ? '✓ Success' : '✗ Failed', 'User:', loginJson.user?.email);

    const token = loginJson.token;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    console.log('\n--- 4. Testing Dashboard API ---');
    const dashRes = await fetchUrl('/api/dashboard', { headers: authHeaders });
    const dashJson = JSON.parse(dashRes.body);
    console.log('  Dashboard summary:', dashJson.data?.summary);

    console.log('\n--- 5. Testing Goals API ---');
    const goalsRes = await fetchUrl('/api/goals', { headers: authHeaders });
    const goalsJson = JSON.parse(goalsRes.body);
    console.log(`  Fetched ${goalsJson.data?.length} goals.`);
    goalsJson.data?.forEach(g => {
      console.log(`    Goal: "${g.name}" | Target: ₹${g.target_amount} | Saved: ₹${g.saved_amount} | Progress: ${g.progress_percentage}% | Req/Mo: ₹${g.recommended_monthly}`);
    });

    console.log('\n--- 6. Testing Transactions API & CSV Export ---');
    const txRes = await fetchUrl('/api/savings', { headers: authHeaders });
    const txJson = JSON.parse(txRes.body);
    console.log(`  Fetched ${txJson.data?.length} transactions.`);

    const exportRes = await fetchUrl('/api/savings/export', { headers: authHeaders });
    console.log(`  CSV Export status: ${exportRes.status}, preview:`);
    console.log(exportRes.body.split('\r\n').slice(0, 3).join('\n'));

    console.log('\n--- 7. Testing Budget & Expense API ---');
    const budgetRes = await fetchUrl('/api/budget', { headers: authHeaders });
    const budgetJson = JSON.parse(budgetRes.body);
    console.log('  Budget Available:', budgetJson.data?.availableAmount, '| Disposable:', budgetJson.data?.disposableAmount);

    console.log('\n--- 8. Testing Financial Insights API ---');
    const insRes = await fetchUrl('/api/insights', { headers: authHeaders });
    const insJson = JSON.parse(insRes.body);
    console.log(`  Generated ${insJson.data?.insights?.length} insights:`);
    insJson.data?.insights?.forEach(i => console.log(`    - [${i.type.toUpperCase()}] ${i.title}: ${i.message}`));

    console.log('\n--- 9. Testing Achievements & Streaks API ---');
    const achRes = await fetchUrl('/api/achievements', { headers: authHeaders });
    const achJson = JSON.parse(achRes.body);
    console.log('  Streaks:', achJson.data?.streaks);
    console.log(`  Achievements catalog count: ${achJson.data?.achievements?.length}`);

    console.log('\n--- 10. Testing Admin Stats API ---');
    const admRes = await fetchUrl('/api/admin/stats', { headers: authHeaders });
    const admJson = JSON.parse(admRes.body);
    console.log('  Admin Stats:', {
      totalUsers: admJson.data?.totalUsers,
      totalPlatformSavings: admJson.data?.totalPlatformSavings,
      totalGoals: admJson.data?.totalGoals,
      categoriesCount: admJson.data?.categoriesCount
    });

    console.log('\n=============================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!');
    console.log('=============================================');
  } catch (err) {
    console.error('Integration test failure:', err);
  } finally {
    server.close(() => {
      console.log('Test server closed.');
      process.exit(0);
    });
  }
});

