export interface DefaultCategory {
  name: string;
  color: string;
  icon: string;
  sortOrder: number;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Food & Groceries',    color: '#FF6B6B', icon: 'restaurant-outline',    sortOrder: 0 },
  { name: 'Transport',           color: '#4ECDC4', icon: 'car-outline',           sortOrder: 1 },
  { name: 'Home & Utilities',    color: '#45B7D1', icon: 'home-outline',          sortOrder: 2 },
  { name: 'Health & Pharmacy',   color: '#96CEB4', icon: 'medkit-outline',        sortOrder: 3 },
  { name: 'Fun & Entertainment', color: '#FFEAA7', icon: 'game-controller-outline', sortOrder: 4 },
  { name: 'Clothes & Shopping',  color: '#DDA0DD', icon: 'shirt-outline',         sortOrder: 5 },
  { name: 'Cafes & Restaurants', color: '#F39C12', icon: 'cafe-outline',          sortOrder: 6 },
  { name: 'Subscriptions',       color: '#6C5CE7', icon: 'phone-portrait-outline', sortOrder: 7 },
  { name: 'Education',           color: '#00B894', icon: 'school-outline',        sortOrder: 8 },
  { name: 'Other',               color: '#95A5A6', icon: 'cube-outline',          sortOrder: 9 },
];
