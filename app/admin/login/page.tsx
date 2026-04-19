'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { LoginSchema, type LoginInput } from '@/lib/validations'

export default function AdminLoginPage() {
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
    if (result.role === 'admin') {
      router.refresh()
      router.push('/admin/dashboard')
    } else {
      setError('Acceso restringido a administradores')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-2xl shadow-lg shadow-indigo-500/20">
            🔐
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Administración</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">KioskoPlus — acceso exclusivo</p>
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
            <p className="rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <Button type="submit" loading={isSubmitting} className="mt-2 w-full" size="lg">
            Acceder al panel
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Panel de empleado:{' '}
          <a href="/empleados/login" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            /empleados/login
          </a>
        </p>
      </div>
    </div>
  )
}
