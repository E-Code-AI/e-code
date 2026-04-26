variable "project_id" {
  type        = string
  description = "GCP project ID."
}

variable "region" {
  type        = string
  description = "Primary GCP region for storage resources."
}

variable "service_account_email" {
  type        = string
  description = "Cloud Run workload identity service account allowed to access E-code buckets."
}
