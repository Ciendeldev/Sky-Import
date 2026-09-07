import { test, expect, type Page, type Locator } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'

// Optativa: usa cuentas efímeras, jamás la contraseña del titular ni pedidos reales.
test.use({ trace: 'off', video: 'off' })
test('configuración: moderador crea, administrador cambia su clave y no gestiona cuentas', async ({ page, context }, info) => {
  test.skip(process.env.RUN_ACCOUNT_E2E !== '1', 'Requiere ejecución explícita de cuentas temporales.')
  test.setTimeout(120_000)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const ids = new Set<string>()
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
  const moderatorEmail = 'qa_mod_' + suffix + '@users.skyimport.local'
  const username = 'qa_' + suffix
  const initial = randomUUID() + randomUUID()
  const changed = randomUUID() + randomUUID()
  const reset = randomUUID() + randomUUID()
  const ownerKey = randomUUID() + randomUUID()
  const client = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const secretFill = async (locator: Locator, value: string) => {
    // No fill() ni trazas: un fallo del runner no debe imprimir credenciales.
    await locator.evaluate((el, secret) => {
      (el as HTMLInputElement).value = secret
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }, value)
  }
  async function login(target: Page, user: string, password: string) {
    await target.goto('/admin/acceso')
    await target.getByLabel('Usuario', { exact: true }).fill(user)
    await secretFill(target.getByLabel('Contraseña', { exact: true }), password)
    await target.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(target).toHaveURL(/\/admin$/)
  }

  let memberId: string | undefined
  try {
    const made = await service.auth.admin.createUser({ email: moderatorEmail, password: ownerKey, email_confirm: true, app_metadata: { panel_role: 'moderator' } })
    expect(Boolean(made.error)).toBe(false)
    const moderatorId = made.data.user!.id
    ids.add(moderatorId)
    const membership = await service.from('admin_users').insert({ user_id: moderatorId, username: 'qa_mod_' + suffix, full_name: 'Moderador de prueba' })
    expect(Boolean(membership.error)).toBe(false)
    await login(page, moderatorEmail, ownerKey)
    await page.getByRole('link', { name: 'Configuración', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Configuración', exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Gestión de usuarios' })).toBeVisible()
    const create = page.getByRole('form', { name: 'Crear administrador' })
    await create.getByLabel('Usuario', { exact: true }).fill(username)
    await create.getByLabel('Nombre completo').fill('Administrador de prueba')
    await secretFill(create.getByLabel('Contraseña', { exact: true }), initial)
    await create.getByRole('button', { name: 'Crear usuario' }).click()
    await expect(create.getByRole('status')).toContainText('Administrador creado', { timeout: 15000 })
    const member = await service.from('admin_users').select('user_id').eq('username', username).single()
    memberId = member.data!.user_id
    if (!memberId) throw new Error('No se encontró la cuenta de prueba creada.')
    ids.add(memberId)
    const authMember = await service.auth.admin.getUserById(memberId)
    expect(authMember.data.user?.app_metadata.panel_role).toBe('admin')
    await expect(page.getByRole('row').filter({ hasText: username })).toContainText('Administrador de prueba')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: info.outputPath('configuracion-moderador.png'), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).include('.a-main').analyze()).violations.map(v => v.id)).toEqual([])

    const memberContext = await context.browser()!.newContext({ viewport: page.viewportSize()! })
    const memberPage = await memberContext.newPage()
    try {
      await login(memberPage, username.toUpperCase(), initial)
      await memberPage.goto('/admin/configuracion')
      await expect(memberPage.getByRole('heading', { name: 'Cambiar contraseña', exact: true })).toBeVisible()
      await expect(memberPage.getByRole('heading', { name: 'Gestión de usuarios' })).toHaveCount(0)
      await expect(memberPage.getByRole('form', { name: 'Crear administrador' })).toHaveCount(0)
      await memberPage.screenshot({ path: info.outputPath('configuracion-administrador.png'), fullPage: true })

      // Los metadatos editables del perfil y la API de tablas no otorgan permisos.
      const memberClient = client()
      const signed = await memberClient.auth.signInWithPassword({ email: username + '@users.skyimport.local', password: initial })
      expect(Boolean(signed.error)).toBe(false)
      await memberClient.auth.updateUser({ data: { panel_role: 'moderator' } })
      const unauthorized = await memberClient.from('admin_users').insert({ user_id: randomUUID(), username: 'forbidden_' + suffix })
      expect(Boolean(unauthorized.error)).toBe(true)
      await memberPage.reload()
      await expect(memberPage.getByRole('heading', { name: 'Gestión de usuarios' })).toHaveCount(0)
      await memberClient.auth.signOut({ scope: 'local' })

      const own = memberPage.getByRole('form', { name: 'Cambiar mi contraseña' })
      await secretFill(own.getByLabel('Contraseña actual'), randomUUID())
      await secretFill(own.getByLabel('Nueva contraseña', { exact: true }), changed)
      await secretFill(own.getByLabel('Repetir contraseña'), changed)
      await own.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click()
      await expect(own.getByRole('alert')).toContainText('actual no es correcta', { timeout: 15000 })
      await secretFill(own.getByLabel('Contraseña actual'), initial)
      await secretFill(own.getByLabel('Nueva contraseña', { exact: true }), changed)
      await secretFill(own.getByLabel('Repetir contraseña'), changed)
      await own.getByRole('button', { name: 'Cambiar contraseña', exact: true }).click()
      await expect(own.getByRole('status')).toContainText('Contraseña actualizada', { timeout: 15000 })
      const oldAttempt = await client().auth.signInWithPassword({ email: username + '@users.skyimport.local', password: initial })
      expect(Boolean(oldAttempt.error)).toBe(true)
      const newClient = client()
      expect(Boolean((await newClient.auth.signInWithPassword({ email: username + '@users.skyimport.local', password: changed })).error)).toBe(false)
      await newClient.auth.signOut({ scope: 'local' })
    } finally {
      await memberContext.close()
    }
    await page.getByRole('button', { name: 'Restablecer contraseña de ' + username, exact: true }).click()
    const resetForm = page.getByRole('form', { name: 'Restablecer contraseña de ' + username })
    await secretFill(resetForm.getByLabel('Nueva contraseña', { exact: true }), reset)
    await secretFill(resetForm.getByLabel('Repetir contraseña'), reset)
    await resetForm.getByRole('button', { name: 'Restablecer contraseña', exact: true }).click()
    await expect(resetForm.getByRole('status')).toContainText('Contraseña restablecida', { timeout: 15000 })
    const resetClient = client()
    expect(Boolean((await resetClient.auth.signInWithPassword({ email: username + '@users.skyimport.local', password: reset })).error)).toBe(false)
    await resetClient.auth.signOut({ scope: 'local' })
  } finally {
    // Recuperar el ID si el navegador falló justo después del alta.
    if (!memberId) {
      const result = await service.from('admin_users').select('user_id').eq('username', username).maybeSingle()
      if (result.data) ids.add(result.data.user_id)
    }
    for (const id of ids) {
      const removed = await service.auth.admin.deleteUser(id)
      expect(Boolean(removed.error)).toBe(false)
    }
  }
})
