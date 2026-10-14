import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ExecutionRegistryModule", (m) => {
  // Each initial authority is deliberately assigned to a separate account.
  // Production deployments must replace these defaults with reviewed keys or
  // governance contracts and must not deploy the fixture receipt verifier.
  const initialAdmin = m.getAccount(0);
  const initialReceiptSchemaAdmin = m.getAccount(1);
  const initialSourceAdmin = m.getAccount(2);
  const initialGatewayKeyManager = m.getAccount(3);
  const initialAdapterRegistrar = m.getAccount(4);
  const initialEmergencyAuthority = m.getAccount(5);

  const registry = m.contract("ExecutionRegistry", [
    initialAdmin,
    initialReceiptSchemaAdmin,
    initialSourceAdmin,
    initialGatewayKeyManager,
    initialAdapterRegistrar,
    initialEmergencyAuthority,
  ]);

  return { registry };
});
