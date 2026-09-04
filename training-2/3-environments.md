Environments
An environment turns your repository into a reproducible container image. You author only the dependency-setup Dockerfile; the platform owns checking out your repository at the base commit you choose and placing it at /app. Pick a base commit deliberately — every task built on this environment version is defined against it.

Dockerfiles are automatically checked. The rules:

Exactly one FROM, using the language default (python:3.12-slim, node:24-bookworm-slim, golang:1.25-bookworm, rust:1.92-slim-bookworm) or any public base pinned by digest (@sha256:…). You are not limited to the default versions: to use any other image or version, find its digest with docker pull python:3.9-slim then docker inspect --format '{{index .RepoDigests 0}}' python:3.9-slim and put the printed @sha256:… on your FROM line.
Keep it small: at most 20 KB, 200 lines, and 30 RUN steps.
Pin installs: exact versions for pip / npm installs; apt-get with --no-install-recommends.
No curl | sh, no ADD from URLs, no privileged tooling, no long encoded blobs or dynamic eval.
No git clone or fetching repositories — the platform supplies your repo. No copying tests or solutions into the image.
Do not swallow errors (|| true) — a broken install must fail the build, not surface later inside a task.
After the static checks, an automated review screens the Dockerfile, the image builds, and on success the version is published and available to new tasks. Builds are visible live from the repository page. Each new Dockerfile submission creates a new version; existing tasks keep the exact image they were built on.