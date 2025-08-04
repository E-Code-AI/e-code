import React from 'react';
import { useQuery } from 'react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Package, Calendar, CreditCard, ChevronRight, ShoppingBag } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Order {
  id: string;
  items: Array<{
    productId: string;
    quantity: number;
    product: {
      name: string;
      price: number;
      images: string[];
    };
  }>;
  total: number;
  status: string;
  createdAt: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  paymentMethod: {
    type: string;
    last4: string;
  };
}

export function Orders() {
  const navigate = useNavigate();
  const { token, isAuthenticated } = useAuthStore();

  const { data: orders = [], isLoading } = useQuery<Order[]>(
    ['orders'],
    async () => {
      const response = await fetch('http://localhost:3003/api/orders', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.json();
    },
    {
      enabled: !!token,
    }
  );

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'processing':
        return 'text-blue-600 bg-blue-50';
      case 'shipped':
        return 'text-purple-600 bg-purple-50';
      case 'delivered':
        return 'text-green-600 bg-green-50';
      case 'cancelled':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'processing':
        return 'En traitement';
      case 'shipped':
        return 'Expédiée';
      case 'delivered':
        return 'Livrée';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <ShoppingBag className="h-24 w-24 text-gray-300 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Aucune commande</h2>
          <p className="text-gray-600 mb-8">
            Vous n'avez pas encore passé de commande
          </p>
          <Link to="/products" className="btn-primary">
            Découvrir nos produits
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Mes Commandes</h1>

      <div className="space-y-6">
        {orders.map((order) => (
          <div key={order.id} className="enterprise-card p-6">
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Commande #{order.id.slice(-8).toUpperCase()}
                </h3>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  {format(new Date(order.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                </div>
              </div>
              <div className="mt-2 sm:mt-0">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-t border-b py-4 mb-4">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-center gap-4 py-2">
                  <img
                    src={item.product.images[0]}
                    alt={item.product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                    <p className="text-sm text-gray-600">
                      {item.quantity} x {item.product.price.toFixed(2)}€
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {(item.product.price * item.quantity).toFixed(2)}€
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Footer */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div className="mb-2 sm:mb-0">
                <p className="text-sm text-gray-600">
                  Livraison : {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </p>
                <p className="text-sm text-gray-600">
                  {order.shippingAddress.address}, {order.shippingAddress.postalCode} {order.shippingAddress.city}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Total TTC</p>
                <p className="text-2xl font-bold text-blue-900">{order.total.toFixed(2)}€</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mt-4 pt-4 border-t">
              <button className="btn-primary flex-1 sm:flex-initial">
                Suivre la livraison
              </button>
              <button className="btn-secondary flex-1 sm:flex-initial">
                Télécharger la facture
              </button>
              {order.status === 'delivered' && (
                <button className="btn-secondary flex-1 sm:flex-initial">
                  Laisser un avis
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}