// Acceso por participacion. Roles operativos (residente, contratista, supervision)
// solo ven/actuan sobre contratos donde son parte; dependencia y finanzas leen todos.
// El "contrato" recibido debe traer created_by, residente_id, superintendente_id, supervision_id.
const ROLES_VEN_TODO = ['dependencia', 'finanzas'];

function esParteOSupervision(usuario, contrato) {
  if (!usuario || !contrato) return false;
  if (ROLES_VEN_TODO.includes(usuario.rol)) return true;
  const uid = usuario.id;
  return (
    contrato.created_by === uid ||
    contrato.residente_id === uid ||
    contrato.superintendente_id === uid ||
    contrato.supervision_id === uid
  );
}

module.exports = { ROLES_VEN_TODO, esParteOSupervision };
