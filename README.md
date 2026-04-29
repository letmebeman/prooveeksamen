# prooveeksamen

## Drift Deployment

This project can be deployed from Git in Portainer. This helps avoid configuration drift, because the server always deploys from the same tracked file in the repository.

### What You Need First

- A VM with Docker and Portainer running
- Your project pushed to GitHub
- The `docker-compose.yml` file in the root of the repo

### Step-by-Step (Portainer)

1. Open Portainer in your browser.
2. Go to **Stacks**.
3. Click **Add stack**.
4. Choose **Git repository**.
5. Fill in:
	- **Repository URL**: `https://github.com/<your-username>/prooveeksamen.git`
	- **Repository reference**: `refs/heads/main`
	- **Compose path**: `docker-compose.yml`
6. If the repo is private, enable authentication and use a read-only token.
7. Click **Deploy the stack**.

### After Deployment

- App via nginx: `http://<vm-ip>/`
- Grafana: `http://<vm-ip>:3000`
- Prometheus: `http://<vm-ip>:9090`
- Portainer: `http://<vm-ip>:9000`

### Next Steps (Simple Checklist)

1. Confirm all containers are healthy in Portainer.
2. Open Grafana and verify the Prometheus data source is connected.
3. If needed, import or create dashboards.
4. Change default passwords (especially Grafana admin).