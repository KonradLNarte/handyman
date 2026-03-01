import { StyleSheet } from "@react-pdf/renderer";

export const colors = {
  primary: "#1a1a2e",
  secondary: "#16213e",
  accent: "#0f3460",
  text: "#1a1a2e",
  textLight: "#6b7280",
  border: "#e5e7eb",
  headerBg: "#f9fafb",
  laborBg: "#f5f3ff",
  materialBg: "#fefce8",
  rotRutBg: "#ecfdf5",
  deviationBg: "#fffbeb",
  white: "#ffffff",
};

export const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    color: colors.text,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
  },
  headerLeft: {
    flexDirection: "column",
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
  },
  title: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textLight,
  },
  logo: {
    width: 120,
    height: 40,
    objectFit: "contain",
  },
  companyName: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 2,
  },
  companyInfo: {
    fontSize: 8,
    color: colors.textLight,
    marginBottom: 1,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: colors.primary,
    marginBottom: 6,
    marginTop: 16,
  },
  infoGrid: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoColumn: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 8,
    color: colors.textLight,
    marginBottom: 1,
  },
  infoValue: {
    fontSize: 10,
    marginBottom: 4,
  },
  table: {
    marginTop: 8,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRowLabor: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingVertical: 5,
    paddingHorizontal: 4,
    backgroundColor: colors.laborBg,
  },
  colDescription: {
    flex: 4,
    fontSize: 9,
  },
  colQty: {
    flex: 1,
    textAlign: "right",
    fontSize: 9,
  },
  colUnit: {
    flex: 1,
    textAlign: "center",
    fontSize: 9,
  },
  colUnitPrice: {
    flex: 1.5,
    textAlign: "right",
    fontSize: 9,
  },
  colTotal: {
    flex: 1.5,
    textAlign: "right",
    fontSize: 9,
  },
  colHeaderText: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: colors.textLight,
    textTransform: "uppercase",
  },
  summarySection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  summaryLabel: {
    width: 180,
    textAlign: "right",
    paddingRight: 16,
    fontSize: 10,
  },
  summaryValue: {
    width: 100,
    textAlign: "right",
    fontSize: 10,
  },
  summaryBold: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
  },
  rotRutSection: {
    marginTop: 12,
    backgroundColor: colors.rotRutBg,
    padding: 12,
    borderRadius: 4,
  },
  rotRutTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#065f46",
    marginBottom: 6,
  },
  rotRutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  rotRutLabel: {
    fontSize: 10,
    color: "#065f46",
  },
  rotRutValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#065f46",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: colors.textLight,
  },
  pageNumber: {
    position: "absolute",
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: colors.textLight,
  },
  emptyMessage: {
    textAlign: "center",
    color: colors.textLight,
    padding: 20,
    fontSize: 11,
  },
});
