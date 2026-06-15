# HubVecinal

Plataforma **SaaS multi-tenant** que conecta a los **propietarios** de una comunidad con sus **administradores de finca**. Una administradora (organización) puede gestionar muchas comunidades, todas aisladas entre sí. Un hub donde ver de un vistazo:

- 📅 Las **próximas juntas vecinales** y las ya celebradas (con acta).
- 💰 El **dinero en las arcas comunes** y todos sus movimientos.
- ✅ Los **temas pendientes** de resolver y los **resueltos** en la última junta.
- 👥 Los **vecinos** de la comunidad y las **invitaciones** pendientes.

## Arquitectura multi-tenant

- **Organización (`Organization`)**: la administradora de fincas. Es el *tenant*; cada comunidad pertenece a una organización y los datos quedan aislados entre administradoras.
- **Membresía (`Membership`)**: relación usuario ↔ comunidad. El **rol vive en la membresía**, no en el usuario, así una persona puede tener distintos roles en distintas comunidades.
- **Invitación (`Invitation`)**: alta de usuarios por invitación con token. El invitado abre el enlace y completa (o ya tiene) su cuenta.

## Roles

| Rol | Nivel | Qué puede hacer |
| --- | --- | --- |
| **Superadmin** | Plataforma | Personal de la administradora. Crea y gestiona **todas** las comunidades de su organización; invita presidentes, admins y propietarios. |
| **Administrador** | Comunidad | Administrador de fincas asignado a comunidades concretas. Las gestiona como el presidente. |
| **Presidente** | Comunidad | Propietario que preside su comunidad. Gestiona juntas, arcas, temas e invita propietarios. |
| **Propietario** | Comunidad | Acceso de solo lectura a la información de su comunidad. |

Superadmin, administrador y presidente pueden crear/editar/borrar; los propietarios tienen acceso de solo lectura. Solo un superadmin puede crear comunidades, eliminarlas e invitar a otros administradores.

## Onboarding (por invitación)

1. Una administradora se da de alta en `/registro-organizacion` → se crea la **organización** y su primer **superadmin**.
2. El superadmin crea comunidades y **invita** por email (presidente, admin o propietario).
3. El invitado abre el enlace `/invitar/:token`, crea su contraseña y queda vinculado a la comunidad con su rol.

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + componentes estilo shadcn/ui + React Router + Axios.
- **Backend:** Node + Express + MongoDB (Mongoose), autenticación con JWT y bcrypt.

## Estructura

```
hubvecinal/
├── backend/     # API REST (Express + MongoDB)
└── frontend/    # SPA (React + Vite + Tailwind)
```

## Requisitos

- Node.js 18+ (probado con Node 26).
- MongoDB en local escuchando en `mongodb://localhost:27017` (o ajusta `MONGODB_URI`).

## Puesta en marcha

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # ya viene un .env listo para local
npm run seed                # carga la comunidad y usuarios de ejemplo
npm run dev                 # arranca en http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # arranca en http://localhost:5173
```

Abre <http://localhost:5173>.

## Usuarios de prueba (tras `npm run seed`)

Contraseña para todos: **`password123`**

| Email | Rol |
| --- | --- |
| `super@hubvecinal.dev` | **Superadmin** de "Administraciones García" (gestiona Los Olivos y Los Robles) |
| `admin@hubvecinal.dev` | Administrador de fincas (asignado a ambas comunidades) |
| `presidente@hubvecinal.dev` | Presidente de "Los Olivos" (3ºB) |
| `carlos@hubvecinal.dev` | Propietario (1ºA) |
| `marta@hubvecinal.dev` | Propietario (2ºC) |
| `javier@hubvecinal.dev` | Propietario (4ºA) |

Además se crea una **invitación pendiente** de ejemplo para `nuevo.vecino@hubvecinal.dev` (visible en la pestaña *Vecinos* al entrar como superadmin/presidente, con su enlace copiable).

## API (resumen)

Todas las rutas bajo `/api`. Las de comunidad requieren cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/register-organization` | Alta de administradora (organización + superadmin) |
| POST | `/auth/login` | Iniciar sesión |
| GET | `/auth/me` | Usuario actual + organización + membresías |
| GET | `/communities/mine` | Comunidades a las que accede el usuario, con su rol |
| POST | `/communities` | Crear comunidad *(superadmin)* |
| GET | `/communities/:id` | Detalle + resumen del hub |
| PATCH | `/communities/:id` | Editar datos *(gestores)* |
| DELETE | `/communities/:id` | Eliminar comunidad y sus datos *(superadmin)* |
| GET | `/communities/:id/members` | Vecinos (membresías) |
| DELETE | `/communities/:id/members/:mid` | Quitar a un miembro *(gestores)* |
| GET/POST/DELETE | `/communities/:id/invitations` | Invitaciones *(gestores)* |
| GET | `/invitations/:token` | Datos públicos de una invitación |
| POST | `/invitations/:token/accept` | Aceptar invitación (crea cuenta + membresía) |
| GET/POST/PATCH/DELETE | `/communities/:id/meetings` | Juntas |
| GET/POST/PATCH/DELETE | `/communities/:id/topics` | Temas |
| GET/POST/DELETE | `/communities/:id/transactions` | Movimientos de arcas |

## Próximos pasos (despliegue en la nube)

- Backend: desplegable en Render/Railway/Fly.io. Usar **MongoDB Atlas** como BD gestionada (cambiar `MONGODB_URI`).
- Frontend: build estático (`npm run build`) desplegable en Vercel/Netlify. Ajustar `VITE_API_URL` a la URL del backend.
- Mover `JWT_SECRET` a un secreto del proveedor y restringir `CLIENT_ORIGIN`.
