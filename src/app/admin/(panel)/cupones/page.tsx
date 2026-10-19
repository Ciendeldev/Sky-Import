import { listCoupons } from '@/lib/admin/queries'
import { CouponManager } from '@/components/admin/CouponManager'

export const metadata = { title: 'Cupones · Panel Sky Import' }
export const dynamic = 'force-dynamic'

export default async function CuponesPage() {
  const cupones = await listCoupons()

  return (
    <>
      <p className="a-eyebrow">Promociones</p>
      <h1 className="a-title mt-2">Cupones de descuento</h1>
      <p className="a-hint mt-3 max-w-[62ch]">
        El cliente escribe el código en el checkout y la tienda le devuelve el descuento ya
        calculado. El listado completo está reservado al panel. La tienda pública solo consulta
        la validez del código que introduce el cliente.
      </p>

      <CouponManager coupons={cupones} />
    </>
  )
}
