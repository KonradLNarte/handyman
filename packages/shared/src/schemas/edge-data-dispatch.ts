import { z, type ZodSchema } from "zod";
import {
  edgeDataMemberOfSchema,
  edgeDataAssignedToSchema,
  edgeDataSubcontractorOfSchema,
  edgeDataCustomerOfSchema,
  edgeDataLocatedAtSchema,
  edgeDataSupplierOfSchema,
  edgeDataUsesProductSchema,
} from "./edge-data";

const schemaMap: Record<string, ZodSchema> = {
  member_of: edgeDataMemberOfSchema,
  assigned_to: edgeDataAssignedToSchema,
  subcontractor_of: edgeDataSubcontractorOfSchema,
  customer_of: edgeDataCustomerOfSchema,
  located_at: edgeDataLocatedAtSchema,
  supplier_of: edgeDataSupplierOfSchema,
  uses_product: edgeDataUsesProductSchema,
};

/**
 * Given an edge_type code string, returns the correct Zod schema
 * for validating edge.data.
 */
export function getEdgeDataSchema(typeCode: string): ZodSchema {
  return schemaMap[typeCode] ?? z.record(z.unknown());
}
