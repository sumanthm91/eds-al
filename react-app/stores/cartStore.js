import { create } from 'zustand';

const INITIAL_STORE = {
  products: 0, // Example State, can be removed
};

const cartStore = (set) => ({
  ...INITIAL_STORE,
  /* Example Store Starts, can be removed */
  increaseProducts: () => set((state) => ({ products: state.products + 1 })),
  removeAllProducts: () => set({ products: 0 }),
  updateProducts: (newProducts) => set({ bears: newProducts }),
  /* Example Store Ends */
  reset: () => set(INITIAL_STORE),
});

const useCartStore = create(cartStore);

export default useCartStore;
