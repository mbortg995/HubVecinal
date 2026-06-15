# HubVecinal

Aplicación web que conecta a los **propietarios** de una comunidad con sus **administradores de finca**. Un hub donde ver de un vistazo:

- 📅 Las **próximas juntas vecinales** y las ya celebradas (con acta).
- 💰 El **dinero en las arcas comunes** y todos sus movimientos.
- ✅ Los **temas pendientes** de resolver y los **resueltos** en la última junta.
- 👥 Los **vecinos** vinculados a la comunidad.

## Roles

| Rol | Qué puede hacer |
| --- | --- |
| **Propietario** | Vincula su vivienda a una comunidad (con un código), consulta toda la información. |
| **Presidente** | Es un propietario que *crea* la comunidad. Gestiona juntas, arcas, temas y asigna administrador. |
| **Administrador de fincas** | Cuenta especial. Una vez asignado por un presidente, gestiona la comunidad igual que el presidente. |

Solo el presidente y el administrador pueden crear/editar/borrar; los demás propietarios tienen acceso de solo lectura.

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
| `presidente@hubvecinal.dev` | Presidente de "Comunidad Los Olivos" |
| `admin@hubvecinal.dev` | Administrador de fincas (asignado a esa comunidad) |
| `carlos@hubvecinal.dev` | Propietario (1ºA) |
| `marta@hubvecinal.dev` | Propietario (2ºC) |
| `javier@hubvecinal.dev` | Propietario (4ºA) |

Código para unirse a la comunidad de ejemplo: **`OLIVOS24`**

## API (resumen)

Todas las rutas bajo `/api`. Las de comunidad requieren cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/register` | Crear cuenta (`role`: `owner` \| `admin`) |
| POST | `/auth/login` | Iniciar sesión |
| GET | `/auth/me` | Usuario actual |
| GET | `/communities/mine` | Comunidades del usuario |
| POST | `/communities` | Crear comunidad (pasas a ser presidente) |
| POST | `/communities/join` | Unirse con `joinCode` |
| GET | `/communities/:id` | Detalle + resumen del hub |
| PATCH | `/communities/:id` | Editar datos *(gestores)* |
| POST | `/communities/:id/admin` | Asignar administrador por email *(gestores)* |
| GET/POST/PATCH/DELETE | `/communities/:id/meetings` | Juntas |
| GET/POST/PATCH/DELETE | `/communities/:id/topics` | Temas |
| GET/POST/DELETE | `/communities/:id/transactions` | Movimientos de arcas |
| GET | `/communities/:id/members` | Vecinos |

## Próximos pasos (despliegue en la nube)

- Backend: desplegable en Render/Railway/Fly.io. Usar **MongoDB Atlas** como BD gestionada (cambiar `MONGODB_URI`).
- Frontend: build estático (`npm run build`) desplegable en Vercel/Netlify. Ajustar `VITE_API_URL` a la URL del backend.
- Mover `JWT_SECRET` a un secreto del proveedor y restringir `CLIENT_ORIGIN`.
