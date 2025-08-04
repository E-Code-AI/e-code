import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { motion } from 'framer-motion';
import { 
  Sun, 
  Battery, 
  Zap, 
  Shield, 
  Award, 
  Truck, 
  CreditCard,
  Headphones,
  ChevronRight,
  Star
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';

export function Home() {
  const { data: featuredProducts = [] } = useQuery(
    'featured-products',
    async () => {
      const response = await fetch('http://localhost:3003/api/products/featured');
      return response.json();
    }
  );

  const features = [
    {
      icon: Shield,
      title: 'Garantie 25 Ans',
      description: 'Protection complète sur tous nos panneaux solaires'
    },
    {
      icon: Award,
      title: 'Certifié ISO',
      description: 'Normes internationales de qualité et sécurité'
    },
    {
      icon: Truck,
      title: 'Livraison Gratuite',
      description: 'Sur toutes les commandes de plus de 500€'
    },
    {
      icon: Headphones,
      title: 'Support 24/7',
      description: 'Assistance technique par des experts'
    }
  ];

  const stats = [
    { value: '15,000+', label: 'Installations Réalisées' },
    { value: '98%', label: 'Clients Satisfaits' },
    { value: '50MW', label: 'Capacité Installée' },
    { value: '10+', label: 'Années d\'Expérience' }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-900 via-blue-800 to-slate-900 text-white">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-5xl lg:text-6xl font-bold mb-6">
                L'Énergie Solaire <br />
                <span className="text-yellow-400">Pour l'Entreprise</span>
              </h1>
              <p className="text-xl mb-8 text-gray-200">
                Solutions solaires premium pour entreprises Fortune 500.
                Technologie de pointe, rentabilité garantie.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/products" className="btn-primary text-lg">
                  Découvrir nos Produits
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
                <button className="btn-secondary text-lg">
                  Demander un Devis
                </button>
              </div>
              <div className="mt-12 grid grid-cols-2 gap-8">
                {stats.slice(0, 2).map((stat, index) => (
                  <div key={index}>
                    <p className="text-4xl font-bold text-yellow-400">{stat.value}</p>
                    <p className="text-gray-300">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
              <img
                src="https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?w=800"
                alt="Solar Panels Installation"
                className="relative rounded-lg shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-900 rounded-full mb-4">
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="section-title">Produits Phares</h2>
            <p className="section-subtitle">
              Découvrez nos solutions solaires les plus populaires
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/products" className="btn-primary">
              Voir Tous les Produits
              <ChevronRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 enterprise-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl font-bold text-yellow-400 mb-2">{stat.value}</p>
                <p className="text-gray-300">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-yellow-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Sun className="h-16 w-16 text-yellow-500 mx-auto mb-6 animate-float" />
          <h2 className="text-3xl font-bold mb-4">
            Prêt à Passer au Solaire ?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Rejoignez les milliers d'entreprises qui ont fait le choix
            de l'énergie propre et économique.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/products" className="btn-primary text-lg">
              Commander Maintenant
            </Link>
            <button className="btn-secondary text-lg">
              Parler à un Expert
            </button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="section-title text-center">Témoignages Clients</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {[
              {
                name: 'Jean Dupont',
                company: 'Tech Industries SA',
                text: 'Installation impeccable et économies substantielles. ROI atteint en moins de 3 ans.',
                rating: 5
              },
              {
                name: 'Marie Laurent',
                company: 'Green Factory',
                text: 'Service client exceptionnel et produits de haute qualité. Hautement recommandé!',
                rating: 5
              },
              {
                name: 'Pierre Martin',
                company: 'EcoBuilding Corp',
                text: 'Solution complète et professionnelle. Notre empreinte carbone a diminué de 60%.',
                rating: 5
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="enterprise-card p-6"
              >
                <div className="flex mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4 italic">"{testimonial.text}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-sm text-gray-500">{testimonial.company}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}