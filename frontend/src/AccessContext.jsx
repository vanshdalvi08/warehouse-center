import { createContext, useContext } from "react";
export const AccessContext = createContext({
  username: "local-demo-operator",
  role: "ADMIN",
});
export const useAccess = () => useContext(AccessContext);

export const ROLE_LABELS = {
  ADMIN: "Admin",
  SUPERVISOR: "Supervisor",
  WAREHOUSE_OPERATOR: "Warehouse Operator",
  AUDITOR: "Legacy Auditor",
};
export const roleLabel = (role) => ROLE_LABELS[role] || role;
