variable "project_id" {
  description = "GCP project id."
  type        = string
}

variable "region" {
  description = "Primary deployer Cloud Run region."
  type        = string
  default     = "us-central1"
}

variable "service_name" {
  description = "Cloud Run service name for the deployer API."
  type        = string
  default     = "ecode-deployer"
}

variable "artifact_repository_id" {
  description = "Artifact Registry repository for user app images."
  type        = string
  default     = "ecode-apps"
}

variable "image" {
  description = "Container image for the deployer service."
  type        = string
}

variable "service_account_email" {
  description = "Optional service account email. When empty the module creates one."
  type        = string
  default     = ""
}
