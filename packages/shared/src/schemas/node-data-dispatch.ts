import { z, type ZodSchema } from "zod";
import {
  nodeDataOrgSchema,
  nodeDataPersonSchema,
  nodeDataCustomerSchema,
  nodeDataProjectSchema,
  nodeDataProductSchema,
  nodeDataLocationSchema,
  nodeDataSupplierSchema,
} from "./node-data.js";

const schemaMap: Record<string, ZodSchema> = {
  org: nodeDataOrgSchema,
  person: nodeDataPersonSchema,
  customer: nodeDataCustomerSchema,
  project: nodeDataProjectSchema,
  product: nodeDataProductSchema,
  location: nodeDataLocationSchema,
  supplier: nodeDataSupplierSchema,
};

/**
 * Given a node_type code string, returns the correct Zod schema
 * for validating node.data.
 */
export function getNodeDataSchema(typeCode: string): ZodSchema {
  return schemaMap[typeCode] ?? z.record(z.unknown());
}
