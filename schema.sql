DROP DATABASE IF EXISTS burgir;

CREATE DATABASE burgir
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE burgir;

CREATE TABLE usuarios (
  cod_usuario INT          NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100) NOT NULL,
  telefono    INT          NOT NULL,
  correo      VARCHAR(150) NOT NULL,
  direccion   VARCHAR(255) NOT NULL,
  PRIMARY KEY (cod_usuario)
) ENGINE=InnoDB;


CREATE TABLE productos (
  cod_producto    INT           NOT NULL,
  nombre_producto VARCHAR(100)  NOT NULL,
  precio          DECIMAL(10,2) NOT NULL CHECK (precio >= 0),
  PRIMARY KEY (cod_producto)
) ENGINE=InnoDB;


CREATE TABLE pedidos (
  cod_pedido      INT           NOT NULL AUTO_INCREMENT,
  cod_usuario     INT           NOT NULL,
  fecha_pedido    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  direccion_envio VARCHAR(255)  NOT NULL,
  total           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (cod_pedido),
  CONSTRAINT fk_pedidos_usuario
    FOREIGN KEY (cod_usuario) REFERENCES usuarios (cod_usuario)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_pedidos_usuario (cod_usuario)
) ENGINE=InnoDB;


CREATE TABLE detalles_pedido (
  cod_detalles    INT           NOT NULL AUTO_INCREMENT,
  cod_pedido      INT           NOT NULL,
  cod_producto    INT           NOT NULL,
  cantidad        INT           NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (cod_detalles),
  CONSTRAINT fk_detalles_pedido
    FOREIGN KEY (cod_pedido) REFERENCES pedidos (cod_pedido)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_detalles_producto
    FOREIGN KEY (cod_producto) REFERENCES productos (cod_producto)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  INDEX idx_detalles_pedido (cod_pedido)
) ENGINE=InnoDB;


INSERT INTO productos (cod_producto, nombre_producto, precio) VALUES
  (1, 'HAMBURGUESA SIMPLE',           45.00),
  (2, 'HAMBURGUESA DOBLE',            55.00),
  (3, 'HAMBURGUESA BURGIR',           65.00),
  (4, 'HAMBURGUESA STEAK HOUSE ÑAM',  95.00),
  (5, 'GASEOSA',                      10.00),
  (6, 'HORCHATA',                      7.00),
  (7, 'PAPAS FRITAS',                 15.00),
  (8, 'AROS DE CEBOLLA',              15.00);
