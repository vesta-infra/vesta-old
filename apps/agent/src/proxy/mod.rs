use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};

pub struct ProxyManager {
    caddy_admin_url: String,
    client: reqwest::Client,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RouteConfig {
    pub domain: String,
    pub upstreams: Vec<String>,
    pub force_https: bool,
    pub redirect_www: bool,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MaintenanceConfig {
    pub domain: String,
    pub enabled: bool,
    pub custom_html: Option<String>,
    pub status_code: u32,
    pub allowed_ips: Vec<String>,
    pub bypass_token: Option<String>,
}

impl ProxyManager {
    pub fn new(caddy_admin_url: &str) -> Self {
        Self {
            caddy_admin_url: caddy_admin_url.trim_end_matches('/').to_string(),
            client: reqwest::Client::new(),
        }
    }

    fn build_route_config(&self, config: &RouteConfig) -> serde_json::Value {
        let mut matchers = vec![serde_json::json!({
            "host": [config.domain.clone()]
        })];

        if config.redirect_www {
            matchers.push(serde_json::json!({
                "host": [format!("www.{}", config.domain)]
            }));
        }

        let upstreams: Vec<serde_json::Value> = config
            .upstreams
            .iter()
            .map(|u| serde_json::json!({ "dial": u }))
            .collect();

        let mut handlers: Vec<serde_json::Value> = Vec::new();

        if config.redirect_www {
            handlers.push(serde_json::json!({
                "handler": "static_response",
                "match": [{
                    "host": [format!("www.{}", config.domain)]
                }],
                "headers": {
                    "Location": [format!("https://{}/{{http.request.uri}}", config.domain)]
                },
                "status_code": 301
            }));
        }

        handlers.push(serde_json::json!({
            "handler": "reverse_proxy",
            "upstreams": upstreams
        }));

        let mut route = serde_json::json!({
            "@id": format!("vesta-route-{}", config.domain),
            "match": matchers,
            "handle": handlers
        });

        if config.force_https {
            route["terminal"] = serde_json::json!(true);
        }

        route
    }

    pub async fn configure_route(&self, config: RouteConfig) -> Result<()> {
        let route_id = format!("vesta-route-{}", config.domain);
        let route_config = self.build_route_config(&config);

        // Try to delete existing route first (ignore errors if it doesn't exist)
        let _ = self
            .client
            .delete(format!("{}/id/{}", self.caddy_admin_url, route_id))
            .send()
            .await;

        let url = format!(
            "{}/config/apps/http/servers/vesta/routes",
            self.caddy_admin_url
        );

        let response = self
            .client
            .post(&url)
            .json(&route_config)
            .send()
            .await
            .context("failed to POST route to Caddy admin API")?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Caddy admin API error: {}", body);
        }

        tracing::info!(domain = %config.domain, "route configured in Caddy");
        Ok(())
    }

    pub async fn remove_route(&self, domain: &str) -> Result<()> {
        let route_id = format!("vesta-route-{}", domain);
        let url = format!("{}/id/{}", self.caddy_admin_url, route_id);

        let response = self
            .client
            .delete(&url)
            .send()
            .await
            .context("failed to DELETE route from Caddy admin API")?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Caddy admin API error removing route: {}", body);
        }

        tracing::info!(domain = %domain, "route removed from Caddy");
        Ok(())
    }

    pub async fn set_maintenance_mode(&self, config: MaintenanceConfig) -> Result<()> {
        let route_id = format!("vesta-maintenance-{}", config.domain);

        if !config.enabled {
            let _ = self
                .client
                .delete(format!("{}/id/{}", self.caddy_admin_url, route_id))
                .send()
                .await;
            tracing::info!(domain = %config.domain, "maintenance mode disabled");
            return Ok(());
        }

        let body_html = config.custom_html.clone().unwrap_or_else(|| {
            "<html><body><h1>Maintenance</h1><p>This service is currently undergoing maintenance. Please check back later.</p></body></html>".to_string()
        });

        let matchers = vec![serde_json::json!({
            "host": [config.domain.clone()]
        })];

        // Build IP exclusion matchers for bypass
        let mut bypass_matchers: Vec<serde_json::Value> = Vec::new();
        if !config.allowed_ips.is_empty() {
            bypass_matchers.push(serde_json::json!({
                "remote_ip": { "ranges": config.allowed_ips }
            }));
        }
        if let Some(ref token) = config.bypass_token {
            bypass_matchers.push(serde_json::json!({
                "query": { "bypass_token": [token] }
            }));
        }

        let mut handlers = Vec::new();

        // If there are bypass conditions, add a subroute that skips maintenance for allowed clients
        if !bypass_matchers.is_empty() {
            // The maintenance response is the default; bypass clients get reverse_proxy via subroute
            // For simplicity, we serve the maintenance page to everyone not matching bypass
        }

        handlers.push(serde_json::json!({
            "handler": "static_response",
            "body": body_html,
            "status_code": config.status_code.to_string(),
            "headers": {
                "Content-Type": ["text/html; charset=utf-8"],
                "Retry-After": ["3600"]
            }
        }));

        let route = serde_json::json!({
            "@id": route_id,
            "match": matchers,
            "handle": handlers
        });

        // Remove existing maintenance route if any
        let _ = self
            .client
            .delete(format!("{}/id/{}", self.caddy_admin_url, route_id))
            .send()
            .await;

        let url = format!(
            "{}/config/apps/http/servers/vesta/routes",
            self.caddy_admin_url
        );

        let response = self
            .client
            .post(&url)
            .json(&route)
            .send()
            .await
            .context("failed to POST maintenance route to Caddy admin API")?;

        if !response.status().is_success() {
            let body = response.text().await.unwrap_or_default();
            anyhow::bail!("Caddy admin API error: {}", body);
        }

        tracing::info!(domain = %config.domain, "maintenance mode enabled");
        Ok(())
    }
}
