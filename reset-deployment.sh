#!/bin/bash

# Script pour réinitialiser seulement le déploiement (garder le cluster)
# Plus rapide que le nettoyage complet

set -e

PROJECT_ID="votre-projet-ecode"
ZONE="europe-west1-b"
NAMESPACE="e-code-platform"

echo "🔄 Réinitialisation du déploiement E-Code Platform"
echo "================================================"
echo ""
echo "Ce script va:"
echo "  • Garder le cluster Kubernetes existant"
echo "  • Supprimer seulement les applications déployées"
echo "  • Nettoyer les images Docker anciennes"
echo "  • Réinitialiser les configurations"
echo ""

# Configuration
gcloud config set project ${PROJECT_ID}
gcloud container clusters get-credentials e-code-cluster --zone=${ZONE} 2>/dev/null || \
gcloud container clusters get-credentials e-code-cluster-production --zone=${ZONE} 2>/dev/null || \
echo "Aucun cluster trouvé"

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "➡️  $1"
    echo "-------------------------------------------"
}

# 1. Supprimer le namespace et toutes ses ressources
step "Suppression du namespace et des applications"

if kubectl get namespace ${NAMESPACE} &>/dev/null; then
    echo "Suppression du namespace ${NAMESPACE}..."
    kubectl delete namespace ${NAMESPACE} --timeout=60s || true
    
    # Attendre que le namespace soit complètement supprimé
    echo "Attente de la suppression complète..."
    timeout 120s bash -c "while kubectl get namespace ${NAMESPACE} &>/dev/null; do sleep 2; done" || true
else
    echo "Namespace ${NAMESPACE} n'existe pas"
fi

# 2. Nettoyer les images Docker anciennes
step "Nettoyage des images Docker"

# Supprimer les anciennes images mais garder les 3 plus récentes
images=$(gcloud container images list --repository=gcr.io/${PROJECT_ID} --format="value(name)" 2>/dev/null || true)
if [ ! -z "$images" ]; then
    echo "$images" | while read -r image; do
        if [ ! -z "$image" ]; then
            echo "Nettoyage des anciennes versions de: $image"
            # Garder les 3 versions les plus récentes
            gcloud container images list-tags "$image" --limit=999 --sort-by=~timestamp \
                --format="value(digest)" | tail -n +4 | \
                xargs -r -I {} gcloud container images delete "$image@{}" --quiet --force-delete-tags || true
        fi
    done
else
    echo "Aucune image trouvée"
fi

# 3. Nettoyer les PersistentVolumeClaims orphelins
step "Nettoyage des volumes orphelins"

pvcs=$(kubectl get pvc --all-namespaces --no-headers 2>/dev/null | grep ${NAMESPACE} | awk '{print $1 " " $2}' || true)
if [ ! -z "$pvcs" ]; then
    echo "$pvcs" | while read -r ns pvc_name; do
        echo "Suppression du PVC: $pvc_name dans le namespace $ns"
        kubectl delete pvc "$pvc_name" -n "$ns" --timeout=30s || true
    done
else
    echo "Aucun PVC orphelin trouvé"
fi

# 4. Nettoyer les LoadBalancer services orphelins
step "Nettoyage des services LoadBalancer"

# Trouver les services avec ExternalIP qui pourraient être orphelins
services=$(kubectl get svc --all-namespaces --no-headers -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name,TYPE:.spec.type | grep LoadBalancer || true)
if [ ! -z "$services" ]; then
    echo "$services" | while read -r ns svc_name svc_type; do
        if [[ "$ns" == *"e-code"* ]] || [[ "$svc_name" == *"e-code"* ]]; then
            echo "Suppression du service LoadBalancer: $svc_name dans $ns"
            kubectl delete svc "$svc_name" -n "$ns" --timeout=30s || true
        fi
    done
else
    echo "Aucun service LoadBalancer orphelin trouvé"
fi

# 5. Recréer le namespace propre
step "Recréation du namespace propre"

kubectl create namespace ${NAMESPACE}

# Labeller le namespace pour le monitoring
kubectl label namespace ${NAMESPACE} name=${NAMESPACE}

# 6. Vérifier l'état du cluster
step "Vérification de l'état du cluster"

echo "📊 Nodes du cluster:"
kubectl get nodes

echo ""
echo "📊 Namespaces:"
kubectl get namespaces

echo ""
echo "📊 Stockage disponible:"
kubectl get storageclass

# 7. Préparer pour un nouveau déploiement
step "Préparation pour le redéploiement"

echo "Namespace ${NAMESPACE} prêt pour un nouveau déploiement"

# Afficher les commandes utiles
echo ""
echo "✅ Réinitialisation terminée!"
echo "============================="
echo ""
echo "📊 État actuel:"
echo "  • Cluster: Actif et propre"
echo "  • Namespace: ${NAMESPACE} créé et vide"
echo "  • Images: Nettoyées (versions récentes conservées)"
echo "  • Volumes: Supprimés"
echo ""
echo "🚀 Prochaines étapes:"
echo "  • Pour redéployer: ./deploy-scalable-infrastructure.sh"
echo "  • Pour déployer l'app simple: ./deploy-full-app-to-gcp.sh"
echo "  • Pour appliquer seulement l'infra: kubectl apply -f kubernetes/production-infrastructure.yaml"
echo ""
echo "📝 Commandes utiles:"
echo "  • État du cluster: kubectl get all --all-namespaces"
echo "  • Monitoring: kubectl top nodes"
echo "  • Logs du cluster: gcloud container clusters describe e-code-cluster --zone=${ZONE}"