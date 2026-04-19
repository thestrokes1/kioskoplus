'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LoginSchema, type LoginInput } from '@/lib/validations'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) })

  async function onSubmit(data: LoginInput) {
    setError('')
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const { data: result, error: apiError } = (await res.json()) as {
      data?: { role: string }
      error?: string
    }
    if (apiError || !result) {
      setError(apiError ?? 'Error al iniciar sesión')
      return
    }
    router.refresh()
    if (result.role === 'admin') {
      router.push('/admin/dashboard')
    } else if (result.role === 'empleado') {
      router.push('/empleados/ventas')
    } else {
      router.push('/')
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-6 text-center">
        <span className="text-4xl">🏪</span>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">KioskoPlus</h1>
        <p className="mt-1 text-sm text-gray-500">Iniciá sesión en tu cuenta</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
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
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <Button type="submit" loading={isSubmitting} className="w-full mt-2" size="lg">
          Iniciar sesión
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-500">
        ¿No tenés cuenta?{' '}
        <a href="/registro" className="font-medium text-blue-600 hover:underline">
          Registrate
        </a>
      </p>
    </div>
  )
}
