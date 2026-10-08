import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("RecipientBoundAttestationRegistryModule", (m) => {
  const deployer = m.getAccount(0);
  const registry = m.contract("RecipientBoundAttestationRegistry", [
    deployer,
    deployer,
  ]);

  return { registry };
});
