import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { Request, Response } from 'express';

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (in production, use a database)
const users = new Map();
const products = new Map();
const cart = new Map();
const orders = new Map();

// Initialize products from qualiwatt.pro
const initializeProducts = () => {
  const solarProducts = [
    {
      id: '1',
      name: 'Panneau Solaire Monocristallin 450W',
      description: 'Panneau solaire haute efficacité avec technologie monocristalline PERC, idéal pour les installations résidentielles et commerciales.',
      price: 289.99,
      category: 'solar-panels',
      brand: 'SunPower',
      images: ['https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800'],
      specifications: {
        power: '450W',
        efficiency: '22.8%',
        dimensions: '2094 x 1134 x 35mm',
        weight: '25.5kg',
        warranty: '25 ans',
        cells: '144 cellules monocristallines'
      },
      stock: 150,
      featured: true
    },
    {
      id: '2',
      name: 'Onduleur Hybride 5kW',
      description: 'Onduleur hybride intelligent avec connexion réseau et batterie, surveillance en temps réel via application mobile.',
      price: 1899.99,
      category: 'inverters',
      brand: 'Fronius',
      images: ['https://images.unsplash.com/photo-1565043666747-69f6646db940?w=800'],
      specifications: {
        power: '5000W',
        efficiency: '98.2%',
        input: 'DC 150-550V',
        output: 'AC 230V/50Hz',
        protection: 'IP65',
        warranty: '10 ans'
      },
      stock: 45,
      featured: true
    },
    {
      id: '3',
      name: 'Batterie Lithium 10kWh',
      description: 'Batterie de stockage lithium-ion haute capacité pour systèmes solaires résidentiels, avec BMS intégré.',
      price: 4599.99,
      category: 'batteries',
      brand: 'BYD',
      images: ['https://images.unsplash.com/photo-1620288627223-53302f4e8c74?w=800'],
      specifications: {
        capacity: '10.24 kWh',
        voltage: '51.2V',
        cycles: '6000+ cycles',
        efficiency: '>95%',
        warranty: '10 ans',
        technology: 'LiFePO4'
      },
      stock: 28,
      featured: true
    },
    {
      id: '4',
      name: 'Micro-onduleur 800W',
      description: 'Micro-onduleur pour optimisation panneau par panneau, monitoring individuel et sécurité maximale.',
      price: 189.99,
      category: 'inverters',
      brand: 'Enphase',
      images: ['https://images.unsplash.com/photo-1566458991505-5f5b972d0c2f?w=800'],
      specifications: {
        power: '800W',
        efficiency: '97.5%',
        mppt: '2 trackers',
        warranty: '25 ans',
        monitoring: 'WiFi intégré'
      },
      stock: 200
    },
    {
      id: '5',
      name: 'Structure de Montage Toiture',
      description: 'Kit complet de rails et fixations pour montage sur toiture inclinée, aluminium anodisé résistant.',
      price: 149.99,
      category: 'mounting',
      brand: 'K2 Systems',
      images: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800'],
      specifications: {
        material: 'Aluminium 6005-T5',
        load: 'Jusqu\'à 2.4kN/m²',
        angle: '15-60°',
        warranty: '12 ans',
        compatibility: 'Tous panneaux'
      },
      stock: 300
    },
    {
      id: '6',
      name: 'Câbles Solaires MC4 - 50m',
      description: 'Câbles solaires double isolation avec connecteurs MC4, résistants UV et intempéries.',
      price: 89.99,
      category: 'accessories',
      brand: 'Stäubli',
      images: ['https://images.unsplash.com/photo-1565043589221-1a6373823f33?w=800'],
      specifications: {
        length: '50m (2x25m)',
        section: '6mm²',
        voltage: '1000V DC',
        temperature: '-40°C à +90°C',
        certification: 'TÜV/UL'
      },
      stock: 150
    },
    {
      id: '7',
      name: 'Optimiseur de Puissance',
      description: 'Optimiseur DC pour maximiser la production de chaque panneau individuellement.',
      price: 79.99,
      category: 'accessories',
      brand: 'SolarEdge',
      images: ['https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?w=800'],
      specifications: {
        power: 'Jusqu\'à 730W',
        efficiency: '99.5%',
        warranty: '25 ans',
        monitoring: 'Niveau panneau',
        safety: 'Arrêt automatique'
      },
      stock: 180
    },
    {
      id: '8',
      name: 'Station de Charge EV 7.4kW',
      description: 'Borne de recharge pour véhicules électriques, compatible charge solaire intelligente.',
      price: 899.99,
      category: 'ev-charging',
      brand: 'Wallbox',
      images: ['https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?w=800'],
      specifications: {
        power: '7.4kW',
        connector: 'Type 2',
        protection: 'IP54/IK10',
        features: 'App, RFID, Solar',
        warranty: '3 ans'
      },
      stock: 35,
      featured: true
    }
  ];

  solarProducts.forEach(product => {
    products.set(product.id, product);
  });
};

// Initialize products on startup
initializeProducts();

// Authentication middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !users.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.userId = token;
  next();
};

// Auth routes
app.post('/api/register', (req, res) => {
  const { email, password, name } = req.body;
  const userId = crypto.randomBytes(16).toString('hex');
  
  // Check if email exists
  for (const [id, user] of users) {
    if (user.email === email) {
      return res.status(400).json({ error: 'Email already exists' });
    }
  }
  
  users.set(userId, {
    id: userId,
    email,
    password: crypto.createHash('sha256').update(password).digest('hex'),
    name,
    createdAt: new Date()
  });
  
  // Initialize empty cart
  cart.set(userId, []);
  
  res.json({ 
    token: userId, 
    user: { 
      id: userId, 
      email, 
      name
    } 
  });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  
  for (const [id, user] of users) {
    if (user.email === email && user.password === hashedPassword) {
      return res.json({ 
        token: id, 
        user: { 
          id, 
          email: user.email, 
          name: user.name
        } 
      });
    }
  }
  
  res.status(401).json({ error: 'Invalid credentials' });
});

// Products routes
app.get('/api/products', (req, res) => {
  const { category, search, sort } = req.query;
  let productList = Array.from(products.values());
  
  // Filter by category
  if (category && category !== 'all') {
    productList = productList.filter(p => p.category === category);
  }
  
  // Search
  if (search) {
    const searchLower = search.toString().toLowerCase();
    productList = productList.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.description.toLowerCase().includes(searchLower) ||
      p.brand.toLowerCase().includes(searchLower)
    );
  }
  
  // Sort
  if (sort === 'price-asc') {
    productList.sort((a, b) => a.price - b.price);
  } else if (sort === 'price-desc') {
    productList.sort((a, b) => b.price - a.price);
  } else if (sort === 'name') {
    productList.sort((a, b) => a.name.localeCompare(b.name));
  }
  
  res.json(productList);
});

app.get('/api/products/featured', (req, res) => {
  const featuredProducts = Array.from(products.values()).filter(p => p.featured);
  res.json(featuredProducts);
});

app.get('/api/products/:id', (req, res) => {
  const product = products.get(req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// Cart routes
app.get('/api/cart', authenticate, (req: any, res) => {
  const userCart = cart.get(req.userId) || [];
  res.json(userCart);
});

app.post('/api/cart/add', authenticate, (req: any, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = products.get(productId);
  
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  
  if (product.stock < quantity) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }
  
  let userCart = cart.get(req.userId) || [];
  const existingItem = userCart.find((item: any) => item.productId === productId);
  
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    userCart.push({
      productId,
      quantity,
      product,
      addedAt: new Date()
    });
  }
  
  cart.set(req.userId, userCart);
  res.json(userCart);
});

app.put('/api/cart/update', authenticate, (req: any, res) => {
  const { productId, quantity } = req.body;
  let userCart = cart.get(req.userId) || [];
  
  if (quantity === 0) {
    userCart = userCart.filter((item: any) => item.productId !== productId);
  } else {
    const item = userCart.find((item: any) => item.productId === productId);
    if (item) {
      item.quantity = quantity;
    }
  }
  
  cart.set(req.userId, userCart);
  res.json(userCart);
});

app.delete('/api/cart/:productId', authenticate, (req: any, res) => {
  let userCart = cart.get(req.userId) || [];
  userCart = userCart.filter((item: any) => item.productId !== req.params.productId);
  cart.set(req.userId, userCart);
  res.json(userCart);
});

// Orders routes
app.post('/api/orders', authenticate, (req: any, res) => {
  const { shippingAddress, paymentMethod } = req.body;
  const userCart = cart.get(req.userId) || [];
  
  if (userCart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }
  
  const orderId = crypto.randomBytes(16).toString('hex');
  const orderTotal = userCart.reduce((sum: number, item: any) => 
    sum + (item.product.price * item.quantity), 0
  );
  
  const order = {
    id: orderId,
    userId: req.userId,
    items: userCart,
    total: orderTotal,
    shippingAddress,
    paymentMethod,
    status: 'pending',
    createdAt: new Date()
  };
  
  orders.set(orderId, order);
  
  // Clear cart
  cart.set(req.userId, []);
  
  // Update stock
  userCart.forEach((item: any) => {
    const product = products.get(item.productId);
    if (product) {
      product.stock -= item.quantity;
    }
  });
  
  res.json(order);
});

app.get('/api/orders', authenticate, (req: any, res) => {
  const userOrders = Array.from(orders.values())
    .filter((order: any) => order.userId === req.userId)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(userOrders);
});

app.get('/api/orders/:id', authenticate, (req: any, res) => {
  const order = orders.get(req.params.id);
  if (!order || order.userId !== req.userId) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`E-commerce Server running on port ${PORT}`);
});