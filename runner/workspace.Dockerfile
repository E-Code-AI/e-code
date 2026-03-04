FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
  curl ca-certificates git bash python3 python3-pip \
  build-essential tini procps htop nano vim \
  && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get update && apt-get install -y nodejs \
  && rm -rf /var/lib/apt/lists/*

RUN npm install -g npm@latest typescript ts-node nodemon

RUN pip3 install --no-cache-dir flask fastapi uvicorn requests httpx

RUN useradd -m -u 1000 -s /bin/bash runner

USER runner
WORKDIR /workspace

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bash", "-lc", "sleep infinity"]
