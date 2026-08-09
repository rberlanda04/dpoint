# Ponto de Campo — Registro de Ponto em Campo

Sistema SaaS de registro de ponto para equipes externas (obras/canteiros), com
check-in via QR Code, validação por geofencing (GPS) e foto de evidência.

**Bilíngue:** Português (pt-BR) e Inglês (en) — detecção automática pelo navegador
e seletor de idioma na interface.

## Funcionalidades

- **Check-in/Check-out público** (`/checkin`): QR Code (câmera) ou ID da obra,
  GPS com validação de geofence, foto opcional e aviso de pareamento.
- **Dashboard administrativo** (`/app/dashboard`): métricas e gráficos em tempo
  real, gestão de funcionários e obras, exportação CSV, configurações.
- **Portal SaaS** (`/portal`): gestão de empresas clientes, administradores,
  convites por link e chaves de API (acesso super admin).
- **Multi-tenant**: dados filtrados por `empresa_id` para admins de empresa.
- **Fotos de evidência** armazenadas no Firebase Storage.

## Stack

React 19 · Vite · Tailwind CSS 4 · Firebase (Auth, Firestore, Storage) ·
Recharts · qrcode.react · jsQR

## Rodar localmente

**Pré-requisitos:** Node.js

1. Instale as dependências: `npm install`
2. Copie `.env.example` para `.env` e preencha com as credenciais do seu
   projeto Firebase (Console → Configurações do Projeto)
3. Rode o app: `npm run dev`

## Deploy das regras de segurança

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Scripts

- `npm run dev` — ambiente de desenvolvimento (porta 3000)
- `npm run build` — build de produção
- `npm run lint` — verificação de tipos TypeScript
