-- RN-AUTH-05 / AC-AUTH-03-2: identificador de sesión por usuario.
-- Se incrementa al cerrar sesión y viaja en el par de tokens; un token emitido con un
-- valor anterior deja de servir, sin necesidad de almacenar los tokens emitidos.
ALTER TABLE `users` ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;
