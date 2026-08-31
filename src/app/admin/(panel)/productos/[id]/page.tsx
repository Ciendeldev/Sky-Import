import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getProduct, listCategories } from '@/lib/admin/queries'
import { ProductForm } from '@/components/admin/ProductForm'
import { VariantEditor } from '@/components/admin/VariantEditor'

export const dynamic = 'force-dynamic'

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [product, categories] = await Promise.all([getProduct(id), listCategories()])
  if (!product) notFound()

  const variantes = [...(product.product_variants ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.label_es.localeCompare(b.label_es),
  )

  return (
    <>
      <Link href="/admin/productos" className="a-eyebrow hover:text-accent">
        ← Productos
      </Link>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="a-title">{product.name}</h1>
        <Link
          href={`/es/producto/${product.slug}`}
          target="_blank"
          rel="noopener"
          className="a-btn a-btn--sm"
        >
          Ver en la tienda
        </Link>
      </div>

      <ProductForm product={product} categories={categories} />
      <VariantEditor productId={product.id} variants={variantes} />
    </>
  )
}
