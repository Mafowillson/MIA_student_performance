// Creates/updates/deletes the real Supabase Auth login behind a staff
// account (Regional Supervisor / Regional Coordinator / HOD / Center
// Coordinator / Mentor). This is the one piece of admin-account management
// that genuinely can't happen from the browser: it needs the service_role
// key (auth.admin.createUser/updateUserById/deleteUser), which must never
// reach client code.
//
// The client is still responsible for creating/updating/deleting the
// underlying org-table row (regional_coordinators/hods/center_coordinators/
// mentors/regional_supervisors) itself, via its own RLS-scoped session —
// that's unchanged and already correctly authorized by Postgres RLS (see
// supabase/002_full_schema.sql). This function re-derives the same
// authorization from scratch server-side (defense in depth: it runs with
// service_role, which bypasses RLS, so it must not just trust the caller's
// claims) before touching auth.users.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

// Re-derives "is the caller allowed to manage this role/refId" from
// scratch, mirroring the RLS write policies in 002_full_schema.sql:
// - regional_supervisor accounts: only the national_supervisor
// - regional_coordinator/hod/center_coordinator: only the regional_supervisor
//   whose own region matches this record's region (a HOD not yet assigned to
//   any subject has no region yet, so any regional_supervisor may manage it —
//   same carve-out as the "regional_supervisor writes hods" RLS policy)
// - mentor: only the center_coordinator whose own center matches this mentor's
async function isAuthorized(
  admin: ReturnType<typeof createClient>,
  callerProfile: { role: string; ref_id: string },
  role: string,
  refId: string,
) {
  if (role === 'regional_supervisor') {
    return callerProfile.role === 'national_supervisor';
  }

  if (role === 'mentor') {
    if (callerProfile.role !== 'center_coordinator') return false;
    const { data: cc } = await admin
      .from('center_coordinators')
      .select('center_id')
      .eq('id', callerProfile.ref_id)
      .single();
    const { data: mentor } = await admin.from('mentors').select('center_id').eq('id', refId).single();
    return !!cc && !!mentor && cc.center_id === mentor.center_id;
  }

  if (callerProfile.role !== 'regional_supervisor') return false;
  const { data: callerRs } = await admin
    .from('regional_supervisors')
    .select('region_id')
    .eq('id', callerProfile.ref_id)
    .single();
  const callerRegion = callerRs?.region_id ?? null;
  if (!callerRegion) return false;

  if (role === 'regional_coordinator') {
    const { data: rc } = await admin.from('regional_coordinators').select('category_id').eq('id', refId).single();
    if (!rc) return false;
    const { data: cat } = await admin.from('categories').select('region_id').eq('id', rc.category_id).single();
    return cat?.region_id === callerRegion;
  }
  if (role === 'hod') {
    const { data: subj } = await admin
      .from('subjects')
      .select('category_id')
      .eq('hod_id', refId)
      .maybeSingle();
    if (!subj) return true; // unassigned HOD — no region yet, matches RLS carve-out
    const { data: cat } = await admin.from('categories').select('region_id').eq('id', subj.category_id).single();
    return cat?.region_id === callerRegion;
  }
  if (role === 'center_coordinator') {
    const { data: cc } = await admin.from('center_coordinators').select('center_id').eq('id', refId).single();
    if (!cc) return false;
    const { data: center } = await admin.from('centers').select('region_id').eq('id', cc.center_id).single();
    return center?.region_id === callerRegion;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !userData?.user) return json({ success: false, error: 'unauthorized' }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role, ref_id')
      .eq('id', userData.user.id)
      .single();
    if (!callerProfile) return json({ success: false, error: 'unauthorized' }, 403);

    const body = await req.json();
    const { action, role, refId } = body;
    if (!action || !role || !refId) return json({ success: false, error: 'invalid_request' }, 400);

    const allowed = await isAuthorized(admin, callerProfile, role, refId);
    if (!allowed) return json({ success: false, error: 'forbidden' }, 403);

    if (action === 'create') {
      const { name, email, password, contextLabel } = body;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role },
      });
      if (createErr) {
        const code = /registered|exists/i.test(createErr.message) ? 'email_taken' : 'save_failed';
        return json({ success: false, error: code });
      }
      const { error: profileErr } = await admin.from('profiles').insert({
        id: created.user.id,
        email,
        name,
        role,
        ref_id: refId,
        context_label: contextLabel ?? '',
      });
      if (profileErr) {
        await admin.auth.admin.deleteUser(created.user.id); // rollback the orphaned auth user
        return json({ success: false, error: 'save_failed' });
      }
      return json({ success: true, id: created.user.id });
    }

    if (action === 'update') {
      const { updates } = body;
      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('role', role)
        .eq('ref_id', refId)
        .single();
      if (!profile) return json({ success: false, error: 'not_found' });

      const authPatch: Record<string, unknown> = {};
      if (updates?.email) authPatch.email = updates.email;
      if (updates?.password) authPatch.password = updates.password;
      if (Object.keys(authPatch).length > 0) {
        const { error } = await admin.auth.admin.updateUserById(profile.id, authPatch);
        if (error) {
          const code = /registered|exists/i.test(error.message) ? 'email_taken' : 'save_failed';
          return json({ success: false, error: code });
        }
      }
      const profilePatch: Record<string, unknown> = {};
      if (updates?.name != null) profilePatch.name = updates.name;
      if (updates?.email != null) profilePatch.email = updates.email;
      if (Object.keys(profilePatch).length > 0) {
        await admin.from('profiles').update(profilePatch).eq('id', profile.id);
      }
      return json({ success: true });
    }

    if (action === 'delete') {
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .eq('role', role)
        .eq('ref_id', refId)
        .maybeSingle();
      if (!profile) return json({ success: true }); // nothing to delete
      const { error } = await admin.auth.admin.deleteUser(profile.id);
      if (error) return json({ success: false, error: 'save_failed' });
      return json({ success: true }); // profiles row cascades via FK on delete
    }

    return json({ success: false, error: 'invalid_action' }, 400);
  } catch {
    return json({ success: false, error: 'save_failed' }, 500);
  }
});
