# Taula - Plataforma de Reservas de Restaurantes para Andorra

Monorepo con 3 aplicaciones: API backend, app movil (React Native/Expo) y backoffice web (React/Vite).

---

## Requisitos previos

| Herramienta | Version minima | Instalacion |
|---|---|---|
| **Node.js** | 20 LTS | https://nodejs.org |
| **pnpm** | 10.x | `npm install -g pnpm` |
| **Docker** + **Docker Compose** | v24+ / v2+ | https://docker.com |
| **Expo CLI** | (se instala con las deps) | ya incluido en el proyecto |

> **Importante:** este proyecto usa **pnpm** como gestor de paquetes. No usar npm ni yarn.

---

## Estructura del proyecto

```
taula/
├── apps/
│   ├── mobile/            # React Native + Expo (iOS/Android)
│   └── backoffice/        # React + Vite + TailwindCSS (panel restaurante)
├── packages/
│   ├── api/               # Fastify + Prisma + PostgreSQL + Redis
│   └── shared/            # Tipos TypeScript + Schemas Zod compartidos
├── .github/workflows/     # CI/CD (GitHub Actions)
├── docker-compose.yml     # PostgreSQL + Redis para desarrollo
├── turbo.json             # Configuracion Turborepo
├── pnpm-workspace.yaml    # Workspaces monorepo
└── .env.example           # Variables de entorno plantilla
```

---

## 1. Setup inicial (primera vez)

### 1.1 Clonar e instalar dependencias

```bash
cd taula
pnpm install
```

### 1.2 Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y rellena las variables necesarias. Para desarrollo local, los valores por defecto de database y Redis ya funcionan con Docker Compose. Los tokens de terceros (Mapbox, Firebase, Resend, etc.) son opcionales para arrancar la API.

> **Ubicacion del `.env`:** debe estar en la **raiz del monorepo** (`taula/.env`). El paquete `packages/api` carga ese fichero con `env-cmd` al ejecutar `pnpm dev` (API), `pnpm db:migrate`, `pnpm db:seed` y `prisma studio`. No hace falta duplicar `.env` dentro de `packages/api`.

### 1.3 Levantar base de datos y Redis

```bash
docker compose up -d
```

Esto arranca:
- **PostgreSQL** (PostGIS 16) en `localhost:5432` - usuario: `taula`, pass: `password`, db: `taula_dev`
- **Redis** 7 en `localhost:6379`

Verificar que estan corriendo:

```bash
docker compose ps
```

### 1.4 Generar Prisma Client y ejecutar migraciones

```bash
pnpm db:generate
pnpm db:migrate
```

> La primera vez Prisma te pedira un nombre para la migracion. Escribe algo como `init`.

### 1.5 Poblar la base de datos con datos de prueba (seed)

```bash
pnpm db:seed
```

Esto crea:
- **11 restaurantes** de ejemplo (varias parroquias y tipos de cocina), con imagenes, ratings y datos completos
- Horarios de apertura y slots de disponibilidad (30 dias)
- Un **owner** por restaurante: email `owner@<slug>.taula.ad` (misma contrasena para todos, ver seccion 3)
- **1 usuario de prueba** de app

---

## 2. Ejecutar en desarrollo

### 2.1 Solo la API (backend)

```bash
pnpm dev:api
```

La API arranca en **http://localhost:3000**. Endpoint de health check:

```bash
curl http://localhost:3000/health
# {"status":"ok","timestamp":"..."}
```

### 2.2 Solo el backoffice web

```bash
pnpm dev:backoffice
```

Abre **http://localhost:5173**. El proxy de Vite redirige `/v1/*` a la API en el puerto 3000, asi que la API debe estar corriendo.

### 2.3 Solo la app movil (Expo)

Desde la **raiz del monorepo** (`taula/`):

```bash
pnpm dev:mobile
```

Equivale a `expo start` en `apps/mobile`. Se abre la consola de Metro; desde ahi puedes:

| Tecla / accion | Efecto |
|---|---|
| `a` | Abrir en emulador Android (si tienes Android Studio) |
| `i` | Abrir en simulador iOS (solo macOS) |
| `w` | Abrir en navegador (web) |
| `r` | Recargar el bundle |
| QR con **Expo Go** | Probar en telefono real (recomendado) |

**Requisitos para probar en telefono con Expo Go**

1. **API en marcha** en tu PC: `pnpm dev:api` (puerto **3000**).
2. **Misma red WiFi** que el ordenador donde corre Metro, o usa tunnel (abajo).
3. Cuenta **Expo** (`npx expo login`) si la CLI lo pide para el QR o para publicar.

**URL de la API en el movil**

- En el mismo WiFi, la app suele resolver sola la IP del PC a partir de Metro (`EXPO_PUBLIC_API_URL` no es obligatorio).
- Si falla la conexion o usas otra red, define en `.env` en la raiz (y reinicia Expo):

  ```env
  EXPO_PUBLIC_API_URL="http://TU_IP_LOCAL:3000"
  ```

  Sustituye `TU_IP_LOCAL` por la IPv4 de tu PC (ej. `192.168.1.50`). El valor debe apuntar al **puerto 3000** de la API (sin `/v1`; la app lo anade).

  Expo carga variables desde el directorio de la app: si no te las toma desde la raiz, crea `apps/mobile/.env` con la misma linea `EXPO_PUBLIC_API_URL=...`.

**Tunnel (otra red / VPN)**

```bash
cd apps/mobile
npx expo start --tunnel
```

**Puerto 3000 ocupado (API)**

Si ves `EADDRINUSE` al arrancar la API, otra instancia ya usa el puerto. En Windows (PowerShell):

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Limpiar cache de Metro** (si algo va raro):

```bash
cd apps/mobile
npx expo start --clear
```

### 2.4 Todo a la vez

```bash
pnpm dev
```

Turborepo ejecuta en paralelo: API + Backoffice + Mobile.

---

## 3. Credenciales de prueba

### Usuario (app movil)
| Campo | Valor |
|---|---|
| Email | `test@taula.ad` |
| Password | `password123` |

### Panel de restaurante (backoffice)

Tras el seed, cada restaurante tiene un usuario owner: **`owner@<slug>.taula.ad`** / **`password123`**.

Ejemplos: `owner@borda-jovell.taula.ad`, `owner@koi-sushi-andorra.taula.ad`, `owner@mar-blau.taula.ad` (el `<slug>` coincide con el del seed en `packages/api/prisma/seed.ts`).

### Admin API
Los endpoints `/v1/admin/*` requieren la cabecera `x-admin-key` con el valor de `ADMIN_API_KEY` del `.env` (por defecto: `change-me-admin-key`).

---

## 4. Endpoints principales de la API

Base URL: `http://localhost:3000/v1`

| Metodo | Ruta | Descripcion | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Registro usuario | No |
| `POST` | `/auth/login` | Login usuario | No |
| `POST` | `/auth/google` | Login con Google | No |
| `POST` | `/auth/apple` | Login con Apple | No |
| `POST` | `/auth/refresh` | Refrescar token | No |
| `GET` | `/restaurants` | Listar restaurantes (con filtros) | No |
| `GET` | `/restaurants/:slug` | Detalle restaurante | No |
| `GET` | `/restaurants/:slug/slots?date=YYYY-MM-DD&partySize=N` | Slots disponibles | No |
| `GET` | `/restaurants/:slug/reviews` | Resenas del restaurante | No |
| `POST` | `/reservations` | Crear reserva | Si (user) |
| `GET` | `/reservations` | Mis reservas | Si (user) |
| `GET` | `/reservations/:id` | Detalle reserva | Si (user) |
| `PATCH` | `/reservations/:id/cancel` | Cancelar reserva | Si (user) |
| `POST` | `/reviews` | Crear resena | Si (user) |
| `GET` | `/me` | Mi perfil | Si (user) |
| `PATCH` | `/me` | Editar perfil | Si (user) |
| `POST` | `/me/push-token` | Registrar push token | Si (user) |
| `POST` | `/restaurant/auth/login` | Login panel restaurante | No |
| `POST` | `/restaurant/auth/register` | Registrar restaurante | No |
| `GET` | `/restaurant/me` | Mi restaurante | Si (restaurant) |
| `GET` | `/restaurant/reservations` | Reservas del restaurante | Si (restaurant) |
| `PATCH` | `/restaurant/reservations/:id` | Cambiar estado reserva | Si (restaurant) |
| `GET` | `/restaurant/slots` | Mis slots | Si (restaurant) |
| `POST` | `/restaurant/slots/block` | Bloquear slot | Si (restaurant) |
| `GET` | `/restaurant/stats` | Estadisticas | Si (restaurant) |
| `GET` | `/admin/restaurants/pending` | Restaurantes pendientes | Si (admin key) |
| `PATCH` | `/admin/restaurants/:id/approve` | Aprobar restaurante | Si (admin key) |
| `GET` | `/admin/stats` | Stats globales | Si (admin key) |

**Autenticacion:** Enviar `Authorization: Bearer <accessToken>` en las cabeceras. Para admin: `x-admin-key: <ADMIN_API_KEY>`.

---

## 5. Comandos utiles

```bash
# ─── Desarrollo ──────────────────────────────────────
pnpm dev                  # Arranca todo (API + backoffice + mobile)
pnpm dev:api              # Solo API (puerto 3000)
pnpm dev:backoffice       # Solo backoffice (puerto 5173)
pnpm dev:mobile           # Solo Expo (app movil)

# ─── Base de datos ───────────────────────────────────
pnpm db:generate          # Genera Prisma Client
pnpm db:migrate           # Ejecuta migraciones
pnpm db:seed              # Puebla con datos de prueba
pnpm --filter=@taula/api exec prisma studio  # GUI para explorar la BD

# ─── Calidad ─────────────────────────────────────────
pnpm test                 # Ejecuta tests (Vitest)
pnpm type-check           # Verifica tipos TypeScript
pnpm build                # Compila todo

# ─── Docker ──────────────────────────────────────────
docker compose up -d      # Levanta PostgreSQL + Redis
docker compose down       # Para los servicios
docker compose down -v    # Para y borra datos (reset completo)
```

---

## 6. Stack tecnologico

| Capa | Tecnologias |
|---|---|
| **Backend** | Node.js, Fastify 5, TypeScript, Prisma 6, PostgreSQL 16 + PostGIS, Redis 7, BullMQ |
| **Mobile** | React Native (Expo SDK 54), Expo Router 6, Mapbox (nativo; fallback en web), React Query, Zustand, i18next |
| **Backoffice** | React 18, Vite 5, TailwindCSS 3, Recharts, Zustand, Axios |
| **Shared** | TypeScript, Zod 3 |
| **Auth** | JWT (access + refresh), Google OAuth, Apple Sign-In, bcrypt |
| **Notificaciones** | Firebase Cloud Messaging (push), Resend (email), BullMQ (colas) |
| **CI/CD** | GitHub Actions, Railway (deploy), EAS Build (mobile) |

---

## 7. Idiomas soportados (i18n)

La app movil soporta 4 idiomas. Detecta automaticamente el idioma del dispositivo:

| Codigo | Idioma |
|---|---|
| `ca` | Catala (por defecto) |
| `es` | Espanol |
| `en` | Ingles |
| `fr` | Frances |

Los archivos de traduccion estan en `apps/mobile/i18n/locales/`.

---

## 8. Modelo de datos (resumen)

```
User ─────────── Reservation ────── Restaurant
  │                   │                  │
  └── Review ─────────┘                  ├── RestaurantOwner
                      │                  ├── OpeningHours
                      │                  ├── AvailabilitySlot
                 BillingRecord           └── Review
```

- **User**: usuarios finales (email/Google/Apple auth)
- **Restaurant**: restaurantes con geolocalizacion, horarios, imagenes
- **AvailabilitySlot**: slots de 30 min con capacidad maxima
- **Reservation**: reservas atomicas con codigo unico (`TAU-XXXX`)
- **Review**: resenas 1-5 estrellas (una por usuario/restaurante)
- **BillingRecord**: facturacion por reserva (1.80 EUR/comensal)

---

## 9. Troubleshooting

### Docker no arranca / puerto ocupado
```bash
# Verificar que nada ocupa los puertos 5432/6379
docker compose down
docker compose up -d
```

### Error de Prisma "Can't reach database"
1. Verifica que Docker esta corriendo: `docker compose ps`
2. Verifica la `DATABASE_URL` en `.env`
3. Re-genera el client: `pnpm db:generate`

### La app movil no conecta con la API
- En Expo Go, `localhost` es el telefono, no tu PC
- Pon `EXPO_PUBLIC_API_URL="http://<IP_de_tu_PC>:3000"` en `.env` en la raiz del monorepo y reinicia Metro (`Ctrl+C` y `pnpm dev:mobile`)
- Comprueba firewall de Windows y que PC y movil esten en la misma WiFi, o usa `npx expo start --tunnel` desde `apps/mobile`

### Error "build scripts were ignored" con pnpm
```bash
pnpm approve-builds
# Selecciona prisma, @prisma/client, @prisma/engines
pnpm install
```

### Reset completo de la base de datos
```bash
docker compose down -v
docker compose up -d
pnpm db:migrate
pnpm db:seed
```
