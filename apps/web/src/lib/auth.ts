import { createSupabaseServiceClient } from "@resonansia/db";
import { generateId } from "@resonansia/shared";

/**
 * Provisions a new tenant after user registration.
 * Creates: Tenant + Org node + Person node + member_of Edge.
 * All in a single transaction via service role client.
 *
 * Sets tenant_id in the user's app_metadata so it appears in the JWT.
 */
export async function provisionTenant(
  userId: string,
  email: string,
  companyName?: string
) {
  const supabase = createSupabaseServiceClient();

  const tenantId = generateId();
  const orgNodeId = generateId();
  const personNodeId = generateId();
  const edgeId = generateId();

  // Look up label IDs
  const { data: labels } = await supabase
    .from("labels")
    .select("id, domain, code")
    .in("domain", ["node_type", "edge_type", "node_state"])
    .in("code", ["org", "person", "member_of", "active"])
    .is("tenant_id", null);

  if (!labels || labels.length < 4) {
    throw new Error("Platform labels not seeded");
  }

  const labelMap = new Map(labels.map((l) => [`${l.domain}:${l.code}`, l.id]));
  const orgTypeId = labelMap.get("node_type:org")!;
  const personTypeId = labelMap.get("node_type:person")!;
  const memberOfTypeId = labelMap.get("edge_type:member_of")!;
  const activeStateId = labelMap.get("node_state:active")!;

  // Create tenant
  const { error: tenantError } = await supabase.from("tenants").insert({
    id: tenantId,
    status: "active",
    region: "se",
  });
  if (tenantError) throw new Error(`Failed to create tenant: ${tenantError.message}`);

  // Create org node
  const orgName = companyName || `${email}'s Organization`;
  const { error: orgError } = await supabase.from("nodes").insert({
    id: orgNodeId,
    tenant_id: tenantId,
    type_id: orgTypeId,
    state_id: activeStateId,
    data: {
      name: orgName,
      org_number: null,
      address: null,
      contact: { email, phone: null, website: null },
      logo_url: null,
      industry: null,
      default_currency_id: 0,
      default_locale_id: 0,
      vat_number: null,
      bankgiro: null,
      plusgiro: null,
      payment_terms_days: 30,
    },
    search_text: orgName.toLowerCase(),
  });
  if (orgError) throw new Error(`Failed to create org: ${orgError.message}`);

  // Create person node
  const { error: personError } = await supabase.from("nodes").insert({
    id: personNodeId,
    tenant_id: tenantId,
    type_id: personTypeId,
    state_id: activeStateId,
    data: {
      name: email.split("@")[0],
      contact: { email, phone: null, website: null },
      language: "sv",
      role: "owner",
      hourly_rate: null,
      avatar_url: null,
    },
    search_text: email.toLowerCase(),
  });
  if (personError) throw new Error(`Failed to create person: ${personError.message}`);

  // Create member_of edge (person → org)
  const { error: edgeError } = await supabase.from("edges").insert({
    id: edgeId,
    tenant_id: tenantId,
    source_id: personNodeId,
    target_id: orgNodeId,
    type_id: memberOfTypeId,
    data: { role: "owner", start_date: new Date().toISOString().split("T")[0] },
  });
  if (edgeError) throw new Error(`Failed to create edge: ${edgeError.message}`);

  // Set tenant_id in user's app_metadata so it appears in the JWT
  const { error: updateError } = await supabase.auth.admin.updateUserById(
    userId,
    {
      app_metadata: { tenant_id: tenantId },
    }
  );
  if (updateError) throw new Error(`Failed to set tenant_id: ${updateError.message}`);

  return { tenantId, orgNodeId, personNodeId };
}
