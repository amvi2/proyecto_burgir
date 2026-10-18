
require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;


const pool = mysql.createPool({
  host: process.env.BD_HOST || 'localhost',
  port: Number(process.env.BD_PORT) || 3306,
  user: process.env.BD_USER || 'root',
  password: process.env.BD_PASS || '',
  database: process.env.BD_NAME || 'burgir',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true
});


app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const esEnteroPositivo = (v) => Number.isInteger(v) && v > 0;
const aCentavos = (n) => Math.round(Number(n) * 100);
const deCentavos = (c) => c / 100;

function parseId(valor) {
  const n = Number(valor);
  return esEnteroPositivo(n) ? n : null;
}

function validarUsuario(body, { parcial = false } = {}) {
  const errores = [];
  const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
  const correo = typeof body.correo === 'string' ? body.correo.trim() : '';
  const direccion = typeof body.direccion === 'string' ? body.direccion.trim() : '';
  const telefono = String(body.telefono ?? '').trim();

  if (!nombre || nombre.length > 100) errores.push('nombre es obligatorio (máx. 100 caracteres)');
  if (!/^\d{8}$/.test(telefono)) errores.push('telefono debe tener 8 dígitos numéricos');
  if (!/^\S+@\S+\.\S+$/.test(correo) || correo.length > 150) errores.push('correo no es válido');
  if (!direccion || direccion.length > 255) errores.push('direccion es obligatoria (máx. 255 caracteres)');

  return { errores, datos: { nombre, telefono: Number(telefono), correo, direccion } };
}

function manejarErrorBD(err, res, next) {
  if (err && err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({ error: 'No se puede eliminar: el registro tiene datos relacionados' });
  }
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Ya existe un registro con ese código' });
  }
  return next(err);
}

app.get('/api/salud', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, bd: 'conectada' });
  } catch (error) {
    console.error('Error de conexión a la BD:', error.message);
    res.status(500).json({ ok: false, bd: 'sin conexión' });
  }
});

app.get('/api/usuarios', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios ORDER BY cod_usuario DESC');
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/usuarios/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Código de usuario inválido' });
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE cod_usuario = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

app.post('/api/usuarios', async (req, res, next) => {
  try {
    const { errores, datos } = validarUsuario(req.body || {});
    if (errores.length) return res.status(400).json({ error: errores.join('; ') });

    const [r] = await pool.query(
      'INSERT INTO usuarios (nombre, telefono, correo, direccion) VALUES (?,?,?,?)',
      [datos.nombre, datos.telefono, datos.correo, datos.direccion]
    );
    res.status(201).json({ cod_usuario: r.insertId, ...datos });
  } catch (e) { next(e); }
});

app.put('/api/usuarios/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Código de usuario inválido' });
    const { errores, datos } = validarUsuario(req.body || {});
    if (errores.length) return res.status(400).json({ error: errores.join('; ') });

    const [r] = await pool.query(
      'UPDATE usuarios SET nombre = ?, telefono = ?, correo = ?, direccion = ? WHERE cod_usuario = ?',
      [datos.nombre, datos.telefono, datos.correo, datos.direccion, id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ cod_usuario: id, ...datos });
  } catch (e) { next(e); }
});

app.delete('/api/usuarios/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Código de usuario inválido' });
    const [r] = await pool.query('DELETE FROM usuarios WHERE cod_usuario = ?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ mensaje: 'Usuario eliminado' });
  } catch (e) { manejarErrorBD(e, res, next); }
});


function validarProducto(body, { conCodigo = false } = {}) {
  const errores = [];
  const nombre_producto = typeof body.nombre_producto === 'string' ? body.nombre_producto.trim() : '';
  const precio = Number(body.precio);
  const cod_producto = Number(body.cod_producto);

  if (conCodigo && !esEnteroPositivo(cod_producto)) errores.push('cod_producto debe ser un entero positivo');
  if (!nombre_producto || nombre_producto.length > 100) errores.push('nombre_producto es obligatorio (máx. 100 caracteres)');
  if (!Number.isFinite(precio) || precio < 0) errores.push('precio debe ser un número mayor o igual a 0');

  return { errores, datos: { cod_producto, nombre_producto, precio: deCentavos(aCentavos(precio)) } };
}

app.get('/api/productos', async (_req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT * FROM productos ORDER BY cod_producto');
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/productos/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Código de producto inválido' });
    const [rows] = await pool.query('SELECT * FROM productos WHERE cod_producto = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

app.post('/api/productos', async (req, res, next) => {
  try {
    const { errores, datos } = validarProducto(req.body || {}, { conCodigo: true });
    if (errores.length) return res.status(400).json({ error: errores.join('; ') });
    await pool.query(
      'INSERT INTO productos (cod_producto, nombre_producto, precio) VALUES (?,?,?)',
      [datos.cod_producto, datos.nombre_producto, datos.precio]
    );
    res.status(201).json(datos);
  } catch (e) { manejarErrorBD(e, res, next); }
});

app.put('/api/productos/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Código de producto inválido' });
    const { errores, datos } = validarProducto(req.body || {});
    if (errores.length) return res.status(400).json({ error: errores.join('; ') });
    const [r] = await pool.query(
      'UPDATE productos SET nombre_producto = ?, precio = ? WHERE cod_producto = ?',
      [datos.nombre_producto, datos.precio, id]
    );
    if (!r.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ ...datos, cod_producto: id });
  } catch (e) { next(e); }
});

app.delete('/api/productos/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Código de producto inválido' });
    const [r] = await pool.query('DELETE FROM productos WHERE cod_producto = ?', [id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json({ mensaje: 'Producto eliminado' });
  } catch (e) { manejarErrorBD(e, res, next); }
});


app.get('/api/pedidos', async (req, res, next) => {
  try {
    let sql = `SELECT p.cod_pedido, p.cod_usuario, u.nombre, p.fecha_pedido, p.direccion_envio, p.total
               FROM pedidos p JOIN usuarios u ON u.cod_usuario = p.cod_usuario`;
    const params = [];
    if (req.query.cod_usuario !== undefined) {
      const id = parseId(req.query.cod_usuario);
      if (!id) return res.status(400).json({ error: 'cod_usuario inválido' });
      sql += ' WHERE p.cod_usuario = ?';
      params.push(id);
    }
    sql += ' ORDER BY p.cod_pedido DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) { next(e); }
});

app.get('/api/pedidos/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Código de pedido inválido' });
    const [pedidos] = await pool.query('SELECT * FROM pedidos WHERE cod_pedido = ?', [id]);
    if (!pedidos.length) return res.status(404).json({ error: 'Pedido no encontrado' });
    const [detalles] = await pool.query(
      `SELECT d.cod_detalles, d.cod_producto, pr.nombre_producto, d.cantidad, d.precio_unitario, d.subtotal
       FROM detalles_pedido d JOIN productos pr ON pr.cod_producto = d.cod_producto
       WHERE d.cod_pedido = ? ORDER BY d.cod_detalles`,
      [id]
    );
    res.json({ ...pedidos[0], detalles });
  } catch (e) { next(e); }
});

app.post('/api/pedidos', async (req, res, next) => {
  const { cod_usuario, direccion_envio, items } = req.body || {};
  const direccion = typeof direccion_envio === 'string' ? direccion_envio.trim() : '';

  if (!esEnteroPositivo(cod_usuario)) return res.status(400).json({ error: 'cod_usuario inválido' });
  if (!direccion || direccion.length > 255) {
    return res.status(400).json({ error: 'direccion_envio es obligatoria (máx. 255 caracteres)' });
  }
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'El pedido debe incluir al menos un producto' });
  }

  const cantidades = new Map();
  for (const it of items) {
    if (!esEnteroPositivo(it?.cod_producto) || !Number.isInteger(it?.cantidad) || it.cantidad < 1 || it.cantidad > 99) {
      return res.status(400).json({ error: 'Cada item necesita cod_producto y una cantidad entera entre 1 y 99' });
    }
    cantidades.set(it.cod_producto, (cantidades.get(it.cod_producto) || 0) + it.cantidad);
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [usuarios] = await conn.query('SELECT cod_usuario FROM usuarios WHERE cod_usuario = ?', [cod_usuario]);
    if (!usuarios.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const codigos = [...cantidades.keys()];
    const [productos] = await conn.query(
      'SELECT cod_producto, precio FROM productos WHERE cod_producto IN (?)',
      [codigos]
    );
    if (productos.length !== codigos.length) {
      await conn.rollback();
      return res.status(400).json({ error: 'Uno o más productos no existen' });
    }

    let totalCentavos = 0;
    const lineas = productos.map((p) => {
      const cantidad = cantidades.get(p.cod_producto);
      const subtotal = aCentavos(p.precio) * cantidad;
      totalCentavos += subtotal;
      return [p.cod_producto, cantidad, p.precio, deCentavos(subtotal)];
    });

    const [r] = await conn.query(
      'INSERT INTO pedidos (cod_usuario, direccion_envio, total) VALUES (?,?,?)',
      [cod_usuario, direccion, deCentavos(totalCentavos)]
    );
    await conn.query(
      'INSERT INTO detalles_pedido (cod_pedido, cod_producto, cantidad, precio_unitario, subtotal) VALUES ?',
      [lineas.map((l) => [r.insertId, ...l])]
    );

    await conn.commit();
    res.status(201).json({ cod_pedido: r.insertId, total: deCentavos(totalCentavos) });
  } catch (e) {
    await conn.rollback();
    next(e);
  } finally {
    conn.release();
  }
});

app.put('/api/pedidos/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Código de pedido inválido' });
    const direccion = typeof req.body?.direccion_envio === 'string' ? req.body.direccion_envio.trim() : '';
    if (!direccion || direccion.length > 255) {
      return res.status(400).json({ error: 'direccion_envio es obligatoria (máx. 255 caracteres)' });
    }
    const [r] = await pool.query('UPDATE pedidos SET direccion_envio = ? WHERE cod_pedido = ?', [direccion, id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ cod_pedido: id, direccion_envio: direccion });
  } catch (e) { next(e); }
});

app.delete('/api/pedidos/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Código de pedido inválido' });
    const [r] = await pool.query('DELETE FROM pedidos WHERE cod_pedido = ?', [id]); // borra sus detalles en cascada
    if (!r.affectedRows) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json({ mensaje: 'Pedido eliminado' });
  } catch (e) { next(e); }
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, async () => {
  console.log(`BURGIR BURGIR escuchando en http://localhost:${PORT}`);
  try {
    await pool.query('SELECT 1');
    console.log(`Conectado a MySQL (base "${process.env.BD_NAME || 'burgir'}")`);
  } catch (error) {
    console.error('No se pudo conectar a MySQL. Revisa backend/.env y que schema.sql esté ejecutado.');
    console.error(error.message);
  }
});
