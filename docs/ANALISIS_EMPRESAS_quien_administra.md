# Análisis — ¿quién administra el catálogo de empresas? (propuesta, sujeta a confirmación de Maiki)

> **Qué es:** análisis para decidir **quién registra y administra las empresas** en SIGECOP, con base en la
> ley, antes de maquetar/implementar la pantalla de Empresas. **No decide la implementación** — propone con
> fundamento; la decisión final es de Maiki (y del profe en lo legal). LOCAL, solo análisis.

---

## 1. El problema: las empresas NO son homogéneas

En SIGECOP conviven hoy, en **una sola tabla `empresas`**, tres tipos de entidad muy distintos:

| Tipo | Quién es | Naturaleza |
|---|---|---|
| **Dependencia / Contratante** | La entidad pública que licita y contrata (p. ej. UAGRO). | **Pública.** No es "contratista"; es la **autoridad contratante**. |
| **Contratista / Superintendente** | La empresa privada que ejecuta la obra. | **Privada.** Es la que se inscribe en el "padrón de contratistas". |
| **Supervisión** | El tercero **independiente** que supervisa. | **Privada.** También un contratista de servicios; debe ser **distinto** del contratista (art. 9 LOPSRM, principios de imparcialidad). |

Tratarlas igual (mismo catálogo, mismo flujo de alta) es lo que produce hoy la ambigüedad y el riesgo de
duplicados, y **mezcla a la autoridad pública con sus proveedores** — algo que la ley separa con claridad.

---

## 2. Qué dice la ley (verificado en los PDF)

**LOPSRM art. 74 Bis** crea el **registro único de contratistas**. **RLOPSRM art. 43** detalla cómo se
administra (cita textual verificada):

> *"Los contratistas **solicitarán su inscripción** en el registro único de contratistas **a las dependencias
> y entidades**, las cuales, **previa validación** de la información presentada por el contratista a través de
> la documentación respectiva… **llevarán a cabo la inscripción** correspondiente. Las dependencias y
> entidades **podrán inscribir** en dicho registro a los contratistas cuando adviertan que éstos no se
> encuentran inscritos… El citado registro será **diseñado y administrado por la Secretaría de la Función
> Pública**…"* (RLOPSRM art. 43)

El registro **clasifica** a los contratistas por *actividad, datos generales, nacionalidad, experiencia,
especialidad, **capacidad técnica/económica/financiera**, e historial de cumplimiento*.

**Lecciones legales (las que importan para nuestra decisión):**
1. **No es autoservicio puro.** El contratista **solicita**; quien **valida e inscribe** es la **dependencia**
   (y, a nivel federal, la **SFP administra** el registro único). Es un modelo **mixto con validación**.
2. La **dependencia es autoridad**, no "una empresa más" del padrón: **no se inscribe a sí misma** como
   contratista. Va en una configuración aparte.
3. El registro guarda **más que un nombre**: capacidad técnica/económica, especialidad, historial — datos que
   una autoridad valida, no que cada quien teclea libremente.

> Nota de alcance: el registro **federal** lo administra la SFP dentro de CompraNet. SIGECOP es **Etapa 1**
> (una dependencia, sin integración a CompraNet); el equivalente local de "la autoridad que valida e inscribe"
> es la **propia Dependencia** del sistema, espejo del rol que el art. 43 le da frente a sus contratistas.

---

## 3. Cómo está HOY en el sistema (verificado en el código)

- **Una sola tabla `empresas`** (sin columna `tipo`): mezcla dependencia, contratista y supervisión como
  filas iguales. `usuarios.empresa_id` apunta ahí sin importar el rol.
- **Autoservicio al registrarse:** al crear la cuenta, la persona **elige** su empresa del catálogo (selector)
  o **registra una nueva** (`resolverOCrearEmpresa`, con deduplicación fuerte: acentos/puntuación/sufijos).
- **Catálogo público y compartido** (`GET /api/auth/empresas`): lo que registra uno lo ven todos en el selector.
- **No hay pantalla de administración** del catálogo; la consolidación de duplicados es por **script CLI**
  (`consolidar_empresas.js`, lo corre Maiki).
- **La "regla nueva"** ("cada cuenta ve solo los contratos de su empresa") **aún no está implementada así:**
  hoy el acceso es **por participación** en el contrato (`esParteOSupervision`), no por empresa. Es un cambio
  pendiente a confirmar.

---

## 4. Las tres opciones (pro/contra)

### A) Autoservicio puro (como hoy: cada cuenta registra/elige su empresa al firmarse)
| Pro | Contra |
|---|---|
| Cero fricción; onboarding inmediato; ya está hecho. | **No hay autoridad que valide** → contradice el art. 43 (la dependencia debe validar e inscribir). |
| El dedup fuerte mitiga duplicados. | El catálogo se llena de entradas no verificadas; mezcla dependencia con privados; no guarda capacidad técnica/historial. |

### B) Solo un rol administrador (la Dependencia) registra todas las empresas
| Pro | Contra |
|---|---|
| **Coincide con la ley** (la dependencia valida e inscribe; art. 43). Catálogo limpio, sin basura. | **Fricción alta:** un contratista no puede ni darse de alta sin que la dependencia lo cargue primero. |
| Control total de calidad y de quién entra al padrón. | Más trabajo administrativo; cuello de botella si la dependencia no atiende a tiempo. |

### C) Mixto con validación (autoservicio para *solicitar* + la Dependencia *valida/administra*) — **el modelo de la ley**
| Pro | Contra |
|---|---|
| **Es exactamente el art. 43:** el contratista **solicita** (autoservicio, baja fricción) y la **Dependencia valida e inscribe** (autoridad, calidad). | Requiere un **estado de validación** (solicitada → validada) y una bandeja/cola para la dependencia. |
| Mantiene el onboarding rápido actual y le suma control. Permite a la dependencia editar/fusionar/normalizar. | Un poco más de UI/modelo que el autoservicio puro. |
| Separa **dependencia** (config aparte) de **padrón de contratistas** (privados validados). | — |

---

## 5. Recomendación (con fundamento)

**Opción C — Mixto con validación**, con esta repartición:

1. **Padrón de contratistas/supervisión (privados):** el alta la **inicia el propio contratista/supervisión**
   al registrarse (autoservicio, como hoy: elige del catálogo o solicita una nueva), **pero queda en estado
   "por validar"** hasta que la **Dependencia** la **valida/inscribe** (confirma datos, fusiona duplicados,
   marca la especialidad). **Rol administrador propuesto: la Dependencia.** *Fundamento: RLOPSRM art. 43 / LOPSRM
   art. 74 Bis — los contratistas solicitan su inscripción a las dependencias, que validan e inscriben.*
2. **Dependencia(s) (entidad pública):** **NO** va en el padrón de contratistas; se configura **aparte**, por
   un administrador del sistema (hoy, Maiki / un superadmin por script; mañana, una mini-pantalla de
   configuración). *Fundamento: la dependencia es la autoridad contratante, no un contratista (no se inscribe
   a sí misma).*
3. **Separar por `tipo`** (dependencia | contratista | supervisión) en el modelo, para no volver a mezclarlas y
   para poder aplicar la "regla nueva" (cada cuenta ve los contratos de su empresa) de forma coherente.

**Qué rol administra:** **la Dependencia** valida y administra el **padrón de contratistas/supervisión**; el
**superadmin/Maiki** configura las **dependencias**. (Espejo local del reparto federal: SFP administra el
registro único, las dependencias inscriben/validan a sus contratistas.)

**Por qué C y no A ni B:** A ignora la validación que exige la ley; B mete demasiada fricción (la ley sí
permite que el contratista **inicie** la solicitud). C es **literalmente el modelo del art. 43** y conserva el
onboarding ágil que ya tenemos.

---

## 6. Qué implica (para cuando Maiki apruebe — NO se implementa aún)

- Añadir `empresas.tipo` (dependencia | contratista | supervision) y `empresas.estado` (por_validar | validada).
- Pantalla de **Empresas** para la **Dependencia**: bandeja de "por validar", validar/fusionar/editar, ver
  contratos por empresa. (Es la que se maqueta como **propuesta** en `sigecop-modo-sistema.html`.)
- La "regla nueva" (acceso por empresa) es **decisión aparte** y hoy el acceso es por participación; conviene
  decidir si se cambia o se complementa.

> **Todo lo anterior es propuesta.** No toqué el modelo ni el código. **Pendiente de tu confirmación, Maiki**
> (y de validar con el profe el encaje exacto del art. 43 / 74 Bis en Etapa 1).
