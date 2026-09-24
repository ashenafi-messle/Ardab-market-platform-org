// ==============================================================================
// Ardab Market - Mobile Customer Category Service
// ==============================================================================
// Provides unified hierarchical category data from backend / catalog API
// with resilient fallback to verified Ethiopian marketplace category tree.

import { Platform } from 'react-native';

export interface CategoryNode {
  id: string;
  name: string;
  nameAmharic?: string;
  slug: string;
  icon?: string;
  image?: string;
  imageUrl?: string;
  bannerImage?: string;
  parentId?: string | null;
  productCount: number;
  featured?: boolean;
  children: CategoryNode[];
}

// Dynamic API base URL based on environment/platform
const getApiBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

const API_BASE = getApiBaseUrl();

// Pre-seeded comprehensive 3-level Ethiopian Marketplace Category Hierarchy
export const DEFAULT_CATEGORY_TREE: CategoryNode[] = [
  {
    id: 'cat-groceries',
    name: 'Groceries & Foods',
    nameAmharic: 'የሸቀጣሸቀጥ እና የምግብ እቃዎች',
    slug: 'groceries-foods',
    icon: 'nutrition-outline',
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
    productCount: 142,
    featured: true,
    children: [
      {
        id: 'sub-teff-grains',
        name: 'Teff & Grains',
        nameAmharic: 'ጤፍ እና እህሎች',
        slug: 'teff-grains',
        parentId: 'cat-groceries',
        productCount: 45,
        children: [
          { id: 'leaf-magna-teff', name: 'Magna White Teff', nameAmharic: 'ነጭ ማኛ ጤፍ', slug: 'magna-white-teff', parentId: 'sub-teff-grains', productCount: 22, children: [] },
          { id: 'leaf-sergegna-teff', name: 'Sergegna Mixed Teff', nameAmharic: 'ሰርገኛ ጤፍ', slug: 'sergegna-teff', parentId: 'sub-teff-grains', productCount: 14, children: [] },
          { id: 'leaf-wheat-barley', name: 'Wheat & Barley', nameAmharic: 'ስንዴ እና ገብስ', slug: 'wheat-barley', parentId: 'sub-teff-grains', productCount: 9, children: [] },
        ],
      },
      {
        id: 'sub-coffee-tea',
        name: 'Ethiopian Coffee & Tea',
        nameAmharic: 'ቡና እና ሻይ',
        slug: 'coffee-tea',
        parentId: 'cat-groceries',
        productCount: 38,
        children: [
          { id: 'leaf-yirgacheffe-beans', name: 'Yirgacheffe Washed Coffee', nameAmharic: 'ይርጋጨፌ ታጥቦ የተዘጋጀ ቡና', slug: 'yirgacheffe-coffee', parentId: 'sub-coffee-tea', productCount: 18, children: [] },
          { id: 'leaf-sidama-coffee', name: 'Sidama Highland Coffee', nameAmharic: 'ሲዳማ ቡና', slug: 'sidama-coffee', parentId: 'sub-coffee-tea', productCount: 12, children: [] },
          { id: 'leaf-harar-coffee', name: 'Harar Longberry Coffee', nameAmharic: 'የሐረር ሎንግቤሪ ቡና', slug: 'harar-coffee', parentId: 'sub-coffee-tea', productCount: 8, children: [] },
        ],
      },
      {
        id: 'sub-spices',
        name: 'Spices & Berbere',
        nameAmharic: 'ቅመማ ቅመም እና በርበሬ',
        slug: 'spices-berbere',
        parentId: 'cat-groceries',
        productCount: 32,
        children: [
          { id: 'leaf-gondar-berbere', name: 'Pure Gondar Berbere', nameAmharic: 'የጎንደር ንፁህ በርበሬ', slug: 'gondar-berbere', parentId: 'sub-spices', productCount: 15, children: [] },
          { id: 'leaf-shiro-powder', name: 'Shiro & Pea Powder', nameAmharic: 'የተመረጠ የሽሮ ዱቄት', slug: 'shiro-powder', parentId: 'sub-spices', productCount: 10, children: [] },
          { id: 'leaf-korarima', name: 'Korarima & Cardamom', nameAmharic: 'ኮረሪማ እና ቅመሞች', slug: 'korarima', parentId: 'sub-spices', productCount: 7, children: [] },
        ],
      },
      {
        id: 'sub-oil-honey',
        name: 'Honey & Oils',
        nameAmharic: 'ማር እና ዘይት',
        slug: 'honey-oils',
        parentId: 'cat-groceries',
        productCount: 27,
        children: [
          { id: 'leaf-white-honey', name: 'Pure White Honey', nameAmharic: 'የተጣራ ነጭ ማር', slug: 'white-honey', parentId: 'sub-oil-honey', productCount: 16, children: [] },
          { id: 'leaf-niger-oil', name: 'Niger Seed Oil', nameAmharic: 'የኑግ ዘይት', slug: 'niger-oil', parentId: 'sub-oil-honey', productCount: 11, children: [] },
        ],
      },
    ],
  },
  {
    id: 'cat-fashion',
    name: 'Traditional & Fashion',
    nameAmharic: 'ባህላዊ እና ዘመናዊ አልባሳት',
    slug: 'traditional-fashion',
    icon: 'shirt-outline',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    productCount: 88,
    featured: true,
    children: [
      {
        id: 'sub-habesha-kemis',
        name: 'Habesha Kemis',
        nameAmharic: 'የሀበሻ ቀሚስ',
        slug: 'habesha-kemis',
        parentId: 'cat-fashion',
        productCount: 34,
        children: [
          { id: 'leaf-tilf-festive', name: 'Festive Embroidered Tilf', nameAmharic: 'የበዓል ጥልፍ ቀሚስ', slug: 'tilf-festive', parentId: 'sub-habesha-kemis', productCount: 16, children: [] },
          { id: 'leaf-modern-habesha', name: 'Modern Styled Kemis', nameAmharic: 'ዘመናዊ የሀበሻ ቀሚስ', slug: 'modern-kemis', parentId: 'sub-habesha-kemis', productCount: 11, children: [] },
          { id: 'leaf-wedding-kemis', name: 'Wedding Traditional Gowns', nameAmharic: 'የሰርግ ባህላዊ ቀሚስ', slug: 'wedding-kemis', parentId: 'sub-habesha-kemis', productCount: 7, children: [] },
        ],
      },
      {
        id: 'sub-mens-traditional',
        name: 'Men’s Traditional',
        nameAmharic: 'የወንዶች ባህላዊ ልብስ',
        slug: 'mens-traditional',
        parentId: 'cat-fashion',
        productCount: 20,
        children: [
          { id: 'leaf-mens-tilf-shirts', name: 'Embroidered Tilf Shirts', nameAmharic: 'የጥልፍ ሸሚዞች', slug: 'mens-tilf-shirts', parentId: 'sub-mens-traditional', productCount: 10, children: [] },
          { id: 'leaf-mens-full-suits', name: 'Traditional Full Suits', nameAmharic: 'ሙሉ ባህላዊ ልብስ', slug: 'mens-full-suits', parentId: 'sub-mens-traditional', productCount: 6, children: [] },
          { id: 'leaf-mens-trousers', name: 'Traditional Trousers', nameAmharic: 'ባህላዊ ሱሪዎች', slug: 'mens-trousers', parentId: 'sub-mens-traditional', productCount: 4, children: [] },
        ],
      },
      {
        id: 'sub-scarves-netela',
        name: 'Netela & Gabi',
        nameAmharic: 'ነጠላ እና ጋቢ',
        slug: 'netela-gabi',
        parentId: 'cat-fashion',
        productCount: 18,
        children: [
          { id: 'leaf-cotton-gabi', name: 'Pure Double Cotton Gabi', nameAmharic: 'ድርብ ጥጥ ጋቢ', slug: 'cotton-gabi', parentId: 'sub-scarves-netela', productCount: 10, children: [] },
          { id: 'leaf-tibeb-netela', name: 'Tibeb Bordered Netela', nameAmharic: 'ባለ ጥበብ ነጠላ', slug: 'tibeb-netela', parentId: 'sub-scarves-netela', productCount: 8, children: [] },
        ],
      },
      {
        id: 'sub-shoes-accessories',
        name: 'Leather Goods & Shoes',
        nameAmharic: 'የቆዳ ጫማና እቃዎች',
        slug: 'leather-shoes',
        parentId: 'cat-fashion',
        productCount: 16,
        children: [
          { id: 'leaf-leather-sandals', name: 'Handcrafted Sandals', nameAmharic: 'የቆዳ ጫማና ሳንደል', slug: 'leather-sandals', parentId: 'sub-shoes-accessories', productCount: 9, children: [] },
          { id: 'leaf-leather-bags', name: 'Genuine Leather Bags', nameAmharic: 'የቆዳ ቦርሳዎች', slug: 'leather-bags', parentId: 'sub-shoes-accessories', productCount: 7, children: [] },
        ],
      },
    ],
  },
  {
    id: 'cat-electronics',
    name: 'Electronics & Power',
    nameAmharic: 'ኤሌክትሮኒክስ እና የኃይል እቃዎች',
    slug: 'electronics-power',
    icon: 'hardware-chip-outline',
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=400&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=800&q=80',
    productCount: 96,
    featured: true,
    children: [
      {
        id: 'sub-solar-power',
        name: 'Solar & Power Banks',
        nameAmharic: 'የፀሐይ ኃይል እና ፓወር ባንክ',
        slug: 'solar-power',
        parentId: 'cat-electronics',
        productCount: 28,
        children: [
          { id: 'leaf-solar-panels', name: 'Solar Panels & Kits', nameAmharic: 'የፀሐይ ኃይል ኪቶች', slug: 'solar-panels', parentId: 'sub-solar-power', productCount: 14, children: [] },
          { id: 'leaf-power-banks', name: 'Heavy Duty Power Banks', nameAmharic: 'ፓወር ባንክ', slug: 'power-banks', parentId: 'sub-solar-power', productCount: 14, children: [] },
        ],
      },
      {
        id: 'sub-phones-accessories',
        name: 'Phones & Accessories',
        nameAmharic: 'ስልኮች እና እቃዎች',
        slug: 'phones-accessories',
        parentId: 'cat-electronics',
        productCount: 42,
        children: [
          { id: 'leaf-smartphones', name: 'Smartphones & Feature Phones', nameAmharic: 'ስማርት ስልኮች', slug: 'smartphones', parentId: 'sub-phones-accessories', productCount: 20, children: [] },
          { id: 'leaf-chargers-cables', name: 'Fast Chargers & Cables', nameAmharic: 'ቻርጀር እና ኬብሎች', slug: 'chargers-cables', parentId: 'sub-phones-accessories', productCount: 22, children: [] },
        ],
      },
      {
        id: 'sub-audio-gadgets',
        name: 'Audio & Speakers',
        nameAmharic: 'ድምጽ ማጉያ እና ጆሮ ማዳመጫ',
        slug: 'audio-gadgets',
        parentId: 'cat-electronics',
        productCount: 26,
        children: [
          { id: 'leaf-wireless-earbuds', name: 'Bluetooth Earbuds', nameAmharic: 'ገመድ አልባ ጆሮ ማዳመጫ', slug: 'wireless-earbuds', parentId: 'sub-audio-gadgets', productCount: 16, children: [] },
          { id: 'leaf-bt-speakers', name: 'Portable Speakers', nameAmharic: 'ብሉቱዝ ስፒከሮች', slug: 'bt-speakers', parentId: 'sub-audio-gadgets', productCount: 10, children: [] },
        ],
      },
    ],
  },
  {
    id: 'cat-home-kitchen',
    name: 'Home & Kitchen',
    nameAmharic: 'የቤት እና ወጥ ቤት እቃዎች',
    slug: 'home-kitchen',
    icon: 'home-outline',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=400&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80',
    productCount: 75,
    featured: true,
    children: [
      {
        id: 'sub-mitad-appliances',
        name: 'Electric Mitad & Stoves',
        nameAmharic: 'የኤሌክትሪክ ምጣድ',
        slug: 'mitad-appliances',
        parentId: 'cat-home-kitchen',
        productCount: 19,
        children: [
          { id: 'leaf-auto-mitad', name: 'Automatic Inset Mitad', nameAmharic: 'አውቶማቲክ ምጣድ', slug: 'auto-mitad', parentId: 'sub-mitad-appliances', productCount: 11, children: [] },
          { id: 'leaf-electric-stoves', name: 'Electric Stoves', nameAmharic: 'የኤሌክትሪክ ምድጃ', slug: 'electric-stoves', parentId: 'sub-mitad-appliances', productCount: 8, children: [] },
        ],
      },
      {
        id: 'sub-coffee-sets',
        name: 'Jebena & Sini Sets',
        nameAmharic: 'ጀበና እና ሲኒ',
        slug: 'coffee-sets',
        parentId: 'cat-home-kitchen',
        productCount: 24,
        children: [
          { id: 'leaf-clay-jebena', name: 'Traditional Clay Jebena', nameAmharic: 'የሸክላ ጀበና', slug: 'clay-jebena', parentId: 'sub-coffee-sets', productCount: 12, children: [] },
          { id: 'leaf-sini-rekebot', name: 'Sini Sets & Rekebot', nameAmharic: 'ሲኒ እና ረከቦት', slug: 'sini-rekebot', parentId: 'sub-coffee-sets', productCount: 12, children: [] },
        ],
      },
      {
        id: 'sub-cookware',
        name: 'Cookware & Utensils',
        nameAmharic: 'የወጥ ቤት መገልገያዎች',
        slug: 'cookware',
        parentId: 'cat-home-kitchen',
        productCount: 32,
        children: [
          { id: 'leaf-pots-pans', name: 'Stainless Steel Pots', nameAmharic: 'የብረት ድስቶች', slug: 'pots-pans', parentId: 'sub-cookware', productCount: 18, children: [] },
          { id: 'leaf-woven-mesob', name: 'Handwoven Mesob', nameAmharic: 'ባህላዊ መሶብ', slug: 'woven-mesob', parentId: 'sub-cookware', productCount: 14, children: [] },
        ],
      },
    ],
  },
  {
    id: 'cat-beauty-health',
    name: 'Health & Beauty',
    nameAmharic: 'ጤና እና ውበት',
    slug: 'health-beauty',
    icon: 'sparkles-outline',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80',
    productCount: 64,
    featured: false,
    children: [
      {
        id: 'sub-skincare-natural',
        name: 'Natural Oils & Soaps',
        nameAmharic: 'ተፈጥሯዊ ዘይቶች እና ሳሙና',
        slug: 'natural-oils',
        parentId: 'cat-beauty-health',
        productCount: 31,
        children: [
          { id: 'leaf-castor-oil', name: 'Black Castor Oil (Gulo)', nameAmharic: 'የጉሎ ዘይት', slug: 'castor-oil', parentId: 'sub-skincare-natural', productCount: 17, children: [] },
          { id: 'leaf-moringa-soap', name: 'Moringa Herbal Soap', nameAmharic: 'የሞሪንጋ ሳሙና', slug: 'moringa-soap', parentId: 'sub-skincare-natural', productCount: 14, children: [] },
        ],
      },
      {
        id: 'sub-herbal-supplements',
        name: 'Herbal Remedies',
        nameAmharic: 'የባህል መድኃኒቶች',
        slug: 'herbal-remedies',
        parentId: 'cat-beauty-health',
        productCount: 33,
        children: [
          { id: 'leaf-black-seed', name: 'Black Seed (Tikur Azmud)', nameAmharic: 'ጥቁር አዝሙድ', slug: 'black-seed', parentId: 'sub-herbal-supplements', productCount: 18, children: [] },
          { id: 'leaf-herbal-infusions', name: 'Traditional Infusions', nameAmharic: 'የባህል ቅመማቅመም ሻይ', slug: 'herbal-infusions', parentId: 'sub-herbal-supplements', productCount: 15, children: [] },
        ],
      },
    ],
  },
  {
    id: 'cat-agriculture',
    name: 'Agriculture & Bulk',
    nameAmharic: 'ግብርና እና የጅምላ እቃዎች',
    slug: 'agriculture-bulk',
    icon: 'leaf-outline',
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=400&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80',
    productCount: 52,
    featured: false,
    children: [
      {
        id: 'sub-grain-sacks',
        name: 'Grain Sacks (Quintal)',
        nameAmharic: 'የእህል ኩንታል',
        slug: 'grain-sacks',
        parentId: 'cat-agriculture',
        productCount: 24,
        children: [
          { id: 'leaf-teff-quintal', name: 'Teff 100kg Quintals', nameAmharic: 'የጤፍ ኩንታል (100 ኪ.ግ)', slug: 'teff-quintals', parentId: 'sub-grain-sacks', productCount: 14, children: [] },
          { id: 'leaf-maize-quintal', name: 'Maize & Corn Sacks', nameAmharic: 'የበቆሎ ኩንታል', slug: 'maize-sacks', parentId: 'sub-grain-sacks', productCount: 10, children: [] },
        ],
      },
      {
        id: 'sub-farming-tools',
        name: 'Farming Equipment',
        nameAmharic: 'የእርሻ መገልገያዎች',
        slug: 'farming-equipment',
        parentId: 'cat-agriculture',
        productCount: 28,
        children: [
          { id: 'leaf-irrigation-pumps', name: 'Water Pumps & Pipes', nameAmharic: 'የመስኖ ፓምፖች', slug: 'water-pumps', parentId: 'sub-farming-tools', productCount: 16, children: [] },
          { id: 'leaf-hand-tools', name: 'Hand Tools & Shears', nameAmharic: 'የእጅ መገልገያ መሳሪያዎች', slug: 'hand-tools', parentId: 'sub-farming-tools', productCount: 12, children: [] },
        ],
      },
    ],
  },
];

// In-memory cache for fast, zero-delay subsequent category navigations
let cachedTree: CategoryNode[] | null = null;

export const categoryService = {
  /**
   * Fetches the category tree from the live backend catalog endpoint.
   * If live backend is reachable and returns categories, maps them cleanly.
   * Otherwise falls back to DEFAULT_CATEGORY_TREE.
   */
  async getCategoryTree(forceRefresh = false): Promise<CategoryNode[]> {
    if (cachedTree && !forceRefresh) {
      return cachedTree;
    }

    try {
      const res = await fetch(`${API_BASE}/customer/catalog/categories/tree`);
      if (res.ok) {
        const json = await res.json();
        const rawTree = json.data || json;
        if (Array.isArray(rawTree) && rawTree.length > 0) {
          const mapNode = (node: any): CategoryNode => ({
            id: node.id,
            name: node.name,
            nameAmharic: node.nameAmharic || node.name,
            slug: node.slug || node.id,
            icon: node.icon || 'grid-outline',
            image: node.imageUrl || node.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
            imageUrl: node.imageUrl || node.image,
            bannerImage: node.imageUrl || node.image,
            parentId: node.parentId || null,
            productCount: node.productCount || 0,
            featured: Boolean(node.featured),
            children: Array.isArray(node.children) ? node.children.map(mapNode) : [],
          });
          const mapped = rawTree.map(mapNode);
          cachedTree = mapped;
          return mapped;
        }
      }
    } catch {
      // In offline / dev / backend disconnected mode, use default tree
    }

    cachedTree = DEFAULT_CATEGORY_TREE;
    return DEFAULT_CATEGORY_TREE;
  },

  /**
   * Finds any category node by ID in the tree
   */
  findCategory(tree: CategoryNode[], id: string): CategoryNode | null {
    for (const node of tree) {
      if (node.id === id) return node;
      if (node.children && node.children.length > 0) {
        const found = this.findCategory(node.children, id);
        if (found) return found;
      }
    }
    return null;
  },

  /**
   * Builds the ancestry path from root to target category
   * e.g. [Fashion, Men, Shirts]
   */
  getAncestryPath(tree: CategoryNode[], targetId: string, currentPath: CategoryNode[] = []): CategoryNode[] | null {
    for (const node of tree) {
      const newPath = [...currentPath, node];
      if (node.id === targetId) {
        return newPath;
      }
      if (node.children && node.children.length > 0) {
        const childPath = this.getAncestryPath(node.children, targetId, newPath);
        if (childPath) return childPath;
      }
    }
    return null;
  },

  /**
   * Returns an array of IDs of the category itself and all its descendant subcategories
   * Critical for product filtering at parent levels.
   */
  getAllDescendantIds(tree: CategoryNode[], categoryId: string): string[] {
    const target = this.findCategory(tree, categoryId);
    if (!target) return [categoryId];

    const ids: string[] = [target.id];
    const collect = (node: CategoryNode) => {
      for (const child of node.children) {
        ids.push(child.id);
        collect(child);
      }
    };
    collect(target);
    return ids;
  },

  /**
   * Search categories across all levels by name or Amharic name
   */
  searchCategories(tree: CategoryNode[], query: string): { category: CategoryNode; path: CategoryNode[] }[] {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const results: { category: CategoryNode; path: CategoryNode[] }[] = [];

    const traverse = (nodes: CategoryNode[], currentPath: CategoryNode[]) => {
      for (const node of nodes) {
        const newPath = [...currentPath, node];
        const nameMatches = node.name.toLowerCase().includes(cleanQuery);
        const amharicMatches = node.nameAmharic && node.nameAmharic.includes(query.trim());

        if (nameMatches || amharicMatches) {
          results.push({ category: node, path: newPath });
        }

        if (node.children && node.children.length > 0) {
          traverse(node.children, newPath);
        }
      }
    };

    traverse(tree, []);
    return results;
  },
};
