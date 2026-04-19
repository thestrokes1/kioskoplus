'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { RegistroSchema, type RegistroInput } from '@/lib/validations'

export default function RegistroPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegistroInput>({ resolver: zodResolver(RegistroSchema) })

  async function onSubmit(data: RegistroInput) {
    setError('')
    const res = await fetch('/api/auth/registro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const { error: apiError } = (await res.json()) as { error?: string }
    if (apiError) {
      setError(apiError)
      return
    }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-sm">
      <div className="mb-6 text-center">
        <span className="text-4xl">🏪</span>
        <h1 className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">Crear cuenta</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Registrate para comprar en KioskoPlus</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Nombre"
            required
            error={errors.nombre?.message}
            {...register('nombre')}
          />
          <Input
            label="Apellido"
            required
            error={errors.apellido?.message}
            {...register('apellido')}
          />
        </div>
        <Input
          label="DNI"
          type="text"
          inputMode="numeric"
          required
          error={errors.dni?.message}
          {...register('dni')}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
          Crear cuenta
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        ¿Ya tenés cuenta?{' '}
        <a href="/login" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
          Iniciá sesión
        </a>
      </p>
    </div>
  )
}
