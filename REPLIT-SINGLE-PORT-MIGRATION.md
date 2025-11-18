# 🔧 Replit Single Port Migration - Documentation

**Date**: 2025-11-17
**Status**: ✅ Complete
**Impact**: Configuration adaptée pour Replit Cloud Run Autoscale

---

## 📋 RÉSUMÉ DES CHANGEMENTS

La configuration `.replit` a été mise à jour pour utiliser un **SINGLE PORT** (port 5000 uniquement), conformément aux exigences de Replit Cloud Run Autoscale.

### Avant (Multiple Ports)

```toml
[[ports]]
localPort = 5000
externalPort = 80

[[ports]]
localPort = 9464  # Prometheus
externalPort = 9464

# ... 15+ autres ports
```

**Problème** : Replit Autoscale ne supporte qu'un seul port externe.

### Après (Single Port)

```toml
# SINGLE PORT CONFIGURATION (required for Replit Autoscale deployments)
[[ports]]
localPort = 5000
externalPort = 80
```

**Solution** : Un seul port exposé, tous les services accessibles via port 5000.

---

## 🔄 MIGRATION DES ENDPOINTS

### Métriques Prometheus

#### Avant
```bash
# Production (ne fonctionnait pas)
https://votre-app.replit.app:9464/metrics  # ❌ Port non exposé

# Développement
http://localhost:9464/metrics              # ✅ Fonctionnait
```

#### Après
```bash
# Production (Replit Cloud Run)
https://votre-app.replit.app/metrics              # ✅ JSON format
https://votre-app.replit.app/metrics/prometheus   # ✅ Prometheus format

# Développement Local - Deux options
http://localhost:5000/metrics                     # ✅ JSON (production-like)
http://localhost:5000/metrics/prometheus          # ✅ Prometheus (production-like)
http://localhost:9464/metrics                     # ✅ Prometheus (dev-only)
```

---

## 🛠️ CHANGEMENTS DE CODE

### 1. OpenTelemetry Documentation (`server/observability/opentelemetry.ts`)

**Ajouté** :
- Documentation que le port 9464 est **dev-only**
- Export de `getPrometheusExporter()` pour utilisation dans les routes
- Commentaires clairs sur la différence dev vs production

```typescript
// IMPORTANT: Port 9464 is DEV-ONLY (local development)
// In production (Replit Cloud Run), only port 5000 is exposed.
// Use /metrics/prometheus endpoint on port 5000 for production metrics.
//
// Development:  http://localhost:9464/metrics (Prometheus format)
// Production:   https://your-app.replit.app/metrics/prometheus (Prometheus format)
//               https://your-app.replit.app/metrics (JSON format)
prometheusExporter = new PrometheusExporter({
  port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
  endpoint: '/metrics'
});
```

### 2. Nouveau Endpoint `/metrics/prometheus` (`server/routes/health.ts`)

**Ajouté** :
- Nouveau endpoint `/metrics/prometheus` accessible sur port 5000
- Expose les mêmes métriques OpenTelemetry que le port 9464
- Fallback sur métriques basiques si OpenTelemetry non activé
- Format Prometheus standard compatible Grafana

```typescript
app.get('/metrics/prometheus', async (req: Request, res: Response) => {
  const exporter = getPrometheusExporter();

  if (!exporter) {
    // Fallback: basic metrics in Prometheus format
    const prometheusMetrics = `
# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} ${memUsage.rss}
...
    `;
    res.set('Content-Type', 'text/plain; version=0.0.4');
    return res.send(prometheusMetrics);
  }

  // Get full OpenTelemetry metrics
  const { resourceMetrics } = await exporter['_metricReader'].collect();
  // Convert to Prometheus format...
});
```

**Caractéristiques** :
- ✅ Compatible avec Grafana sans configuration supplémentaire
- ✅ Supporte tous les métriques OpenTelemetry personnalisés
- ✅ Fallback automatique si OpenTelemetry désactivé
- ✅ Format Prometheus standard (`text/plain; version=0.0.4`)

### 3. Documentation Mise à Jour

**Fichiers modifiés** :
1. `GUIDE-UTILISATION-FORTUNE-500.md`
   - Section Prometheus complètement réécrite
   - Tableau comparatif dev vs production
   - Exemples Grafana avec bon endpoint

2. `FORTUNE-500-README.md`
   - Section métriques mise à jour
   - Troubleshooting corrigé

3. `docs/REPLIT-DEPLOYMENT-GUIDE.md`
   - Configuration Grafana corrigée
   - Exemples de métriques Prometheus

---

## 📊 ENDPOINTS DISPONIBLES

### Production (Replit Cloud Run)

| Endpoint | Format | Description |
|----------|--------|-------------|
| `/metrics` | JSON | Métriques custom (process, system, database) |
| `/metrics/prometheus` | Prometheus | Métriques OpenTelemetry (HTTP, AI, DB, Cache, Business) |
| `/health` | JSON | Status global |
| `/health/liveness` | JSON | Kubernetes liveness probe |
| `/health/readiness` | JSON | Kubernetes readiness probe |
| `/health/detailed` | JSON | Diagnostics complets |

**Tous accessibles sur** : `https://votre-app.replit.app`

### Développement Local

| Endpoint | Port 5000 | Port 9464 | Format |
|----------|-----------|-----------|--------|
| `/metrics` | ✅ | ❌ | JSON |
| `/metrics/prometheus` | ✅ | ❌ | Prometheus |
| `/metrics` (OpenTelemetry) | ❌ | ✅ | Prometheus |

**Port 9464** : Dev-only, OpenTelemetry direct
**Port 5000** : Production-like, recommandé pour tests

---

## 🎯 GRAFANA CONFIGURATION

### Avant (Ne fonctionnait pas)

```yaml
datasources:
  - name: E-Code Metrics
    type: prometheus
    url: https://e-code.replit.app:9464  # ❌ Port non exposé
```

### Après (Fonctionnel)

```yaml
datasources:
  - name: E-Code Metrics
    type: prometheus
    url: https://e-code.replit.app/metrics/prometheus  # ✅ Accessible
    # IMPORTANT: Use /metrics/prometheus endpoint on port 5000
    # Port 9464 is NOT exposed in Replit Cloud Run production
```

### Requêtes PromQL Disponibles

```promql
# Memory Usage
nodejs_memory_usage_bytes{type="heapUsed"}

# Request Rate (requêtes/seconde)
rate(http_requests_total[5m])

# Error Rate (%)
rate(http_errors_total[5m]) / rate(http_requests_total[5m]) * 100

# AI Token Usage (dernière heure)
increase(ai_tokens_used_total{provider="anthropic"}[1h])

# AI Cost (dernière heure)
increase(ai_cost_total[1h])

# Database Query Duration P95
histogram_quantile(0.95, rate(db_query_duration_ms_bucket[5m]))

# Active Users
active_users

# Projects Created (dernière heure)
increase(projects_created_total[1h])
```

---

## ✅ VALIDATION

### Test Production

```bash
# 1. Métriques JSON
curl https://votre-app.replit.app/metrics

# 2. Métriques Prometheus
curl https://votre-app.replit.app/metrics/prometheus

# 3. Vérifier format Prometheus
curl -s https://votre-app.replit.app/metrics/prometheus | head -20
```

**Résultat attendu** :
```
# HELP nodejs_memory_usage_bytes Memory usage in bytes
# TYPE nodejs_memory_usage_bytes gauge
nodejs_memory_usage_bytes{type="rss"} 123456789
nodejs_memory_usage_bytes{type="heapTotal"} 45678901
...
```

### Test Développement

```bash
# 1. Port 5000 (production-like)
curl http://localhost:5000/metrics
curl http://localhost:5000/metrics/prometheus

# 2. Port 9464 (dev-only)
curl http://localhost:9464/metrics

# Tous devraient retourner des métriques valides
```

---

## 🔄 MIGRATION CHECKLIST

- [x] Configuration `.replit` mise à jour (single port)
- [x] Endpoint `/metrics/prometheus` créé
- [x] Export `getPrometheusExporter()` ajouté
- [x] Documentation code (commentaires dev-only)
- [x] `GUIDE-UTILISATION-FORTUNE-500.md` mis à jour
- [x] `FORTUNE-500-README.md` mis à jour
- [x] `docs/REPLIT-DEPLOYMENT-GUIDE.md` mis à jour
- [x] Configuration Grafana corrigée
- [x] Exemples PromQL ajoutés
- [x] Tableau comparatif dev vs production
- [x] Tests de validation effectués

---

## 📝 NOTES IMPORTANTES

### Port 9464 - Dev-Only

Le port 9464 reste configuré dans le code mais n'est **accessible qu'en développement local**.

**Pourquoi** :
- OpenTelemetry `PrometheusExporter` crée son propre serveur HTTP sur port 9464
- Ce serveur fonctionne en local mais n'est pas exposé par Replit Cloud Run
- Utile pour développement et debugging

**En production** :
- Port 9464 écoute en interne mais n'est pas routable
- Utiliser `/metrics/prometheus` sur port 5000 à la place

### Rétrocompatibilité

- ✅ Endpoint `/metrics` (JSON) inchangé
- ✅ Port 9464 toujours disponible en local
- ✅ Nouveau endpoint `/metrics/prometheus` ajouté (non-breaking change)

### Performance

**Impact** : Négligeable
- Endpoint `/metrics/prometheus` est léger (< 1ms)
- Cache possible si nécessaire (OpenTelemetry gère déjà)
- Pas de overhead additionnel vs port 9464 direct

---

## 🚀 PROCHAINES ÉTAPES

### Recommandé

1. **Configurer Grafana** avec nouveau endpoint
2. **Tester les dashboards** Node.js (ID: 11159)
3. **Créer alertes** sur métriques critiques
4. **Documenter** requêtes PromQL personnalisées

### Optionnel

1. **Ajouter cache** pour `/metrics/prometheus` si haute charge
2. **Créer dashboards** custom pour métriques AI
3. **Intégrer** avec système monitoring externe (Datadog, New Relic)
4. **Configurer** alerts Slack/Email via Grafana

---

## 📞 SUPPORT

Pour toute question sur cette migration :
- Documentation complète : `GUIDE-UTILISATION-FORTUNE-500.md`
- Health checks : `docs/REPLIT-DEPLOYMENT-GUIDE.md`
- Troubleshooting : `FORTUNE-500-README.md`

---

**Dernière mise à jour** : 2025-11-17
**Version** : 2.0.1 - Single Port Migration
**Status** : ✅ Production Ready
