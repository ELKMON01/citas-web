## Plan: Completar S4 Y Cerrar MVP

TL;DR: La auditoría de `GUIA_SESIONES_S2_S6.md` confirma identidad completa, agenda S3 parcialmente funcional y doble reserva verificada, pero S4 no está cerrado. El siguiente incremento priorizará funcionalidad MVP en el alcance aprobado por el usuario: HU-025/026, HU-027/028, HU-029/030 y HU-032/033. Se hará primero un checkpoint breve de contrato y evidencia, luego backend por dependencias, frontend cross-repo, loops Builder/Verifier y cierre trazable.

**Estado verificado**
- S2: identidad, login/refresh/logout, Flyway/MySQL y frontend auth funcionan; faltan commits por sesión, `develop`, evidencia reproducible y la separación hexagonal completa.
- S3: oferta, disponibilidad, reserva general/especializada y doble reserva tienen código; faltan pruebas REST/cobertura de CA, hooks FAIL/PASS y evidencia Red -> Green.
- S4: no existen endpoints ni pruebas de lifecycle, logs Builder/Verifier ni matriz de cierre MVP.
- La suite observable actual queda verde: backend 13 tests, frontend 10 tests, frontend lint/build correctos; los estados Scrum y la wiki aún no reflejan todo el código.

**Decisiones de alcance**
- Prioridad: funcionalidad MVP.
- HU aprobadas para el siguiente corte: HU-025/026, HU-027/028, HU-029/030, HU-032/033.
- Fuera de este corte: HU-008/009 recuperación de contraseña, CRUD ADMIN de EPS/planes, perfil de afiliación y S5/S6 n8n/MCP.
- No inventar contratos: las rutas de lifecycle, roles de lectura de auditoría y la condición operativa de “cita aplicable” deben aprobarse/documentarse antes de editar consumidores.
- Preservar cambios locales existentes y no fabricar commits/evidencia histórica de S2; comenzar trazabilidad comprobable desde el próximo commit en `develop`.

**Pasos**

### Fase 0 — Baseline y decisiones (*bloquea la implementación*)
1. En ambos repos revisar `git status --short`, `git branch -avv`, `git log --all --decorate --date=iso` y confirmar cambios locales; crear/usar `develop` solo después de preservar el estado actual.
2. Aprobar formalmente las HU seleccionadas y actualizar sus tablas de evidencia/DoD cuando cada criterio tenga prueba; mantener HU-008/009 fuera del corte.
3. Definir en `contracts.md` los endpoints, payloads, respuestas, filtros, permisos y errores para mis citas, cancelación, reprogramación, agenda profesional, cierre y auditoría. Resolver explícitamente: “aplicable” en HU-030 y roles autorizados en HU-032.
4. Instalar hooks versionados con `scripts/install-hooks.ps1` en ambos repos y verificar `core.hooksPath`; documentar una ejecución FAIL con secreto ficticio temporal, eliminarlo, y una ejecución PASS legítima.
5. Crear la estructura de evidencia S4 y registrar branch, commit, HU, CA/DoD, comandos, resultados y pendientes. Esta fase puede ejecutarse en paralelo con el diseño técnico, pero bloquea cambios de contrato.

### Fase 1 — Modelo y backend lifecycle
6. *Depende de Fase 0.* Diseñar una migración posterior a V2, previsiblemente `V3__appointment_lifecycle.sql`, para solicitudes de reprogramación, catálogo de estados `PENDING/APPROVED/REJECTED`, relación de retención de nuevos slots, índices y exclusión de doble asignación. Mantener la cita original y sus slots intactos mientras una solicitud está `PENDING`.
7. Extender `SchedulingService` con una consulta de mis citas propia y filtros estado/fecha, detalle con ownership, cancelación transaccional y helper central para registrar cada transición en `appointment_status_history`.
8. Implementar solicitud de reprogramación: solo cita propia futura `APPROVED`, mismo profesional/especialidad, nueva franja completa, retención de slots y preservación de la franja original. Resolver con bloqueo transaccional y conflicto `409` si la nueva franja deja de estar disponible.
9. Implementar decisión ADMIN de reprogramación: `APPROVE` libera slots antiguos y confirma nuevos; `REJECT` libera solo la retención nueva y conserva la cita original; ambas rutas deben auditar motivo, actor, fuente y fecha.
10. Implementar agenda PROFESSIONAL filtrada por profesional autenticado, estado `APPROVED`, periodo día/semana/sede y campos mínimos sin PII ajena. Implementar cierre `COMPLETED/NO_SHOW` únicamente para citas propias y aplicables según la decisión aprobada.
11. Implementar consulta autorizada de auditoría como lectura inmutable: USER sobre sus citas, PROFESSIONAL sobre sus citas operables y ADMIN según el contrato aprobado. No añadir CRUD de auditoría.
12. Añadir rutas/DTOs y autorización en `SchedulingController`; mantener reglas en aplicación y acceso SQL en adaptadores/puertos según la arquitectura existente.

### Fase 2 — Pruebas backend y Red -> Green
13. *Paralelo por slices después de la migración:* ampliar `SchedulingServiceIntegrationTest` con CA-01..CA-03 de HU-025/026, reprogramación aprobada/rechazada/concurrente, agenda/ownership, cierre y auditoría.
14. Añadir pruebas REST de `400/401/403/404/409`, ownership, roles USER/PROFESSIONAL/ADMIN, estado original preservado y liberación exacta de slots.
15. Ejecutar primero la prueba roja de reprogramación o cancelación inválida, registrar el fallo, implementar el cambio, repetir hasta PASS con el presupuesto del loop y guardar cada iteración.
16. Ejecutar en Docker `mvn test`, además de las pruebas focalizadas, y conservar resumen de clases, conteo, contenedores y resultado en evidencia S4.

### Fase 3 — Cliente web cross-repo
17. Extender `citas-web/src/types.ts` con citas filtrables, solicitudes de reprogramación, decisiones, agenda, cierre e historial.
18. Extender `citas-web/src/api/schedulingApi.ts` con los contratos aprobados, mapeo uniforme de `400/401/403/404/409` y sin estado de servidor en localStorage.
19. Añadir componentes/pantallas de mis citas, detalle/cancelación, solicitud y resultado de reprogramación, agenda profesional, cierre y auditoría; actualizar navegación/guardas en `App.tsx` y `DashboardScreen.tsx` respetando el diseño importado.
20. Cubrir loading, empty, error, success, disabled y acceso denegado por rol. No mostrar datos simulados, historia clínica ni acciones fuera del contrato.
21. Añadir tests Vitest de cliente, formularios, filtros, errores `409/403`, estados `APPROVED/REQUESTED/PENDING/REJECTED/CANCELLED/COMPLETED/NO_SHOW` y navegación por rol. Validar contra API real cuando el backend esté levantado.

### Fase 4 — Loops Builder/Verifier y evidencia
22. Ejecutar y registrar LOOP_01 sobre doble reserva con el verificador separado; conservar la evidencia ya verde sin presentarla como un log histórico inexistente.
23. Ejecutar LOOP_02 sobre reprogramación, máximo 4 iteraciones, con Builder modificando solo el alcance aprobado y Verifier sin editar; PASS solo con todos los CA y pruebas backend/frontend.
24. Diseñar y ejecutar LOOP_03 como reto independiente acotado, preferiblemente reconciliación de errores de contrato frontend/backend o cobertura de reglas de agenda; incluir disparador, objetivo, estado persistente, presupuesto, stop condition, escalamiento y log.
25. Guardar un log Markdown/JSON por iteración con Builder, Verifier, pruebas, resultado `PASS/FAIL/BLOCKED` y causa; detener después del presupuesto definido.
26. Actualizar `citas-api/docs/FCV Dev/llm-wiki/wiki/traceability.md`, añadir entradas append-only a `wiki/log.md`, actualizar contratos y completar la evidencia de cada HU sin declarar DoD antes de tener pruebas.

### Fase 5 — Cierre S4
27. Ejecutar desde Docker backend `mvn test`; desde `citas-web`, `npm run lint`, `npm test` y `npm run build`; validar manualmente el flujo cross-repo USER, PROFESSIONAL y ADMIN.
28. Ejecutar hooks FAIL/PASS nuevamente sobre un cambio temporal seguro y registrar salida, sin versionar secretos.
29. Crear commits trazables de S4 en `develop` de cada repositorio, documentar hashes y pendientes, y solo proponer merge a `main` si el usuario considera estable el incremento.
30. Emitir la matriz final S2-S4: PASS, PARCIAL, FAIL o BLOQUEADO por requisito de `GUIA_SESIONES_S2_S6.md`, con evidencia enlazada y riesgos residuales.

**Archivos relevantes**
- `GUIA_SESIONES_S2_S6.md` — criterios de S2-S4 y evidencia mínima.
- `EVIDENCIAS_Y_TRAZABILIDAD.md` — formato de evidencia por sesión.
- `citas-api/docs/FCV Dev/scrum/README.md` — aprobación y dependencias Scrum.
- `citas-api/docs/FCV Dev/scrum/historias-de-usuario/HU-025-consultar-mis-citas.md` — consulta, filtros y ownership.
- `citas-api/docs/FCV Dev/scrum/historias-de-usuario/HU-026-cancelar-cita.md` — cancelación, slots e historial.
- `citas-api/docs/FCV Dev/scrum/historias-de-usuario/HU-027-solicitar-reprogramacion.md` — retención y preservación original.
- `citas-api/docs/FCV Dev/scrum/historias-de-usuario/HU-028-resolver-reprogramacion.md` — decisión ADMIN y operación atómica.
- `citas-api/docs/FCV Dev/scrum/historias-de-usuario/HU-029-consultar-agenda-profesional.md` — agenda y privacidad.
- `citas-api/docs/FCV Dev/scrum/historias-de-usuario/HU-030-cerrar-atencion.md` — `COMPLETED/NO_SHOW` y definición de aplicabilidad.
- `citas-api/docs/FCV Dev/scrum/historias-de-usuario/HU-032-consultar-auditoria-de-estados.md` — auditoría e inmutabilidad.
- `citas-api/docs/FCV Dev/scrum/historias-de-usuario/HU-033-integrar-cliente-web-con-api.md` — pantallas y REST directo.
- `citas-api/src/main/java/co/com/fcv/training/citas/application/SchedulingService.java` — reglas transaccionales de citas y futura lifecycle.
- `citas-api/src/main/java/co/com/fcv/training/citas/adapter/web/SchedulingController.java` — DTOs, rutas y autorización REST.
- `citas-api/src/main/resources/db/migration/V2__scheduling_core.sql` — modelo actual de citas, slots e historial; no modificar migraciones aplicadas.
- `citas-api/src/test/java/co/com/fcv/training/citas/SchedulingServiceIntegrationTest.java` — patrón existente para Testcontainers y concurrencia.
- `citas-web/src/api/schedulingApi.ts`, `citas-web/src/types.ts`, `citas-web/src/App.tsx`, `citas-web/src/components/DashboardScreen.tsx` — cliente, tipos, navegación y vistas.
- `prompts/goal-loop/LOOP_01_GUIADO_SIMPLE.md`, `LOOP_02_GUIADO_AVANZADO.md`, `LOOP_03_RETO_INDEPENDIENTE.md` — reglas de ejecución y stop conditions.

**Verificación**
1. Confirmar cada HU aprobada y contrato antes de implementar.
2. Ejecutar pruebas backend focalizadas con Docker/Testcontainers y luego `mvn test`; exigir cero fallos.
3. Ejecutar `npm run lint`, `npm test` y `npm run build` en cada cambio frontend relevante.
4. Probar manualmente ownership, roles, filtros, transiciones y slots contra API/MySQL real.
5. Registrar Red -> Green, hooks FAIL/PASS, loops Builder/Verifier, hashes y resultados en Markdown/JSON.
6. Cerrar solo cuando cada CA/DoD aprobado tenga evidencia y la matriz S2-S4 no contenga afirmaciones sin comando o artefacto verificable.

**Riesgos y bloqueos explícitos**
- HU-030 no puede cerrarse hasta definir “cita aplicable”.
- HU-032 no puede cerrarse hasta aprobar roles de lectura.
- Las rutas de lifecycle requieren decisión cross-repo antes de modificar backend/frontend.
- No existe evidencia histórica de commits S2/S3 en `develop`; se documentará la brecha, no se reconstruirá artificialmente.
- El estado Scrum global sigue `Pendiente de aprobación`; debe actualizarse solo después de aprobación y evidencia, no como efecto incidental de código.
