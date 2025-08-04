import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import { CreditCard, Truck, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const checkoutSchema = z.object({
  // Shipping Address
  firstName: z.string().min(2, 'Prénom requis'),
  lastName: z.string().min(2, 'Nom requis'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(10, 'Téléphone requis'),
  address: z.string().min(5, 'Adresse requise'),
  city: z.string().min(2, 'Ville requise'),
  postalCode: z.string().min(5, 'Code postal requis'),
  country: z.string().min(2, 'Pays requis'),
  
  // Payment
  cardNumber: z.string().min(16, 'Numéro de carte invalide'),
  cardName: z.string().min(3, 'Nom sur la carte requis'),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/([0-9]{2})$/, 'Format MM/YY'),
  cvv: z.string().min(3, 'CVV requis'),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export function Checkout() {
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { token, user } = useAuthStore();
  const [processing, setProcessing] = useState(false);
  
  const subtotal = getTotalPrice();
  const tax = subtotal * 0.2;
  const shipping = subtotal >= 500 ? 0 : 49.99;
  const total = subtotal + tax + shipping;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email || '',
      country: 'France',
    },
  });

  const onSubmit = async (data: CheckoutForm) => {
    if (!token) {
      toast.error('Veuillez vous connecter');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch('http://localhost:3003/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shippingAddress: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            city: data.city,
            postalCode: data.postalCode,
            country: data.country,
          },
          paymentMethod: {
            type: 'card',
            last4: data.cardNumber.slice(-4),
          },
        }),
      });

      if (response.ok) {
        const order = await response.json();
        clearCart();
        toast.success('Commande confirmée !');
        navigate(`/orders`);
      } else {
        throw new Error('Erreur lors de la commande');
      }
    } catch (error) {
      toast.error('Erreur lors du traitement de la commande');
    } finally {
      setProcessing(false);
    }
  };

  if (items.length === 0) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Finaliser la commande</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Shipping & Payment Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* Shipping Information */}
            <div className="enterprise-card p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <Truck className="h-6 w-6 mr-2 text-blue-900" />
                Informations de livraison
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Prénom</label>
                  <input
                    {...register('firstName')}
                    className="input-field"
                    placeholder="Jean"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.firstName.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="label">Nom</label>
                  <input
                    {...register('lastName')}
                    className="input-field"
                    placeholder="Dupont"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.lastName.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="label">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="input-field"
                    placeholder="jean@example.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="label">Téléphone</label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="input-field"
                    placeholder="06 12 34 56 78"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="label">Adresse</label>
                  <input
                    {...register('address')}
                    className="input-field"
                    placeholder="123 Rue de la Paix"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-sm mt-1">{errors.address.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="label">Ville</label>
                  <input
                    {...register('city')}
                    className="input-field"
                    placeholder="Paris"
                  />
                  {errors.city && (
                    <p className="text-red-500 text-sm mt-1">{errors.city.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="label">Code Postal</label>
                  <input
                    {...register('postalCode')}
                    className="input-field"
                    placeholder="75001"
                  />
                  {errors.postalCode && (
                    <p className="text-red-500 text-sm mt-1">{errors.postalCode.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="enterprise-card p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center">
                <CreditCard className="h-6 w-6 mr-2 text-blue-900" />
                Informations de paiement
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="label">Numéro de carte</label>
                  <input
                    {...register('cardNumber')}
                    className="input-field"
                    placeholder="1234 5678 9012 3456"
                    maxLength={16}
                  />
                  {errors.cardNumber && (
                    <p className="text-red-500 text-sm mt-1">{errors.cardNumber.message}</p>
                  )}
                </div>
                
                <div>
                  <label className="label">Nom sur la carte</label>
                  <input
                    {...register('cardName')}
                    className="input-field"
                    placeholder="JEAN DUPONT"
                  />
                  {errors.cardName && (
                    <p className="text-red-500 text-sm mt-1">{errors.cardName.message}</p>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date d'expiration</label>
                    <input
                      {...register('expiryDate')}
                      className="input-field"
                      placeholder="MM/YY"
                      maxLength={5}
                    />
                    {errors.expiryDate && (
                      <p className="text-red-500 text-sm mt-1">{errors.expiryDate.message}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="label">CVV</label>
                    <input
                      {...register('cvv')}
                      type="password"
                      className="input-field"
                      placeholder="123"
                      maxLength={4}
                    />
                    {errors.cvv && (
                      <p className="text-red-500 text-sm mt-1">{errors.cvv.message}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-gray-50 rounded-lg flex items-center">
                <Lock className="h-5 w-5 text-gray-600 mr-3" />
                <p className="text-sm text-gray-600">
                  Vos informations de paiement sont sécurisées et cryptées
                </p>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="enterprise-card p-6 sticky top-24">
              <h3 className="text-xl font-semibold mb-4">Résumé de la commande</h3>
              
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.product.name} x {item.quantity}
                    </span>
                    <span>{(item.product.price * item.quantity).toFixed(2)}€</span>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Sous-total</span>
                  <span>{subtotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">TVA (20%)</span>
                  <span>{tax.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Livraison</span>
                  <span className={shipping === 0 ? 'text-green-600' : ''}>
                    {shipping === 0 ? 'Gratuite' : `${shipping.toFixed(2)}€`}
                  </span>
                </div>
              </div>
              
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-xl font-semibold">
                  <span>Total TTC</span>
                  <span className="text-blue-900">{total.toFixed(2)}€</span>
                </div>
              </div>
              
              <button
                type="submit"
                disabled={processing}
                className="btn-primary w-full disabled:opacity-50"
              >
                {processing ? 'Traitement...' : 'Confirmer la commande'}
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-4">
                En confirmant, vous acceptez nos conditions générales de vente
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}