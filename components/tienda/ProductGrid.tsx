'use client'

import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { ProductCard } from './ProductCard'
import type { Category, Product } from '@/types/index'

interface ProductGridProps {
  products: Product[]
  categories: Category[]
}

export function ProductGrid({ products, categories }: ProductGridProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = products.filter((p) => {
    const matchCat = !activeCategory || p.category_id === activeCategory
    const matchSearch =
      !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.marca?.toLowerCase().includes(search.toLowerCase()) ?? false)
    return matchCat && matchSearch
  })

  return (
    <div className="flex flex-col gap-4">

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="search"
          placeholder="Buscar productos o marcas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 pl-9 pr-9 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filtro categorías */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <button
          onClick={() => setActiveCategory(null)}
          className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
            !activeCategory
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          Todos
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex-shrink-0 flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {cat.emoji && <span>{cat.emoji}</span>}
            {cat.nombre}
          </button>
        ))}
      </div>

      {/* Contador */}
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {search || activeCategory
          ? `${filtered.length} de ${products.length} productos`
          : `${products.length} productos`}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No se encontraron productos
            {search && <> para <span className="font-medium">&ldquo;{search}&rdquo;</span></>}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  )
}
