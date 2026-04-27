resource "google_storage_bucket" "marketing" {
  project                     = var.project_id
  name                        = var.marketing_bucket_name
  location                    = upper(var.region)
  uniform_bucket_level_access = true
  force_destroy               = false
  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }
  versioning { enabled = true }
}

resource "google_storage_bucket" "docs" {
  project                     = var.project_id
  name                        = var.docs_bucket_name
  location                    = upper(var.region)
  uniform_bucket_level_access = true
  force_destroy               = false
  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }
  versioning { enabled = true }
}
