import type { GeneratedScenario } from "./model.ts";
import { assertClassificationManifest } from "./classification.ts";

export const PUBLIC_ARTIFACT_KINDS = [
  "receipt",
  "ledger-dump",
  "log",
  "generated-html",
] as const;

export type PublicArtifactKind = (typeof PUBLIC_ARTIFACT_KINDS)[number];

export interface PublicArtifact {
  readonly name: string;
  readonly kind: PublicArtifactKind;
  readonly content: string | Uint8Array;
}

export type PrivacyEncoding =
  | "raw"
  | "json-escaped"
  | "json-unicode"
  | "html-escaped"
  | "html-numeric"
  | "html-hex"
  | "url-encoded"
  | "percent-encoded"
  | "hex"
  | "hex-uppercase"
  | "base64"
  | "base64url";

export interface PrivacyFinding {
  readonly artifactIndex: number;
  readonly artifactName: string;
  readonly artifactKind: PublicArtifactKind;
  readonly privatePath: string;
  readonly encoding: PrivacyEncoding;
  readonly offset: number;
}

export class ArtifactPrivacyError extends Error {
  readonly findings: readonly PrivacyFinding[];

  constructor(findings: readonly PrivacyFinding[]) {
    super(`PRIVATE_DATA_EXPOSED: ${findings.length} private value occurrence(s)`);
    this.name = "ArtifactPrivacyError";
    this.findings = findings;
  }
}

function decodeArtifact(content: string | Uint8Array): string {
  return typeof content === "string"
    ? content
    : new TextDecoder("utf-8", { fatal: true }).decode(content);
}

function readPath(root: unknown, path: string): unknown {
  if (!path.startsWith("$.")) throw new TypeError(`Unsupported manifest path: ${path}`);
  let value = root;
  const tokens = path.slice(1).match(/\.[A-Za-z_$][A-Za-z0-9_$]*|\[\d+\]|\["(?:[^"\\]|\\.)*"\]/g);
  if (tokens === null || tokens.join("") !== path.slice(1)) {
    throw new TypeError(`Unsupported manifest path: ${path}`);
  }
  for (const token of tokens) {
    if (token.startsWith(".")) {
      value = (value as Record<string, unknown>)[token.slice(1)];
    } else if (/^\[\d+\]$/.test(token)) {
      value = (value as readonly unknown[])[Number(token.slice(1, -1))];
    } else {
      const key = JSON.parse(token.slice(1, -1)) as string;
      value = (value as Record<string, unknown>)[key];
    }
  }
  return value;
}

function htmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function unicodeEscape(value: string): string {
  return [...value]
    .flatMap((character) => {
      const codePoint = character.codePointAt(0)!;
      if (codePoint <= 0xffff) return [`\\u${codePoint.toString(16).padStart(4, "0")}`];
      const adjusted = codePoint - 0x1_0000;
      return [
        `\\u${(0xd800 + (adjusted >> 10)).toString(16)}`,
        `\\u${(0xdc00 + (adjusted & 0x3ff)).toString(16)}`,
      ];
    })
    .join("");
}

function percentEncodeAll(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => `%${byte.toString(16).padStart(2, "0").toUpperCase()}`)
    .join("");
}

function variants(value: string): readonly {
  readonly encoding: PrivacyEncoding;
  readonly needle: string;
}[] {
  const bytes = Buffer.from(value, "utf8");
  const candidates = [
    { encoding: "raw", needle: value },
    {
      encoding: "json-escaped",
      needle: JSON.stringify(value).slice(1, -1),
    },
    { encoding: "json-unicode", needle: unicodeEscape(value) },
    { encoding: "html-escaped", needle: htmlEscape(value) },
    {
      encoding: "html-numeric",
      needle: [...value].map((character) => `&#${character.codePointAt(0)};`).join(""),
    },
    {
      encoding: "html-hex",
      needle: [...value]
        .map((character) => `&#x${character.codePointAt(0)!.toString(16)};`)
        .join(""),
    },
    { encoding: "url-encoded", needle: encodeURIComponent(value) },
    { encoding: "percent-encoded", needle: percentEncodeAll(bytes) },
    { encoding: "hex", needle: bytes.toString("hex") },
    { encoding: "hex-uppercase", needle: bytes.toString("hex").toUpperCase() },
    { encoding: "base64", needle: bytes.toString("base64") },
    { encoding: "base64url", needle: bytes.toString("base64url") },
  ] as const;
  const seen = new Set<string>();
  return candidates.filter(({ needle }) => {
    if (needle.length < 4 || seen.has(needle)) return false;
    seen.add(needle);
    return true;
  });
}

export function scanPublicArtifacts(
  generated: GeneratedScenario,
  artifacts: readonly PublicArtifact[],
): readonly PrivacyFinding[] {
  assertClassificationManifest(generated);
  const privateValues = generated.classificationManifest.entries
    .filter(({ classification }) => classification === "private")
    .map(({ path }) => ({ path, value: readPath(generated, path) }))
    .filter(
      (entry): entry is { readonly path: string; readonly value: string } =>
        typeof entry.value === "string" && entry.value.length >= 4,
    );
  const findings: PrivacyFinding[] = [];
  artifacts.forEach((artifact, artifactIndex) => {
    const content = decodeArtifact(artifact.content);
    for (const privateValue of privateValues) {
      for (const variant of variants(privateValue.value)) {
        let offset = content.indexOf(variant.needle);
        while (offset !== -1) {
          findings.push({
            artifactIndex,
            artifactName: artifact.name,
            artifactKind: artifact.kind,
            privatePath: privateValue.path,
            encoding: variant.encoding,
            offset,
          });
          offset = content.indexOf(variant.needle, offset + variant.needle.length);
        }
      }
    }
  });
  return findings;
}

export function assertPublicArtifactsSafe(
  generated: GeneratedScenario,
  artifacts: readonly PublicArtifact[],
): void {
  const findings = scanPublicArtifacts(generated, artifacts);
  if (findings.length > 0) throw new ArtifactPrivacyError(findings);
}
