# Plan general — trabajo restante de SIGECOP

**Fecha:** 5 jun 2026 · **Deadline duro:** 25 jun 2026 (expira el PostgreSQL gratuito de Render).
**Estado:** ~15 HU en producción. Plan maestro de estimación (A–C) y Plan 2 de correcciones: **cerrados**. El profe no llegó a validar → se sigue con defaults y se confirma cuando aparezca.

---

## 0. Convenciones de trabajo (cómo se hace todo)

- **Code construye en LOCAL, sin commit/push.** Solo Maiki integra (merge + push) y despliega.
- **Patrón de revisión de PR de equipo:** Code hace `git fetch` → revisa diff vs main → verifica zona congelada → checa rebase (las ramas de equipo llegan atrasadas) → merge a rama de integración local → corre suite completa → reporta. Maiki decide y pushea.
- **Una vez integrada en main, la HU es de Maiki.** Los bugs de lo integrado los arregla fundación; los equipos solo entregan HU nuevas.
- **Núcleo endurecido (NO regresar, solo extender):** auth, cálculo + validaciones de estimación (G1–G8), gating/100%/cuadre del alta, CHECK del roster, inmutabilidad de bitácora/firmas.
- **Lecciones obligatorias en toda construcción nueva:**
  1. Selección, no texto libre (contrato, personas, folios se eligen/derivan, nunca se teclean).
  2. Inmutabilidad (no editar/borrar registros legales; corrección = registro nuevo que referencia).
  3. Banner "solo consulta" en vistas de lectura.
  4. Fechas con hora donde se registre un evento.
  5. Acotado por participación + permisos por rol.
  6. Router nuevo → montar DESPUÉS de `app.use(cors())`.
  7. Al reescribir una página, actualizar su spec (no dejar el dummy viejo).
  8. Citar artículo o marcar `[validar]`.

---

## 1. En producción (ya hecho — no tocar salvo bug)

HU-00 login · HU-01 alta · HU-02 sustitución (+ nota de bitácora) · HU-03 backend + UI plazo · HU-04 expediente (+ programa mes-por-mes + roster) · HU-06 avance físico · HU-07 alertas (+ indicador) · HU-08/09/10 bitácora (+ fecha/hora) · HU-12 estimación (pantalla única, retención, avance) · HU-13 envío de estimación · HU-14 historial · HU-21 pago (+ validación de fecha).

---

## 2. Trabajo restante

### A. PRs de equipos por integrar — INMEDIATO

| HU | Equipo | Estado | Acción |
|---|---|---|---|
| **HU-05** programa + curva de avance | E2 (PR #3) | Entregado, solo frontend (CurvaAvance.jsx) | Revisar (prompt abajo) → integrar |

**Prompt de revisión HU-05:**
```
Soy Maiki. Revisión/integración del PR #3 de E2: HU-05 (programa y curva de avance), SOLO frontend (CurvaAvance.jsx). LOCAL, sin push.
1) git fetch origin; diff vs main. Verifica rebase (ramas de E2 llegan atrasadas); si está atrás, reporta cuántos commits y si mergea limpio.
2) Zona congelada: solo CurvaAvance.jsx (+ api.js aditivo). NO server.js/schema/auth/contratos/estimaciones/alta/permisos. Solo lectura; finanzas sin acceso.
3) Spec: verifica que pruebe el flujo REAL (no dummy); si está roto por reescritura de página, consolídalo.
4) Merge a rama integración local (sin push). Suite completa. Reporta passed/skipped/failed + estado rebase + spec. NO push.
```

### B. Maiki construye (no necesita al profe)

| Tarea | Tamaño / nota | Prioridad |
|---|---|---|
| **HU-03 editor de matriz** (convenios de monto/programa/mixto) | Delicado: reconstruir el capturador del alta con cuadre al centavo (art. 118). Sesión propia. | Alta (completa HU-03) |
| **login-contrato** (contexto de contrato al iniciar sesión) | HU nueva, clara, bajo riesgo | Media |
| **Banner "solo consulta" de HU-06** | Trivial | Baja |

**Prompt HU-03 editor de matriz (cuando lo ataques):**
```
Soy Maiki. HU-03 Fase 2: editor de matriz para convenios de monto/programa/mixto. LOCAL, sin commit/push, sobre main actual. El backend ya exige catálogo + matriz de programa COMPLETOS y NUEVOS (el monto se DERIVA, no se teclea — como el alta).
Construir: editor que precarga el programa vigente del contrato, permite editar conceptos/celdas, deriva el monto y los deltas vs. el vigente, valida cuadre al 100% (art. 118), respeta el guardrail 25% (aviso, backend bloquea). Al guardar, el backend versiona el programa (snapshot inmutable).
Lecciones: contrato seleccionado (no tecleado), inmutable, banner solo-consulta en lectura, solo dependencia crea (permisos.js congelado), fecha+hora. Reusa MatrizProgramaLectura para la vista de versiones.
Zona congelada: G1-G8, auth, contratos core, alta, schema salvo aditivo; api.js aditivo.
Tests: crear convenio de monto que cuadra → versiona; que NO cuadra → rechaza; aviso >25%; inmutable; permisos. Suite verde. Doc + runbook. NO push.
```

**Prompt login-contrato (cuando lo ataques):**
```
Soy Maiki. HU nueva: contexto de contrato al iniciar sesión. LOCAL, sin commit/push, sobre main actual.
Al entrar, el usuario queda asociado a un contrato (contexto de sesión): si tiene 1 solo contrato visible, se selecciona por defecto; si tiene varios, un selector. El contexto preselecciona el contrato en bitácora, estimación, alertas, expediente (sin reemplazar la posibilidad de cambiarlo). [validar profe: comportamiento exacto].
Lecciones: contrato SELECCIONADO (no tecleado), acotado por participación (cada quien ve solo sus contratos). NO tocar auth core ni el JWT más allá de leer el contexto; preferir estado de sesión en frontend + endpoint de "mis contratos" si hace falta (aditivo).
Zona congelada: auth, contratos core, G1-G8, alta. Tests reales + suite verde. Doc + runbook. NO push.
```

### C. De los equipos (entregan por PR; Maiki integra con el patrón de revisión)

| HU | Equipo | Descripción |
|---|---|---|
| **HU-11** | E2 | Pendiente (ver Historias_Usuario.xlsx) |
| **Correcciones bitácora** | E2 | Apertura con narrativa, vincular lineal (no árbol), tipos de nota por rol |
| **HU-15 a 20** | E3 | Reportes, tablero de control, módulos restantes de estimación (6 historias) |

> Recordar a los equipos: **rebasar sobre main actual antes de pedir merge** (vicio recurrente), montar routers **después de cors**, y actualizar sus specs al reescribir páginas.

### D. Necesita al profe

**HU nueva grande:**
- **Obra + tablero de control:** super-entidad que agrupa contratos de una misma obra (ej. aeropuerto + pistas) con avance/gasto consolidado. Necesita que el profe defina alcance. (Relacionada con HU-17 de E3.)

**Decisiones `[validar]` (detalle enmarcado en `Hoja_Reunion_Profe_Sprint3.md`) — confirmar, NO bloquean:**
1. IVA en estimaciones (carátula sin IVA / pago con IVA).
2. Regla del 100% (`=` exacto vs parcial).
3. Umbral del nombre (≥2 palabras).
4. Dependencia no firma la bitácora.
5. Autoridad de sustitución (art. 125 fr. I g).
6. Datos de apertura de bitácora (fecha = inicio + datos mínimos).
7. Datos jurídicos firmante/representante (¿cuentas o texto externo?).
8. Mover el % de pena de datos generales a penalizaciones.
9. Sustitución → nota de bitácora automática o manual.
10. Programa mes-por-mes (¿así lo quiere ver?).
11. "Anular nota" ya cumple (marca + correctiva) — ¿se queda o se quita?
12. Convenios: el 25% ¿es tope duro o disparador SFP?
13. Emisor de la nota de sustitución (ejecutor vs. residente forzado).
14. Folio diferido de sustitución (¿satisface art. 123 fr. V/VI?).
15. Regla de disparo de la retención por atraso (global/concepto, bruto/neto, recuperación).

### E. Proceso

- **Sincronizar `Historias_Usuario.xlsx`** — el profe programa desde las HU y están desfasadas. Acordar quién lo actualiza.

---

## 3. Orden sugerido (hacia el 25 jun)

1. **Ahora:** integrar HU-05 (PR #3 de E2).
2. **Tú, en paralelo:** HU-03 editor de matriz (completa convenios) → login-contrato.
3. **Presionar a los equipos** (es el grueso): E2 → HU-11 + correcciones de bitácora; E3 → HU-15–20. Integrarlas con el patrón de revisión conforme lleguen.
4. **Cuando aparezca el profe:** cerrar los 15 `[validar]` (la mayoría solo confirma lo ya hecho) y definir **Obra + tablero**.
5. **Cierre:** sincronizar `Historias_Usuario.xlsx`, smoke E2E completo (ver `Guia_Pruebas_E2E_SIGECOP.md`), y verificar todo en Render antes del 25 jun.

---

## 4. Riesgos / cuidados

- **Deadline Render 25 jun:** lo que no esté integrado antes queda fuera del entorno desplegado. El grueso pendiente es de los equipos → su ritmo es el riesgo principal.
- **Ramas de equipo atrasadas:** seguir exigiendo rebase antes de merge.
- **El editor de matriz (HU-03 Fase 2)** es la pieza propia más delicada (cuadre al centavo) — no apresurarla.
- **Defaults sin validar:** todo lo `[validar]` está construido con un default razonable y reversible; documentado para confirmar con el profe sin retrabajo.
