/**
 * Seeds categories and sample products.
 * Safe to re-run: clears existing rows first.
 */
const img = (seed) => `https://picsum.photos/seed/${seed}/600/400`;

exports.seed = async function (knex) {
  await knex('products').del();
  await knex('categories').del();
  // reset auto-increment counters
  await knex.raw("DELETE FROM sqlite_sequence WHERE name IN ('products', 'categories')");

  await knex('categories').insert([
    { id: 1, name: 'Electronics' },
    { id: 2, name: 'Books' },
    { id: 3, name: 'Clothing' },
    { id: 4, name: 'Home & Kitchen' },
    { id: 5, name: 'Sports & Outdoors' },
  ]);

  await knex('products').insert([
    // Electronics
    { name: 'Wireless Bluetooth Headphones', description: 'Over-ear headphones with active noise cancellation and 30-hour battery life.', price: 2499.0, image_url: img('headphones'), category_id: 1, stock: 40 },
    { name: 'Smart Fitness Band', description: 'Tracks steps, heart rate and sleep. Water resistant with a 10-day battery.', price: 1799.0, image_url: img('fitnessband'), category_id: 1, stock: 65 },
    { name: 'Portable Power Bank 20000mAh', description: 'Dual USB output with fast charging. Charges a phone up to 5 times.', price: 1299.0, image_url: img('powerbank'), category_id: 1, stock: 80 },
    { name: 'Mechanical Keyboard', description: 'Compact 75% layout with hot-swappable switches and RGB backlight.', price: 3999.0, image_url: img('keyboard'), category_id: 1, stock: 25 },

    // Books
    { name: 'Clean Code', description: 'A handbook of agile software craftsmanship by Robert C. Martin.', price: 899.0, image_url: img('cleancode'), category_id: 2, stock: 50 },
    { name: 'Atomic Habits', description: 'An easy and proven way to build good habits and break bad ones.', price: 499.0, image_url: img('atomichabits'), category_id: 2, stock: 120 },
    { name: 'The Pragmatic Programmer', description: 'Your journey to mastery, with practical tips for software developers.', price: 1099.0, image_url: img('pragmatic'), category_id: 2, stock: 35 },

    // Clothing
    { name: 'Cotton Crew Neck T-Shirt', description: 'Soft 100% cotton t-shirt in a regular fit. Available in multiple colors.', price: 399.0, image_url: img('tshirt'), category_id: 3, stock: 200 },
    { name: 'Slim Fit Denim Jeans', description: 'Stretch denim jeans with a comfortable slim fit and five pockets.', price: 1499.0, image_url: img('jeans'), category_id: 3, stock: 90 },
    { name: 'Hooded Sweatshirt', description: 'Fleece-lined hoodie with a kangaroo pocket, ideal for cooler weather.', price: 1199.0, image_url: img('hoodie'), category_id: 3, stock: 70 },

    // Home & Kitchen
    { name: 'Stainless Steel Water Bottle', description: 'Double-wall insulated 750 ml bottle. Keeps drinks cold for 24 hours.', price: 599.0, image_url: img('bottle'), category_id: 4, stock: 150 },
    { name: 'Non-Stick Frying Pan', description: '26 cm induction-compatible pan with a durable non-stick coating.', price: 849.0, image_url: img('fryingpan'), category_id: 4, stock: 60 },
    { name: 'Electric Kettle 1.5L', description: 'Fast-boil stainless steel kettle with auto shut-off protection.', price: 999.0, image_url: img('kettle'), category_id: 4, stock: 85 },
    { name: 'LED Desk Lamp', description: 'Adjustable arm lamp with three color modes and touch dimming.', price: 749.0, image_url: img('desklamp'), category_id: 4, stock: 55 },

    // Sports & Outdoors
    { name: 'Yoga Mat 6mm', description: 'Non-slip, cushioned yoga mat with a carry strap.', price: 699.0, image_url: img('yogamat'), category_id: 5, stock: 100 },
    { name: 'Adjustable Dumbbell Set', description: 'Pair of adjustable dumbbells from 2 kg to 10 kg each.', price: 2799.0, image_url: img('dumbbells'), category_id: 5, stock: 30 },
    { name: 'Trekking Backpack 40L', description: 'Lightweight water-resistant backpack with a padded back and rain cover.', price: 2199.0, image_url: img('backpack'), category_id: 5, stock: 45 },
    { name: 'Skipping Rope', description: 'Speed rope with ball bearings and adjustable length for cardio workouts.', price: 249.0, image_url: img('skippingrope'), category_id: 5, stock: 140 },
  ]);
};
