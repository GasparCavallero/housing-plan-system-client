CREATE TABLE IF NOT EXISTS users (
	id INT AUTO_INCREMENT PRIMARY KEY,
	username VARCHAR(100) NOT NULL UNIQUE,
	hashed_password VARCHAR(255) NOT NULL,
	role ENUM('admin', 'operador', 'lectura') NOT NULL DEFAULT 'operador',
	is_active BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
	id INT AUTO_INCREMENT PRIMARY KEY,
	user_id INT NOT NULL,
	token_hash VARCHAR(64) NOT NULL UNIQUE,
	expires_at TIMESTAMP NOT NULL,
	revoked BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS plan_configuracion (
	id INT PRIMARY KEY,
	cantidad_cuotas INT NOT NULL,
	cantidad_de_adherentes INT NOT NULL,
	metros_cuadrados_vivienda DOUBLE NOT NULL,
	valor_por_m2 DOUBLE NOT NULL,
	duracion_construccion_meses INT NOT NULL,
	tipo_cambio DOUBLE NOT NULL
);

CREATE TABLE IF NOT EXISTS plan_estado (
	id INT PRIMARY KEY,
	mes_actual INT NOT NULL DEFAULT 0,
	fondo_ars DOUBLE NOT NULL DEFAULT 0,
	casas_iniciadas INT NOT NULL DEFAULT 0,
	casas_entregadas INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS adherentes (
	id INT AUTO_INCREMENT PRIMARY KEY,
	nombre VARCHAR(100) NOT NULL,
	estado VARCHAR(30) NOT NULL DEFAULT 'activo',
	cuotas_pagadas INT NOT NULL DEFAULT 0,
	cuotas_bonificadas_por_licitacion INT NOT NULL DEFAULT 0,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pagos (
	id INT AUTO_INCREMENT PRIMARY KEY,
	adherente_id INT NOT NULL,
	monto_ars DOUBLE NOT NULL,
	mes INT NOT NULL,
	fecha TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_pagos_adherente FOREIGN KEY (adherente_id) REFERENCES adherentes(id)
);

CREATE TABLE IF NOT EXISTS viviendas_en_construccion (
	id INT AUTO_INCREMENT PRIMARY KEY,
	adherente_id INT NOT NULL,
	mes_inicio INT NOT NULL,
	mes_fin INT NOT NULL,
	metodo VARCHAR(20) NOT NULL,
	CONSTRAINT fk_viviendas_adherente FOREIGN KEY (adherente_id) REFERENCES adherentes(id)
);
