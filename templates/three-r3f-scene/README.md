# Three.js + React Three Fiber

Official E-code template for creative projects.

## Stack

- Language: typescript
- Runtime port: 5173
- Deployment target: Google Cloud Run
- Storage: Google Cloud Storage through the shared E-code storage wrapper

## Run

```bash
npm install
npm run dev
npm test
```

## Deploy

Build with Cloud Build, push to Artifact Registry, and deploy to Cloud Run. Runtime secrets are injected from Secret Manager. Project files are copied from GCS before build.

## Template ID

`three-r3f-scene`
