'use strict';

const API_URL = window.location.protocol === 'file:' ? 'http://localhost:3000/api' : '/api';

/* ----pixel art---- */
const PALETA = {
  b: '#E8A13A', // pan
  s: '#FFF1C9', // semillas
  l: '#3DDC84', // lechuga
  c: '#ECEC23', // queso
  m: '#6B3410', // carne
  t: '#FE3434', // tomate
  p: '#F1D6F5', // cebolla
  k: '#B3261E', // tocino
  w: '#FFFFFF',
  g: '#CFCFCF', // tapa
  r: '#FE3434',
  h: '#F5E6C8', // horchata
  n: '#8B5A2B', // canela
  f: '#FFD84A', // papas
  a: '#E8902C', // aros
  y: '#ECEC23'
};

const SPRITES = {
  simple: [
    '....bbbb....',
    '..bbbbbbbb..',
    '.bbsbbbbsbb.',
    '.bbbbbbbbbb.',
    'llllllllllll',
    'cccccccccccc',
    'mmmmmmmmmmmm',
    'mmmmmmmmmmmm',
    '.bbbbbbbbbb.',
    '..bbbbbbbb..'
  ],
  doble: [
    '....bbbb....',
    '..bbbbbbbb..',
    '.bbsbbbbsbb.',
    '.bbbbbbbbbb.',
    'llllllllllll',
    'cccccccccccc',
    'mmmmmmmmmmmm',
    'cccccccccccc',
    'mmmmmmmmmmmm',
    '.bbbbbbbbbb.',
    '..bbbbbbbb..'
  ],
  burgir: [
    '....bbbb....',
    '..bbbbbbbb..',
    '.bbsbbbbsbb.',
    '.bbbbbbbbbb.',
    'llllllllllll',
    '.kkkkkkkkkk.',
    'tttttttttttt',
    'cccccccccccc',
    'mmmmmmmmmmmm',
    'pppppppppppp',
    '.bbbbbbbbbb.',
    '..bbbbbbbb..'
  ],
  steak: [
    '.....ytt...',
    '.....y.....',
    '....bbbb....',
    '..bbbbbbbb..',
    '.bbsbbbbsbb.',
    '.bbbbbbbbbb.',
    'llllllllllll',
    '.pppppppppp.',
    'cccccccccccc',
    'mmmmmmmmmmmm',
    'kkkkkkkkkkkk',
    'mmmmmmmmmmmm',
    'cccccccccccc',
    'mmmmmmmmmmmm',
    '.bbbbbbbbbb.',
    '..bbbbbbbb..'
  ],
  gaseosa: [
    '.....w....',
    '.....w....',
    '.gggggggg.',
    '..rrrrrr..',
    '..rrrrrr..',
    '..rwwwwr..',
    '..rwwwwr..',
    '..rrrrrr..',
    '..rrrrrr..',
    '...rrrr...'
  ],
  horchata: [
    '.....n....',
    '.....n....',
    '.gggggggg.',
    '..hhhhhh..',
    '..hnhhhh..',
    '..hhhhnh..',
    '..hhnhhh..',
    '..hhhhhh..',
    '..hhhhhh..',
    '...hhhh...'
  ],
  papas: [
    '..f.f..f.f..',
    '.ffffffffff.',
    '.ffffffffff.',
    '.rrrrrrrrrr.',
    '.rrwwwwwwrr.',
    '.rrwwwwwwrr.',
    '..rrrrrrrr..',
    '..rrrrrrrr..'
  ],
  aros: [
    '.aaa...aaa.',
    'a...a.a...a',
    'a...a.a...a',
    'a...a.a...a',
    '.aaa...aaa.',
    '....aaa....',
    '...a...a...',
    '...a...a...',
    '...a...a...',
    '....aaa....'
  ],
  enemigo: [
    '..r...r..',
    '...rrr...',
    '.rrrrrrr.',
    'rr.rrr.rr',
    'rrrrrrrrr',
    'r.r...r.r',
    '..rr.rr..'
  ]
};


const SPRITE_POR_PRODUCTO = {
  1: 'simple', 2: 'doble', 3: 'burgir', 4: 'steak',
  5: 'gaseosa', 6: 'horchata', 7: 'papas', 8: 'aros'
};

function dibujarSprite(nombre, px = 6) {
  const filas = SPRITES[nombre] || SPRITES.simple;
  const ancho = Math.max(...filas.map((f) => f.length));
  const rects = [];
  filas.forEach((fila, y) => {
    const f = fila.padEnd(ancho, '.');
    let x = 0;
    while (x < ancho) {
      const ch = f[x];
      if (ch === '.') { x++; continue; }
      let fin = x;
      while (fin < ancho && f[fin] === ch) fin++;
      rects.push(`<rect x="${x}" y="${y}" width="${fin - x}" height="1" fill="${PALETA[ch] || '#fff'}"/>`);
      x = fin;
    }
  });
  return `<svg class="sprite" viewBox="0 0 ${ancho} ${filas.length}" width="${ancho * px}" height="${filas.length * px}" ` +
    `shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects.join('')}</svg>`;
}


const estado = {
  usuarios: [],
  productos: [],
  pedidos: [],
  carrito: {},          
  usuarioActivo: null,  
  editandoUsuario: null,
  detallesAbiertos: {}  
};

const $ = (sel) => document.querySelector(sel);
const q = (n) => 'Q' + Number(n).toFixed(2);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

function guardarLocal(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (error) { console.log('localStorage no disponible:', error); }
}
function leerLocal(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? porDefecto : JSON.parse(v);
  } catch (error) {
    console.log('localStorage no disponible:', error);
    return porDefecto;
  }
}

let temporizadorMensaje;
function mostrarMensaje(texto, tipo = 'ok') {
  const caja = $('#mensajes');
  caja.innerHTML = `<div class="mensaje ${tipo === 'error' ? 'error' : ''}">${esc(texto)}</div>`;
  clearTimeout(temporizadorMensaje);
  temporizadorMensaje = setTimeout(() => { caja.innerHTML = ''; }, 6000);
}


async function api(ruta, opciones = {}) {
  const config = { headers: { 'Content-Type': 'application/json' }, ...opciones };
  if (config.body && typeof config.body !== 'string') config.body = JSON.stringify(config.body);
  const respuesta = await fetch(API_URL + ruta, config);
  let datos = null;
  try { datos = await respuesta.json(); } catch { /* respuesta sin cuerpo JSON */ }
  if (!respuesta.ok) throw new Error((datos && datos.error) || `Error ${respuesta.status}`);
  return datos;
}

const usuarioActual = () => estado.usuarios.find((u) => u.cod_usuario === estado.usuarioActivo) || null;
const precioDe = (cod) => Number((estado.productos.find((p) => p.cod_producto === Number(cod)) || {}).precio || 0);
const totalCarrito = () => Object.entries(estado.carrito).reduce((t, [cod, cant]) => t + precioDe(cod) * cant, 0);
const itemsCarrito = () => Object.values(estado.carrito).reduce((t, c) => t + c, 0);

/* ---------------- Ventanas (pestañas) ---------------- */
function mostrarVentana(nombre) {
  document.querySelectorAll('.ventana').forEach((v) => v.classList.toggle('activa', v.id === `ventana-${nombre}`));
  document.querySelectorAll('.tab').forEach((t) => t.setAttribute('aria-selected', String(t.dataset.ventana === nombre)));
  guardarLocal('burgir_ventana', nombre);
}

function renderHud() {
  const u = usuarioActual();
  const hud = $('#hud-jugador');
  hud.textContent = u ? u.nombre.toUpperCase() : 'INSERT COIN';
  hud.classList.toggle('parpadeo', !u);
  $('#hud-total').textContent = q(totalCarrito());

  const n = itemsCarrito();
  const badge = $('#badge-carrito');
  badge.textContent = n;
  badge.hidden = n === 0;
}

async function cargarUsuarios() {
  try {
    estado.usuarios = await api('/usuarios');
    if (!usuarioActual()) estado.usuarioActivo = null;
    renderUsuarios();
  } catch (error) {
    console.log('Error en cargarUsuarios:', error);
    mostrarMensaje('No se pudieron cargar los usuarios: ' + error.message, 'error');
  }
}

function renderUsuarios() {
  const cont = $('#lista-usuarios');
  if (!estado.usuarios.length) {
    cont.innerHTML = '<div class="vacio">AÚN NO HAY JUGADORES.<br>¡CREA EL PRIMERO!</div>';
  } else {
    cont.innerHTML = estado.usuarios.map((u) => {
      const activo = u.cod_usuario === estado.usuarioActivo;
      return `
        <article class="tarjeta ${activo ? 'activo' : ''}">
          <h4>${esc(u.nombre)}${activo ? '<span class="etiqueta">P1</span>' : ''}</h4>
          <p>Tel: ${esc(u.telefono)}</p>
          <p>${esc(u.correo)}</p>
          <p>${esc(u.direccion)}</p>
          <div class="fila-botones">
            <button class="btn chico" data-accion="elegir" data-id="${u.cod_usuario}" ${activo ? 'disabled' : ''}>${activo ? 'JUGANDO' : 'ELEGIR'}</button>
            <button class="btn chico fantasma" data-accion="editar" data-id="${u.cod_usuario}">EDITAR</button>
            <button class="btn chico rojo" data-accion="eliminar" data-id="${u.cod_usuario}">ELIMINAR</button>
          </div>
        </article>`;
    }).join('');
  }
  renderHud();
  renderPedidosAviso();
}

function limpiarFormUsuario() {
  $('#form-usuario').reset();
  $('#u-cod').value = '';
  estado.editandoUsuario = null;
  $('#titulo-form-usuario').textContent = 'NUEVO USUARIO';
  $('#btn-guardar-usuario').textContent = '▶ CREAR USUARIO';
  $('#btn-cancelar-edicion').hidden = true;
}

function validarFormUsuario(d) {
  if (!d.nombre) return 'Escribe tu nombre';
  if (!/^\d{8}$/.test(d.telefono)) return 'El teléfono debe tener 8 dígitos';
  if (!/^\S+@\S+\.\S+$/.test(d.correo)) return 'Escribe un correo válido';
  if (!d.direccion) return 'Escribe tu dirección';
  return null;
}

async function guardarUsuario(evento) {
  evento.preventDefault();
  try {
    const datos = {
      nombre: $('#u-nombre').value.trim(),
      telefono: $('#u-telefono').value.trim(),
      correo: $('#u-correo').value.trim(),
      direccion: $('#u-direccion').value.trim()
    };
    const problema = validarFormUsuario(datos);
    if (problema) { mostrarMensaje(problema, 'error'); return; }

    if (estado.editandoUsuario) {
      await api(`/usuarios/${estado.editandoUsuario}`, { method: 'PUT', body: datos });
      mostrarMensaje('JUGADOR ACTUALIZADO');
    } else {
      const nuevo = await api('/usuarios', { method: 'POST', body: datos });
      estado.usuarioActivo = nuevo.cod_usuario;
      guardarLocal('burgir_usuario', nuevo.cod_usuario);
      mostrarMensaje(`BIENVENIDO ${nuevo.nombre.toUpperCase()}! JUGADOR #${nuevo.cod_usuario} LISTO`);
    }
    limpiarFormUsuario();
    await cargarUsuarios();
    const activo = usuarioActual();
    if (activo && !$('#p-direccion').value.trim()) $('#p-direccion').value = activo.direccion;
    await cargarPedidos();
  } catch (error) {
    console.log('Error en guardarUsuario:', error);
    mostrarMensaje(error.message, 'error');
  }
}

function editarUsuario(id) {
  try {
    const u = estado.usuarios.find((x) => x.cod_usuario === id);
    if (!u) throw new Error('Usuario no encontrado');
    estado.editandoUsuario = id;
    $('#u-nombre').value = u.nombre;
    $('#u-telefono').value = u.telefono;
    $('#u-correo').value = u.correo;
    $('#u-direccion').value = u.direccion;
    $('#titulo-form-usuario').textContent = `EDITAR USUARIO #${id}`;
    $('#btn-guardar-usuario').textContent = '▶ GUARDAR CAMBIOS';
    $('#btn-cancelar-edicion').hidden = false;
    $('#u-nombre').focus();
  } catch (error) {
    console.log('Error en editarUsuario:', error);
    mostrarMensaje(error.message, 'error');
  }
}

async function eliminarUsuario(id) {
  try {
    if (!window.confirm('¿Eliminar este usuario?')) return;
    await api(`/usuarios/${id}`, { method: 'DELETE' });
    if (estado.usuarioActivo === id) {
      estado.usuarioActivo = null;
      guardarLocal('burgir_usuario', null);
    }
    if (estado.editandoUsuario === id) limpiarFormUsuario();
    mostrarMensaje('JUGADOR ELIMINADO');
    await cargarUsuarios();
    await cargarPedidos();
  } catch (error) {
    console.log('Error en eliminarUsuario:', error);
    mostrarMensaje(error.message, 'error');
  }
}

async function elegirUsuario(id) {
  try {
    estado.usuarioActivo = id;
    guardarLocal('burgir_usuario', id);
    const u = usuarioActual();
    if (u && !$('#p-direccion').value.trim()) $('#p-direccion').value = u.direccion;
    renderUsuarios();
    await cargarPedidos();
    mostrarMensaje(`JUGADOR 1: ${u ? u.nombre.toUpperCase() : id}`);
  } catch (error) {
    console.log('Error en elegirUsuario:', error);
    mostrarMensaje(error.message, 'error');
  }
}


async function cargarProductos() {
  try {
    estado.productos = await api('/productos');
    // Limpia del carrito productos que ya no existen
    Object.keys(estado.carrito).forEach((cod) => {
      if (!estado.productos.some((p) => p.cod_producto === Number(cod))) delete estado.carrito[cod];
    });
    renderMenu();
    renderCarrito();
  } catch (error) {
    console.log('Error en cargarProductos:', error);
    mostrarMensaje('No se pudo cargar el menú: ' + error.message, 'error');
    $('#grid-menu').innerHTML = '<div class="vacio">NO SE PUDO CARGAR EL MENÚ.<br>¿ESTÁ ENCENDIDO EL SERVIDOR?</div>';
  }
}

function renderMenu() {
  $('#grid-menu').innerHTML = estado.productos.map((p) => {
    const cant = estado.carrito[p.cod_producto] || 0;
    return `
      <article class="producto">
        <span class="codigo">COD ${p.cod_producto}</span>
        <div class="imagen">${dibujarSprite(SPRITE_POR_PRODUCTO[p.cod_producto] || 'simple', 8)}</div>
        <h3>${esc(p.nombre_producto)}</h3>
        <p class="precio">${q(p.precio)}</p>
        <p class="en-carrito">${cant ? `x${cant} EN CARRITO` : ''}</p>
        <button class="btn" data-accion="agregar" data-id="${p.cod_producto}">+ AGREGAR</button>
      </article>`;
  }).join('');
}


function guardarCarrito() { guardarLocal('burgir_carrito', estado.carrito); }

function agregarAlCarrito(cod) {
  const actual = estado.carrito[cod] || 0;
  if (actual >= 99) { mostrarMensaje('Máximo 99 por producto', 'error'); return; }
  estado.carrito[cod] = actual + 1;
  guardarCarrito();
  renderMenu();
  renderCarrito();
}

function cambiarCantidad(cod, delta) {
  const nueva = (estado.carrito[cod] || 0) + delta;
  if (nueva <= 0) delete estado.carrito[cod];
  else estado.carrito[cod] = Math.min(nueva, 99);
  guardarCarrito();
  renderMenu();
  renderCarrito();
}

function vaciarCarrito() {
  estado.carrito = {};
  guardarCarrito();
  renderMenu();
  renderCarrito();
}

function renderCarrito() {
  const cont = $('#carrito-items');
  const entradas = Object.entries(estado.carrito);
  if (!entradas.length) {
    cont.innerHTML = '<div class="vacio">EL CARRITO ESTÁ VACÍO.<br>VE AL MENÚ Y AGREGA ALGO.</div>';
  } else {
    cont.innerHTML = entradas.map(([cod, cant]) => {
      const p = estado.productos.find((x) => x.cod_producto === Number(cod));
      if (!p) return '';
      return `
        <div class="carrito-fila">
          <span class="nombre">${esc(p.nombre_producto)}</span>
          <span class="sub">${q(p.precio * cant)}</span>
          <div class="controles">
            <button type="button" class="btn chico" data-accion="menos" data-id="${cod}" aria-label="Quitar uno">−</button>
            <span class="cant">${cant}</span>
            <button type="button" class="btn chico" data-accion="mas" data-id="${cod}" aria-label="Agregar uno">+</button>
            <button type="button" class="btn chico rojo" data-accion="quitar" data-id="${cod}" aria-label="Quitar del carrito">X</button>
          </div>
        </div>`;
    }).join('');
  }
  $('#carrito-total').textContent = q(totalCarrito());
  $('#btn-confirmar').disabled = !entradas.length;
  renderHud();
}


function renderPedidosAviso() {
  const u = usuarioActual();
  $('#pedidos-aviso').textContent = u
    ? `Jugador activo: ${u.nombre}. Confirma tu carrito o revisa tu historial.`
    : 'INSERT COIN: primero crea o elige un jugador en la ventana 1 para poder pedir.';
}

async function cargarPedidos() {
  try {
    if (!estado.usuarioActivo) {
      estado.pedidos = [];
      estado.detallesAbiertos = {};
      renderPedidos();
      return;
    }
    estado.pedidos = await api(`/pedidos?cod_usuario=${estado.usuarioActivo}`);
    renderPedidos();
  } catch (error) {
    console.log('Error en cargarPedidos:', error);
    mostrarMensaje('No se pudo cargar el historial: ' + error.message, 'error');
  }
}

function fechaLinda(iso) {
  const d = new Date(iso);
  return isNaN(d) ? esc(iso) : d.toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
}

function renderPedidos() {
  const cont = $('#historial');
  if (!estado.usuarioActivo) {
    cont.innerHTML = '<div class="vacio">ELIGE UN JUGADOR PARA VER SU HISTORIAL.</div>';
    return;
  }
  if (!estado.pedidos.length) {
    cont.innerHTML = '<div class="vacio">AÚN NO HAS HECHO PEDIDOS.</div>';
    return;
  }
  cont.innerHTML = estado.pedidos.map((p) => {
    const det = estado.detallesAbiertos[p.cod_pedido];
    const detalleHtml = det
      ? `<div class="detalle"><ul>${det.detalles.map((d) =>
          `<li>${d.cantidad} x ${esc(d.nombre_producto)} (${q(d.precio_unitario)}) = ${q(d.subtotal)}</li>`).join('')}</ul></div>`
      : '';
    return `
      <article class="tarjeta">
        <h4>PEDIDO #${p.cod_pedido} · ${q(p.total)}</h4>
        <p>${fechaLinda(p.fecha_pedido)}</p>
        <p>Envío a: ${esc(p.direccion_envio)}</p>
        ${detalleHtml}
        <div class="fila-botones">
          <button class="btn chico" data-accion="detalle" data-id="${p.cod_pedido}">${det ? 'OCULTAR' : 'VER DETALLE'}</button>
          <button class="btn chico fantasma" data-accion="editar-pedido" data-id="${p.cod_pedido}">CAMBIAR DIRECCIÓN</button>
          <button class="btn chico rojo" data-accion="eliminar-pedido" data-id="${p.cod_pedido}">ELIMINAR</button>
        </div>
      </article>`;
  }).join('');
}

async function confirmarPedido(evento) {
  evento.preventDefault();
  try {
    if (!estado.usuarioActivo) {
      mostrarMensaje('Primero crea o elige un jugador', 'error');
      mostrarVentana('usuario');
      return;
    }
    const items = Object.entries(estado.carrito).map(([cod, cantidad]) => ({ cod_producto: Number(cod), cantidad }));
    if (!items.length) { mostrarMensaje('El carrito está vacío', 'error'); return; }
    const direccion = $('#p-direccion').value.trim();
    if (!direccion) { mostrarMensaje('Escribe la dirección de envío', 'error'); return; }

    const r = await api('/pedidos', {
      method: 'POST',
      body: { cod_usuario: estado.usuarioActivo, direccion_envio: direccion, items }
    });
    vaciarCarrito();
    mostrarMensaje(`PEDIDO #${r.cod_pedido} CONFIRMADO · TOTAL ${q(r.total)} · NIVEL SUPERADO!`);
    await cargarPedidos();
  } catch (error) {
    console.log('Error en confirmarPedido:', error);
    mostrarMensaje(error.message, 'error');
  }
}

async function verDetallePedido(id) {
  try {
    if (estado.detallesAbiertos[id]) {
      delete estado.detallesAbiertos[id];
    } else {
      estado.detallesAbiertos[id] = await api(`/pedidos/${id}`);
    }
    renderPedidos();
  } catch (error) {
    console.log('Error en verDetallePedido:', error);
    mostrarMensaje(error.message, 'error');
  }
}

async function cambiarDireccionPedido(id) {
  try {
    const pedido = estado.pedidos.find((p) => p.cod_pedido === id);
    const nueva = window.prompt('Nueva dirección de envío:', pedido ? pedido.direccion_envio : '');
    if (nueva === null) return; // canceló
    if (!nueva.trim()) throw new Error('La dirección no puede estar vacía');
    await api(`/pedidos/${id}`, { method: 'PUT', body: { direccion_envio: nueva.trim() } });
    mostrarMensaje(`DIRECCIÓN DEL PEDIDO #${id} ACTUALIZADA`);
    delete estado.detallesAbiertos[id];
    await cargarPedidos();
  } catch (error) {
    console.log('Error en cambiarDireccionPedido:', error);
    mostrarMensaje(error.message, 'error');
  }
}

async function eliminarPedido(id) {
  try {
    if (!window.confirm(`¿Eliminar el pedido #${id}?`)) return;
    await api(`/pedidos/${id}`, { method: 'DELETE' });
    delete estado.detallesAbiertos[id];
    mostrarMensaje(`PEDIDO #${id} ELIMINADO`);
    await cargarPedidos();
  } catch (error) {
    console.log('Error en eliminarPedido:', error);
    mostrarMensaje(error.message, 'error');
  }
}


function ligarEventos() {
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => mostrarVentana(t.dataset.ventana)));

  $('#form-usuario').addEventListener('submit', guardarUsuario);
  $('#btn-cancelar-edicion').addEventListener('click', limpiarFormUsuario);
  $('#form-pedido').addEventListener('submit', confirmarPedido);
  $('#btn-vaciar').addEventListener('click', vaciarCarrito);
  $('#u-telefono').addEventListener('input', (e) => { e.target.value = e.target.value.replace(/\D/g, ''); });


  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-accion]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    switch (btn.dataset.accion) {
      case 'elegir': elegirUsuario(id); break;
      case 'editar': editarUsuario(id); break;
      case 'eliminar': eliminarUsuario(id); break;
      case 'agregar': agregarAlCarrito(id); break;
      case 'mas': cambiarCantidad(id, 1); break;
      case 'menos': cambiarCantidad(id, -1); break;
      case 'quitar': cambiarCantidad(id, -99); break;
      case 'detalle': verDetallePedido(id); break;
      case 'editar-pedido': cambiarDireccionPedido(id); break;
      case 'eliminar-pedido': eliminarPedido(id); break;
      default: break;
    }
  });
}

async function iniciar() {
  try {
    document.querySelectorAll('[data-sprite]').forEach((el) => {
      el.innerHTML = dibujarSprite(el.dataset.sprite, Number(el.dataset.px) || 4);
    });

    const carritoGuardado = leerLocal('burgir_carrito', {});
    estado.carrito = carritoGuardado && typeof carritoGuardado === 'object' ? carritoGuardado : {};
    estado.usuarioActivo = leerLocal('burgir_usuario', null);

    ligarEventos();
    renderCarrito();
    renderPedidos();
    renderPedidosAviso();

    await cargarProductos();
    await cargarUsuarios();
    const u = usuarioActual();
    if (u) $('#p-direccion').value = u.direccion;
    await cargarPedidos();

    const ventana = leerLocal('burgir_ventana', 'usuario');
    mostrarVentana(['usuario', 'menu', 'pedidos'].includes(ventana) ? ventana : 'usuario');
  } catch (error) {
    console.log('Error en iniciar:', error);
    mostrarMensaje('Error al iniciar la página: ' + error.message, 'error');
  }
}

document.addEventListener('DOMContentLoaded', iniciar);
