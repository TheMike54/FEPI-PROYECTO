# SIGECOP — Historial del proyecto (índice maestro)

> **Qué es este documento:** la historia completa del proyecto en orden cronológico, con enlace al
> documento de respaldo de cada etapa. Todo el detalle vive en `docs/historial/` (organizado por fase)
> y en las carpetas vigentes (`contexto-claude/`, `equipos/`, `analisis-y-diseno/`, `legal/`).
> Reorganizado el 11-jun-2026 (sesión de orden); **ningún documento se borró**, solo se movieron.
>
> ⚠️ Los documentos históricos pueden referenciarse entre sí por sus rutas VIEJAS
> (`docs/historial-cambios/...`, `docs/ETAPA_...`). Esas rutas ahora viven bajo `docs/historial/`.

---

## 0. El proyecto en una línea

**SIGECOP** — Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública (UAGRO, Etapa 1),
bajo LOPSRM / RLOPSRM / LFD. React+Vite+Tailwind · Node+Express+PostgreSQL · Render. 6 personas, 3
frentes; Maiki (TheMike54) integra y despliega.

**Documentos de arranque vigentes:** [README de docs/](README.md) ·
[Plan de partición en 3 equipos](equipos/Plan_Particion_3Equipos_SIGECOP.md) ·
[Contexto de respaldo](contexto-claude/SIGECOP_contexto_respaldo.md) ·
[Plan general del trabajo restante](contexto-claude/Plan_General_Trabajo_Restante.md) (deadline: BD
Render expira el **25-jun-2026**).

---

## 1. Análisis y diseño (mayo 2026)

La fase académica: historias de usuario, matrices, factibilidad, maquetas y la base legal.

| Documento | Qué es |
|---|---|
| [Historias_Usuario.xlsx](analisis-y-diseno/Historias_Usuario.xlsx) | Las 22 HU (HU-00..HU-21) formato del profe + 2 agregadas tras revisión (Registro, Por Firmar) |
| [Fichas_Trazabilidad.md](analisis-y-diseno/Fichas_Trazabilidad.md) | Cadena Historia ↔ Servicio (SRV-XX-XX) ↔ Sistema por HU (estado congelado en foto vieja) |
| [Matriz_Control_Accesos_SIGECOP.md](analisis-y-diseno/Matriz_Control_Accesos_SIGECOP.md) | Matriz completa 21 HU × 5 roles (E/C/🚫) en 3 capas (era la copia "(1)"; la corta quedó en historial/contexto/) |
| [Auditoria_Legal_SIGECOP.md](legal/Auditoria_Legal_SIGECOP.md) (24-may) | Fase 1 /auditar: cada cita legal verificada contra texto literal |
| [Cobertura_Legal_LOPSRM.md](legal/Cobertura_Legal_LOPSRM.md) (24-may) | Los 104 arts. de la LOPSRM: cubierto/hueco/fuera de alcance |
| [Cobertura_Legal_Reglamento.md](legal/Cobertura_Legal_Reglamento.md) (24-may) | Los 295 arts. del RLOPSRM (foco Cap. "De la Ejecución" 109-171) |
| [historial/contexto/Auditoria_Coherencia_F3_24may.md](historial/contexto/Auditoria_Coherencia_F3_24may.md) | Fase 3 /auditar: coherencia interna/vocabulario de los entregables |
| [contexto-claude/DECISIONES.md](contexto-claude/DECISIONES.md) | Registro del "por qué" de la fase prototipo (parcialmente desactualizado: §1.3 y §4.1 superados) |

## 2. Primera revisión del profe y fundación (01–04 jun)

El profe (Carlos Silva, ex-supervisor NAICM) revisó Sprint 1-2 el **01-jun** (audio 54:22). De ahí
salieron las 3 reversiones (cuadre exacto al centavo, anticipo como regla, programa = matriz
concepto×periodo) y las pasadas de fundación de Maiki.

| Documento (en `historial/`) | Qué documenta |
|---|---|
| [revisiones-profe/Revision_Profesor_Sprint1-2_Analisis_y_Plan.md](historial/revisiones-profe/Revision_Profesor_Sprint1-2_Analisis_y_Plan.md) | Análisis con timestamps del audio + plan en paquetes A–G (todo ejecutado) |
| `revisiones-profe/audio_profe_revision_01jun_transcript.txt` | Transcript del audio de la revisión (gitignored — material interno) |
| [fundacion/CORRECCION_ALTA_4x_Maiki.md](historial/fundacion/CORRECCION_ALTA_4x_Maiki.md) (02-jun) | Paquete 4.x: wizard validado por paso, errores con ubicación, anticipo>umbral exige PDF |
| [fundacion/A2_ENTREGABLE_Maiki.md](historial/fundacion/A2_ENTREGABLE_Maiki.md) (02-jun) | A2: programa de obra como matriz concepto×periodo + 10 reglas de prevención sistémica |
| [fundacion/ALTA_v2_Maiki.md](historial/fundacion/ALTA_v2_Maiki.md) (03-jun) | Alta-v2: gating uniforme, regla 100%, remoción modo proyecto, /solicitud-acceso |
| [fundacion/ALTA_v3_PDF_OBLIGATORIO_Maiki.md](historial/fundacion/ALTA_v3_PDF_OBLIGATORIO_Maiki.md) (03-jun) | Alta-v3: PDF firmado obligatorio como último paso |
| [fundacion/ALTA_v4_GATING_Maiki.md](historial/fundacion/ALTA_v4_GATING_Maiki.md) (03-jun) | Alta-v4: anticipo PDF >30% + gating secuencial (pasoMaxAlcanzado) |
| [fundacion/ALTA_v5_NAV_LINEAL_Maiki.md](historial/fundacion/ALTA_v5_NAV_LINEAL_Maiki.md) (03-jun) | Alta-v5: navegación lineal + garantías/jurídicos obligatorios (arts. 47/48) |
| [fundacion/REGRESION_gating_alta_Maiki.md](historial/fundacion/REGRESION_gating_alta_Maiki.md) (03-jun) | Regresión no reproducida + endurecimiento + spec faltante |
| [fundacion/BITACORA_v2_Maiki.md](historial/fundacion/BITACORA_v2_Maiki.md) (03-jun) | Bitácora-v2: apertura=nota #1, firmas, candado server-side, tipos art. 125 |
| [fundacion/BUGFIX_alta_bitacora_Maiki.md](historial/fundacion/BUGFIX_alta_bitacora_Maiki.md) (03-jun) | 3 bugs: reset del alta, "firmada" computada vs roster, botón Anular |
| [fundacion/AUDITORIA_LEGAL_Maiki.md](historial/fundacion/AUDITORIA_LEGAL_Maiki.md) (04-jun) | Pasada 1/4: TODAS las citas legales del código vs texto literal (art. 99→59, 122→123) |
| [fundacion/SUSTITUCION_PERSONAS_Maiki.md](historial/fundacion/SUSTITUCION_PERSONAS_Maiki.md) (04-jun) | Pasada 2/4: contrato_roster append-only + sustitución transaccional (art. 125 fr. I g) |
| [fundacion/SOPORTE_EQUIPOS_Maiki.md](historial/fundacion/SOPORTE_EQUIPOS_Maiki.md) (04-jun) | Pasada 3/4: 8 tablas de soporte al esquema para desbloquear E2/E3 |
| [fundacion/AUDITORIA_EST_PAGO_HU12_HU21_Maiki.md](historial/fundacion/AUDITORIA_EST_PAGO_HU12_HU21_Maiki.md) (04-jun) | Pasada 4/4: ciclo estimación→pago blindado (G1–G7; G8 IVA en patch condicional) |
| [fundacion/CONVENIOS_HU03_Maiki.md](historial/fundacion/CONVENIOS_HU03_Maiki.md) (04-jun) | Backend de convenios modificatorios (tabla inmutable + versionado + endpoint) |
| [revisiones-profe/Contexto... (ver §4)] | — |

> Cada `*_Maiki.md` tiene su `*_DIFFS.patch` hermano en la misma carpeta.

**Partición en equipos (02-jun):** [Plan_Particion_3Equipos_SIGECOP.md](equipos/Plan_Particion_3Equipos_SIGECOP.md)
(decisiones D-1..D-10, zona congelada) + [Prompts_Accion_Equipos_SIGECOP.md](equipos/Prompts_Accion_Equipos_SIGECOP.md) +
[GUIA_TRABAJO_EQUIPOS.md](equipos/GUIA_TRABAJO_EQUIPOS.md) + [SETUP_LOCAL.md](equipos/SETUP_LOCAL.md) — todos vigentes.
El borrador previo del modelo quedó en [historial/planes/Plan_Paralelizacion_Equipo_SIGECOP.md](historial/planes/Plan_Paralelizacion_Equipo_SIGECOP.md).
El DDL anticipado de las tablas de los equipos: [contexto-claude/Borrador_DDL_Tablas_Nuevas_SIGECOP.md](contexto-claude/Borrador_DDL_Tablas_Nuevas_SIGECOP.md) (vigente, citado por CLAUDE.md).

## 3. Plan maestro 1 (estimación) y Plan maestro 2 (testing) — 04–06 jun

Sobre la fundación, dos planes por etapas (ya cerrados, planes en `historial/planes/`):

- **[Plan_Maestro_UI_Estimacion_y_Seleccion.md](historial/planes/Plan_Maestro_UI_Estimacion_y_Seleccion.md)** →
  [AUDITORIA_seleccion_vs_texto_libre.md](historial/fundacion/AUDITORIA_seleccion_vs_texto_libre.md) (Etapa 0) ·
  [ETAPA_A_pantalla_unica_estimacion.md](historial/fundacion/ETAPA_A_pantalla_unica_estimacion.md) (pantalla única + /api/estimacion-prep) ·
  [ETAPA_B_fixes_seleccion.md](historial/fundacion/ETAPA_B_fixes_seleccion.md) (selección, no tecleo) ·
  [ETAPA_C_retencion_atraso.md](historial/fundacion/ETAPA_C_retencion_atraso.md) (pena por atraso art. 138/139 + snapshot avances)
- **[Plan_Maestro_2_Correcciones_Testing.md](historial/planes/Plan_Maestro_2_Correcciones_Testing.md)** →
  [PLAN2_PASE1_programa_mes_por_mes.md](historial/fundacion/PLAN2_PASE1_programa_mes_por_mes.md) (bug "programa no registrado" + MatrizProgramaLectura) ·
  [PLAN2_PASE3_validaciones_formularios.md](historial/fundacion/PLAN2_PASE3_validaciones_formularios.md) (fecha pago, garantía derivada, nombre/apellido) ·
  [PLAN2_PASE2-2_y_PASE4_alertas_y_fechahora.md](historial/fundacion/PLAN2_PASE2-2_y_PASE4_alertas_y_fechahora.md) (fecha+hora en notas, indicador atraso) ·
  [PLAN2_PASE2-3_sustitucion_bitacora_05jun.md](historial/fundacion/PLAN2_PASE2-3_sustitucion_bitacora_05jun.md) (sustitución asienta nota art. 123/125)
- **Corrección personas-cuenta (04-jun):** [CORRECCION_personas_nombre_04jun.md](historial/fundacion/CORRECCION_personas_nombre_04jun.md)
- **HU-03 UI (05-jun):** [HU03_CONVENIOS_UI_05jun.md](historial/fundacion/HU03_CONVENIOS_UI_05jun.md) (Fase 1 plazo; Fase 2 editor de matriz se integró después)
- **Hoja de reunión sprint 3:** [historial/revisiones-profe/Hoja_Reunion_Profe_Sprint3.md](historial/revisiones-profe/Hoja_Reunion_Profe_Sprint3.md)

En paralelo se integraron los PR de los equipos (HU-13, HU-05 curva, HU-17 tablero, HU-06 trabajos,
HU-04/07 specs reales) — ver memoria de integraciones del 06-jun y §6.

## 4. Segunda revisión del profe y plan de oleadas (08–09 jun)

El profe revisó de nuevo (2 sesiones grabadas) + testing interno del equipo. Todo se consolidó en el
**contexto maestro** (hallazgos P1-P20, W1-W11, propuestas S1-S11, plan O0-O10):

- **Vigente:** [contexto-claude/Contexto_Maestro_y_Plan_Correcciones_09jun.md](contexto-claude/Contexto_Maestro_y_Plan_Correcciones_09jun.md)
  (era `Contexto_Maestro_..._09jun_1.md`; incluye el plan de reskin UI-1/UI-2 que de hecho se ejecutó)
- Superada: [historial/revisiones-profe/Contexto_Maestro_y_Plan_Correcciones_09jun_v1-superada.md](historial/revisiones-profe/Contexto_Maestro_y_Plan_Correcciones_09jun_v1-superada.md)
- Material de defensa de Maiki: `docs/Acordeon_Defensa_SIGECOP.md` (personal, untracked, retrata el estado de sprint 1-3)

## 5. Las oleadas O0–O9 + O-PROFE + UI (09–10 jun)

Ejecución del plan del contexto maestro. Todas en [historial/oleadas/](historial/oleadas/):

| Oleada | Doc | Qué hizo |
|---|---|---|
| O0 | [OLEADA0_continuidad_bd_09jun.md](historial/oleadas/OLEADA0_continuidad_bd_09jun.md) | Backup/restore Render ensayado (BD gratis expira 25-jun; decisión A/B el 24-jun) |
| O1 | [OLEADA1_fixes_revision_profe_09jun.md](historial/oleadas/OLEADA1_fixes_revision_profe_09jun.md) | 7 fixes de la revisión (P2 no reproducido + spec blindaje) |
| O2 | [OLEADA2_plan_amortizacion_10jun.md](historial/oleadas/OLEADA2_plan_amortizacion_10jun.md) | Plan de amortización del anticipo (paso 5 del alta, art. 138 RLOPSRM); Fase B = pregunta al profe |
| O3 | [OLEADA3_catalogo_empresas_10jun.md](historial/oleadas/OLEADA3_catalogo_empresas_10jun.md) | Catálogo de empresas + autocomplete en registro ("catálogos es lo de ley") |
| O4 | [OLEADA4_avance_periodo_nota_10jun.md](historial/oleadas/OLEADA4_avance_periodo_nota_10jun.md) | HU-06 v2: avance por SELECTOR de periodo + nota automática + bloqueo vs programa |
| O5 | [OLEADA5_atraso_concepto_unidades_10jun.md](historial/oleadas/OLEADA5_atraso_concepto_unidades_10jun.md) | HU-07 v2: déficit automático por concepto en UNIDADES (sin umbral configurables) |
| O6 | [OLEADA6_convenios_bitacora_expediente_10jun.md](historial/oleadas/OLEADA6_convenios_bitacora_expediente_10jun.md) | Convenio asienta nota automática + bloque en expediente |
| O7 | [OLEADA7_flujo_legal_estimacion_10jun.md](historial/oleadas/OLEADA7_flujo_legal_estimacion_10jun.md) | Flujo art. 54: contratista presenta / residencia autoriza (luego reconciliado con HU-15) |
| O8 | [OLEADA8_notas_estimacion_documento_10jun.md](historial/oleadas/OLEADA8_notas_estimacion_documento_10jun.md) | Notas FIRMADAS vinculadas a la estimación + vista documento de la nota |
| O9 | [OLEADA9_expediente_pdf_unico_10jun.md](historial/oleadas/OLEADA9_expediente_pdf_unico_10jun.md) | Expediente: un solo PDF real (print) en vez de descargables prototipo |
| O-PROFE | [OLEADA_PROFE_ajustes_validar_10jun.md](historial/oleadas/OLEADA_PROFE_ajustes_validar_10jun.md) | Respuestas del profe: emisor notas=residente, exceso=aviso, tipo 'atraso', cita 143→138 |
| UI-1 | [OLEADA_UI1_reskin_guinda_10jun.md](historial/oleadas/OLEADA_UI1_reskin_guinda_10jun.md) | Reskin institucional guinda por remapeo de tokens + componentes ui/ |
| UI-2 | [OLEADA_UI2_reskin_resto_10jun.md](historial/oleadas/OLEADA_UI2_reskin_resto_10jun.md) | Reskin de las 9 páginas restantes (9 agentes en paralelo) |

## 6. Integraciones de los equipos (11 jun)

En [historial/integraciones-equipos/](historial/integraciones-equipos/):

- **HU-15** (E3, revisión técnica): [INTEGRACION_HU15_reconciliacion_O7_11jun.md](historial/integraciones-equipos/INTEGRACION_HU15_reconciliacion_O7_11jun.md) —
  supervisión observa/turna, residencia autoriza/rechaza; reconcilia O7 (HU-13 vuelve a "contratista
  presenta"). Flujo final: integrada → **Presentada** (HU-13) → **Autorizada** (HU-15) → pagada.
- **HU-19** (E3, 7 reportes): [HU19_REPORTES_INTEGRACION_11jun.md](historial/integraciones-equipos/HU19_REPORTES_INTEGRACION_11jun.md) —
  exportación client-side (jsPDF/exceljs) reconciliada al flujo final; pena por atraso derivada de la
  identidad de la carátula; pendientes R4 y validaciones legales con el profe.

**Estado tras esto:** suite e2e **258 passed / 8 skipped / 0 failed**; todo integrado y desplegado.

## 7. Referencias vigentes de uso diario

| Doc | Para qué |
|---|---|
| [contexto-claude/SIGECOP_contexto_respaldo.md](contexto-claude/SIGECOP_contexto_respaldo.md) | Retomar el proyecto en frío (era `SIGECOP_contexto_respaldo_1.md`, la más completa de las 4 copias) |
| [contexto-claude/Guia_Pruebas_E2E_SIGECOP.md](contexto-claude/Guia_Pruebas_E2E_SIGECOP.md) | Demo/pruebas manuales de las 15 HU integradas (la versión nueva; la vieja quedó en historial/contexto/) |
| [contexto-claude/Plan_General_Trabajo_Restante.md](contexto-claude/Plan_General_Trabajo_Restante.md) | Hoja de ruta al 25-jun (parcialmente ejecutada) |
| [contexto-claude/Contexto_Maestro_y_Plan_Correcciones_09jun.md](contexto-claude/Contexto_Maestro_y_Plan_Correcciones_09jun.md) | Referencia del plan de oleadas + lista [validar] del profe |
| `docs/Cuentas_Prueba_SIGECOP.md` | Credenciales demo (gitignored, NO mover ni versionar) |
| `docs/comandos usuario.txt` | Chuleta de Maiki: crear/borrar usuarios (untracked) |

## 8. Copias apartadas (no borradas)

- `historial/_duplicados/Revision_Profesor_Sprint1-2_Analisis_y_Plan_copia-exacta.md` — duplicado byte-a-byte del de revisiones-profe/.
- `historial/contexto/` — versiones superadas: 3 copias del contexto de respaldo (04-jun/06-jun/09-jun),
  la guía de pruebas vieja (069a71d), la matriz de accesos corta, ESTADO_ACTUAL (foto 02-jun) y Auditoría F3.
- `historial/sesiones/` — reportes de sesiones de orden/mantenimiento (`REPORTE_SESION_ORDEN_11jun.md`,
  `FIXES_AUDITORIAS_12jun.md`).
- `backups/` (raíz del repo, **gitignored**) — respaldos de la BD de Render (`render_backup_*.sql/.json`) y
  de las Historias de Usuario (`*_BACKUP_*.xlsx`). Traen datos reales; no se versionan.
