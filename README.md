# BURGIR BURGIR 

Sitio de pedidos de hamburguesas
Backend en Node.js + Express conectado a MySQL (base de datos "burgir") 
Frontend en HTML, CSS y JavaScript.

## Estructura

burgir
├── schema.sql          (Base de datos burgir y 4 tablas)
├── README.md
├── backend/
│   ├── server.js       (API REST + sirve el frontend)
│   ├── package.json
│   ├── package-lock.json   npm init -y; npm i express dotenv mysql2 nodemon; npm run start.
│   └── .env            
└── frontend/
    ├── index.html
    ├── style.css
    └── app.js


## 1. Prerrequisitos

- **Node.js** 18 o superior.
- **MySQL** 8.0 o superior. MariaDB 10.4+ también funciona.
- Un navegador moderno.

## 2. Instalación

```bash
cd backend
npm install
```

Esto instala `express`, `cors`, `dotenv` y `mysql2` (más `nodemon` para desarrollo) y genera `package-lock.json`.

## 3. Base de datos

1. Asegúrate de que MySQL esté encendido.
2. Ejecuta el script desde la raíz del proyecto (pedirá tu contraseña de MySQL):

   ```bash
   mysql -u root -p < schema.sql
   ```

   > ⚠️ El script hace `DROP DATABASE IF EXISTS burgir`, por lo que **borra y recrea** la base. No lo vuelvas a ejecutar si ya tienes pedidos que quieras conservar.

3. Revisa `backend/.env` y ajusta las credenciales a tu MySQL:

   ```dotenv
   PORT=3000

   BD_HOST=localhost
   BD_PORT=3306
   BD_USER=root
   BD_PASS=
   BD_NAME=burgir
   ```

   Si tu usuario `root` tiene contraseña, escríbela en `BD_PASS`.

Tablas creadas: `usuarios`, `productos`, `pedidos` y `detalles_pedido`. Los 8 productos del menú se insertan automáticamente.

## 4. Ejecución

```bash
cd backend
npm start          # o: node server.js
# Para recargar automáticamente al editar:  npm run dev
```

Abre **http://localhost:3000** en el navegador. El mismo servidor entrega el frontend y la API.

Para comprobar la conexión a la base de datos: http://localhost:3000/api/salud debe responder `{"ok":true,"bd":"conectada"}`.

## 5. Cómo se usa

1. **1 · JUGADOR**: crea un usuario (nombre, teléfono de 8 dígitos, correo y dirección). También puedes editar, eliminar o elegir con qué jugador pedir.
2. **2 · MENÚ**: agrega productos al carrito.
3. **3 · PEDIDOS**: revisa el carrito, confirma el pedido y consulta, edita la dirección o elimina tus pedidos anteriores.

## 6. Rutas API

Base: `http://localhost:3000/api` · Todas usan y devuelven JSON.

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/salud` | Comprueba la conexión a la BD |
| GET | `/usuarios` | Lista usuarios |
| GET | `/usuarios/:id` | Un usuario |
| POST | `/usuarios` | Crea usuario `{ nombre, telefono, correo, direccion }` |
| PUT | `/usuarios/:id` | Actualiza usuario |
| DELETE | `/usuarios/:id` | Elimina usuario (409 si tiene pedidos) |
| GET | `/productos` | Lista el menú |
| GET | `/productos/:id` | Un producto |
| POST | `/productos` | Crea producto `{ cod_producto, nombre_producto, precio }` |
| PUT | `/productos/:id` | Actualiza `{ nombre_producto, precio }` |
| DELETE | `/productos/:id` | Elimina producto (409 si ya fue pedido) |
| GET | `/pedidos` | Lista pedidos (filtro opcional `?cod_usuario=1`) |
| GET | `/pedidos/:id` | Un pedido con su detalle de productos |
| POST | `/pedidos` | Crea pedido `{ cod_usuario, direccion_envio, items: [{ cod_producto, cantidad }] }` |
| PUT | `/pedidos/:id` | Cambia la dirección `{ direccion_envio }` |
| DELETE | `/pedidos/:id` | Elimina el pedido y su detalle |

Notas:

- Al crear un pedido, el servidor toma los **precios desde la base de datos** (no del navegador), calcula `subtotal` y `total` y guarda el pedido y su detalle en una sola transacción.
- Los errores se devuelven como `{ "error": "mensaje" }` con el código HTTP correspondiente (400, 404, 409, 500).
- En el frontend, cada operación CRUD está dentro de `try/catch` y los errores se envían a `console.log` (abre las herramientas de desarrollo del navegador para verlos).

## Problemas frecuentes

- **`ECONNREFUSED` / "No se pudo conectar a MySQL"**: MySQL no está encendido o el host/puerto del `.env` no coincide.
- **`Access denied for user`**: usuario o contraseña incorrectos en `BD_USER` / `BD_PASS`.
- **`Unknown database 'burgir'`**: falta ejecutar `schema.sql`.
- **El menú dice "NO SE PUDO CARGAR"**: el servidor no está corriendo; inicia `npm start` y abre `http://localhost:3000`.
