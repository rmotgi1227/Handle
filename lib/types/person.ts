export type PersonRole = "tenant" | "homeowner" | "property_manager";

export interface Person {
  id: string;
  role: PersonRole;
  name: string;
  phone: string;
  email?: string;
  propertyId?: string;
}

export interface Property {
  id: string;
  address: string;
  unit?: string;
  managerId: string;
  ownerId: string;
  tenantIds: string[];
}
