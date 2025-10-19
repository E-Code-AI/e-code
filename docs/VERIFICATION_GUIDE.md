# 🎯 Guide de Vérification des PRs Codex

## ✨ Commandes Rapides

### 1️⃣ Vérification Complète (15 dernières PRs)
```bash
bash scripts/verify-codex-prs.sh
```

### 2️⃣ Vérification Rapide (5 dernières PRs)
```bash
bash scripts/verify-codex-prs.sh 5
```

### 3️⃣ Vérification Approfondie (30 dernières PRs)
```bash
bash scripts/verify-codex-prs.sh 30
```

---

## 📖 Ce Que Vous Devez Savoir

### Quand Lancer le Script?

✅ **À lancer:**
- Après chaque merge de PR codex
- Avant un déploiement en production
- Quand l'application a des comportements étranges
- Une fois par jour pour surveillance proactive
- Après avoir tiré les derniers changements (`git pull`)

❌ **Pas nécessaire:**
- Avant chaque commit local
- Pour des changements mineurs de documentation
- Si vous n'avez pas mergé de PR récemment

---

## 📊 Comprendre les Résultats

### ✅ Tout est OK
```
========================================
  Verification Complete
========================================

✅ ALL CHECKS PASSED
No issues found in the last 15 codex PRs

📄 Full report: reports/codex-audits/audit_20251019_143000.md
```
**Action**: Rien à faire, tout fonctionne! 🎉

---

### ⚠️ Problèmes Détectés
```
========================================
  Verification Complete
========================================

⚠️  ISSUES FOUND: 2

📄 Full report: reports/codex-audits/audit_20251019_143000.md
```
**Action**: Ouvrir le rapport et suivre les recommandations

---

## 🔧 Corriger les Problèmes Courants

### 1. Table de Base de Données Manquante
```
✗ Missing table: customer_requests
```
**Solution:**
```bash
npm run db:push --force
```

---

### 2. Port Bloqué
```
⚠ Port 3200 not listening
```
**Solution:**
```bash
# Tuer le processus sur le port
fuser -k 3200/tcp

# Redémarrer l'application
npm run dev
```

---

### 3. Migration Non Appliquée
```
Found migration: 20251020_add_customer_requests_table.sql
```
**Solution:**
```bash
psql $DATABASE_URL -f server/db/migrations/20251020_add_customer_requests_table.sql
```

---

### 4. Erreurs TypeScript
```
❌ TypeScript compilation errors: 5 errors found
```
**Solution:**
```bash
# Voir les erreurs détaillées
npx tsc --noEmit

# Corriger les erreurs dans les fichiers signalés
```

---

## 📁 Où Trouver les Rapports?

Les rapports sont sauvegardés dans:
```
reports/codex-audits/
├── audit_20251019_143000.md  ← Dernier rapport
├── audit_20251019_150000.md
└── audit_20251019_160000.md
```

**Ouvrir le dernier rapport:**
```bash
cat reports/codex-audits/audit_*.md | tail -100
```

---

## 🚀 Automatisation

### Exécuter Automatiquement Après Chaque Pull
Ajouter à votre `.bashrc` ou `.zshrc`:
```bash
alias git-pull-verify='git pull && bash scripts/verify-codex-prs.sh'
```

Utilisation:
```bash
git-pull-verify
```

---

### Créer un Cron Job (Vérification Quotidienne)
```bash
# Ouvrir crontab
crontab -e

# Ajouter cette ligne (vérifie tous les jours à 9h)
0 9 * * * cd /path/to/e-code && bash scripts/verify-codex-prs.sh >> /var/log/codex-verify.log 2>&1
```

---

## ❓ FAQ

**Q: Le script prend combien de temps?**  
A: ~30 secondes pour 15 PRs, ~10 secondes pour 5 PRs

**Q: Puis-je lancer le script si l'app n'est pas démarrée?**  
A: Oui, mais le check "Application Health" échouera (normal)

**Q: Les rapports sont-ils versionnés dans Git?**  
A: Non, `reports/` est dans `.gitignore` (rapports locaux uniquement)

**Q: Puis-je modifier le script?**  
A: Oui! Le script est dans `scripts/verify-codex-prs.sh`, entièrement personnalisable

---

## 💡 Conseils Pro

1. **Lancez avant de quitter**: Vérifiez toujours avant de finir votre journée
2. **Gardez les rapports**: Ils sont utiles pour comprendre l'historique des problèmes
3. **Partagez les rapports**: Envoyez-les à l'équipe si vous trouvez des problèmes systémiques
4. **Automatisez**: Configurez le cron job pour ne jamais oublier

---

**Besoin d'aide?** Consultez `scripts/README.md` pour la documentation complète.
