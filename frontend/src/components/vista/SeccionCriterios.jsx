// Sección "Criterios de aceptación" (metadata académica de las maquetas).
// alta-v2: el "modo proyecto" era lo único que la mostraba; al eliminarlo, esta sección
// ya NO se renderiza. Se conserva el componente (y su firma `{ huId, criterios }`) para no
// tocar las ~18 páginas prototipo que lo invocan — simplemente no pinta nada.
export default function SeccionCriterios() {
  return null;
}
