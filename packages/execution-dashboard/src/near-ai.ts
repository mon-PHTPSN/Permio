import { ApplicationError } from "./application.ts";
import type { InferenceView, PrivateInferenceProvider } from "./inference.ts";

export const NEAR_AI_SDK_VERSION = "0.3.0";
const BASE_URL = "https://cloud-api.near.ai/v1";
const supportedRuntime = () => {
  const [major, minor, patch] = process.versions.node.split(".").map(Number);
  return (
    major > 24 || (major === 24 && (minor > 22 || (minor === 22 && patch >= 1)))
  );
};
/** The SDK import is lazy: ordinary dashboard use keeps working on Node 24.13. */
export function nearAiProvider(
  environment: NodeJS.ProcessEnv = process.env,
): PrivateInferenceProvider {
  const apiKey = environment.NEARAI_API_KEY;
  const model = environment.PERMIO_NEARAI_MODEL ?? null;
  const status = () => ({
    state:
      !apiKey || !model
        ? "unconfigured"
        : !supportedRuntime()
          ? "unsupported_runtime"
          : "configured",
    model,
    message:
      !apiKey || !model
        ? "NEAR AI requires a server API key and an explicitly selected Confidential TEE model."
        : !supportedRuntime()
          ? "NEAR AI SDK 0.3.0 requires Node.js 24.22.1 or later. Ordinary product workflows remain available."
          : "Configured for verified private inference; live acceptance is pending.",
    sdkVersion: NEAR_AI_SDK_VERSION,
    privacyTier: "Confidential TEE required",
  });
  return {
    status,
    async complete(view: InferenceView, beforeSend: () => Promise<void>) {
      if (status().state !== "configured" || view.model !== model)
        throw new ApplicationError(503, status().message);
      let stage = "pre-send";
      let client:
        | InstanceType<
            typeof import("@nearai/inference-sdk/node").InferenceClient
          >
        | undefined;
      try {
        const { InferenceClient } = await import("@nearai/inference-sdk/node");
        // One client per invocation prevents reuse of cached evidence across turns.
        client = new InferenceClient({
          baseUrl: BASE_URL,
          apiKey: apiKey!,
          e2ee: true,
          gatewayVerification: {
            includeSpkiFingerprint: true,
            policy: { acceptedTcbStatuses: ["UpToDate"] },
          },
          modelVerification: { policy: { acceptedTcbStatuses: ["UpToDate"] } },
        });
        const deployment = await client.verify(model!);
        if (deployment.models.length === 0)
          throw new Error("Model evidence is required");
        await beforeSend();
        const completion = await client.chat.completions.create({
          model: model!,
          stream: false,
          messages: [
            {
              role: "system",
              content:
                "Provide an advisory answer for the stated purpose using only the selected inputs. Do not request tools or claim authority to execute actions.",
            },
            {
              role: "user",
              content: JSON.stringify({
                recipient: view.recipient,
                purpose: view.purpose,
                inputs: view.inputs.map(({ id, value }) => ({ id, value })),
              }),
            },
          ],
        });
        stage = "response";
        const verified = await client.verifyResponse(completion.id);
        if (
          verified.id !== completion.id ||
          !["gateway", "provider_tee"].includes(verified.signatureKind)
        )
          throw new Error("Response binding mismatch");
        const answer = completion.choices[0]?.message.content;
        if (typeof answer !== "string" || !answer.trim())
          throw new Error("No usable answer");
        return {
          answer,
          responseSigner: verified.signatureKind,
          verification: {
            gateway: "passed",
            model: "passed",
            connection: "passed",
            response: "passed",
          },
        };
      } catch (error) {
        if (error instanceof ApplicationError) throw error;
        // SDK/provider errors may include request bytes. Never return or log them.
        throw new ApplicationError(
          502,
          stage === "response"
            ? "NEAR AI response verification failed or returned no usable answer. The response was withheld."
            : "NEAR AI required pre-send verification or inference failed. No privacy downgrade was attempted.",
        );
      } finally {
        client?.clearResponseCache();
      }
    },
  };
}
