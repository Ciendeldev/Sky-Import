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
        calculado. La lista de cupones nunca sale de la base: no se puede enumerar desde el
        navegador ni adivinar qué otros códigos existen.
      </p>

      <CouponManager coupons={cupones} />
    </>
  )
}
