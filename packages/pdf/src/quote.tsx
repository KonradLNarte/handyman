import React from "react";
import { Document, Page, View, Text, Image } from "@react-pdf/renderer";
import { styles, colors } from "./styles";
import type { ProposalLine, RotRutResult, NodeDataOrg, NodeDataCustomer, NodeDataProject } from "@resonansia/shared";

export interface QuotePdfProps {
  tenant: {
    name: string;
    orgNumber?: string | null;
    address?: { street: string; postalCode: string; city: string } | null;
    contact?: { email?: string | null; phone?: string | null } | null;
    logoUrl?: string | null;
    bankgiro?: string | null;
    plusgiro?: string | null;
    paymentTermsDays?: number;
  };
  customer: {
    name: string;
    address?: { street: string; postalCode: string; city: string } | null;
  };
  project: {
    name: string;
    address?: { street: string; postalCode: string; city: string } | null;
    description?: string | null;
  };
  lines: ProposalLine[];
  rotRut: RotRutResult | null;
  quoteNumber: string;
  quoteDate: Date;
  validUntil: Date;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function getUnitName(unitId: number): string {
  const units: Record<number, string> = {
    1: "tim",
    2: "min",
    3: "m²",
    4: "lm",
    5: "st",
    6: "kg",
    7: "l",
  };
  return units[unitId] ?? "st";
}

export function QuotePdf(props: QuotePdfProps) {
  const { tenant, customer, project, lines, rotRut, quoteNumber, quoteDate, validUntil } = props;

  const subtotal = lines.reduce((sum, l) => sum + l.total, 0);
  const laborTotal = lines.filter((l) => l.isLabor).reduce((sum, l) => sum + l.total, 0);
  const materialTotal = lines.filter((l) => !l.isLabor).reduce((sum, l) => sum + l.total, 0);
  const vatAmount = subtotal * 0.25;
  const grandTotal = subtotal + vatAmount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {tenant.logoUrl ? (
              <Image src={tenant.logoUrl} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{tenant.name}</Text>
            )}
            {tenant.orgNumber && (
              <Text style={styles.companyInfo}>Org.nr: {tenant.orgNumber}</Text>
            )}
            {tenant.address && (
              <Text style={styles.companyInfo}>
                {tenant.address.street}, {tenant.address.postalCode} {tenant.address.city}
              </Text>
            )}
            {tenant.contact?.email && (
              <Text style={styles.companyInfo}>{tenant.contact.email}</Text>
            )}
            {tenant.contact?.phone && (
              <Text style={styles.companyInfo}>{tenant.contact.phone}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.title}>OFFERT</Text>
            <Text style={styles.subtitle}>Nr: {quoteNumber}</Text>
            <Text style={styles.subtitle}>Datum: {formatDate(quoteDate)}</Text>
          </View>
        </View>

        {/* Recipient & Project Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>Kund</Text>
            <Text style={styles.infoValue}>{customer.name}</Text>
            {customer.address && (
              <>
                <Text style={styles.infoValue}>{customer.address.street}</Text>
                <Text style={styles.infoValue}>
                  {customer.address.postalCode} {customer.address.city}
                </Text>
              </>
            )}
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>Projekt</Text>
            <Text style={styles.infoValue}>{project.name}</Text>
            {project.address && (
              <Text style={styles.infoValue}>
                {project.address.street}, {project.address.postalCode} {project.address.city}
              </Text>
            )}
            {project.description && (
              <Text style={styles.infoValue}>{project.description}</Text>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <Text style={styles.sectionTitle}>Specifikation</Text>

        {lines.length === 0 ? (
          <Text style={styles.emptyMessage}>Inga rader att visa</Text>
        ) : (
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.colDescription, styles.colHeaderText]}>Beskrivning</Text>
              <Text style={[styles.colQty, styles.colHeaderText]}>Antal</Text>
              <Text style={[styles.colUnit, styles.colHeaderText]}>Enhet</Text>
              <Text style={[styles.colUnitPrice, styles.colHeaderText]}>À-pris</Text>
              <Text style={[styles.colTotal, styles.colHeaderText]}>Belopp</Text>
            </View>

            {/* Table Rows */}
            {lines
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((line, i) => (
                <View
                  key={line.tempId || i}
                  style={line.isLabor ? styles.tableRowLabor : styles.tableRow}
                >
                  <Text style={styles.colDescription}>{line.description}</Text>
                  <Text style={styles.colQty}>{line.qty}</Text>
                  <Text style={styles.colUnit}>{getUnitName(line.unitId)}</Text>
                  <Text style={styles.colUnitPrice}>{formatCurrency(line.unitPrice)}</Text>
                  <Text style={styles.colTotal}>{formatCurrency(line.total)}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Subtotals */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Arbetskostnad:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(laborTotal)} kr</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Materialkostnad:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(materialTotal)} kr</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Summa exkl. moms:</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)} kr</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Moms (25%):</Text>
            <Text style={styles.summaryValue}>{formatCurrency(vatAmount)} kr</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.summaryBold]}>Totalt inkl. moms:</Text>
            <Text style={[styles.summaryValue, styles.summaryBold]}>{formatCurrency(grandTotal)} kr</Text>
          </View>
        </View>

        {/* ROT/RUT Section */}
        {rotRut && rotRut.deductionAmount > 0 && (
          <View style={styles.rotRutSection}>
            <Text style={styles.rotRutTitle}>
              {rotRut.deductionType === "rot" ? "ROT-avdrag" : "RUT-avdrag"}
            </Text>
            <View style={styles.rotRutRow}>
              <Text style={styles.rotRutLabel}>Arbetskostnad:</Text>
              <Text style={styles.rotRutValue}>{formatCurrency(rotRut.laborTotal)} kr</Text>
            </View>
            <View style={styles.rotRutRow}>
              <Text style={styles.rotRutLabel}>
                {rotRut.deductionType === "rot" ? "ROT" : "RUT"}-avdrag ({Math.round(rotRut.deductionRate * 100)}%):
              </Text>
              <Text style={styles.rotRutValue}>-{formatCurrency(rotRut.deductionAmount)} kr</Text>
            </View>
            <View style={[styles.rotRutRow, { marginTop: 4, borderTopWidth: 1, borderTopColor: "#a7f3d0", paddingTop: 4 }]}>
              <Text style={[styles.rotRutLabel, { fontFamily: "Helvetica-Bold" }]}>Att betala:</Text>
              <Text style={[styles.rotRutValue, { fontSize: 12 }]}>{formatCurrency(rotRut.customerPays)} kr</Text>
            </View>
            {rotRut.cappedByYearlyMax && (
              <Text style={[styles.rotRutLabel, { marginTop: 4, fontSize: 8 }]}>
                * Avdraget har begränsats av det årliga maxbeloppet
              </Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View>
            <Text>{tenant.name} | Org.nr: {tenant.orgNumber ?? "—"}</Text>
            {tenant.bankgiro && <Text>Bankgiro: {tenant.bankgiro}</Text>}
            {tenant.plusgiro && <Text>Plusgiro: {tenant.plusgiro}</Text>}
          </View>
          <View>
            <Text>Giltig t.o.m. {formatDate(validUntil)}</Text>
            <Text>Betalningsvillkor: {tenant.paymentTermsDays ?? 30} dagar netto</Text>
          </View>
        </View>

        {/* Page Number */}
        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}
