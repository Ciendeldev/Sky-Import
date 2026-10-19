'use client'

export default function PanelError({ reset }: { reset: () => void }) {
  return (
    <section className="a-panel p-6" role="alert">
      <h1 className="a-title">No se pudo cargar el panel</h1>
      <p className="mt-4">No pudimos consultar los datos. Revisá la conexión y volvé a intentarlo.</p>
      <p className="a-hint mt-2">Este aviso no significa que se hayan eliminado productos o pedidos.</p>
      <button type="button" className="a-btn a-btn--solid mt-5" onClick={reset}>Reintentar</button>
    </section>
  )
}
