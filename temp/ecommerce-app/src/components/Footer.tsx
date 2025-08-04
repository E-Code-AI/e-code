import React from 'react';
import { Link } from 'react-router-dom';
import { Sun, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Youtube } from 'lucide-react';

export function Footer() {
  return (
    <footer className="enterprise-gradient text-white mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <Sun className="h-10 w-10 text-yellow-400" />
              <div>
                <h3 className="text-xl font-bold">SolarTech Enterprise</h3>
                <p className="text-sm">Solutions Solaires Premium</p>
              </div>
            </div>
            <p className="text-gray-300 mb-4">
              Leader mondial en solutions d'énergie solaire pour entreprises et particuliers.
              Innovation, qualité et durabilité depuis 2010.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-yellow-400 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-yellow-400 transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-yellow-400 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="#" className="hover:text-yellow-400 transition-colors">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Liens Rapides</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/products" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Nos Produits
                </Link>
              </li>
              <li>
                <Link to="/products?category=solar-panels" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Panneaux Solaires
                </Link>
              </li>
              <li>
                <Link to="/products?category=inverters" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Onduleurs
                </Link>
              </li>
              <li>
                <Link to="/products?category=batteries" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Batteries
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Guide d'Installation
                </a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Services</h4>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Installation Professionnelle
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Maintenance & Support
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Financement
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Garantie Étendue
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-300 hover:text-yellow-400 transition-colors">
                  Certification
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-300">
                  123 Avenue de l'Innovation<br />
                  75008 Paris, France
                </span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-yellow-400" />
                <span className="text-gray-300">+33 1 80 90 11 22</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-yellow-400" />
                <span className="text-gray-300">contact@solartech.fr</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2025 SolarTech Enterprise. Tous droits réservés.
            </p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">
                Conditions Générales
              </a>
              <a href="#" className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">
                Politique de Confidentialité
              </a>
              <a href="#" className="text-gray-400 hover:text-yellow-400 text-sm transition-colors">
                Mentions Légales
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}