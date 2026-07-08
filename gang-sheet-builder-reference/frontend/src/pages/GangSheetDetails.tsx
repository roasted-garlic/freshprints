import React, { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { ChevronLeft } from 'lucide-react';
import { useCart } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';
import { getProductByHandle, ShopifyProduct, formatPrice } from '@/lib/shopify';

const GANG_SHEET_SIZE = '22" x 60"';
const DOT_BG = "bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxjaXJjbGUgY3g9IjIiIGN5PSIyIiByPSIyIiBmaWxsPSIjMDAwMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')]";

export default function GangSheetDetails() {
  const [match, params] = useRoute('/gang-sheet/:handle');
  const [, navigate] = useLocation();
  const [product, setProduct] = useState<ShopifyProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (!match || !params?.handle) return;
    getProductByHandle(params.handle)
      .then(p => {
        setProduct(p);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [match, params?.handle]);

  if (!match) return null;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="w-16 h-16 border-[4px] border-black border-t-retro-pink animate-spin rounded-full"></div>
        <p className="font-display text-2xl uppercase">Loading gang sheet...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <button
          onClick={() => navigate('/gang-sheets')}
          className="flex items-center gap-2 font-bold mb-8 hover:translate-x-1 transition-transform"
        >
          <ChevronLeft size={24} />
          Back to Gang Sheets
        </button>
        <div className="bg-white border-[4px] border-black shadow-[6px_6px_0px_#FF1493] p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="font-display text-2xl mb-3 text-red-600">Gang Sheet Not Found</h2>
          <p className="font-bold text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  const price = parseFloat(product.priceRange.minVariantPrice.amount);
  const totalPrice = price * quantity;
  const mainImage = product.images.edges[0]?.node;
  const variantId = product.variants.edges[0]?.node.id;

  const handleAddToCart = () => {
    addItem({
      name: product.title,
      type: 'gang-sheet',
      size: GANG_SHEET_SIZE,
      price: price,
      quantity,
      image: mainImage?.url || '',
      variantId: variantId || '',
    });
    toast({
      title: "Cowabunga!",
      description: `${product.title} added to your stash.`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <button
        onClick={() => navigate('/gang-sheets')}
        className="flex items-center gap-2 font-bold mb-8 hover:translate-x-1 transition-transform"
      >
        <ChevronLeft size={24} />
        Back to Gang Sheets
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Left: Full-Res Image */}
        <div className="flex flex-col gap-6">
          <div className={`${DOT_BG} border-[4px] border-black aspect-square flex items-center justify-center p-8 shadow-retro-large overflow-hidden`}>
            {mainImage ? (
              <img src={mainImage.url} alt={mainImage.altText ?? product.title} className="max-w-full max-h-full object-contain drop-shadow-lg" />
            ) : (
              <span className="font-display text-5xl text-gray-300">?</span>
            )}
          </div>

          {product.images.edges.length > 1 && (
            <div className="flex gap-3 overflow-x-auto">
              {product.images.edges.map((img, idx) => (
                <div key={idx} className="flex-shrink-0 w-20 h-20 border-[2px] border-black cursor-pointer hover:shadow-[2px_2px_0px_#000]">
                  <img src={img.node.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info */}
        <div className="flex flex-col gap-6">
          <div>
            <h1 className="font-display text-4xl mb-2 text-stroke-black">{product.title}</h1>
            <p className="text-gray-500 font-bold text-sm uppercase">Gang Sheet</p>
            {product.description && (
              <p className="text-base mt-4 leading-relaxed">{product.description}</p>
            )}
          </div>

          <div className="bg-white border-[3px] border-black p-6 shadow-retro space-y-6">
            {/* Gang Sheet Size */}
            <div>
              <h2 className="font-display text-2xl border-b-[3px] border-black pb-3 mb-4">Sheet Size</h2>
              <div className="p-4 border-[3px] border-black bg-retro-yellow font-bold text-lg">
                {GANG_SHEET_SIZE}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h3 className="font-display text-lg border-b-[3px] border-black pb-2 mb-3">Quantity</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center border-[3px] border-black bg-white font-display text-xl shadow-[2px_2px_0px_#000]"
                >
                  −
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 h-12 border-y-[3px] border-black text-center font-display text-xl focus:outline-none bg-retro-bg"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 flex items-center justify-center border-[3px] border-black bg-white font-display text-xl shadow-[2px_2px_0px_#000]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t-[3px] border-black pt-4 space-y-2">
              <div className="flex justify-between text-base">
                <span className="font-bold">Per Sheet:</span>
                <span className="font-display text-2xl">{formatPrice(product.priceRange.minVariantPrice.amount, product.priceRange.minVariantPrice.currencyCode)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span className="font-bold">Total:</span>
                <span className="font-display text-3xl">${totalPrice.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleAddToCart}
              className="w-full bg-retro-pink text-white border-[3px] border-black font-display font-bold text-lg py-4 shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-y-1 transition-all"
            >
              Snag This Sheet
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm font-bold text-gray-500 uppercase tracking-wide">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
            Live from Shopify
          </div>
        </div>
      </div>
    </div>
  );
}
