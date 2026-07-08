import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useCart } from '@/hooks/use-cart';
import { RetroButton } from '@/components/RetroButton';
import { useToast } from '@/hooks/use-toast';
import { getProductsByCollection, type ShopifyProduct, formatPrice, COLLECTION_IDS } from '@/lib/shopify';

const GANG_SHEET_SIZE = '22" x 60"';
const DOT_BG = "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIyIiBmaWxsPSIjMDAwMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')]";

export default function GangSheets() {
  const [, navigate] = useLocation();
  const { addItem } = useCart();
  const { toast } = useToast();
  const [sheets, setSheets] = useState<Array<ShopifyProduct & { size: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSheets = async () => {
      try {
        setIsLoading(true);
        const data = await getProductsByCollection(COLLECTION_IDS.RDP_GANG_SHEETS, 20);
        const formattedSheets = data.edges.map(edge => ({
          ...edge.node,
          size: GANG_SHEET_SIZE,
        }));
        setSheets(formattedSheets);
        setError(null);
      } catch (err) {
        console.error('Failed to load gang sheets:', err);
        setError('Failed to load gang sheets. Please try again later.');
        setSheets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSheets();
  }, []);

  const handleAddToCart = (sheet: typeof sheets[0]) => {
    const price = parseFloat(sheet.priceRange.minVariantPrice.amount);
    const imageUrl = sheet.images.edges[0]?.node.url || '';
    const variantId = sheet.variants.edges[0]?.node.id || '';
    
    addItem({
      name: sheet.title,
      type: 'gang-sheet',
      size: sheet.size,
      price: price,
      quantity: 1,
      image: imageUrl,
      variantId,
    });
    toast({ title: 'Cowabunga!', description: `${sheet.title} added to cart.` });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl text-white text-stroke-black shadow-[4px_4px_0px_#39FF14] inline-block mb-6 rotate-1">
          Ready Made Gang Sheets
        </h1>
        <p className="text-xl font-bold max-w-2xl mx-auto">
          Get maximum bang for your buck with our pre-packed gang sheets! Tons of designs crammed into one sheet. Just cut 'em out and press.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="w-12 h-12 border-[4px] border-black border-t-retro-pink rounded-full animate-spin mx-auto mb-4" />
            <p className="font-bold text-gray-600">Loading radical gang sheets...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-retro-pink border-[3px] border-black p-6 shadow-retro text-white font-bold text-center">
          {error}
        </div>
      )}

      {!isLoading && !error && sheets.length === 0 && (
        <div className="text-center py-20">
          <p className="font-display text-2xl mb-4">No gang sheets available yet.</p>
          <p className="font-bold text-gray-600">Check back soon!</p>
        </div>
      )}

      {!isLoading && !error && sheets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {sheets.map(sheet => (
            <div key={sheet.id} className="bg-white border-[4px] border-black shadow-retro-large flex flex-col group">
              <button
                onClick={() => navigate(`/gang-sheet/${sheet.handle}`)}
                className="cursor-pointer"
              >
                <div className={`${DOT_BG} border-b-[4px] border-black p-4 flex items-center justify-center overflow-hidden h-80 group-hover:opacity-90 transition-opacity`}>
                  <img src={sheet.images.edges[0]?.node.url || ''} alt={sheet.title} className="h-full object-contain shadow-md border-2 border-gray-300 group-hover:scale-105 transition-transform" />
                </div>
              </button>
              <div className="p-6 flex-1 flex flex-col">
                <button
                  onClick={() => navigate(`/gang-sheet/${sheet.handle}`)}
                  className="text-left hover:text-retro-pink transition-colors cursor-pointer"
                >
                  <h3 className="font-display text-2xl">{sheet.title}</h3>
                </button>
                <div className="flex justify-between items-start mb-4 mt-2">
                  <span className="font-bold text-xl bg-retro-yellow px-2 border-2 border-black whitespace-nowrap">{formatPrice(sheet.priceRange.minVariantPrice.amount, sheet.priceRange.minVariantPrice.currencyCode)}</span>
                </div>
                <div className="font-bold text-gray-500 mb-6 flex items-center gap-2">
                  <span className="inline-block w-3 h-3 bg-retro-purple border border-black"></span>
                  Sheet Size: {sheet.size}
                </div>
                
                <RetroButton className="w-full mt-auto" color="#9B00FF" onClick={() => handleAddToCart(sheet)}>
                  Snag This Sheet
                </RetroButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
