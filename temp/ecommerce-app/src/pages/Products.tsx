import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { Filter, Grid, List, Search } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { motion } from 'framer-motion';

export function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  
  const category = searchParams.get('category') || 'all';

  const { data: products = [], isLoading } = useQuery(
    ['products', category, searchQuery, sortBy],
    async () => {
      const params = new URLSearchParams();
      if (category !== 'all') params.append('category', category);
      if (searchQuery) params.append('search', searchQuery);
      if (sortBy) params.append('sort', sortBy);
      
      const response = await fetch(`http://localhost:3003/api/products?${params}`);
      return response.json();
    }
  );

  const categories = [
    { value: 'all', label: 'Tous les Produits' },
    { value: 'solar-panels', label: 'Panneaux Solaires' },
    { value: 'inverters', label: 'Onduleurs' },
    { value: 'batteries', label: 'Batteries' },
    { value: 'mounting', label: 'Montage' },
    { value: 'accessories', label: 'Accessoires' },
    { value: 'ev-charging', label: 'Charge VE' },
  ];

  const handleCategoryChange = (newCategory: string) => {
    setSearchParams({ category: newCategory });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="section-title">Nos Produits Solaires</h1>
        <p className="section-subtitle">
          Solutions professionnelles pour l'énergie renouvelable
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filters */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="enterprise-card p-6">
            <h3 className="font-semibold mb-4 flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filtres
            </h3>

            {/* Categories */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Catégories</h4>
              <div className="space-y-2">
                {categories.map((cat) => (
                  <label key={cat.value} className="flex items-center">
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={category === cat.value}
                      onChange={() => handleCategoryChange(cat.value)}
                      className="mr-2 text-blue-900 focus:ring-blue-900"
                    />
                    <span className="text-sm">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="mb-6">
              <h4 className="font-medium mb-3">Gamme de Prix</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">0€ - 100€</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">100€ - 500€</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">500€ - 1000€</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">1000€+</span>
                </label>
              </div>
            </div>

            {/* Brands */}
            <div>
              <h4 className="font-medium mb-3">Marques</h4>
              <div className="space-y-2">
                {['SunPower', 'Fronius', 'BYD', 'Enphase', 'SolarEdge'].map((brand) => (
                  <label key={brand} className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{brand}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          {/* Search and Sort Bar */}
          <div className="enterprise-card p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher des produits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                />
              </div>
              
              <div className="flex items-center gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-field"
                >
                  <option value="featured">En vedette</option>
                  <option value="price-asc">Prix croissant</option>
                  <option value="price-desc">Prix décroissant</option>
                  <option value="name">Nom A-Z</option>
                </select>

                <div className="flex items-center border rounded-md">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-blue-900 text-white' : 'text-gray-600'}`}
                  >
                    <Grid className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-blue-900 text-white' : 'text-gray-600'}`}
                  >
                    <List className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4 text-sm text-gray-600">
            {products.length} produits trouvés
          </div>

          {/* Products Grid/List */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">Aucun produit trouvé</p>
            </div>
          ) : (
            <motion.div
              layout
              className={`grid gap-6 ${
                viewMode === 'grid'
                  ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                  : 'grid-cols-1'
              }`}
            >
              {products.map((product: any) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}