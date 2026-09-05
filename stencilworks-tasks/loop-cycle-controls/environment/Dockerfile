# Reference environment Dockerfile for stencilworks (newrepofromafterquery).
# Submit environment changes through the platform UI — this seeds the image build.
# Pin by digest after publishing: docker inspect --format '{{index .RepoDigests 0}}' rust:1.92-slim-bookworm
FROM rust:1.92-slim-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        git \
        pkg-config \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Warm the toolchain declared in rust-toolchain.toml when the repo is checked out.
# The platform copies the repository to /app at base_commit during task runs.
