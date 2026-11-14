# Opt-in cache-lifetime experiment, not the unmodified upstream distribution.
# Build context: logs/m6-prover-source, at the exact revision with cache.patch.
FROM rust:1.95.0-bookworm@sha256:6258907abe69656e41cd992e0b705cdcfabcbbe3db374f92ed2d47121282d4a1 AS builder
RUN apt-get update && apt-get install -y --no-install-recommends patchelf cmake
RUN rustup component add rustfmt
WORKDIR /src
COPY . .
ENV CARGO_BUILD_JOBS=1
RUN test "$(git rev-parse HEAD)" = d89e0b6334f83bc9477152fb5edf7eca71660237
RUN rustc --version && cargo --version && cargo fmt --all -- --check
RUN cargo test --release --locked -p midnight-transient-crypto --lib weak_cache

FROM builder AS tested
# Only public parameters/keys, supplied as a separate explicit build context.
# This supplies Nix's normal prerequisite without downloading inside /check.
COPY --from=publicparams /zk-params/ /opt/midnight-public-params/
ENV MIDNIGHT_PP=/opt/midnight-public-params \
    MIDNIGHT_LEDGER_TEST_STATIC_DIR=/opt/midnight-ledger-test-artifacts \
    RAYON_NUM_THREADS=4
# Preserve expensive compiler output even if a test fails. Seed it from the
# already checked builder stage and keep the path unchanged for Cargo.
RUN --mount=type=cache,id=permio-ledger-8.1-weak-prover-v1,target=/src/target,from=builder,source=/src/target,sharing=locked \
    cargo build --release --locked -p midnight-zkir --features binary --bin zkir && \
    mkdir -p /opt/midnight-ledger-test-artifacts/fallible/zkir && \
    cp zkir-precompiles/fallible/count.zkir /opt/midnight-ledger-test-artifacts/fallible/zkir/ && \
    target/release/zkir compile-many /opt/midnight-ledger-test-artifacts/fallible/zkir /opt/midnight-ledger-test-artifacts/fallible/keys && \
    RUST_LOG=error cargo test --release --locked -p midnight-proof-server -- --test-threads=1 && \
    cargo test --release --locked -p midnight-transient-crypto --lib && \
    cargo build --release --locked -p midnight-proof-server && \
    mkdir -p /out && cp target/release/midnight-proof-server /out/permio-proof-server
RUN test "$(git -c core.autocrlf=true diff HEAD --no-ext-diff --binary | sha256sum | cut -d' ' -f1)" = \
    404ae63237df57b0f775a652ca55638cf64e562ccb2b46bf0fe01ffc9d5ffc22
# Keep the existing runtime's glibc/allocator, rather than introducing musl or
# bundling a different allocator. The GNU-linked builder needs only these libs.
RUN ldd /out/permio-proof-server && \
    patchelf --set-interpreter /nix/store/jms7zxzm7w1whczwny5m3gkgdjghmi2r-glibc-2.42-51/lib/ld-linux-x86-64.so.2 \
      --set-rpath /nix/store/jms7zxzm7w1whczwny5m3gkgdjghmi2r-glibc-2.42-51/lib:/nix/store/vpxblivamvic1p5r5zny934jvg33m50r-xgcc-15.2.0-libgcc/lib \
      /out/permio-proof-server

FROM midnightntwrk/proof-server:8.1.0@sha256:801bbc0340e9e96f16735f77b523f23c7459e3359842f7c79c2c53f4e994d531
COPY --from=tested /out/permio-proof-server /usr/local/bin/permio-proof-server
LABEL org.opencontainers.image.source="https://github.com/midnightntwrk/midnight-ledger" \
      org.opencontainers.image.revision="d89e0b6334f83bc9477152fb5edf7eca71660237" \
      io.permio.prover-patch-sha256="404ae63237df57b0f775a652ca55638cf64e562ccb2b46bf0fe01ffc9d5ffc22" \
      io.permio.prover-experiment="weak-decoded-key-cache-v1"
