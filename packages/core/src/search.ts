/**
 * Extracts searchable fields from node data based on type.
 * Concatenates into a single lowercase string for full-text search.
 */
export function buildSearchText(typeCode: string, data: unknown): string {
  if (!data || typeof data !== "object") return "";

  const d = data as Record<string, unknown>;
  const parts: string[] = [];

  function add(val: unknown) {
    if (typeof val === "string" && val.trim()) {
      parts.push(val.trim());
    }
  }

  function addAddress(addr: unknown) {
    if (!addr || typeof addr !== "object") return;
    const a = addr as Record<string, unknown>;
    add(a.street);
    add(a.city);
    add(a.postal_code);
  }

  switch (typeCode) {
    case "org":
      add(d.name);
      add(d.org_number);
      addAddress(d.address);
      break;
    case "person":
      add(d.name);
      add(d.role);
      if (d.contact && typeof d.contact === "object") {
        add((d.contact as Record<string, unknown>).email);
        add((d.contact as Record<string, unknown>).phone);
      }
      break;
    case "customer":
      add(d.name);
      add(d.org_number);
      addAddress(d.address);
      if (d.contact && typeof d.contact === "object") {
        add((d.contact as Record<string, unknown>).email);
        add((d.contact as Record<string, unknown>).phone);
      }
      break;
    case "project":
      add(d.name);
      add(d.description);
      addAddress(d.address);
      break;
    case "product":
      add(d.name);
      add(d.sku);
      add(d.barcode);
      break;
    case "location":
      add(d.name);
      addAddress(d.address);
      break;
    case "supplier":
      add(d.name);
      add(d.org_number);
      break;
    default:
      add(d.name);
      break;
  }

  return parts.join(" ").toLowerCase();
}
