import DataLoader from 'dataloader';
import Product from '../models/Product';
import Category from '../models/Category';
import logger from '../utils/logger';

// Product DataLoader - batches product lookups by ID
export const createProductLoader = () =>
  new DataLoader(async (ids: readonly string[]) => {
    try {
      const products = await Product.find({
        _id: { $in: ids as string[] },
      }).lean();

      const productMap = new Map(
        products.map((p: any) => [p._id.toString(), p])
      );

      return ids.map((id) => productMap.get(id) || null);
    } catch (error) {
      logger.error('ProductLoader error:', error);
      return ids.map(() => null);
    }
  });

// Category DataLoader - batches category lookups by slug
export const createCategoryLoader = () =>
  new DataLoader(async (slugs: readonly string[]) => {
    try {
      const categories = await Category.find({
        slug: { $in: slugs as string[] },
      }).lean();

      const categoryMap = new Map(
        categories.map((c: any) => [c.slug, c])
      );

      return slugs.map((slug) => categoryMap.get(slug) || null);
    } catch (error) {
      logger.error('CategoryLoader error:', error);
      return slugs.map(() => null);
    }
  });

// Products by Category DataLoader - batches product lookups by category
export const createProductsByCategoryLoader = () =>
  new DataLoader(async (categories: readonly string[]) => {
    try {
      const products = await Product.find({
        category: { $in: categories as string[] },
        isActive: true,
      })
        .sort({ featured: -1, views: -1 })
        .limit(20)
        .lean();

      // Group products by category
      const productsByCategory = new Map<string, any[]>();
      products.forEach((product: any) => {
        const category = product.category;
        if (!productsByCategory.has(category)) {
          productsByCategory.set(category, []);
        }
        productsByCategory.get(category)!.push(product);
      });

      return categories.map(
        (category) => productsByCategory.get(category) || []
      );
    } catch (error) {
      logger.error('ProductsByCategoryLoader error:', error);
      return categories.map(() => []);
    }
  });

// Context factory to create fresh DataLoaders for each request
export const createDataLoaders = () => ({
  productLoader: createProductLoader(),
  categoryLoader: createCategoryLoader(),
  productsByCategoryLoader: createProductsByCategoryLoader(),
});

export type DataLoaders = ReturnType<typeof createDataLoaders>;
