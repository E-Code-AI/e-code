import React from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export function Cart() {
  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();
  const { token } = useAuthStore();
  const totalPrice = getTotalPrice();

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (!token) return;

    try {
      const response = await fetch('http://localhost:3003/api/cart/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId, quantity: newQuantity }),
      });

      if (response.ok) {
        updateQuantity(productId, newQuantity);
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleRemoveItem = async (productId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:3003/api/cart/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        removeItem(productId);
        toast.success('Produit retiré du panier');
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <ShoppingBag className="h-24 w-24 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Votre panier est vide</h2>
          <p className="text-gray-600 mb-8">
            Découvrez nos produits solaires de haute qualité
          </p>
          <Link to="/products" className="btn-primary">
            Continuer mes achats
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Mon Panier</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="enterprise-card p-6">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-4 py-4 border-b last:border-0">
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-24 h-24 object-cover rounded"
                />
                
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    <Link to={`/products/${item.productId}`} className="hover:text-blue-900">
                      {item.product.name}
                    </Link>
                  </h3>
                  <p className="text-gray-600 mt-1">{item.product.price.toFixed(2)}€</p>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border rounded">
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                        className="px-3 py-1 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <span className="px-4 py-1">{item.quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
                        className="px-3 py-1 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleRemoveItem(item.productId)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-semibold text-lg">
                    {(item.product.price * item.quantity).toFixed(2)}€
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="enterprise-card p-6 sticky top-24">
            <h3 className="text-xl font-semibold mb-4">Résumé de la commande</h3>
            
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Sous-total</span>
                <span>{totalPrice.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">TVA (20%)</span>
                <span>{(totalPrice * 0.2).toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Livraison</span>
                <span className="text-green-600">
                  {totalPrice >= 500 ? 'Gratuite' : '49.99€'}
                </span>
              </div>
            </div>
            
            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-xl font-semibold">
                <span>Total TTC</span>
                <span className="text-blue-900">
                  {(totalPrice * 1.2 + (totalPrice >= 500 ? 0 : 49.99)).toFixed(2)}€
                </span>
              </div>
            </div>
            
            <Link to="/checkout" className="btn-primary w-full flex items-center justify-center">
              Procéder au paiement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            
            <Link to="/products" className="btn-secondary w-full mt-3">
              Continuer mes achats
            </Link>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Livraison gratuite</strong> à partir de 500€ d'achat !
                Plus que {Math.max(0, 500 - totalPrice).toFixed(2)}€ pour en bénéficier.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}