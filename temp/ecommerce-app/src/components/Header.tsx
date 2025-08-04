import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useCartStore } from '../stores/cartStore';
import { Sun, ShoppingCart, User, Menu, X, LogOut, Package } from 'lucide-react';

export function Header() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const cartItemsCount = getTotalItems();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      {/* Top Bar - Fortune 500 Style */}
      <div className="enterprise-gradient text-white py-2">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm">
            <div className="flex items-center space-x-4">
              <span>📧 support@solartech.com</span>
              <span>📱 1-800-SOLAR-99</span>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <span>🌍 Leader en Énergie Solaire</span>
              <span>⚡ Innovation Durable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <Sun className="h-10 w-10 text-yellow-500" />
            <div>
              <h1 className="text-2xl font-bold text-gradient">SolarTech</h1>
              <p className="text-xs text-gray-600">Enterprise Solutions</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-blue-900 font-medium">
              Accueil
            </Link>
            <Link to="/products" className="text-gray-700 hover:text-blue-900 font-medium">
              Produits
            </Link>
            <Link to="/products?category=solar-panels" className="text-gray-700 hover:text-blue-900 font-medium">
              Panneaux Solaires
            </Link>
            <Link to="/products?category=inverters" className="text-gray-700 hover:text-blue-900 font-medium">
              Onduleurs
            </Link>
            <Link to="/products?category=batteries" className="text-gray-700 hover:text-blue-900 font-medium">
              Batteries
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-gray-700 hover:text-blue-900">
              <ShoppingCart className="h-6 w-6" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemsCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 text-gray-700 hover:text-blue-900">
                  <User className="h-6 w-6" />
                  <span className="hidden md:inline">{user?.name}</span>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <Link to="/account" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
                    <User className="h-4 w-4 mr-2" />
                    Mon Compte
                  </Link>
                  <Link to="/orders" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
                    <Package className="h-4 w-4 mr-2" />
                    Mes Commandes
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Déconnexion
                  </button>
                </div>
              </div>
            ) : (
              <Link to="/login" className="btn-primary text-sm">
                Connexion
              </Link>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-700"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-2 space-y-1">
            <Link to="/" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
              Accueil
            </Link>
            <Link to="/products" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
              Tous les Produits
            </Link>
            <Link to="/products?category=solar-panels" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
              Panneaux Solaires
            </Link>
            <Link to="/products?category=inverters" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
              Onduleurs
            </Link>
            <Link to="/products?category=batteries" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
              Batteries
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/account" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Mon Compte
                </Link>
                <Link to="/orders" className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded">
                  Mes Commandes
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}