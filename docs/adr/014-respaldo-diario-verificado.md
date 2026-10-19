# Respaldo diario verificado

Fecha: 19/10/2026. La copia lógica de Sky Import se valida restaurándola en
PostgreSQL local aislado antes de conservar una réplica externa privada.

## Decisión

Usar una automatización diaria de Codex en esta PC, con las sesiones de Chrome
del titular para Supabase y Google Drive. La consulta de
`scripts/backup-snapshot.sql` es de lectura y captura las tablas de negocio,
registros de cuentas, esquema público e historial de migraciones en una sola
sentencia. No se agregan credenciales al repositorio ni una función pública
para exportar datos de Auth.

La réplica externa debe quedar en el Drive de Ciendel, en la carpeta
«Sky Import - Respaldos privados», con acceso general Restringido y únicamente
el propietario. Cada ejecución conserva un archivo fechado; no sustituye ni
elimina copias anteriores. Los datos de clientes y Auth nunca se adjuntan a la
documentación académica ni a artefactos públicos de CI.

## Procedimiento de ejecución

1. Trabajar desde `C:\Code\SkyImport`, con Node.js 24.19.0. Confirmar en Chrome
   el proyecto Supabase `bhlkdinovdhtwxkkujic` y la cuenta de Drive
   `ciendel.dev@gmail.com`. El conector de Drive puede apuntar a otra cuenta:
   no usarlo sin comprobar el propietario.
2. Crear una carpeta nueva con fecha UTC bajo
   `%LOCALAPPDATA%\SkyImport\backups`, fuera del repositorio. Restringir sus
   permisos al usuario actual, SYSTEM y Administradores antes de guardar datos.
3. Ejecutar el SQL de lectura en el editor del proyecto correcto. En Monaco,
   seleccionar todo antes de reemplazar el contenido. Leer la celda JSON a una
   variable y guardarla como `snapshot.json` sin imprimirla en el chat o logs.
   Comprobar formato, proyecto y fecha. Limpiar el resultado visible con una
   consulta inocua al terminar.
4. Ejecutar `node scripts/verificar-respaldo.mjs RUTA_PRIVADA`. El verificador
   utiliza `embedded-postgres` y `pg` instalados en `tmp/pg-review`, enlaza solo
   a `127.0.0.1:55441` y nunca acepta una base remota. Si falta ese entorno,
   reinstalar las versiones de su lockfile antes de continuar.
5. Exigir código de salida cero y `verification.json` reciente. Se comparan
   todos los registros restaurados, políticas y presencia de la migración
   vigente. Si aparecen tablas sin datos o archivos en Storage, detener la
   publicación de la copia y ampliar su alcance antes de declarar éxito.
6. Comprimir únicamente `snapshot.json`, `restore-public-and-auth-records.sql`,
   `verification.json`, `sha256.json`, `backup-snapshot.sql` y
   `verificar-respaldo.mjs`, con nombre `SkyImport-FECHAUTC.zip`. Registrar
   tamaño y SHA-256. Nunca comprimir directorios de PostgreSQL temporales.
7. Verificar los permisos de la carpeta de Drive antes de subir el ZIP. Esperar
   la confirmación de carga y comprobar nombre y tamaño; conservar evidencia
   local de la carga y sus permisos. Registrar el resultado fuera de Git.

## Condiciones y límites

La ejecución depende de esta PC encendida, Codex abierto, Chrome conectado y
las sesiones vigentes. La extensión necesita permiso para subir archivos
locales. Una sesión vencida, un cambio de permisos o un fallo de restauración
debe dejar la ejecución como fallida y conservar la última copia válida.

El respaldo recupera datos y estructuras de la aplicación; no reproduce por
sí solo todos los servicios de Supabase. Excluye sesiones de Auth, tokens de
renovación, MFA, proveedores y secretos del despliegue. Storage tenía cero
objetos el 19/10/2026. El SQL generado es para una base vacía de ensayo:
una recuperación real requiere Supabase configurado y pruebas de acceso y web.

La restauración del 19/10/2026 recuperó 11 tablas con registros idénticos y
17 políticas RLS. La periodicidad y la carga externa se acreditan con el
estado de la automatización y los archivos fechados del destino, no solo con
la existencia de este procedimiento.

Referencia: [automatizaciones de Codex](https://learn.chatgpt.com/docs/automations?surface=app).
