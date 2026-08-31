import Link from 'next/link'
import { listCategories } from '@/lib/admin/queries'
import { ProductForm } from '@/components/admin/ProductForm'

export const metadata = { title: 'Nueva pieza · Panel Sky Import' }
export const dynamic = 'force-dynamic'

export default async function NuevoProductoPage() {
  const categories = await listCategories()

  return (
    <>
      <Link href="/admin/productos" className="a-eyebrow hover:text-accent">
        ← Productos
      </Link>
      <h1 className="a-title mt-2">Nueva pieza</h1>
      <p className="a-hint mt-2">
        La ficha técnica y los datos de compatibilidad se cargan después, desde el catálogo tipado
        del proyecto: son los que alimentan el configurador y no se editan como texto libre.
      </p>

      <ProductForm categories={categories} />
    </>
  )
}
