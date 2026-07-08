const SHOPIFY_DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const SHOPIFY_TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;
const API_VERSION = '2024-01';

const STOREFRONT_URL = `https://${SHOPIFY_DOMAIN}/api/${API_VERSION}/graphql.json`;

// Collection IDs (stable identifiers, never change unlike handles)
export const COLLECTION_IDS = {
  RDP_GANG_SHEETS: 'gid://shopify/Collection/351777194154',
  RDP_SINGLE_TRANSFERS: 'gid://shopify/Collection/351637831850',
  UPLOADED_SINGLE_TRANSFER: 'gid://shopify/Collection/351652511914',
  UPLOADED_GANG_SHEETS: 'gid://shopify/Collection/351891095722',
} as const;

async function storefrontFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await fetch(STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(json.errors[0]?.message ?? 'Shopify GraphQL error');
  }

  return json.data as T;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  description: string;
  productType: string;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  images: {
    edges: Array<{ node: { url: string; altText: string | null } }>;
  };
  collections: {
    edges: Array<{ node: { title: string; handle: string } }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: { amount: string; currencyCode: string };
        availableForSale: boolean;
      };
    }>;
  };
}

interface ProductsData {
  products: {
    edges: Array<{ node: ShopifyProduct }>;
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

const PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          description
          productType
          priceRange {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          images(first: 1) {
            edges {
              node { url altText }
            }
          }
          collections(first: 10) {
            edges {
              node { title handle }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price { amount currencyCode }
                availableForSale
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

export async function getProducts(first = 20, after?: string): Promise<ProductsData['products']> {
  const data = await storefrontFetch<ProductsData>(PRODUCTS_QUERY, { first, after });
  return data.products;
}

interface ProductData {
  product: ShopifyProduct;
}

const PRODUCT_BY_HANDLE_QUERY = `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      title
      handle
      description
      productType
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      images(first: 10) {
        edges {
          node { url altText }
        }
      }
      collections(first: 10) {
        edges {
          node { title handle }
        }
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            price { amount currencyCode }
            availableForSale
          }
        }
      }
    }
  }
`;

const PRODUCT_BY_ID_QUERY = `
  query GetProductById($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      description
      productType
      priceRange {
        minVariantPrice { amount currencyCode }
        maxVariantPrice { amount currencyCode }
      }
      images(first: 10) {
        edges {
          node { url altText }
        }
      }
      collections(first: 10) {
        edges {
          node { title handle }
        }
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            price { amount currencyCode }
            availableForSale
          }
        }
      }
    }
  }
`;

export async function getProductByHandle(handle: string): Promise<ShopifyProduct> {
  const data = await storefrontFetch<ProductData>(PRODUCT_BY_HANDLE_QUERY, { handle });
  if (!data.product) {
    throw new Error(`Product not found: ${handle}`);
  }
  return data.product;
}

export async function getProductById(id: string): Promise<ShopifyProduct> {
  const data = await storefrontFetch<ProductData>(PRODUCT_BY_ID_QUERY, { id });
  if (!data.product) {
    throw new Error(`Product not found: ${id}`);
  }
  return data.product;
}

const COLLECTION_PRODUCTS_QUERY = `
  query GetCollectionProducts($id: ID!, $first: Int!, $after: String) {
    collection(id: $id) {
      products(first: $first, after: $after) {
        edges {
          node {
            id
            title
            handle
            description
            productType
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            images(first: 10) {
              edges {
                node { url altText }
              }
            }
            collections(first: 10) {
              edges {
                node { title handle }
              }
            }
            variants(first: 100) {
              edges {
                node {
                  id
                  title
                  price { amount currencyCode }
                  availableForSale
                }
              }
            }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
`;

interface CollectionProductsData {
  collection: {
    products: {
      edges: Array<{ node: ShopifyProduct }>;
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  };
}

export async function getProductsByCollection(
  collectionId: string,
  first = 20,
  after?: string
): Promise<ProductsData['products']> {
  const data = await storefrontFetch<CollectionProductsData>(COLLECTION_PRODUCTS_QUERY, {
    id: collectionId,
    first,
    after,
  });
  if (!data.collection) {
    throw new Error(`Collection not found: ${collectionId}`);
  }
  return data.collection.products;
}

export function formatPrice(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount));
}

/** Shopify system/automated collection handles and titles to exclude from UI */
const SYSTEM_COLLECTION_HANDLES = new Set([
  'automated-collection', 'product', 'products', 'all', 'all-products',
  'frontpage', 'home-page', 'homepage', 'featured', 'new-arrivals',
]);
const SYSTEM_COLLECTION_TITLES = new Set([
  'Product', 'Products', 'Automated Collection', 'All Products',
  'Home page', 'Homepage', 'Featured', 'New Arrivals',
]);

/**
 * Collections that exist in Shopify but should be hidden from the shop page
 * entirely — both the filter button AND the products themselves.
 * Add collection handles here whenever a collection is for internal/upload use only.
 */
const SHOP_HIDDEN_COLLECTION_HANDLES = new Set([
  'custom',
  'custom-single-print',
  'custom-gang-sheet',
  'rdp-gang-sheets',
  'uploaded-single-transfer',
  'uploaded-gang-sheets',
]);
const SHOP_HIDDEN_COLLECTION_TITLES = new Set([
  'Custom',
  'Custom Single Print',
  'Custom Gang Sheet',
  'RDP Gang Sheets',
  'Uploaded Single Transfer',
  'Uploaded Gang Sheets',
]);

/** Returns whether a collection is user-created and visible (not system or shop-hidden) */
function isUserCollection(node: { title: string; handle: string }): boolean {
  return (
    !SYSTEM_COLLECTION_HANDLES.has(node.handle) &&
    !SYSTEM_COLLECTION_TITLES.has(node.title) &&
    !SHOP_HIDDEN_COLLECTION_HANDLES.has(node.handle) &&
    !SHOP_HIDDEN_COLLECTION_TITLES.has(node.title)
  );
}

/** Returns true if this product belongs to any shop-hidden collection and should not appear in the shop grid */
export function isHiddenFromShop(product: ShopifyProduct): boolean {
  return product.collections.edges.some(
    e =>
      SHOP_HIDDEN_COLLECTION_HANDLES.has(e.node.handle) ||
      SHOP_HIDDEN_COLLECTION_TITLES.has(e.node.title)
  );
}

/** Returns all user-created collection titles for a product */
export function getUserCollections(product: ShopifyProduct): string[] {
  return product.collections.edges
    .map(e => e.node)
    .filter(isUserCollection)
    .map(n => n.title);
}

/** Returns the first user-created collection title, falling back to productType or 'Print' */
export function getProductCategory(product: ShopifyProduct): string {
  const userCollections = getUserCollections(product);
  return userCollections[0] || product.productType || 'Print';
}

// ─── Shopify Storefront Cart API ───────────────────────────────────────────

export interface ShopifyCartLine {
  id: string;
  quantity: number;
  attributes: Array<{ key: string; value: string }>;
  merchandise: {
    id: string;
    title: string;
    price: { amount: string; currencyCode: string };
    product: {
      title: string;
      images: { edges: Array<{ node: { url: string } }> };
    };
  };
}

export interface ShopifyCart {
  id: string;
  checkoutUrl: string;
  lines: { edges: Array<{ node: ShopifyCartLine }> };
  cost: { totalAmount: { amount: string; currencyCode: string } };
}

export interface CartLineInput {
  merchandiseId: string;
  quantity: number;
  attributes?: Array<{ key: string; value: string }>;
}

const CART_FIELDS = `
  id
  checkoutUrl
  lines(first: 100) {
    edges {
      node {
        id
        quantity
        attributes { key value }
        merchandise {
          ... on ProductVariant {
            id
            title
            price { amount currencyCode }
            product {
              title
              images(first: 1) { edges { node { url } } }
            }
          }
        }
      }
    }
  }
  cost { totalAmount { amount currencyCode } }
`;

const CART_CREATE = `mutation CartCreate($lines: [CartLineInput!]) {
  cartCreate(input: { lines: $lines }) {
    cart { ${CART_FIELDS} }
    userErrors { field message }
  }
}`;

const CART_LINES_ADD = `mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
  cartLinesAdd(cartId: $cartId, lines: $lines) {
    cart { ${CART_FIELDS} }
    userErrors { field message }
  }
}`;

const CART_LINES_UPDATE = `mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
  cartLinesUpdate(cartId: $cartId, lines: $lines) {
    cart { ${CART_FIELDS} }
    userErrors { field message }
  }
}`;

const CART_LINES_REMOVE = `mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
  cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
    cart { ${CART_FIELDS} }
    userErrors { field message }
  }
}`;

const CART_QUERY = `query GetCart($cartId: ID!) {
  cart(id: $cartId) { ${CART_FIELDS} }
}`;

function assertNoUserErrors(errors: Array<{ message: string }>) {
  if (errors.length > 0) throw new Error(errors[0].message);
}

export async function cartCreate(lines: CartLineInput[]): Promise<ShopifyCart> {
  const data = await storefrontFetch<{ cartCreate: { cart: ShopifyCart; userErrors: Array<{ message: string }> } }>(CART_CREATE, { lines });
  assertNoUserErrors(data.cartCreate.userErrors);
  return data.cartCreate.cart;
}

export async function cartLinesAdd(cartId: string, lines: CartLineInput[]): Promise<ShopifyCart> {
  const data = await storefrontFetch<{ cartLinesAdd: { cart: ShopifyCart; userErrors: Array<{ message: string }> } }>(CART_LINES_ADD, { cartId, lines });
  assertNoUserErrors(data.cartLinesAdd.userErrors);
  return data.cartLinesAdd.cart;
}

export async function cartLinesUpdate(cartId: string, lines: Array<{ id: string; quantity: number }>): Promise<ShopifyCart> {
  const data = await storefrontFetch<{ cartLinesUpdate: { cart: ShopifyCart; userErrors: Array<{ message: string }> } }>(CART_LINES_UPDATE, { cartId, lines });
  assertNoUserErrors(data.cartLinesUpdate.userErrors);
  return data.cartLinesUpdate.cart;
}

export async function cartLinesRemove(cartId: string, lineIds: string[]): Promise<ShopifyCart> {
  const data = await storefrontFetch<{ cartLinesRemove: { cart: ShopifyCart; userErrors: Array<{ message: string }> } }>(CART_LINES_REMOVE, { cartId, lineIds });
  assertNoUserErrors(data.cartLinesRemove.userErrors);
  return data.cartLinesRemove.cart;
}

export async function getShopifyCart(cartId: string): Promise<ShopifyCart | null> {
  const data = await storefrontFetch<{ cart: ShopifyCart | null }>(CART_QUERY, { cartId });
  return data.cart;
}
