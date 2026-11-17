import { createContext, useContext } from "react";
export const AccessContext = createContext({
  username: "local-demo-operator",
  role: "ADMIN",
});
export const useAccess = () => useContext(AccessContext);
