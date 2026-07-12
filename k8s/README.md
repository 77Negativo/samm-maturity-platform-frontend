# Kubernetes frontend

Este repo entrega o frontend no namespace `samm-maturity`.

Os workflows `.github/workflows/security-scan.yml` e `.github/workflows/ci.yaml`:

- roda o `Security Scanner` em PR/push;
- depois de scanner verde em `main`, aplica o deploy Kubernetes da imagem já publicada em Docker Hub;
- aplica `k8s/base/frontend.yaml`;
- atualiza o `Deployment/samm-frontend`.

O nginx aponta `/api` para o Service interno do backend:

```text
http://samm-backend.samm-maturity.svc.cluster.local:3000
```

Secret opcional no GitHub:

- `KUBECONFIG_B64`
