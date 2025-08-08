#!/bin/bash

# Script pour nettoyer complètement le projet GCP votre-projet-ecode
# ATTENTION: Ce script va supprimer TOUTES les ressources du projet

set -e

PROJECT_ID="votre-projet-ecode"
REGION="europe-west1"
ZONE="europe-west1-b"

echo "🧹 Nettoyage complet du projet GCP: ${PROJECT_ID}"
echo "================================================="
echo ""
echo "⚠️  ATTENTION: Ce script va supprimer TOUTES les ressources!"
echo "    - Tous les clusters Kubernetes"
echo "    - Toutes les images Docker"
echo "    - Tous les disques persistants"
echo "    - Tous les load balancers"
echo "    - Toutes les adresses IP statiques"
echo ""

# Fonction pour afficher les étapes
step() {
    echo ""
    echo "➡️  $1"
    echo "-------------------------------------------"
}

# Configuration du projet
gcloud config set project ${PROJECT_ID}

# 1. Supprimer tous les clusters GKE
step "Suppression des clusters Kubernetes"

clusters=$(gcloud container clusters list --format="value(name,zone)" 2>/dev/null || true)
if [ ! -z "$clusters" ]; then
    echo "$clusters" | while read -r cluster_name cluster_zone; do
        if [ ! -z "$cluster_name" ] && [ ! -z "$cluster_zone" ]; then
            echo "Suppression du cluster: $cluster_name dans $cluster_zone"
            gcloud container clusters delete "$cluster_name" --zone="$cluster_zone" --quiet || true
        fi
    done
else
    echo "Aucun cluster trouvé"
fi

# 2. Supprimer toutes les images Container Registry
step "Suppression des images Docker (Container Registry)"

images=$(gcloud container images list --repository=gcr.io/${PROJECT_ID} --format="value(name)" 2>/dev/null || true)
if [ ! -z "$images" ]; then
    echo "$images" | while read -r image; do
        if [ ! -z "$image" ]; then
            echo "Suppression de l'image: $image"
            gcloud container images delete "$image" --force-delete-tags --quiet || true
        fi
    done
else
    echo "Aucune image trouvée"
fi

# 3. Supprimer tous les disques persistants
step "Suppression des disques persistants"

disks=$(gcloud compute disks list --format="value(name,zone)" 2>/dev/null || true)
if [ ! -z "$disks" ]; then
    echo "$disks" | while read -r disk_name disk_zone; do
        if [ ! -z "$disk_name" ] && [ ! -z "$disk_zone" ]; then
            echo "Suppression du disque: $disk_name dans $disk_zone"
            gcloud compute disks delete "$disk_name" --zone="$disk_zone" --quiet || true
        fi
    done
else
    echo "Aucun disque trouvé"
fi

# 4. Supprimer tous les load balancers
step "Suppression des load balancers"

# Backend services
backend_services=$(gcloud compute backend-services list --format="value(name)" 2>/dev/null || true)
if [ ! -z "$backend_services" ]; then
    echo "$backend_services" | while read -r service; do
        if [ ! -z "$service" ]; then
            echo "Suppression du backend service: $service"
            gcloud compute backend-services delete "$service" --global --quiet || true
        fi
    done
fi

# URL maps
url_maps=$(gcloud compute url-maps list --format="value(name)" 2>/dev/null || true)
if [ ! -z "$url_maps" ]; then
    echo "$url_maps" | while read -r url_map; do
        if [ ! -z "$url_map" ]; then
            echo "Suppression de l'URL map: $url_map"
            gcloud compute url-maps delete "$url_map" --quiet || true
        fi
    done
fi

# Target HTTP proxies
target_proxies=$(gcloud compute target-http-proxies list --format="value(name)" 2>/dev/null || true)
if [ ! -z "$target_proxies" ]; then
    echo "$target_proxies" | while read -r proxy; do
        if [ ! -z "$proxy" ]; then
            echo "Suppression du target proxy: $proxy"
            gcloud compute target-http-proxies delete "$proxy" --quiet || true
        fi
    done
fi

# Forwarding rules
forwarding_rules=$(gcloud compute forwarding-rules list --format="value(name,region)" 2>/dev/null || true)
if [ ! -z "$forwarding_rules" ]; then
    echo "$forwarding_rules" | while read -r rule region; do
        if [ ! -z "$rule" ]; then
            if [ ! -z "$region" ]; then
                echo "Suppression de la règle de forwarding régionale: $rule"
                gcloud compute forwarding-rules delete "$rule" --region="$region" --quiet || true
            else
                echo "Suppression de la règle de forwarding globale: $rule"
                gcloud compute forwarding-rules delete "$rule" --global --quiet || true
            fi
        fi
    done
fi

# 5. Supprimer toutes les adresses IP statiques
step "Suppression des adresses IP statiques"

# Adresses IP régionales
regional_ips=$(gcloud compute addresses list --format="value(name,region)" --filter="region:*" 2>/dev/null || true)
if [ ! -z "$regional_ips" ]; then
    echo "$regional_ips" | while read -r ip_name ip_region; do
        if [ ! -z "$ip_name" ] && [ ! -z "$ip_region" ]; then
            echo "Suppression de l'IP régionale: $ip_name dans $ip_region"
            gcloud compute addresses delete "$ip_name" --region="$ip_region" --quiet || true
        fi
    done
fi

# Adresses IP globales
global_ips=$(gcloud compute addresses list --global --format="value(name)" 2>/dev/null || true)
if [ ! -z "$global_ips" ]; then
    echo "$global_ips" | while read -r ip_name; do
        if [ ! -z "$ip_name" ]; then
            echo "Suppression de l'IP globale: $ip_name"
            gcloud compute addresses delete "$ip_name" --global --quiet || true
        fi
    done
fi

# 6. Supprimer les instances de VM
step "Suppression des instances de VM"

instances=$(gcloud compute instances list --format="value(name,zone)" 2>/dev/null || true)
if [ ! -z "$instances" ]; then
    echo "$instances" | while read -r instance_name instance_zone; do
        if [ ! -z "$instance_name" ] && [ ! -z "$instance_zone" ]; then
            echo "Suppression de l'instance: $instance_name dans $instance_zone"
            gcloud compute instances delete "$instance_name" --zone="$instance_zone" --quiet || true
        fi
    done
else
    echo "Aucune instance trouvée"
fi

# 7. Supprimer les health checks
step "Suppression des health checks"

health_checks=$(gcloud compute health-checks list --format="value(name)" 2>/dev/null || true)
if [ ! -z "$health_checks" ]; then
    echo "$health_checks" | while read -r hc; do
        if [ ! -z "$hc" ]; then
            echo "Suppression du health check: $hc"
            gcloud compute health-checks delete "$hc" --quiet || true
        fi
    done
fi

# 8. Nettoyer les secrets et configurations
step "Nettoyage des configurations locales"

# Supprimer les contextes kubectl locaux
kubectl config get-contexts -o name | grep -E "(e-code|votre-projet)" | xargs -r kubectl config delete-context || true

# Nettoyer les credentials gcloud locaux pour ce projet
gcloud auth revoke --all 2>/dev/null || true

# 9. Vérification finale
step "Vérification du nettoyage"

echo "Vérification des ressources restantes..."

echo ""
echo "🔍 Clusters:"
gcloud container clusters list 2>/dev/null || echo "Aucun cluster"

echo ""
echo "🔍 Images:"
gcloud container images list --repository=gcr.io/${PROJECT_ID} 2>/dev/null || echo "Aucune image"

echo ""
echo "🔍 Disques:"
gcloud compute disks list 2>/dev/null || echo "Aucun disque"

echo ""
echo "🔍 Instances:"
gcloud compute instances list 2>/dev/null || echo "Aucune instance"

echo ""
echo "🔍 Adresses IP:"
gcloud compute addresses list 2>/dev/null || echo "Aucune adresse IP"

# 10. Résumé
echo ""
echo "✅ Nettoyage terminé!"
echo "===================="
echo ""
echo "📊 Actions effectuées:"
echo "  • Suppression de tous les clusters Kubernetes"
echo "  • Suppression de toutes les images Docker"
echo "  • Suppression de tous les disques persistants"
echo "  • Suppression de tous les load balancers"
echo "  • Suppression de toutes les adresses IP statiques"
echo "  • Suppression de toutes les instances VM"
echo "  • Nettoyage des configurations locales"
echo ""

echo "💰 Économies:"
echo "  • Plus de frais de compute engine"
echo "  • Plus de frais de stockage"
echo "  • Plus de frais de load balancing"
echo "  • Plus de frais de Container Registry"
echo ""

echo "📝 Prochaines étapes:"
echo "  • Le projet ${PROJECT_ID} est maintenant vide"
echo "  • Vous pouvez le supprimer complètement si désiré:"
echo "    gcloud projects delete ${PROJECT_ID}"
echo "  • Ou redéployer avec: ./deploy-scalable-infrastructure.sh"
echo ""

echo "⚠️  Note: La suppression complète du projet peut prendre quelques minutes"