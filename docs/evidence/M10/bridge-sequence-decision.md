# Encrypted evidence delivery: approved sequence

Status: APPROVED by the user on 2026-11-15.

The earlier specification required ciphertext digests before signing but placed
local encryption after authorization. Exact ciphertext digests require the
ciphertext to exist first; encrypting again after signing changes those bytes.

The approved order is:

1. Select the exact records, recipient key, source/destination and purpose.
2. Show the complete disclosure/linkage preview and obtain explicit confirmation.
3. Encrypt locally and calculate the exact ciphertext digests and manifest root.
4. Sign the scoped ActionIntent binding the manifest and disclosure scope.
5. Verify the Midnight authorization contract's bridge receipt.
6. Deliver the unchanged prepared ciphertext and manifest to the evidence vault.
7. Verify the receipt, gateway authenticity when used, bindings, expiry and current
   revocation state before recipient decryption.

Local preparation sends no evidence. Denied, expired or revoked authorization
blocks delivery. Changes to the selected records, recipient key or disclosure
scope require a new preview. Existing ciphertext is never silently retargeted.

The bilingual workflow specification records this order. The local client
controller now implements confirmation, encryption, signed binding, mandatory
authorization verification and independent channel delivery/retry. Deployed
bridge admission, finalized-source verification and authenticated production
retrieval/delivery still require integration. Local tests do not establish live
acceptance. See [implementation evidence](delivery-workflow-development.md).
