export interface DefaultItem {
  name: string;
  categoryName: string;
  icon: string;
}

const items = (categoryName: string, icon: string, names: string[]): DefaultItem[] =>
  names.map((name) => ({ name, categoryName, icon }));

export const DEFAULT_ITEMS: DefaultItem[] = [
  // Food & Groceries
  ...items('Food & Groceries', 'nutrition-outline', [
    'Bread', 'Milk', 'Eggs', 'Cheese', 'Chicken', 'Rice', 'Pasta', 'Butter',
    'Yogurt', 'Tomatoes', 'Potatoes', 'Onions', 'Apples', 'Bananas',
    'Olive Oil', 'Sugar', 'Flour', 'Water (bottle)', 'Juice', 'Cereal',
  ]),

  // Transport
  ...items('Transport', 'car-outline', [
    'Fuel', 'Parking', 'Bus Ticket', 'Train Ticket', 'Taxi', 'Metro Ticket',
    'Car Wash', 'Toll Fee', 'Tire Service', 'Oil Change', 'Highway Vignette',
    'Uber/Bolt', 'Car Insurance', 'Registration Fee', 'Brake Pads',
    'Windshield Fluid', 'Air Freshener', 'Tram Ticket', 'Airport Transfer',
    'Bicycle Repair',
  ]),

  // Home & Utilities
  ...items('Home & Utilities', 'home-outline', [
    'Electricity', 'Water Bill', 'Internet', 'Rent', 'Gas Bill', 'Trash Bags',
    'Cleaning Supplies', 'Light Bulbs', 'Toilet Paper', 'Paper Towels',
    'Laundry Detergent', 'Dish Soap', 'Sponges', 'Air Freshener', 'Batteries',
    'Extension Cord', 'Door Lock', 'Furniture Polish', 'Trash Pickup Fee',
    'Home Insurance',
  ]),

  // Health & Pharmacy
  ...items('Health & Pharmacy', 'medkit-outline', [
    'Medicine', 'Vitamins', 'Toothpaste', 'Shampoo', 'Soap', 'Deodorant',
    'Face Cream', 'Sunscreen', 'Band-Aids', 'Pain Killers', 'Cold Medicine',
    'Eye Drops', 'Hand Sanitizer', 'Cotton Pads', 'Dental Floss',
    'Razor Blades', 'Lip Balm', 'Allergy Medicine', 'Thermometer',
    'First Aid Kit',
  ]),

  // Fun & Entertainment
  ...items('Fun & Entertainment', 'game-controller-outline', [
    'Cinema Ticket', 'Concert Ticket', 'Board Game', 'Video Game',
    'Streaming Service', 'Book', 'Magazine', 'Museum Entry', 'Bowling',
    'Escape Room', 'Pool Entry', 'Park Entry', 'Festival Ticket', 'Karaoke',
    'Puzzle', 'Toy', 'Sports Event', 'Theatre Ticket', 'Amusement Park',
    'Zoo Entry',
  ]),

  // Clothes & Shopping
  ...items('Clothes & Shopping', 'shirt-outline', [
    'T-Shirt', 'Jeans', 'Shoes', 'Socks', 'Underwear', 'Jacket', 'Sweater',
    'Dress', 'Shorts', 'Belt', 'Hat', 'Gloves', 'Scarf', 'Sneakers',
    'Sandals', 'Pajamas', 'Sportswear', 'Sunglasses', 'Watch', 'Bag',
  ]),

  // Cafes & Restaurants
  ...items('Cafes & Restaurants', 'cafe-outline', [
    'Coffee', 'Espresso', 'Cappuccino', 'Tea', 'Latte', 'Croissant',
    'Sandwich', 'Pizza', 'Burger', 'Sushi', 'Kebab', 'Salad', 'Soup',
    'Dessert', 'Beer', 'Wine', 'Cocktail', 'Smoothie', 'Ice Cream',
    'Breakfast',
  ]),

  // Subscriptions
  ...items('Subscriptions', 'phone-portrait-outline', [
    'Netflix', 'Spotify', 'YouTube Premium', 'iCloud', 'Google One',
    'PlayStation Plus', 'Xbox Game Pass', 'Disney+', 'HBO Max', 'Amazon Prime',
    'Apple Music', 'Gym Membership', 'Cloud Storage', 'VPN', 'Newspaper',
    'App Store Purchase', 'Domain Name', 'Hosting', 'Adobe CC', 'Microsoft 365',
  ]),

  // Education
  ...items('Education', 'school-outline', [
    'Textbook', 'Online Course', 'Notebook', 'Pens', 'Pencils', 'Highlighters',
    'Printer Paper', 'Ink Cartridge', 'Calculator', 'USB Drive', 'Backpack',
    'Lunch Box', 'School Supplies', 'Tutor Session', 'Language Course',
    'Exam Fee', 'Library Fee', 'Lab Materials', 'Art Supplies', 'Ruler',
  ]),

  // Other
  ...items('Other', 'cube-outline', [
    'Gift', 'Donation', 'Postage', 'Batteries', 'Tape', 'Glue', 'Scissors',
    'Key Copy', 'Pet Food', 'Pet Toy', 'Dog Treats', 'Cat Litter', 'Plant',
    'Flowers', 'Candles', 'Umbrella', 'Luggage', 'Travel Adapter',
    'Power Bank', 'Phone Case',
  ]),
];
