# Revisión de historias HU-11 a HU-24 vs sistema (22-jun) · SIGECOP

> **Encargo (Maiki, Bloque 2):** revisar cada historia HU-11..24 contra lo que el sistema **realmente hace** (leyendo el código): tecnicismos, menciones meta/internas, bloques "Criterios adoptados", pantallas ambiguas, texto desfasado, y match **criterio por criterio** (✅ / ⚠️ desfasado / ❓ ambiguo). Posibles bugs **se reportan aparte, no se arreglan**. **NO se cambió nada.**
> **Método:** 14 agentes, uno por historia, leyendo la historia + el controller/página + plan de pruebas + audios + ley. Stack arriba (consultas solo-lectura).
> **Resultado global:** las historias **hacen match en lo esencial**; lo que falla son **detalles de redacción** (cada una arrastra jerga + un bloque "Criterios adoptados") y un puñado de **desfases historia↔sistema** y **posibles bugs** que listo abajo.

## A) Posibles bugs detectados (reportados, NO arreglados)

| HU | Posible bug | Sev. | Evidencia |
|---|---|---|---|
| HU-11 | Backend no exige `lugar`/`participantes` (minuta) ni `responsable`/`proposito` (visita): solo valida `titulo`+`fecha` / `fecha_programada`. La obligatoriedad del resto vive **solo en el frontend** → una llamada directa al API guarda incompleto. | 🟡 | `minutas.controller.js:61-62, :160` |
| HU-12 | Backend **no valida que las notas vinculadas estén FIRMADAS** (solo que pertenezcan al contrato); el filtro "firmada/sin-apertura" es client-side → por API se puede vincular una nota no firmada. | 🟡 | `estimaciones.controller.js:204-218` vs `IntegracionEstimacion.jsx:722-725` |
| HU-14 | La columna y el panel rotulan **"Fecha de presentación"** pero muestran `integrada_en` (fecha de captura), no `enviada_en` (presentación real, que sí existe en el payload). Dato incorrecto bajo esa etiqueta. | 🟡 | `HistorialEstimaciones.jsx:157, :319, :100` |
| HU-17 | CA-5 dice "a Finanzas el sistema le oculta la pantalla", pero la ocultación es **solo frontend**; el endpoint `GET /api/tablero/estimaciones` no bloquea a finanzas (`ROLES_VEN_TODO` lo incluye) → por API ve toda la cartera. | 🟡 | `lib/acceso.js:16,29` · `tablero.routes.js` sin `requireRole` |
| HU-18 | El agrupador **"Tipo de contratación" sale deshabilitado** (no existe esa columna en el esquema); el criterio 4 lo promete como agrupador funcional. | 🟡 | `PortafolioEjecutivo.jsx:197` |
| HU-20 | El semáforo del plazo (art. 54) se ancla **solo en la nota de autorización** y **no considera la presentación de la factura**, que el art. 54 exige como segundo gatillo del plazo de 20 días → puede contar días vencidos antes de que exista factura. | 🟡 | `instruccion-pago.controller.js:144-153` |
| HU-22 | La **sustitución difiere la nota** si no hay bitácora abierta — **mismo patrón que el profe rechazó** para convenio/avance (P23). El profe NO la nombró → **[validar]**, pero por consistencia debería exigir bitácora. | 🟡 | `roster.controller.js:196-225` |
| HU-23 | **Toda empresa auto-creada al registrarse nace tipo `'contratista'`**, aunque la registre una supervisión (el registro llama `resolverOCrearEmpresa` sin pasar `tipo` → default). Desfasa el criterio 6 ("clasifica por tipo"); no hay acción de recategorizar en el padrón. | 🟡 | `auth.controller.js:103` + `empresas.controller.js:58-61` |
| HU-13 | *(Defecto de presentación, no de lógica)* la pantalla imprime literal **"Revisión (HU-15): día X de 15…"** → expone el código interno de historia al usuario. | 🟡 | `EnvioEstimacion.jsx:284-285` |
| HU-12 / 14 / 17 / 18 / 20 / 24 | Varios 🟢 menores (fotos diferidas al Expediente, `por_contrato` calculado-no-mostrado, semáforo sin sellos autorizada/pagada, gating de rol front-vs-back en finiquito) — ver fichas. | 🟢 | — |

> **Los 🟡 son los que conviene decidir.** Ninguno corrompe dinero/cuadre; son brechas de enforcement server-side, desfases historia↔sistema o de UX. **No los arreglé** (Maiki decide).

## B) Citas legales a VERIFICAR (señaladas, NO cambiadas)

| HU | Cita en la historia | A verificar |
|---|---|---|
| HU-12 | pena por atraso "86-88 + tope 90" | el código cita "86-90"; confirmar el rango exacto de fracciones RLOPSRM |
| HU-14 | "ficha vieja: art. 130 (tipos) y 138 (versionado)" | referencia de ficha vieja; confirmar o quitar (HU-14 ya no cita artículo) |
| HU-19 | art. 191 LFD (5 al millar) | **✅ verificado correcto** (LFD p.125); ojo: 191 del RLOPSRM es `Fsr`, distinto |
| HU-21 | "art. 118 RLOPSRM citado en la pantalla" | **la pantalla NO cita el art. 118** (cita 54-55 LOPSRM / 127-128 RLOPSRM / 191 LFD) → corregir la historia o agregar la cita a la pantalla |
| HU-23 | art. 43 RLOPSRM / 74 Bis LOPSRM | **✅ correctas**; glosa "proveedores y contratistas" vs "personas físicas y morales" (74 Bis) — matiz menor |
| HU-24 | desglose arts. 168-172 RLOPSRM | confirmar el reparto fino artículo→contenido contra el texto literal |
| **HU-09** | "tipos del art. 125" (criterio 1) | **✅ CORRECTO — ver Bloque 4** (art. 125 ES el catálogo de tipos por rol; el profe leyó mal "123"). No cambiar. |

---

## Fichas por historia

### HU-11 · Minutas, visitas y acuerdos — **funcional, 3/5 ✅ + 2 ⚠️**
- **Match:** C1 ✅, C2 ⚠️ (la historia dice PDF **obligatorio** y "resaltado verde"; en el sistema el PDF es **opcional** y no hay resaltado), C3 ⚠️ (responsable = **texto libre**, no de la sesión; estado se muestra **"Programada"** no "Agendada"), C4 ✅, C5 ✅.
- **Redacción:** tecnicismos "folio correlativo", "tipificadas"; meta "Estado: Funcional (sesión E2 18-jun)… antes era maqueta", "(error detectado y corregido en esta sesión)". **Tiene bloque Criterios adoptados.**
- **Posibles bugs:** validación de campos solo-frontend (🟡); desacuerdo PDF obligatorio↔opcional (🟡).

### HU-12 · Integración de la estimación — **5 criterios, 4 ✅ + 1 ⚠️**
- **Match:** CA-1..CA-4 ✅ (carátula server-side sin IVA, topes art. 118 + plan, número seguro, periodo ≤1 mes art. 54). **CA-5 ⚠️ desfasado:** la historia dice que al integrar se guardan **las fotos**, pero las fotos están **diferidas al Expediente (HU-04)**; y el backend **no exige que las notas estén firmadas**.
- **Redacción:** mucha jerga ("correlativo", "de forma segura", "previsualiza en vivo"), meta de wizard/FASE 3/"no es cascarón". Pantalla ambigua → "Integración del periodo" (`/estimaciones/integracion`). **Bloque Criterios adoptados** grande (B2/B7/A3/A7). Cita 86-88 vs 86-90 a verificar.
- **Posibles bugs:** notas no validadas firmadas en backend (🟡); fotos al integrar (🟢, arreglar **texto**).

### HU-13 · Envío / presentación — **5/5 ✅**
- **Match:** los 5 criterios ✅ (sella fecha/hora+autor del JWT, "Integrada"→"Presentada", acuse, semáforo 15 días, plazo 6 días = solo aviso). Citas art. 54 correctas.
- **Redacción:** expone **"HU-15"** al usuario (en el texto **y en la pantalla real**), meta "ficha vieja", "se degradó de candado a aviso". **Bloque Criterios adoptados.**
- **Posibles bugs:** ninguno (defecto de presentación: el "HU-15" impreso en pantalla).

### HU-14 · Historial de estimaciones — **3 ✅ + 2 ⚠️**
- **Match:** CA-2/CA-4/CA-5 ✅; **CA-1 y CA-3 ⚠️:** "Fecha de presentación" muestra `integrada_en`, no `enviada_en`.
- **Redacción:** jerga "el modelo no versiona", nombres de columnas (`autorizada_en`/`pagada_en`/"tabla de transiciones"), "Falta cablearlas". **Bloque Criterios adoptados.**
- **Posibles bugs:** fecha de presentación incorrecta (🟡); UI "expediente completo" vs panel resumen (🟢).

### HU-15 · Recepción, revisión técnica y autorización — **5/5 ✅**
- **Match:** los 5 ✅ (supervisión observa/elimina las suyas/turna; residencia autoriza/rechaza con motivo solo tras turnar; semáforo 15 días; TOCTOU cerrado). Citas correctas.
- **Redacción:** notación de máquina de estados ("estado → Autorizada"), pantallas ambiguas (Revisión `/estimaciones/revision`; semáforo). **Bloque Criterios adoptados** (cortes 7/12 sin base legal, observaciones por sección).
- **Posibles bugs:** ninguno.

### HU-16 · Reingreso tras rechazo — **5/5 ✅**
- **Match:** los 5 ✅ (nueva "Integrada" copia carátula+generadores, ligada por `reemplaza_a`, 1→1 por UNIQUE+lock, no reinicia art. 54, solo superintendente).
- **Redacción:** "bloque completo independiente", "de una sola vez"; **[PARA MAIKI]** filtrado al texto; pantalla ambigua (Reingreso `/estimaciones/reingreso`; el contrato **se hereda**, no se selecciona). **Bloque Criterios adoptados** (A18/B9/B10).
- **Posibles bugs:** ninguno.

### HU-17 · Tablero de estimaciones — **4 ✅ + 1 ❓**
- **Match:** CA-1..CA-4 ✅ (excluye rechazadas del grid pero las cuenta; stepper 4 fases; agregados server-side; "Mis pendientes" por rol del JWT). **CA-5 ❓ ambiguo:** la ocultación a Finanzas es **solo UI**.
- **Redacción:** referencias cruzadas HU-13/15/21, "cuadrado", "ficha vieja", "✅ Corregido (hecho desactualizado)". **Bloque Criterios adoptados.**
- **Posibles bugs:** Finanzas no bloqueada en API (🟡); `por_contrato` calculado pero no mostrado (🟢).

### HU-18 · Portafolio ejecutivo — **4 ✅ + 1 ⚠️**
- **Match:** 1,2,3,5 ✅ (semáforo server-side, contadores, panel detalle, variación vs mes anterior). **C4 ⚠️:** "Tipo de contratación" **deshabilitado**.
- **Redacción:** **filtra el algoritmo de puntaje** (0/1/2; cortes 1/2-3/4) y "calculado en el servidor" — jerga; `texto_desfasado`: "atrasos… se simula con número fijo" (ya **no** es fijo, calcula días vencidos reales); nombre de archivo `lib/umbrales-semaforo.js` en la historia; "criterio del equipo (B6)". **Bloque Criterios adoptados** (6 viñetas).
- **Posibles bugs:** agrupador "Tipo de contratación" inutilizable (🟡); semáforo sin sellos autorizada/pagada (🟢).

### HU-19 · Exportación de 7 reportes — **5/5 ✅**
- **Match:** los 5 ✅ (7 reportes client-side, reporte 4 ya exporta, periodo solo acota, solo residente 'E', reporte 5 condicionado a bitácora). art. 191 LFD verificado.
- **Redacción:** meta "antes estaba deshabilitado… esa fuente ya existe", "default conservador". **Bloque Criterios adoptados.** *(Nota: el comentario de cabecera de `reportesContrato.js:11` aún rotula el reporte 4 como "DESHABILITADO" — desfase en el código, no en la historia.)*
- **Posibles bugs:** ninguno.

### HU-20 · Tránsito a pago — **5 ✅ + 1 ❓**
- **Match:** CA-1, CA-3..CA-6 ✅ (suficiencia art. 24 con FOR UPDATE, soportes obligatorios, no-doble-instrucción, gate de finiquito art. 64, acceso por rol). **CA-2 ❓:** el semáforo no considera la factura (art. 54 doble gatillo).
- **Redacción:** **[PARA MAIKI]** bloque entero, `texto_desfasado` ("enlace por nombre" — ya es FK `dependencia_id`), jerga "snapshot/redondeo al centavo/FK/dato legado". **Bloque Criterios adoptados.**
- **Posibles bugs:** semáforo no usa la factura (🟡); semáforo deshabilitado sin nota de autorización (🟢).

### HU-21 · Registro del pago — **8/8 ✅**
- **Match:** los 8 ✅ (→"Pagada", importe=neto read-only, no-doble-pago triple defensa, solo 'autorizada' art. 54, fecha≥integración, campos obligatorios, inmutable por trigger, lectura acotada + indicador 20 días).
- **Redacción:** "inmutable", pantalla ambigua (Registro del pago `/pagos/registro`). **`cita_legal` desfasada:** la historia dice "art. 118 citado en la pantalla" — **la pantalla NO lo cita**. `texto_desfasado`: "la fecha de autorización es provisional (pasará a HU-20)" — **HU-20 ya existe**. **Bloque Criterios adoptados.**
- **Posibles bugs:** ninguno de comportamiento.

### HU-22 · Sustitución de personas — **5/5 ✅ (con un [validar])**
- **Match:** los 5 ✅ (cierra sin borrar, crea vigente ligada, sincroniza caché, una activa por rol, elige de cuentas reales). Cita art. 125 fr. I g verificada.
- **Redacción:** "difiera", "ligada a la anterior", "sincronice el acceso", "reasignaciones inconsistentes"; meta "vive fuera del catálogo de HU", "En la práctica…". Pantalla ambigua (Roster `/contratos/roster`). **Bloque Criterios adoptados** (B15/A11).
- **Posibles bugs:** **difiere la nota sin bitácora = patrón P23** → [validar] consistencia con convenio/avance (🟡); N23 del plan describe flujo UI inexistente (🟢).

### HU-23 · Catálogo de empresas — **5 ✅ + 1 ❓**
- **Match:** 1,2,4,5,6 ✅ (selector del catálogo, dedup fuerte, aviso "misma empresa", empresa por persona, padrón solo-dependencia). **C3 ❓:** "empresa opcional" → en realidad **obligatoria** para contratista/supervisión (REGLA 1).
- **Redacción:** jerga "normalizado fuerte/segunda red/retrocompatible/inerte/follow-on", meta "— profe 09-jun", "que el profe señaló", "(ver HU-04 cr. 3)", "mejora opcional para Maiki". **Bloque Criterios adoptados** (6 viñetas). Citas art. 43/74 Bis correctas.
- **Posibles bugs:** empresa auto-creada siempre 'contratista' (🟡); catálogo público sin filtrar tipo/estado (🟢).

### HU-24 · Finiquito y cierre — **3/3 ✅**
- **Match:** los 3 ✅ (saldo server-side, nota + cierre 1-por-contrato inmutable, documento imprimible art. 170). Cierre además bloquea acciones posteriores (gates 409, lo que implementamos).
- **Redacción:** cuerpo bastante limpio; **bloque Criterios adoptados** con B8/"default conservador"/"follow-on"/"hardcodea". Desglose arts. 168-172 a verificar.
- **Posibles bugs:** gating de rol front (cualquier 'residente') vs back (solo el asignado → 403): UX confusa, back correcto (🟢).

---

## C) Constante en las 14: el bloque "Criterios adoptados"
**Las 14 historias tienen un bloque "Criterios adoptados (resueltos — ver TABLA_VALIDAR_PROFE_RESUELTOS_18jun.md)"** con decisiones internas del equipo (códigos A/B, "criterio del equipo", "default conservador", "[PARA MAIKI]", referencias a docs internos). Sumadas a las de HU-00..10, son las **27 unidades** a mover a `CRITERIOS_ADOPTADOS_INTERNO.md` (ver el plan del Bloque 3, `PLAN_LIMPIEZA_HISTORIAS_22jun.md`).

> **No cambié ninguna historia ni código.** Esto es el diagnóstico; el plan de limpieza y los ejemplos verbatim están en `docs/planes/PLAN_LIMPIEZA_HISTORIAS_22jun.md`. Los **posibles bugs** (tabla A) los decides tú: ninguno está arreglado.
