locals {
  buckets = {
    "ecode-projects-files" = {
      versioning = true
      lifecycle_days = null
    }
    "ecode-uploads" = {
      versioning = false
      lifecycle_days = 30
    }
    "ecode-build-artifacts" = {
      versioning = false
      lifecycle_days = 90
    }
    "ecode-templates-previews" = {
      versioning = false
      lifecycle_days = null
    }
    "ecode-store-assets" = {
      versioning = true
      lifecycle_days = null
    }
    "ecode-marketing" = {
      versioning = true
      lifecycle_days = null
    }
    "ecode-snapshots" = {
      versioning = true
      lifecycle_days = 365
    }
    "ecode-build-cache" = {
      versioning = false
      lifecycle_days = 30
    }
    "ecode-fastlane-match" = {
      versioning = true
      lifecycle_days = null
    }
  }
}

resource "google_storage_bucket" "ecode" {
  for_each                    = local.buckets
  name                        = "${var.project_id}-${each.key}"
  project                     = var.project_id
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = each.value.versioning
  }

  dynamic "lifecycle_rule" {
    for_each = each.value.lifecycle_days == null ? [] : [each.value.lifecycle_days]
    content {
      condition {
        age = lifecycle_rule.value
      }
      action {
        type = "Delete"
      }
    }
  }
}

resource "google_storage_bucket_iam_member" "cloud_run_object_admin" {
  for_each = google_storage_bucket.ecode
  bucket   = each.value.name
  role     = "roles/storage.objectAdmin"
  member   = "serviceAccount:${var.service_account_email}"
}
