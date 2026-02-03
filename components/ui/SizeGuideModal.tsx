
import React from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SizeGuideModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-2xl border border-black p-6 md:p-12 animate-blur-in">
        <button onClick={onClose} className="absolute top-4 right-4 hover:rotate-90 transition-transform">
          <X size={24} />
        </button>
        
        <h2 className="font-jura text-2xl font-bold mb-8 uppercase border-b border-black pb-4">
          Data Sheet: Measurements
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-montserrat text-sm">
            <thead className="bg-zinc-100 font-jura font-bold uppercase">
              <tr>
                <th className="p-4">Size</th>
                <th className="p-4">Chest (cm)</th>
                <th className="p-4">Length (cm)</th>
                <th className="p-4">Sleeve (cm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              <tr>
                <td className="p-4 font-bold">S</td>
                <td className="p-4">52</td>
                <td className="p-4">70</td>
                <td className="p-4">22</td>
              </tr>
              <tr>
                <td className="p-4 font-bold">M</td>
                <td className="p-4">55</td>
                <td className="p-4">72</td>
                <td className="p-4">23</td>
              </tr>
              <tr>
                <td className="p-4 font-bold">L</td>
                <td className="p-4">58</td>
                <td className="p-4">74</td>
                <td className="p-4">24</td>
              </tr>
              <tr>
                <td className="p-4 font-bold">XL</td>
                <td className="p-4">62</td>
                <td className="p-4">76</td>
                <td className="p-4">25</td>
              </tr>
              <tr>
                <td className="p-4 font-bold">2XL</td>
                <td className="p-4">66</td>
                <td className="p-4">78</td>
                <td className="p-4">26</td>
              </tr>
              <tr>
                <td className="p-4 font-bold">3XL</td>
                <td className="p-4">70</td>
                <td className="p-4">80</td>
                <td className="p-4">27</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <p className="mt-8 text-xs font-mono text-zinc-500">
          [ SYSTEM NOTE: FITS ARE OVERSIZED BY DEFAULT ]
        </p>
      </div>
    </div>
  );
};

export default SizeGuideModal;
