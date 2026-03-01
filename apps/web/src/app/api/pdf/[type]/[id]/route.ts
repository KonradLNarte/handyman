import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@resonansia/db";
import { getProposal } from "@resonansia/core";
import { generateQuotePdf, generateInvoicePdf } from "@resonansia/pdf";
import { getSession, getTenantId } from "@/lib/supabase-server";
import { sql } from "drizzle-orm";

/**
 * GET /api/pdf/quote/{proposalOrProjectId} → returns quote PDF
 * GET /api/pdf/invoice/{proposalOrProjectId} → returns invoice PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  try {
    const { type, id } = await params;
    const tenantId = await getTenantId();
    const db = getDb();

    if (type !== "quote" && type !== "invoice") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    // Load proposal
    const proposal = await getProposal(db, tenantId, id);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    // Load tenant info
    const tenantResult = await db.execute(sql`
      SELECT n.data FROM nodes n
      JOIN labels l ON l.id = n.type_id AND l.domain = 'node_type' AND l.code = 'org'
      WHERE n.tenant_id = ${tenantId} LIMIT 1
    `);
    const tenantRows = (Array.isArray(tenantResult) ? tenantResult : tenantResult.rows) as any[];
    const tenantData = tenantRows[0]?.data || { name: "Unknown" };

    // Load customer info
    const customerResult = await db.execute(sql`
      SELECT n.data FROM edges e
      JOIN nodes n ON n.id = e.from_id AND n.tenant_id = ${tenantId}
      JOIN labels lt ON lt.id = e.type_id AND lt.domain = 'edge_type' AND lt.code = 'customer_of'
      WHERE e.to_id = ${proposal.projectId} AND e.tenant_id = ${tenantId} LIMIT 1
    `);
    const customerRows = (Array.isArray(customerResult) ? customerResult : customerResult.rows) as any[];
    const customerData = customerRows[0]?.data || { name: "Kund" };

    // Load project info
    const projectResult = await db.execute(sql`
      SELECT n.data FROM nodes n WHERE n.id = ${proposal.projectId} AND n.tenant_id = ${tenantId}
    `);
    const projectRows = (Array.isArray(projectResult) ? projectResult : projectResult.rows) as any[];
    const projectData = projectRows[0]?.data || { name: "Projekt" };

    const tenant = {
      name: tenantData.name,
      orgNumber: tenantData.org_number,
      address: tenantData.address ? {
        street: tenantData.address.street,
        postalCode: tenantData.address.postal_code,
        city: tenantData.address.city,
      } : null,
      contact: tenantData.contact,
      logoUrl: tenantData.logo_url,
      bankgiro: tenantData.bankgiro,
      plusgiro: tenantData.plusgiro,
      paymentTermsDays: tenantData.payment_terms_days,
    };

    const customer = {
      name: customerData.name,
      address: customerData.address ? {
        street: customerData.address.street,
        postalCode: customerData.address.postal_code,
        city: customerData.address.city,
      } : null,
      personNumber: customerData.rot_rut_person_number,
    };

    const project = {
      name: projectData.name,
      address: projectData.address ? {
        street: projectData.address.street,
        postalCode: projectData.address.postal_code,
        city: projectData.address.city,
      } : null,
      description: projectData.description,
    };

    const disposition = request.nextUrl.searchParams.get("download") === "true"
      ? "attachment"
      : "inline";

    let pdfBuffer: Buffer;

    if (type === "quote") {
      pdfBuffer = await generateQuotePdf({
        tenant,
        customer,
        project,
        lines: proposal.lines,
        rotRut: proposal.rotRut ?? null,
        quoteNumber: id.substring(0, 8).toUpperCase(),
        quoteDate: proposal.createdAt,
        validUntil: new Date(proposal.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000),
      });
    } else {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + (tenant.paymentTermsDays ?? 30));
      pdfBuffer = await generateInvoicePdf({
        tenant,
        customer,
        project,
        lines: proposal.lines,
        rotRut: proposal.rotRut ?? null,
        invoiceNumber: id.substring(0, 8).toUpperCase(),
        invoiceDate: new Date(),
        dueDate,
        ocrReference: id.replace(/-/g, "").substring(0, 12),
      });
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${type}-${id.substring(0, 8)}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
