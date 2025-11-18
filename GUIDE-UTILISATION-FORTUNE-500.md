# 🚀 GUIDE D'UTILISATION - OUTILS FORTUNE 500

Guide complet pour utiliser tous les outils de monitoring, CI/CD, tests et observabilité.

---

## 📋 TABLE DES MATIÈRES

1. [CI/CD GitHub Actions](#1-cicd-github-actions)
2. [Métriques Prometheus](#2-métriques-prometheus)
3. [Logs Winston](#3-logs-winston)
4. [Health Checks](#4-health-checks)
5. [Swagger API Documentation](#5-swagger-api-documentation)
6. [Tests (Unit, Integration, E2E, Load)](#6-tests)
7. [OpenTelemetry Tracing](#7-opentelemetry-tracing)
8. [Circuit Breakers](#8-circuit-breakers)

---

## 1. CI/CD GitHub Actions

### 🔄 Fonctionnement Automatique

Le CI/CD s'exécute **AUTOMATIQUEMENT** sur chaque push/PR vers `main` :

```yaml
# Déclenché par :
- git push origin main
- Pull Request vers main
- Exécution manuelle (workflow_dispatch)
```

### 📊 Pipeline Replit (7 Jobs)

**Fichier** : `.github/workflows/replit-deployment.yml`

**Jobs exécutés** :
1. ✅ **Quality & Security** - ESLint, audit npm, SAST (Semgrep)
2. ✅ **Unit Tests** - Tests unitaires Jest
3. ✅ **Integration Tests** - Tests d'intégration
4. ✅ **Build Validation** - Compilation TypeScript
5. ✅ **Deploy Staging** - Déploiement staging automatique
6. ✅ **Deploy Production** - Déploiement production (si main)
7. ✅ **Performance Monitoring** - Vérification des health checks

### 🖥️ Voir l'Exécution

1. Allez sur : `https://github.com/E-Code-AI/e-code/actions`
2. Cliquez sur votre dernier commit
3. Visualisez chaque job en temps réel
4. Téléchargez les artifacts (coverage reports, logs)

### ⚡ Exécution Manuelle

```bash
# Depuis GitHub :
Actions → Replit Deployment Pipeline → Run workflow

# Ou via GitHub CLI (si disponible) :
gh workflow run replit-deployment.yml
```

### 📈 Temps d'Exécution

- Quality & Security : ~2 min
- Tests : ~3-5 min
- Build : ~2 min
- Deploy : ~3 min
- **TOTAL** : ~10-15 min

---

## 2. Métriques Prometheus

### 📊 Accéder aux Métriques

**Port** : `9464`
**Endpoint** : `/metrics`

```bash
# En développement local
http://localhost:9464/metrics

# Sur Replit (remplacez par votre URL)
https://votre-app.replit.app/metrics
```

### 📈 Métriques Disponibles

```json
{
  "process": {
    "uptime": 3600,           // Uptime en secondes
    "pid": 1234,
    "version": "v20.x.x",
    "memory": {
      "rss": 123456789,       // Mémoire totale
      "heapTotal": 45678901,  // Heap total
      "heapUsed": 23456789,   // Heap utilisé
      "external": 1234567
    },
    "cpu": {
      "user": 123456,         // CPU user time
      "system": 78901         // CPU system time
    }
  },
  "system": {
    "loadAverage": [0.5, 0.7, 0.9],
    "freeMemory": 1234567890,
    "totalMemory": 8589934592
  }
}
```

### 📊 Intégration Grafana

Pour visualiser dans Grafana :

1. **Ajouter Data Source** :
   ```
   Type: Prometheus
   URL: https://votre-app.replit.app:9464
   ```

2. **Dashboard recommandé** :
   - Node.js Application Dashboard (ID: 11159)
   - Express.js Monitoring (ID: 14282)

3. **Requêtes PromQL utiles** :
   ```promql
   # CPU Usage
   rate(process_cpu_user_seconds_total[5m])

   # Memory Usage
   process_resident_memory_bytes

   # Request Rate
   rate(http_requests_total[5m])

   # Error Rate
   rate(http_errors_total[5m])
   ```

---

## 3. Logs Winston

### 📝 Configuration

**Fichier** : `server/utils/logger.ts`

**Niveaux de logs** :
- `error` - Erreurs critiques
- `warn` - Avertissements
- `info` - Informations générales (défaut)
- `debug` - Logs de débogage

### 🔍 Voir les Logs

#### En développement local :

```bash
# Logs console en temps réel
npm run dev

# Logs avec niveau debug
LOG_LEVEL=debug npm run dev
```

#### Sur Replit :

```bash
# Dans le Shell Replit
tail -f logs/application.log

# Logs des 100 dernières lignes
tail -100 logs/application.log

# Filtrer les erreurs
grep -i "error" logs/application.log

# Logs d'aujourd'hui seulement
grep "$(date +%Y-%m-%d)" logs/application.log
```

#### Format des logs :

```json
{
  "timestamp": "2025-11-17 12:34:56",
  "level": "info",
  "service": "e-code-platform",
  "message": "Request processed successfully",
  "requestId": "abc-123-def",
  "userId": "user_456",
  "duration": 123,
  "path": "/api/projects"
}
```

### 📊 Rotation des Logs

Les logs tournent automatiquement :
- **Fichier max** : 20 MB
- **Conservation** : 14 jours
- **Compression** : .gz après rotation

**Fichiers** :
```
logs/
├── application.log         # Logs actuels
├── application-2025-11-16.log.gz
├── application-2025-11-15.log.gz
└── error.log              # Erreurs uniquement
```

### 🔎 Recherche dans les Logs

```bash
# Chercher une erreur spécifique
grep -r "Error: ECONNREFUSED" logs/

# Logs d'un user spécifique
grep "userId.*user_123" logs/application.log

# Requests lentes (> 1000ms)
grep -P '"duration":\s*[0-9]{4,}' logs/application.log

# Taux d'erreur par heure
grep "$(date +%Y-%m-%d)" logs/error.log | cut -d' ' -f2 | cut -d':' -f1 | sort | uniq -c
```

---

## 4. Health Checks

### 🏥 Endpoints Disponibles

#### `/health` - Status Global
```bash
curl https://votre-app.replit.app/health
```

**Réponse** :
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T12:34:56.789Z",
  "uptime": 3600,
  "version": "2.0.0",
  "environment": "production"
}
```

#### `/health/liveness` - Kubernetes Liveness
```bash
curl https://votre-app.replit.app/health/liveness
```

**Réponse** :
```json
{
  "status": "ok",
  "alive": true,
  "pid": 1234,
  "uptime": 3600,
  "timestamp": "2025-11-17T12:34:56.789Z"
}
```

**Utilisé par** : Replit Cloud Run pour redémarrer l'app si elle ne répond plus

#### `/health/readiness` - Kubernetes Readiness
```bash
curl https://votre-app.replit.app/health/readiness
```

**Réponse** :
```json
{
  "status": "ok",
  "ready": true,
  "timestamp": "2025-11-17T12:34:56.789Z"
}
```

**Utilisé par** : Replit Cloud Run pour savoir si l'app peut recevoir du trafic

#### `/health/detailed` - Diagnostics Complets
```bash
curl https://votre-app.replit.app/health/detailed
```

**Réponse** :
```json
{
  "status": "healthy",
  "timestamp": "2025-11-17T12:34:56.789Z",
  "uptime": 3600,
  "checks": {
    "database": {
      "status": "healthy",
      "latency": 12
    },
    "memory": {
      "status": "healthy",
      "usage": 45.2,
      "limit": 512
    },
    "disk": {
      "status": "healthy",
      "usage": 23.5
    }
  },
  "metrics": {
    "requestsPerMinute": 120,
    "averageResponseTime": 45,
    "errorRate": 0.01
  }
}
```

### 🔍 Configuration Health Checks Replit

**Fichier** : `.replit`

```toml
[[deployment.healthCheck]]
path = "/health/liveness"
initialDelaySeconds = 30    # Attendre 30s au démarrage
periodSeconds = 10          # Vérifier toutes les 10s
timeoutSeconds = 5          # Timeout après 5s
failureThreshold = 3        # Redémarrer après 3 échecs

[[deployment.healthCheck]]
path = "/health/readiness"
initialDelaySeconds = 10
periodSeconds = 5
timeoutSeconds = 3
failureThreshold = 2
```

### 📊 Monitoring des Health Checks

```bash
# Surveiller les health checks en continu
watch -n 5 'curl -s https://votre-app.replit.app/health/detailed | jq'

# Tester la latence
time curl https://votre-app.replit.app/health/liveness

# Vérifier que tous les checks passent
curl -s https://votre-app.replit.app/health/detailed | jq '.checks'
```

---

## 5. Swagger API Documentation

### 📚 Accéder à la Documentation

**Endpoint** : `/api/docs`

```bash
# Interface Swagger UI interactive
https://votre-app.replit.app/api/docs

# Spécification OpenAPI JSON
https://votre-app.replit.app/api/docs/json
```

### 🎯 Fonctionnalités

1. **Explorer les Endpoints** - Liste complète des routes API
2. **Tester en Direct** - "Try it out" pour tester chaque endpoint
3. **Voir les Schémas** - Models de données TypeScript
4. **Authentication** - Tester avec votre token JWT
5. **Exemples** - Request/Response examples pour chaque route

### 📝 Utilisation

1. Ouvrez `https://votre-app.replit.app/api/docs`
2. Cliquez sur "Authorize" pour ajouter votre token JWT
3. Explorez les endpoints par catégorie :
   - 🔐 Auth
   - 👤 Users
   - 📁 Projects
   - 🤖 AI Agent
   - 📊 Analytics
4. Cliquez "Try it out" pour tester un endpoint
5. Remplissez les paramètres requis
6. Cliquez "Execute" pour voir la réponse

### 📥 Export OpenAPI

```bash
# Télécharger la spécification OpenAPI
curl https://votre-app.replit.app/api/docs/json > openapi.json

# Générer un client TypeScript
npx openapi-typescript openapi.json --output ./types/api.ts

# Générer un client Python
openapi-generator-cli generate -i openapi.json -g python -o ./clients/python
```

---

## 6. Tests

### 🧪 Lancer les Tests

#### Tests CI (Rapides)
```bash
npm run test:ci
# ✅ Validation TypeScript uniquement
# ⏱️ Temps : ~30 secondes
```

#### Tests Unitaires
```bash
npm run test:unit
# ✅ Tests des services, middleware, utils
# 📊 Coverage cible : 80%
# ⏱️ Temps : ~2-3 minutes
```

#### Tests d'Intégration
```bash
npm run test:integration
# ✅ Tests API end-to-end
# 🔗 Tests des routes : auth, projects, AI
# ⏱️ Temps : ~3-5 minutes
```

#### Tests E2E (Playwright)
```bash
npm run test:e2e
# ✅ Tests du parcours utilisateur complet
# 🌐 Tests navigateur réel
# ⏱️ Temps : ~5-7 minutes
```

#### Tests de Charge (Artillery)
```bash
npm run test:load
# ✅ Tests de performance sous charge
# 📊 100+ requêtes/seconde
# ⏱️ Temps : ~3-5 minutes
```

#### Coverage Report
```bash
npm run test:coverage
# ✅ Génère un rapport HTML
# 📊 Ouvrir : coverage/lcov-report/index.html
```

#### Suite Complète
```bash
npm run test:full
# ✅ Tous les tests (CI + Unit + Integration + E2E)
# ⏱️ Temps : ~15-20 minutes
```

### 📊 Voir les Résultats

#### Console Output
```bash
 PASS  test/unit/services/agent-plan-generator.service.test.ts
  AgentPlanGeneratorService
    ✓ should generate plan with OpenAI (123ms)
    ✓ should handle API errors gracefully (45ms)
    ✓ should validate parameters (12ms)
    ✓ should support multi-model fallback (234ms)

Test Suites: 5 passed, 5 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        12.345s
Coverage:    85.32%
```

#### Coverage Report (HTML)
```bash
# Générer et ouvrir le rapport
npm run test:coverage
xdg-open coverage/lcov-report/index.html
```

#### Artifacts CI
Après chaque run CI/CD, téléchargez :
- 📊 Coverage reports
- 📝 Test logs
- 🎥 Playwright videos (si échec)
- 📸 Screenshots (si échec)

### 🎯 Thresholds

**Configuration** : `jest.config.enterprise.js`

```javascript
coverageThresholds: {
  global: {
    statements: 80,   // 80% des lignes
    branches: 75,     // 75% des branches
    functions: 80,    // 80% des fonctions
    lines: 80         // 80% des lignes
  }
}
```

---

## 7. OpenTelemetry Tracing

### 🔍 Distributed Tracing

**Port** : `9464` (avec Prometheus)
**Protocol** : OTLP/HTTP

### 📊 Visualiser les Traces

#### Option 1 : Jaeger (Recommandé)

```bash
# Lancer Jaeger en local avec Docker
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4318:4318 \
  jaegertracing/all-in-one:latest

# Configurer l'endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Ouvrir Jaeger UI
open http://localhost:16686
```

#### Option 2 : Grafana Tempo

```yaml
# Configuration Tempo
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  tempo:
    endpoint: tempo:4317
```

### 🎯 Traces Automatiques

L'instrumentation automatique capture :
- ✅ Requêtes HTTP (Express)
- ✅ Requêtes Database (PostgreSQL)
- ✅ Appels externes (fetch, axios)
- ✅ Redis operations
- ✅ DNS lookups

### 📝 Traces Personnalisées

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

async function myFunction() {
  const span = tracer.startSpan('operation-name');

  try {
    // Votre code ici
    span.setAttribute('user.id', userId);
    span.setAttribute('operation.type', 'query');

    const result = await doSomething();

    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message
    });
    throw error;
  } finally {
    span.end();
  }
}
```

### 🔎 Analyser les Traces

Dans Jaeger UI :
1. Sélectionnez "e-code-platform" comme service
2. Filtrez par opération (ex: "GET /api/projects")
3. Visualisez la timeline complète de la requête
4. Identifiez les bottlenecks (spans les plus longs)
5. Trouvez les erreurs (spans en rouge)

---

## 8. Circuit Breakers

### 🛡️ Protection des Services

**Fichier** : `server/resilience/circuit-breaker.ts`

### 📊 États du Circuit Breaker

1. **CLOSED** (Normal) - Toutes les requêtes passent
2. **OPEN** (Coupé) - Toutes les requêtes échouent immédiatement
3. **HALF_OPEN** (Test) - Quelques requêtes test passent

### 🎯 Configuration

```typescript
const breaker = new CircuitBreaker({
  failureThreshold: 5,      // Ouvrir après 5 échecs
  successThreshold: 2,      // Fermer après 2 succès
  timeout: 3000,            // Timeout 3 secondes
  resetTimeout: 30000       // Réessayer après 30 secondes
});
```

### 📊 Monitoring

```bash
# Voir l'état des circuit breakers
curl https://votre-app.replit.app/health/detailed | jq '.circuitBreakers'
```

**Réponse** :
```json
{
  "circuitBreakers": {
    "openai": {
      "state": "CLOSED",
      "failureCount": 0,
      "successCount": 125,
      "lastFailureTime": null
    },
    "anthropic": {
      "state": "OPEN",
      "failureCount": 5,
      "successCount": 0,
      "lastFailureTime": "2025-11-17T12:30:00Z",
      "nextRetryTime": "2025-11-17T12:30:30Z"
    }
  }
}
```

### 🔔 Alertes

Les circuit breakers déclenchent des alertes quand :
- ⚠️ Circuit passe en OPEN
- ✅ Circuit revient en CLOSED
- 🔄 Circuit en HALF_OPEN

---

## 🚨 TROUBLESHOOTING

### CI/CD échoue

```bash
# 1. Vérifier les logs GitHub Actions
https://github.com/E-Code-AI/e-code/actions

# 2. Lancer les tests localement
npm run test:full

# 3. Vérifier la compilation
npm run build
```

### Prometheus ne répond pas

```bash
# 1. Vérifier que le port 9464 est ouvert
curl http://localhost:9464/metrics

# 2. Vérifier les logs
grep -i "prometheus" logs/application.log

# 3. Redémarrer le serveur
npm run dev
```

### Logs ne s'affichent pas

```bash
# 1. Vérifier le niveau de log
LOG_LEVEL=debug npm run dev

# 2. Vérifier les permissions
ls -la logs/

# 3. Créer le dossier si nécessaire
mkdir -p logs
```

### Tests échouent

```bash
# 1. Nettoyer les dépendances
rm -rf node_modules package-lock.json
npm install

# 2. Vérifier les variables d'environnement
cp .env.example .env

# 3. Lancer un seul test pour debug
npm run test:unit -- agent-plan-generator
```

---

## 📞 SUPPORT

Pour plus d'informations, consultez :
- 📖 `RAPPORT-IMPLEMENTATION-FORTUNE-500.md` - Rapport complet
- 🚀 `docs/REPLIT-DEPLOYMENT-GUIDE.md` - Guide Replit
- 🏭 `docs/PRODUCTION-DEPLOYMENT-GUIDE.md` - Guide Kubernetes
- 🆘 `docs/runbooks/incident-response.md` - Gestion incidents
- 💾 `docs/operations/disaster-recovery-plan.md` - Plan DR

---

**Dernière mise à jour** : 2025-11-17
**Version** : 2.0.0 - Fortune 500 Production Standards
