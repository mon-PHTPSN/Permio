import { createHash, randomUUID } from "node:crypto";
import { ApplicationError, type Account, type Session } from "./application.ts";

export interface AuthorizedInferenceScope {
  readonly instanceId: string;
  readonly contextId: string;
  readonly recipient: string;
  readonly purpose: string;
  readonly model: string;
  readonly authorityRevision: string;
  readonly validUntil: number;
  readonly inputs: readonly {
    readonly id: string;
    readonly label: string;
    readonly value: string;
  }[];
  readonly requiresEvidenceDelivery?: boolean;
}
/** A server-owned integration must read context-account permissions and current Midnight authorization.
 * No browser permission, receipt JSON or authentication claim implements this contract. */
export interface InferenceAuthorizationReader {
  readCurrent(
    account: Account,
    instanceId: string,
    contextId: string,
  ): Promise<AuthorizedInferenceScope | null>;
}
export interface InferenceView {
  readonly instanceId: string;
  readonly contextId: string;
  readonly recipient: string;
  readonly purpose: string;
  readonly model: string;
  readonly inputs: readonly {
    readonly id: string;
    readonly label: string;
    readonly value: string;
  }[];
}
export type VerificationState = "passed" | "failed" | "absent" | "unsupported";
export interface InferenceResult {
  readonly answer: string;
  readonly responseSigner: "gateway" | "provider_tee";
  readonly verification: {
    readonly gateway: VerificationState;
    readonly model: VerificationState;
    readonly connection: VerificationState;
    readonly response: VerificationState;
  };
}
export interface PrivateInferenceProvider {
  status(): {
    state: string;
    model: string | null;
    message: string;
    sdkVersion: string;
    privacyTier: string;
  };
  complete(
    view: InferenceView,
    beforeSend: () => Promise<void>,
  ): Promise<InferenceResult>;
}
interface Preview {
  readonly id: string;
  readonly accountId: string;
  readonly sessionHash: string;
  readonly scopeFingerprint: string;
  readonly inputIds: readonly string[];
  readonly view: InferenceView;
  readonly expiresAt: number;
  state: "prepared" | "consented" | "sending";
}
const fingerprint = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

export class InferenceWorkflow {
  private readonly previews = new Map<string, Preview>();
  private readonly provider: PrivateInferenceProvider;
  private readonly authorization?: InferenceAuthorizationReader;
  private readonly now: () => number;
  private readonly sessionIsCurrent: (session: Session) => boolean;
  constructor(
    provider: PrivateInferenceProvider,
    authorization: InferenceAuthorizationReader | undefined,
    now: () => number,
    sessionIsCurrent: (session: Session) => boolean,
  ) {
    this.provider = provider;
    this.authorization = authorization;
    this.now = now;
    this.sessionIsCurrent = sessionIsCurrent;
  }
  status() {
    return {
      provider: this.provider.status(),
      authorization: {
        state: this.authorization ? "adapter_configured" : "unconfigured",
        message:
          "Current context permissions and Midnight authorization are required before transmission.",
      },
      identity: {
        authentication: "local_demo",
        dynamic: "pending",
        midnight1am: "pending",
        monadEvm: "pending",
      },
      evidenceDelivery: { state: "pending_m10" },
      verification: {
        gateway: "absent",
        model: "absent",
        connection: "absent",
        response: "absent",
      },
    };
  }
  private async scope(account: Account, instanceId: string, contextId: string) {
    if (!this.authorization)
      throw new ApplicationError(
        503,
        "Inference is unavailable until context permissions and Midnight authorization are connected.",
      );
    const scope = await this.authorization.readCurrent(
      account,
      instanceId,
      contextId,
    );
    if (
      !scope ||
      scope.instanceId !== instanceId ||
      scope.contextId !== contextId ||
      scope.validUntil <= this.now()
    )
      throw new ApplicationError(
        403,
        "Current authorization does not permit inference in this context.",
      );
    if (scope.requiresEvidenceDelivery)
      throw new ApplicationError(
        503,
        "This view requires encrypted evidence delivery, which is not connected.",
      );
    if (scope.model !== this.provider.status().model)
      throw new ApplicationError(
        409,
        "The authorized model does not match the configured workload. Review its recipient binding.",
      );
    return scope;
  }
  async available(account: Account, instanceId: string, contextId: string) {
    const scope = await this.scope(account, instanceId, contextId);
    return {
      instanceId,
      contextId,
      recipient: scope.recipient,
      purpose: scope.purpose,
      model: scope.model,
      validUntil: scope.validUntil,
      inputs: scope.inputs.map(({ id, label }) => ({ id, label })),
    };
  }
  async prepare(
    session: Session,
    instanceId: string,
    contextId: string,
    inputIds: unknown,
  ) {
    for (const [id, preview] of this.previews)
      if (preview.expiresAt <= this.now()) this.previews.delete(id);
    const scope = await this.scope(session.account, instanceId, contextId);
    if (
      !Array.isArray(inputIds) ||
      !inputIds.length ||
      inputIds.some(
        (id) =>
          typeof id !== "string" ||
          !scope.inputs.some((input) => input.id === id),
      ) ||
      new Set(inputIds).size !== inputIds.length
    )
      throw new ApplicationError(
        400,
        "Select only inputs permitted by the current context.",
      );
    const view: InferenceView = {
      instanceId,
      contextId,
      recipient: scope.recipient,
      purpose: scope.purpose,
      model: scope.model,
      inputs: scope.inputs.filter((input) => inputIds.includes(input.id)),
    };
    const preview: Preview = {
      id: randomUUID(),
      accountId: session.account.id,
      sessionHash: session.tokenHash,
      scopeFingerprint: fingerprint(scope),
      inputIds: [...inputIds],
      view: structuredClone(view),
      expiresAt: Math.min(
        scope.validUntil,
        session.expiresAt,
        this.now() + 300,
      ),
      state: "prepared",
    };
    this.previews.set(preview.id, preview);
    return {
      id: preview.id,
      ...view,
      expiresAt: preview.expiresAt,
      newLinkage: "None. Cross-context encrypted evidence delivery is not connected.",
      plaintextPath:
        "Your browser and this Permio server process the selected view. The NEAR AI SDK encrypts supported chat fields to the verified model key. The application relay is outside the model TEE.",
      retention:
        "This preview is held in server memory. Used or revoked previews are removed; expired previews are removed on access or when another preview is prepared. Restart clears all previews. No prompts or answers are written to the application database. Provider retention is not established by this integration.",
    };
  }
  private preview(session: Session, id: string) {
    if (!this.sessionIsCurrent(session))
      throw new ApplicationError(
        401,
        "This product session expired or was revoked. Log in again.",
      );
    const preview = this.previews.get(id);
    if (
      !preview ||
      preview.accountId !== session.account.id ||
      preview.sessionHash !== session.tokenHash
    )
      throw new ApplicationError(404, "Inference preview not found.");
    if (preview.expiresAt <= this.now()) {
      this.previews.delete(id);
      throw new ApplicationError(
        409,
        "This preview expired. Review a new preview.",
      );
    }
    return preview;
  }
  private async current(session: Session, preview: Preview) {
    if (!this.sessionIsCurrent(session))
      throw new ApplicationError(
        401,
        "This product session expired or was revoked. Log in again.",
      );
    const current = await this.scope(
      session.account,
      preview.view.instanceId,
      preview.view.contextId,
    );
    if (fingerprint(current) !== preview.scopeFingerprint)
      throw new ApplicationError(
        409,
        "Authorization or selected inputs changed. Review a new preview.",
      );
  }
  async consent(session: Session, id: string) {
    const preview = this.preview(session, id);
    await this.current(session, preview);
    if (this.previews.get(id) !== preview)
      throw new ApplicationError(409, "This consent was withdrawn.");
    if (preview.state !== "prepared")
      throw new ApplicationError(
        409,
        "This preview has already been confirmed.",
      );
    preview.state = "consented";
    return { id, state: "consented", expiresAt: preview.expiresAt };
  }
  revoke(session: Session, id: string) {
    this.preview(session, id);
    this.previews.delete(id);
    return { state: "revoked" };
  }
  async run(session: Session, id: string) {
    const preview = this.preview(session, id);
    if (preview.state !== "consented")
      throw new ApplicationError(
        403,
        "Review and confirm the selected disclosure before inference.",
      );
    await this.current(session, preview);
    // Revocation or a competing run while authorization is being read must win.
    if (this.previews.get(id) !== preview)
      throw new ApplicationError(
        409,
        "This consent was withdrawn or already used.",
      );
    if (preview.state !== "consented")
      throw new ApplicationError(409, "This preview is already in use.");
    if (preview.expiresAt <= this.now())
      throw new ApplicationError(
        409,
        "This preview expired. Review a new preview.",
      );
    if (this.provider.status().state !== "configured")
      throw new ApplicationError(503, this.provider.status().message);
    preview.state = "sending";
    let result: InferenceResult;
    try {
      result = await this.provider.complete(
        structuredClone(preview.view),
        async () => {
          await this.current(session, preview);
          if (
            this.previews.get(id) !== preview ||
            preview.expiresAt <= this.now() ||
            !this.sessionIsCurrent(session)
          )
            throw new ApplicationError(
              409,
              "Consent was withdrawn or expired before transmission.",
            );
          this.previews.delete(id);
        },
      );
    } finally {
      this.previews.delete(id);
    }
    if (
      !["gateway", "provider_tee"].includes(result.responseSigner) ||
      (["gateway", "model", "connection", "response"] as const).some(
        (check) => result.verification?.[check] !== "passed",
      )
    )
      throw new ApplicationError(
        502,
        "Required inference verification failed. The response was withheld.",
      );
    return {
      kind: "answer",
      answer: result.answer,
      responseSigner: result.responseSigner,
      verification: result.verification,
      actionAuthority: "none",
      message:
        "AI output is a suggestion. Actions require their own scoped authorization and execution.",
    };
  }
}
