#!/bin/bash

# Script de gestion complète du projet GCP votre-projet-ecode
# Menu interactif pour toutes les opérations

set -e

PROJECT_ID="votre-projet-ecode"
ZONE="europe-west1-b"

echo "🔧 Gestionnaire de Projet GCP: ${PROJECT_ID}"
echo "============================================"
echo ""

# Fonction pour afficher le menu
show_menu() {
    echo ""
    echo "🎛️  Menu de Gestion:"
    echo "==================="
    echo "1️⃣   Voir l'état actuel du projet"
    echo "2️⃣   Déployer l'infrastructure scalable complète"
    echo "3️⃣   Déployer seulement l'application"
    echo "4️⃣   Réinitialiser le déploiement (garder cluster)"
    echo "5️⃣   Nettoyer complètement le projet"
    echo "6️⃣   Supprimer définitivement le projet"
    echo "7️⃣   Voir les coûts et facturations"
    echo "8️⃣   Sauvegarder la configuration"
    echo "9️⃣   Restaurer depuis une sauvegarde"
    echo "0️⃣   Quitter"
    echo ""
}

# Fonction pour voir l'état
show_status() {
    echo ""
    echo "📊 État Actuel du Projet: ${PROJECT_ID}"
    echo "======================================"
    
    gcloud config set project ${PROJECT_ID} &>/dev/null
    
    echo ""
    echo "🔍 Clusters Kubernetes:"
    gcloud container clusters list 2>/dev/null || echo "  Aucun cluster"
    
    echo ""
    echo "🔍 Images Docker:"
    gcloud container images list --repository=gcr.io/${PROJECT_ID} 2>/dev/null || echo "  Aucune image"
    
    echo ""
    echo "🔍 Instances VM:"
    gcloud compute instances list 2>/dev/null || echo "  Aucune instance"
    
    echo ""
    echo "🔍 Adresses IP statiques:"
    gcloud compute addresses list 2>/dev/null || echo "  Aucune adresse IP"
    
    echo ""
    echo "🔍 Stockage (disques):"
    gcloud compute disks list 2>/dev/null || echo "  Aucun disque"
    
    # Vérifier si kubectl peut se connecter
    echo ""
    echo "🔍 Connexion Kubernetes:"
    if kubectl cluster-info &>/dev/null; then
        echo "  ✅ Connecté au cluster"
        echo ""
        echo "🔍 Pods actifs:"
        kubectl get pods --all-namespaces 2>/dev/null | head -10 || echo "  Aucun pod"
        
        echo ""
        echo "🔍 Services:"
        kubectl get svc --all-namespaces | grep -E "(LoadBalancer|ClusterIP)" | head -5 || echo "  Aucun service"
    else
        echo "  ❌ Pas de connexion cluster active"
    fi
}

# Fonction pour voir les coûts
show_costs() {
    echo ""
    echo "💰 Analyse des Coûts"
    echo "==================="
    
    echo ""
    echo "🔍 Ressources consommatrices:"
    echo ""
    
    # Compute Engine
    instances=$(gcloud compute instances list --format="table(name,zone,machineType.basename(),status)" 2>/dev/null || true)
    if [ ! -z "$instances" ]; then
        echo "📱 Instances VM:"
        echo "$instances"
    fi
    
    # GKE Clusters
    echo ""
    echo "☸️  Clusters GKE:"
    gcloud container clusters list --format="table(name,zone,currentNodeCount,status)" 2>/dev/null || echo "  Aucun cluster"
    
    # Stockage
    echo ""
    echo "💾 Stockage:"
    gcloud compute disks list --format="table(name,zone,sizeGb,type)" 2>/dev/null || echo "  Aucun disque"
    
    # Load Balancers
    echo ""
    echo "⚖️  Load Balancers:"
    gcloud compute forwarding-rules list --format="table(name,region,IPAddress)" 2>/dev/null || echo "  Aucun load balancer"
    
    echo ""
    echo "💡 Estimation des coûts principaux:"
    echo "   • Cluster GKE (3 nodes n2-standard-4): ~200€/mois"
    echo "   • Load Balancer: ~20€/mois"
    echo "   • Stockage persistant (100GB): ~10€/mois"
    echo "   • Trafic réseau: Variable selon usage"
    echo ""
    echo "📊 Pour voir les coûts exacts:"
    echo "   https://console.cloud.google.com/billing/linkedaccount?project=${PROJECT_ID}"
}

# Fonction pour sauvegarder
backup_config() {
    echo ""
    echo "💾 Sauvegarde de la Configuration"
    echo "================================="
    
    BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    echo "Création du dossier: $BACKUP_DIR"
    
    # Sauvegarder les configurations kubectl
    if kubectl cluster-info &>/dev/null; then
        kubectl get all --all-namespaces -o yaml > "$BACKUP_DIR/kubernetes-resources.yaml" 2>/dev/null || true
        kubectl get configmaps --all-namespaces -o yaml > "$BACKUP_DIR/configmaps.yaml" 2>/dev/null || true
        kubectl get secrets --all-namespaces -o yaml > "$BACKUP_DIR/secrets.yaml" 2>/dev/null || true
        kubectl get pv,pvc --all-namespaces -o yaml > "$BACKUP_DIR/volumes.yaml" 2>/dev/null || true
        echo "  ✅ Ressources Kubernetes sauvegardées"
    fi
    
    # Sauvegarder les configurations GCP
    gcloud container clusters list --format="export" > "$BACKUP_DIR/gke-clusters.yaml" 2>/dev/null || true
    gcloud compute instances list --format="export" > "$BACKUP_DIR/compute-instances.yaml" 2>/dev/null || true
    gcloud compute disks list --format="export" > "$BACKUP_DIR/disks.yaml" 2>/dev/null || true
    
    # Copier les scripts
    cp *.sh "$BACKUP_DIR/" 2>/dev/null || true
    cp -r kubernetes/ "$BACKUP_DIR/" 2>/dev/null || true
    
    echo "  ✅ Configuration GCP sauvegardée"
    echo ""
    echo "📁 Sauvegarde créée dans: $BACKUP_DIR"
    echo "📤 Pour archiver: tar -czf ${BACKUP_DIR}.tar.gz $BACKUP_DIR"
}

# Menu principal
while true; do
    show_menu
    read -p "🎯 Choisissez une option (0-9): " choice
    
    case $choice in
        1)
            show_status
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        2)
            echo ""
            echo "🚀 Lancement du déploiement infrastructure scalable..."
            if [ -f "deploy-scalable-infrastructure.sh" ]; then
                chmod +x deploy-scalable-infrastructure.sh
                ./deploy-scalable-infrastructure.sh
            else
                echo "❌ Fichier deploy-scalable-infrastructure.sh non trouvé"
            fi
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        3)
            echo ""
            echo "🚀 Lancement du déploiement application..."
            if [ -f "deploy-full-app-to-gcp.sh" ]; then
                chmod +x deploy-full-app-to-gcp.sh
                ./deploy-full-app-to-gcp.sh
            else
                echo "❌ Fichier deploy-full-app-to-gcp.sh non trouvé"
            fi
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        4)
            echo ""
            read -p "⚠️  Confirmer la réinitialisation du déploiement? (y/N): " confirm
            if [[ $confirm =~ ^[Yy]$ ]]; then
                if [ -f "reset-deployment.sh" ]; then
                    chmod +x reset-deployment.sh
                    ./reset-deployment.sh
                else
                    echo "❌ Fichier reset-deployment.sh non trouvé"
                fi
            fi
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        5)
            echo ""
            echo "⚠️  ATTENTION: Ceci va supprimer TOUTES les ressources du projet!"
            read -p "Tapez 'SUPPRIMER' pour confirmer: " confirm
            if [ "$confirm" = "SUPPRIMER" ]; then
                if [ -f "cleanup-gcp-project.sh" ]; then
                    chmod +x cleanup-gcp-project.sh
                    ./cleanup-gcp-project.sh
                else
                    echo "❌ Fichier cleanup-gcp-project.sh non trouvé"
                fi
            else
                echo "❌ Nettoyage annulé"
            fi
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        6)
            echo ""
            echo "💥 ATTENTION: Ceci va supprimer définitivement le projet!"
            echo "   Cette action est IRRÉVERSIBLE!"
            read -p "Tapez le nom du projet '${PROJECT_ID}' pour confirmer: " confirm
            if [ "$confirm" = "$PROJECT_ID" ]; then
                echo "Suppression du projet..."
                gcloud projects delete ${PROJECT_ID}
                echo "✅ Projet supprimé définitivement"
                exit 0
            else
                echo "❌ Suppression annulée"
            fi
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        7)
            show_costs
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        8)
            backup_config
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        9)
            echo ""
            echo "📥 Restauration depuis sauvegarde"
            echo "================================="
            ls -la backup-*/ 2>/dev/null || echo "Aucune sauvegarde trouvée"
            read -p "Nom du dossier de sauvegarde: " backup_dir
            if [ -d "$backup_dir" ]; then
                echo "Restauration en cours..."
                kubectl apply -f "$backup_dir/kubernetes-resources.yaml" 2>/dev/null || echo "Aucune ressource Kubernetes à restaurer"
                echo "✅ Restauration terminée"
            else
                echo "❌ Dossier de sauvegarde non trouvé"
            fi
            read -p "Appuyez sur Entrée pour continuer..."
            ;;
        0)
            echo ""
            echo "👋 Au revoir!"
            exit 0
            ;;
        *)
            echo "❌ Option invalide"
            ;;
    esac
done