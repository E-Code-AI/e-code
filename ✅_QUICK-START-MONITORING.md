# ✅ QUICK START - Monitoring Fortune 500

**Date de vérification** : 26 Novembre 2025  
**Domaine** : https://e-code.ai  
**Status** : ✅ VÉRIFIÉ - Endpoints et scripts existent

Guide rapide pour démarrer le monitoring de votre plateforme.

## 🎯 Liens Rapides

### Production (E-Code)

```bash
# Health Checks
https://e-code.ai/health
https://e-code.ai/health/liveness
https://e-code.ai/health/readiness
https://e-code.ai/health/detailed

# Métriques Prometheus
https://e-code.ai/metrics

# Documentation API
https://e-code.ai/api/docs
```

### En Local

```bash
http://localhost:5000/health
http://localhost:5000/metrics
http://localhost:5000/api/docs
```

## ⚡ Scripts Rapides

### 1. Tester tous les endpoints

```bash
./test-fortune500-endpoints.sh
# Pour production E-Code :
./test-fortune500-endpoints.sh https://e-code.ai
```

### 2. Dashboard en temps réel

```bash
./monitor-dashboard.sh
# Pour production E-Code :
./monitor-dashboard.sh https://e-code.ai
```

### 3. Voir les logs

```bash
# Logs en temps réel
tail -f logs/application.log

# Erreurs uniquement
tail -f logs/error.log

# Filtrer par niveau
grep "ERROR" logs/application.log
grep "WARN" logs/application.log
```

## 🧪 Lancer les Tests

```bash
# Tests rapides (CI)
npm run test:ci

# Tests unitaires
npm run test:unit

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e

# Tests de charge
npm run test:load

# Tous les tests + coverage
npm run test:full
```

## 📊 CI/CD GitHub Actions

Voir l'exécution :
```
https://github.com/e-code-ai/e-code/actions
```

Le pipeline s'exécute automatiquement sur :
- Chaque push vers `main`
- Chaque Pull Request

## 🔍 Vérification Rapide

```bash
# 1. Vérifier que le serveur répond
curl http://localhost:5000/health

# 2. Vérifier la base de données
curl http://localhost:5000/health/detailed | jq '.checks.database'

# 3. Vérifier les métriques
curl http://localhost:5000/metrics | head -20

# 4. Vérifier les logs
tail -20 logs/application.log
```

## 📚 Documentation Complète

Pour plus de détails, consultez :
- **docs/PRODUCTION-DEPLOYMENT-GUIDE.md** - Guide de déploiement production
- **docs/operations/deployment.md** - Opérations de déploiement
- **docs/✅_REPLIT-DEPLOYMENT-GUIDE.md** - Guide Replit vérifié
- **docs/operations/disaster-recovery-plan.md** - Plan de reprise

## 🆘 Troubleshooting

### Le serveur ne démarre pas

```bash
# 1. Nettoyer et réinstaller
rm -rf node_modules
npm install

# 2. Vérifier les variables d'environnement
cp .env.example .env

# 3. Redémarrer
npm run dev
```

### Les tests échouent

```bash
# Vérifier TypeScript
npm run typecheck

# Nettoyer le cache
npm run clean
npm install
```

### Les métriques ne s'affichent pas

```bash
# Vérifier le port 9464
curl http://localhost:9464/metrics

# Vérifier les logs
grep "prometheus" logs/application.log
```

## 🎯 Prochaines Étapes

1. ✅ Configurer Grafana pour visualiser Prometheus
2. ✅ Configurer Jaeger pour les traces OpenTelemetry
3. ✅ Mettre en place des alertes Slack/Email
4. ✅ Configurer le monitoring uptime
5. ✅ Tester le disaster recovery plan

---

**Besoin d'aide ?** Consultez `docs/PRODUCTION-DEPLOYMENT-GUIDE.md` ou `docs/operations/deployment.md`
