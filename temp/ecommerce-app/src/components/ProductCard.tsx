import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Zap } from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  category: string;
  brand: string;
  stock: number;
  specifications?: any;
}

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const { token } = useAuthStore();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Veuillez vous connecter pour ajouter au panier');
      return;
    }

    try {
      const response = await fetch('http://localhost:3003/api/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId: product.id, quantity: 1 }),
      });

      if (response.ok) {
        addItem({
          productId: product.id,
          quantity: 1,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            images: product.images,
          },
        });
        toast.success('Produit ajouté au panier');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'ajout au panier');
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="product-card group"
    >
      <Link to={`/products/${product.id}`}>
        <div className="relative overflow-hidden rounded-lg mb-4">
          <img
            src={product.images[0]}
            alt={product.name}
            className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
          />
          {product.stock < 10 && product.stock > 0 && (
            <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs px-2 py-1 rounded">
              Stock limité
            </span>
          )}
          {product.stock === 0 && (
            <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
              Rupture de stock
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-gray-500">{product.brand}</p>
          <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
          
          {product.specifications?.power && (
            <div className="flex items-center text-sm text-gray-500">
              <Zap className="h-4 w-4 mr-1" />
              {product.specifications.power}
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <span className="text-2xl font-bold text-blue-900">
              {product.price.toFixed(2)}€
            </span>
          </div>
        </div>
      </Link>
      
      <button
        onClick={handleAddToCart}
        disabled={product.stock === 0}
        className="btn-primary w-full mt-4 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        {product.stock === 0 ? 'Indisponible' : 'Ajouter au Panier'}
      </button>
    </motion.div>
  );
}