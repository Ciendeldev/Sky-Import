import { getSettings } from '@/lib/admin/queries'
import { FxForm, RulesForm } from '@/components/admin/SettingsForms'

export const metadata = { title: 'Precios · Panel Sky Import' }
export const dynamic = 'force-dynamic'

export default async function PreciosPage() {
  const { fx, rules } = await getSettings()

  return (
    <>
      <p className="a-eyebrow">Configuración</p>
      <h1 className="a-title mt-2">Precios y tasa de cambio</h1>
      <p className="a-hint mt-3 max-w-[62ch]">
        Los precios del catálogo se cargan en dólares y son la fuente de verdad. Guaraníes y reales
        se derivan de estas tasas y se redondean de vitrina: al millar en guaraníes, al décimo en
        reales. Cambiar estos dos números actualiza toda la tienda y los mensajes de WhatsApp.
      </p>

      <div className="a-grid a-grid--2 mt-8 items-start">
        <FxForm fx={fx} />
        <RulesForm rules={rules} />
      </div>
    </>
  )
}
