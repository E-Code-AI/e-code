resource "google_compute_backend_bucket" "site" {
  project     = var.project_id
  name        = "${var.name}-backend"
  bucket_name = var.bucket_name
  enable_cdn  = var.enable_cdn
  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 300
    default_ttl       = 3600
    max_ttl           = 86400
    negative_caching  = true
    serve_while_stale = 86400
  }
}

resource "google_compute_url_map" "site" {
  project         = var.project_id
  name            = "${var.name}-url-map"
  default_service = google_compute_backend_bucket.site.id
}

resource "google_compute_managed_ssl_certificate" "site" {
  project = var.project_id
  name    = "${var.name}-cert"
  managed {
    domains = var.domains
  }
}

resource "google_compute_target_https_proxy" "site" {
  project          = var.project_id
  name             = "${var.name}-https-proxy"
  url_map          = google_compute_url_map.site.id
  ssl_certificates = [google_compute_managed_ssl_certificate.site.id]
}

resource "google_compute_global_address" "site" {
  project = var.project_id
  name    = "${var.name}-ip"
}

resource "google_compute_global_forwarding_rule" "https" {
  project               = var.project_id
  name                  = "${var.name}-https"
  target                = google_compute_target_https_proxy.site.id
  port_range            = "443"
  ip_address            = google_compute_global_address.site.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
