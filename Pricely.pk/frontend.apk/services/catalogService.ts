// Data layer for the Home screen. Every function here returns a Promise,
// on purpose — that's the real shape a fetch() call will have. When the
// backend exists, only the bodies in this file change (swap the mock
// array for a real `fetch(...).then(r => r.json())`); nothing in the UI
// components needs to change, since they only ever talk to these
// functions/hooks, never to hardcoded arrays directly.

export interface Category {
  key: string;
  label: string;
}

export interface Deal {
  id: string;
  name: string;
  price: string;
  discount: string;
  store: string;
  imageSeed: string; // used to build a stable demo photo URL until real product images exist
}

export interface SubcategoryProduct {
  name: string;
  price: string;
  pictureTag?: string;
}

export interface Subcategory {
  key: string;
  label: string;
  imageTag: string;
  products: SubcategoryProduct[];
}

const MOCK_CATEGORIES: Category[] = [
  { key: 'all', label: 'All' },
  { key: 'electronics', label: 'Electronics' }, // includes Mobiles as a subcategory, not its own top-level tab
  { key: 'fashion', label: 'Fashion' },
  { key: 'home', label: 'Home & Living' },
  { key: 'beauty', label: 'Beauty' },
  { key: 'appliances', label: 'Appliances' },
  { key: 'watches', label: 'Watches & Accessories' },
];

const MOCK_TRENDING = ['Redmi Note 13', 'Air Fryer 5L', 'PS5 slim', 'iPhone 15', 'Nike Air Max 90', 'Smart Watch'];

const MOCK_DEALS: Deal[] = [
  { id: '1', name: 'Redmi Note 13 8/256', price: 'Rs 54,999', discount: '12%', store: 'Telemart', imageSeed: 'redmi-note-13' },
  { id: '2', name: 'Anker 20000mAh PB', price: 'Rs 8,450', discount: '20%', store: 'Daraz', imageSeed: 'anker-powerbank' },
  { id: '3', name: 'Nike Air Max 90', price: 'Rs 15,200', discount: '18%', store: 'Daraz', imageSeed: 'nike-air-max' },
  { id: '4', name: 'Samsung 55" 4K TV', price: 'Rs 124,999', discount: '15%', store: 'Amazon', imageSeed: 'samsung-tv' },
  { id: '5', name: 'Xiaomi Air Fryer 5L', price: 'Rs 11,999', discount: '10%', store: 'Mega.pk', imageSeed: 'air-fryer' },
];

const MOCK_SUBCATEGORIES: Record<string, Subcategory[]> = {
  electronics: [
    { key: 'android', label: 'Android Phones', imageTag: 'smartphone', products: [
      { name: 'Redmi Note 13', price: 'Rs 54,999', pictureTag: 'redmi,phone' },
      { name: 'Galaxy A55', price: 'Rs 71,500', pictureTag: 'samsung,phone' },
      { name: 'Infinix Note 40', price: 'Rs 38,200', pictureTag: 'infinix,phone' },
      { name: 'Tecno Camon 30', price: 'Rs 42,999', pictureTag: 'tecno,phone' },
    ]},
    { key: 'iphones', label: 'iPhones', imageTag: 'iphone', products: [
      { name: 'iPhone 13', price: 'Rs 149,900', pictureTag: 'iphone13' },
      { name: 'iPhone 15', price: 'Rs 234,999', pictureTag: 'iphone15' },
      { name: 'iPhone 12', price: 'Rs 119,000', pictureTag: 'iphone12' },
      { name: 'iPhone 14 Pro', price: 'Rs 365,000', pictureTag: 'iphone14' },
    ]},
    { key: 'tablets', label: 'Tablets', imageTag: 'tablet', products: [
      { name: 'iPad 9th Gen', price: 'Rs 89,900', pictureTag: 'ipad' },
      { name: 'Galaxy Tab A9', price: 'Rs 42,000', pictureTag: 'samsung,tablet' },
      { name: 'Xiaomi Pad 6', price: 'Rs 65,500', pictureTag: 'xiaomi,tablet' },
      { name: 'Lenovo Tab M10', price: 'Rs 35,000', pictureTag: 'lenovo,tablet' },
    ]},
    { key: 'powerbanks', label: 'Power Banks', imageTag: 'battery', products: [
      { name: 'Anker 20000mAh', price: 'Rs 8,450', pictureTag: 'powerbank' },
      { name: 'Xiaomi 10000mAh', price: 'Rs 4,200', pictureTag: 'powerbank' },
      { name: 'Baseus 30000mAh', price: 'Rs 11,900', pictureTag: 'powerbank' },
      { name: 'Romoss 20000mAh', price: 'Rs 5,500', pictureTag: 'powerbank' },
    ]},
    { key: 'laptops', label: 'Laptops', imageTag: 'laptop', products: [
      { name: 'HP Pavilion 15', price: 'Rs 145,000', pictureTag: 'hp,laptop' },
      { name: 'Dell Inspiron 14', price: 'Rs 132,000', pictureTag: 'dell,laptop' },
      { name: 'MacBook Air M1', price: 'Rs 245,000', pictureTag: 'macbook' },
      { name: 'Lenovo IdeaPad 3', price: 'Rs 115,000', pictureTag: 'lenovo,laptop' },
    ]},
    { key: 'cameras', label: 'Cameras', imageTag: 'camera', products: [
      { name: 'Canon EOS 200D', price: 'Rs 165,000', pictureTag: 'canon,camera' },
      { name: 'GoPro Hero 11', price: 'Rs 98,000', pictureTag: 'gopro' },
      { name: 'Sony ZV-1', price: 'Rs 189,000', pictureTag: 'sony,camera' },
      { name: 'Sony Alpha a6400', price: 'Rs 210,000', pictureTag: 'sony,dslr' },
    ]},
    { key: 'tvs', label: 'Televisions', imageTag: 'television', products: [
      { name: 'Samsung 55" 4K', price: 'Rs 124,999', pictureTag: 'samsung,tv' },
      { name: 'TCL 43" Smart', price: 'Rs 62,500', pictureTag: 'tcl,tv' },
      { name: 'Haier 50" 4K', price: 'Rs 89,900', pictureTag: 'haier,tv' },
      { name: 'Mi TV P1 43"', price: 'Rs 74,900', pictureTag: 'xiaomi,tv' },
    ]},
    { key: 'gaming', label: 'Gaming', imageTag: 'videogames', products: [
      { name: 'PS5 Slim', price: 'Rs 215,000', pictureTag: 'ps5,console' },
      { name: 'Xbox Series S', price: 'Rs 125,000', pictureTag: 'xbox' },
      { name: 'DualSense Controller', price: 'Rs 24,500', pictureTag: 'gamepad' },
      { name: 'Nintendo Switch OLED', price: 'Rs 95,000', pictureTag: 'nintendo,switch' },
    ]},
    { key: 'audio', label: 'Audio', imageTag: 'headphones', products: [
      { name: 'Sony WH-1000XM4', price: 'Rs 89,000', pictureTag: 'headphones' },
      { name: 'JBL Flip 6', price: 'Rs 22,000', pictureTag: 'jbl,speaker' },
      { name: 'Airdopes 141', price: 'Rs 3,200', pictureTag: 'earbuds' },
      { name: 'JBL Tune 510BT', price: 'Rs 14,500', pictureTag: 'headphones' },
    ]},
    { key: 'accessories', label: 'Accessories', imageTag: 'electronics', products: [
      { name: 'Wireless Mouse', price: 'Rs 2,400', pictureTag: 'mouse' },
      { name: 'Mechanical Keyboard', price: 'Rs 8,900', pictureTag: 'keyboard' },
      { name: 'USB-C Charger', price: 'Rs 2,100', pictureTag: 'charger' },
      { name: 'Logitech G502 Mouse', price: 'Rs 12,500', pictureTag: 'logitech,mouse' },
    ]},
  ],
  fashion: [
    { key: 'menswear', label: "Men's Wear", imageTag: 'mensfashion', products: [
      { name: 'Cotton Kurta', price: 'Rs 2,800', pictureTag: 'kurta' },
      { name: 'Formal Shirt', price: 'Rs 3,500', pictureTag: 'shirt' },
      { name: 'Denim Jacket', price: 'Rs 5,200', pictureTag: 'jacket' },
      { name: 'Casual Denim Shirt', price: 'Rs 3,200', pictureTag: 'denim,shirt' },
    ]},
    { key: 'womenswear', label: "Women's Wear", imageTag: 'womensfashion', products: [
      { name: 'Lawn 3-Piece', price: 'Rs 4,500', pictureTag: 'dress' },
      { name: 'Abaya', price: 'Rs 3,900', pictureTag: 'abaya' },
      { name: 'Stitched Suit', price: 'Rs 6,200', pictureTag: 'dress' },
      { name: 'Chiffon Dupatta', price: 'Rs 1,500', pictureTag: 'dupatta' },
    ]},
    { key: 'footwear', label: 'Footwear', imageTag: 'sneakers', products: [
      { name: 'Nike Air Max 90', price: 'Rs 15,200', pictureTag: 'sneakers' },
      { name: 'Casual Loafers', price: 'Rs 4,800', pictureTag: 'loafers' },
      { name: 'Running Shoes', price: 'Rs 7,900', pictureTag: 'shoes' },
      { name: 'Adidas Ultraboost', price: 'Rs 18,500', pictureTag: 'sneakers' },
    ]},
    { key: 'bags', label: 'Bags', imageTag: 'handbag', products: [
      { name: 'Leather Handbag', price: 'Rs 6,500', pictureTag: 'handbag' },
      { name: 'Laptop Backpack', price: 'Rs 4,200', pictureTag: 'backpack' },
      { name: 'Travel Duffel', price: 'Rs 5,800', pictureTag: 'duffel,bag' },
      { name: 'Canvas Messenger Bag', price: 'Rs 2,900', pictureTag: 'messenger,bag' },
    ]},
    { key: 'jewelry', label: 'Jewelry', imageTag: 'jewelry', products: [
      { name: 'Silver Bracelet', price: 'Rs 3,200', pictureTag: 'bracelet' },
      { name: 'Pearl Earrings', price: 'Rs 2,600', pictureTag: 'earrings' },
      { name: 'Gold-Plated Ring', price: 'Rs 4,100', pictureTag: 'ring' },
      { name: 'Sterling Silver Ring', price: 'Rs 1,800', pictureTag: 'silver,ring' },
    ]},
    { key: 'kidswear', label: 'Kids Wear', imageTag: 'kidsfashion', products: [
      { name: 'Kids T-Shirt Set', price: 'Rs 1,800', pictureTag: 'kid,shirt' },
      { name: 'School Uniform', price: 'Rs 2,400', pictureTag: 'uniform' },
      { name: 'Kids Sneakers', price: 'Rs 3,100', pictureTag: 'kid,shoes' },
      { name: 'Kids Denim Overalls', price: 'Rs 2,700', pictureTag: 'kid,denim' },
    ]},
  ],
  beauty: [
    { key: 'skincare', label: 'Skincare', imageTag: 'skincare', products: [
      { name: 'Vitamin C Serum', price: 'Rs 2,200', pictureTag: 'serum' },
      { name: 'Sunscreen SPF50', price: 'Rs 1,900', pictureTag: 'sunscreen' },
      { name: 'Face Wash', price: 'Rs 950', pictureTag: 'facewash' },
      { name: 'Hyaluronic Acid Serum', price: 'Rs 2,400', pictureTag: 'serum' },
    ]},
    { key: 'makeup', label: 'Makeup', imageTag: 'makeup', products: [
      { name: 'Matte Lipstick', price: 'Rs 1,400', pictureTag: 'lipstick' },
      { name: 'Foundation', price: 'Rs 2,800', pictureTag: 'foundation' },
      { name: 'Eyeshadow Palette', price: 'Rs 3,200', pictureTag: 'eyeshadow' },
      { name: 'Liquid Foundation', price: 'Rs 3,100', pictureTag: 'foundation' },
    ]},
    { key: 'haircare', label: 'Haircare', imageTag: 'hairstyling', products: [
      { name: 'Argan Oil Shampoo', price: 'Rs 1,100', pictureTag: 'shampoo' },
      { name: 'Hair Straightener', price: 'Rs 4,500', pictureTag: 'hair,straightener' },
      { name: 'Hair Serum', price: 'Rs 1,600', pictureTag: 'hair,serum' },
      { name: 'Coconut Hair Mask', price: 'Rs 1,400', pictureTag: 'hair,mask' },
    ]},
    { key: 'fragrances', label: 'Fragrances', imageTag: 'perfume', products: [
      { name: 'Eau de Parfum 100ml', price: 'Rs 6,500', pictureTag: 'perfume' },
      { name: 'Body Mist', price: 'Rs 1,200', pictureTag: 'perfume' },
      { name: 'Deodorant', price: 'Rs 650', pictureTag: 'deodorant' },
      { name: 'Cologne for Men 50ml', price: 'Rs 4,800', pictureTag: 'cologne' },
    ]},
    { key: 'personalcare', label: 'Personal Care', imageTag: 'selfcare', products: [
      { name: 'Electric Trimmer', price: 'Rs 3,400', pictureTag: 'trimmer' },
      { name: 'Face Roller', price: 'Rs 1,100', pictureTag: 'faceroller' },
      { name: 'Nail Kit', price: 'Rs 850', pictureTag: 'nailkit' },
      { name: 'Electric Toothbrush', price: 'Rs 5,200', pictureTag: 'toothbrush' },
    ]},
    { key: 'beautytools', label: 'Beauty Tools', imageTag: 'makeupbrush', products: [
      { name: 'Makeup Brush Set', price: 'Rs 1,900', pictureTag: 'makeup,brush' },
      { name: 'Beauty Blender', price: 'Rs 650', pictureTag: 'makeup,blender' },
      { name: 'LED Mirror', price: 'Rs 2,700', pictureTag: 'mirror' },
      { name: 'Silicone Face Scrubber', price: 'Rs 950', pictureTag: 'facescrubber' },
    ]},
  ],
  home: [
    { key: 'furniture', label: 'Furniture', imageTag: 'furniture', products: [
      { name: '3-Seater Sofa', price: 'Rs 68,000', pictureTag: 'sofa' },
      { name: 'Study Table', price: 'Rs 12,500', pictureTag: 'table' },
      { name: 'Bookshelf', price: 'Rs 9,200', pictureTag: 'bookshelf' },
      { name: 'Coffee Table Wood', price: 'Rs 14,500', pictureTag: 'coffeetable' },
    ]},
    { key: 'kitchenware', label: 'Kitchenware', imageTag: 'kitchenware', products: [
      { name: 'Non-Stick Pan Set', price: 'Rs 4,800', pictureTag: 'pan' },
      { name: 'Dinner Set 24pc', price: 'Rs 6,200', pictureTag: 'dinnerware' },
      { name: 'Cutlery Set', price: 'Rs 2,100', pictureTag: 'cutlery' },
      { name: 'Ceramic Mug Set 4pc', price: 'Rs 1,800', pictureTag: 'mug' },
    ]},
    { key: 'bedding', label: 'Bedding', imageTag: 'bedroom', products: [
      { name: 'Bedsheet Set', price: 'Rs 3,200', pictureTag: 'bedsheet' },
      { name: 'Comforter', price: 'Rs 5,500', pictureTag: 'comforter' },
      { name: 'Pillow Pair', price: 'Rs 1,800', pictureTag: 'pillow' },
      { name: 'Fitted Mattress Protector', price: 'Rs 2,500', pictureTag: 'mattress' },
    ]},
    { key: 'lighting', label: 'Lighting', imageTag: 'lamp', products: [
      { name: 'LED Table Lamp', price: 'Rs 1,900', pictureTag: 'lamp' },
      { name: 'Ceiling Light', price: 'Rs 3,600', pictureTag: 'ceiling,light' },
      { name: 'Fairy Lights', price: 'Rs 850', pictureTag: 'fairylights' },
      { name: 'Smart RGB LED Bulb', price: 'Rs 1,200', pictureTag: 'ledbulb' },
    ]},
    { key: 'storage', label: 'Storage', imageTag: 'storage', products: [
      { name: 'Storage Boxes 3pc', price: 'Rs 2,200', pictureTag: 'box' },
      { name: 'Wardrobe Organizer', price: 'Rs 3,400', pictureTag: 'closet,organizer' },
      { name: 'Shoe Rack', price: 'Rs 4,100', pictureTag: 'shoerack' },
      { name: 'Plastic Drawer Unit', price: 'Rs 4,500', pictureTag: 'drawer' },
    ]},
    { key: 'decor', label: 'Decor', imageTag: 'homedecor', products: [
      { name: 'Wall Art Set', price: 'Rs 2,600', pictureTag: 'wallart' },
      { name: 'Table Vase', price: 'Rs 1,500', pictureTag: 'vase' },
      { name: 'Area Rug', price: 'Rs 7,800', pictureTag: 'rug' },
      { name: 'Scented Candle Set', price: 'Rs 1,900', pictureTag: 'candle' },
    ]},
  ],
  appliances: [
    { key: 'refrigerators', label: 'Refrigerators', imageTag: 'refrigerator', products: [
      { name: 'Dawlance 12 CFT', price: 'Rs 89,000', pictureTag: 'refrigerator' },
      { name: 'Haier 15 CFT', price: 'Rs 112,000', pictureTag: 'refrigerator' },
      { name: 'Orient Mini Fridge', price: 'Rs 42,000', pictureTag: 'minifridge' },
      { name: 'Dawlance Direct Cool', price: 'Rs 78,000', pictureTag: 'refrigerator' },
    ]},
    { key: 'acs', label: 'Air Conditioners', imageTag: 'airconditioner', products: [
      { name: 'Gree 1.5 Ton Inverter', price: 'Rs 165,000', pictureTag: 'airconditioner' },
      { name: 'Haier 1 Ton', price: 'Rs 128,000', pictureTag: 'airconditioner' },
      { name: 'Orient 1.5 Ton', price: 'Rs 155,000', pictureTag: 'airconditioner' },
      { name: 'Kenwood 1.5 Ton Inverter', price: 'Rs 158,000', pictureTag: 'airconditioner' },
    ]},
    { key: 'washing', label: 'Washing Machines', imageTag: 'washingmachine', products: [
      { name: 'Dawlance Front Load 8kg', price: 'Rs 98,000', pictureTag: 'washingmachine' },
      { name: 'Haier Top Load 10kg', price: 'Rs 72,000', pictureTag: 'washingmachine' },
      { name: 'Kenwood Semi-Auto', price: 'Rs 38,500', pictureTag: 'washingmachine' },
      { name: 'Super Asia Twin Tub', price: 'Rs 24,500', pictureTag: 'washingmachine' },
    ]},
    { key: 'kitchen-appliances', label: 'Kitchen Appliances', imageTag: 'kitchenappliance', products: [
      { name: 'Microwave Oven 25L', price: 'Rs 24,500', pictureTag: 'microwave' },
      { name: 'Air Fryer 5L', price: 'Rs 11,999', pictureTag: 'airfryer' },
      { name: 'Blender 3-in-1', price: 'Rs 6,800', pictureTag: 'blender' },
      { name: 'Electric Citrus Juicer', price: 'Rs 4,500', pictureTag: 'juicer' },
    ]},
    { key: 'small-appliances', label: 'Small Appliances', imageTag: 'kettle', products: [
      { name: 'Electric Kettle', price: 'Rs 2,900', pictureTag: 'kettle' },
      { name: 'Iron', price: 'Rs 3,400', pictureTag: 'iron' },
      { name: 'Hair Dryer', price: 'Rs 2,100', pictureTag: 'hairdryer' },
      { name: 'Steam Iron 2000W', price: 'Rs 4,800', pictureTag: 'iron' },
    ]},
    { key: 'appliance-lighting', label: 'Lighting', imageTag: 'lightbulb', products: [
      { name: 'Emergency Light', price: 'Rs 3,200', pictureTag: 'flashlight' },
      { name: 'Rechargeable Fan', price: 'Rs 5,600', pictureTag: 'fan' },
      { name: 'LED Bulb Pack', price: 'Rs 950', pictureTag: 'lightbulb' },
      { name: 'Rechargeable LED Lantern', price: 'Rs 2,400', pictureTag: 'lantern' },
    ]},
  ],
  watches: [
    { key: 'smart', label: 'Smart Watches', imageTag: 'smartwatch', products: [
      { name: 'Galaxy Watch 6', price: 'Rs 58,000', pictureTag: 'smartwatch' },
      { name: 'Amazfit GTS 4', price: 'Rs 24,500', pictureTag: 'smartwatch' },
      { name: 'Mi Band 8', price: 'Rs 6,200', pictureTag: 'fitnessband' },
      { name: 'Huawei Watch Fit 2', price: 'Rs 28,500', pictureTag: 'smartwatch' },
    ]},
    { key: 'analog', label: 'Analog Watches', imageTag: 'wristwatch', products: [
      { name: 'Casio MTP Series', price: 'Rs 8,900', pictureTag: 'casiowatch' },
      { name: 'Fossil Chronograph', price: 'Rs 22,000', pictureTag: 'fossilwatch' },
      { name: 'Q&Q Classic', price: 'Rs 3,200', pictureTag: 'watch' },
      { name: 'Seiko 5 Automatic', price: 'Rs 45,000', pictureTag: 'seikowatch' },
    ]},
    { key: 'sunglasses', label: 'Sunglasses', imageTag: 'sunglasses', products: [
      { name: 'Aviator Sunglasses', price: 'Rs 2,400', pictureTag: 'aviators' },
      { name: 'Polarized Wayfarer', price: 'Rs 3,100', pictureTag: 'sunglasses' },
      { name: 'Kids Sunglasses', price: 'Rs 950', pictureTag: 'kid,sunglasses' },
      { name: 'Ray-Ban Justin', price: 'Rs 14,500', pictureTag: 'rayban' },
    ]},
    { key: 'wallets', label: 'Wallets', imageTag: 'wallet', products: [
      { name: 'Leather Bifold Wallet', price: 'Rs 2,200', pictureTag: 'wallet' },
      { name: 'Card Holder', price: 'Rs 1,100', pictureTag: 'cardholder' },
      { name: "Women's Clutch Wallet", price: 'Rs 2,800', pictureTag: 'clutch' },
      { name: 'Slim Card Wallet', price: 'Rs 950', pictureTag: 'wallet' },
    ]},
    { key: 'belts', label: 'Belts', imageTag: 'leatherbelt', products: [
      { name: 'Leather Belt', price: 'Rs 1,800', pictureTag: 'belt' },
      { name: 'Reversible Belt', price: 'Rs 2,100', pictureTag: 'belt' },
      { name: 'Casual Braided Belt', price: 'Rs 1,500', pictureTag: 'belt' },
      { name: 'Formal Black Leather Belt', price: 'Rs 2,400', pictureTag: 'belt' },
    ]},
    { key: 'watch-bags', label: 'Bags', imageTag: 'sling bag', products: [
      { name: 'Sling Bag', price: 'Rs 2,600', pictureTag: 'slingbag' },
      { name: 'Watch Box', price: 'Rs 1,900', pictureTag: 'watchbox' },
      { name: 'Travel Pouch', price: 'Rs 1,200', pictureTag: 'pouch' },
      { name: 'Crossbody Sling Pouch', price: 'Rs 1,800', pictureTag: 'slingbag' },
    ]},
  ],
};


// Demo product photos until the catalog API supplies real images — seeded
// so each product keeps the same picture across reloads instead of
// changing every render.
export const dealImageUri = (seed: string) => `https://picsum.photos/seed/${seed}/300/300`;

const fakeLatency = <T,>(data: T) => new Promise<T>((resolve) => setTimeout(() => resolve(data), 250));

export async function getCategories(): Promise<Category[]> {
  // TODO: backend — GET /catalog/categories
  return fakeLatency(MOCK_CATEGORIES);
}

export async function getTrendingSearches(): Promise<string[]> {
  // TODO: backend — GET /search/trending
  return fakeLatency(MOCK_TRENDING);
}

export async function getBestDrops(): Promise<Deal[]> {
  // TODO: backend — GET /deals/best-drops
  return fakeLatency(MOCK_DEALS);
}

export async function getSubcategories(categoryKey: string): Promise<Subcategory[]> {
  // TODO: backend — GET /catalog/subcategories?category=...
  return fakeLatency(MOCK_SUBCATEGORIES[categoryKey] || MOCK_SUBCATEGORIES.electronics);
}
