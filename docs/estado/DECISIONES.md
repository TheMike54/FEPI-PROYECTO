# Registro de Decisiones — SIGECOP

> Sistema de Gestión Técnico-Administrativa de Contratos de Obra Pública.
> Este documento captura las decisiones de diseño, su justificación y su fundamento
> legal o técnico, para que el "por qué" del proyecto quede en el repositorio y no
> dependa de la memoria del equipo. Es un registro vivo: cada decisión nueva se agrega
> al final de su sección.

---

## 1. Arquitectura y diseño del sistema

### 1.1 Control de Accesos es un servicio transversal, no un módulo
El control de permisos atraviesa todas las vistas y módulos del sistema, por lo que se
modela como un servicio transversal que cualquier vista consulta, y no como un módulo
funcional aislado. Esto evita duplicar lógica de permisos en cada módulo y mantiene una
sola fuente de verdad para "qué puede hacer cada rol".

### 1.2 La vista nunca accede directo a la base de datos
Toda lectura o escritura de datos pasa por el backend, que actúa como orquestador entre
la interfaz y la base de datos mediante una API REST. La vista solo conoce la API, nunca
la base de datos. Esto preserva la separación de capas, centraliza las reglas de negocio
en el backend y permite cambiar la persistencia sin tocar la interfaz.

### 1.3 Dos modos de operación: proyecto y aplicación
El sistema expone dos modos. El **modo proyecto** muestra la trazabilidad académica de
cada vista (código de historia de usuario, sprint y criterios de aceptación), pensado
para revisión y evaluación. El **modo aplicación** muestra el producto como lo vería un
usuario real según su rol, sin metadatos académicos. La misma base de código sirve a
ambos; el modo se conmuta en el encabezado.

### 1.4 El inicio de sesión no incluye selección manual de rol
La autenticación (HU-00) es transversal y no ofrece un selector de rol: el rol del
usuario se deduce de su perfil. El selector de rol presente en el modo aplicación es
exclusivamente andamiaje de demostración, etiquetado como tal, que sustituye de forma
temporal a la autenticación real mientras el backend está en fase de esqueleto.

---

## 2. Modelo de roles y permisos

### 2.1 Cinco roles; el superintendente se integra en el rol Contratista
El sistema reconoce cinco roles: Residente, Contratista, Supervisión, Dependencia y
Finanzas. El superintendente no es un rol separado: representa al contratista en obra y
comparte su mismo conjunto de permisos, por lo que se integra dentro del rol Contratista.

### 2.2 Tres niveles de permiso por vista
Cada vista define, por rol, uno de tres niveles: **ejecuta** (vista completa y editable),
**consulta** (lectura estricta: la información se ve pero los controles de captura quedan
deshabilitados) y **sin acceso** (la vista no aparece en el menú del rol). Esta matriz de
tres niveles es la que aplica el servicio transversal de control de accesos.

### 2.3 La matriz de permisos está fundamentada en la normatividad
Los permisos no son arbitrarios; cada acceso relevante se respalda en la LOPSRM y su
reglamento. Dos ejemplos centrales:

- **Acceso de consulta del contratista al expediente (HU-04)** — fundamentado en el
  **art. 117 RLOPSRM**, que obliga al superintendente a conocer el catálogo, el programa,
  los planos, la bitácora, los convenios y los documentos del contrato.
- **Tipos de nota por rol (HU-09)** — fundamentados en el **art. 125 RLOPSRM**: el
  residente autoriza y aprueba, el superintendente y el contratista solicitan y avisan, y
  la supervisión registra el avance físico-financiero.

---

## 3. Validaciones con fundamento legal

### 3.1 Umbral del 50% en convenios modificatorios (HU-03)
La vista distingue entre una modificación ordinaria y una que supera el 50% del importe o
del plazo originalmente pactados. Las modificaciones dentro de ese límite se rigen por el
**art. 59 LOPSRM**; las que lo superan activan el aviso del **art. 59 Bis LOPSRM**. El
umbral está calculado sobre el monto y el plazo base del contrato.

### 3.2 Plazo de presentación de la estimación (HU-13)
El envío de una estimación deshabilita su botón al vencer los **6 días naturales** del
periodo de presentación, conforme al **art. 54 LOPSRM**. El envío registra fecha y hora
exactas como evidencia del momento de entrega.

### 3.3 Bloqueo por exceso sobre lo contratado (HU-06)
El registro de trabajos terminados bloquea la captura cuando la cantidad acumulada de un
concepto excede la cantidad contratada en el catálogo, evitando reportar avances
imposibles respecto al alcance contratado.

### 3.4 Otras citas aplicadas
La trazabilidad legal se extiende al resto del catálogo de historias; entre otras:
art. 52 Bis (HU-08), art. 130 (HU-14), art. 55 (HU-20), art. 138 (HU-12), art. 53 y
art. 118. La matriz de servicios contra artículos mantiene este cruce completo.

---

## 4. Alcance y enfoque de la fase

### 4.1 El backend es un esqueleto en esta fase; las vistas usan datos de muestra
En esta fase el backend responde como esqueleto y las vistas operan con datos de muestra
claramente etiquetados. El sistema demuestra la estructura completa, los flujos y el
modelo de permisos; la persistencia real se implementa en fases posteriores. La decisión
prioriza entregar un sistema **coherente y honesto** sobre uno con persistencia parcial:
lo que se muestra implementado, está implementado; lo que es muestra, se identifica como
tal.

### 4.2 Formato de las historias de usuario
Cada historia de usuario lleva un máximo de tres criterios de aceptación, redactados como
aseveraciones verificables (no como preguntas), y una estimación en puntos sobre la
secuencia de Fibonacci. El lenguaje evita escalas cualitativas sin métrica y favorece
unidades concretas.

### 4.3 La solicitud de registro es una propuesta, no una funcionalidad del backlog
La vista de "solicitud de acceso" no forma parte del catálogo de historias: es una
propuesta exploratoria, visible solo en modo proyecto. Se plantea como una solicitud que
la dependencia aprueba —no como auto-registro abierto—, lo que es coherente con el modelo
de contratación de obra pública. Vive separada del catálogo y no participa en la matriz
de roles.

---

## 5. Decisiones de ingeniería

### 5.1 Componentes comunes y plantilla de vistas
Las vistas comparten un conjunto de componentes (encabezado de vista, banner de contexto,
región editable y sección de criterios) y una plantilla con un checklist de cinco pasos
(página, ruta, entrada de catálogo, permisos y patrón). Esto mantiene la interfaz
consistente, reduce el tamaño del paquete por deduplicación y hace que agregar una vista
nueva sea rápido y difícil de hacer mal (por ejemplo, evita olvidar los permisos).

### 5.2 Despliegue continuo en Render
El frontend se publica en Render como sitio estático mediante un archivo de configuración
(Blueprint). Cada cambio integrado a la rama principal redespliega el sitio de forma
automática, de modo que el equipo siempre ve la última versión sin pasos manuales.

### 5.3 Pruebas de extremo a extremo con Playwright
La verificación de la interfaz usa pruebas end-to-end con Playwright, que ejercitan el
sistema como lo haría una persona real en el navegador. Se eligió una **muestra
representativa** de vistas —las que concentran lógica distintiva: validaciones con
fundamento legal, validación de datos, multi-contrato y permisos sobre acciones— en lugar
de cubrir todas las vistas con pruebas casi idénticas, priorizando el valor por sobre la
cantidad. Las pruebas se ejecutan en serie (un proceso) porque el estado de modo y rol es
compartido, y navegan mediante interacción de tipo SPA para no reiniciar ese estado.

---

*Registro vivo. Actualizar al tomar decisiones de diseño, alcance, fundamento legal o
ingeniería que el equipo deba poder justificar más adelante.*
