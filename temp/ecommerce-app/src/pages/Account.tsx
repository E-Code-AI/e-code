import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { User, Mail, Phone, MapPin, Package, Settings, LogOut } from 'lucide-react';

export function Account() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Mon Compte</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="enterprise-card p-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-blue-900 text-white rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold">
                  {user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900">{user.name}</h3>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>

            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'profile'
                    ? 'bg-blue-50 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <User className="h-5 w-5 mr-3" />
                Profil
              </button>
              <button
                onClick={() => setActiveTab('addresses')}
                className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'addresses'
                    ? 'bg-blue-50 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <MapPin className="h-5 w-5 mr-3" />
                Adresses
              </button>
              <button
                onClick={() => navigate('/orders')}
                className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Package className="h-5 w-5 mr-3" />
                Commandes
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'settings'
                    ? 'bg-blue-50 text-blue-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className="h-5 w-5 mr-3" />
                Paramètres
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-5 w-5 mr-3" />
                Déconnexion
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <div className="enterprise-card p-6">
              <h2 className="text-xl font-semibold mb-6">Informations personnelles</h2>
              
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="label">Nom complet</label>
                    <input
                      type="text"
                      className="input-field"
                      defaultValue={user.name}
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input-field"
                      defaultValue={user.email}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="label">Téléphone</label>
                    <input
                      type="tel"
                      className="input-field"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                  <div>
                    <label className="label">Date de naissance</label>
                    <input
                      type="date"
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">À propos</label>
                  <textarea
                    className="input-field"
                    rows={4}
                    placeholder="Parlez-nous de vos projets solaires..."
                  />
                </div>

                <div className="flex justify-end">
                  <button type="submit" className="btn-primary">
                    Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="enterprise-card p-6">
              <h2 className="text-xl font-semibold mb-6">Mes adresses</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Shipping Address */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3 flex items-center">
                    <MapPin className="h-5 w-5 mr-2 text-blue-900" />
                    Adresse de livraison
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Jean Dupont<br />
                    123 Rue de la Paix<br />
                    75001 Paris<br />
                    France<br />
                    +33 6 12 34 56 78
                  </p>
                  <button className="text-blue-900 text-sm mt-3 hover:underline">
                    Modifier
                  </button>
                </div>

                {/* Billing Address */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-3 flex items-center">
                    <Mail className="h-5 w-5 mr-2 text-blue-900" />
                    Adresse de facturation
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Identique à l'adresse de livraison
                  </p>
                  <button className="text-blue-900 text-sm mt-3 hover:underline">
                    Utiliser une adresse différente
                  </button>
                </div>
              </div>

              <button className="btn-secondary mt-6">
                Ajouter une nouvelle adresse
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="enterprise-card p-6">
              <h2 className="text-xl font-semibold mb-6">Paramètres du compte</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3">Notifications</h3>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-3" defaultChecked />
                      <span className="text-gray-700">
                        Recevoir les emails de confirmation de commande
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-3" defaultChecked />
                      <span className="text-gray-700">
                        Recevoir les mises à jour de livraison
                      </span>
                    </label>
                    <label className="flex items-center">
                      <input type="checkbox" className="mr-3" />
                      <span className="text-gray-700">
                        Recevoir les offres promotionnelles
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Sécurité</h3>
                  <button className="btn-secondary">
                    Changer le mot de passe
                  </button>
                </div>

                <div>
                  <h3 className="font-medium mb-3">Supprimer le compte</h3>
                  <p className="text-gray-600 text-sm mb-3">
                    Une fois votre compte supprimé, toutes vos données seront
                    définitivement effacées. Cette action est irréversible.
                  </p>
                  <button className="text-red-600 hover:underline text-sm">
                    Supprimer mon compte
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}