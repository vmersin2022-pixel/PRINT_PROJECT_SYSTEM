import React, { useState } from 'react';
import { useApp } from '../context';
import { Product, Category } from '../types';
import FancyButton from '../components/ui/FancyButton';

const Admin: React.FC = () => {
  const { addProduct } = useApp();
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    price: 0,
    category: 't-shirts',
    description: '',
    images: ['https://picsum.photos/800/1000'],
    sizes: ['S', 'M', 'L', 'XL']
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.price) return;

    const newProduct: Product = {
      id: Date.now().toString(),
      name: formData.name!,
      price: Number(formData.price),
      category: formData.category as Category,
      description: formData.description || '',
      images: formData.images || [],
      sizes: formData.sizes || ['S', 'M', 'L'],
      isNew: true
    };

    addProduct(newProduct);
    alert('ITEM_ADDED_TO_DATABASE');
    setFormData({ ...formData, name: '', price: 0, description: '' });
  };

  return (
    <div className="min-h-screen pt-24 pb-12 bg-zinc-50">
      <div className="container mx-auto px-4 max-w-2xl">
        <h1 className="font-jura text-3xl font-bold uppercase mb-8 border-b border-black pb-4">
          Admin Console // Add Item
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 border border-zinc-200 shadow-lg">
          <div>
            <label className="block font-mono text-xs text-zinc-500 mb-1">PRODUCT_NAME</label>
            <input 
              type="text" 
              className="w-full bg-zinc-50 border border-zinc-300 p-3 font-jura focus:border-blue-900 focus:outline-none"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block font-mono text-xs text-zinc-500 mb-1">PRICE_USD</label>
              <input 
                type="number" 
                className="w-full bg-zinc-50 border border-zinc-300 p-3 font-jura focus:border-blue-900 focus:outline-none"
                value={formData.price}
                onChange={e => setFormData({...formData, price: Number(e.target.value)})}
                required
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-zinc-500 mb-1">CATEGORY</label>
              <select 
                className="w-full bg-zinc-50 border border-zinc-300 p-3 font-jura focus:border-blue-900 focus:outline-none"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value as Category})}
              >
                <option value="t-shirts">T-SHIRTS</option>
                <option value="sets">SETS</option>
                <option value="accessories">ACCESSORIES</option>
                <option value="sale">SALE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs text-zinc-500 mb-1">DESCRIPTION</label>
            <textarea 
              rows={4}
              className="w-full bg-zinc-50 border border-zinc-300 p-3 font-montserrat text-sm focus:border-blue-900 focus:outline-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <FancyButton type="submit" fullWidth variant="solid">
            Initialize Upload
          </FancyButton>
        </form>
      </div>
    </div>
  );
};

export default Admin;
