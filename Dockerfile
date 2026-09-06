FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5

ENV DEBIAN_FRONTEND=noninteractive \
    NODE_ENV=development \
    NPM_CONFIG_UPDATE_NOTIFIER=false

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        python3 \
        make \
        g++ \
        postgresql \
        postgresql-client \
        redis-server \
        procps \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/ctrf \
    && cd /opt/ctrf \
    && npm init -y \
    && npm install --save-exact jest-ctrf-json-reporter@0.0.11 \
    && npm cache clean --force

WORKDIR /app