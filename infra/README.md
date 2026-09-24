# SUBB SURFERS — infrastructure (infra/)

Local/staging Docker stack, Kubernetes manifests, and an AWS ECS Fargate
baseline for the game's backend fleet.

| Service | Internal port | Public route (nginx / ingress) |
| ------- | ------------- | ------------------------------ |
| web (Next.js) | 3000 | `/` |
| leaderboard-go | 4001 | `/api/go/` (prefix stripped) |
| ml-python | 4002 | `/api/ml/` (prefix stripped) |
| tournament-java | 4003 | `/api/tournaments/` (prefix stripped) |
| anticheat-csharp | 4004 | `/api/anticheat/` (prefix stripped) |
| nginx | 80 | host `:8080` |
| prometheus | 9090 | host `:9090` |
| grafana | 3000 | host `:3001` |

## 1) Docker Compose (single host)

```sh
cd infra
docker compose up -d --build          # build + start everything
docker compose ps                     # all services should be "healthy"
curl http://localhost:8080/healthz    # gateway liveness
curl http://localhost:8080/api/go/api/v1/leaderboard?limit=5
```

* Web UI: http://localhost:8080 (or :3000 directly)
* Prometheus: http://localhost:9090 — scrapes go / python / web
* Grafana: http://localhost:3001 (admin/admin, datasource auto-provisioned)

Stop with `docker compose down` (add `-v` to also drop the
prometheus/grafana data volumes).

## 2) Kubernetes

Apply in filename order (the numbers are the ordering):

```sh
kubectl apply -f infra/k8s/00-namespace.yaml       # namespace: subb
kubectl apply -f infra/k8s/10-configmap.yaml       # shared env config
kubectl apply -f infra/k8s/20-web.yaml             # Next.js web (2 replicas)
kubectl apply -f infra/k8s/21-leaderboard-go.yaml  # go leaderboard (2 replicas)
kubectl apply -f infra/k8s/22-ml-python.yaml       # difficulty ML (2 replicas)
kubectl apply -f infra/k8s/23-tournament-java.yaml # tournaments (2 replicas)
kubectl apply -f infra/k8s/24-anticheat-csharp.yaml# anti-cheat (2 replicas)
kubectl apply -f infra/k8s/30-ingress.yaml         # nginx-class edge routing
kubectl apply -f infra/k8s/40-hpa.yaml             # CPU 70% HPA, min 2 / max 10
```

or in one shot: `kubectl apply -f infra/k8s/`.

Prerequisites: an ingress controller for `ingressClassName: nginx`
(e.g. ingress-nginx) and metrics-server for the HPAs. Images default to
`ghcr.io/faisukhan01/subb-*:latest` — the CD workflow (`tag v*`) pushes
real versions; override `image:` in an overlay for your cluster.

## 3) Terraform (AWS ECS Fargate baseline)

The terraform stack provisions: an ECS cluster, a Fargate task definition for
the leaderboard (go) service, an internet-facing ALB on port 80 with a
`/healthz` target group, plus supporting security groups.

```sh
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # then edit region / tag / count
terraform init
terraform plan
terraform apply
terraform output alb_dns_name                  # public endpoint
```

State defaults to local state — plug in an S3 backend block for team use.

## 4) Monitoring notes

* Prometheus config lives in `prometheus/prometheus.yml` (scrape jobs:
  `leaderboard-go` on :4001, `ml-python` on :4002, `web` on :3000, self).
* Grafana is provisioned from `grafana/provisioning/datasources/prometheus.yml`
  pointing at `http://prometheus:9090`; drop dashboard JSON under
  `grafana/provisioning/dashboards/` to auto-load them.
* Every container in compose ships a `HEALTHCHECK` against `/healthz`;
  the k8s Deployments use the same path for readiness + liveness probes.
* The go leaderboard exposes Prometheus metrics natively at `/metrics`
  (`subb_leaderboard_*` series); alerting rules are intentionally not
  bundled — wire them in your monitoring stack.
