import assert from "node:assert/strict";
import { createHash } from "node:crypto";

/** Fixed numeric findings only; a failure must never reproduce the private value. */
export function scanM6PublicArtifacts(artifacts: ReadonlyMap<string, Uint8Array>, privateValues: readonly string[]) {
  assert(artifacts.size > 0 && privateValues.length > 0);
  const values = [...new Set(privateValues)];
  assert(values.every(value => value.length >= 8), "Private scan values must be specific, nonempty sentinels");
  const patterns = values.map(value => {
    const raw = Buffer.from(value), encoded = [raw, Buffer.from(JSON.stringify(value).slice(1, -1)),
      Buffer.from(raw.toString("hex")), Buffer.from(raw.toString("base64"))];
    if (/^(?:[0-9a-f]{2}){16,}$/iu.test(value)) encoded.push(Buffer.from(value, "hex"), Buffer.from(value.toUpperCase()));
    for (const line of value.split(/\r?\n/u)) if (line.length >= 32 && !line.startsWith("-----")) encoded.push(Buffer.from(line));
    return encoded;
  });
  const findings: { artifact: string; privateValueIndex: number }[] = [];
  const files = [...artifacts].map(([name, value]) => {
    assert(/^[a-zA-Z0-9/_.-]+$/u.test(name) && !name.includes(".."));
    const bytes = Buffer.from(value);
    patterns.forEach((encodings, privateValueIndex) => {
      if (encodings.some(pattern => bytes.includes(pattern))) findings.push({ artifact: name, privateValueIndex });
    });
    return { artifact: name, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
  });
  return { passed: findings.length === 0, privateValuesChecked: values.length, artifactCount: artifacts.size,
    checkedRawJsonHexAndBase64: true, files, findings, privateValuesLogged: false };
}
