# 4. Runtime e Operação

## 4.1 Build e entrega

O frontend usa:

- Vite para build
- nginx para servir assets e encaminhar `/api`

## 4.2 Topologia local

Em desenvolvimento local:

1. o backend sobe no repositório backend
2. o frontend sobe neste repositório
3. o container do frontend encaminha `/api` para o backend configurado

## 4.3 Subida local

```bash
docker compose up -d --build
```

## 4.4 Endereço padrão

- frontend: `http://localhost:8080`

## 4.5 Dependência do backend

O backend deve estar ativo antes do frontend.

O valor padrão de integração é:

- `UPSTREAM_API_URL=http://host.docker.internal:3000`

## 4.6 Observação operacional

O runtime do nginx foi ajustado para funcionar com filesystem `read_only`.

Isso evita depender de escrita em `/etc/nginx/conf.d` durante o startup.
