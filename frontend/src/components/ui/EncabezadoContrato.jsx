import { Fragment } from 'react';

// UI-1: encabezado de contexto del contrato (sucesor visual de BannerContexto para las vistas
// migradas): tarjeta blanca con acento guinda a la izquierda, folio prominente y metadatos
// en línea. Props compatibles con los usos actuales:
//   titulo (etiqueta pequeña, default 'Contrato') · folio · items = [{ label?, value, resaltado? }]
//   testid (ancla para specs; p.ej. banner-expediente).
export default function EncabezadoContrato({ titulo = 'Contrato', folio, items = [], testid }) {
  return (
    <div className="bg-white border border-borde border-l-[3px] border-l-guinda rounded-lg px-4 py-3 mb-6" data-testid={testid}>
      <div className="text-[10px] font-medium uppercase tracking-wider text-tinta-sec">{titulo}</div>
      <div className="text-sm text-tinta mt-1">
        {folio && <strong className="font-semibold text-guinda">{folio}</strong>}
        {items.map((item, i) => (
          <Fragment key={i}>
            {(folio || i > 0) && ' · '}
            {item.label && <span className="text-tinta-sec">{item.label} </span>}
            {item.resaltado ? <strong className="font-semibold">{item.value}</strong> : item.value}
          </Fragment>
        ))}
      </div>
    </div>
  );
}
