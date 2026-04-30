# Taula - Plataforma de Reservas de Restaurantes para Andorra

Monorepo con 4 aplicaciones: API backend, app movil (React Native/Expo, doble perfil cliente/restaurante), admin web (React/Vite) y backoffice web legacy en proceso de retirada.

## Novedades importantes

- **App movil unificada cliente + restaurante**: una sola cuenta `User` puede tener varios restaurantes vinculados y alternar entre modo cliente y modo restaurante con un selector. El antiguo backoffice web queda **deprecado** (banner visible en sus pantallas).
- **Planes de pago**:
  - **Plan A "Taula Reservations"**: 20 EUR/mes via Stripe Subscription + 1 EUR por comensal (`BillingRecord`). Incluye el sistema de reservas Taula completo.
  - **Plan B Basic "Listing"**: 49,99 EUR/mes. Solo aparece en el listado, con `externalReservationUrl` para reservar en su web.
  - **Plan B Featured "Listing"**: 99,99 EUR/mes. Igual que Basic + badge "Destacado", seccion destacada en home y posicion top en filtros.
- **Concesion gratuita por admin**: nueva web `apps/admin/` (puerto 5180) para asignar planes manualmente (`ADMIN_GRANT`, opcionalmente con fecha de caducidad).
- **Notificaciones**: bandeja unica en la app (`/notifications`) con scope cliente o restaurante segun modo. Preferencias persistidas en backend (`NotificationPreference`). Disparadores: nueva reserva, cancelacion, recordatorio 24 h y 2 h, recordatorio de resena, nueva resena, fallo de cobro de plan y fallo no-show.

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
│   ├── mobile/            # React Native + Expo (iOS/Android, modos cliente y restaurante)
│   ├── admin/             # React + Vite + TailwindCSS (panel admin interno: planes, usuarios, stats)
│   └── backoffice/        # React + Vite + TailwindCSS (panel restaurante - DEPRECADO, banner activo)
├── packages/
│   ├── api/               # Fastify + Prisma + PostgreSQL + Redis + Stripe Subscriptions
│   └── shared/            # Tipos TypeScript + Schemas Zod compartidos
├── .github/workflows/     # CI/CD (GitHub Actions)
├── docker-compose.yml     # PostgreSQL + Redis para desarrollo
├── turbo.json             # Configuracion Turborepo
├── pnpm-workspace.yaml    # Workspaces monorepo
└── .env.example           # Variables de entorno plantilla (incluye STRIPE_PRICE_*)
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

### 2.2 Solo el backoffice web (legacy / deprecado)

```bash
pnpm dev:backoffice
```

Abre **http://localhost:5173**. Esta web muestra ya un banner indicando que la nueva experiencia esta en la app movil. Se mantiene temporalmente como ayuda; sera eliminada cuando la app movil tenga paridad total.

### 2.2 bis Admin web (interno)

```bash
pnpm dev:admin
```

Abre **http://localhost:5180**. Pide la `ADMIN_API_KEY` definida en `.env`. Permite:

- Listar restaurantes con su plan y estado de suscripcion.
- Detalle de cada restaurante con sus owners, reservas y resenas.
- **Conceder un plan gratuitamente** (`ADMIN_GRANT`) con fecha opcional de caducidad y revocarlo.
- Aprobar restaurantes pendientes.
- Ver usuarios y estadisticas globales.

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
| `GET` | `/restaurant/billing/subscription` | Estado de suscripcion + uso del mes | Si (restaurant) |
| `POST` | `/restaurant/billing/checkout` | Crear sesion Stripe Checkout (planes) | Si (restaurant) |
| `POST` | `/restaurant/billing/portal` | Abrir Stripe Customer Portal | Si (restaurant) |
| `POST` | `/restaurant/billing/cancel` | Cancelar al final del periodo | Si (restaurant) |
| `POST` | `/webhooks/stripe` | Webhook de Stripe (sync suscripciones) | Firma Stripe |
| `GET` | `/notifications` | Bandeja del usuario actual | Si (user) |
| `PATCH` | `/notifications/:id/read` | Marcar como leida | Si (user) |
| `POST` | `/notifications/read-all` | Marcar todas como leidas | Si (user) |
| `GET` | `/notifications/preferences` | Preferencias de notificacion | Si (user) |
| `PATCH` | `/notifications/preferences` | Actualizar preferencias | Si (user) |
| `GET` | `/notifications/restaurant` | Bandeja del restaurante activo | Si (restaurant) |
| `GET` | `/me/ownerships` | Restaurantes que posee el usuario | Si (user) |
| `POST` | `/me/restaurant-token` | Obtener token de modo restaurante | Si (user) |
| `GET` | `/admin/restaurants` | Listar restaurantes (con filtros) | Si (admin key) |
| `GET` | `/admin/restaurants/:id` | Detalle de restaurante (con suscripcion) | Si (admin key) |
| `GET` | `/admin/restaurants/pending` | Restaurantes pendientes | Si (admin key) |
| `PATCH` | `/admin/restaurants/:id/approve` | Aprobar restaurante | Si (admin key) |
| `POST` | `/admin/restaurants/:id/grant-plan` | Conceder un plan gratuito | Si (admin key) |
| `POST` | `/admin/restaurants/:id/revoke-plan` | Revocar plan otorgado por admin | Si (admin key) |
| `GET` | `/admin/users` | Listado de usuarios | Si (admin key) |
| `GET` | `/admin/stats` | Stats globales (incluye planes) | Si (admin key) |

**Autenticacion:** Enviar `Authorization: Bearer <accessToken>` en las cabeceras. Para admin: `x-admin-key: <ADMIN_API_KEY>`.

---

## 5. Comandos utiles

```bash
# ─── Desarrollo ──────────────────────────────────────
pnpm dev                  # Arranca todo (API + backoffice + mobile)
pnpm dev:api              # Solo API (puerto 3000)
pnpm dev:backoffice       # Solo backoffice (puerto 5173, legacy)
pnpm dev:admin            # Solo admin web (puerto 5180)
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

El esquema completo esta en `packages/api/prisma/schema.prisma`. Resumen:

```
User ─────────── Reservation ────── Restaurant
  │                   │                  │
  └── Review ─────────┘                  ├── Zone / RestaurantTable / Service
                      │                  ├── MenuCategory / MenuItem / Offer
                 BillingRecord           ├── OpeningHours
                      │                  └── Review
```

- **User**: usuarios finales (email/Google/Apple auth)
- **Restaurant**: datos del local, anti no-show (Stripe opcional), imagenes (Cloudinary opcional)
- **Zone / RestaurantTable / Service**: configuracion del panel (mesas, turnos, duracion); la disponibilidad se calcula en servidor (`availability.service.ts`)
- **Reservation**: codigo unico (`TAU-XXXX`), estados `PENDING` / `CONFIRMED`, asignacion de mesa cuando aplica
- **Review**: resenas 1-5 estrellas (una por usuario/restaurante)
- **BillingRecord**: facturacion por reserva del Plan A (1 EUR/comensal). Solo se genera cuando el restaurante tiene plan activo `RESERVATIONS`.
- **Subscription**: plan activo del restaurante (`RESERVATIONS`, `LISTING_BASIC`, `LISTING_FEATURED`) con estado Stripe sincronizado por webhook (`/v1/webhooks/stripe`) o concedido manualmente por admin (`status = ADMIN_GRANT`).
- **NotificationPreference / Notification**: preferencias por usuario y bandeja unificada con scope `USER` o `RESTAURANT` (multi-restaurante por owner).

---

## 9. Reservas y panel restaurante (backoffice)

- **Disponibilidad**: la API calcula slots segun servicios activos, mesas y reservas existentes (incluye reservas pendientes sin mesa para evitar sobreventa). Al crear una reserva se validan antelacion minima/maxima (`minAdvanceMinutes`, `maxAdvanceDays` en el restaurante), que no sea en el pasado, y que no exista otra reserva activa del mismo usuario para el mismo restaurante, fecha y hora.
- **Slots del dia actual**: para la fecha de hoy, la API no devuelve horarios ya pasados (respeta ademas la antelacion minima del restaurante).
- **Agenda** (`/agenda`): vista timeline por mesas y vista lista; las reservas sin mesa asignada aparecen en una fila "Sense taula". Desde **Calendario** (`/calendar`), al pulsar un dia se abre la agenda con `?date=YYYY-MM-DD`.
- **Opcionales en `.env`**: `STRIPE_*` (garantia anti no-show), `CLOUDINARY_*` (fotos menu y restaurante). Sin ellos la API arranca; las funciones que dependan de esos servicios quedan desactivadas o devuelven vacio.

---

## 10. Troubleshooting

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
