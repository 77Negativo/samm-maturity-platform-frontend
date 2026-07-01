# 8. FAQ Operacional

## 8.1 Como subir o frontend localmente?

```bash
docker compose up -d --build
```

## 8.2 Como validar se ele subiu corretamente?

```bash
curl http://localhost:8080/
```

## 8.3 O frontend sobe sem backend?

Ele pode subir o container, mas a operação real depende do backend ativo.

## 8.4 Onde ficam as páginas?

Em `src/pages/`.

## 8.5 Onde fica a integração com a API?

Em `src/api.js`.

## 8.6 Qual regra nunca pode ser quebrada?

O frontend não é a fonte de verdade do sistema.
