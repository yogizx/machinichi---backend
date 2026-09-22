import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { User } from '../models/User';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Banner } from '../models/Banner';
import { Coupon } from '../models/Coupon';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('MONGODB_URI is not defined');
  process.exit(1);
}

const categories = [
  { name: 'Dry Fruits', description: 'Premium quality dry fruits sourced directly from farms', image: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca', displayOrder: 1 },
  { name: 'Grains', description: 'Pure and organic grains for healthy living', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c', displayOrder: 2 },
  { name: 'Flour', description: 'Freshly milled flours for your daily needs', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff', displayOrder: 3 },
  { name: 'Ready to Eat', description: 'Quick and delicious ready-to-eat snacks and meals', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec', displayOrder: 4 },
  { name: 'Juices', description: 'Natural and refreshing fruit juices', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba', displayOrder: 5 },
  { name: 'Pooja Items', description: 'Complete pooja essentials for your spiritual needs', image: 'https://images.unsplash.com/photo-1605870445919-838d190e8e1b', displayOrder: 6 },
  { name: 'Organic Products', description: 'Certified organic products for a healthier life', image: 'https://images.unsplash.com/photo-1542838132-92c53300491e', displayOrder: 7 },
];

const dryFruitsProducts = [
  { name: 'Premium Almonds (Badam)', description: 'Handpicked California almonds, rich in vitamin E and healthy fats. Sourced directly from importers for best quality.', mrp: 899, sellingPrice: 649, unit: '500 g', images: ['https://images.unsplash.com/photo-1508061253366-f7da1583aefa'], tags: ['almonds', 'badam', 'dry-fruits', 'premium'], hsnCode: '08021200', gstRate: 5 },
  { name: 'Cashew Nuts (Kaju) W180', description: 'Premium W180 cashews, extra large and creamy white. Perfect for snacking and cooking.', mrp: 1099, sellingPrice: 849, unit: '500 g', images: ['https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8'], tags: ['cashew', 'kaju', 'dry-fruits', 'premium'], hsnCode: '08013100', gstRate: 5 },
  { name: 'Pistachios (Pista)', description: 'Open shell pistachios imported from Iran. Naturally sweet and rich in antioxidants.', mrp: 1299, sellingPrice: 999, unit: '500 g', images: ['https://images.unsplash.com/photo-1601132359864-c974e79890ac'], tags: ['pistachio', 'pista', 'dry-fruits'], hsnCode: '08025200', gstRate: 5 },
  { name: 'Walnuts (Akhrot)', description: 'Premium light-colored walnuts from Kashmir. Rich in omega-3 fatty acids.', mrp: 799, sellingPrice: 599, unit: '500 g', images: ['https://images.unsplash.com/photo-1589496933738-f3faa3f07f16'], tags: ['walnuts', 'akhrot', 'dry-fruits'], hsnCode: '08023200', gstRate: 5 },
  { name: 'Raisins (Kishmish) Green', description: 'Natural sun-dried green raisins from Maharashtra. Sweet and juicy.', mrp: 349, sellingPrice: 249, unit: '500 g', images: ['https://images.unsplash.com/photo-1590080874088-eec8f4e0a7c1'], tags: ['raisins', 'kishmish', 'dry-fruits'], hsnCode: '08062010', gstRate: 5 },
  { name: 'Dried Figs (Anjeer)', description: 'Premium dried figs from Turkey. Naturally sweet, fiber-rich superfood.', mrp: 899, sellingPrice: 699, unit: '500 g', images: ['https://images.unsplash.com/photo-1605487903301-a1dff2e6bbbe'], tags: ['figs', 'anjeer', 'dry-fruits'], hsnCode: '08042010', gstRate: 5 },
  { name: 'Dates - Medjool', description: 'Premium Medjool dates from Saudi Arabia. Large, soft, and naturally caramel-sweet.', mrp: 599, sellingPrice: 449, unit: '500 g', images: ['https://images.unsplash.com/photo-1596539691218-1e8b4fc0f965'], tags: ['dates', 'medjool', 'dry-fruits'], hsnCode: '08041010', gstRate: 5 },
  { name: 'Dried Apricots (Khumani)', description: 'Sun-dried apricots from Ladakh region. Rich in iron and fiber.', mrp: 499, sellingPrice: 379, unit: '500 g', images: ['https://images.unsplash.com/photo-1595407882198-6f8eae5e0f9c'], tags: ['apricots', 'khumani', 'dry-fruits'], hsnCode: '08131000', gstRate: 5 },
  { name: 'Dried Cranberries', description: 'Sweetened dried cranberries, perfect for baking and snacking.', mrp: 449, sellingPrice: 329, unit: '250 g', images: ['https://images.unsplash.com/photo-1590080874088-eec8f4e0a7c1'], tags: ['cranberries', 'dry-fruits', 'imported'], hsnCode: '08134000', gstRate: 5 },
  { name: 'Mixed Dry Fruits Combo', description: 'Premium mix of almonds, cashews, pistachios, raisins, and walnuts. Perfect gift box.', mrp: 1499, sellingPrice: 1099, unit: '1 kg', images: ['https://images.unsplash.com/photo-1604068549290-dea0e4a305ca'], tags: ['combo', 'mixed', 'dry-fruits', 'gift'], hsnCode: '08029000', gstRate: 5 },
  { name: 'Roasted Chana (Bhuna Chana)', description: 'Crispy roasted Bengal gram, protein-rich healthy snack.', mrp: 149, sellingPrice: 99, unit: '500 g', images: ['https://images.unsplash.com/photo-1515543904370-b06cf80e3d0b'], tags: ['roasted', 'chana', 'snacks'], hsnCode: '19041030', gstRate: 5 },
  { name: 'Fox Nuts (Makhana) Roasted', description: 'Light and crunchy roasted makhana, a healthy alternative to popcorn.', mrp: 249, sellingPrice: 179, unit: '200 g', images: ['https://images.unsplash.com/photo-1604068549290-dea0e4a305ca'], tags: ['makhana', 'fox-nuts', 'healthy-snacks'], hsnCode: '19059040', gstRate: 5 },
  { name: 'Flax Seeds (Alsi)', description: 'Organic brown flax seeds rich in omega-3 and fiber.', mrp: 199, sellingPrice: 139, unit: '500 g', images: ['https://images.unsplash.com/photo-1515543904370-b06cf80e3d0b'], tags: ['flax-seeds', 'alsi', 'superfood'], hsnCode: '12040000', gstRate: 5 },
  { name: 'Chia Seeds', description: 'Premium white chia seeds from South America. Rich in omega-3, fiber, and protein.', mrp: 399, sellingPrice: 299, unit: '250 g', images: ['https://images.unsplash.com/photo-1515543904370-b06cf80e3d0b'], tags: ['chia', 'seeds', 'superfood'], hsnCode: '12079990', gstRate: 5 },
  { name: 'Pumpkin Seeds', description: 'Hulled pumpkin seeds, rich in magnesium and zinc.', mrp: 299, sellingPrice: 219, unit: '250 g', images: ['https://images.unsplash.com/photo-1515543904370-b06cf80e3d0b'], tags: ['pumpkin-seeds', 'superfood'], hsnCode: '12077010', gstRate: 5 },
];

const grainsProducts = [
  { name: 'Basmati Rice - Premium', description: 'Aged premium basmati rice from Punjab. Long grains with aromatic fragrance.', mrp: 799, sellingPrice: 599, unit: '5 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['basmati', 'rice', 'premium'], hsnCode: '10063020', gstRate: 5 },
  { name: 'Sonamasoori Rice', description: 'Popular daily-use rice from South India. Soft and fluffy when cooked.', mrp: 499, sellingPrice: 379, unit: '5 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['rice', 'sonamasoori'], hsnCode: '10063090', gstRate: 5 },
  { name: 'Toor Dal (Arhar Dal)', description: 'Premium quality toor dal, rich in protein and fiber. No artificial colors.', mrp: 249, sellingPrice: 189, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['dal', 'toor', 'pulses'], hsnCode: '07133110', gstRate: 5 },
  { name: 'Moong Dal (Yellow Split)', description: 'Skinned split moong dal, light and easy to digest.', mrp: 199, sellingPrice: 149, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['dal', 'moong', 'pulses'], hsnCode: '07133120', gstRate: 5 },
  { name: 'Chana Dal (Bengal Gram Split)', description: 'Premium chana dal, rich in protein and iron.', mrp: 179, sellingPrice: 129, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['dal', 'chana', 'pulses'], hsnCode: '07132010', gstRate: 5 },
  { name: 'Urad Dal (Black Gram)', description: 'Premium whole urad dal, essential for authentic North Indian cuisine.', mrp: 249, sellingPrice: 189, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['dal', 'urad', 'pulses'], hsnCode: '07133140', gstRate: 5 },
  { name: 'Masoor Dal (Red Lentil)', description: 'Premium red lentils, cooks quickly and rich in protein.', mrp: 169, sellingPrice: 119, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['dal', 'masoor', 'pulses'], hsnCode: '07134000', gstRate: 5 },
  { name: 'Whole Wheat (Gehu)', description: 'Premium Grade-A whole wheat grains from Madhya Pradesh.', mrp: 299, sellingPrice: 229, unit: '10 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['wheat', 'gehu', 'grains'], hsnCode: '10019910', gstRate: 5 },
  { name: 'Pearl Millet (Bajra)', description: 'Organic pearl millet, rich in iron and fiber. Perfect for winter.', mrp: 249, sellingPrice: 189, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['bajra', 'millet', 'millets'], hsnCode: '10082990', gstRate: 5 },
  { name: 'Sorghum (Jowar)', description: 'Premium sorghum, naturally gluten-free grain rich in antioxidants.', mrp: 229, sellingPrice: 169, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['jowar', 'sorghum', 'millets'], hsnCode: '10079000', gstRate: 5 },
  { name: 'Finger Millet (Ragi)', description: 'Organic ragi from Karnataka, rich in calcium. Perfect for health-conscious families.', mrp: 279, sellingPrice: 209, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['ragi', 'finger-millet', 'millets'], hsnCode: '10082000', gstRate: 5 },
  { name: 'Kala Chana (Black Chickpeas)', description: 'Premium whole black chickpeas, rich in protein and iron.', mrp: 199, sellingPrice: 149, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['chana', 'kala-chana', 'pulses'], hsnCode: '07132020', gstRate: 5 },
  { name: 'Kabuli Chana (White Chickpeas)', description: 'Large white chickpeas, perfect for chole and salads.', mrp: 219, sellingPrice: 159, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['chana', 'kabuli', 'pulses'], hsnCode: '07132030', gstRate: 5 },
  { name: 'Rajma (Kidney Beans)', description: 'Premium Himalayan red kidney beans, large and creamy texture.', mrp: 249, sellingPrice: 189, unit: '1 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['rajma', 'kidney-beans', 'pulses'], hsnCode: '07133300', gstRate: 5 },
  { name: 'Green Moong (Whole)', description: 'Premium whole green gram, rich in protein and fiber.', mrp: 199, sellingPrice: 149, unit: '2 kg', images: ['https://images.unsplash.com/photo-1586201375761-83865001e31c'], tags: ['moong', 'green-gram', 'pulses'], hsnCode: '07133130', gstRate: 5 },
];

const flourProducts = [
  { name: 'Whole Wheat Atta', description: 'Stone-ground whole wheat flour from premium MP wheat. No additives or preservatives.', mrp: 349, sellingPrice: 269, unit: '5 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['atta', 'wheat-flour', 'flour'], hsnCode: '11010000', gstRate: 5 },
  { name: 'Multigrain Atta', description: 'Healthy mix of wheat, jowar, bajra, ragi, and soya. Perfect for diabetics.', mrp: 399, sellingPrice: 309, unit: '5 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['multigrain', 'atta', 'healthy'], hsnCode: '11010000', gstRate: 5 },
  { name: 'Besan (Gram Flour)', description: 'Premium gram flour made from chana dal. Perfect for pakoras and sweets.', mrp: 199, sellingPrice: 149, unit: '2 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['besan', 'gram-flour', 'flour'], hsnCode: '11061000', gstRate: 5 },
  { name: 'Rice Flour (Chawal Ka Atta)', description: 'Fine ground rice flour, perfect for dosa, idli, and homemade cosmetics.', mrp: 179, sellingPrice: 129, unit: '2 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['rice-flour', 'chawal-atta'], hsnCode: '11029000', gstRate: 5 },
  { name: 'Jowar Flour', description: 'Freshly milled jowar flour, naturally gluten-free and rich in iron.', mrp: 229, sellingPrice: 169, unit: '2 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['jowar', 'flour', 'gluten-free'], hsnCode: '11029010', gstRate: 5 },
  { name: 'Bajra Flour', description: 'Traditional pearl millet flour, perfect for winter rotis.', mrp: 219, sellingPrice: 159, unit: '2 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['bajra', 'flour', 'millet'], hsnCode: '11029020', gstRate: 5 },
  { name: 'Ragi Flour', description: 'Nutrient-rich finger millet flour, excellent source of calcium.', mrp: 259, sellingPrice: 199, unit: '2 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['ragi', 'flour', 'calcium'], hsnCode: '11029030', gstRate: 5 },
  { name: 'Maida (All-Purpose Flour)', description: 'Fine premium maida, ideal for baking and making naan, bhatura.', mrp: 199, sellingPrice: 149, unit: '2 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['maida', 'all-purpose-flour'], hsnCode: '11010000', gstRate: 5 },
  { name: 'Suji (Semolina) Fine', description: 'Fine semolina, perfect for upma, rava dosa, and desserts.', mrp: 179, sellingPrice: 129, unit: '2 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['suji', 'semolina', 'flour'], hsnCode: '11031110', gstRate: 5 },
  { name: 'Suji (Semolina) Coarse', description: 'Coarse semolina, ideal for rava idli and traditional sweets.', mrp: 179, sellingPrice: 129, unit: '2 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['suji', 'semolina', 'coarse'], hsnCode: '11031120', gstRate: 5 },
  { name: 'Corn Flour (Makki Ka Atta)', description: 'Stone-ground maize flour, perfect for makki ki roti.', mrp: 199, sellingPrice: 149, unit: '2 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['corn-flour', 'makki-atta', 'flour'], hsnCode: '11022000', gstRate: 5 },
  { name: 'Soybean Flour', description: 'Protein-rich soybean flour, perfect for adding nutrition to your diet.', mrp: 249, sellingPrice: 189, unit: '1 kg', images: ['https://images.unsplash.com/photo-1509440159596-0249088772ff'], tags: ['soybean', 'flour', 'protein'], hsnCode: '12081000', gstRate: 5 },
];

const readyToEatProducts = [
  { name: 'Instant Pongal Mix', description: 'Traditional South Indian pongal ready in 5 minutes. Made with premium ingredients.', mrp: 149, sellingPrice: 109, unit: '500 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['instant', 'pongal', 'south-indian'], hsnCode: '19049000', gstRate: 12 },
  { name: 'Instant Upma Mix', description: 'Classic rava upma mix with vegetables. Just add water and cook.', mrp: 129, sellingPrice: 89, unit: '500 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['instant', 'upma', 'breakfast'], hsnCode: '19049000', gstRate: 12 },
  { name: 'Instant Idli Mix', description: 'Premium idli mix - just add water and steam. Fluffy idlis every time.', mrp: 179, sellingPrice: 129, unit: '1 kg', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['instant', 'idli', 'south-indian'], hsnCode: '19049000', gstRate: 12 },
  { name: 'Instant Dosa Mix', description: 'Crispy dosa mix, fermented for authentic taste. Just add water.', mrp: 169, sellingPrice: 119, unit: '1 kg', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['instant', 'dosa', 'south-indian'], hsnCode: '19049000', gstRate: 12 },
  { name: 'Instant Khichdi Mix', description: 'Healthy moong khichdi mix, perfect for quick meals. Rich in protein.', mrp: 159, sellingPrice: 119, unit: '500 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['instant', 'khichdi', 'healthy'], hsnCode: '19049000', gstRate: 12 },
  { name: 'Ready to Eat - Chole', description: 'Authentic Punjabi chole, ready in 2 minutes. Rich and spicy gravy.', mrp: 99, sellingPrice: 69, unit: '300 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['ready-to-eat', 'chole', 'north-indian'], hsnCode: '21041000', gstRate: 12 },
  { name: 'Ready to Eat - Rajma', description: 'Creamy Himachali rajma curry. Just heat and serve with rice.', mrp: 99, sellingPrice: 69, unit: '300 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['ready-to-eat', 'rajma', 'north-indian'], hsnCode: '21041000', gstRate: 12 },
  { name: 'Ready to Eat - Dal Makhani', description: 'Rich and creamy dal makhani, slow-cooked to perfection.', mrp: 119, sellingPrice: 89, unit: '300 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['ready-to-eat', 'dal-makhani', 'punjabi'], hsnCode: '21041000', gstRate: 12 },
  { name: 'Ready to Eat - Palak Paneer', description: 'Creamy spinach and cottage cheese curry. Restaurant quality at home.', mrp: 129, sellingPrice: 99, unit: '300 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['ready-to-eat', 'palak-paneer', 'north-indian'], hsnCode: '21041000', gstRate: 12 },
  { name: 'Ready to Eat - Sambar', description: 'Authentic South Indian sambar with vegetables. Perfect with idli/dosa.', mrp: 89, sellingPrice: 59, unit: '300 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['ready-to-eat', 'sambar', 'south-indian'], hsnCode: '21041000', gstRate: 12 },
  { name: 'Ready to Eat - Biryani Veg', description: 'Hyderabadi style vegetable biryani with aromatic basmati rice.', mrp: 149, sellingPrice: 109, unit: '350 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['ready-to-eat', 'biryani', 'rice'], hsnCode: '19049000', gstRate: 12 },
  { name: 'Instant Oats - Masala', description: 'Healthy masala oats, ready in 3 minutes. Rich in fiber and protein.', mrp: 179, sellingPrice: 129, unit: '500 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['oats', 'instant', 'healthy', 'breakfast'], hsnCode: '19041020', gstRate: 12 },
  { name: 'Poha (Flattened Rice) Thick', description: 'Premium thick poha, perfect for traditional breakfast.', mrp: 129, sellingPrice: 89, unit: '1 kg', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['poha', 'flattened-rice', 'breakfast'], hsnCode: '19049000', gstRate: 12 },
  { name: 'Murmura (Puffed Rice)', description: 'Crispy puffed rice, perfect for snacks and chaat.', mrp: 79, sellingPrice: 49, unit: '500 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['murmura', 'puffed-rice', 'snacks'], hsnCode: '19041030', gstRate: 12 },
  { name: 'Energy Bars - Mixed Fruits', description: 'Healthy energy bars with mixed dry fruits and oats. No added sugar.', mrp: 299, sellingPrice: 219, unit: '6 x 50 g', images: ['https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec'], tags: ['energy-bars', 'healthy', 'snacks'], hsnCode: '19049000', gstRate: 12 },
];

const juicesProducts = [
  { name: 'Pure Alphonso Mango Juice', description: '100% pure Alphonso mango juice. No added sugar or preservatives.', mrp: 249, sellingPrice: 189, unit: '1 L', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['mango', 'juice', 'alphonso'], hsnCode: '20098990', gstRate: 12 },
  { name: 'Mixed Fruit Juice', description: 'Blend of apple, orange, pomegranate, and grape. Perfect refreshment.', mrp: 199, sellingPrice: 149, unit: '1 L', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['mixed-fruit', 'juice', 'refreshment'], hsnCode: '20098990', gstRate: 12 },
  { name: 'Pure Pomegranate Juice', description: 'Cold-pressed pomegranate juice, rich in antioxidants.', mrp: 349, sellingPrice: 269, unit: '1 L', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['pomegranate', 'juice', 'antioxidants'], hsnCode: '20098990', gstRate: 12 },
  { name: 'Pure Orange Juice', description: 'Freshly squeezed orange juice from Nagpur oranges.', mrp: 219, sellingPrice: 159, unit: '1 L', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['orange', 'juice', 'vitamin-c'], hsnCode: '20091100', gstRate: 12 },
  { name: 'Amla Juice (Indian Gooseberry)', description: 'Pure amla juice, richest natural source of Vitamin C.', mrp: 299, sellingPrice: 219, unit: '1 L', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['amla', 'juice', 'vitamin-c', 'immunity'], hsnCode: '20098990', gstRate: 12 },
  { name: 'Wheatgrass Juice', description: 'Fresh wheatgrass juice, rich in chlorophyll and nutrients.', mrp: 399, sellingPrice: 299, unit: '500 ml', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['wheatgrass', 'juice', 'detox'], hsnCode: '20098990', gstRate: 12 },
  { name: 'Aloe Vera Juice', description: 'Pure aloe vera juice, excellent for digestion and skin health.', mrp: 279, sellingPrice: 209, unit: '1 L', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['aloe-vera', 'juice', 'digestion'], hsnCode: '20098990', gstRate: 12 },
  { name: 'Watermelon Juice', description: 'Fresh watermelon juice, naturally sweet and hydrating.', mrp: 179, sellingPrice: 129, unit: '1 L', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['watermelon', 'juice', 'summer'], hsnCode: '20098990', gstRate: 12 },
  { name: 'Lychee Juice', description: 'Pure lychee juice from Bihar lychees. Exotic and refreshing.', mrp: 249, sellingPrice: 189, unit: '1 L', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['lychee', 'juice', 'exotic'], hsnCode: '20098990', gstRate: 12 },
  { name: 'Mosambi (Sweet Lime) Juice', description: 'Freshly squeezed sweet lime juice, rich in Vitamin C.', mrp: 179, sellingPrice: 129, unit: '1 L', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['mosambi', 'sweet-lime', 'juice'], hsnCode: '20098990', gstRate: 12 },
  { name: 'Coconut Water - Tender', description: 'Pure tender coconut water, natural electrolytes for hydration.', mrp: 149, sellingPrice: 99, unit: '1 L', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['coconut-water', 'hydration', 'natural'], hsnCode: '20098910', gstRate: 12 },
  { name: 'Ginger Juice', description: 'Pure ginger juice concentrate. Perfect for teas and cooking.', mrp: 199, sellingPrice: 149, unit: '200 ml', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['ginger', 'juice', 'concentrate'], hsnCode: '20098990', gstRate: 12 },
  { name: 'Lemon Juice Concentrate', description: 'Pure lemon juice concentrate. No preservatives, just fresh lemon.', mrp: 169, sellingPrice: 119, unit: '500 ml', images: ['https://images.unsplash.com/photo-1600271886742-f049cd451bba'], tags: ['lemon', 'juice', 'concentrate'], hsnCode: '20093100', gstRate: 12 },
];

const poojaProducts = [
  { name: 'Camphor (Kapur) Pure', description: 'Pure natural camphor for aarti and religious ceremonies.', mrp: 99, sellingPrice: 69, unit: '100 g', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['camphor', 'kapur', 'pooja'], hsnCode: '29142990', gstRate: 5 },
  { name: 'Sandalwood Powder (Chandan)', description: 'Pure Mysore sandalwood powder for pooja and tilak.', mrp: 299, sellingPrice: 229, unit: '100 g', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['sandalwood', 'chandan', 'pooja'], hsnCode: '33074100', gstRate: 5 },
  { name: 'Kumkum', description: 'Traditional bright red kumkum for religious ceremonies.', mrp: 49, sellingPrice: 29, unit: '50 g', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['kumkum', 'pooja', 'vermillion'], hsnCode: '33059090', gstRate: 5 },
  { name: 'Haldi (Turmeric) Powder', description: 'Pure turmeric powder for pooja and religious use.', mrp: 79, sellingPrice: 49, unit: '100 g', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['haldi', 'turmeric', 'pooja'], hsnCode: '09103010', gstRate: 5 },
  { name: 'Agarbatti (Incense Sticks) - Sandal', description: 'Premium sandalwood agarbatti, long-lasting fragrance.', mrp: 149, sellingPrice: 99, unit: 'Pack of 100', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['agarbatti', 'incense', 'sandal'], hsnCode: '33074100', gstRate: 5 },
  { name: 'Agarbatti (Incense Sticks) - Rose', description: 'Premium rose fragrance agarbatti for a calming atmosphere.', mrp: 149, sellingPrice: 99, unit: 'Pack of 100', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['agarbatti', 'incense', 'rose'], hsnCode: '33074100', gstRate: 5 },
  { name: 'Dhoop Batti - Jasmine', description: 'Traditional jasmine dhoop for aarti and home fragrance.', mrp: 89, sellingPrice: 59, unit: 'Pack of 50', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['dhoop', 'jasmine', 'pooja'], hsnCode: '33074100', gstRate: 5 },
  { name: 'Coconut (Dry) for Pooja', description: 'Premium dry coconut with shell for religious ceremonies.', mrp: 79, sellingPrice: 49, unit: '1 piece', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['coconut', 'dry-coconut', 'pooja'], hsnCode: '08011100', gstRate: 5 },
  { name: 'Betel Leaves (Paan Leaves)', description: 'Fresh premium betel leaves for pooja and rituals.', mrp: 29, sellingPrice: 19, unit: '25 leaves', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['betel-leaves', 'paan', 'pooja'], hsnCode: '14049000', gstRate: 5 },
  { name: 'Betel Nuts (Supari)', description: 'Premium dried betel nuts for pooja and rituals.', mrp: 99, sellingPrice: 69, unit: '200 g', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['supari', 'betel-nut', 'pooja'], hsnCode: '21069030', gstRate: 5 },
  { name: 'Gangajal (Holy Water)', description: 'Pure holy water from Gangotri, sealed for sanctity.', mrp: 49, sellingPrice: 29, unit: '500 ml', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['gangajal', 'holy-water', 'pooja'], hsnCode: '28539000', gstRate: 5 },
  { name: 'Roli (Red Powder)', description: 'Traditional red roli powder for tilak and ceremonies.', mrp: 29, sellingPrice: 19, unit: '50 g', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['roli', 'tilak', 'pooja'], hsnCode: '32041720', gstRate: 5 },
  { name: 'Moli (Sacred Red Thread)', description: 'Sacred red thread for kalava and protective rituals.', mrp: 19, sellingPrice: 9, unit: '10 threads', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['moli', 'kalava', 'sacred-thread'], hsnCode: '58071010', gstRate: 5 },
  { name: 'Pooja Thali (Brass)', description: 'Traditional engraved brass pooja thali with all essentials.', mrp: 599, sellingPrice: 449, unit: '1 set', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['pooja-thali', 'brass', 'pooja-set'], hsnCode: '74182000', gstRate: 5 },
  { name: 'Lamp (Diya) Brass', description: 'Traditional brass diya for aarti and home decoration.', mrp: 299, sellingPrice: 219, unit: '1 piece', images: ['https://images.unsplash.com/photo-1605870445919-838d190e8e1b'], tags: ['diya', 'lamp', 'brass', 'pooja'], hsnCode: '74182000', gstRate: 5 },
];

const organicProducts = [
  { name: 'Organic Honey - Raw', description: 'Pure raw organic honey from Himalayan farms. Unprocessed and unfiltered.', mrp: 599, sellingPrice: 449, unit: '500 g', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['honey', 'organic', 'raw', 'himalayan'], hsnCode: '04090000', gstRate: 5 },
  { name: 'Organic Jaggery (Gur)', description: 'Traditional organic jaggery made from sugarcane juice. Rich in iron.', mrp: 199, sellingPrice: 149, unit: '1 kg', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['jaggery', 'gur', 'organic'], hsnCode: '17011410', gstRate: 5 },
  { name: 'Organic Turmeric Powder', description: 'Certified organic turmeric from Lakadong. High curcumin content.', mrp: 299, sellingPrice: 219, unit: '250 g', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['turmeric', 'organic', 'lakadong'], hsnCode: '09103010', gstRate: 5 },
  { name: 'Organic Coconut Oil', description: 'Cold-pressed organic coconut oil from Kerala. No chemicals.', mrp: 399, sellingPrice: 299, unit: '500 ml', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['coconut-oil', 'organic', 'cold-pressed'], hsnCode: '15131100', gstRate: 5 },
  { name: 'Organic Mustard Oil', description: 'Cold-pressed organic mustard oil. Rich in omega-3 and vitamin E.', mrp: 299, sellingPrice: 219, unit: '1 L', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['mustard-oil', 'organic', 'cold-pressed'], hsnCode: '15149110', gstRate: 5 },
  { name: 'Organic Ghee - Cow', description: 'Pure organic cow ghee from grass-fed cows. A2 bilkul.', mrp: 699, sellingPrice: 549, unit: '500 ml', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['ghee', 'organic', 'cow-ghee', 'a2'], hsnCode: '04059020', gstRate: 5 },
  { name: 'Organic Black Pepper', description: 'Certified organic whole black pepper from Kerala. Bold and aromatic.', mrp: 349, sellingPrice: 259, unit: '250 g', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['pepper', 'organic', 'kerala', 'spice'], hsnCode: '09041110', gstRate: 5 },
  { name: 'Organic Cumin Seeds (Jeera)', description: 'Premium organic cumin seeds from Rajasthan. Strong aroma.', mrp: 249, sellingPrice: 179, unit: '250 g', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['cumin', 'jeera', 'organic', 'spice'], hsnCode: '09093110', gstRate: 5 },
  { name: 'Organic Red Chilli Powder', description: 'Pure organic red chilli powder from Guntur. High on color and heat.', mrp: 299, sellingPrice: 219, unit: '250 g', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['chilli', 'organic', 'guntur', 'spice'], hsnCode: '09042110', gstRate: 5 },
  { name: 'Organic Coriander Powder', description: 'Freshly ground organic coriander powder. No fillers.', mrp: 179, sellingPrice: 129, unit: '250 g', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['coriander', 'organic', 'spice'], hsnCode: '09092200', gstRate: 5 },
  { name: 'Organic Garam Masala', description: 'Premium blend of organic whole spices. Perfect for authentic Indian cooking.', mrp: 249, sellingPrice: 179, unit: '100 g', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['garam-masala', 'organic', 'spice-blend'], hsnCode: '09109100', gstRate: 5 },
  { name: 'Organic Green Tea - Tulsi', description: 'Organic green tea infused with holy basil. Rich in antioxidants.', mrp: 349, sellingPrice: 259, unit: '100 g', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['green-tea', 'tulsi', 'organic', 'tea'], hsnCode: '09022010', gstRate: 5 },
  { name: 'Organic Amla Powder', description: 'Pure dried amla powder, richest natural source of Vitamin C.', mrp: 279, sellingPrice: 199, unit: '200 g', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['amla', 'organic', 'vitamin-c', 'superfood'], hsnCode: '11063090', gstRate: 5 },
  { name: 'Organic Moringa Powder', description: 'Pure moringa leaf powder, nutrient-dense superfood.', mrp: 349, sellingPrice: 259, unit: '200 g', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['moringa', 'organic', 'superfood', 'green'], hsnCode: '11063090', gstRate: 5 },
  { name: 'Organic Apple Cider Vinegar', description: 'Raw unfiltered organic apple cider vinegar with mother culture.', mrp: 499, sellingPrice: 379, unit: '500 ml', images: ['https://images.unsplash.com/photo-1542838132-92c53300491e'], tags: ['acv', 'apple-cider', 'organic', 'vinegar'], hsnCode: '22090000', gstRate: 5 },
];

const banners = [
  { title: 'Monsoon Special - Up to 30% Off', subtitle: 'Premium dry fruits, grains & spices at unbeatable prices', imageUrl: 'https://images.unsplash.com/photo-1604068549290-dea0e4a305ca', linkUrl: '/category/dry-fruits', position: 'hero', order: 1, bgColor: '#8B4513' },
  { title: 'Organic Store Now Live', subtitle: '100% certified organic products straight from farm to home', imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e', linkUrl: '/category/organic-products', position: 'hero', order: 2, bgColor: '#2E8B57' },
  { title: 'Ready-to-Eat Range', subtitle: 'Restaurant quality meals in minutes. No preservatives.', imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec', linkUrl: '/category/ready-to-eat', position: 'hero', order: 3, bgColor: '#CD853F' },
];

const coupons = [
  { code: 'WELCOME20', description: 'Welcome discount for new customers', discountType: 'Percentage', discountValue: 20, minSubtotal: 499, maxDiscount: 100, usageLimit: 1000, perUserLimit: 1, validFrom: new Date(), validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
  { code: 'FIRST50', description: 'Flat ₹50 off on first order', discountType: 'Fixed Amount', discountValue: 50, minSubtotal: 299, usageLimit: 500, perUserLimit: 1, validFrom: new Date(), validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
  { code: 'FREESHIP', description: 'Free shipping on orders above ₹299', discountType: 'Fixed Amount', discountValue: 40, minSubtotal: 299, usageLimit: 2000, perUserLimit: 5, validFrom: new Date(), validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) },
  { code: 'DRYFRUITS15', description: '15% off on all dry fruits', discountType: 'Percentage', discountValue: 15, minSubtotal: 399, maxDiscount: 200, usageLimit: 300, perUserLimit: 2, validFrom: new Date(), validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
  { code: 'ORGANIC25', description: '25% off on organic products', discountType: 'Percentage', discountValue: 25, minSubtotal: 299, maxDiscount: 150, usageLimit: 200, perUserLimit: 2, validFrom: new Date(), validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) },
  { code: 'FESTIVE100', description: 'Flat ₹100 off on orders above ₹999', discountType: 'Fixed Amount', discountValue: 100, minSubtotal: 999, usageLimit: 500, perUserLimit: 1, validFrom: new Date(), validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
];

function slugify(name: string): string {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/[()]/g, '');
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URI!);
    console.log('Connected to MongoDB');

    const existingCategories = await Category.countDocuments();
    if (existingCategories > 0) {
      console.log('Database already has data. Clearing existing data...');
      await Promise.all([
        Category.deleteMany({}),
        Product.deleteMany({}),
        Banner.deleteMany({}),
        Coupon.deleteMany({}),
        User.deleteMany({ email: { $in: ['admin@machinichi.com', 'user@machinichi.com'] } }),
      ]);
    }

    console.log('Creating admin user...');
    const admin = await User.create({
      fullName: 'Admin Machinichi',
      email: 'admin@machinichi.com',
      phone: '9876543210',
      password: 'Admin@123',
      role: 'super_admin',
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    } as any);

    await User.create({
      fullName: 'Test User',
      email: 'user@machinichi.com',
      phone: '9876543211',
      password: 'User@123',
      role: 'customer',
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    } as any);

    console.log('Creating categories...');
    const categoryDocs = await Category.insertMany(
      categories.map(cat => ({
        ...cat,
        slug: slugify(cat.name),
        createdBy: admin!._id,
      }))
    );

    const categoryMap: Record<string, string> = {};
    categoryDocs.forEach(cat => {
      categoryMap[slugify(cat.name)] = cat._id.toString();
    });

    console.log('Creating products...');
    const allProductSets = [
      { data: dryFruitsProducts, slug: 'dry-fruits' },
      { data: grainsProducts, slug: 'grains' },
      { data: flourProducts, slug: 'flour' },
      { data: readyToEatProducts, slug: 'ready-to-eat' },
      { data: juicesProducts, slug: 'juices' },
      { data: poojaProducts, slug: 'pooja-items' },
      { data: organicProducts, slug: 'organic-products' },
    ];

    let productCount = 0;
    for (const { data, slug } of allProductSets) {
      const categoryId = categoryMap[slug];
      if (!categoryId) {
        console.warn(`Category not found for slug: ${slug}`);
        continue;
      }

      const products = data.map((prod, index) => {
        const images = prod.images.map((url, i) => ({
          url,
          alt: prod.name,
          isPrimary: i === 0,
          order: i,
        }));

        const catPrefix = slug.substring(0, 3).toUpperCase();
        const uniqueSuffix = Date.now().toString().slice(-4) + index;
        const sku = `MF-${catPrefix}${uniqueSuffix}`;

        const costPrice = Math.round(prod.sellingPrice * 0.6);

        const shortDescription = prod.description.length > 300
          ? prod.description.substring(0, 297) + '...'
          : prod.description;

        return {
          name: prod.name,
          slug: slugify(prod.name),
          sku,
          hsnCode: prod.hsnCode,
          brand: 'Machinichi',
          category: categoryId,
          description: prod.description,
          shortDescription,
          costPrice,
          mrpPrice: prod.mrp,
          sellingPrice: prod.sellingPrice,
          quantity: Math.floor(Math.random() * 80) + 20,
          gstRate: prod.gstRate,
          unitType: prod.unit,
          tags: prod.tags,
          images,
          isFeatured: index < 3,
          isVisible: true,
          status: 'Active',
          totalSales: Math.floor(Math.random() * 500),
          createdBy: admin!._id,
        };
      });

      await Product.insertMany(products);
      productCount += data.length;
    }

    console.log('Creating banners...');
    await Banner.insertMany(banners);

    console.log('Creating coupons...');
    await Coupon.insertMany(
      coupons.map(c => ({ ...c, createdBy: admin!._id }))
    );

    console.log('\n✓ Seeding completed successfully!');
    console.log(`  - ${categoryDocs.length} categories`);
    console.log(`  - ${productCount} products`);
    console.log(`  - ${banners.length} banners`);
    console.log(`  - ${coupons.length} coupons`);
    console.log(`  - 2 users (admin + test user)`);
    console.log('\nTest Credentials:');
    console.log('  Admin: admin@machinichi.com / Admin@123');
    console.log('  User:  user@machinichi.com / User@123');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
