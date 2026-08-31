# Verifier image: the pinned task image with the held-back tests baked in.
# tests/ is the build context; the agent never sees this container.
FROM us-docker.pkg.dev/afterquery-compute/compute-images/gold-repo-rate-eat-gzfioe:v8

USER root

RUN command -v python3 >/dev/null 2>&1 || \
    { { apt-get update && apt-get install -y --no-install-recommends python3 \
        && rm -rf /var/lib/apt/lists/*; } \
      || apk add --no-cache python3 \
      || microdnf -y install python3 || dnf -y install python3 || yum -y install python3 \
      || { echo "PLATFORM ERROR: no python3 and no apt-get/apk/dnf/yum to install it. The grader cannot run in this image."; exit 1; }; }

COPY test.sh /tests/test.sh
COPY test.patch /tests/test.patch
COPY grader.py /tests/grader.py
COPY config.json /tests/config.json
RUN chmod +x /tests/test.sh
