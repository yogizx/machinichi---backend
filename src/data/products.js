export const slugifyProduct = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const products = [
  {
    name: "Premium Brown Basmati Rice",
    origin: "HERITAGE SEED - INDIA",
    price: "₹763",
    oldPrice: "₹1,286",
    badge: "20% OFF",
    tags: ["ORGANIC"],
    rating: 5,
    sizes: ["1KG", "5KG", "10KG"],
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Tri-Color Royal Quinoa",
    origin: "HIGH ALTITUDE - ANDES",
    price: "₹763",
    tags: ["ORGANIC"],
    rating: 4,
    sizes: ["500G", "1KG", "2KG"],
    image:
      "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Split Yellow Mung Beans",
    origin: "LOCALLY SOURCED - REGENERATIVE",
    price: "₹763",
    tags: ["ORGANIC"],
    rating: 3,
    sizes: ["1KG", "2.5KG"],
    image:
      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Forbidden Black Heirloom Rice",
    origin: "ANTIOXIDANT RICH - JAVA",
    price: "₹1,785",
    tags: ["ORGANIC"],
    rating: 5,
    sizes: ["1KG"],
    image:
      "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Red Jasmine Aromatic Rice",
    origin: "LONG GRAIN - SOUTHEAST ASIA",
    price: "₹1,178",
    badge: "BEST SELLER",
    tags: ["ORGANIC"],
    rating: 4,
    sizes: ["1KG", "5KG"],
    image:
      "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Organic Pearled Barley",
    origin: "SUSTAINABLE - SASKATCHEWAN",
    price: "₹701",
    tags: ["ORGANIC"],
    rating: 2,
    sizes: ["1KG", "2KG", "5KG"],
    image:
      "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "French Style Green Lentils",
    origin: "PUY STYLE - ORGANIC CERTIFIED",
    price: "₹979",
    tags: ["ORGANIC"],
    rating: 3,
    sizes: ["1KG", "2.5KG"],
    image:
      "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=420&q=90",
  },
  {
    name: "Popping Amaranth Grain",
    origin: "ANCIENT STAPLE - MEXICO",
    price: "₹1,352",
    tags: ["ORGANIC"],
    rating: 1,
    sizes: ["500G", "1KG"],
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=420&q=90&sat=-35",
  },
];
