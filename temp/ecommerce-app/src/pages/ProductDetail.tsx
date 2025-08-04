import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, 
  ChevronLeft, 
  Truck, 
  Shield, 
  RefreshCw,
  Star,
  Zap,
  Package
} from 'lucide-react';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export function ProductDetail() {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { addItem } = useCartStore();
  const { token } = useAuthStore();

  const { data: product, isLoading } = useQuery(
    ['product', id],
    async () => {
      const response = await fetch(`http://localhost:3003/api/products/${id}`);
      return response.json();
    }
  );

  const handleAddToCart = async () => {
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
        body: JSON.stringify({ productId: product.id, quantity }),
      });

      if (response.ok) {
        addItem({
          productId: product.id,
          quantity,
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            images: product.images,
          },
        });
        toast.success(`${quantity} ${product.name} ajouté(s) au panier`);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'ajout au panier');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse">
          <div className="h-96 bg-gray-200 rounded-lg mb-8"></div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Produit non trouvé</h2>
        <Link to="/products" className="btn-primary">
          Retour aux produits
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <Link to="/products" className="flex items-center text-gray-600 hover:text-blue-900">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Retour aux produits
        </Link>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="enterprise-card p-6">
            <div className="aspect-w-1 aspect-h-1 mb-4">
              <img
                src={product.images[selectedImage] || product.images[0]}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg"
              />
            </div>
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`flex-shrink-0 ${
                      selectedImage === index ? 'ring-2 ring-blue-900' : ''
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} ${index + 1}`}
                      className="w-20 h-20 object-cover rounded"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* Product Info */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-2">{product.brand}</p>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{product.name}</h1>
            
            <div className="flex items-center mb-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                ))}
              </div>
              <span className="ml-2 text-gray-600">(47 avis)</span>
            </div>

            <p className="text-gray-600 mb-6">{product.description}</p>

            <div className="mb-6">
              <span className="text-4xl font-bold text-blue-900">{product.price.toFixed(2)}€</span>
              <span className="text-gray-500 ml-2">TTC</span>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-gray-100"
                >
                  -
                </button>
                <span className="px-6 py-2 font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-4 py-2 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
              
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="btn-primary flex-1 flex items-center justify-center disabled:opacity-50"
              >
                <ShoppingCart className="h-5 w-5 mr-2" />
                Ajouter au Panier
              </button>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              {product.stock > 10 ? (
                <p className="text-green-600 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  En stock ({product.stock} unités disponibles)
                </p>
              ) : product.stock > 0 ? (
                <p className="text-orange-600 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Stock limité ({product.stock} unités restantes)
                </p>
              ) : (
                <p className="text-red-600 flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Rupture de stock
                </p>
              )}
            </div>

            {/* Features */}
            <div className="space-y-3 mb-8">
              <div className="flex items-center text-gray-600">
                <Truck className="h-5 w-5 mr-3 text-blue-900" />
                Livraison gratuite à partir de 500€
              </div>
              <div className="flex items-center text-gray-600">
                <Shield className="h-5 w-5 mr-3 text-blue-900" />
                Garantie {product.specifications?.warranty || '2 ans'}
              </div>
              <div className="flex items-center text-gray-600">
                <RefreshCw className="h-5 w-5 mr-3 text-blue-900" />
                Retour gratuit sous 30 jours
              </div>
            </div>
          </div>

          {/* Specifications */}
          {product.specifications && (
            <div className="enterprise-card p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Zap className="h-6 w-6 mr-2 text-yellow-500" />
                Caractéristiques Techniques
              </h3>
              <dl className="space-y-2">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex justify-between py-2 border-b border-gray-100">
                    <dt className="font-medium text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </dt>
                    <dd className="text-gray-900">{value as string}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </motion.div>
      </div>

      {/* Product Description Tabs */}
      <div className="mt-12">
        <div className="enterprise-card p-6">
          <div className="border-b mb-6">
            <div className="flex space-x-8">
              <button className="pb-4 border-b-2 border-blue-900 font-medium text-blue-900">
                Description
              </button>
              <button className="pb-4 text-gray-500 hover:text-gray-700">
                Installation
              </button>
              <button className="pb-4 text-gray-500 hover:text-gray-700">
                Avis (47)
              </button>
            </div>
          </div>
          
          <div className="prose max-w-none">
            <h3>Description détaillée</h3>
            <p>{product.description}</p>
            
            <h4>Avantages principaux</h4>
            <ul>
              <li>Technologie de pointe pour une efficacité maximale</li>
              <li>Installation facile et rapide par nos experts certifiés</li>
              <li>Compatible avec tous les systèmes existants</li>
              <li>Support technique disponible 24/7</li>
            </ul>
            
            <h4>Applications</h4>
            <p>
              Idéal pour les installations résidentielles, commerciales et industrielles.
              Conçu pour résister aux conditions météorologiques extrêmes et offrir
              une performance optimale pendant des décennies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}