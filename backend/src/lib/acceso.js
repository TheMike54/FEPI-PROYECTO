// Acceso por participacion. Roles operativos (residente, contratista, supervision)
// solo ven/actuan sobre contratos donde son parte; dependencia y finanzas leen todos.
// El "contrato" recibido debe traer created_by, residente_id, superintendente_id, supervision_id.
//
// (PLAN GRANDE BLOQUE 1 — ACOTAMIENTO POR EMPRESA, retrocompatible) Regla de Maiki: cada usuario solo
// ve los contratos de SU empresa; una persona de OTRA empresa no debe poder acceder. Criterio del
// equipo (con base art. 43 RLOPSRM / 74 Bis LOPSRM — cada dependencia gestiona sus contratos):
//   · ROLES OPERATIVOS (residente/contratista/supervision): el acotamiento YA lo da la PARTICIPACION
//     (un no-participante NUNCA ve el contrato) → cubre el caso negativo "persona de otra empresa no
//     accede" sin ningun cambio.
//   · FINANZAS: transversal (autoridad pagadora de todas las dependencias) → ve todos. [criterio equipo]
//   · DEPENDENCIA: ACOTADA a su propia dependencia SOLO si la fila trae el contexto de empresa
//     (`dependencia_empresa_id`); si no lo trae (filas legadas de los SELECT congelados), conserva el
//     comportamiento previo (ve todos) → CERO regresion. Para enforcement pleno, el SELECT de la lista
//     de contratos (zona congelada) debe incluir `dependencia_empresa_id` (lo integra Maiki).
const ROLES_VEN_TODO = ['dependencia', 'finanzas'];

function esParteOSupervision(usuario, contrato) {
  if (!usuario || !contrato) return false;
  const uid = usuario.id;
  // Participacion directa (red de seguridad principal; cubre a los roles operativos).
  const esParte = (
    contrato.created_by === uid ||
    contrato.residente_id === uid ||
    contrato.superintendente_id === uid ||
    contrato.supervision_id === uid
  );
  if (esParte) return true;
  if (usuario.rol === 'finanzas') return true; // transversal (autoridad pagadora)
  if (usuario.rol === 'dependencia') {
    // Acota a su propia dependencia SOLO si la fila trae el contexto de empresa; sino, legado (ve todo).
    if (contrato.dependencia_empresa_id != null && usuario.empresa_id != null) {
      return contrato.dependencia_empresa_id === usuario.empresa_id;
    }
    return true;
  }
  return false;
}

module.exports = { ROLES_VEN_TODO, esParteOSupervision };
