# Archived Deployment Strategies

La cible de production active pour E-code est désormais `replit-deploy`.

## Ce qui reste supporté activement

- Replit Deploy
- PostgreSQL persistant
- Redis optionnel
- Object storage durable
- Build Vite + serveur Node unique

## Ce qui est archivé conceptuellement

Les implémentations ci-dessous restent dans le dépôt pour référence technique ou migration future, mais ne sont plus la voie de production recommandée:

- Kubernetes multi-région
- Buildpack deployment
- Autoscale orchestration dédiée
- Hybrid deployment abstractions

## Pourquoi

1. L’environnement cible réel d’E-code est Replit Deploy.
2. Multiplier les stratégies garde des branches mortes, complique la validation et rend les incidents preview/deploy plus opaques.
3. La priorité produit est la fiabilité de la génération d’apps, de la preview, et des panels IDE en production réelle.

## Modules concernés

- `server/deployment/buildpack-deployment.ts`
- `server/deployment/k8s-deployment-service.ts`
- `server/deployment/real-kubernetes-deployment.ts`
- `server/deployment/autoscale-deployment.ts`
- `server/kubernetes/*`

## Règle d’exploitation

- nouveau code de déploiement: viser `replit-deploy`
- nouvelles docs ops: documenter `replit-deploy`
- maintien minimal des anciens modules: correctifs bloquants uniquement, pas d’évolution produit
