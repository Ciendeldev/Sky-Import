/**
 * Crea (o actualiza) la cuenta de administración en Supabase.
 *
 * La contraseña NO está en el repositorio ni en este archivo. Se lee de la
 * variable `ADMIN_PASSWORD`, que vive en `.env.local` — un archivo que
 * `.gitignore` excluye. Supabase la guarda hasheada; ni este script ni la
 * aplicación la vuelven a ver nunca.
 *
 * Uso:
 *
 *   1. Completá en `.env.local`:
 *        NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *        ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 *   2. node --env-file=.env.local scripts/crear-admin.mjs
 *
 *   3. Borrá `ADMIN_PASSWORD` de `.env.local`. Ya no hace falta: la cuenta
 *      existe y la contraseña vive en Supabase.
 *
 * Correrlo dos veces no rompe nada: si la cuenta ya existe, actualiza la
 * contraseña y se asegura de que esté en `admin_users`.
 */

import { createClient } from '@supabase/supabase-js'
import { createInterface } from 'node:readline'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const USERNAME = process.env.ADMIN_USERNAME || 'Cielo'
const EMAIL = process.env.ADMIN_EMAIL || 'cielo@skyimport.local'

function fallar(mensaje) {
  console.error(`\n  ✗ ${mensaje}\n`)
  process.exit(1)
}

if (!URL) fallar('Falta NEXT_PUBLIC_SUPABASE_URL.')
if (!SERVICE) fallar('Falta SUPABASE_SERVICE_ROLE_KEY (panel de Supabase → Settings → API).')

/**
 * Pide la contraseña por teclado, sin eco.
 *
 * Es mejor que leerla de una variable de entorno: así no queda escrita en
 * `.env.local` esperando a que alguien se acuerde de borrarla, ni en el
 * historial del shell. `ADMIN_PASSWORD` se sigue aceptando para poder
 * automatizar esto en un entorno sin teclado.
 */
async function pedirContraseña(prompt) {
  if (!process.stdin.isTTY) {
    fallar('No hay terminal para pedir la contraseña. Definí ADMIN_PASSWORD y volvé a intentar.')
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })

  // `readline` no trae entrada oculta: se silencia la salida mientras se
  // escribe, para que la contraseña no quede a la vista de nadie que mire.
  const escribir = rl._writeToOutput?.bind(rl)
  rl._writeToOutput = (texto) => {
    if (texto.includes(prompt)) escribir(texto)
  }

  const valor = await new Promise((resolve) => rl.question(prompt, resolve))
  rl.close()
  process.stdout.write('\n')
  return valor
}

let PASSWORD = process.env.ADMIN_PASSWORD
if (!PASSWORD) {
  PASSWORD = await pedirContraseña(`  Contraseña para «${USERNAME}»: `)
  const repetida = await pedirContraseña('  Repetila: ')
  if (PASSWORD !== repetida) fallar('Las dos contraseñas no coinciden.')
}

if (!PASSWORD || PASSWORD.length < 8) {
  fallar('La contraseña tiene que tener al menos 8 caracteres.')
}

const supabase = createClient(URL, SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
})

console.log(`\n  Creando administrador «${USERNAME}» (${EMAIL})…`)

// ── 1 · ¿ya existe la cuenta? ───────────────────────────────────────────────
const { data: lista, error: errorLista } = await supabase.auth.admin.listUsers({ perPage: 200 })
if (errorLista) fallar(`No se pudo consultar los usuarios: ${errorLista.message}`)

const existente = lista.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())

let userId
if (existente) {
  const { data, error } = await supabase.auth.admin.updateUserById(existente.id, {
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) fallar(`No se pudo actualizar la cuenta: ${error.message}`)
  userId = data.user.id
  console.log('  · La cuenta ya existía: se actualizó la contraseña.')
} else {
  const { data, error } = await supabase.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    // Sin confirmación por correo: es una cuenta interna con un correo que no
    // recibe nada. Si quedara sin confirmar, no podría iniciar sesión.
    email_confirm: true,
    user_metadata: { username: USERNAME },
  })
  if (error) fallar(`No se pudo crear la cuenta: ${error.message}`)
  userId = data.user.id
  console.log('  · Cuenta creada.')
}

// ── 2 · habilitarla como administradora ─────────────────────────────────────
// Tener cuenta no alcanza: las políticas RLS miran esta tabla.
const { error: errorAdmin } = await supabase
  .from('admin_users')
  .upsert({ user_id: userId, username: USERNAME, full_name: USERNAME }, { onConflict: 'user_id' })

if (errorAdmin) fallar(`No se pudo habilitar como administrador: ${errorAdmin.message}`)

console.log('  · Habilitada en admin_users.')
console.log(`\n  ✓ Listo. Entrá en /admin con el usuario «${USERNAME}».`)
console.log('    Acordate de borrar ADMIN_PASSWORD de .env.local.\n')
