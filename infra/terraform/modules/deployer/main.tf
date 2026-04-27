resource "google_service_account" "deployer" {
  count        = var.service_account_email == "" ? 1 : 0
  project      = var.project_id
  account_id   = "ecode-deployer"
  display_name = "E-code deployer Cloud Run service"
}

locals {
  service_account_email = var.service_account_email != "" ? var.service_account_email : google_service_account.deployer[0].email
}

resource "google_artifact_registry_repository" "apps" {
  project       = var.project_id
  location      = var.region
  repository_id = var.artifact_repository_id
  format        = "DOCKER"
  description   = "E-code generated application images"
}

resource "google_project_iam_member" "cloud_build_editor" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.editor"
  member  = "serviceAccount:${local.service_account_email}"
}

resource "google_project_iam_member" "run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${local.service_account_email}"
}

resource "google_project_iam_member" "artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${local.service_account_email}"
}

resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${local.service_account_email}"
}

resource "google_project_iam_member" "log_viewer" {
  project = var.project_id
  role    = "roles/logging.viewer"
  member  = "serviceAccount:${local.service_account_email}"
}

resource "google_cloud_run_v2_service" "deployer" {
  project  = var.project_id
  name     = var.service_name
  location = var.region

  template {
    service_account = local.service_account_email
    containers {
      image = var.image
      env {
        name  = "GCP_PROJECT_ID"
        value = var.project_id
      }
      env {
        name  = "ARTIFACT_REPOSITORY"
        value = google_artifact_registry_repository.apps.repository_id
      }
      ports {
        container_port = 8080
      }
    }
    scaling {
      min_instance_count = 0
      max_instance_count = 20
    }
  }
}
