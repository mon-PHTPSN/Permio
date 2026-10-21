import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { keccak256, stringToHex } from "viem";

const hash = (label: string) => keccak256(stringToHex(label));

const FIXTURE_RECEIPT_VERSION = hash(
  "permio.fixture.expected-m6-decision-receipt.v0",
);
const FIXTURE_SOURCE_NETWORK = hash("midnight-local-dev-fixture");
const FIXTURE_SOURCE_CONTRACT = hash("expected-m6-contract-fixture");
const FIXTURE_ACTION_SCHEMA_ID = hash("permio.fixture.action.v0");
const FIXTURE_GATEWAY_KEY_ID = hash("fixture-gateway-key-epoch-1");

/**
 * Local chain-31337 fixture only. This module models the expected M6/M7 public
 * contract so M8's real event pipeline can be exercised before upstream
 * integration. It is not production deployment or authenticity evidence.
 */
export default buildModule("ExecutionRegistryLocalFixture", (m) => {
  const initialAdmin = m.getAccount(0);
  const initialReceiptSchemaAdmin = m.getAccount(1);
  const initialSourceAdmin = m.getAccount(2);
  const initialGatewayKeyManager = m.getAccount(3);
  const initialAdapterRegistrar = m.getAccount(4);
  const initialEmergencyAuthority = m.getAccount(5);
  const fixtureGatewaySigner = m.getAccount(6);

  const registry = m.contract("ExecutionRegistry", [
    initialAdmin,
    initialReceiptSchemaAdmin,
    initialSourceAdmin,
    initialGatewayKeyManager,
    initialAdapterRegistrar,
    initialEmergencyAuthority,
  ]);
  const verifier = m.contract("ExpectedM6M7ReceiptVerifier", [registry]);
  const adapter = m.contract("RecordingExecutionAdapter", [registry]);

  m.call(
    registry,
    "configureReceiptVerifier",
    [FIXTURE_RECEIPT_VERSION, verifier],
    { from: initialReceiptSchemaAdmin },
  );
  m.call(
    registry,
    "setSource",
    [FIXTURE_SOURCE_NETWORK, FIXTURE_SOURCE_CONTRACT, true],
    { from: initialSourceAdmin },
  );
  m.call(
    registry,
    "registerGatewayKeyEpoch",
    [FIXTURE_GATEWAY_KEY_ID, fixtureGatewaySigner, 1n, 18_446_744_073_709_551_615n],
    { from: initialGatewayKeyManager },
  );
  m.call(
    registry,
    "registerAdapter",
    [FIXTURE_RECEIPT_VERSION, FIXTURE_ACTION_SCHEMA_ID, adapter],
    { from: initialAdapterRegistrar },
  );

  return { registry, verifier, adapter };
});
