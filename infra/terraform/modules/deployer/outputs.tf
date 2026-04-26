output "service_uri" {
  description = "Cloud Run deployer URI."
  value       = google_cloud_run_v2_service.deployer.uri
}

output "service_account_email" {
  description = "Service account used by deployer."
  value       = local.service_account_email
}

output "artifact_repository" {
  description = "Artifact Registry repository id."
  value       = google_artifact_registry_repository.apps.repository_id
}
