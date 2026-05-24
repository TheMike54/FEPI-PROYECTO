import { useState } from 'react';
import Breadcrumb from '../components/ui/Breadcrumb.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { ROLES } from '../data/permisos.js';
import { contratoDummy } from '../data/dummy.js';

export default function SolicitudRegistro() {
  const { showToast } = useToast();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [rolSolicitado, setRolSolicitado] = useState(ROLES[0].id);
  const [contrato, setContrato] = useState(contratoDummy.folio);
  const [justificacion, setJustificacion] = useState('');

  const handleEnviar = (e) => {
    e.preventDefault();
    showToast('Solicitud enviada. Pendiente de aprobación por la dependencia. (Pendiente para Sprint siguiente)');
  };

  return (
    <div>
      <Breadcrumb
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Solicitud de acceso' }
        ]}
      />

      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-sigecop-blue">
          Solicitud de registro e inscripción al sistema
        </h1>
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold uppercase tracking-wide border border-purple-300">
          ★ Propuesta · a validar
        </span>
      </div>

      <div className="bg-purple-50 border-l-4 border-purple-500 px-4 py-3 mb-6 rounded-r-md">
        <div className="text-sm font-semibold text-purple-900 mb-1">
          Vista propuesta — no incluida en el backlog de 22 historias
        </div>
        <p className="text-sm text-slate-700">
          El acceso al sistema no es automático: un usuario solicita su inscripción y
          la dependencia (o el administrador del contrato) la aprueba antes de que
          pueda iniciar sesión. Se presenta para validación.
        </p>
      </div>

      <form
        onSubmit={handleEnviar}
        className="bg-white border border-slate-200 rounded-md p-6 mb-6"
      >
        <h2 className="text-lg font-bold text-sigecop-blue mb-4">Datos del solicitante</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="sg-label">Nombre completo *</label>
            <input
              className="sg-input"
              placeholder="Ej. Ing. María López Hernández"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
            />
          </div>
          <div>
            <label className="sg-label">Correo electrónico *</label>
            <input
              type="email"
              className="sg-input"
              placeholder="nombre@dependencia.gob.mx"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
          </div>
          <div>
            <label className="sg-label">Rol que solicita *</label>
            <select
              className="sg-input"
              value={rolSolicitado}
              onChange={(e) => setRolSolicitado(e.target.value)}
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>{r.nombre}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="sg-label">Contrato o proyecto al que se incorpora *</label>
            <select
              className="sg-input"
              value={contrato}
              onChange={(e) => setContrato(e.target.value)}
            >
              <option value={contratoDummy.folio}>
                {contratoDummy.folio} — {contratoDummy.objeto}
              </option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="sg-label">Quién lo avala / justificación *</label>
            <textarea
              className="sg-input"
              rows={4}
              placeholder="Nombre del responsable que avala la solicitud y razón del acceso (ej. designación oficial, contrato firmado, etc.)"
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="px-4 py-2 text-slate-600 hover:text-slate-900">
            Cancelar
          </button>
          <button type="submit" className="sg-btn-primary">
            📨 Enviar solicitud
          </button>
        </div>
      </form>

      <div className="bg-slate-100 border-l-4 border-slate-400 px-4 py-3 rounded-r-md text-sm text-slate-700">
        <strong>Flujo:</strong> el solicitante envía → la dependencia revisa y
        aprueba o rechaza → si se aprueba, se crea la cuenta con el rol asignado y
        el usuario ya puede iniciar sesión.
      </div>
    </div>
  );
}
