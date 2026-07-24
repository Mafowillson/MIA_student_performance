// One-time (idempotent) seed: creates a real Supabase Auth user + matching
// `profiles` row for every mock account in src/data/mockData.js USERS.
// Run with the service_role ("secret") key, never the publishable key:
//
//   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SECRET_KEY=sb_secret_xxx node scripts/seed-auth-users.mjs
//
// Safe to re-run: existing auth users are detected by email and skipped
// (their profiles row is upserted in case role/refId/contextLabel changed).
import { createClient } from '@supabase/supabase-js';
import { USERS, DEMO_PASSWORD } from '../src/data/mockData.js';

const url = process.env.SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SECRET_KEY env vars before running this script.');
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findExistingUserByEmail(email) {
  // No direct "get by email" in the admin API — page through listUsers().
  // 19 accounts fits comfortably in a single page (default 50/page).
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

async function main() {
  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of USERS) {
    const email = user.email.toLowerCase();
    let authUserId;

    const existing = await findExistingUserByEmail(email);
    if (existing) {
      authUserId = existing.id;
      skipped += 1;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { name: user.name, role: user.role },
      });
      if (error) {
        console.error(`FAILED creating ${email}:`, error.message);
        failed += 1;
        continue;
      }
      authUserId = data.user.id;
      created += 1;
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: authUserId,
      email,
      name: user.name,
      role: user.role,
      ref_id: user.refId,
      context_label: user.contextLabel ?? '',
    });
    if (profileError) {
      console.error(`FAILED upserting profile for ${email}:`, profileError.message);
      failed += 1;
    }
  }

  console.log(`Done. Created: ${created}, already existed: ${skipped}, failed: ${failed}.`);
}

main();
