import { listOrders } from '@/lib/admin/queries'
import { getAdminSession } from '@/lib/admin/auth'
import { OrderList } from '@/components/admin/OrderList'

export const metadata = { title: 'Pedidos · Panel Sky Import' }
export const dynamic = 'force-dynamic'

export default async function PedidosPage() {
  const pedidos = await listOrders(200)
  // Borrar es del moderador. La base lo comprueba igual; esto solo evita
  // ofrecerle a un administrador un botón que le va a decir que no.
  const session = await getAdminSession()

  return (
    <>
      <p className="a-eyebrow">Seguimiento comercial</p>
      <h1 className="a-title mt-2">Pedidos</h1>
      <p className="a-hint mt-3 max-w-[68ch]">
        Cada pedido queda registrado en el momento en que el cliente pulsa «Enviar pedido por
        WhatsApp», con estado <strong className="text-fg">Iniciado por WhatsApp</strong>. El registro
        se hace antes de abrir la conversación, así que queda constancia aunque después no llegue a
        escribir. Los importes y la tasa son los de ese momento: si mañana cambia el precio, el
        pedido viejo sigue diciendo la verdad.
      </p>

      <OrderList orders={pedidos} canDelete={session?.role === 'moderator'} />
    </>
  )
}
