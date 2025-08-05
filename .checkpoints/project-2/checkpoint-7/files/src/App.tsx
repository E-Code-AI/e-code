import React from 'react';
import './App.css';
import { App } from './components/App';
import { Header } from './components/Header';
import { Footer } from './components/Footer';

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        {/* Main app content */}
      </main>
      <Footer />
    </div>
  );
}

export default App;